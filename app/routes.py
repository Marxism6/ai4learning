"""API routes for the Socratic Numerical Analysis Tutor."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

from app.prompts import get_system_prompt
from app.blocks import BLOCKS, get_block_context
from app.progress import get_progress, update_block_progress
from app.llm import chat_completion

router = APIRouter()


class ChatRequest(BaseModel):
    username: str
    message: str
    block_slug: str | None = None
    history: list[dict[str, str]] = []


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