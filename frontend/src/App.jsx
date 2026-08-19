import { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API_URL = "http://127.0.0.1:8000/api";

const SUGGESTED_QUESTIONS = [
  "What are the candidate's technical skills?",
  "What is the candidate's CGPA?",
  "Where did the candidate study?",
  "What is the candidate's work experience?",
  "What projects has the candidate worked on?",
  "What certifications does the candidate have?",
];

function App() {
  // ==================================================
  // AUTH STATE
  // ==================================================

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("access_token"))
  );

  // First-time product introduction screen.
  // Entering the product takes an authenticated user directly to the
  // workspace, otherwise it opens the existing login screen.
  const [showLanding, setShowLanding] = useState(true);

  const enterOpsMind = () => {
    setShowLanding(false);
    if (loggedIn) {
      setActiveSection("dashboard");
    }
  };

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ==================================================
  // DOCUMENT UPLOAD
  // ==================================================

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  // ==================================================
  // CHAT
  // ==================================================

  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // ==================================================
  // JOB MATCH
  // ==================================================

  const [activeMode, setActiveMode] = useState("chat");
  const [jobDescription, setJobDescription] = useState("");
  const [jobMatch, setJobMatch] = useState(null);
  const [jobMatching, setJobMatching] = useState(false);
  const [jobMatchError, setJobMatchError] = useState("");

  // ==================================================
  // RESUME MANAGER
  // ==================================================

  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [documentActionLoading, setDocumentActionLoading] = useState(false);
  const [documentMenuId, setDocumentMenuId] = useState(null);

  // ==================================================
  // APP NAVIGATION
  // ==================================================

  const [activeSection, setActiveSection] = useState("dashboard");

  const openSection = (section) => {
    setActiveSection(section);

    if (section === "qa") {
      setActiveMode("chat");
    }

    if (section === "match") {
      setActiveMode("match");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  // ==================================================
  // LOAD USER DOCUMENTS
  // ==================================================

  useEffect(() => {
    if (!loggedIn) return;

    const loadDocuments = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) return;

      setDocumentsLoading(true);

      try {
        const response = await axios.get(
          `${API_URL}/documents/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const docs = response.data || [];

        setDocuments(docs);

        setSelectedDocumentId((currentId) => {
          if (
            currentId &&
            docs.some(
              (doc) => String(doc.id) === String(currentId)
            )
          ) {
            return String(currentId);
          }

          return docs.length > 0
            ? String(docs[0].id)
            : "";
        });
      } catch (error) {
        console.error(
          "Failed to load documents:",
          error
        );

        if (error.response?.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setLoggedIn(false);
        }
      } finally {
        setDocumentsLoading(false);
      }
    };

    loadDocuments();
  }, [loggedIn]);

  const [chatHistory, setChatHistory] = useState([]);

  const [showSuggestions, setShowSuggestions] =
    useState(false);

  // ==================================================
  // FILTER SUGGESTIONS
  // ==================================================

  const filteredSuggestions =
    SUGGESTED_QUESTIONS.filter(
      (question) =>
        !query.trim() ||
        question
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    );

  // ==================================================
  // LOGIN
  // ==================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `${API_URL}/login/`,
        {
          username,
          password,
        }
      );

      localStorage.setItem(
        "access_token",
        response.data.access
      );

      if (response.data.refresh) {
        localStorage.setItem(
          "refresh_token",
          response.data.refresh
        );
      }

      setLoggedIn(true);
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          "Login failed. Please check your username and password."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // UPLOAD
  // ==================================================

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadError(
        "Please select a PDF file first."
      );
      setUploadMessage("");
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setUploadError(
        "Only PDF files are supported."
      );
      setUploadMessage("");
      return;
    }

    const token =
      localStorage.getItem("access_token");

    if (!token) {
      setLoggedIn(false);
      return;
    }

    setUploading(true);
    setUploadMessage("");
    setUploadError("");

    try {
      const formData = new FormData();

      const title = selectedFile.name.replace(
        /\.pdf$/i,
        ""
      );

      formData.append("title", title);
      formData.append("file", selectedFile);

      const response = await axios.post(
        `${API_URL}/documents/upload/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setUploadMessage(
        response.data.message ||
          "Document uploaded and processed successfully."
      );

      setUploadError("");
      setSelectedFile(null);

      // Refresh the document list after upload.
      try {
        const documentsResponse = await axios.get(
          `${API_URL}/documents/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const docs = documentsResponse.data || [];
        setDocuments(docs);

        const uploadedDocumentId =
          response.data.document?.id ??
          response.data.id ??
          null;

        if (uploadedDocumentId !== null) {
          setSelectedDocumentId(
            String(uploadedDocumentId)
          );
        } else if (docs.length > 0) {
          setSelectedDocumentId(
            String(docs[0].id)
          );
        }
      } catch (documentError) {
        console.error(
          "Document uploaded, but document list refresh failed:",
          documentError
        );
      }

      const fileInput =
        document.getElementById(
          "document-file"
        );

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem(
          "refresh_token"
        );

        setLoggedIn(false);

        setUploadError(
          "Session expired. Please log in again."
        );
      } else {
        setUploadError(
          error.response?.data?.error ||
            error.response?.data?.message ||
            error.response?.data?.details ||
            "Document upload failed."
        );
      }

      setUploadMessage("");
    } finally {
      setUploading(false);
    }
  };

  // ==================================================
  // RESUME MANAGER
  // ==================================================

  const startRenameDocument = (document) => {
    setDocumentMenuId(null);
    setEditingDocumentId(document.id);
    setEditingTitle(document.title || "");
  };

  const cancelRenameDocument = () => {
    setEditingDocumentId(null);
    setEditingTitle("");
  };

  const saveDocumentTitle = async (documentId) => {
    const title = editingTitle.trim();
    if (!title) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoggedIn(false);
      return;
    }

    setDocumentActionLoading(true);

    try {
      await axios.patch(
        `${API_URL}/documents/${documentId}/`,
        { title },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDocuments((current) =>
        current.map((document) =>
          String(document.id) === String(documentId)
            ? { ...document, title }
            : document
        )
      );

      cancelRenameDocument();
    } catch (error) {
      setJobMatchError(
        error.response?.data?.error ||
        "Unable to rename the resume."
      );
    } finally {
      setDocumentActionLoading(false);
    }
  };

  const deleteDocument = async (document) => {
    if (
      !window.confirm(
        `Delete "${document.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoggedIn(false);
      return;
    }

    setDocumentMenuId(null);
    setDocumentActionLoading(true);

    try {
      await axios.delete(
        `${API_URL}/documents/${document.id}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDocuments((current) =>
        current.filter(
          (item) => String(item.id) !== String(document.id)
        )
      );

      if (String(selectedDocumentId) === String(document.id)) {
        setSelectedDocumentId("");
      }

      if (
        jobMatch?.document_id &&
        String(jobMatch.document_id) === String(document.id)
      ) {
        setJobMatch(null);
      }
    } catch (error) {
      setJobMatchError(
        error.response?.data?.error ||
        "Unable to delete the resume."
      );
    } finally {
      setDocumentActionLoading(false);
    }
  };

  // ==================================================
  // JOB MATCH
  // ==================================================

  const handleJobMatch = async (e) => {
    e.preventDefault();

    if (!selectedDocumentId) {
      setJobMatchError("Please select a processed resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      setJobMatchError("Please paste the job description.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setLoggedIn(false);
      return;
    }

    setJobMatching(true);
    setJobMatchError("");
    setJobMatch(null);

    try {
      const response = await axios.post(
        `${API_URL}/documents/job-match/`,
        {
          document_id: Number(selectedDocumentId),
          job_description: jobDescription.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setJobMatch(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setLoggedIn(false);
      } else {
        setJobMatchError(
          error.response?.data?.error ||
          error.response?.data?.details ||
          "Unable to analyze the job match."
        );
      }
    } finally {
      setJobMatching(false);
    }
  };

  // ==================================================
  // CHAT / RAG
  // ==================================================

  const handleChat = async (e) => {
    e.preventDefault();

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    if (!selectedDocumentId) {
      setMessage(
        "Please select a processed document before asking a question."
      );
      return;
    }

    const token =
      localStorage.getItem("access_token");

    if (!token) {
      setLoggedIn(false);
      return;
    }

    setShowSuggestions(false);
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `${API_URL}/documents/chat/`,
        {
          query: trimmedQuery,
          document_id: selectedDocumentId
            ? Number(selectedDocumentId)
            : null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newChat = {
        id:
          Date.now() +
          Math.random(),

        question: trimmedQuery,

        answer:
          response.data.answer || "",

        sources:
          response.data.sources || [],
      };

      setChatHistory((previous) => [
        ...previous,
        newChat,
      ]);

      setQuery("");
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem(
          "refresh_token"
        );

        setLoggedIn(false);

        setMessage(
          "Session expired. Please log in again."
        );
      } else {
        setMessage(
          error.response?.data?.error ||
            error.response?.data?.details ||
            "Unable to generate an answer."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // SUGGESTION
  // ==================================================

  const handleSuggestionClick = (
    question
  ) => {
    setQuery(question);
    setShowSuggestions(false);
  };

  // ==================================================
  // CLEAR CHAT
  // ==================================================

  const clearChat = () => {
    setChatHistory([]);
    setMessage("");
  };

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = () => {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "refresh_token"
    );

    setLoggedIn(false);

    setUsername("");
    setPassword("");

    setQuery("");
    setChatHistory([]);

    setDocuments([]);
    setSelectedDocumentId("");
    setDocumentsLoading(false);

    setMessage("");

    setSelectedFile(null);
    setUploading(false);
    setUploadMessage("");
    setUploadError("");

    setShowSuggestions(false);

    const fileInput =
      document.getElementById(
        "document-file"
      );

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // ==================================================
  // PRODUCT LANDING PAGE
  // ==================================================

  if (showLanding) {
    return (
      <div style={styles.landingPage}>
        <div style={styles.landingTopBar} className="opsmind-landing-top">
          <div style={styles.landingBrand}>
            <div style={styles.landingLogo}>OM</div>
            <div>
              <div style={styles.landingBrandName}>OpsMind <span>AI</span></div>
              <div style={styles.landingBrandSub}>Knowledge Assistant</div>
            </div>
          </div>
          <div style={styles.landingStatus} className="opsmind-landing-status">DOCUMENT INTELLIGENCE PLATFORM</div>
        </div>

        <main style={styles.landingMain} className="opsmind-landing-main">
          <section style={styles.landingHero} className="opsmind-landing-hero">
            <div style={styles.landingHeroCopy}>
              <div style={styles.landingEyebrow}>AI-POWERED KNOWLEDGE WORKSPACE</div>
              <h1 style={styles.landingTitle}>
                Turn your documents into an intelligent knowledge workspace.
              </h1>
              <p style={styles.landingLead}>
                OpsMind AI helps you upload documents, understand their content,
                ask grounded questions, and analyze resumes against real job
                descriptions — all from one organized workspace.
              </p>

              <button type="button" onClick={enterOpsMind} style={styles.landingCTA}>
                Enter OpsMind AI <span>→</span>
              </button>

              <div style={styles.landingNote}>
                Upload a document → select your source → ask or analyze.
              </div>
            </div>

            <div style={styles.landingProductCard}>
              <div style={styles.landingProductHeader}>
                <div style={styles.landingMiniLogo}>OM</div>
                <div>
                  <strong style={styles.landingProductHeaderStrong}>OpsMind Workspace</strong>
                  <span style={styles.landingProductHeaderSpan}>Everything in one place</span>
                </div>
              </div>

              <div style={styles.landingPreviewRow}>
                <div style={styles.landingPreviewIcon}>KB</div>
                <div>
                  <strong>Knowledge Base</strong>
                  <span>Search your private documents</span>
                </div>
              </div>
              <div style={styles.landingPreviewRow}>
                <div style={styles.landingPreviewIcon}>QA</div>
                <div>
                  <strong>Resume Q&amp;A</strong>
                  <span>Ask questions with grounded answers</span>
                </div>
              </div>
              <div style={styles.landingPreviewRow}>
                <div style={styles.landingPreviewIcon}>JM</div>
                <div>
                  <strong>Job Match</strong>
                  <span>Compare resumes with job descriptions</span>
                </div>
              </div>

              <div style={styles.landingPreviewFooter}>
                <span>PRIVATE WORKSPACE</span>
                <b>READY</b>
              </div>
            </div>
          </section>

          <section style={styles.landingSection}>
            <div style={styles.landingSectionHeading}>
              <div>
                <div style={styles.landingEyebrow}>WHAT OPSMIND AI CONTAINS</div>
                <h2 style={styles.landingSectionTitle}>One workspace. Four focused capabilities.</h2>
              </div>
              <p style={styles.landingSectionText}>
                Built to make document-based work faster, clearer, and easier to manage.
              </p>
            </div>

            <div style={styles.landingFeatureGrid} className="opsmind-landing-features">
              <div style={{...styles.landingFeature}}>
                <div style={styles.landingFeatureIcon}>01</div>
                <h3 style={styles.landingFeatureH3}>Document Intelligence</h3>
                <p style={styles.landingFeatureP}>Upload PDFs and turn their content into a searchable knowledge source.</p>
              </div>
              <div style={{...styles.landingFeature}}>
                <div style={styles.landingFeatureIcon}>02</div>
                <h3 style={styles.landingFeatureH3}>AI Knowledge Assistant</h3>
                <p style={styles.landingFeatureP}>Ask natural-language questions and receive answers grounded in your selected document.</p>
              </div>
              <div style={{...styles.landingFeature}}>
                <div style={styles.landingFeatureIcon}>03</div>
                <h3 style={styles.landingFeatureH3}>Resume Manager</h3>
                <p style={styles.landingFeatureP}>Keep multiple resumes organized, processed, selectable, renameable, and ready for analysis.</p>
              </div>
              <div style={{...styles.landingFeature}}>
                <div style={styles.landingFeatureIcon}>04</div>
                <h3 style={styles.landingFeatureH3}>Job Match Analyzer</h3>
                <p style={styles.landingFeatureP}>Compare a resume with a job description to surface match scores, strengths, and skill gaps.</p>
              </div>
            </div>
          </section>

          <section style={styles.landingHowSection}>
            <div style={styles.landingEyebrow}>HOW TO USE IT</div>
            <h2 style={styles.landingSectionTitle}>A simple workflow from document to decision.</h2>
            <div style={styles.landingSteps} className="opsmind-landing-steps">
              <div style={styles.landingStepsDiv}><b style={styles.landingStepsB}>1</b><strong style={styles.landingStepsStrong}>Upload</strong><span style={styles.landingStepsSpan}>Add your PDF to the knowledge base.</span></div>
              <div style={styles.landingStepsDiv}><b style={styles.landingStepsB}>2</b><strong style={styles.landingStepsStrong}>Select</strong><span style={styles.landingStepsSpan}>Choose the document you want OpsMind to use.</span></div>
              <div style={styles.landingStepsDiv}><b style={styles.landingStepsB}>3</b><strong style={styles.landingStepsStrong}>Ask or Analyze</strong><span style={styles.landingStepsSpan}>Use Resume Q&amp;A or Job Match for the task.</span></div>
              <div style={styles.landingStepsDiv}><b style={styles.landingStepsB}>4</b><strong style={styles.landingStepsStrong}>Decide</strong><span style={styles.landingStepsSpan}>Use grounded answers and structured results.</span></div>
            </div>
          </section>
        </main>

        <footer style={styles.landingFooter} className="opsmind-landing-footer">
          <span>OpsMind AI</span>
          <span>Smarter Knowledge. Better Decisions.</span>
        </footer>
      </div>
    );
  }

  // ==================================================
  // LOGIN PAGE
  // ==================================================

  if (!loggedIn) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginGlowOne} />
        <div style={styles.loginGlowTwo} />

        <div style={styles.loginCard}>
          <div style={styles.logoLarge}>
            OM
          </div>

          <div style={styles.loginEyebrow}>
            INTELLIGENT KNOWLEDGE
          </div>

          <h1 style={styles.loginTitle}>
            OpsMind AI
          </h1>

          <p style={styles.loginSubtitle}>
            Your intelligent document knowledge
            assistant.
          </p>

          <form
            onSubmit={handleLogin}
            style={styles.loginForm}
          >
            <label style={styles.inputLabel}>
              Username
            </label>

            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              style={styles.loginInput}
              autoComplete="username"
              required
            />

            <label style={styles.inputLabel}>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              style={styles.loginInput}
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              style={{
                ...styles.loginButton,
                opacity: loading
                  ? 0.7
                  : 1,
              }}
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>

          {message && (
            <div style={styles.loginError}>
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================================================
  // MAIN APPLICATION
  // ==================================================

  const navItems = [
    { id: "dashboard", short: "OV", label: "Overview" },
    { id: "knowledge", short: "KB", label: "Knowledge" },
    { id: "resumes", short: "RS", label: "Resumes" },
    { id: "qa", short: "AI", label: "AI Assistant" },
    { id: "match", short: "JM", label: "Job Match" },
    { id: "analytics", short: "AN", label: "Analytics" },
    { id: "settings", short: "ST", label: "Settings" },
  ];

  const activeDocument =
    documents.find(
      (doc) => String(doc.id) === String(selectedDocumentId)
    ) || null;

  return (
    <div style={styles.app}>
      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #f4f7fb; }
        button, input, textarea, select { font: inherit; }
        button { -webkit-tap-highlight-color: transparent; }
        .opsmind-main-scroll::-webkit-scrollbar { width: 7px; }
        .opsmind-main-scroll::-webkit-scrollbar-thumb {
          background: #c9d5e6;
          border-radius: 999px;
        }
        @media (max-width: 900px) {
          .opsmind-landing-hero { grid-template-columns: 1fr !important; }
          .opsmind-landing-features { grid-template-columns: 1fr 1fr !important; }
          .opsmind-landing-steps { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .opsmind-landing-top { padding: 0 18px !important; }
          .opsmind-landing-main { padding: 0 18px 35px !important; }
          .opsmind-landing-title { font-size: 34px !important; }
          .opsmind-landing-features, .opsmind-landing-steps { grid-template-columns: 1fr !important; }
          .opsmind-landing-status { display: none !important; }
          .opsmind-landing-footer { padding: 14px 18px !important; }
        }
        @media (max-width: 1180px) {
          .opsmind-shell { grid-template-columns: 86px minmax(0, 1fr) !important; }
          .opsmind-nav-label { display: none !important; }
          .opsmind-nav-item { justify-content: center !important; }
          .opsmind-brand-copy { display: none !important; }
          .opsmind-dashboard-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 720px) {
          .opsmind-shell { display: block !important; }
          .opsmind-sidebar {
            width: 100% !important;
            height: auto !important;
            position: static !important;
            border-right: 0 !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }
          .opsmind-nav { flex-direction: row !important; overflow-x: auto !important; }
          .opsmind-nav-item { flex: 0 0 auto !important; justify-content: flex-start !important; }
          .opsmind-nav-label { display: inline !important; }
          .opsmind-main { padding: 14px !important; }
          .opsmind-header { padding: 0 14px !important; }
          .opsmind-user-copy { display: none !important; }
          .opsmind-hero { padding: 22px !important; }
          .opsmind-hero-mark { display: none !important; }
          .opsmind-two-col { grid-template-columns: 1fr !important; }
          .opsmind-three-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ==================================================
          TOP BAR
      ================================================== */}
      <header style={styles.header} className="opsmind-header">
        <div style={styles.headerBrand}>
          <div style={styles.logoMark} aria-label="OpsMind AI">
            <svg
              width="42"
              height="42"
              viewBox="0 0 42 42"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="21"
                cy="21"
                r="18.5"
                stroke="#173D78"
                strokeWidth="2.5"
              />
              <path
                d="M12.5 25.8V16.2C12.5 14.8 13.7 13.8 15 14.3L21 16.8L27 14.3C28.3 13.8 29.5 14.8 29.5 16.2V25.8"
                stroke="#173D78"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 27.4L21 22.8L27 27.4"
                stroke="#2B73E0"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="21" cy="11" r="2.1" fill="#2B73E0" />
            </svg>
          </div>

          <div className="opsmind-brand-copy">
            <div style={styles.brandName}>
              OpsMind <span style={styles.brandAI}>AI</span>
            </div>
            <div style={styles.brandSubtitle}>Knowledge Assistant</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.sourceHeaderChip}>
            <span style={styles.sourceDot} />
            {activeDocument ? activeDocument.title : "No source selected"}
          </div>

          <div style={styles.userBadge}>
            <div style={styles.userInitial}>
              {(username || "K").slice(0, 1).toUpperCase()}
            </div>
            <div className="opsmind-user-copy">
              <strong style={styles.userName}>{username || "User"}</strong>
              <span style={styles.userRole}>Workspace</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </header>

      <div
        style={styles.shell}
        className="opsmind-shell"
      >
        {/* ==================================================
            LIQUID NAVIGATION
        ================================================== */}
        <aside
          style={styles.sidebar}
          className="opsmind-sidebar"
        >
          <div>
            <div style={styles.sidebarSectionLabel}>WORKSPACE</div>

            <nav
              style={styles.sidebarNav}
              className="opsmind-nav"
            >
              {navItems.map((item) => {
                const active = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openSection(item.id)}
                    style={{
                      ...styles.sideNavItem,
                      ...(active ? styles.sideNavItemActive : {}),
                    }}
                    className="opsmind-nav-item"
                  >
                    <span style={styles.sideNavIcon}>{item.short}</span>
                    <span className="opsmind-nav-label">{item.label}</span>
                    {active && <span style={styles.activeNavIndicator}>●</span>}
                  </button>
                );
              })}
            </nav>
          </div>

          <div style={styles.sidebarBottom}>
            <div style={styles.sidebarBrandMark}>
              <svg
                width="38"
                height="38"
                viewBox="0 0 42 42"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="21"
                  cy="21"
                  r="18.5"
                  stroke="#173D78"
                  strokeWidth="2.5"
                />
                <path
                  d="M12.5 25.8V16.2C12.5 14.8 13.7 13.8 15 14.3L21 16.8L27 14.3C28.3 13.8 29.5 14.8 29.5 16.2V25.8"
                  stroke="#173D78"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 27.4L21 22.8L27 27.4"
                  stroke="#2B73E0"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <strong>OPSMIND AI</strong>
              <span>Smarter Knowledge.<br />Better Decisions.</span>
            </div>
          </div>
        </aside>

        {/* ==================================================
            MAIN
        ================================================== */}
        <main
          style={styles.main}
          className="opsmind-main opsmind-main-scroll"
        >
          <section style={styles.pageIntro}>
            <div>
              <div style={styles.pageEyebrow}>
                {navItems.find((item) => item.id === activeSection)?.label.toUpperCase()}
              </div>

              <h1 style={styles.pageTitle}>
                {activeSection === "dashboard" && "Your knowledge workspace."}
                {activeSection === "knowledge" && "Build your knowledge base."}
                {activeSection === "resumes" && "Manage your resumes."}
                {activeSection === "qa" && "Ask your resume questions."}
                {activeSection === "match" && "Compare a resume with a job."}
                {activeSection === "analytics" && "Understand your workspace activity."}
                {activeSection === "settings" && "Configure your OpsMind workspace."}
              </h1>

              <p style={styles.pageSubtitle}>
                {activeSection === "dashboard" &&
                  "Everything you need to upload, understand, and evaluate documents in one place."}
                {activeSection === "knowledge" &&
                  "Upload PDF documents and select the source that powers grounded answers."}
                {activeSection === "resumes" &&
                  "Keep your candidate resumes organized and ready for analysis."}
                {activeSection === "qa" &&
                  "Ask natural-language questions and get answers grounded in the selected resume."}
                {activeSection === "match" &&
                  "Paste a job description and see strengths, gaps, and match scores."}
                {activeSection === "analytics" &&
                  "See document coverage, processing status, and job-match activity at a glance."}
                {activeSection === "settings" &&
                  "Manage workspace preferences without leaving your OpsMind environment."}
              </p>
            </div>

            <div style={styles.pageIntroMark} className="opsmind-hero-mark">
              <span style={styles.heroStatusDot} />
              <strong>WORKSPACE READY</strong>
              <small>{activeDocument ? "Active source selected" : "Select a source to begin"}</small>
            </div>
          </section>

          {/* ==================================================
              DASHBOARD
          ================================================== */}
          {activeSection === "dashboard" && (
            <>
              <div
                style={styles.dashboardGrid}
                className="opsmind-dashboard-grid"
              >
                <section style={styles.dashboardWelcome}>
                  <div style={styles.cardEyebrow}>AI KNOWLEDGE ASSISTANT</div>
                  <h2 style={styles.dashboardHeroTitle}>
                    Ask your knowledge base.
                  </h2>
                  <p style={styles.dashboardHeroText}>
                    Search documents, analyze resumes, and get grounded answers
                    from your private knowledge base.
                  </p>

                  <div style={styles.dashboardActions}>
                    <button
                      type="button"
                      onClick={() => openSection("knowledge")}
                      style={styles.primaryButton}
                    >
                      + Upload Document
                    </button>

                    <button
                      type="button"
                      onClick={() => openSection("match")}
                      style={styles.secondaryActionButton}
                    >
                      ◎ Job Match
                    </button>
                  </div>
                </section>

                <section style={styles.dashboardStats}>
                  <div style={styles.dashboardStat}>
                    <span>RESUMES</span>
                    <strong>{documents.length}</strong>
                    <small>Uploaded documents</small>
                  </div>
                  <div style={styles.dashboardStat}>
                    <span>PROCESSED</span>
                    <strong>{documents.filter((d) => d.processed).length}</strong>
                    <small>Ready to analyze</small>
                  </div>
                  <div style={styles.dashboardStat}>
                    <span>ACTIVE SOURCE</span>
                    <strong>{activeDocument ? "1" : "0"}</strong>
                    <small>{activeDocument ? "Selected" : "Choose one"}</small>
                  </div>
                </section>
              </div>

              <section style={styles.dashboardQuickCard}>
                <div style={styles.cardEyebrow}>QUICK ACCESS</div>
                <div style={styles.quickGrid}>
                  <button
                    type="button"
                    onClick={() => openSection("knowledge")}
                    style={styles.quickCard}
                  >
                    <span style={styles.quickIcon}>KB</span>
                    <strong>Knowledge Base</strong>
                    <span>Upload and select documents</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openSection("resumes")}
                    style={styles.quickCard}
                  >
                    <span style={styles.quickIcon}>RM</span>
                    <strong>Resume Manager</strong>
                    <span>Organize your resumes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openSection("qa")}
                    style={styles.quickCard}
                  >
                    <span style={styles.quickIcon}>QA</span>
                    <strong>Resume Q&A</strong>
                    <span>Ask grounded questions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openSection("match")}
                    style={styles.quickCard}
                  >
                    <span style={styles.quickIcon}>JM</span>
                    <strong>Job Match</strong>
                    <span>Measure role alignment</span>
                  </button>
                </div>
              </section>
            </>
          )}

          {/* ==================================================
              KNOWLEDGE BASE
          ================================================== */}
          {activeSection === "knowledge" && (
            <div
              style={styles.twoColumn}
              className="opsmind-two-col"
            >
              <section style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardEyebrow}>KNOWLEDGE BASE</div>
                    <h2 style={styles.cardTitle}>Add a document</h2>
                    <p style={styles.cardDescription}>
                      Upload a PDF to make its content searchable.
                    </p>
                  </div>
                  <div style={styles.cardIcon}>↑</div>
                </div>

                <form onSubmit={handleUpload}>
                  <input
                    id="document-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    style={styles.fileInput}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      setUploadMessage("");
                      setUploadError("");
                    }}
                    disabled={uploading}
                  />

                  <label htmlFor="document-file" style={styles.uploadDropzone}>
                    <div style={styles.uploadCloud}>↑</div>
                    <strong>Drag & drop your PDF here</strong>
                    <span>or click to browse</span>
                  </label>

                  {selectedFile && (
                    <div style={styles.selectedFile}>
                      <span>PDF&nbsp; {selectedFile.name}</span>
                      <span style={styles.fileSize}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      ...styles.primaryButton,
                      opacity: uploading || !selectedFile ? 0.55 : 1,
                    }}
                    disabled={uploading || !selectedFile}
                  >
                    {uploading ? "Processing document..." : "↑  Upload PDF"}
                  </button>
                </form>

                {uploadMessage && (
                  <div style={styles.successBox}>✓ {uploadMessage}</div>
                )}

                {uploadError && (
                  <div style={styles.errorBox}>{uploadError}</div>
                )}
              </section>

              <section style={styles.card}>
                <div style={styles.cardHeaderCompact}>
                  <div>
                    <div style={styles.cardEyebrow}>ACTIVE KNOWLEDGE SOURCE</div>
                    <h2 style={styles.cardTitle}>Choose a document</h2>
                    <p style={styles.cardDescription}>
                      Your questions will use only the selected document.
                    </p>
                  </div>
                </div>

                <select
                  value={selectedDocumentId}
                  onChange={(e) => {
                    setSelectedDocumentId(e.target.value);
                    setChatHistory([]);
                    setMessage("");
                  }}
                  style={styles.documentSelect}
                  disabled={documentsLoading || documents.length === 0}
                >
                  {documents.length === 0 ? (
                    <option value="">
                      {documentsLoading
                        ? "Loading documents..."
                        : "No processed documents available"}
                    </option>
                  ) : (
                    documents.map((document) => (
                      <option key={document.id} value={String(document.id)}>
                        {document.title}
                      </option>
                    ))
                  )}
                </select>

                <div style={styles.sourceHint}>
                  <span style={styles.sourceDot} />
                  {activeDocument
                    ? `Active: ${activeDocument.title}`
                    : "No active source"}
                </div>
              </section>
            </div>
          )}

          {/* ==================================================
              RESUME MANAGER
          ================================================== */}
          {activeSection === "resumes" && (
            <section style={styles.managerPanel}>
              <div style={styles.managerHeader}>
                <div>
                  <div style={styles.cardEyebrow}>RESUME MANAGER</div>
                  <h2 style={styles.managerTitle}>Your resumes</h2>
                  <p style={styles.cardDescription}>
                    Manage uploaded resumes and choose one for analysis.
                  </p>
                </div>

                <div style={styles.resumeCount}>
                  {documents.length} {documents.length === 1 ? "Resume" : "Resumes"}
                </div>
              </div>

              {documents.length === 0 ? (
                <div style={styles.resumeEmptyState}>
                  <div style={styles.emptyLogo}>OM</div>
                  <strong>No resumes yet</strong>
                  <span>Upload a PDF from Knowledge Base.</span>
                  <button
                    type="button"
                    onClick={() => openSection("knowledge")}
                    style={styles.primarySmallButton}
                  >
                    Upload a Resume
                  </button>
                </div>
              ) : (
                <div style={styles.resumeGridLarge}>
                  {documents.map((document) => {
                    const selected =
                      String(selectedDocumentId) === String(document.id);

                    return (
                      <div
                        key={document.id}
                        style={{
                          ...styles.resumeCardLarge,
                          ...(selected ? styles.resumeCardSelected : {}),
                        }}
                      >
                        <div style={styles.resumeTopRow}>
                          <div style={styles.pdfIconLarge}>PDF</div>

                          <div style={styles.resumeActions}>
                            <button
                              type="button"
                              onClick={() =>
                                setDocumentMenuId(
                                  documentMenuId === document.id
                                    ? null
                                    : document.id
                                )
                              }
                              style={styles.moreButton}
                              aria-label="Resume actions"
                            >
                              ⋮
                            </button>

                            {documentMenuId === document.id &&
                              editingDocumentId !== document.id && (
                                <div style={styles.resumeMenu}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedDocumentId(String(document.id));
                                      setActiveSection("qa");
                                      setActiveMode("chat");
                                      setDocumentMenuId(null);
                                    }}
                                    style={styles.resumeMenuItem}
                                  >
                                    Use for Resume Q&A
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => startRenameDocument(document)}
                                    style={styles.resumeMenuItem}
                                  >
                                    Rename
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => deleteDocument(document)}
                                    style={styles.resumeDeleteItem}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                          </div>
                        </div>

                        {editingDocumentId === document.id ? (
                          <div style={styles.renameBox}>
                            <input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              style={styles.renameInput}
                              autoFocus
                            />
                            <div style={styles.renameActions}>
                              <button
                                type="button"
                                onClick={cancelRenameDocument}
                                style={styles.secondarySmallButton}
                                disabled={documentActionLoading}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => saveDocumentTitle(document.id)}
                                style={styles.primarySmallButton}
                                disabled={
                                  documentActionLoading ||
                                  !editingTitle.trim()
                                }
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={styles.resumeTitleLarge}>
                              {document.title}
                            </div>

                            <div style={styles.resumeMeta}>
                              <span
                                style={{
                                  ...styles.processedBadge,
                                  ...(document.processed
                                    ? {}
                                    : styles.processingBadge),
                                }}
                              >
                                {document.processed
                                  ? "●  Processed"
                                  : "●  Processing"}
                              </span>

                              {selected && (
                                <span style={styles.selectedBadge}>
                                  Selected
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDocumentId(String(document.id));
                                setActiveSection("match");
                                setActiveMode("match");
                                setJobMatch(null);
                                setJobMatchError("");
                              }}
                              disabled={!document.processed}
                              style={{
                                ...styles.resumeMatchButton,
                                opacity: document.processed ? 1 : 0.5,
                              }}
                            >
                              ◎ &nbsp; Use for Job Match
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              RESUME Q&A
          ================================================== */}
          {activeSection === "qa" && (
            <section style={styles.workspaceFull}>
              <div style={styles.workspaceTopBar}>
                <div>
                  <div style={styles.cardEyebrow}>RESUME Q&A</div>
                  <h2 style={styles.workspaceTitle}>Ask about the selected resume</h2>
                  <p style={styles.cardDescription}>
                    {activeDocument
                      ? `Grounded answers from ${activeDocument.title}.`
                      : "Select a processed resume first."}
                  </p>
                </div>

                <div style={styles.workspaceSource}>
                  <span style={styles.sourceDot} />
                  {activeDocument ? activeDocument.title : "No source"}
                </div>
              </div>

              <div style={styles.qaLayout}>
                <div style={styles.qaConversation}>
                  <div style={styles.chatIntro}>
                    <div style={styles.workspaceAvatar}>OM</div>
                    <div style={styles.chatBubble}>
                      <strong style={styles.chatBubbleStrong}>
                        Hi {username || "there"}! 👋
                      </strong>
                      <span>
                        Ask anything about the selected resume. I'll give
                        grounded, document-based answers.
                      </span>
                    </div>
                  </div>

                  <div style={styles.suggestionsPanel}>
                    <div style={styles.suggestionsTitle}>Suggested questions</div>
                    <div style={styles.suggestionsSubtitle}>
                      Choose a question to get started.
                    </div>

                    <div style={styles.suggestionGridLarge}>
                      {SUGGESTED_QUESTIONS.map((question, index) => (
                        <button
                          key={question}
                          type="button"
                          style={styles.suggestionCardLarge}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSuggestionClick(question)}
                        >
                          <span style={styles.suggestionGlyph}>
                            {["SK", "ED", "AC", "EX", "PR", "CE"][index]}
                          </span>
                          <span>{question}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleChat} style={styles.chatForm}>
                    <div style={styles.chatInputWrap}>
                      <span style={styles.chatInputIcon}>⌕</span>
                      <input
                        type="text"
                        placeholder="Ask anything about the resume..."
                        value={query}
                        onFocus={() => setShowSuggestions(false)}
                        onChange={(e) => setQuery(e.target.value)}
                        style={styles.chatInput}
                        disabled={loading || !selectedDocumentId}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        ...styles.sendButton,
                        opacity:
                          loading || !query.trim() || !selectedDocumentId
                            ? 0.55
                            : 1,
                      }}
                      disabled={loading || !query.trim() || !selectedDocumentId}
                    >
                      {loading ? "..." : "↗"}
                    </button>
                  </form>

                  {message && <div style={styles.errorBox}>{message}</div>}
                </div>

                <aside style={styles.qaSourcePanel}>
                  <div style={styles.cardEyebrow}>ACTIVE SOURCE</div>
                  <div style={styles.qaSourceIcon}>PDF</div>
                  <strong style={styles.qaSourceTitle}>
                    {activeDocument?.title || "No resume selected"}
                  </strong>
                  <span style={styles.qaSourceText}>
                    {activeDocument?.processed
                      ? "Processed and ready for grounded Q&A."
                      : "Select a processed resume."}
                  </span>

                  <button
                    type="button"
                    onClick={() => openSection("resumes")}
                    style={styles.secondaryActionButtonFull}
                  >
                    Change Resume
                  </button>
                </aside>
              </div>

              {chatHistory.length > 0 && (
                <div style={styles.chatHistory}>
                  <div style={styles.historyHeader}>
                    <div>
                      <div style={styles.cardEyebrow}>CONVERSATION</div>
                      <h2 style={styles.historyTitle}>Recent answers</h2>
                    </div>

                    <button
                      type="button"
                      onClick={clearChat}
                      style={styles.clearButton}
                    >
                      Clear chat
                    </button>
                  </div>

                  {chatHistory.map((chat) => (
                    <div key={chat.id} style={styles.chatItem}>
                      <div style={styles.userMessageRow}>
                        <div style={styles.userAvatar}>You</div>
                        <div style={styles.userMessage}>{chat.question}</div>
                      </div>

                      <div style={styles.aiMessageRow}>
                        <div style={styles.aiAvatar}>OM</div>
                        <div style={styles.aiMessage}>
                          <div style={styles.answerLabel}>OPSMIND AI</div>

                          <div style={styles.answerContent}>
                            <ReactMarkdown
                              components={{
                                h1: ({ children }) => (
                                  <h3 style={styles.markdownH1}>{children}</h3>
                                ),
                                h2: ({ children }) => (
                                  <h3 style={styles.markdownH2}>{children}</h3>
                                ),
                                h3: ({ children }) => (
                                  <h4 style={styles.markdownH3}>{children}</h4>
                                ),
                                p: ({ children }) => (
                                  <p style={styles.markdownParagraph}>{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul style={styles.markdownList}>{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol style={styles.markdownList}>{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li style={styles.markdownListItem}>{children}</li>
                                ),
                                strong: ({ children }) => (
                                  <strong style={styles.markdownStrong}>{children}</strong>
                                ),
                                code: ({ children }) => (
                                  <code style={styles.markdownCode}>{children}</code>
                                ),
                              }}
                            >
                              {chat.answer.replace(/\\([*_`])/g, "$1")}
                            </ReactMarkdown>
                          </div>

                          {chat.sources && chat.sources.length > 0 && (
                            <div style={styles.sourcesArea}>
                              <div style={styles.sourcesHeader}>Sources</div>

                              {chat.sources.map((source, sourceIndex) => (
                                <div
                                  key={`${source.document_id}-${source.chunk_index}-${sourceIndex}`}
                                  style={styles.source}
                                >
                                  <div>
                                    <strong style={styles.sourceTitle}>
                                      Document {source.document_id}
                                    </strong>
                                    <div style={styles.sourceMeta}>
                                      Chunk {source.chunk_index}
                                    </div>
                                  </div>

                                  <span style={styles.score}>
                                    Score {Number(source.score).toFixed(3)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div style={styles.loadingMessage}>
                      <div style={styles.aiAvatar}>OM</div>
                      <div style={styles.thinkingBubble}>
                        Thinking <span style={styles.loadingDots}>•••</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              JOB MATCH
          ================================================== */}
          {activeSection === "match" && (
            <section style={styles.workspaceFull}>
              <div style={styles.workspaceTopBar}>
                <div>
                  <div style={styles.cardEyebrow}>JOB MATCH ANALYZER</div>
                  <h2 style={styles.workspaceTitle}>
                    Compare this resume with a job description
                  </h2>
                  <p style={styles.cardDescription}>
                    Analyze the selected resume against role requirements and
                    see strengths and skill gaps.
                  </p>
                </div>

                <div style={styles.workspaceSource}>
                  <span style={styles.sourceDot} />
                  {activeDocument ? activeDocument.title : "No resume selected"}
                </div>
              </div>

              <div style={styles.matchLayout}>
                <div>
                  <label style={styles.textareaLabel}>JOB DESCRIPTION</label>

                  <textarea
                    value={jobDescription}
                    onChange={(e) => {
                      setJobDescription(e.target.value);
                      setJobMatch(null);
                      setJobMatchError("");
                    }}
                    placeholder="Paste the complete job description here..."
                    style={styles.jobDescriptionLarge}
                    disabled={jobMatching}
                  />

                  <div style={styles.matchActionRow}>
                    <button
                      type="button"
                      onClick={() => openSection("resumes")}
                      style={styles.secondaryActionButton}
                    >
                      Change Resume
                    </button>

                    <button
                      type="button"
                      onClick={handleJobMatch}
                      style={{
                        ...styles.primaryButton,
                        width: "auto",
                        minWidth: "180px",
                        opacity:
                          jobMatching ||
                          !selectedDocumentId ||
                          !jobDescription.trim()
                            ? 0.6
                            : 1,
                      }}
                      disabled={
                        jobMatching ||
                        !selectedDocumentId ||
                        !jobDescription.trim()
                      }
                    >
                      {jobMatching ? "Analyzing..." : "Analyze Job Match"}
                    </button>
                  </div>

                  {jobMatchError && (
                    <div style={styles.errorBox}>{jobMatchError}</div>
                  )}
                </div>

                <aside style={styles.matchSourcePanel}>
                  <div style={styles.cardEyebrow}>SELECTED RESUME</div>
                  <div style={styles.qaSourceIcon}>PDF</div>
                  <strong style={styles.qaSourceTitle}>
                    {activeDocument?.title || "No resume selected"}
                  </strong>
                  <span style={styles.qaSourceText}>
                    {activeDocument?.processed
                      ? "Ready for job matching."
                      : "Select a processed resume first."}
                  </span>
                </aside>
              </div>

              {jobMatch && (
                <div style={styles.jobResult}>
                  <div style={styles.matchScorePanel}>
                    <div>
                      <div style={styles.matchEyebrow}>OVERALL MATCH</div>
                      <div style={styles.matchScore}>
                        {jobMatch.overall_score}%
                      </div>
                      <div style={styles.matchRecommendation}>
                        {jobMatch.recommendation}
                      </div>
                    </div>

                    <div style={styles.matchCircle}>
                      {jobMatch.overall_score}%
                    </div>
                  </div>

                  <p style={styles.matchDetail}>
                    {jobMatch.recommendation_detail}
                  </p>

                  <div
                    style={styles.breakdownGrid}
                    className="opsmind-two-col"
                  >
                    {Object.entries(jobMatch.breakdown || {})
                      .filter(([key]) => key !== "overall_text_coverage")
                      .map(([key, value]) => (
                        <div key={key} style={styles.breakdownItem}>
                          <div style={styles.breakdownTop}>
                            <span>
                              {key
                                .replaceAll("_", " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                            <strong>{value}%</strong>
                          </div>

                          <div style={styles.progressTrack}>
                            <div
                              style={{
                                ...styles.progressFill,
                                width: `${Math.max(
                                  0,
                                  Math.min(100, Number(value))
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>

                  <div
                    style={styles.matchColumns}
                    className="opsmind-two-col"
                  >
                    <div style={styles.matchListCard}>
                      <h3 style={styles.matchListTitle}>
                        ✓ Strong Matches
                      </h3>

                      <div style={styles.matchTags}>
                        {(jobMatch.matched_required_skills || [])
                          .concat(jobMatch.matched_preferred_skills || [])
                          .map((skill) => (
                            <span key={skill} style={styles.matchTag}>
                              {skill}
                            </span>
                          ))}

                        {!(
                          (jobMatch.matched_required_skills || []).length ||
                          (jobMatch.matched_preferred_skills || []).length
                        ) && (
                          <span style={styles.mutedText}>
                            No explicit skill matches detected.
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={styles.matchListCard}>
                      <h3 style={styles.matchListTitle}>
                        ! Skill Gaps
                      </h3>

                      <div style={styles.matchTags}>
                        {(jobMatch.missing_required_skills || [])
                          .concat(jobMatch.missing_preferred_skills || [])
                          .map((skill) => (
                            <span key={skill} style={styles.gapTag}>
                              {skill}
                            </span>
                          ))}

                        {!(
                          (jobMatch.missing_required_skills || []).length ||
                          (jobMatch.missing_preferred_skills || []).length
                        ) && (
                          <span style={styles.mutedText}>
                            No detected skill gaps.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          {/* ==================================================
              ANALYTICS
          ================================================== */}
          {activeSection === "analytics" && (
            <section style={styles.analyticsPanel}>
              <div style={styles.analyticsTop}>
                <div>
                  <div style={styles.cardEyebrow}>WORKSPACE ANALYTICS</div>
                  <h2 style={styles.managerTitle}>Activity overview</h2>
                  <p style={styles.cardDescription}>
                    A simple snapshot of the documents and analysis work in this workspace.
                  </p>
                </div>
                <div style={styles.analyticsLive}>
                  <span style={styles.sourceDot} /> Live workspace
                </div>
              </div>

              <div style={styles.analyticsCards}>
                <div style={styles.analyticsCard}>
                  <span>DOCUMENTS</span>
                  <strong>{documents.length}</strong>
                  <small>Total uploaded</small>
                </div>
                <div style={styles.analyticsCard}>
                  <span>READY</span>
                  <strong>{documents.filter((d) => d.processed).length}</strong>
                  <small>Processed documents</small>
                </div>
                <div style={styles.analyticsCard}>
                  <span>ACTIVE SOURCE</span>
                  <strong>{activeDocument ? "1" : "0"}</strong>
                  <small>Current selection</small>
                </div>
                <div style={styles.analyticsCard}>
                  <span>JOB MATCH</span>
                  <strong>{jobMatch ? `${jobMatch.overall_score}%` : "—"}</strong>
                  <small>Latest analysis</small>
                </div>
              </div>

              <div style={styles.analyticsBottom}>
                <div style={styles.analyticsInfoCard}>
                  <div style={styles.cardEyebrow}>DOCUMENT COVERAGE</div>
                  <h3 style={styles.analyticsHeading}>Knowledge readiness</h3>
                  <div style={styles.analyticsProgressTrack}>
                    <div
                      style={{
                        ...styles.analyticsProgressFill,
                        width: `${documents.length ? Math.round((documents.filter((d) => d.processed).length / documents.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <strong style={styles.analyticsPercent}>
                    {documents.length
                      ? Math.round((documents.filter((d) => d.processed).length / documents.length) * 100)
                      : 0}%
                  </strong>
                  <p style={styles.analyticsMuted}>
                    Processed documents ready for Q&A and analysis.
                  </p>
                </div>

                <div style={styles.analyticsInfoCard}>
                  <div style={styles.cardEyebrow}>RECOMMENDED NEXT STEP</div>
                  <h3 style={styles.analyticsHeading}>
                    {activeDocument ? "Run a Job Match" : "Upload a document"}
                  </h3>
                  <p style={styles.analyticsMuted}>
                    {activeDocument
                      ? "Use the selected resume against a job description to identify strengths and skill gaps."
                      : "Add a PDF to start building your searchable knowledge base."}
                  </p>
                  <button
                    type="button"
                    onClick={() => openSection(activeDocument ? "match" : "knowledge")}
                    style={styles.primarySmallButton}
                  >
                    {activeDocument ? "Open Job Match" : "Open Knowledge Base"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ==================================================
              SETTINGS
          ================================================== */}
          {activeSection === "settings" && (
            <section style={styles.settingsPanel}>
              <div style={styles.cardEyebrow}>WORKSPACE SETTINGS</div>
              <h2 style={styles.managerTitle}>Preferences</h2>
              <p style={styles.cardDescription}>
                Keep your workspace simple, grounded, and focused.
              </p>

              <div style={styles.settingsList}>
                <div style={styles.settingRow}>
                  <div>
                    <strong>Grounded answers</strong>
                    <span>Answers use the selected document as the knowledge source.</span>
                  </div>
                  <span style={styles.settingEnabled}>Enabled</span>
                </div>

                <div style={styles.settingRow}>
                  <div>
                    <strong>Selected source</strong>
                    <span>{activeDocument ? activeDocument.title : "No document selected"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSection("knowledge")}
                    style={styles.secondarySmallButton}
                  >
                    Change
                  </button>
                </div>

                <div style={styles.settingRow}>
                  <div>
                    <strong>Resume workspace</strong>
                    <span>{documents.length} document{documents.length === 1 ? "" : "s"} available.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openSection("resumes")}
                    style={styles.secondarySmallButton}
                  >
                    Manage
                  </button>
                </div>

                <div style={styles.settingRow}>
                  <div>
                    <strong>Account</strong>
                    <span>Signed in as {username || "Karthick"}.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={styles.secondarySmallButton}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </section>
          )}

        </main>
      </div>

      <footer style={styles.footer}>
        <span>© 2026 OpsMind AI</span>
        <span>Smarter Knowledge. Better Decisions.</span>
      </footer>
    </div>
  );
}

// ==================================================
// PROFESSIONAL UI STYLES
// ==================================================
const styles = {
  app: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#10213f",
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
  },

  header: {
    height: "72px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 26px",
    background: "#ffffff",
    borderBottom: "1px solid #e1e8f2",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },

  headerBrand: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
  },

  logoMark: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  brandName: {
    color: "#13284d",
    fontSize: "20px",
    fontWeight: "900",
    letterSpacing: "-0.5px",
  },

  brandAI: {
    color: "#2871dd",
  },

  brandSubtitle: {
    marginTop: "1px",
    color: "#7a899f",
    fontSize: "12px",
    fontWeight: "600",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
  },

  sourceHeaderChip: {
    maxWidth: "260px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 10px",
    borderRadius: "8px",
    background: "#f6f9fd",
    border: "1px solid #e1e8f2",
    color: "#61718a",
    fontSize: "13px",
    fontWeight: "700",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  sourceDot: {
    width: "7px",
    height: "7px",
    flex: "0 0 7px",
    borderRadius: "50%",
    background: "#1eae6a",
  },

  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  userInitial: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#183d78",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "12px",
  },

  userName: {
    display: "block",
    color: "#1b2d4d",
    fontSize: "12px",
  },

  userRole: {
    display: "block",
    color: "#8190a5",
    fontSize: "13px",
    marginTop: "1px",
  },

  logoutButton: {
    padding: "8px 13px",
    border: "1px solid #cad7e8",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#425774",
    fontWeight: "750",
    fontSize: "13px",
    cursor: "pointer",
  },

  shell: {
    display: "grid",
    gridTemplateColumns: "268px minmax(0, 1fr)",
    minHeight: "calc(100vh - 72px)",
  },

  sidebar: {
    width: "268px",
    minHeight: "calc(100vh - 72px)",
    position: "sticky",
    top: "72px",
    alignSelf: "start",
    background: "#ffffff",
    borderRight: "1px solid #e1e8f2",
    padding: "22px 16px 18px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },

  sidebarSectionLabel: {
    padding: "0 10px",
    marginBottom: "9px",
    color: "#93a0b3",
    fontSize: "13px",
    letterSpacing: "1.2px",
    fontWeight: "900",
  },

  sidebarNav: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  sideNavItem: {
    position: "relative",
    width: "100%",
    minHeight: "54px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "7px 10px",
    border: "1px solid transparent",
    borderRadius: "11px",
    background: "transparent",
    color: "#5b6d86",
    fontSize: "12px",
    fontWeight: "750",
    textAlign: "left",
    cursor: "pointer",
    transition: "all 160ms ease",
  },

  sideNavItemActive: {
    background: "#edf4ff",
    borderColor: "#d7e6fb",
    color: "#145fc9",
    boxShadow: "0 4px 12px rgba(37,99,235,0.06)",
  },

  sideNavIcon: {
    width: "30px",
    height: "30px",
    flex: "0 0 30px",
    borderRadius: "8px",
    background: "#f5f7fa",
    color: "#5e7089",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "950",
    letterSpacing: "0.4px",
  },

  activeNavIndicator: {
    marginLeft: "auto",
    color: "#2b73e0",
    fontSize: "7px",
  },

  sidebarBottom: {
    marginTop: "34px",
    paddingTop: "17px",
    borderTop: "1px solid #edf1f6",
  },

  sidebarBrandMark: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    color: "#17386e",
    gap: "3px",
  },

  main: {
    minWidth: 0,
    padding: "20px 28px 30px",
    overflow: "auto",
  },

  pageIntro: {
    minHeight: "126px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "20px 28px",
    background: "#ffffff",
    border: "1px solid #e0e7f0",
    borderRadius: "15px",
    marginBottom: "14px",
  },

  pageEyebrow: {
    color: "#2369d1",
    fontSize: "13px",
    letterSpacing: "1.5px",
    fontWeight: "950",
    marginBottom: "7px",
  },

  pageTitle: {
    margin: 0,
    color: "#12284d",
    fontSize: "27px",
    lineHeight: 1.15,
    letterSpacing: "-0.8px",
    fontWeight: "900",
  },

  pageSubtitle: {
    margin: "8px 0 0",
    maxWidth: "680px",
    color: "#697b94",
    fontSize: "13px",
    lineHeight: 1.55,
  },

  heroStatusDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#20ad68",
    marginBottom: "7px",
  },

  pageIntroMark: {
    width: "190px",
    flex: "0 0 190px",
    minHeight: "72px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: "24px",
    borderLeft: "1px solid #e5eaf2",
    color: "#294361",
  },

  pageIntroLogo: {
    position: "relative",
    width: "62px",
    height: "62px",
    border: "4px solid #173d78",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#173d78",
    fontSize: "27px",
    fontWeight: "950",
    letterSpacing: "-5px",
  },

  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: "14px",
  },

  dashboardWelcome: {
    padding: "25px",
    minHeight: "220px",
    borderRadius: "14px",
    background: "#173d78",
    color: "#ffffff",
    border: "1px solid #173d78",
  },

  dashboardHeroTitle: {
    margin: "8px 0 8px",
    fontSize: "27px",
    lineHeight: 1.1,
    fontWeight: "900",
    letterSpacing: "-0.7px",
  },

  dashboardHeroText: {
    margin: 0,
    maxWidth: "600px",
    color: "#d7e3f5",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  dashboardActions: {
    display: "flex",
    gap: "8px",
    marginTop: "20px",
  },

  secondaryActionButton: {
    padding: "10px 14px",
    border: "1px solid #cbd8e9",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#31506f",
    fontSize: "13px",
    fontWeight: "800",
    cursor: "pointer",
  },

  secondaryActionButtonFull: {
    width: "100%",
    marginTop: "14px",
    padding: "9px",
    border: "1px solid #cad7e8",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#3f5876",
    fontSize: "13px",
    fontWeight: "800",
    cursor: "pointer",
  },

  dashboardStats: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "9px",
  },

  dashboardStat: {
    minHeight: "66px",
    padding: "12px 14px",
    background: "#ffffff",
    border: "1px solid #e0e7f0",
    borderRadius: "12px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gridTemplateRows: "auto auto",
    alignItems: "center",
  },

  dashboardStatSpan: {
    gridColumn: "1 / 2",
  },

  dashboardQuickCard: {
    marginTop: "14px",
    padding: "18px",
    background: "#ffffff",
    border: "1px solid #e0e7f0",
    borderRadius: "14px",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "9px",
    marginTop: "11px",
  },

  quickCard: {
    minHeight: "105px",
    padding: "12px",
    border: "1px solid #e0e7f0",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#253c5d",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "5px",
  },

  quickIcon: {
    width: "27px",
    height: "27px",
    borderRadius: "7px",
    background: "#edf4ff",
    color: "#1f66cf",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "7px",
    fontWeight: "950",
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },

  card: {
    padding: "20px",
    background: "#ffffff",
    border: "1px solid #e0e7f0",
    borderRadius: "14px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "14px",
  },

  cardHeaderCompact: {
    marginBottom: "14px",
  },

  cardEyebrow: {
    color: "#687991",
    fontSize: "13px",
    fontWeight: "950",
    letterSpacing: "1.1px",
  },

  cardTitle: {
    margin: "5px 0 3px",
    color: "#172b4e",
    fontSize: "17px",
    fontWeight: "850",
  },

  cardDescription: {
    margin: 0,
    color: "#74839a",
    fontSize: "12px",
    lineHeight: 1.5,
  },

  cardIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "#edf4ff",
    color: "#2168d3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
    fontWeight: "800",
  },

  fileInput: {
    display: "none",
  },

  uploadDropzone: {
    minHeight: "230px",
    border: "1.5px dashed #c7d5e7",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    color: "#334a6a",
    background: "#fbfcfe",
    cursor: "pointer",
    textAlign: "center",
    fontSize: "13px",
  },

  uploadCloud: {
    width: "46px",
    height: "46px",
    borderRadius: "12px",
    background: "#edf4ff",
    color: "#1f67d3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    fontWeight: "700",
    marginBottom: "4px",
  },

  primaryButton: {
    padding: "10px 14px",
    border: "0",
    borderRadius: "8px",
    background: "#216bd7",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "850",
    cursor: "pointer",
  },

  selectedFile: {
    marginTop: "10px",
    padding: "8px 10px",
    borderRadius: "8px",
    background: "#f5f8fc",
    color: "#41536f",
    fontSize: "13px",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },

  fileSize: { color: "#7b899f" },

  successBox: {
    marginTop: "10px",
    padding: "9px 10px",
    borderRadius: "8px",
    background: "#effaf4",
    border: "1px solid #ccefdc",
    color: "#14794b",
    fontSize: "12px",
  },

  errorBox: {
    marginTop: "10px",
    padding: "9px 10px",
    borderRadius: "8px",
    background: "#fff5f5",
    border: "1px solid #ffd6d6",
    color: "#b42318",
    fontSize: "12px",
  },

  documentSelect: {
    width: "100%",
    padding: "12px",
    border: "1px solid #cbd7e7",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#1b2e4e",
    outline: "none",
    fontSize: "12px",
    fontWeight: "700",
  },

  sourceHint: {
    marginTop: "11px",
    padding: "9px 10px",
    borderRadius: "8px",
    background: "#f5f8fc",
    color: "#65758d",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },

  managerPanel: {
    padding: "20px",
    background: "#ffffff",
    border: "1px solid #e0e7f0",
    borderRadius: "14px",
  },

  managerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "15px",
  },

  managerTitle: {
    margin: "5px 0 3px",
    color: "#172b4e",
    fontSize: "19px",
    fontWeight: "900",
  },

  resumeCount: {
    padding: "7px 10px",
    borderRadius: "8px",
    background: "#edf4ff",
    border: "1px solid #d9e7fb",
    color: "#1c60c5",
    fontSize: "13px",
    fontWeight: "850",
    whiteSpace: "nowrap",
  },

  resumeGridLarge: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "10px",
  },

  resumeCardLarge: {
    position: "relative",
    minHeight: "165px",
    padding: "14px",
    border: "1px solid #e0e7f0",
    borderRadius: "11px",
    background: "#ffffff",
  },

  resumeCardSelected: {
    border: "1px solid #5d91e4",
    background: "#f8fbff",
    boxShadow: "0 0 0 2px rgba(42,110,218,0.07)",
  },

  resumeTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  pdfIconLarge: {
    width: "39px",
    height: "46px",
    borderRadius: "7px",
    background: "#fff3f1",
    border: "1px solid #ffd0c9",
    color: "#d84335",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "950",
  },

  resumeActions: {
    position: "relative",
  },

  moreButton: {
    width: "28px",
    height: "28px",
    border: "0",
    borderRadius: "7px",
    background: "transparent",
    color: "#71809a",
    fontSize: "18px",
    cursor: "pointer",
  },

  resumeTitleLarge: {
    minHeight: "38px",
    marginTop: "14px",
    color: "#182c4c",
    fontSize: "13px",
    lineHeight: 1.45,
    fontWeight: "800",
    wordBreak: "break-word",
  },

  resumeMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "7px",
  },

  processedBadge: {
    padding: "4px 7px",
    borderRadius: "6px",
    background: "#effaf4",
    color: "#14794b",
    fontSize: "13px",
    fontWeight: "850",
  },

  processingBadge: {
    background: "#fff8eb",
    color: "#a15a00",
  },

  selectedBadge: {
    padding: "4px 7px",
    borderRadius: "6px",
    background: "#e8f1ff",
    color: "#1e62c7",
    fontSize: "13px",
    fontWeight: "850",
  },

  resumeMatchButton: {
    width: "100%",
    marginTop: "13px",
    padding: "8px 9px",
    border: "1px solid #286ed8",
    borderRadius: "7px",
    background: "#216bd7",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "850",
    cursor: "pointer",
  },

  resumeMenu: {
    position: "absolute",
    zIndex: 30,
    top: "31px",
    right: "0",
    minWidth: "175px",
    padding: "5px",
    border: "1px solid #dbe3ee",
    borderRadius: "9px",
    background: "#ffffff",
    boxShadow: "0 14px 30px rgba(23,43,77,0.14)",
  },

  resumeMenuItem: {
    width: "100%",
    padding: "8px 9px",
    border: "0",
    borderRadius: "6px",
    background: "transparent",
    color: "#344765",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
  },

  resumeDeleteItem: {
    width: "100%",
    padding: "8px 9px",
    border: "0",
    borderRadius: "6px",
    background: "transparent",
    color: "#c62828",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "750",
    cursor: "pointer",
  },

  renameBox: {
    marginTop: "13px",
  },

  renameInput: {
    width: "100%",
    padding: "8px",
    border: "1px solid #cbd7e7",
    borderRadius: "7px",
    outline: "none",
    color: "#172a4c",
    fontSize: "12px",
  },

  renameActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "6px",
    marginTop: "7px",
  },

  primarySmallButton: {
    padding: "7px 10px",
    border: "0",
    borderRadius: "7px",
    background: "#216bd7",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "800",
    cursor: "pointer",
  },

  secondarySmallButton: {
    padding: "7px 10px",
    border: "1px solid #cbd7e7",
    borderRadius: "7px",
    background: "#ffffff",
    color: "#4f627d",
    fontSize: "13px",
    fontWeight: "800",
    cursor: "pointer",
  },

  resumeEmptyState: {
    minHeight: "300px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    color: "#74839a",
    border: "1px dashed #c9d6e7",
    borderRadius: "11px",
    background: "#fbfcfe",
    textAlign: "center",
    fontSize: "12px",
  },

  emptyLogo: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    background: "#edf4ff",
    color: "#1c60c5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "950",
    marginBottom: "3px",
  },

  workspaceFull: {
    padding: "20px",
    background: "#ffffff",
    border: "1px solid #e0e7f0",
    borderRadius: "14px",
  },

  workspaceTopBar: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    paddingBottom: "15px",
    borderBottom: "1px solid #edf1f6",
  },

  workspaceTitle: {
    margin: "5px 0 3px",
    color: "#172b4e",
    fontSize: "19px",
    fontWeight: "900",
  },

  workspaceSource: {
    maxWidth: "250px",
    padding: "8px 10px",
    borderRadius: "8px",
    background: "#f5f8fc",
    color: "#5f7089",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "13px",
    fontWeight: "750",
  },

  qaLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 245px",
    gap: "16px",
    marginTop: "16px",
  },

  qaConversation: {
    minWidth: 0,
  },

  qaSourcePanel: {
    padding: "15px",
    border: "1px solid #e1e8f1",
    borderRadius: "10px",
    background: "#fbfcfe",
    alignSelf: "start",
  },

  qaSourceIcon: {
    width: "40px",
    height: "47px",
    margin: "14px 0 10px",
    borderRadius: "7px",
    background: "#fff3f1",
    border: "1px solid #ffd0c9",
    color: "#d84335",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "950",
  },

  qaSourceTitle: {
    display: "block",
    color: "#1b2e4e",
    fontSize: "12px",
    lineHeight: 1.45,
    wordBreak: "break-word",
  },

  qaSourceText: {
    display: "block",
    marginTop: "6px",
    color: "#78879d",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  chatIntro: {
    display: "flex",
    gap: "9px",
    alignItems: "flex-start",
    marginBottom: "14px",
  },

  workspaceAvatar: {
    width: "37px",
    height: "37px",
    flex: "0 0 37px",
    borderRadius: "50%",
    background: "#173d78",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "950",
  },

  chatBubble: {
    flex: 1,
    padding: "11px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    background: "#fbfcfe",
    color: "#40516c",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  chatBubbleStrong: {
    display: "block",
    color: "#1c2d4d",
    fontSize: "13px",
    marginBottom: "4px",
  },

  suggestionsPanel: {
    borderTop: "1px solid #edf0f4",
    paddingTop: "13px",
  },

  suggestionsTitle: {
    color: "#1c2d4d",
    fontSize: "12px",
    fontWeight: "850",
  },

  suggestionsSubtitle: {
    color: "#7a879b",
    fontSize: "13px",
    marginTop: "3px",
    marginBottom: "9px",
  },

  suggestionGridLarge: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
  },

  suggestionCardLarge: {
    minHeight: "82px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px",
    border: "1px solid #dce4ef",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#334765",
    textAlign: "left",
    fontSize: "13px",
    lineHeight: 1.35,
    fontWeight: "700",
    cursor: "pointer",
  },

  suggestionGlyph: {
    width: "27px",
    height: "27px",
    flex: "0 0 27px",
    borderRadius: "7px",
    background: "#edf4ff",
    color: "#1c67d2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "7px",
    fontWeight: "950",
  },

  chatForm: {
    display: "flex",
    gap: "7px",
    marginTop: "12px",
  },

  chatInputWrap: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },

  chatInputIcon: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#7c8ca4",
    fontSize: "16px",
  },

  chatInput: {
    width: "100%",
    padding: "11px 12px 11px 31px",
    border: "1px solid #d3ddea",
    borderRadius: "9px",
    outline: "none",
    background: "#ffffff",
    color: "#1a2d4d",
    fontSize: "13px",
  },

  sendButton: {
    width: "43px",
    border: "0",
    borderRadius: "9px",
    background: "#1769e0",
    color: "#ffffff",
    fontSize: "18px",
    cursor: "pointer",
  },

  textareaLabel: {
    display: "block",
    marginBottom: "7px",
    color: "#697a92",
    fontSize: "13px",
    letterSpacing: "1px",
    fontWeight: "900",
  },

  matchLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 245px",
    gap: "16px",
    marginTop: "16px",
  },

  jobDescriptionLarge: {
    width: "100%",
    minHeight: "245px",
    padding: "13px",
    border: "1px solid #cdd9e8",
    borderRadius: "10px",
    resize: "vertical",
    outline: "none",
    background: "#ffffff",
    color: "#1a2d4d",
    fontSize: "12px",
    lineHeight: 1.55,
  },

  matchActionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    marginTop: "10px",
  },

  matchSourcePanel: {
    padding: "15px",
    border: "1px solid #e1e8f1",
    borderRadius: "10px",
    background: "#fbfcfe",
    alignSelf: "start",
  },

  jobResult: {
    marginTop: "17px",
    paddingTop: "17px",
    borderTop: "1px solid #e8edf3",
  },

  matchScorePanel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    borderRadius: "11px",
    background: "#f7faff",
    border: "1px solid #dce8f9",
  },

  matchEyebrow: {
    color: "#1c65cc",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  matchScore: {
    marginTop: "2px",
    color: "#123d80",
    fontSize: "35px",
    lineHeight: 1,
    fontWeight: "950",
  },

  matchRecommendation: {
    marginTop: "4px",
    color: "#2670d4",
    fontSize: "13px",
    fontWeight: "800",
  },

  matchCircle: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    border: "6px solid #1769e0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#173d7b",
    fontSize: "13px",
    fontWeight: "900",
    background: "#ffffff",
  },

  matchDetail: {
    color: "#64738b",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  breakdownGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "9px",
    marginTop: "10px",
  },

  breakdownItem: {
    padding: "9px",
    border: "1px solid #e7edf5",
    borderRadius: "8px",
  },

  breakdownTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    color: "#52647d",
    fontSize: "13px",
    fontWeight: "700",
    marginBottom: "5px",
  },

  progressTrack: {
    height: "5px",
    background: "#e9eef5",
    borderRadius: "999px",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#1769e0",
    borderRadius: "999px",
  },

  matchColumns: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "9px",
    marginTop: "10px",
  },

  matchListCard: {
    padding: "10px",
    border: "1px solid #e5eaf2",
    borderRadius: "8px",
  },

  matchListTitle: {
    margin: "0 0 7px",
    color: "#263a59",
    fontSize: "13px",
    fontWeight: "850",
  },

  matchTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
  },

  matchTag: {
    padding: "4px 6px",
    borderRadius: "5px",
    background: "#eef9f3",
    color: "#14764a",
    fontSize: "7px",
    fontWeight: "800",
  },

  gapTag: {
    padding: "4px 6px",
    borderRadius: "5px",
    background: "#fff3f1",
    color: "#b43b2f",
    fontSize: "7px",
    fontWeight: "800",
  },

  mutedText: {
    color: "#8793a5",
    fontSize: "13px",
  },

  chatHistory: {
    marginTop: "16px",
    paddingTop: "16px",
    borderTop: "1px solid #edf1f6",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  historyTitle: {
    margin: "5px 0 0",
    color: "#14264a",
    fontSize: "16px",
    fontWeight: "850",
  },

  clearButton: {
    padding: "7px 9px",
    border: "1px solid #d5dfeb",
    borderRadius: "7px",
    background: "#ffffff",
    color: "#5b6c84",
    fontSize: "13px",
    fontWeight: "750",
    cursor: "pointer",
  },

  chatItem: {
    padding: "8px 0",
  },

  userMessageRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    marginBottom: "8px",
  },

  userAvatar: {
    width: "28px",
    height: "28px",
    flex: "0 0 28px",
    borderRadius: "50%",
    background: "#edf4ff",
    color: "#1c65cb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "7px",
    fontWeight: "900",
  },

  userMessage: {
    padding: "8px 10px",
    borderRadius: "8px",
    background: "#f5f8fc",
    color: "#3c4d66",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  aiMessageRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  },

  aiAvatar: {
    width: "28px",
    height: "28px",
    flex: "0 0 28px",
    borderRadius: "50%",
    background: "#17356e",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "7px",
    fontWeight: "950",
  },

  aiMessage: {
    flex: 1,
    minWidth: 0,
    padding: "10px",
    border: "1px solid #e3e9f1",
    borderRadius: "9px",
    background: "#fbfcfe",
  },

  answerLabel: {
    color: "#1d63c9",
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "0.7px",
    marginBottom: "6px",
  },

  answerContent: {
    color: "#334765",
    fontSize: "12px",
    lineHeight: 1.6,
  },

  markdownH1: { color: "#14264a", fontSize: "16px", margin: "10px 0 5px" },
  markdownH2: { color: "#14264a", fontSize: "14px", margin: "9px 0 5px" },
  markdownH3: { color: "#203653", fontSize: "12px", margin: "8px 0 4px" },
  markdownParagraph: { margin: "5px 0", color: "#465a75" },
  markdownList: { paddingLeft: "18px", margin: "6px 0" },
  markdownListItem: { marginBottom: "3px" },
  markdownStrong: { color: "#1d3458" },
  markdownCode: {
    padding: "2px 4px",
    borderRadius: "4px",
    background: "#eef2f7",
    color: "#25405f",
    fontSize: "13px",
  },

  sourcesArea: {
    marginTop: "10px",
    paddingTop: "9px",
    borderTop: "1px solid #e6ebf2",
  },

  sourcesHeader: {
    color: "#5c6d86",
    fontSize: "13px",
    fontWeight: "850",
    marginBottom: "5px",
  },

  source: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    padding: "6px 0",
    borderBottom: "1px solid #f0f3f7",
  },

  sourceTitle: {
    color: "#334765",
    fontSize: "13px",
  },

  sourceMeta: {
    color: "#8a96a8",
    fontSize: "7px",
    marginTop: "2px",
  },

  score: {
    color: "#2868c8",
    fontSize: "7px",
    fontWeight: "800",
  },

  loadingMessage: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "10px",
  },

  thinkingBubble: {
    padding: "8px 10px",
    borderRadius: "8px",
    background: "#f3f6fa",
    color: "#68788f",
    fontSize: "13px",
  },

  loadingDots: {
    marginLeft: "5px",
    letterSpacing: "2px",
  },

  analyticsPanel: {
    padding: "22px",
    background: "#ffffff",
    border: "1px solid #e0e7f0",
    borderRadius: "14px",
  },

  analyticsTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    paddingBottom: "15px",
    borderBottom: "1px solid #edf1f6",
  },

  analyticsLive: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 10px",
    borderRadius: "8px",
    background: "#f1faf5",
    color: "#19764c",
    fontSize: "12px",
    fontWeight: "800",
  },

  analyticsCards: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginTop: "15px",
  },

  analyticsCard: {
    padding: "17px",
    minHeight: "125px",
    border: "1px solid #e0e7f0",
    borderRadius: "11px",
    background: "#fbfcfe",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  analyticsBottom: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "12px",
  },

  analyticsInfoCard: {
    padding: "18px",
    border: "1px solid #e0e7f0",
    borderRadius: "11px",
    background: "#ffffff",
  },

  analyticsHeading: {
    margin: "6px 0 8px",
    color: "#172b4e",
    fontSize: "17px",
    fontWeight: "850",
  },

  analyticsProgressTrack: {
    width: "100%",
    height: "9px",
    marginTop: "14px",
    borderRadius: "999px",
    background: "#e8edf5",
    overflow: "hidden",
  },

  analyticsProgressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "#216bd7",
  },

  analyticsPercent: {
    display: "block",
    marginTop: "8px",
    color: "#173d78",
    fontSize: "18px",
  },

  analyticsMuted: {
    margin: "6px 0 12px",
    color: "#74839a",
    fontSize: "13px",
    lineHeight: 1.55,
  },

  settingsPanel: {
    padding: "22px",
    background: "#ffffff",
    border: "1px solid #e0e7f0",
    borderRadius: "14px",
  },

  settingsList: {
    marginTop: "18px",
    borderTop: "1px solid #e6ebf2",
  },

  settingRow: {
    minHeight: "78px",
    padding: "14px 2px",
    borderBottom: "1px solid #e6ebf2",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  settingEnabled: {
    padding: "6px 9px",
    borderRadius: "7px",
    background: "#eef9f3",
    color: "#16764a",
    fontSize: "13px",
    fontWeight: "850",
  },

  footer: {
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    borderTop: "1px solid #e2e7ef",
    background: "#ffffff",
    color: "#8a96a8",
    fontSize: "13px",
  },

  // ==================================================
  // LANDING PAGE
  // ==================================================

  landingPage: {
    minHeight: "100vh",
    background: "#f7f9fc",
    color: "#13284d",
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
  },

  landingTopBar: {
    height: "72px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 42px",
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
  },

  landingBrand: { display: "flex", alignItems: "center", gap: "10px" },

  landingLogo: {
    width: "42px", height: "42px", borderRadius: "12px",
    background: "#173d78", color: "#ffffff", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: "13px",
    fontWeight: "950", letterSpacing: "-1px",
  },

  landingBrandName: { fontSize: "18px", fontWeight: "900", color: "#142c52" },
  landingBrandSub: { fontSize: "13px", color: "#7b899d", marginTop: "2px" },
  landingStatus: { fontSize: "13px", letterSpacing: "1.2px", color: "#718097", fontWeight: "850" },

  landingMain: { maxWidth: "1180px", margin: "0 auto", padding: "0 28px 50px" },

  landingHero: {
    minHeight: "510px", display: "grid", gridTemplateColumns: "1.12fr .88fr",
    gap: "55px", alignItems: "center", padding: "58px 0 45px",
  },

  landingHeroCopy: { maxWidth: "690px" },

  landingEyebrow: {
    color: "#2569d1", fontSize: "13px", fontWeight: "950",
    letterSpacing: "1.5px", marginBottom: "10px",
  },

  landingTitle: {
    margin: 0, fontSize: "46px", lineHeight: "1.08", letterSpacing: "-1.7px",
    color: "#122a50", fontWeight: "950",
  },

  landingLead: {
    maxWidth: "650px", margin: "18px 0 0", color: "#64758e",
    fontSize: "13px", lineHeight: "1.75",
  },

  landingCTA: {
    marginTop: "25px", padding: "13px 18px", border: 0, borderRadius: "9px",
    background: "#173d78", color: "#ffffff", fontSize: "12px",
    fontWeight: "900", cursor: "pointer", boxShadow: "0 10px 24px rgba(23,61,120,.16)",
  },

  landingNote: { marginTop: "10px", color: "#8a97aa", fontSize: "13px" },

  landingProductCard: {
    padding: "20px", borderRadius: "16px", background: "#ffffff",
    border: "1px solid #dfe7f1", boxShadow: "0 22px 55px rgba(30,54,91,.09)",
  },

  landingProductHeader: {
    display: "flex", alignItems: "center", gap: "10px", paddingBottom: "14px",
    borderBottom: "1px solid #edf1f6",
  },

  landingMiniLogo: {
    width: "39px", height: "39px", borderRadius: "10px", background: "#edf4ff",
    color: "#173d78", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", fontWeight: "950",
  },

  landingProductHeaderStrong: { display: "block", color: "#1a2f52", fontSize: "13px" },
  landingProductHeaderSpan: { display: "block", color: "#8996a9", fontSize: "13px", marginTop: "3px" },

  landingPreviewRow: {
    display: "flex", alignItems: "center", gap: "11px", padding: "15px 0",
    borderBottom: "1px solid #f0f3f7",
  },

  landingPreviewIcon: {
    width: "34px", height: "34px", borderRadius: "8px", background: "#f1f5fa",
    color: "#1d62c5", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", fontWeight: "950", flex: "0 0 34px",
  },

  landingPreviewRowStrong: {},
  landingPreviewRowSpan: {},

  landingPreviewFooter: {
    display: "flex", justifyContent: "space-between", marginTop: "13px",
    color: "#8b98aa", fontSize: "7px", letterSpacing: "1px", fontWeight: "850",
  },

  landingSection: { padding: "35px 0 20px", borderTop: "1px solid #e3e9f1" },

  landingSectionHeading: {
    display: "flex", justifyContent: "space-between", alignItems: "end", gap: "30px",
  },

  landingSectionTitle: { margin: "5px 0 0", color: "#162d51", fontSize: "24px", fontWeight: "900", letterSpacing: "-.6px" },
  landingSectionText: { maxWidth: "350px", margin: 0, color: "#75849a", fontSize: "12px", lineHeight: "1.55" },

  landingFeatureGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginTop: "18px",
  },

  landingFeature: {
    padding: "17px", minHeight: "175px", background: "#ffffff", border: "1px solid #e0e7f0",
    borderRadius: "11px",
  },

  landingFeatureIcon: {
    width: "31px", height: "31px", borderRadius: "8px", background: "#edf4ff",
    color: "#1e64ca", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "7px", fontWeight: "950",
  },

  landingFeatureH3: { margin: "13px 0 5px", color: "#1c3153", fontSize: "13px" },
  landingFeatureP: { margin: 0, color: "#73829a", fontSize: "13px", lineHeight: "1.55" },

  landingHowSection: { padding: "35px 0 0", borderTop: "1px solid #e3e9f1", marginTop: "20px" },

  landingSteps: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "9px", marginTop: "18px",
  },

  landingStepsDiv: {
    display: "grid", gridTemplateColumns: "28px 1fr", gridTemplateRows: "auto auto",
    columnGap: "9px", padding: "13px", background: "#ffffff", border: "1px solid #e0e7f0",
    borderRadius: "10px",
  },

  landingStepsB: {
    gridRow: "1 / 3", width: "27px", height: "27px", borderRadius: "50%",
    background: "#173d78", color: "#ffffff", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "13px",
  },

  landingStepsStrong: { color: "#243b5d", fontSize: "13px" },
  landingStepsSpan: { color: "#7b899d", fontSize: "13px", lineHeight: "1.4", marginTop: "3px" },

  landingFooter: {
    display: "flex", justifyContent: "space-between", padding: "14px 42px",
    borderTop: "1px solid #e2e8f0", background: "#ffffff", color: "#8996a8", fontSize: "13px",
  },

  // Login remains clean and professional.
  loginPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "#f4f7fb",
  },

  loginGlowOne: { display: "none" },
  loginGlowTwo: { display: "none" },

  loginCard: {
    width: "100%",
    maxWidth: "410px",
    padding: "34px",
    borderRadius: "18px",
    background: "#ffffff",
    border: "1px solid #dfe6f0",
    boxShadow: "0 20px 50px rgba(28,48,82,0.10)",
  },

  logoLarge: {
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    border: "4px solid #173d78",
    color: "#173d78",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "950",
    marginBottom: "14px",
  },

  loginEyebrow: {
    color: "#2868c8",
    fontSize: "13px",
    letterSpacing: "1.4px",
    fontWeight: "900",
  },

  loginTitle: {
    margin: "6px 0 6px",
    color: "#14264a",
    fontSize: "28px",
    fontWeight: "900",
  },

  loginSubtitle: {
    margin: 0,
    color: "#6d7d95",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  loginForm: {
    marginTop: "24px",
  },

  inputLabel: {
    display: "block",
    margin: "13px 0 6px",
    color: "#344865",
    fontSize: "13px",
    fontWeight: "800",
  },

  loginInput: {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #cfd9e7",
    borderRadius: "9px",
    outline: "none",
    color: "#1a2d4d",
    background: "#ffffff",
    fontSize: "12px",
  },

  loginButton: {
    width: "100%",
    marginTop: "20px",
    padding: "12px",
    border: "0",
    borderRadius: "9px",
    background: "#1769e0",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "850",
    cursor: "pointer",
  },

  loginError: {
    marginTop: "12px",
    padding: "9px",
    borderRadius: "8px",
    background: "#fff5f5",
    border: "1px solid #ffd6d6",
    color: "#b42318",
    fontSize: "13px",
  },
};

export default App;