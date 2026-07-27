"""API routes for the Socratic Numerical Analysis Tutor."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import Literal

from app.prompts import get_system_prompt
from app.blocks import BLOCKS, get_block_context
from app.progress import get_progress, get_completed_count, update_block_progress
from app.memory import save_session, list_sessions, get_session, delete_session, clear_sessions, get_memory_context, search_sessions, search_and_summarize, get_cold_memory_context
from app.llm import LLMClient

router = APIRouter()


# === Settings ===

router = APIRouter()


def get_llm_client(request: Request) -> LLMClient:
    """FastAPI dependency: provides an LLMClient instance.

    Prioritises request headers (X-API-Key, X-Model, X-API-Base) over
    environment variables, allowing browser-set keys to override env vars.
    Empty headers are treated as absent (backend falls back to env/default).
    """
    return LLMClient(
        api_key=request.headers.get("x-api-key") or None,
        model=request.headers.get("x-model") or None,
        api_base=request.headers.get("x-api-base") or None,
    )


class ChatRequest(BaseModel):
    username: str
    message: str
    block_slug: str | None = None
    history: list[dict[str, str]] = []
    memory_summary: str | None = None
    memory_enabled: bool = False
    lang: Literal["zh", "en"] = "zh"


class ChatResponse(BaseModel):
    reply: str
    block_slug: str | None = None


class ProgressUpdateRequest(BaseModel):
    block_slug: str
    status: Literal["not-started", "in-progress", "mastered"] | None = None
    mastery_level: int | None = None


class SessionSaveRequest(BaseModel):
    session_id: str = ""
    block_slug: str | None = None
    block_title: str = ""
    message_count: int = 0
    preview: str = ""
    history: list[dict[str, str]] = []


# === Knowledge Blocks ===

@router.get("/blocks")
async def list_blocks():
    """List all knowledge blocks with metadata.

    Returns a dictionary of blocks keyed by slug.
    Each block contains slug, title, topic, description,
    and mastery_levels.
    Note: prerequisite info is not included — the LLM determines
    prerequisites dynamically at runtime per spec.
    """
    return BLOCKS


# === Models ===

@router.get("/models")
async def list_models(llm: LLMClient = Depends(get_llm_client)):
    """Fetch available models from the LLM API provider.

    Calls the OpenAI-compatible /models endpoint (with Ollama /api/tags fallback).
    Returns a sorted list of model IDs.
    Requires a valid API key (from env var, settings panel, or request header).
    """
    try:
        models = await llm.list_models()
        return {"models": models}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


# === Chat ===

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, llm: LLMClient = Depends(get_llm_client)):
    """Send a message to the Socratic tutor and receive a response.

    Uses the LLM proxy to generate a Socratic-guided response.
    If block_slug is provided, the system prompt incorporates block-specific
    context (topic, mastery goals, prerequisites) for focused tutoring.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Build system prompt: base Socratic prompt + block-specific context + language
    block_context = get_block_context(request.block_slug or "", lang=request.lang)
    system_prompt = get_system_prompt(block_context, lang=request.lang)

    # Add cross-session memory summary ONLY at conversation start (empty history)
    if request.memory_summary and not request.history:
        system_prompt += (
            "\n\n## Cross-Session Memory\n"
            "The student has previously mastered these blocks:\n"
            f"{request.memory_summary}\n\n"
            "They do NOT need prerequisite re-checking for these mastered blocks. "
            "If any of these blocks are prerequisites for the current topic, "
            "assume the student already understands them and proceed directly."
        )

    # Add new memory system context (memory.md + profile.md) at conversation start
    if request.memory_enabled and not request.history:
        # Hot memory: refined facts from memory.md + profile.md
        mem_ctx = get_memory_context(request.username)
        if mem_ctx:
            system_prompt += (
                "\n\n## Student Memory\n"
                f"{mem_ctx}\n\n"
                "The above is the AI's accumulated memory about this student. "
                "Use it to personalize your tutoring: adapt to their level, "
                "acknowledge their strengths and weaknesses, and respect their preferences."
            )
        # Cold memory: past conversation titles + previews (zero LLM latency)
        if request.block_slug:
            cold_ctx = get_cold_memory_context(request.username, request.block_slug)
            if cold_ctx:
                system_prompt += (
                    "\n\n" + cold_ctx + "\n\n"
                    "The above are the student's past conversations related to this topic. "
                    "Use them to reference prior discussions if relevant."
                )

    # Build conversation history
    messages = list(request.history)
    messages.append({"role": "user", "content": request.message})

    try:
        reply = await llm.chat(
            system_prompt=system_prompt,
            messages=messages,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    return ChatResponse(reply=reply, block_slug=request.block_slug)


# === Image Upload ===

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
}

VISION_PROMPT = """You are a Socratic tutor for Numerical Analysis. A student has uploaded an image of a problem from their textbook or homework.

Your task:
1. Recognize and transcribe the problem text, including any mathematical formulas (output them in LaTeX format).
2. Start Socratic guidance: ask a guiding question about the problem rather than solving it directly.
3. If the image contains multiple problems, focus on the most prominent one and mention that there are others.

Wrap display math in $$...$$ and inline math in $...$.
Do NOT give the answer directly — begin with a Socratic question."""

