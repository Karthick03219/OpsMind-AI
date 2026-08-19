import re


# =========================================================
# SKILL ALIASES
# =========================================================

SKILL_ALIASES = {
    "python": ["python"],
    "java": ["java"],
    "javascript": ["javascript", "js"],
    "typescript": ["typescript", "ts"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "c sharp"],
    "sql": ["sql"],
    "html": ["html", "html5"],
    "css": ["css", "css3"],

    "react": [
        "react",
        "react.js",
        "reactjs",
    ],

    "angular": ["angular"],

    "node.js": [
        "node.js",
        "nodejs",
        "node js",
    ],

    "django": ["django"],
    "flask": ["flask"],
    "fastapi": ["fastapi"],

    "spring": [
        "spring",
        "spring framework",
    ],

    "spring boot": [
        "spring boot",
        "springboot",
    ],

    "rest api": [
        "rest api",
        "rest apis",
        "restful api",
        "restful apis",
    ],

    "graphql": ["graphql"],

    "git": ["git"],
    "github": ["github"],

    "docker": [
        "docker",
        "containerization",
    ],

    "kubernetes": [
        "kubernetes",
        "k8s",
    ],

    "aws": [
        "aws",
        "amazon web services",
    ],

    "azure": [
        "azure",
        "microsoft azure",
    ],

    "gcp": [
        "gcp",
        "google cloud",
    ],

    "mongodb": [
        "mongodb",
        "mongo db",
    ],

    "mysql": ["mysql"],

    "postgresql": [
        "postgresql",
        "postgres",
    ],

    "redis": ["redis"],

    "oracle": ["oracle"],

    "tensorflow": ["tensorflow"],
    "keras": ["keras"],
    "pytorch": ["pytorch"],

    "scikit-learn": [
        "scikit-learn",
        "sklearn",
    ],

    "opencv": [
        "opencv",
        "open cv",
    ],

    "nlp": [
        "nlp",
        "natural language processing",
    ],

    "machine learning": [
        "machine learning",
        "ml",
    ],

    "deep learning": [
        "deep learning",
    ],

    "generative ai": [
        "generative ai",
        "genai",
        "gen ai",
    ],

    "llm": [
        "llm",
        "large language model",
        "large language models",
    ],

    "data science": [
        "data science",
    ],

    "pandas": ["pandas"],
    "numpy": ["numpy"],

    "streamlit": ["streamlit"],

    "power bi": [
        "power bi",
        "powerbi",
    ],

    "excel": ["excel"],
    "tableau": ["tableau"],

    "spark": [
        "spark",
        "apache spark",
    ],

    "linux": ["linux"],

    "ci/cd": [
        "ci/cd",
        "continuous integration",
        "continuous delivery",
        "continuous integration and continuous delivery",
    ],

    "jenkins": ["jenkins"],
    "terraform": ["terraform"],

    "oop": [
        "oop",
        "object oriented programming",
        "object-oriented programming",
        "object oriented",
        "object-oriented",
    ],

    "problem solving": [
        "problem solving",
        "problem-solving",
    ],

    "communication": [
        "communication skills",
        "communication",
    ],
}


# =========================================================
# ROLE TERMS
# =========================================================

ROLE_TERMS = [
    "software engineer",
    "software developer",
    "full stack",
    "backend",
    "frontend",
    "web developer",
    "python developer",
    "java developer",
    "data scientist",
    "data analyst",
    "machine learning engineer",
    "ai engineer",
    "ml engineer",
    "devops",
    "cloud engineer",
    "developer",
    "engineer",
    "analyst",
]


# =========================================================
# DEGREE TERMS
# =========================================================

DEGREE_TERMS = [
    "b.e",
    "bachelor of engineering",
    "bachelor of technology",
    "b.tech",
    "m.e",
    "m.tech",
    "master of engineering",
    "master of technology",
    "mca",
    "bca",
    "b.sc",
    "m.sc",
    "mba",
    "computer science",
    "information technology",
    "artificial intelligence",
    "machine learning",
    "electronics",
    "electrical",
]


