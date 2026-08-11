from django.shortcuts import render

from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import DocumentSerializer
from .services import extract_text_from_pdf


class DocumentUploadView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):

        serializer = DocumentSerializer(data=request.data)

        if serializer.is_valid():

            document = serializer.save(owner=request.user)

            try:
                extracted_text = extract_text_from_pdf(
                    document.file.path
                )

                document.extracted_text = extracted_text
                document.processed = True

                document.save(
                    update_fields=["extracted_text", "processed"]
                )

            except Exception as e:
                return Response(
                    {
                        "message": "Document uploaded, but text extraction failed",
                        "error": str(e)
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(
                {
                    "message": "Document uploaded and processed successfully",
                    "document": DocumentSerializer(document).data,
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )