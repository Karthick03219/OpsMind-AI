import re


# =========================================================
# TEXT CLEANING
# =========================================================

def clean_text(text):
    """Clean common PDF extraction artifacts."""

    if not text:
        return ""

    text = str(text)

    replacements = {
        "Ã‚": "",
        "Ã¢â‚¬Â¢": "•",
        "â€¢": "•",
        "\x00": "",
        "\x1c": "fi",
        "\x88": "",
        "Arti cial": "Artificial",
        "classi cation": "classification",
        "Certi ed": "Certified",
        "Train ee": "Trainee",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    # Preserve useful separators while normalizing whitespace.
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)

    return text.strip()


def normalize_text(text):
    """Normalize text for matching."""

    return clean_text(text).lower()


# =========================================================
# GENERIC SECTION EXTRACTION
# =========================================================

SECTION_HEADINGS = [
    "technical skills",
    "technical skill",
    "key skills",
    "core skills",
    "skills",
    "technical expertise",
    "core competencies",
    "technologies",
    "technology",
    "tools and technologies",
    "tools & technologies",
    "tools / technologies",
    "tools/platforms",
    "programming languages",
    "experience",
    "work experience",
    "professional experience",
    "education",
    "academic background",
    "projects",
    "personal projects",
    "certifications",
    "achievements",
    "internships",
    "languages",
]


def extract_between(text, start, end_patterns):
    """Extract text between a heading and the next heading."""

    if not text or not start:
        return ""

    match = re.search(
        re.escape(start),
        text,
        flags=re.IGNORECASE,
    )

    if not match:
        return ""

    content = text[match.end():]

    positions = []

    for pattern in end_patterns:

        next_match = re.search(
            pattern,
            content,
            flags=re.IGNORECASE,
        )

        if next_match:
            positions.append(
                next_match.start()
            )

    if positions:
        content = content[:min(positions)]

    return clean_text(content)


def find_section(text, heading_patterns, end_patterns):
    """
    Find a resume section using multiple possible heading names.
    """

    if not text:
        return ""

    best_match = None

    combined = (
        r"(?:"
        + "|".join(
            re.escape(pattern)
            for pattern in heading_patterns
        )
        + r")"
    )

    match = re.search(
        combined,
        text,
        flags=re.IGNORECASE,
    )

    if not match:
        return ""

    content = text[match.end():]

    positions = []

    for pattern in end_patterns:

        next_match = re.search(
            pattern,
            content,
            flags=re.IGNORECASE,
        )

        if next_match:
            positions.append(
                next_match.start()
            )

    if positions:
        content = content[:min(positions)]

    return clean_text(content)


# =========================================================
# SKILLS
# =========================================================

def clean_skill_list(text):
    """Clean and deduplicate extracted skills."""

    if not text:
        return ""

    text = clean_text(text)

    # Convert common bullet/separator formats.
    text = re.sub(
        r"[•▪◦●]",
        ",",
        text,
    )

    text = text.replace(
        " | ",
        ", "
    )

    text = re.sub(
        r"\s*;\s*",
        ", ",
        text,
    )

    # Remove repeated whitespace.
    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    items = []

    for item in text.split(","):

        item = item.strip(
            " :-•|;"
        )

        if not item:
            continue

        # Remove generic labels accidentally captured.
        if item.lower() in {
            "technical skills",
            "technical skill",
            "skills",
            "key skills",
            "core skills",
            "technical expertise",
            "technologies",
        }:
            continue

        if item.lower() not in [
            existing.lower()
            for existing in items
        ]:
            items.append(item)

    return ", ".join(items)


