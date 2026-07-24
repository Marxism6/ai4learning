"""API routes for the Socratic Numerical Analysis Tutor."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.prompts import SOCRATIC_SYSTEM_PROMPT, DEFAULT_BLOCK_PROMPT, BLOCK_PROMPTS
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


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the Socratic tutor and receive a response.

    Uses the LLM proxy to generate a Socratic-guided response.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Build system prompt: base Socratic prompt + block-specific context
    block_prompt = BLOCK_PROMPTS.get(request.block_slug or "", DEFAULT_BLOCK_PROMPT)
    system_prompt = f"{SOCRATIC_SYSTEM_PROMPT}\n\n## Context\n{block_prompt}"

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