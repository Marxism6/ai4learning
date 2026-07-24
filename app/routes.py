"""API routes for the Socratic Numerical Analysis Tutor."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Literal

from app.prompts import get_system_prompt
from app.blocks import BLOCKS, get_block_context
from app.progress import get_progress, update_block_progress
from app.llm import chat_completion, vision_chat_completion

router = APIRouter()


class ChatRequest(BaseModel):
    username: str
    message: str
    block_slug: str | None = None
    history: list[dict[str, str]] = []
    memory_summary: str | None = None


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
    Each block contains slug, title, topic, description, prerequisites,
    and mastery_levels.
    """
    return BLOCKS


# === Chat ===

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the Socratic tutor and receive a response.

    Uses the LLM proxy to generate a Socratic-guided response.
    If block_slug is provided, the system prompt incorporates block-specific
    context (topic, mastery goals, prerequisites) for focused tutoring.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Build system prompt: base Socratic prompt + block-specific context
    block_context = get_block_context(request.block_slug or "")
    system_prompt = get_system_prompt(block_context)

    # Add cross-session memory summary if provided
    if request.memory_summary:
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
        reply = await chat_completion(
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


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    username: str = Form(...),
    block_slug: str | None = Form(None),
):
    """Upload an image for problem recognition.

    The image is sent to a vision-capable LLM for recognition.
    The image is NOT stored on disk after processing.

    Supported formats: PNG, JPG, WEBP. Max size: 10MB.
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {file.content_type}. "
                   f"Supported formats: PNG, JPG, WEBP.",
        )

    # Read file
    image_data = await file.read()

    # Validate size
    if len(image_data) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(image_data) / 1024 / 1024:.1f} MB). "
                   f"Maximum size: 10 MB.",
        )

    # Send to vision LLM
    try:
        recognized = await vision_chat_completion(
            system_prompt=VISION_PROMPT,
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
    completed_count = sum(
        1 for b in data["blocks"].values()
        if b["status"] == "mastered"
    )
    return {
        "username": data["username"],
        "blocks": data["blocks"],
        "completed_count": completed_count,
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

    completed_count = sum(
        1 for b in data["blocks"].values()
        if b["status"] == "mastered"
    )
    return {
        "username": data["username"],
        "blocks": data["blocks"],
        "completed_count": completed_count,
        "total_blocks": len(BLOCKS),
    }