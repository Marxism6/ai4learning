"""User settings persistence — JSON file per user in data/<username>/ directory.

Each user's settings are stored in data/<username>/settings.json with the following shape:

{
  "api_key": "...",
  "model": "...",
  "api_base": "...",
  "memory_enabled": false,
  "mem_model": ""
}
"""

import json
import os

DATA_DIR = "data"

DEFAULT_SETTINGS = {
    "api_key": "",
    "model": "",
    "api_base": "",
    "memory_enabled": False,
    "mem_model": "",
}


def _user_path(username: str) -> str:
    """Get the filesystem path for a user's settings file."""
    safe = "".join(c for c in username if c.isalnum() or c in "._- ")
    return os.path.join(DATA_DIR, safe or "anonymous", "settings.json")


def _ensure_data_dir(username: str):
    """Create the user's data directory if it doesn't exist."""
    safe = "".join(c for c in username if c.isalnum() or c in "._- ")
    os.makedirs(os.path.join(DATA_DIR, safe or "anonymous"), exist_ok=True)


def get_settings(username: str) -> dict:
    """Get a user's settings. Returns defaults if no settings file exists."""
    _ensure_data_dir(username)
    path = _user_path(username)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return {**DEFAULT_SETTINGS, **json.load(f)}
    return dict(DEFAULT_SETTINGS)


def save_settings(username: str, settings: dict) -> dict:
    """Save a user's settings. Merges with existing settings."""
    _ensure_data_dir(username)
    path = _user_path(username)
    current = get_settings(username)
    for key in DEFAULT_SETTINGS:
        if key in settings:
            current[key] = settings[key]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2, ensure_ascii=False)
    return current