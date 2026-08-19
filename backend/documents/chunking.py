import re


# =============================================================
# SECTION-AWARE CHUNKING
# =============================================================

SECTION_HEADINGS = [
    "Education",
    "Experience",
    "Skills",
    "Projects /",
    "Certifications",
]


def normalize_pdf_text(text):
    """
    Normalize common PDF extraction whitespace
    without destroying useful section boundaries.
    """

    if not text:
        return ""

    # Normalize line endings.
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove null/control characters.
    text = text.replace("\x00", "")
    text = text.replace("\x1c", " ")

    # Fix common PDF extraction artifacts.
    text = text.replace("Arti cial", "Artificial")
    text = text.replace("classi cation", "classification")
    text = text.replace("Certi ed", "Certified")
    text = text.replace("Train ee", "Trainee")

    # Normalize spaces but preserve newlines.
    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )

    # Normalize excessive blank lines.
    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    return text.strip()


def split_into_sections(text):
    """
    Split a resume/document into logical sections.

    This is important because we don't want a Skills section
    to be mixed with the following Projects section.
    """

    sections = []

    lines = text.splitlines()

    current_heading = None
    current_lines = []

    def save_current_section():
        if not current_lines:
            return

        content = "\n".join(
            current_lines
        ).strip()

        if not content:
            return

        if current_heading:
            sections.append(
                (
                    current_heading,
                    content,
                )
            )
        else:
            sections.append(
                (
                    "",
                    content,
                )
            )

    for line in lines:

        stripped = line.strip()

        if not stripped:
            continue

        normalized = stripped.lower()

        matched_heading = None

        for heading in SECTION_HEADINGS:

            if normalized.startswith(
                heading.lower()
            ):
                matched_heading = heading
                break

        if matched_heading:

            save_current_section()

            current_heading = matched_heading

            current_lines = [
                stripped
            ]

        else:

            current_lines.append(
                stripped
            )

    save_current_section()

    return sections


def split_large_text(
    text,
    chunk_size=500,
    overlap=50,
):
    """
    Split a large section into smaller overlapping chunks.

    This is used only when a logical section is too large.
    """

    words = text.split()

    if not words:
        return []

    chunks = []

    current_words = []
    current_length = 0

    for word in words:

        additional_length = (
            len(word)
            if not current_words
            else len(word) + 1
        )

        if (
            current_words
            and
            current_length
            + additional_length
            > chunk_size
        ):

            chunk = " ".join(
                current_words
            ).strip()

            if chunk:
                chunks.append(
                    chunk
                )

            # Build overlap.
            overlap_words = []
            overlap_length = 0

            for previous_word in reversed(
                current_words
            ):

                extra_length = (
                    len(previous_word)
                    if not overlap_words
                    else len(previous_word) + 1
                )

                if (
                    overlap_length
                    + extra_length
                    > overlap
                ):
                    break

                overlap_words.insert(
                    0,
                    previous_word
                )

                overlap_length += extra_length

            current_words = (
                overlap_words
                + [word]
            )

            current_length = len(
                " ".join(
                    current_words
                )
            )

        else:

            current_words.append(
                word
            )

            current_length += (
                additional_length
            )

    if current_words:

        chunk = " ".join(
            current_words
        ).strip()

        if chunk:
            chunks.append(
                chunk
            )

    return chunks


def chunk_text(
    text,
    chunk_size=500,
    overlap=50,
):
    """
    Create section-aware document chunks.

    Important behavior:

    1. Preserve logical resume sections.
    2. Keep headings with their content.
    3. Prevent Skills from leaking into Projects.
    4. Split only large sections.
    5. Keep limited overlap only inside large sections.
    """

    if not text:
        return []

    text = normalize_pdf_text(
        text
    )

    if not text:
        return []

    sections = split_into_sections(
        text
    )

    if not sections:
        return split_large_text(
            text,
            chunk_size,
            overlap,
        )

    chunks = []

    for heading, content in sections:

        # -----------------------------------------------------
        # Keep small logical sections together.
        # -----------------------------------------------------

        if len(content) <= chunk_size:

            chunks.append(
                content
            )

            continue

        # -----------------------------------------------------
        # Large section.
        #
        # Split it, but keep the section heading attached to
        # the first chunk.
        # -----------------------------------------------------

        section_chunks = split_large_text(
            content,
            chunk_size,
            overlap,
        )

        if not section_chunks:
            continue

        chunks.extend(
            section_chunks
        )

    return chunks