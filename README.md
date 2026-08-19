# OpsMind AI

> **AI-powered knowledge assistant for document-grounded Q&A, resume intelligence, and job matching.**

[![Backend](https://img.shields.io/badge/Backend-Django%20REST%20Framework-0C4B33?logo=django)](backend/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)](frontend/)
[![AI](https://img.shields.io/badge/AI-RAG%20%7C%20Embeddings%20%7C%20LLM-purple)](backend/documents/)
[![License](https://img.shields.io/badge/License-Project%20Use-lightgrey)](#)

## Overview

OpsMind AI is a full-stack AI knowledge assistant built to turn uploaded documents and resumes into an interactive, searchable knowledge base. Users can upload PDFs, process their content, ask grounded questions about a selected document, manage resumes, and compare a resume against a job description.

The core design principle is **document-scoped intelligence**: when a user selects a document, Q&A and resume analysis operate on that selected, authenticated user's document instead of mixing information from unrelated documents.

## Key Features

### 📚 Knowledge Base
- Authenticated PDF upload
- PDF text extraction and processing
- Text chunking for retrieval
- Embedding generation for semantic search
- Search across processed document chunks
- Per-user document ownership

### 💬 Document-Scoped Resume Q&A
- Select a specific processed resume/document
- Ask natural-language questions
- Generate answers using the selected document as context
- Prevent unrelated documents from being used for the selected-document Q&A flow
- Return document source metadata with the answer
- Supports questions about skills, education, experience, projects, certifications, and other resume content

### 📄 Resume Manager
- List authenticated user's resumes/documents
- Track processing state
- View individual document details
- Rename documents
- Delete documents
- Select a processed resume for analysis

### 🎯 Job Match
- Compare a selected resume against a job description
- Deterministic skill and requirement matching
- Overall match score
- Required-skill, preferred-skill, experience, projects, education, and certification scoring
- Matched skills and skill gaps
- Supports a selected stored resume or supplied resume text

## 📸 Screenshots

### Landing Page
![OpsMind AI Landing Page](screenshots/Screenshot%202026-08-19%20224410.png)

### Knowledge Base
![OpsMind AI Knowledge Base](screenshots/Screenshot%202026-08-19%20225042.png)

### Resume Manager
![OpsMind AI Resume Manager](screenshots/Screenshot%202026-08-19%20225126.png)

### Resume Q&A
![OpsMind AI Resume Q&A](screenshots/Screenshot%202026-08-19%20225747.png)

### Job Match
![OpsMind AI Job Match](screenshots/Screenshot%202026-08-19%20225825.png)

### Job Match Results
![OpsMind AI Job Match Results](screenshots/Screenshot%202026-08-19%20225851.png)

### Analytics
![OpsMind AI Analytics](screenshots/Screenshot%202026-08-19%20230331.png)

### Settings
![OpsMind AI Settings](screenshots/Screenshot%202026-08-19%20230414.png)

## Architecture

```text
                         ┌──────────────────────────┐
                         │      React + Vite UI     │
                         │ Dashboard / KB / Resume  │
                         │ Q&A / Job Match / Stats  │
                         └────────────┬─────────────┘
                                      │ REST API
                                      ▼
                         ┌──────────────────────────┐
                         │ Django REST Framework    │
                         │ Authenticated API Views  │
                         └────────────┬─────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             ▼                        ▼                        ▼
      PDF Processing             Retrieval / Q&A          Job Matching
      ───────────────            ───────────────          ───────────
      Text extraction            Chunking                 Skill aliases
      Text storage               Embeddings               Requirement scoring
      Chunk creation              Search                   Match breakdown
             │                        │                        │
             └────────────────────────┼────────────────────────┘
                                      ▼
                         ┌──────────────────────────┐
                         │ Document / Chunk Storage │
                         │ Owner-scoped persistence │
                         └──────────────────────────┘
```

## Backend API

The document API is mounted under:

```text
/api/documents/
```

All document endpoints use authenticated access.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/documents/` | List the authenticated user's documents |
| `POST` | `/api/documents/upload/` | Upload and process a PDF |
| `POST` | `/api/documents/search/` | Search processed document chunks |
| `POST` | `/api/documents/chat/` | Ask a question against a selected document |
| `POST` | `/api/documents/job-match/` | Compare a resume with a job description |
| `GET` | `/api/documents/<id>/` | Get document details |
| `PATCH` | `/api/documents/<id>/` | Rename a document |
| `DELETE` | `/api/documents/<id>/` | Delete a document |

### Upload a document

`POST /api/documents/upload/`

Use `multipart/form-data` with the document fields expected by the document serializer.

Processing flow:

```text
PDF Upload
   ↓
Text Extraction
   ↓
Text Chunking
   ↓
Embedding Generation
   ↓
DocumentChunk Storage
   ↓
processed = true
```

### Document Q&A

`POST /api/documents/chat/`

Example request:

```json
{
  "document_id": 19,
  "query": "What are the candidate's technical skills?"
}
```

The backend verifies that the selected document belongs to the authenticated user and has been processed before generating the answer.

### Semantic Search

`POST /api/documents/search/`

Example request:

```json
{
  "query": "machine learning experience"
}
```

The response includes matching document IDs, titles, chunk indexes, content, and retrieval scores.

### Job Match

`POST /api/documents/job-match/`

When a stored resume is selected:

```json
{
  "document_id": 19,
  "job_description": "Looking for a Python developer with Django, SQL and machine learning experience."
}
```

The backend extracts the selected resume's processed text and runs the job-matching engine. The result includes the calculated match information and, when applicable, the selected document metadata.

## Q&A Retrieval Flow

```text
User selects Resume
        ↓
Authenticated ownership check
        ↓
Processed document check
        ↓
Load selected document text/chunks
        ↓
Short document → use complete extracted text
Long document  → rank chunks by query relevance
        ↓
Build grounded context
        ↓
Generate answer
        ↓
Return answer + document source
```

For long documents, the current Q&A view performs document-scoped relevance selection over the selected document's chunks before sending context to the answer generator. This keeps the Q&A flow tied to the selected source.

## Job Matching Flow

```text
Selected Resume / Resume Text
              +
       Job Description
              ↓
       Text normalization
              ↓
       Skill alias matching
              ↓
       Requirement analysis
              ↓
       Match scoring
              ↓
  ┌───────────┼────────────┐
  ▼           ▼            ▼
Skills     Experience   Education
  │           │            │
  └───────────┼────────────┘
              ▼
      Projects / Certifications
              ↓
      Overall Match Result
              ↓
    Matches + Skill Gaps
```

The matching engine includes aliases for common technologies and concepts such as Python, Java, JavaScript, React, Django, Flask, REST APIs, Git, AWS, MongoDB, MySQL, TensorFlow, scikit-learn, OpenCV, NLP, machine learning, deep learning, generative AI, LLMs, NumPy, Pandas, Streamlit, Power BI, OOP, and problem solving.

## Security / Data Isolation

OpsMind AI applies ownership checks to document operations. The document-scoped Q&A and job-match flows verify the selected document against the authenticated user before using its extracted text.

This is important for resume applications because one candidate's resume should not become context for another candidate's question.

## Tech Stack

### Frontend
- React
- JavaScript
- Vite
- CSS
- Axios
- React Router

### Backend
- Python
- Django
- Django REST Framework

### AI / NLP
- Retrieval-Augmented Generation (RAG)
- Text embeddings
- Semantic document search
- LLM-based grounded answer generation
- Resume information extraction
- Rule/alias-based job matching

### Document Processing
- PDF text extraction
- Text chunking
- Chunk-level embeddings
- Persistent document/chunk storage

### Development
- Git
- GitHub
- PowerShell

## Project Structure

```text
OpsMind-AI/
├── backend/
│   ├── config/
│   ├── documents/
│   │   ├── chunking.py
│   │   ├── embeddings.py
│   │   ├── job_match.py
│   │   ├── llm.py
│   │   ├── models.py
│   │   ├── search.py
│   │   ├── services.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── responsive.css
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── screenshots/
└── README.md
```

## Local Setup

### 1. Clone

```bash
git clone https://github.com/Karthick03219/OpsMind-AI.git
cd OpsMind-AI
```

### 2. Backend

From the `backend` directory:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py runserver
```

The Django API normally starts at:

```text
http://127.0.0.1:8000/
```

### 3. Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown by the terminal, normally:

```text
http://localhost:5173
```

## Typical User Workflow

```text
Login
  ↓
Dashboard
  ↓
Knowledge Base
  ↓
Upload Resume / PDF
  ↓
Document Processing
  ↓
Resume Manager
  ↓
Select Resume
  ├───────────────┐
  ▼               ▼
Resume Q&A      Job Match
  │               │
  ▼               ▼
Ask Questions   Paste JD
  │               │
  ▼               ▼
Grounded       Match Score
Answers        + Skill Gaps
```

## Current Status

- ✅ PDF upload and processing
- ✅ Document text extraction
- ✅ Text chunking
- ✅ Embedding generation
- ✅ Semantic document search
- ✅ Document-scoped Q&A
- ✅ Resume Manager
- ✅ Resume analysis
- ✅ Job Match
- ✅ Authenticated document ownership
- ✅ React frontend
- ✅ Django REST backend
- ✅ GitHub repository with screenshots and documentation

## Why This Project

OpsMind AI combines several practical AI engineering concepts in one application: document ingestion, retrieval, embeddings, grounded generation, authenticated data isolation, resume intelligence, and deterministic job matching. The result is a portfolio project that demonstrates both **AI/NLP capability and full-stack implementation**.

## Author

**Karthick S**  
AI & ML | Python | Full Stack Development

## Repository

https://github.com/Karthick03219/OpsMind-AI