# =========================================================
# NORMALIZATION
# =========================================================

def _norm(text):
    text = (text or "").lower()

    text = text.replace(
        "&",
        " and "
    )

    text = re.sub(
        r"[^a-z0-9+#./-]+",
        " ",
        text
    )

    return re.sub(
        r"\s+",
        " ",
        text
    ).strip()


def _contains(text, phrase):
    normalized_text = _norm(text)
    normalized_phrase = _norm(phrase)

    return (
        f" {normalized_phrase} "
        in
        f" {normalized_text} "
    )


# =========================================================
# SKILL EXTRACTION
# =========================================================

def _extract_skills(text):
    """
    Extract canonical skills from resume/JD text.
    """

    found = set()

    for canonical, aliases in SKILL_ALIASES.items():

        for alias in aliases:

            if _contains(text, alias):

                found.add(
                    canonical
                )

                break

    return found


# =========================================================
# GENERIC TERM EXTRACTION
# =========================================================

def _extract_terms(text, vocabulary):

    return {
        term
        for term in vocabulary
        if _contains(text, term)
    }


# =========================================================
# EXPERIENCE YEARS
# =========================================================

def _extract_years(text):

    values = []

    for value in re.findall(
        r"(?<!\d)"
        r"(\d+(?:\.\d+)?)"
        r"\s*\+?\s*"
        r"(?:years?|yrs?)\b",
        _norm(text),
    ):

        try:

            values.append(
                float(value)
            )

        except ValueError:
            pass

    return (
        max(values)
        if values
        else 0.0
    )


# =========================================================
# ROLE ALIASES
# =========================================================

ROLE_ALIASES = {

    "software engineer": [
        "software engineer",
        "software developer",
    ],

    "full stack": [
        "full stack",
        "full-stack",
    ],

    "backend": [
        "backend",
        "back end",
    ],

    "frontend": [
        "frontend",
        "front end",
    ],

    "python developer": [
        "python developer",
    ],

    "java developer": [
        "java developer",
    ],

    "data scientist": [
        "data scientist",
    ],

    "data analyst": [
        "data analyst",
    ],

    "machine learning engineer": [
        "machine learning engineer",
        "ml engineer",
    ],

    "ai engineer": [
        "ai engineer",
        "artificial intelligence engineer",
    ],

    "devops": [
        "devops",
        "dev ops",
    ],

    "developer": [
        "developer",
    ],

    "engineer": [
        "engineer",
    ],

    "analyst": [
        "analyst",
    ],
}


# =========================================================
# DEGREE ALIASES
# =========================================================

DEGREE_ALIASES = {

    "bachelor": [
        "bachelor",
        "bachelor's",
        "b.e",
        "b.tech",
        "btech",
        "bca",
        "b.sc",
        "bsc",
    ],

    "master": [
        "master",
        "master's",
        "m.e",
        "m.tech",
        "mtech",
        "mca",
        "m.sc",
        "msc",
    ],
}


# =========================================================
# FIELD ALIASES
# =========================================================

FIELD_ALIASES = {

    "computer science": [
        "computer science",
        "cse",
    ],

    "information technology": [
        "information technology",
        "information science",
    ],

    "electronics": [
        "electronics",
        "ece",
        "electronics and communication",
    ],

    "electrical": [
        "electrical",
        "eee",
    ],

    "artificial intelligence": [
        "artificial intelligence",
    ],

    "machine learning": [
        "machine learning",
    ],

    "data science": [
        "data science",
    ],

    "software engineering": [
        "software engineering",
    ],
}


# =========================================================
# ROLE EXTRACTION
# =========================================================

def _extract_roles(text):

    return {
        role
        for role, aliases in ROLE_ALIASES.items()
        if any(
            _contains(text, alias)
            for alias in aliases
        )
    }


# =========================================================
# DEGREE EXTRACTION
# =========================================================

def _extract_degree_levels(text):

    return {
        level
        for level, aliases in DEGREE_ALIASES.items()
        if any(
            _contains(text, alias)
            for alias in aliases
        )
    }


