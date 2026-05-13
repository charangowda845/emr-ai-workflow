import { useState, useEffect } from 'react';

function App() {
  // Patient and Clinician Context
  const patient = { id: "P123", name: "Charan Gowda", age: 45, detail: "Diabetes", visitId: "V12345" };
  const clinician = { name: "Dr. Charan", role: "doctor" }; 
  const role = clinician.role; // Change to "nurse" to test the backend 403 error!
  
  // Dynamic State
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState(null); // Starts as null to show placeholder
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  // Fetch visit history from backend on load
  useEffect(() => {
    fetch(`http://localhost:8000/api/notes/${patient.id}`)
      .then(res => res.json())
      .then(data => setHistory(data.notes || []))
      .catch(err => console.error("Failed to fetch history:", err));
  }, []);

  // Call the FastAPI / OpenAI Backend
  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8000/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body: JSON.stringify({ transcript, patient_id: patient.id })
      });
      
      if (!res.ok) throw new Error("Backend role check failed or AI error.");
      
      const data = await res.json();
      
      // Standardize the keys to lowercase for the UI inputs
      const normalizedData = {
        subjective: data.data.Subjective || data.data.subjective || "",
        objective: data.data.Objective || data.data.objective || "",
        assessment: data.data.Assessment || data.data.assessment || "",
        plan: data.data.Plan || data.data.plan || "",
      };
      setSoapNote(normalizedData);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Save the edited note to the database
  const handleSave = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/save-note", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": role },
        body: JSON.stringify({ patient_id: patient.id, soap_data: soapNote })
      });
      
      if (res.ok) {
        setSoapNote(null);
        setTranscript("");
        
        // Refresh history from database after saving
        const histRes = await fetch(`http://localhost:8000/api/notes/${patient.id}`);
        const histData = await histRes.json();
        setHistory(histData.notes || []);
      } else {
        throw new Error("Failed to save to database");
      }
    } catch (err) {
      setError("Failed to save note.");
    }
  };

  const handleDiscard = () => {
    if(window.confirm("Are you sure you want to discard this generated note?")) {
      setSoapNote(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f8] font-sans text-slate-800 pb-10">
      
      {/* 1. Global Header */}
      <header className="bg-gradient-to-r from-[#dce8eb] to-[#e8f1f2] border-b-[5px] border-[#3b7d85] px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-slate-300 rounded-lg flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
            <svg className="w-10 h-10 text-slate-500 mt-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
              {patient.name}, {patient.age} 
              <span className="text-slate-400 font-normal mx-3 text-2xl">|</span> 
              <span className="text-slate-700 text-xl font-medium">{patient.detail}</span>
              <span className="text-slate-400 font-normal mx-3 text-2xl">|</span> 
              <span className="text-slate-600 text-xl font-medium">Visit ID: {patient.visitId}</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 text-right">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
             <svg className="w-8 h-8 text-slate-400 mt-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 text-sm leading-tight">{clinician.name}</p>
            <p className="text-xs text-slate-500 capitalize leading-tight">({clinician.role})</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1600px] mx-auto px-6 mt-6">
        
        <div className="flex justify-end mb-4">
          <button className="flex items-center text-sm bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 shadow-sm transition-colors text-slate-700 font-medium">
            <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Activity Log
          </button>
        </div>

        {/* 2-Column Workflow Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
          
          {/* LEFT COLUMN: Transcript Input */}
          <section className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">1. Clinical Conversation Transcript</h2>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex-grow flex flex-col h-[520px]">
              <textarea 
                className="w-full p-3 text-slate-800 bg-transparent border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3b7d85] focus:border-[#3b7d85] outline-none resize-none flex-grow text-base"
                placeholder="Paste synthetic consultation transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <div className="pt-3 mt-auto">
                <button 
                  onClick={handleGenerate}
                  disabled={loading || !transcript.trim()}
                  className="w-full bg-[#3b7d85] text-white py-3 rounded-lg hover:bg-[#2d6369] font-medium shadow-sm transition-colors flex justify-center items-center text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Generating Note via AI...
                    </span>
                  ) : "Generate AI SOAP Note"}
                </button>
                {error && <p className="text-red-600 text-sm mt-2 text-center font-medium">{error}</p>}
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: SOAP Output */}
          <section className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">2. Review and Edit Generated SOAP Note</h2>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[520px]">
              {soapNote ? (
                <>
                  {/* Warning Banner */}
                  <div className="bg-[#fef8e7] border border-[#f5e3b5] text-[#8a6d2b] px-4 py-2.5 rounded-md text-sm mb-4 flex items-center shadow-sm">
                    <span className="font-bold mr-2 flex items-center text-[#9c7821]">
                      ⚠️ Clinician Review Required
                    </span> 
                    <span className="text-slate-400 mx-1">|</span>
                    <span className="text-slate-600">Audit event logged for AI generation</span>
                  </div>

                  {/* SOAP Grid */}
                  <div className="grid grid-cols-2 gap-4 flex-grow mb-4">
                    <div className="flex flex-col">
                      <label className="block font-bold text-sm text-slate-900 mb-1.5">Subjective (S):</label>
                      <textarea 
                        className="w-full border border-slate-300 p-3 text-sm text-slate-800 rounded-lg flex-grow focus:ring-2 focus:ring-[#3b7d85] focus:border-[#3b7d85] outline-none resize-none"
                        value={soapNote.subjective}
                        onChange={(e) => setSoapNote({...soapNote, subjective: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="block font-bold text-sm text-slate-900 mb-1.5">Assessment (A):</label>
                      <textarea 
                        className="w-full border border-slate-300 p-3 text-sm text-slate-800 rounded-lg flex-grow focus:ring-2 focus:ring-[#3b7d85] focus:border-[#3b7d85] outline-none resize-none"
                        value={soapNote.assessment}
                        onChange={(e) => setSoapNote({...soapNote, assessment: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="block font-bold text-sm text-slate-900 mb-1.5">Objective (O):</label>
                      <textarea 
                        className="w-full border border-slate-300 p-3 text-sm text-slate-800 rounded-lg flex-grow focus:ring-2 focus:ring-[#3b7d85] focus:border-[#3b7d85] outline-none resize-none"
                        value={soapNote.objective}
                        onChange={(e) => setSoapNote({...soapNote, objective: e.target.value})}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="block font-bold text-sm text-slate-900 mb-1.5">Plan (P):</label>
                      <textarea 
                        className="w-full border border-slate-300 p-3 text-sm text-slate-800 rounded-lg flex-grow focus:ring-2 focus:ring-[#3b7d85] focus:border-[#3b7d85] outline-none resize-none"
                        value={soapNote.plan}
                        onChange={(e) => setSoapNote({...soapNote, plan: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-auto">
                    <button onClick={handleSave} className="flex-grow bg-[#3b7d85] text-white py-2.5 rounded-lg font-medium hover:bg-[#2d6369] transition-colors shadow-sm text-lg">
                      Save Final Note
                    </button>
                    <button onClick={handleDiscard} className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm text-lg">
                      Discard
                    </button>
                  </div>
                </>
              ) : (
                /* Placeholder before generation */
                <div className="h-full border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 rounded-xl bg-slate-50/50">
                  <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <p className="font-medium text-lg text-slate-500">AI SOAP note will appear here</p>
                  <p className="text-sm mt-1">Paste a transcript and click generate.</p>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* 3. History Section (Connected to Database) */}
        <section className="mt-10 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">Visit History</h2>
          
          {history.length === 0 ? (
            <p className="text-slate-500 italic">No previous notes found in the database.</p>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {history.map((note) => (
                <div key={note.id} className="flex items-center text-sm bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md text-slate-600">
                  <span className="bg-[#5c8599] text-white text-xs font-bold px-2 py-0.5 rounded mr-2">Note {note.id}</span>
                  <span className="mr-2 border-r border-slate-300 pr-2">
                    {new Date(note.saved_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className="mr-2 border-r border-slate-300 pr-2">{clinician.name}</span>
                  <span className="mr-2">AI SOAP</span>
                  <span className="bg-[#dcf0d9] text-[#2f6e2b] text-xs font-bold px-2 py-0.5 rounded ml-2 border border-[#bce0b8]">Saved</span>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;