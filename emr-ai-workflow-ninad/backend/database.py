from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./emr_data.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String)
    patient_id = Column(String)
    user_role = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    description = Column(String)

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String)
    soap_content = Column(Text) # Storing as JSON string for simplicity
    saved_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)