# =========================================================
# FIELD EXTRACTION
# =========================================================

def _extract_fields(text):

    return {
        field
        for field, aliases in FIELD_ALIASES.items()
        if any(
            _contains(text, alias)
            for alias in aliases
        )
    }


# =========================================================
# SECTION EXTRACTION
# =========================================================

def _section(text, names):

    pattern = (
        r"(?is)\b(?:"
        + "|".join(names)
        + r")\b.*"
    )

    match = re.search(
        pattern,
        text or "",
    )

    return (
        match.group(0)
        if match
        else ""
    )


# =========================================================
# SCORE
# =========================================================

def _score(required, present):

    if not required:
        return 100

    return round(
        100
        * len(
            required & present
        )
        / len(required)
    )


# =========================================================
# REQUIRED / PREFERRED SKILLS
# =========================================================

def _required_preferred(jd):
    """
    Split a JD into explicit required and preferred sections.

    Supports:

    Required Skills
    Required Qualifications
    Requirements
    Must Have
    Mandatory
    Preferred Skills
    Preferred Qualifications
    Good to Have
    Nice to Have
    Desired Skills
    """

    all_skills = _extract_skills(
        jd
    )

    heading_pattern = re.compile(
        r"(?im)^\s*(?:"

        r"required(?:\s+skills?)?|"

        r"required\s+qualifications?|"

        r"requirements?|"

        r"must[- ]have(?:\s+skills?)?|"

        r"mandatory(?:\s+skills?)?|"

        r"qualifications?|"

        r"preferred(?:\s+skills?)?|"

        r"preferred\s+qualifications?|"

        r"good\s+to\s+have|"

        r"nice\s+to\s+have|"

        r"desired(?:\s+skills?)?|"

        r"responsibilities|"

        r"about\s+the\s+role|"

        r"what\s+you(?:'|’)ll\s+do|"

        r"skills?|"

        r"experience|"

        r"education|"

        r"benefits?|"

        r"location"

        r")\s*:?\s*$"
    )

    headings = list(
        heading_pattern.finditer(
            jd or ""
        )
    )

    required_text = []
    preferred_text = []

    for i, match in enumerate(
        headings
    ):

        heading = _norm(
            match.group(0)
        )

        start = match.end()

        end = (
            headings[i + 1].start()
            if i + 1 < len(headings)
            else len(jd)
        )

        block = jd[
            start:end
        ]

        # -------------------------
        # Preferred
        # -------------------------

        if (
            heading.startswith(
                "preferred"
            )
            or "good to have"
            in heading
            or "nice to have"
            in heading
            or heading.startswith(
                "desired"
            )
        ):

            preferred_text.append(
                block
            )

        # -------------------------
        # Required
        # -------------------------

        elif (
            heading.startswith(
                "required"
            )
            or heading.startswith(
                "requirement"
            )
            or "must have"
            in heading
            or heading.startswith(
                "mandatory"
            )
            or heading.startswith(
                "qualification"
            )
        ):

            required_text.append(
                block
            )

    required = _extract_skills(
        "\n".join(
            required_text
        )
    )

    preferred = _extract_skills(
        "\n".join(
            preferred_text
        )
    )

    # -------------------------
    # Fallback
    # -------------------------

    if (
        not required
        and not preferred
    ):

        required = set(
            all_skills
        )

    # A skill cannot be both.
    preferred -= required

    return (
        required,
        preferred
    )


# =========================================================
# EDUCATION SCORE
# =========================================================

def _education_score(
    resume,
    jd
):

    jd_levels = (
        _extract_degree_levels(
            jd
        )
    )

    res_levels = (
        _extract_degree_levels(
            resume
        )
    )

    jd_fields = (
        _extract_fields(
            jd
        )
    )

    res_fields = (
        _extract_fields(
            resume
        )
    )

    if (
        not jd_levels
        and not jd_fields
    ):

        return 100

    level = (
        bool(
            jd_levels
            & res_levels
        )
        if jd_levels
        else True
    )

    field = (
        bool(
            jd_fields
            & res_fields
        )
        if jd_fields
        else True
    )

    if level and field:
        return 100

    if level:
        return 75

    if field:
        return 60

    return 25


