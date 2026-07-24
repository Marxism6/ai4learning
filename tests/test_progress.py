"""Tests for user progress persistence (Ticket 04)."""

import pytest

from app.progress import (
    DATA_DIR,
    get_progress,
    update_block_progress,
    get_completed_count,
    get_total_blocks,
)


@pytest.fixture(autouse=True)
def clean_data_dir():
    """Remove any data files before and after each test to ensure isolation."""
    import os, shutil
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)
    os.makedirs(DATA_DIR, exist_ok=True)
    yield
    if os.path.exists(DATA_DIR):
        shutil.rmtree(DATA_DIR)


class TestGetProgress:
    def test_new_user_has_all_blocks(self):
        progress = get_progress("testuser")
        assert progress["username"] == "testuser"
        assert len(progress["blocks"]) >= 5
        for slug, block in progress["blocks"].items():
            assert block["status"] == "not-started"
            assert block["mastery_level"] == 0

    def test_returns_same_data_on_second_call(self):
        p1 = get_progress("testuser")
        p2 = get_progress("testuser")
        assert p1["username"] == p2["username"]
        assert len(p1["blocks"]) == len(p2["blocks"])

    def test_username_with_spaces(self):
        progress = get_progress("test user")
        assert progress["username"] == "test user"

    def test_username_isolation(self):
        p1 = get_progress("alice")
        p2 = get_progress("bob")
        assert p1["username"] != p2["username"]


class TestUpdateBlockProgress:
    def test_update_status(self):
        update_block_progress("testuser", "newton-method", status="in-progress")
        progress = get_progress("testuser")
        assert progress["blocks"]["newton-method"]["status"] == "in-progress"

    def test_update_mastery_level(self):
        update_block_progress("testuser", "gauss-elimination", mastery_level=2)
        progress = get_progress("testuser")
        assert progress["blocks"]["gauss-elimination"]["mastery_level"] == 2

    def test_mastery_3_auto_sets_mastered(self):
        update_block_progress("testuser", "interpolation", mastery_level=3)
        progress = get_progress("testuser")
        assert progress["blocks"]["interpolation"]["status"] == "mastered"
        assert progress["blocks"]["interpolation"]["mastery_level"] == 3

    def test_unknown_block_raises(self):
        with pytest.raises(ValueError, match="Unknown block"):
            update_block_progress("testuser", "nonexistent-block")

    def test_invalid_mastery_level_raises(self):
        with pytest.raises(ValueError, match="Invalid mastery level"):
            update_block_progress("testuser", "newton-method", mastery_level=5)

    def test_persists_across_calls(self):
        update_block_progress("testuser", "runge-kutta", status="mastered")
        # Fresh read
        progress = get_progress("testuser")
        assert progress["blocks"]["runge-kutta"]["status"] == "mastered"

    def test_updated_at_is_set(self):
        update_block_progress("testuser", "newton-method", status="in-progress")
        progress = get_progress("testuser")
        assert progress["blocks"]["newton-method"]["updated_at"] is not None


class TestCompletedCount:
    def test_zero_initially(self):
        assert get_completed_count("testuser") == 0

    def test_counts_only_mastered(self):
        update_block_progress("testuser", "interpolation", status="mastered")
        update_block_progress("testuser", "newton-method", status="in-progress")
        assert get_completed_count("testuser") == 1

    def test_multiple_mastered(self):
        update_block_progress("testuser", "interpolation", status="mastered")
        update_block_progress("testuser", "newton-method", status="mastered")
        assert get_completed_count("testuser") == 2


class TestGetTotalBlocks:
    def test_at_least_5(self):
        assert get_total_blocks() >= 5