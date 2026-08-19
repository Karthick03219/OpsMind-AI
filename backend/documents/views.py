import re

from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import DocumentSerializer
from .models import Document, DocumentChunk
from .chunking import chunk_text
from .services import extract_text_from_pdf
from .embeddings import generate_embedding
from .search import search_documents
from .llm import generate_answer


# ============================================================
# DOCUMENT UPLOAD
# ============================================================

class DocumentUploadView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):

        serializer = DocumentSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        document = serializer.save(owner=request.user)

        try:
            # Extract text from PDF
            extracted_text = extract_text_from_pdf(
                document.file.path
            )

            # Save extracted text
            document.extracted_text = extracted_text
            document.save(
                update_fields=["extracted_text"]
            )

            # Split text into chunks
            chunks = chunk_text(extracted_text)

            # Create chunks with embeddings
            DocumentChunk.objects.bulk_create(
                [
                    DocumentChunk(
                        document=document,
                        content=chunk,
                        chunk_index=index,
                        embedding=generate_embedding(chunk)
                    )
                    for index, chunk in enumerate(chunks)
                ]
            )

            # Mark as processed
            document.processed = True
            document.save(
                update_fields=["processed"]
            )

        except Exception as e:

            return Response(
                {
                    "message": (
                        "Document uploaded, but "
                        "text processing failed"
                    ),
                    "error": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {
                "message": (
                    "Document uploaded and processed "
                    "successfully"
                ),
                "document": DocumentSerializer(document).data,
                "chunks_created": len(chunks),
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# DOCUMENT LIST
# ============================================================

class DocumentListView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        documents = (
            Document.objects
            .filter(owner=request.user)
            .order_by("-id")
        )

        return Response(
            DocumentSerializer(
                documents,
                many=True
            ).data,
            status=status.HTTP_200_OK
        )


# ============================================================
# DOCUMENT CHAT / Q&A
# ============================================================

class DocumentChatView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        query = request.data.get(
            "query",
            ""
        ).strip()

        document_id = request.data.get(
            "document_id"
        )

        # ----------------------------------------------------
        # Validate question
        # ----------------------------------------------------

        if not query:

            return Response(
                {
                    "error": "Query is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Validate selected document
        # ----------------------------------------------------

        if not document_id:

            return Response(
                {
                    "error": (
                        "document_id is required. "
                        "Select a document first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # IMPORTANT:
        # Only retrieve the selected document belonging
        # to the currently authenticated user.
        # ----------------------------------------------------

        document = (
            Document.objects
            .filter(
                id=document_id,
                owner=request.user,
                processed=True
            )
            .first()
        )

        if document is None:

            return Response(
                {
                    "error": (
                        "Selected document is unavailable "
                        "or not processed."
                    )
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # ----------------------------------------------------
        # Get extracted text
        # ----------------------------------------------------

        full_text = (
            document.extracted_text or ""
        ).strip()

        if not full_text:

            return Response(
                {
                    "query": query,
                    "answer": (
                        "The selected document contains "
                        "no extracted text."
                    ),
                    "sources": [],
                    "document_id": document.id,
                    "document_title": document.title,
                },
                status=status.HTTP_200_OK
            )

        # ----------------------------------------------------
        # Get chunks ONLY from selected document
        # ----------------------------------------------------

        chunks = list(
            DocumentChunk.objects
            .filter(
                document=document
            )
            .order_by("chunk_index")
        )

        # ----------------------------------------------------
        # Short resumes:
        # send complete resume to the answer generator.
        # ----------------------------------------------------

        if len(full_text) <= 4000:

            context = full_text

        # ----------------------------------------------------
        # Long documents:
        # simple relevance retrieval scoped to this document.
        # ----------------------------------------------------

        else:

            query_terms = [
                term.lower()
                for term in re.findall(
                    r"[A-Za-z0-9+#.]+",
                    query
                )
                if len(term) > 2
            ]

            scored = []

            for chunk in chunks:

                content = (
                    chunk.content or ""
                )

                lowered = content.lower()

                score = sum(
                    lowered.count(term)
                    for term in query_terms
                )

                scored.append(
                    (
                        score,
                        chunk
                    )
                )

            scored.sort(
                key=lambda item: item[0],
                reverse=True
            )

            selected = [
                chunk
                for score, chunk in scored[:6]
                if chunk.content.strip()
            ]

            context = "\n\n".join(
                chunk.content.strip()
                for chunk in selected
            )

            if not context:

                context = full_text

        # ----------------------------------------------------
        # Generate grounded answer
        # ----------------------------------------------------

        try:

            import inspect

            parameters = (
                inspect
                .signature(generate_answer)
                .parameters
            )

            # Existing function:
            # generate_answer(query=..., context=...)
            if (
                "query" in parameters
                and "context" in parameters
            ):

                answer = generate_answer(
                    query=query,
                    context=context
                )

            # Alternative:
            # generate_answer(question=..., context=...)
            elif (
                "question" in parameters
                and "context" in parameters
            ):

                answer = generate_answer(
                    question=query,
                    context=context
                )

            # Alternative:
            # generate_answer(prompt=...)
            elif "prompt" in parameters:

                prompt = (
                    "Answer the user's question using ONLY "
                    "the selected document context below.\n\n"

                    "RULES:\n"
                    "1. Use only the selected document.\n"
                    "2. Do not invent information.\n"
                    "3. Do not use outside knowledge.\n"
                    "4. If the answer is not present, "
                    "say it is not present in the document.\n"
                    "5. Give a clear and direct answer.\n\n"

                    "SELECTED DOCUMENT:\n"
                    f"{context}\n\n"

                    "USER QUESTION:\n"
                    f"{query}"
                )

                answer = generate_answer(
                    prompt=prompt
                )

            # Fallback for positional implementation
            else:

                answer = generate_answer(
                    query,
                    context
                )

        except Exception as exc:

            return Response(
                {
                    "error": (
                        "Failed to generate grounded answer."
                    ),
                    "details": str(exc)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # ----------------------------------------------------
        # Return answer
        # ----------------------------------------------------

        return Response(
            {
                "query": query,
                "answer": answer,

                "sources": [
                    {
                        "document_id": document.id,
                        "document_title": document.title
                    }
                ],

                "document_id": document.id,
                "document_title": document.title,
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# DOCUMENT SEARCH
# ============================================================

class DocumentSearchView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        query = request.data.get(
            "query",
            ""
        ).strip()

        if not query:

            return Response(
                {
                    "error": "Query is required"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        results = search_documents(query)

        data = []

        for result in results:

            chunk = result["chunk"]

            data.append(
                {
                    "document_id": (
                        chunk.document.id
                    ),

                    "document_title": (
                        chunk.document.title
                    ),

                    "chunk_index": (
                        chunk.chunk_index
                    ),

                    "content": (
                        chunk.content
                    ),

                    "score": (
                        result["score"]
                    ),
                }
            )

        return Response(
            {
                "query": query,
                "results": data
            },
            status=status.HTTP_200_OK
        )

# ============================================================
# JOB MATCH
# ============================================================

class JobMatchView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        resume_text = request.data.get(
            "resume_text",
            ""
        ).strip()

        job_description = request.data.get(
            "job_description",
            ""
        ).strip()

        document_id = request.data.get(
            "document_id"
        )

        # ----------------------------------------------------
        # If a document is selected, ALWAYS use that resume.
        # ----------------------------------------------------

        if document_id:

            document = (
                Document.objects
                .filter(
                    id=document_id,
                    owner=request.user,
                    processed=True
                )
                .first()
            )

            if document is None:
                return Response(
                    {
                        "error": (
                            "Selected resume is unavailable "
                            "or not processed."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND
                )

            resume_text = (
                document.extracted_text or ""
            ).strip()

            if not resume_text:

                return Response(
                    {
                        "error": (
                            "Selected resume has no "
                            "readable extracted text."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # ----------------------------------------------------
        # Validate job description
        # ----------------------------------------------------

        if not job_description:

            return Response(
                {
                    "error": (
                        "Job description is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not resume_text:

            return Response(
                {
                    "error": (
                        "Resume text is required or "
                        "select a processed resume."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Run deterministic job matching engine
        # ----------------------------------------------------

        try:

            from .job_match import analyze_job_match

            result = analyze_job_match(
                resume_text=resume_text,
                job_description=job_description
            )

        except ValueError as exc:

            return Response(
                {
                    "error": str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as exc:

            return Response(
                {
                    "error": (
                        "Failed to analyze job match."
                    ),
                    "details": str(exc)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # ----------------------------------------------------
        # Add selected document information
        # ----------------------------------------------------

        if document_id:

            result["document_id"] = document.id
            result["document_title"] = document.title

        return Response(
            result,
            status=status.HTTP_200_OK
        )

# ============================================================
# DOCUMENT MANAGEMENT
# GET    /api/documents/<id>/  -> document details
# PATCH  /api/documents/<id>/  -> rename document
# DELETE /api/documents/<id>/  -> delete document
# ============================================================

class DocumentManageView(APIView):

    permission_classes = [IsAuthenticated]

    def get_document(self, request, document_id):

        return (
            Document.objects
            .filter(
                id=document_id,
                owner=request.user
            )
            .first()
        )

    def get(self, request, document_id):

        document = self.get_document(
            request,
            document_id
        )

        if document is None:

            return Response(
                {
                    "error": "Document not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            {
                "document": DocumentSerializer(
                    document
                ).data
            },
            status=status.HTTP_200_OK
        )

    def patch(self, request, document_id):

        document = self.get_document(
            request,
            document_id
        )

        if document is None:

            return Response(
                {
                    "error": "Document not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        title = request.data.get(
            "title"
        )

        if title is None:

            return Response(
                {
                    "error": "Title is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        title = str(title).strip()

        if not title:

            return Response(
                {
                    "error": "Title cannot be empty."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        document.title = title

        document.save(
            update_fields=["title"]
        )

        return Response(
            {
                "message": "Document updated successfully.",
                "document": DocumentSerializer(
                    document
                ).data
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request, document_id):

        document = self.get_document(
            request,
            document_id
        )

        if document is None:

            return Response(
                {
                    "error": "Document not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        document.delete()

        return Response(
            {
                "message": "Document deleted successfully."
            },
            status=status.HTTP_200_OK
        )