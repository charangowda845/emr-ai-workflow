import asyncio

async def generate_soap_note(transcript: str) -> dict:
    # Simulate the time it takes for an AI to think
    await asyncio.sleep(2)
    
    # Return a mocked SOAP note structure
    return {
        "subjective": "Patient reports experiencing symptoms for the past few days. Pain is described as moderate.",
        "objective": "Vitals are stable. Mild tenderness noted on examination.",
        "assessment": "Likely viral infection or minor strain based on reported symptoms.",
        "plan": "Recommend rest, over-the-counter pain relief as needed, and follow-up in one week if symptoms do not improve."
    }