import math

from .models import DocumentChunk
from .embeddings import generate_embedding


def cosine_similarity(vector_a, vector_b):
    if not vector_a or not vector_b:
        return 0.0

    dot_product = sum(
        a * b
        for a, b in zip(vector_a, vector_b)
    )

    magnitude_a = math.sqrt(
        sum(a * a for a in vector_a)
    )

    magnitude_b = math.sqrt(
        sum(b * b for b in vector_b)
    )

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot_product / (
        magnitude_a * magnitude_b
    )


def search_documents(query, top_k=3, user=None, document_id=None):
    """
    Search document chunks.

    Security:
    - If user is provided, search only that user's documents.
    - If document_id is provided, search only that document.
    """

    if not query:
        return []

    query_lower = query.lower().strip()

    query_embedding = generate_embedding(query)

    # ---------------------------------------------------------
    # Build queryset
    # ---------------------------------------------------------

    chunks = (
        DocumentChunk.objects
        .select_related("document")
        .exclude(embedding__isnull=True)
        .exclude(embedding=[])
    )

    # ---------------------------------------------------------
    # SECURITY: restrict to logged-in user's documents
    # ---------------------------------------------------------

    if user is not None:
        chunks = chunks.filter(
            document__owner=user
        )

    # ---------------------------------------------------------
    # Optional document filter
    # ---------------------------------------------------------

    if document_id is not None:
        chunks = chunks.filter(
            document_id=document_id
        )

    # ---------------------------------------------------------
    # Detect question type
    # ---------------------------------------------------------

    skills_query = any(
        phrase in query_lower
        for phrase in [
            "technical skills",
            "technical skill",
            "skills",
            "programming languages",
            "libraries",
            "frameworks",
            "technologies",
            "tech stack",
            "tools",
            "databases",
        ]
    )

    project_query = any(
        phrase in query_lower
        for phrase in [
            "project",
            "projects",
        ]
    )

    education_query = any(
        phrase in query_lower
        for phrase in [
            "cgpa",
            "education",
            "degree",
            "college",
            "university",
            "study",
        ]
    )

    experience_query = any(
        phrase in query_lower
        for phrase in [
            "experience",
            "work experience",
            "internship",
            "training",
            "trainee",
        ]
    )

    certification_query = any(
        phrase in query_lower
        for phrase in [
            "certification",
            "certifications",
            "certificate",
        ]
    )

    # ---------------------------------------------------------
    # Score every chunk
    # ---------------------------------------------------------

    results = []

    for chunk in chunks:

        content_lower = chunk.content.lower()

        score = cosine_similarity(
            query_embedding,
            chunk.embedding
        )

        # -----------------------------------------------------
        # Skills
        # -----------------------------------------------------

        if skills_query:

            if content_lower.startswith("skills"):
                score += 2.0

            elif "\nskills\n" in content_lower:
                score += 2.0

            elif "programming languages:" in content_lower:
                score += 1.5

            elif "libraries/frameworks:" in content_lower:
                score += 1.5

            elif "tools / platforms:" in content_lower:
                score += 1.5

            elif "databases:" in content_lower:
                score += 1.5

        # -----------------------------------------------------
        # Projects
        # -----------------------------------------------------

        if project_query:

            if content_lower.startswith("projects /"):
                score += 2.0

            elif "projects /" in content_lower:
                score += 1.5

            elif "driver drowsiness detection" in content_lower:
                score += 1.0

            elif "ai chatbot" in content_lower:
                score += 1.0

        # -----------------------------------------------------
        # Education
        # -----------------------------------------------------

        if education_query:

            if content_lower.startswith("education"):
                score += 2.0

            elif "\neducation\n" in content_lower:
                score += 2.0

            elif "cgpa:" in content_lower:
                score += 1.5

        # -----------------------------------------------------
        # Experience
        # -----------------------------------------------------

        if experience_query:

            if content_lower.startswith("experience"):
                score += 2.0

            elif "\nexperience" in content_lower:
                score += 2.0

            elif "dhee coding lab" in content_lower:
                score += 1.0

        # -----------------------------------------------------
        # Certifications
        # -----------------------------------------------------

        if certification_query:

            if content_lower.startswith("certifications"):
                score += 2.0

            elif "\ncertifications" in content_lower:
                score += 2.0

        results.append(
            {
                "chunk": chunk,
                "score": score,
            }
        )

    # ---------------------------------------------------------
    # Sort highest score first
    # ---------------------------------------------------------

    results.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return results[:top_k]