def extract_labelled_skills(context):
    """
    Extract skills from labelled resume fields such as:

    Programming Languages:
    Frameworks:
    Tools:
    Databases:
    """

    if not context:
        return []

    labels = [
        "programming languages",
        "languages",
        "frameworks",
        "libraries/frameworks",
        "libraries",
        "tools / platforms",
        "tools/platforms",
        "tools and technologies",
        "tools & technologies",
        "tools",
        "platforms",
        "databases",
        "technologies",
        "technical skills",
        "skills",
    ]

    found = []

    for label in labels:

        pattern = (
            r"\b"
            + re.escape(label)
            + r"\s*:\s*"
            r"(.*?)(?="
            r"\b(?:programming languages|languages|"
            r"frameworks|libraries/frameworks|libraries|"
            r"tools / platforms|tools/platforms|"
            r"tools and technologies|tools & technologies|"
            r"tools|platforms|databases|"
            r"technologies|technical skills|skills)"
            r"\s*:|"
            r"\n\s*[A-Z][A-Za-z &/]+:"
            r"|$)"
        )

        matches = re.finditer(
            pattern,
            context,
            flags=re.IGNORECASE,
        )

        for match in matches:

            value = clean_skill_list(
                match.group(1)
            )

            if value:
                found.append(value)

    return found


def get_skills_answer(context):
    """
    Extract technical skills from ANY resume format.

    This function intentionally does not use a person's name
    or a specific resume structure.
    """

    if not context:
        return ""

    context = clean_text(context)

    # -----------------------------------------------------
    # First try labelled fields.
    # -----------------------------------------------------

    labelled = extract_labelled_skills(
        context
    )

    if labelled:

        unique = []

        for item in labelled:

            if item.lower() not in [
                existing.lower()
                for existing in unique
            ]:
                unique.append(item)

        return (
            "The candidate's technical skills include:\n\n"
            + "\n".join(
                f"• {item}"
                for item in unique
            )
        )

    # -----------------------------------------------------
    # Otherwise locate a normal Skills section.
    # -----------------------------------------------------

    end_patterns = [
        r"\b(?:work\s+experience|professional\s+experience|"
        r"experience|education|academic\s+background|"
        r"projects?|personal\s+projects?|"
        r"certifications?|achievements?|"
        r"internships?|languages?|references?)\b",
    ]

    skills_context = find_section(
        context,
        [
            "technical skills",
            "technical skill",
            "key skills",
            "core skills",
            "skills",
            "technical expertise",
            "core competencies",
            "technologies",
            "tools and technologies",
            "tools & technologies",
        ],
        end_patterns,
    )

    if skills_context:

        skills_context = clean_skill_list(
            skills_context
        )

        if skills_context:
            return (
                "The candidate's technical skills include:\n\n"
                + skills_context
            )

    # -----------------------------------------------------
    # Last fallback:
    # search for common technical technologies directly.
    # -----------------------------------------------------

    common_technologies = [
        "Python",
        "Java",
        "JavaScript",
        "TypeScript",
        "C",
        "C++",
        "C#",
        "SQL",
        "HTML",
        "CSS",
        "React",
        "React.js",
        "Angular",
        "Vue",
        "Node.js",
        "Django",
        "Flask",
        "FastAPI",
        "Spring",
        "Spring Boot",
        "MongoDB",
        "MySQL",
        "PostgreSQL",
        "Oracle",
        "Redis",
        "Git",
        "GitHub",
        "Docker",
        "Kubernetes",
        "AWS",
        "Azure",
        "GCP",
        "TensorFlow",
        "PyTorch",
        "scikit-learn",
        "Pandas",
        "NumPy",
        "OpenCV",
        "NLP",
        "Machine Learning",
        "Deep Learning",
        "Artificial Intelligence",
        "Generative AI",
        "REST API",
        "REST APIs",
        "Power BI",
        "Tableau",
    ]

    normalized_context = normalize_text(
        context
    )

    found = []

    for technology in common_technologies:

        if technology.lower() in normalized_context:

            if technology.lower() not in [
                item.lower()
                for item in found
            ]:
                found.append(technology)

    if found:

        return (
            "The candidate's technical skills include:\n\n"
            + ", ".join(found)
        )

    return ""


# =========================================================
# EDUCATION
# =========================================================

