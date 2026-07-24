"""API tests for the Numerical Analysis Tutor."""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# === Health ===

@pytest.mark.anyio
async def test_health_endpoint(client):
    """GET /api/health returns 200 with status ok."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"


@pytest.mark.anyio
async def test_health_also_at_root(client):
    """GET /health also returns 200."""
    response = await client.get("/health")
    assert response.status_code == 200


# === Static Files ===

@pytest.mark.anyio
async def test_index_serves_html(client):
    """GET / returns HTML frontend."""
    response = await client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


@pytest.mark.anyio
async def test_static_css_served(client):
    """Static CSS is accessible."""
    response = await client.get("/static/css/style.css")
    assert response.status_code == 200
    assert "text/css" in response.headers["content-type"]


@pytest.mark.anyio
async def test_static_js_served(client):
    """Static JS is accessible."""
    response = await client.get("/static/js/chat.js")
    assert response.status_code == 200
    assert "javascript" in response.headers["content-type"]


# === Knowledge Blocks (Ticket 02) ===

@pytest.mark.anyio
async def test_blocks_endpoint(client):
    """GET /api/blocks returns a dict of knowledge blocks."""
    response = await client.get("/api/blocks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert len(data) >= 5, "Expected at least 5 initial blocks"


@pytest.mark.anyio
async def test_blocks_have_required_fields(client):
    """Each block has slug, title, topic, description, prerequisites, mastery_levels."""
    response = await client.get("/api/blocks")
    data = response.json()
    for slug, block in data.items():
        assert block["slug"] == slug
        assert "title" in block
        assert "topic" in block
        assert "description" in block
        assert "prerequisites" in block
        assert isinstance(block["prerequisites"], list)
        assert "mastery_levels" in block
        assert isinstance(block["mastery_levels"], list)
        assert len(block["mastery_levels"]) == 3


@pytest.mark.anyio
async def test_blocks_include_newton_method(client):
    """Newton's method block is present."""
    response = await client.get("/api/blocks")
    data = response.json()
    assert "newton-method" in data
    assert data["newton-method"]["title"] == "Newton's Method"
    assert data["newton-method"]["topic"] == "Nonlinear Equations"


@pytest.mark.anyio
async def test_blocks_include_gauss_elimination(client):
    """Gaussian elimination block is present."""
    response = await client.get("/api/blocks")
    data = response.json()
    assert "gauss-elimination" in data


# === Chat (Ticket 01) ===

@pytest.mark.anyio
async def test_chat_empty_message_rejected(client):
    """POST /api/chat with empty message returns 400."""
    response = await client.post(
        "/api/chat",
        json={"username": "test", "message": ""},
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_chat_request_shape(client):
    """POST /api/chat accepts valid request shape."""
    response = await client.post(
        "/api/chat",
        json={
            "username": "test",
            "message": "What is Newton's method?",
            "history": [],
        },
    )
    # Without LLM_API_KEY, this should fail with 502
    # The point is to verify the request is well-formed
    assert response.status_code in (200, 502)


@pytest.mark.anyio
async def test_chat_with_history(client):
    """POST /api/chat with history is accepted."""
    response = await client.post(
        "/api/chat",
        json={
            "username": "test",
            "message": "Can you explain more?",
            "history": [
                {"role": "user", "content": "What is interpolation?"},
                {"role": "assistant", "content": "Let me ask you: what does it mean to interpolate?"},
            ],
        },
    )
    assert response.status_code in (200, 502)


@pytest.mark.anyio
async def test_chat_with_block_slug(client):
    """POST /api/chat with block_slug is accepted (Ticket 02 integration)."""
    response = await client.post(
        "/api/chat",
        json={
            "username": "test",
            "message": "Tell me about Newton's method",
            "block_slug": "newton-method",
            "history": [],
        },
    )
    assert response.status_code in (200, 502)