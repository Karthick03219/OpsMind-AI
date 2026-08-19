from django.urls import path

from .views import (
    DocumentUploadView,
    DocumentSearchView,
    DocumentChatView,
    DocumentListView,
    JobMatchView,
    DocumentManageView,
)

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
    path(
        "chat/",
        DocumentChatView.as_view(),
        name="document-chat",
    ),
    path(
        "job-match/",
        JobMatchView.as_view(),
        name="job-match",
    ),
    path(
        "",
        DocumentListView.as_view(),
        name="document-list",
    ),
    path(
        "<int:document_id>/",
        DocumentManageView.as_view(),
        name="document-manage",
    ),
]