import json
import os
from pathlib import Path
from typing import List, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from groq import Groq
from pydantic import BaseModel

from app.profile_schema import CandidateProfile
from app.system_prompt import build_jd_match_prompt, build_system_prompt

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is not set. Copy .env.example to .env and add your key "
        "(get one free at https://console.groq.com/keys)."
    )

client = Groq(api_key=GROQ_API_KEY)

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "candidate_profile.json"
RESUME_PATH = Path(__file__).resolve().parent.parent / "data" / "resume.pdf"


def load_profile() -> CandidateProfile:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    # Validates the JSON against the schema — raises loudly on a malformed profile
    # instead of silently sending broken data to the LLM.
    return CandidateProfile(**raw)


app = FastAPI(title="AI Candidate Portfolio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]  # full conversation history, most recent last


class JDMatchRequest(BaseModel):
    job_description: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/profile")
def get_profile():
    """Expose the (public) profile data itself, e.g. for an 'About' panel in the UI."""
    return load_profile().model_dump(exclude_none=True)


@app.get("/api/resume")
def get_resume():
    """
    Serves the candidate's actual resume PDF for download.
    Place your file at backend/data/resume.pdf — this route just streams it back.
    """
    if not RESUME_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Resume not uploaded yet. Add a file at backend/data/resume.pdf.",
        )
    profile = load_profile()
    filename = f"{profile.name.replace(' ', '_')}_Resume.pdf"
    return FileResponse(RESUME_PATH, media_type="application/pdf", filename=filename)


def _stream_groq_response(system_prompt: str, messages: List[ChatMessage]):
    groq_messages = [{"role": "system", "content": system_prompt}] + [
        {"role": m.role, "content": m.content} for m in messages
    ]

    stream = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=groq_messages,
        temperature=0.3,
        stream=True,
    )

    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            # Server-Sent-Events style chunk; the frontend reads this as a stream.
            yield f"data: {json.dumps({'content': delta})}\n\n"

    yield "data: [DONE]\n\n"


@app.post("/api/chat")
def chat(req: ChatRequest):
    """
    Receives the full conversation (memory), loads the candidate profile fresh
    each request, and streams the LLM's response back as it's generated.
    """
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")

    profile = load_profile()
    system_prompt = build_system_prompt(profile)

    return StreamingResponse(
        _stream_groq_response(system_prompt, req.messages),
        media_type="text/event-stream",
    )


@app.post("/api/jd-match")
def jd_match(req: JDMatchRequest):
    """
    HR pastes a job description; the AI assesses fit against the candidate profile.
    Streams back for the same reason /api/chat does — long structured answers feel
    much more responsive streamed.
    """
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description cannot be empty")

    profile = load_profile()
    prompt = build_jd_match_prompt(profile, req.job_description)
    messages = [ChatMessage(role="user", content=prompt)]

    return StreamingResponse(
        _stream_groq_response(
            "You are a precise, honest technical recruiter assistant.", messages
        ),
        media_type="text/event-stream",
    )