VISION_PROMPT_ZH = """你是一位数值分析的苏格拉底式辅导老师。学生上传了一张题目截图。

你的任务：
1. 识别并转录题目文字，数学公式用 LaTeX 格式输出。
2. 开始苏格拉底式引导：针对题目提出一个引导性问题，而不是直接解答。
3. 如果图片包含多道题目，聚焦最突出的一道，并提及还有其他题目。

术语格式：中文（English）。公式用 $$...$$ 和 $...$ 包裹。
不要直接给出答案——以苏格拉底式提问开始。"""


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    username: str = Form(...),
    block_slug: str | None = Form(None),
    lang: Literal["zh", "en"] = Form("zh"),
    llm: LLMClient = Depends(get_llm_client),
):
    """Upload an image for problem recognition.

    The image is sent to a vision-capable LLM for recognition.
    The image is NOT stored on disk after processing.

    Supported formats: PNG, JPG, WEBP. Max size: 10MB.
    lang: "zh" or "en" — selects the appropriate vision prompt.
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {file.content_type}. "
                   f"Supported formats: PNG, JPG, WEBP.",
        )

    # Check Content-Length before reading (if available)
    if file.size is not None and file.size > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({file.size / 1024 / 1024:.1f} MB). "
                   f"Maximum size: 10 MB.",
        )

    # Read in 1MB chunks, reject early if exceeds limit (handles chunked transfers)
    chunks: list[bytes] = []
    total_size = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size: 10 MB.",
            )
        chunks.append(chunk)
    image_data = b"".join(chunks)

    # Select prompt based on language
    vision_prompt = VISION_PROMPT_ZH if lang == "zh" else VISION_PROMPT

    # Send to vision LLM
    try:
        recognized = await llm.vision(
            system_prompt=vision_prompt,
            image_data=image_data,
            image_mime=file.content_type,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Image data is discarded after processing — never stored on disk
    return {
        "recognized_text": recognized,
        "username": username,
        "block_slug": block_slug,
    }


# === User Progress ===

@router.get("/progress/{username}")
async def read_progress(username: str):
    """Get a user's block progress.

    Returns a dict with username, blocks (per-block status + mastery level),
    completed_count, and total_blocks.
    """
    data = get_progress(username)
    return {
        "username": data["username"],
        "blocks": data["blocks"],
        "completed_count": get_completed_count(username),
        "total_blocks": len(BLOCKS),
    }


@router.post("/progress/{username}")
async def write_progress(username: str, update: ProgressUpdateRequest):
    """Update a user's progress for a specific block.

    Body: { "block_slug": "...", "status": "...", "mastery_level": N }
    Both status and mastery_level are optional — only provided fields are updated.
    """
    if update.block_slug not in BLOCKS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown block slug: {update.block_slug}",
        )

    try:
        data = update_block_progress(
            username=username,
            block_slug=update.block_slug,
            status=update.status,
            mastery_level=update.mastery_level,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "username": data["username"],
        "blocks": data["blocks"],
        "completed_count": get_completed_count(username),
        "total_blocks": len(BLOCKS),
    }


# === Session Persistence ===

@router.post("/sessions/{username}")
async def save_user_session(username: str, session: SessionSaveRequest):
    """Save a conversation session to the server (idempotent UPSERT via INSERT OR REPLACE)."""
    session_id = session.session_id or str(uuid.uuid4())[:8]
    preview = session.preview
    if not preview:
        for m in session.history:
            if m.get("role") == "assistant":
                preview = (m.get("content", "") or "")[:60]
                break
    save_session(
        username=username,
        session_id=session_id,
        block_slug=session.block_slug,
        block_title=session.block_title,
        message_count=session.message_count,
        preview=preview,
        history=session.history,
    )
    return {"id": session_id, "status": "saved"}


@router.get("/sessions/{username}")
async def list_user_sessions(username: str):
    """List all saved sessions for a user."""
    sessions = list_sessions(username)
    return {"sessions": sessions}


# === Session Search (must come before /{session_id} to avoid route conflict) ===

@router.get("/sessions/{username}/search")
async def search_user_sessions(username: str, q: str = ""):
    """Full-text search sessions by query string. Multi-word queries use OR recall."""
    if not q.strip():
        return {"sessions": []}
    results = search_sessions(username, q.strip())
    return {"sessions": results}


class SearchSummarizeRequest(BaseModel):
    query: str
    mem_model: str
    mem_key: str
    mem_base: str


@router.post("/sessions/{username}/search-summarize")
async def summarize_search(username: str, req: SearchSummarizeRequest):
    """Search cold memory and summarize matching sessions via cheap LLM."""
    if not req.query.strip():
        return {"summary": ""}
    summary = await search_and_summarize(
        username=username,
        query=req.query.strip(),
        mem_model=req.mem_model,
        mem_key=req.mem_key,
        mem_base=req.mem_base,
    )
    return {"summary": summary}


# === Session detail routes ===

@router.get("/sessions/{username}/{session_id}")
async def get_user_session(username: str, session_id: str):
    """Get a single session's full data."""
    session = get_session(username, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{username}/{session_id}")
async def delete_user_session(username: str, session_id: str):
    """Delete a session."""
    ok = delete_session(username, session_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "deleted"}


@router.delete("/sessions/{username}")
async def clear_user_sessions(username: str):
    """Delete all sessions for a user."""
    clear_sessions(username)
    return {"status": "cleared"}


# === Memory Review ===

class MemoryReviewRequest(BaseModel):
    mem_model: str
    mem_key: str
    mem_base: str
    recent_history: list[dict[str, str]]


@router.post("/memory/review/{username}")
async def memory_review(username: str, req: MemoryReviewRequest):
    """Trigger an asynchronous memory review for a conversation.

    Uses a separate (cheaper) model config to extract memory insights.
    Fire-and-forget: returns immediately after dispatching.
    """
    from app.memory import run_memory_review

    # Run synchronously in the request handler — it's fast (~1-2s LLM call)
    # and simpler than background tasks for this use case.
    await run_memory_review(
        username=username,
        mem_model=req.mem_model,
        mem_key=req.mem_key,
        mem_base=req.mem_base,
        recent_history=req.recent_history,
    )
    return {"status": "ok"}