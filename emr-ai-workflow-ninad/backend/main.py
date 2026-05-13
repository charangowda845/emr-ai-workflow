from fastapi import FastAPI, Depends, HTTPException, Header
from pydantic import BaseModel
from database import SessionLocal, AuditLog, ClinicalNote
from ai_service import generate_soap_note
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Role Check Dependency ---
def verify_doctor(x_user_role: str = Header(default=None)):
    if x_user_role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can perform this action.")
    return x_user_role

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Models for Input Validation ---
class TranscriptRequest(BaseModel):
    transcript: str
    patient_id: str

class SaveNoteRequest(BaseModel):
    patient_id: str
    soap_data: dict

# --- Routes ---
@app.post("/api/generate-note")
async def generate_note(req: TranscriptRequest, role: str = Depends(verify_doctor), db: SessionLocal = Depends(get_db)):
    # 1. Call AI
    soap_data = await generate_soap_note(req.transcript)
    
    # 2. Audit Logging
    audit = AuditLog(event_type="AI_GENERATED", patient_id=req.patient_id, user_role=role, description="Generated AI SOAP note")
    db.add(audit)
    db.commit()
    
    return {"status": "success", "data": soap_data}

@app.post("/api/save-note")
def save_note(req: SaveNoteRequest, role: str = Depends(verify_doctor), db: SessionLocal = Depends(get_db)):
    # 1. Save Note
    note = ClinicalNote(patient_id=req.patient_id, soap_content=json.dumps(req.soap_data))
    db.add(note)
    
    # 2. Audit Logging
    audit = AuditLog(event_type="NOTE_SAVED", patient_id=req.patient_id, user_role=role, description="Final note saved by clinician")
    db.add(audit)
    db.commit()
    
    return {"status": "success"}

@app.get("/api/notes/{patient_id}")
def get_notes(patient_id: str, db: SessionLocal = Depends(get_db)):
    notes = db.query(ClinicalNote).filter(ClinicalNote.patient_id == patient_id).all()
    return {"notes": notes}