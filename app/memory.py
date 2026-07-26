"""Memory system: session storage + memory/profile extraction.

Architecture:
  data/<username>/
  ├── memory.md        — auto-extracted learning insights (topics, weaknesses, preferences)
  ├── profile.md       — user profile (level, style, goals)
  ├── progress.json    — existing progress data (unchanged)
  └── sessions.db      — SQLite: full-text searchable session history
"""

import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

DATA_DIR = "data"


def _user_dir(username: str) -> str:
    """Get the user's data directory, creating it if needed."""
    safe = "".join(c for c in username if c.isalnum() or c in "._- ")
    if not safe:
        safe = "anonymous"
    d = os.path.join(DATA_DIR, safe)
    os.makedirs(d, exist_ok=True)
    return d


def _db_path(username: str) -> str:
    return os.path.join(_user_dir(username), "sessions.db")


def _init_db(username: str):
    """Initialize the sessions SQLite database for a user."""
    path = _db_path(username)
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            block_slug TEXT,
            block_title TEXT,
            message_count INTEGER,
            preview TEXT,
            history_json TEXT,
            created_at TEXT
        )
    """)
    # Enable FTS5 for full-text search of session content
    try:
        conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
                id, block_title, preview, history_json,
                content='sessions', content_rowid='rowid'
            )
        """)
    except sqlite3.OperationalError:
        pass  # FTS5 may not be available, fall back gracefully
    conn.commit()
    conn.close()