# =========================================================
# EXPERIENCE SCORE
# =========================================================

def _experience_score(
    resume,
    jd
):

    required_years = (
        _extract_years(jd)
    )

    resume_years = (
        _extract_years(resume)
    )

    jd_roles = (
        _extract_roles(jd)
    )

    res_roles = (
        _extract_roles(resume)
    )

    # -------------------------
    # Years
    # -------------------------

    if required_years:

        if resume_years >= required_years:

            years = 100

        elif not resume_years:

            years = 40

        else:

            years = round(
                100
                * resume_years
                / required_years
            )

    else:

        years = 100

    # -------------------------
    # Role
    # -------------------------

    role = _score(
        jd_roles,
        res_roles
    )

    if jd_roles:

        score = round(
            years * 0.65
            + role * 0.35
        )

    else:

        score = years

    return min(
        100,
        score
    )


# =========================================================
# PROJECT SCORE
# =========================================================

def _project_score(
    resume,
    required,
    preferred
):

    project_text = _section(
        resume,
        [
            "projects?",
            "project experience",
            "academic projects?",
            "personal projects?",
            "portfolio",
            "open[- ]source",
        ],
    )

    if not project_text:

        project_text = resume

    project_skills = (
        _extract_skills(
            project_text
        )
    )

    core = _score(
        required,
        project_skills
    )

    pref = (
        _score(
            preferred,
            project_skills
        )
        if preferred
        else 100
    )

    return round(
        core * 0.75
        + pref * 0.25
    )


# =========================================================
# CERTIFICATION SCORE
# =========================================================

def _cert_score(
    resume,
    jd
):

    if not re.search(
        r"\b("
        r"certification|"
        r"certified|"
        r"certificate"
        r")\b",
        jd,
        re.I,
    ):

        return 100

    cert_text = _section(
        resume,
        [
            "certifications?",
            "certificates?",
            "certified",
        ],
    )

    if not cert_text:

        cert_text = resume

    jd_skills = (
        _extract_skills(
            jd
        )
    )

    cert_skills = (
        _extract_skills(
            cert_text
        )
    )

    if jd_skills:

        return _score(
            jd_skills,
            cert_skills
        )

    return (
        100
        if cert_text.strip()
        else 50
    )


# =========================================================
# TEXT RELEVANCE
# =========================================================

def _text_score(
    resume,
    jd
):

    stop = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "this",
        "from",
        "are",
        "you",
        "your",
        "our",
        "will",
        "have",
        "has",
        "job",
        "role",
        "work",
        "years",
        "candidate",
        "team",
        "looking",
        "strong",
        "good",
        "knowledge",
        "experience",
    }

    a = (
        set(
            re.findall(
                r"[a-z][a-z0-9+#.-]{2,}",
                _norm(jd),
            )
        )
        - stop
    )

    b = (
        set(
            re.findall(
                r"[a-z][a-z0-9+#.-]{2,}",
                _norm(resume),
            )
        )
        - stop
    )

    return (
        round(
            100
            * len(a & b)
            / len(a)
        )
        if a
        else 0
    )


# =========================================================
# MAIN JOB MATCH
# =========================================================

