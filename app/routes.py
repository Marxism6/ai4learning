"""API routes for the Socratic Numerical Analysis Tutor."""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from pydantic import BaseModel
from typing import Literal

from app.prompts import get_system_prompt
from app.blocks import BLOCKS, get_block_context
from app.progress import get_progress, get_completed_count, update_block_progress
from app.llm import LLMClient

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
    lang: Literal["zh", "en"] = "zh"


class ChatResponse(BaseModel):
    reply: str
    block_slug: str | None = None


class ProgressUpdateRequest(BaseModel):
    block_slug: str
    status: Literal["not-started", "in-progress", "mastered"] | None = None
    mastery_level: int | None = None


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