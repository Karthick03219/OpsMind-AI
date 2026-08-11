from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import DocumentSerializer
from .models import DocumentChunk
from .chunking import chunk_text
from .services import extract_text_from_pdf
from .embeddings import generate_embedding


class DocumentUploadView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):

        serializer = DocumentSerializer(data=request.data)

        if serializer.is_valid():

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

                # Split extracted text into chunks
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

                # Mark document as processed
                document.processed = True

                document.save(
                    update_fields=["processed"]
                )

            except Exception as e:
                return Response(
                    {
                        "message": "Document uploaded, but text processing failed",
                        "error": str(e)
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(
                {
                    "message": "Document uploaded and processed successfully",
                    "document": DocumentSerializer(document).data,
                    "chunks_created": len(chunks),
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )