"""API tests for the Numerical Analysis Tutor."""

import os
import shutil

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.progress import DATA_DIR


@pytest.fixture(autouse=True)
def clean_data():
    """Clean data files before and after each test."""
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
    os.makedirs(DATA_DIR, exist_ok=True)
    yield
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)


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
    response = await client.get("/static/js/nat.js")
    assert response.status_code == 200
    assert "javascript" in response.headers["content-type"]


# === Knowledge Blocks + i18n (H2, H5) ===

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
    """Each block has required fields including _zh bilingual fields."""
    response = await client.get("/api/blocks")
    data = response.json()
    for slug, block in data.items():
        assert block["slug"] == slug
        assert "title" in block
        assert "title_zh" in block, f"{slug} missing title_zh"
        assert "topic" in block
        assert "topic_zh" in block, f"{slug} missing topic_zh"
        assert "description" in block
        assert "description_zh" in block, f"{slug} missing description_zh"
        assert "mastery_levels" in block
        assert isinstance(block["mastery_levels"], list)
        assert len(block["mastery_levels"]) == 3
        assert "mastery_levels_zh" in block
        assert len(block["mastery_levels_zh"]) == 3
        # Per spec: no hardcoded prerequisites
        assert "prerequisites" not in block


@pytest.mark.anyio
async def test_blocks_include_newton_method(client):
    """Newton's method block is present with zh fields."""
    response = await client.get("/api/blocks")
    data = response.json()
    assert "newton-method" in data
    assert data["newton-method"]["title"] == "Newton's Method"
    assert data["newton-method"]["title_zh"] == "牛顿法（Newton's Method）"


@pytest.mark.anyio
async def test_blocks_include_gauss_elimination(client):
    """Gaussian elimination block is present."""
    response = await client.get("/api/blocks")
    data = response.json()
    assert "gauss-elimination" in data


# === Models (H7) ===

@pytest.mark.anyio
async def test_models_endpoint_without_key(client):
    """GET /api/models without API key returns 502."""
    response = await client.get("/api/models")
    assert response.status_code == 502


@pytest.mark.anyio
async def test_models_endpoint_with_invalid_key_header(client):
    """GET /api/models with invalid API key header returns 502."""
    response = await client.get(
        "/api/models",
        headers={"X-API-Key": "sk-invalid"},
    )
    assert response.status_code == 502


# === Chat (Ticket 01) + i18n (H3) ===

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
    """POST /api/chat with block_slug is accepted."""
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


@pytest.mark.anyio
async def test_chat_with_lang_zh(client):
    """POST /api/chat with lang='zh' is accepted."""
    response = await client.post(
        "/api/chat",
        json={
            "username": "test",
            "message": "什么是牛顿法？",
            "lang": "zh",
            "history": [],
        },
    )
    # Without LLM key → 502; the point is the request deserializes correctly
    assert response.status_code in (200, 502)


@pytest.mark.anyio
async def test_chat_with_lang_en(client):
    """POST /api/chat with lang='en' is accepted."""
    response = await client.post(
        "/api/chat",
        json={
            "username": "test",
            "message": "What is Newton's method?",
            "lang": "en",
            "history": [],
        },
    )
    assert response.status_code in (200, 502)


# === Progress (Ticket 04) ===

@pytest.mark.anyio
async def test_progress_get_new_user(client):
    """GET /api/progress/{username} returns progress for a new user."""
    response = await client.get("/api/progress/testuser")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["completed_count"] >= 0
    assert data["total_blocks"] >= 5
    assert "blocks" in data


@pytest.mark.anyio
async def test_progress_update_status(client):
    """POST /api/progress/{username} updates block status."""
    response = await client.post(
        "/api/progress/testuser",
        json={"block_slug": "newton-method", "status": "in-progress"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["blocks"]["newton-method"]["status"] == "in-progress"


@pytest.mark.anyio
async def test_progress_update_mastery(client):
    """POST /api/progress/{username} with mastery_level=3 auto-sets mastered."""
    response = await client.post(
        "/api/progress/testuser",
        json={"block_slug": "interpolation", "mastery_level": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["blocks"]["interpolation"]["status"] == "mastered"


@pytest.mark.anyio
async def test_progress_unknown_block(client):
    """POST with unknown block slug returns 400."""
    response = await client.post(
        "/api/progress/testuser",
        json={"block_slug": "nonexistent", "status": "mastered"},
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_progress_username_isolation(client):
    """Two users have independent progress."""
    await client.post(
        "/api/progress/alice",
        json={"block_slug": "newton-method", "status": "mastered"},
    )
    resp_bob = await client.get("/api/progress/bob")
    bob_data = resp_bob.json()
    assert bob_data["blocks"]["newton-method"]["status"] == "not-started"
    resp_alice = await client.get("/api/progress/alice")
    alice_data = resp_alice.json()
    assert alice_data["blocks"]["newton-method"]["status"] == "mastered"


# === Upload (Ticket 06) + i18n (H4) ===

@pytest.mark.anyio
async def test_upload_no_file(client):
    """POST /api/upload without file returns 422."""
    response = await client.post("/api/upload", data={"username": "test"})
    assert response.status_code == 422


@pytest.mark.anyio
async def test_upload_unsupported_format(client):
    """POST /api/upload with unsupported format returns 400."""
    response = await client.post(
        "/api/upload",
        files={"file": ("test.txt", b"not an image", "text/plain")},
        data={"username": "test"},
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_upload_file_too_large(client):
    """POST /api/upload with too-large file returns 400."""
    big_data = b"x" * (10 * 1024 * 1024 + 1)
    response = await client.post(
        "/api/upload",
        files={"file": ("test.png", big_data, "image/png")},
        data={"username": "test"},
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_upload_valid_request(client):
    """POST /api/upload with valid image (no LLM key → 502)."""
    response = await client.post(
        "/api/upload",
        files={"file": ("test.png", b"fake-png-data", "image/png")},
        data={"username": "test", "block_slug": "newton-method"},
    )
    assert response.status_code in (200, 502)


@pytest.mark.anyio
async def test_upload_with_lang_zh(client):
    """POST /api/upload with lang='zh' is accepted."""
    response = await client.post(
        "/api/upload",
        files={"file": ("test.png", b"fake-png-data", "image/png")},
        data={"username": "test", "lang": "zh"},
    )
    assert response.status_code in (200, 502)