def analyze_job_match(
    resume_text,
    job_description
):
    """
    Generic Resume <-> Job Description matcher.

    Weights:

    Required skills     40%
    Preferred skills    15%
    Experience          15%
    Projects            10%
    Education           10%
    Certifications       5%
    Text relevance       5%
    """

    if not (
        resume_text or ""
    ).strip():

        raise ValueError(
            "Resume text is empty."
        )

    if not (
        job_description or ""
    ).strip():

        raise ValueError(
            "Job description is empty."
        )

    resume = resume_text
    jd = job_description

    # =====================================================
    # RESUME QUALITY CHECK
    # =====================================================

    cleaned_resume = _norm(
        resume
    )

    if len(cleaned_resume) < 40:

        raise ValueError(
            "Not enough readable text was "
            "extracted from this resume. "
            "Please re-upload the PDF or "
            "use a text-readable PDF."
        )

    # =====================================================
    # SKILLS
    # =====================================================

    resume_skills = _extract_skills(
        resume
    )

    required, preferred = (
        _required_preferred(jd)
    )

    # =====================================================
    # SKILL SCORES
    # =====================================================

    required_score = _score(
        required,
        resume_skills
    )

    preferred_score = _score(
        preferred,
        resume_skills
    )

    # =====================================================
    # MATCHED / MISSING
    # =====================================================

    matched_required = sorted(
        required
        & resume_skills
    )

    missing_required = sorted(
        required
        - resume_skills
    )

    matched_preferred = sorted(
        preferred
        & resume_skills
    )

    missing_preferred = sorted(
        preferred
        - resume_skills
    )

    # =====================================================
    # OTHER SCORES
    # =====================================================

    experience = _experience_score(
        resume,
        jd
    )

    projects = _project_score(
        resume,
        required,
        preferred
    )

    education = _education_score(
        resume,
        jd
    )

    certifications = _cert_score(
        resume,
        jd
    )

    text_relevance = _text_score(
        resume,
        jd
    )

    # =====================================================
    # EVIDENCE GUARD
    # =====================================================

    resume_evidence = (
        len(resume_skills)
        + len(
            _extract_roles(
                resume
            )
        )
        + len(
            _extract_degree_levels(
                resume
            )
        )
        + len(
            _extract_fields(
                resume
            )
        )
        + int(
            _extract_years(
                resume
            ) > 0
        )
    )

    if resume_evidence == 0:

        raise ValueError(
            "The resume was uploaded, but "
            "no reliable candidate information "
            "could be detected. Please "
            "re-upload the resume."
        )

    # =====================================================
    # OVERALL SCORE
    # =====================================================

    overall = round(
        required_score * 0.40
        + preferred_score * 0.15
        + experience * 0.15
        + projects * 0.10
        + education * 0.10
        + certifications * 0.05
        + text_relevance * 0.05
    )

    # =====================================================
    # RECOMMENDATION
    # =====================================================

    if overall >= 85:

        recommendation = (
            "Excellent Match"
        )

        detail = (
            "The resume strongly aligns "
            "with the core requirements "
            "of this role."
        )

    elif overall >= 75:

        recommendation = (
            "Strong Match"
        )

        detail = (
            "The resume matches most "
            "important requirements and "
            "is worth serious consideration."
        )

    elif overall >= 60:

        recommendation = (
            "Moderate Match"
        )

        detail = (
            "The resume has relevant "
            "strengths, but several "
            "requirements should be reviewed."
        )

    elif overall >= 45:

        recommendation = (
            "Partial Match"
        )

        detail = (
            "There is relevant overlap, "
            "but the resume has notable "
            "gaps for this role."
        )

    else:

        recommendation = (
            "Low Match"
        )

        detail = (
            "The resume currently shows "
            "limited evidence against "
            "the core requirements."
        )

    # =====================================================
    # RESPONSE
    # =====================================================

    return {

        "overall_score": overall,

        "recommendation": (
            recommendation
        ),

        "recommendation_detail": (
            detail
        ),

        "breakdown": {

            "required_skills": (
                required_score
            ),

            "preferred_skills": (
                preferred_score
            ),

            "experience": (
                experience
            ),

            "projects": (
                projects
            ),

            "education": (
                education
            ),

            "certifications": (
                certifications
            ),

            "overall_text_coverage": (
                text_relevance
            ),
        },

        "required_skills": sorted(
            required
        ),

        "matched_required_skills": (
            matched_required
        ),

        "missing_required_skills": (
            missing_required
        ),

        "preferred_skills": sorted(
            preferred
        ),

        "matched_preferred_skills": (
            matched_preferred
        ),

        "missing_preferred_skills": (
            missing_preferred
        ),
    }