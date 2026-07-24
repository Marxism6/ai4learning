"""LLM proxy client for OpenAI-compatible APIs.

Uses an LLMClient class constructed once per request to avoid
repeated config reads and header construction.
"""

import os
import base64
import logging

import httpx

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gpt-4o"
DEFAULT_API_BASE = "https://api.openai.com/v1"


class LLMClient:
    """Client for OpenAI-compatible LLM APIs.

    Reads configuration from environment variables once at construction.
    """

    def __init__(self):
        self.api_key = os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "LLM_API_KEY environment variable is not set. "
                "Set it to your OpenAI-compatible API key."
            )
        self.api_base = (os.environ.get("LLM_API_BASE", DEFAULT_API_BASE).rstrip("/"))
        self.model = os.environ.get("LLM_MODEL", DEFAULT_MODEL)
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    @property
    def _url(self) -> str:
        return f"{self.api_base}/chat/completions"

    async def _request(self, body: dict, timeout: float = 60.0) -> dict:
        """Single try/except block for all LLM API calls."""
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                response = await client.post(self._url, headers=self.headers, json=body)
                response.raise_for_status()
                return response.json()
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

    async def chat(
        self,
        system_prompt: str,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """Send a chat completion request and return the response text."""
        request_messages = [{"role": "system", "content": system_prompt}]
        request_messages.extend(messages)

        body = {
            "model": self.model,
            "messages": request_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.info(
            "LLM request: model=%s, messages=%d, temp=%s",
            self.model, len(request_messages), temperature,
        )

        data = await self._request(body)
        result = data["choices"][0]["message"]["content"]
        logger.info("LLM response received (length=%d)", len(result))
        return result

    async def vision(
        self,
        system_prompt: str,
        image_data: bytes,
        image_mime: str,
        detail: str = "auto",
        temperature: float = 0.5,
        max_tokens: int = 1024,
    ) -> str:
        """Send an image to a vision-capable LLM and return extracted text."""
        b64_image = base64.b64encode(image_data).decode("utf-8")
        data_url = f"data:{image_mime};base64,{b64_image}"

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Please analyze the problem in this image and begin Socratic guidance.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url, "detail": detail},
                    },
                ],
            },
        ]

        body = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.info(
            "Vision LLM request: model=%s, image=%s (%d bytes), detail=%s",
            self.model, image_mime, len(image_data), detail,
        )

        data = await self._request(body, timeout=120.0)
        result = data["choices"][0]["message"]["content"]
        logger.info("Vision LLM response received (length=%d)", len(result))
        return result