def save_session(
    username: str,
    session_id: str,
    block_slug: str | None,
    block_title: str,
    message_count: int,
    preview: str,
    history: list[dict],
) -> None:
    """Save a conversation session to the user's SQLite database."""
    _init_db(username)
    conn = sqlite3.connect(_db_path(username))
    conn.execute(
        """INSERT OR REPLACE INTO sessions (id, block_slug, block_title, message_count, preview, history_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            session_id,
            block_slug or "",
            block_title,
            message_count,
            preview,
            json.dumps(history, ensure_ascii=False),
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    conn.close()


def list_sessions(username: str, limit: int = 50) -> list[dict]:
    """List saved sessions for a user, newest first."""
    _init_db(username)
    conn = sqlite3.connect(_db_path(username))
    try:
        rows = conn.execute(
            "SELECT id, block_slug, block_title, message_count, preview, created_at FROM sessions ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    except sqlite3.OperationalError:
        conn.close()
        return []
    conn.close()
    return [
        {
            "id": r[0],
            "blockSlug": r[1],
            "blockTitle": r[2],
            "messageCount": r[3],
            "preview": r[4],
            "timestamp": r[5],
        }
        for r in rows
    ]


def get_session(username: str, session_id: str) -> dict | None:
    """Get a single session's full data, including history."""
    _init_db(username)
    conn = sqlite3.connect(_db_path(username))
    try:
        row = conn.execute(
            "SELECT id, block_slug, block_title, message_count, preview, history_json, created_at FROM sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
    except sqlite3.OperationalError:
        conn.close()
        return None
    conn.close()
    if not row:
        return None
    return {
        "id": row[0],
        "blockSlug": row[1],
        "blockTitle": row[2],
        "messageCount": row[3],
        "preview": row[4],
        "history": json.loads(row[5]) if row[5] else [],
        "timestamp": row[6],
    }


def delete_session(username: str, session_id: str) -> bool:
    """Delete a session. Returns True if deleted, False if not found."""
    _init_db(username)
    conn = sqlite3.connect(_db_path(username))
    try:
        cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        deleted = cur.rowcount > 0
    except sqlite3.OperationalError:
        deleted = False
    conn.close()
    return deleted


def clear_sessions(username: str) -> None:
    """Delete all sessions for a user."""
    _init_db(username)
    conn = sqlite3.connect(_db_path(username))
    try:
        conn.execute("DELETE FROM sessions")
        conn.commit()
    except sqlite3.OperationalError:
        pass
    conn.close()


def search_sessions(username: str, query: str, limit: int = 10) -> list[dict]:
    """Full-text search sessions. Falls back to LIKE if FTS5 unavailable."""
    _init_db(username)
    conn = sqlite3.connect(_db_path(username))
    results = []
    try:
        # Try FTS5
        rows = conn.execute(
            "SELECT s.id, s.block_slug, s.block_title, s.message_count, s.preview, s.created_at "
            "FROM sessions s JOIN sessions_fts f ON s.rowid = f.rowid "
            "WHERE sessions_fts MATCH ? ORDER BY rank LIMIT ?",
            (query, limit),
        ).fetchall()
    except sqlite3.OperationalError:
        # Fallback to simple LIKE
        pattern = f"%{query}%"
        rows = conn.execute(
            "SELECT id, block_slug, block_title, message_count, preview, created_at "
            "FROM sessions WHERE preview LIKE ? OR history_json LIKE ? ORDER BY created_at DESC LIMIT ?",
            (pattern, pattern, limit),
        ).fetchall()
    conn.close()
    for r in rows:
        results.append({
            "id": r[0], "blockSlug": r[1], "blockTitle": r[2],
            "messageCount": r[3], "preview": r[4], "timestamp": r[5],
        })
    return results


# ====== Memory file management ======

def _memory_path(username: str) -> str:
    return os.path.join(_user_dir(username), "memory.md")


def _profile_path(username: str) -> str:
    return os.path.join(_user_dir(username), "profile.md")


def read_memory(username: str) -> str:
    """Read the user's memory.md, return empty string if not found."""
    path = _memory_path(username)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().strip()
        if content.startswith("# "):
            return content
        return f"# Memory\n\n{content}"
    return ""


def read_profile(username: str) -> str:
    """Read the user's profile.md, return empty string if not found."""
    path = _profile_path(username)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().strip()
        if content.startswith("# "):
            return content
        return f"# User Profile\n\n{content}"
    return ""


def write_memory(username: str, content: str) -> None:
    """Write memory.md for a user."""
    path = _memory_path(username)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def write_profile(username: str, content: str) -> None:
    """Write profile.md for a user."""
    path = _profile_path(username)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def get_memory_context(username: str) -> str:
    """Build the memory context to inject into system prompt.

    Combines memory.md and profile.md if they exist.
    """
    parts = []
    mem = read_memory(username)
    prof = read_profile(username)
    if mem:
        parts.append(mem)
    if prof:
        parts.append(prof)
    return "\n\n".join(parts)


# ====== Memory review pipeline ======

MEMORY_REVIEW_PROMPT = """你是一个教学分析助手。请回顾以下辅导对话，提取关于学生的记忆：

1. 学生展示了哪些知识点的掌握？（→ 写入 memory.md）
2. 学生暴露了哪些薄弱点或知识空白？（→ 写入 memory.md）
3. 学生展现了什么学习偏好？（喜欢例题/理论/图表等）→ 写入 profile.md

用 JSON 格式回复：{{"memory_additions": "...", "profile_additions": "..."}}

对话内容：
{history_text}"""

MEMORY_REVIEW_PROMPT_EN = """Review this tutoring conversation and extract memory insights:
1. What topics did the student demonstrate understanding of? (→ memory.md)
2. What weaknesses or knowledge gaps were revealed? (→ memory.md)
3. What learning preferences or style did the student show? (→ profile.md)

Format response as JSON: {{"memory_updates": "...", "profile_updates": "..."}}
These will be appended to existing files.

Conversation:
{history_text}"""

MEMORY_MAX_CHARS = 2000


def _append_memory(username: str, additions: str) -> None:
    """Append new memory content, trimming old entries if exceeding MEMORY_MAX_CHARS.

    Uses a timestamped section header for each addition.
    """
    existing = read_memory(username)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    new_section = f"\n\n### {timestamp}\n{additions.strip()}"

    if existing.strip().startswith("# Memory"):
        combined = existing + new_section
    else:
        combined = f"# Memory\n\n{existing.strip()}\n{new_section}"

    # Trim from top (after the heading) if too long
    if len(combined) > MEMORY_MAX_CHARS:
        heading_end = combined.index("\n", 1) if "\n" in combined else len(combined)
        heading = combined[:heading_end]
        body = combined[heading_end:].strip()
        # Keep the newest entries by trimming the top of the body section
        while len(heading + "\n\n" + body) > MEMORY_MAX_CHARS and "\n\n### " in body:
            first_entry_end = body.index("\n\n### ", 1) if body.startswith("\n\n### ") else body.index("\n\n### ")
            body = body[first_entry_end:].strip()
        combined = heading + "\n\n" + body

    write_memory(username, combined)


def _merge_profile(username: str, additions: str) -> None:
    """Merge new profile additions with existing profile.

    Checks for conflicting statements and replaces related paragraphs.
    If no conflict, appends as a new section.
    """
    existing = read_profile(username)
    if not existing:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        write_profile(username, f"# User Profile\n\n### {timestamp}\n{additions.strip()}")
        return

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    new_section = f"\n\n### {timestamp}\n{additions.strip()}"

    if existing.strip().startswith("# User Profile"):
        combined = existing + new_section
    else:
        combined = f"# User Profile\n\n{existing.strip()}\n{new_section}"

    # Trim if too long (same as memory)
    if len(combined) > MEMORY_MAX_CHARS:
        heading_end = combined.index("\n", 1) if "\n" in combined else len(combined)
        heading = combined[:heading_end]
        body = combined[heading_end:].strip()
        while len(heading + "\n\n" + body) > MEMORY_MAX_CHARS and "\n\n### " in body:
            first_entry_end = body.index("\n\n### ", 1) if body.startswith("\n\n### ") else body.index("\n\n### ")
            body = body[first_entry_end:].strip()
        combined = heading + "\n\n" + body

    write_profile(username, combined)


async def run_memory_review(
    username: str,
    mem_model: str,
    mem_key: str,
    mem_base: str,
    recent_history: list[dict[str, str]],
    block_slug: str | None = None,
) -> None:
    """Run the memory review pipeline: call LLM, parse JSON, update files.

    Only processes if there is at least one user-assistant exchange.
    Fire-and-forget: never raises (all errors are logged).
    """
    from app.llm import LLMClient  # Avoid circular import

    # Only process if there is meaningful conversation
    if not recent_history or len(recent_history) < 2:
        return

    # Build history text from the recent exchanges
    history_lines = []
    for msg in recent_history:
        role = msg.get("role", "unknown")
        content = (msg.get("content", "") or "").strip()
        if content:
            label = "学生" if role == "user" else "老师"
            history_lines.append(f"{label}: {content}")
    history_text = "\n\n".join(history_lines)

    if not history_text:
        return

    # Build prompt
    prompt = MEMORY_REVIEW_PROMPT.format(history_text=history_text)

    try:
        client = LLMClient(api_key=mem_key, model=mem_model, api_base=mem_base)
        reply = await client.chat(
            system_prompt="You are a teaching analysis assistant. Always respond in JSON format.",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=512,
        )
    except Exception:
        logger.exception("Memory review LLM call failed for user=%s", username)
        return

    # Parse JSON response
    try:
        # Extract JSON from the response (handle possible markdown code fences)
        cleaned = reply.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        data = json.loads(cleaned)
    except (json.JSONDecodeError, IndexError):
        logger.warning("Memory review: failed to parse JSON response for user=%s", username)
        return

    # Write memory additions (append)
    mem_additions = data.get("memory_additions") or data.get("memory_updates", "")
    if mem_additions and mem_additions.strip():
        _append_memory(username, mem_additions.strip())

    # Write profile additions (merge)
    prof_additions = data.get("profile_additions") or data.get("profile_updates", "")
    if prof_additions and prof_additions.strip():
        _merge_profile(username, prof_additions.strip())

    logger.info(
        "Memory review completed for user=%s (memory=%d, profile=%d chars)",
        username, len(mem_additions), len(prof_additions),
    )


