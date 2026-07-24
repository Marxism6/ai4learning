"""User progress persistence — JSON file per user in data/ directory.

Each user's progress is stored in data/<username>.json with the following shape:

{
  "username": "...",
  "blocks": {
    "<slug>": {
      "status": "not-started" | "in-progress" | "mastered",
      "mastery_level": 0 | 1 | 2 | 3,
      "updated_at": "ISO timestamp"
    }
  }
}
"""

import json
import os
from datetime import datetime, timezone
from typing import Literal

from app.blocks import BLOCKS

DATA_DIR = "data"

BlockStatus = Literal["not-started", "in-progress", "mastered"]

DEFAULT_BLOCK_STATE = {
    "status": "not-started",
    "mastery_level": 0,
    "updated_at": None,
}


def _user_path(username: str) -> str:
    """Get the filesystem path for a user's progress file."""
    # Sanitize username: only allow safe characters
    safe = "".join(c for c in username if c.isalnum() or c in "._- ")
    if not safe:
        safe = "anonymous"
    return os.path.join(DATA_DIR, f"{safe}.json")


def _ensure_data_dir():
    """Create the data directory if it doesn't exist."""
    os.makedirs(DATA_DIR, exist_ok=True)


def get_progress(username: str) -> dict:
    """Get a user's progress data.

    Returns the full progress dict. Creates a default progress entry
    for any blocks not yet recorded.
    """
    _ensure_data_dir()
    path = _user_path(username)

    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {
            "username": username,
            "blocks": {},
        }

    # Ensure all known blocks are present
    for slug in BLOCKS:
        if slug not in data["blocks"]:
            data["blocks"][slug] = dict(DEFAULT_BLOCK_STATE)

    return data


def update_block_progress(
    username: str,
    block_slug: str,
    status: BlockStatus | None = None,
    mastery_level: int | None = None,
) -> dict:
    """Update a user's progress for a specific block.

    Args:
        username: The username.
        block_slug: The block slug.
        status: New status, or None to keep current.
        mastery_level: New mastery level (0-3), or None to keep current.

    Returns:
        The updated progress dict.

    Raises:
        ValueError: If block_slug is unknown or mastery_level is invalid.
    """
    if block_slug not in BLOCKS:
        raise ValueError(f"Unknown block slug: {block_slug}")

    if mastery_level is not None and mastery_level not in (0, 1, 2, 3):
        raise ValueError(f"Invalid mastery level: {mastery_level}")

    data = get_progress(username)
    block = data["blocks"][block_slug]

    if status is not None:
        block["status"] = status
    if mastery_level is not None:
        block["mastery_level"] = mastery_level

    block["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Auto-set status based on mastery_level
    if mastery_level and mastery_level >= 3:
        block["status"] = "mastered"
    elif mastery_level and mastery_level >= 1:
        if block["status"] == "not-started":
            block["status"] = "in-progress"

    _ensure_data_dir()
    path = _user_path(username)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return data


def get_completed_count(username: str) -> int:
    """Get the number of mastered blocks for a user."""
    data = get_progress(username)
    return sum(
        1 for b in data["blocks"].values()
        if b["status"] == "mastered"
    )


def get_total_blocks() -> int:
    """Get the total number of knowledge blocks."""
    return len(BLOCKS)