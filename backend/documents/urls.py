from django.urls import path

from .views import DocumentUploadView, DocumentSearchView

urlpatterns = [
    path(
        "upload/",
        DocumentUploadView.as_view(),
        name="document-upload",
    ),
    path(
        "search/",
        DocumentSearchView.as_view(),
        name="document-search",
    ),
]