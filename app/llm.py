"""LLM proxy client for OpenAI-compatible APIs."""

import os
import logging
from typing import AsyncGenerator

import httpx

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gpt-4o"
DEFAULT_API_BASE = "https://api.openai.com/v1"


def _get_config():
    """Read LLM configuration from environment variables."""
    api_key = os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "LLM_API_KEY environment variable is not set. "
            "Set it to your OpenAI-compatible API key."
        )
    return {
        "api_key": api_key,
        "api_base": os.environ.get("LLM_API_BASE", DEFAULT_API_BASE).rstrip("/"),
        "model": os.environ.get("LLM_MODEL", DEFAULT_MODEL),
    }


async def chat_completion(
    system_prompt: str,
    messages: list[dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Send a chat completion request to the LLM API and return the response text.

    Args:
        system_prompt: The system prompt instructing the LLM.
        messages: List of {"role": "user"|"assistant", "content": "..."} messages.
        temperature: Sampling temperature.
        max_tokens: Maximum tokens in the response.

    Returns:
        The assistant's response text.

    Raises:
        RuntimeError: If the API call fails.
    """
    config = _get_config()
    url = f"{config['api_base']}/chat/completions"

    # Build the full message list with system prompt
    request_messages = [{"role": "system", "content": system_prompt}]
    request_messages.extend(messages)

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
    }

    body = {
        "model": config["model"],
        "messages": request_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    logger.info(
        "LLM request: model=%s, messages=%d, temp=%s",
        config["model"],
        len(request_messages),
        temperature,
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            result = data["choices"][0]["message"]["content"]
            logger.info("LLM response received (length=%d)", len(result))
            return result
        except httpx.HTTPStatusError as e:
            logger.error("LLM API error: %s %s", e.response.status_code, e.response.text)
            raise RuntimeError(
                f"LLM API returned {e.response.status_code}: {e.response.text}"
            ) from e
        except httpx.TimeoutException as e:
            logger.error("LLM API timeout")
            raise RuntimeError("LLM API request timed out") from e
        except (KeyError, IndexError) as e:
            logger.error("LLM API unexpected response: %s", e)
            raise RuntimeError("LLM API returned an unexpected response format") from e


async def chat_completion_stream(
    system_prompt: str,
    messages: list[dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> AsyncGenerator[str, None]:
    """Stream a chat completion from the LLM API.

    Yields content chunks as they arrive.
    """
    config = _get_config()
    url = f"{config['api_base']}/chat/completions"

    request_messages = [{"role": "system", "content": system_prompt}]
    request_messages.extend(messages)

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
    }

    body = {
        "model": config["model"],
        "messages": request_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream("POST", url, headers=headers, json=body) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        import json
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except httpx.HTTPStatusError as e:
            logger.error("LLM stream error: %s %s", e.response.status_code, e.response.text)
            raise RuntimeError(
                f"LLM API returned {e.response.status_code}: {e.response.text}"
            ) from e
        except httpx.TimeoutException as e:
            logger.error("LLM stream timeout")
            raise RuntimeError("LLM API request timed out") from e