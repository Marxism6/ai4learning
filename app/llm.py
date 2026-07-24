"""LLM proxy client for OpenAI-compatible APIs.

Uses an LLMClient class with lazy API key validation and optional
per-request override of api_key / model / api_base via constructor args.
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

    Priority for config values (highest first):
    1. Constructor arg (passed by routes.py from request headers)
    2. Environment variable (LLM_API_KEY, LLM_MODEL, LLM_API_BASE)
    3. Default constant (DEFAULT_MODEL, DEFAULT_API_BASE)

    API key validated lazily — on first actual API call — so that
    tests can construct an LLMClient via Depends without credentials.
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        api_base: str | None = None,
    ):
        self._api_key: str | None = api_key
        self._headers: dict | None = None
        self.api_base = (
            api_base
            or os.environ.get("LLM_API_BASE")
            or DEFAULT_API_BASE
        ).rstrip("/")
        self.model = model or os.environ.get("LLM_MODEL") or DEFAULT_MODEL

    @property
    def api_key(self) -> str:
        """Resolve and validate the API key (lazy, uses override first)."""
        if self._api_key is None:
            key = os.environ.get("LLM_API_KEY") or os.environ.get("OPENAI_API_KEY")
            if not key:
                raise RuntimeError(
                    "LLM_API_KEY environment variable is not set. "
                    "Set it in Settings or via LLM_API_KEY env var."
                )
            self._api_key = key
        return self._api_key

    @property
    def headers(self) -> dict:
        """Build auth headers (lazy)."""
        if self._headers is None:
            self._headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        return self._headers

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

    async def list_models(self) -> list[str]:
        """Fetch available model IDs from the API provider.

        Tries the OpenAI-compatible /models endpoint first.
        Falls back to Ollama /api/tags format if /models returns 404.
        Returns a sorted list of model IDs, or raises RuntimeError.
        """
        models_url = f"{self.api_base}/models"
        auth_headers = {"Authorization": f"Bearer {self.api_key}"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(models_url, headers=auth_headers)
                resp.raise_for_status()
                data = resp.json()
                # OpenAI-compatible: {"data": [{"id": "gpt-4o"}, ...]}
                if "data" in data:
                    return sorted(m["id"] for m in data["data"])
                # Fallback: try /api/tags (Ollama)
                fallback_url = f"{self.api_base}/api/tags"
                fallback_resp = await client.get(fallback_url, timeout=10.0)
                fallback_resp.raise_for_status()
                fallback_data = fallback_resp.json()
                models = []
                for m in fallback_data.get("models", []):
                    name = m.get("name", "")
                    if name:
                        models.append(name)
                return sorted(models)
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    # Try Ollama /api/tags fallback
                    try:
                        fallback_url = f"{self.api_base}/api/tags"
                        fallback_resp = await client.get(fallback_url, timeout=10.0)
                        fallback_resp.raise_for_status()
                        fallback_data = fallback_resp.json()
                        models = []
                        for m in fallback_data.get("models", []):
                            name = m.get("name", "")
                            if name:
                                models.append(name)
                        return sorted(models)
                    except Exception:
                        raise RuntimeError(
                            "Could not fetch model list from either /models or /api/tags. "
                            "Check your API Base URL."
                        ) from e
                logger.error("Models API error: %s %s", e.response.status_code, e.response.text)
                raise RuntimeError(
                    f"Models API returned {e.response.status_code}: {e.response.text}"
                ) from e
            except httpx.TimeoutException:
                logger.error("Models API timeout")
                raise RuntimeError("Models API request timed out")