def get_education_answer(context):
    """Extract education information generically."""

    context = clean_text(context)

    education = find_section(
        context,
        [
            "education",
            "academic background",
            "academic qualifications",
            "educational qualifications",
        ],
        [
            r"\b(?:experience|work experience|professional experience|"
            r"skills?|technical skills|projects?|"
            r"certifications?|achievements?)\b",
        ],
    )

    if not education:
        return ""

    return (
        "The candidate's education includes:\n\n"
        + education
    )


# =========================================================
# CGPA / GPA
# =========================================================

def get_cgpa_answer(context):
    """Extract CGPA/GPA from any resume."""

    context = clean_text(context)

    patterns = [
        r"\bCGPA\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)",
        r"\bGPA\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)",
        r"\bCGPA\s+of\s+([0-9]+(?:\.[0-9]+)?)",
        r"\bGPA\s+of\s+([0-9]+(?:\.[0-9]+)?)",
    ]

    for pattern in patterns:

        match = re.search(
            pattern,
            context,
            flags=re.IGNORECASE,
        )

        if match:
            return (
                f"The candidate's CGPA/GPA is "
                f"{match.group(1)}."
            )

    return ""


# =========================================================
# DUPLICATE OVERLAP CLEANING
# =========================================================

def remove_duplicate_overlap(text):
    """Remove repeated phrases caused by chunk overlap."""

    if not text:
        return ""

    words = text.split()

    cleaned_words = []

    i = 0

    while i < len(words):

        duplicate_found = False

        for size in range(12, 3, -1):

            if i + (size * 2) > len(words):
                continue

            first = words[
                i:i + size
            ]

            second = words[
                i + size:i + (size * 2)
            ]

            if (
                [
                    word.lower()
                    for word in first
                ]
                ==
                [
                    word.lower()
                    for word in second
                ]
            ):

                cleaned_words.extend(
                    first
                )

                i += size * 2

                duplicate_found = True

                break

        if not duplicate_found:

            cleaned_words.append(
                words[i]
            )

            i += 1

    return " ".join(
        cleaned_words
    )


# =========================================================
# EXPERIENCE
# =========================================================

def get_experience_answer(context):
    """Extract work experience generically."""

    context = clean_text(context)

    experience = find_section(
        context,
        [
            "experience",
            "work experience",
            "professional experience",
            "employment history",
            "work history",
            "internship",
            "internships",
        ],
        [
            r"\b(?:skills?|technical skills|"
            r"education|academic background|"
            r"projects?|personal projects|"
            r"certifications?|achievements?)\b",
        ],
    )

    if not experience:
        return ""

    experience = remove_duplicate_overlap(
        experience
    )

    return (
        "The candidate's experience includes:\n\n"
        + experience
    )


# =========================================================
# PROJECTS
# =========================================================

def get_projects_answer(context, query=""):
    """Extract project information generically."""

    context = clean_text(context)

    projects = find_section(
        context,
        [
            "projects",
            "personal projects",
            "academic projects",
            "key projects",
            "major projects",
        ],
        [
            r"\b(?:experience|work experience|"
            r"professional experience|education|"
            r"academic background|skills?|"
            r"technical skills|certifications?|"
            r"achievements?)\b",
        ],
    )

    if not projects:
        return ""

    projects = remove_duplicate_overlap(
        projects
    )

    return (
        "The candidate's projects include:\n\n"
        + projects
    )


# =========================================================
# CERTIFICATIONS
# =========================================================

def get_certifications_answer(context):
    """Extract certifications generically."""

    context = clean_text(context)

    certifications = find_section(
        context,
        [
            "certifications",
            "certificates",
            "professional certifications",
        ],
        [
            r"\b(?:experience|work experience|"
            r"education|academic background|"
            r"skills?|technical skills|"
            r"projects?|achievements?)\b",
        ],
    )

    if not certifications:
        return ""

    return (
        "The candidate's certifications include:\n\n"
        + certifications
    )


# =========================================================
# CONTACT / PERSONAL DETAILS
# =========================================================

