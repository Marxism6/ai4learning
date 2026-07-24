"""Unit tests for knowledge block definitions.

Note: prerequisites field has been removed per spec — LLM determines
them dynamically at runtime. See system prompt for prerequisite flow.
"""

import pytest

from app.blocks import BLOCKS, get_block, get_block_context


class TestBlockDefinitions:
    """Verify the block data structure."""

    def test_minimum_5_blocks(self):
        assert len(BLOCKS) >= 5

    def test_all_blocks_have_required_fields(self):
        for slug, block in BLOCKS.items():
            assert block["slug"] == slug
            assert isinstance(block["title"], str) and block["title"]
            assert isinstance(block["topic"], str) and block["topic"]
            assert isinstance(block["description"], str) and block["description"]
            assert isinstance(block["mastery_levels"], list)
            assert len(block["mastery_levels"]) == 3
            # Per spec: no hardcoded prerequisites — LLM determines dynamically
            assert "prerequisites" not in block

    def test_specific_blocks_exist(self):
        expected = {
            "interpolation",
            "newton-method",
            "gauss-elimination",
            "numerical-integration",
            "runge-kutta",
        }
        assert expected.issubset(set(BLOCKS.keys()))


class TestGetBlock:
    """Test the get_block helper."""

    def test_existing_block(self):
        block = get_block("newton-method")
        assert block is not None
        assert block["title"] == "Newton's Method"

    def test_nonexistent_block(self):
        assert get_block("nonexistent") is None

    def test_none_slug(self):
        assert get_block(None) is None


class TestGetBlockContext:
    """Test the get_block_context helper."""

    def test_existing_block_returns_context(self):
        context = get_block_context("newton-method")
        assert context
        assert "Newton's Method" in context
        assert "Nonlinear Equations" in context
        assert "Level 1" in context
        # Per spec: no hardcoded prerequisites in context
        assert "prerequisite" not in context.lower()

    def test_none_slug_returns_empty(self):
        assert get_block_context(None) == ""

    def test_empty_slug_returns_empty(self):
        assert get_block_context("") == ""

    def test_nonexistent_slug_returns_empty(self):
        assert get_block_context("nonexistent") == ""