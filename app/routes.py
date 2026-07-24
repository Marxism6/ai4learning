"""API routes for the Socratic Numerical Analysis Tutor."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.prompts import get_system_prompt
from app.blocks import BLOCKS, get_block_context
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


@router.get("/blocks")
async def list_blocks():
    """List all knowledge blocks with metadata.

    Returns a dictionary of blocks keyed by slug.
    Each block contains slug, title, topic, description, prerequisites,
    and mastery_levels.
    """
    return BLOCKS


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