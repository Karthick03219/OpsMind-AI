from django.db import models
from django.conf import settings


class Document(models.Model):

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents"
    )

    title = models.CharField(max_length=255)

    file = models.FileField(
        upload_to="documents/"
    )

    extracted_text = models.TextField(
        blank=True,
        default=""
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    processed = models.BooleanField(
        default=False
    )

    def __str__(self):
        return self.title