def get_contact_answer(context, query):
    """Extract common contact details when explicitly asked."""

    context = clean_text(context)
    query_lower = normalize_text(query)

    if "email" in query_lower:

        match = re.search(
            r"\b[A-Za-z0-9._%+-]+@"
            r"[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
            context,
        )

        if match:
            return (
                f"The candidate's email is "
                f"{match.group(0)}."
            )

    if (
        "phone" in query_lower
        or "mobile" in query_lower
        or "contact number" in query_lower
    ):

        match = re.search(
            r"(?:\+91[\s-]?)?"
            r"\b[6-9]\d{9}\b",
            context,
        )

        if match:
            return (
                f"The candidate's phone number is "
                f"{match.group(0)}."
            )

    return ""


# =========================================================
# MAIN ANSWER GENERATOR
# =========================================================

def generate_answer(query, context):
    """
    Generate a grounded answer from the SELECTED resume.

    No person's name is hard-coded.
    No resume-specific heading is required.
    """

    if not context:
        return (
            "I couldn't find a reliable answer to that "
            "question in the provided document."
        )

    query_lower = normalize_text(
        query
    )

    # -----------------------------------------------------
    # CONTACT
    # -----------------------------------------------------

    if (
        "email" in query_lower
        or "phone" in query_lower
        or "mobile" in query_lower
        or "contact number" in query_lower
    ):

        answer = get_contact_answer(
            context,
            query
        )

        if answer:
            return answer

    # -----------------------------------------------------
    # SKILLS
    # -----------------------------------------------------

    skills_keywords = [
        "technical skill",
        "technical skills",
        "programming language",
        "programming languages",
        "framework",
        "frameworks",
        "database",
        "databases",
        "libraries",
        "library",
        "technologies",
        "technology",
        "tech stack",
        "technical expertise",
        "core competencies",
        "skills",
    ]

    if any(
        keyword in query_lower
        for keyword in skills_keywords
    ):

        answer = get_skills_answer(
            context
        )

        if answer:
            return answer

    # -----------------------------------------------------
    # PROJECTS
    # -----------------------------------------------------

    project_keywords = [
        "project",
        "projects",
        "project work",
        "developed",
        "built",
        "application",
        "applications",
    ]

    if any(
        keyword in query_lower
        for keyword in project_keywords
    ):

        answer = get_projects_answer(
            context,
            query
        )

        if answer:
            return answer

    # -----------------------------------------------------
    # CGPA / GPA
    # -----------------------------------------------------

    if (
        "cgpa" in query_lower
        or "gpa" in query_lower
        or "grade" in query_lower
    ):

        answer = get_cgpa_answer(
            context
        )

        if answer:
            return answer

    # -----------------------------------------------------
    # EDUCATION
    # -----------------------------------------------------

    if (
        "education" in query_lower
        or "degree" in query_lower
        or "college" in query_lower
        or "university" in query_lower
        or "school" in query_lower
        or (
            "where did" in query_lower
            and "study" in query_lower
        )
    ):

        answer = get_education_answer(
            context
        )

        if answer:
            return answer

    # -----------------------------------------------------
    # EXPERIENCE
    # -----------------------------------------------------

    if (
        "experience" in query_lower
        or "work experience" in query_lower
        or "worked" in query_lower
        or "employment" in query_lower
        or "internship" in query_lower
        or "internships" in query_lower
        or "trainee" in query_lower
        or "job history" in query_lower
    ):

        answer = get_experience_answer(
            context
        )

        if answer:
            return answer

    # -----------------------------------------------------
    # CERTIFICATIONS
    # -----------------------------------------------------

    if (
        "certification" in query_lower
        or "certifications" in query_lower
        or "certificate" in query_lower
        or "certificates" in query_lower
    ):

        answer = get_certifications_answer(
            context
        )

        if answer:
            return answer

    # -----------------------------------------------------
    # Generic fallback
    # -----------------------------------------------------
    #
    # We deliberately do NOT invent an answer.
    # The selected document remains the only source.
    # -----------------------------------------------------

    return (
        "I couldn't find a reliable answer to that "
        "question in the provided document."
    )