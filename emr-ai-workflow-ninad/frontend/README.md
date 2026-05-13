# AI-Assisted EMR Visit Note Workflow

A working prototype demonstrating a secure, AI-assisted clinical note-taking workflow. This application allows a clinician to paste a consultation transcript, generate a structured SOAP note via an LLM, review/edit the generated content, and save it to a visit history timeline.

## 🛠️ Technology Stack Decision Note

*   **Frontend:** **React (Vite) with Tailwind CSS**. Chosen for rapid UI development and excellent component state management. Tailwind allows for a clean, clinical aesthetic without the bloat of heavy component libraries.
*   **Backend:** **FastAPI (Python)**. Selected for its native asynchronous capabilities (crucial for handling long-running LLM API calls without blocking), automatic Pydantic validation, and seamless integration with the official OpenAI SDK.
*   **Data Storage:** **SQLite (via SQLAlchemy)**. A lightweight, file-based relational database. It provides a real SQL interface for structuring audit logs and clinical notes for this prototype without requiring the reviewer to set up a Dockerized Postgres instance.
*   **AI Provider:** **OpenAI (gpt-4o-mini)**. Chosen for its high reasoning capabilities and reliable JSON-object output formatting, which is essential for strict SOAP structuring.
*   **Secret Management:** API keys are injected via a `.env` file managed by `python-dotenv`. The frontend never has access to the OpenAI key.
*   **Role Checks:** Implemented as a FastAPI Dependency (middleware) that inspects a mock `x-user-role` header on every protected route. 

## ✅ Completed Features

1.  **Frontend/Backend Separation:** RESTful API architecture.
2.  **Real AI Integration:** Backend-secured OpenAI integration that parses unstructured text into strict JSON SOAP formatting.
3.  **Backend-Enforced RBAC:** FastAPI dependency blocks non-clinical roles from generating or saving notes.
4.  **Audit Logging:** Every AI generation and Note Save event automatically writes to a relational `audit_logs` table with timestamps and user context.
5.  **Clinician Review Flow:** The UI explicitly warns the user that AI content must be reviewed, placing the generated note into editable fields before saving.

*(Note: Skipped complex patient search, full authentication, and a production database as per assignment constraints to focus on the core AI/Audit workflow).*

---

## 🚀 Setup & Run Instructions

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   An OpenAI API Key (with available billing credits)

### 1. Backend Setup
Navigate to the backend directory and set up the Python environment:

```bash
cd backend
python -m venv venv

# Activate the environment:
# Mac/Linux: source venv/bin/activate
# Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn openai python-dotenv pydantic sqlalchemy
cp .env.example .env
Open .env and add your real API key: OPENAI_API_KEY=sk-your-real-key



```bash
Start the Server:
uvicorn main:app --reload
(The backend runs on http://localhost:8000. The SQLite database file emr_data.db will be created automatically on startup).


Frontend Setup
Open a new terminal window and navigate to the frontend directory:
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev

(The frontend runs on http://localhost:5173)