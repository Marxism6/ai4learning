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


