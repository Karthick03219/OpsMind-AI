# OpsMind AI

> AI-powered knowledge assistant for document-grounded Q&A, resume analysis, and job matching.

## Overview

OpsMind AI is a full-stack AI knowledge assistant that lets users upload PDF documents, process their content into searchable representations, ask grounded questions about a selected document, manage resumes, and compare a resume against a job description.

The application is designed around a simple principle: **answers should be grounded in the selected source document rather than mixing information across documents.**

## What it does

### Knowledge Base
- Upload PDF documents
- Extract and process document text
- Split documents into searchable chunks
- Generate embeddings for semantic retrieval
- Search uploaded knowledge sources

### Resume Q&A
- Select a specific processed resume/document
- Ask natural-language questions
- Return answers grounded in the selected document
- Retrieve relevant source information
- Supports questions about skills, education, experience, projects, certifications, and other resume content

### Resume Manager
- View uploaded resumes
- Track processing status
- Select a resume for analysis

### Job Match
- Compare a selected resume with a job description
- Calculate an overall match score
- Break down required skills, preferred skills, experience, projects, education, and certifications
- Show matched and missing skills

## Architecture

```text
React Frontend
      |
      | REST API
      v
Django + Django REST Framework
      |
      +---- PDF text extraction
      +---- Text chunking
      +---- Embeddings / semantic search
      +---- Document-scoped Q&A
      +---- Resume analysis
      +---- Job matching
      |
      v
Database + Document Storage
```

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
- Text embeddings
- Semantic document search
- Retrieval-Augmented Generation (RAG)
- LLM-based grounded answers

### Data
- Document text extraction
- Chunk-based document indexing
- Embedding storage

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
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   └── responsive.css
    ├── public/
    ├── package.json
    └── vite.config.js
```

## Running the Project

### Backend

From the `backend` directory:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend

From the `frontend` directory:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

## Typical Workflow

```text
Login
  ↓
Knowledge Base
  ↓
Upload PDF
  ↓
Document Processing
  ↓
Select Document / Resume
  ↓
Resume Q&A
  ↓
Ask Grounded Questions

or

Resume Manager
  ↓
Select Resume
  ↓
Job Match
  ↓
Paste Job Description
  ↓
Analyze Match
```

## Key Design Principle

OpsMind AI uses **document-scoped retrieval** for Q&A. When a document is selected, the Q&A request is associated with that document and authenticated owner so that answers are generated from the intended knowledge source.

## Current Status

✅ PDF upload and processing  
✅ Semantic document search  
✅ Document-scoped Q&A  
✅ Resume Manager  
✅ Resume analysis  
✅ Job Match  
✅ React frontend  
✅ Django REST backend  

## Author

**Karthick S**  
AI & ML | Python | Full Stack Development

## Repository

https://github.com/Karthick03219/OpsMind-AI
