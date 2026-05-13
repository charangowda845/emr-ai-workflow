const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const sqlite3 = require('sqlite3').verbose();

// Load environment variables
dotenv.config();

const app = express();
const PORT = 8000; // Exact same port as FastAPI so React doesn't break

// Middleware
app.use(cors({ origin: 'http://localhost:5173' })); // Allow React frontend
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize SQLite Database
const db = new sqlite3.Database('./emr_data.db');

db.serialize(() => {
  // Create Audit Table
  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT,
    patient_id TEXT,
    user_role TEXT,
    timestamp DATETIME,
    description TEXT
  )`);

  // Create Notes Table
  db.run(`CREATE TABLE IF NOT EXISTS clinical_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT,
    soap_content TEXT,
    saved_at DATETIME
  )`);
});

// --- Middleware: Mock Role Check ---
const verifyDoctor = (req, res, next) => {
  const role = req.headers['x-user-role'];
  if (role !== 'doctor') {
    return res.status(403).json({ detail: "Only doctors can perform this action." });
  }
  next(); // User is a doctor, proceed to the route
};


// --- API Routes ---

// 1. Generate AI Note Endpoint
app.post('/api/generate-note', verifyDoctor, async (req, res) => {
  const { transcript, patient_id } = req.body;
  const role = req.headers['x-user-role'];
  const now = new Date().toISOString();

  try {
    const prompt = `
      You are a medical scribe. Convert the following transcript into a structured SOAP note.
      Return ONLY a JSON object with four exact keys: "subjective", "objective", "assessment", "plan".
      
      Transcript: ${transcript}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const soapData = JSON.parse(response.choices[0].message.content);

    // Save Audit Log
    db.run(
      `INSERT INTO audit_logs (event_type, patient_id, user_role, timestamp, description) VALUES (?, ?, ?, ?, ?)`,
      ['AI_GENERATED', patient_id, role, now, 'Generated AI SOAP note']
    );

    res.json({ status: "success", data: soapData });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ detail: "Failed to generate AI note." });
  }
});

// 2. Save Final Note Endpoint
app.post('/api/save-note', verifyDoctor, (req, res) => {
  const { patient_id, soap_data } = req.body;
  const role = req.headers['x-user-role'];
  const now = new Date().toISOString();
  
  // Convert JS Object to string for SQLite
  const soapContentString = JSON.stringify(soap_data);

  // Save the clinical note
  db.run(
    `INSERT INTO clinical_notes (patient_id, soap_content, saved_at) VALUES (?, ?, ?)`,
    [patient_id, soapContentString, now],
    function (err) {
      if (err) return res.status(500).json({ detail: "Database error while saving note." });

      // Save Audit Log
      db.run(
        `INSERT INTO audit_logs (event_type, patient_id, user_role, timestamp, description) VALUES (?, ?, ?, ?, ?)`,
        ['NOTE_SAVED', patient_id, role, now, 'Final note saved by clinician']
      );

      res.json({ status: "success" });
    }
  );
});

// 3. Get Visit History Endpoint
app.get('/api/notes/:patient_id', (req, res) => {
  const patient_id = req.params.patient_id;

  db.all(
    `SELECT * FROM clinical_notes WHERE patient_id = ? ORDER BY saved_at DESC`,
    [patient_id],
    (err, rows) => {
      if (err) return res.status(500).json({ detail: "Database error while fetching notes." });
      res.json({ notes: rows });
    }
  );
});

// Start Server
app.listen(PORT, () => {
  console.log(`Node.js EMR API is running on http://localhost:${PORT}`);
});