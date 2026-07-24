"""Unit tests for knowledge block definitions (Ticket 02)."""

import pytest

from app.blocks import BLOCKS, get_block, get_block_context, get_topic_blocks


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
            assert isinstance(block["prerequisites"], list)
            assert isinstance(block["mastery_levels"], list)
            assert len(block["mastery_levels"]) == 3

    def test_specific_blocks_exist(self):
        expected = {
            "interpolation",
            "newton-method",
            "gauss-elimination",
            "numerical-integration",
            "runge-kutta",
        }
        assert expected.issubset(set(BLOCKS.keys()))

    def test_prerequisites_reference_existing_blocks(self):
        for slug, block in BLOCKS.items():
            for prereq in block["prerequisites"]:
                assert prereq in BLOCKS, (
                    f"Block '{slug}' has prerequisite '{prereq}' which does not exist"
                )

    def test_prerequisites_are_not_circular(self):
        """Simple check: no block lists itself as prerequisite."""
        for slug, block in BLOCKS.items():
            assert slug not in block["prerequisites"], (
                f"Block '{slug}' lists itself as prerequisite"
            )


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

    def test_none_slug_returns_empty(self):
        assert get_block_context(None) == ""

    def test_empty_slug_returns_empty(self):
        assert get_block_context("") == ""

    def test_nonexistent_slug_returns_empty(self):
        assert get_block_context("nonexistent") == ""


class TestGetTopicBlocks:
    """Test topic-based block grouping."""

    def test_returns_dict(self):
        topics = get_topic_blocks()
        assert isinstance(topics, dict)

    def test_all_blocks_accounted_for(self):
        topics = get_topic_blocks()
        total = sum(len(blocks) for blocks in topics.values())
        assert total == len(BLOCKS)

    def test_topic_categories_exist(self):
        topics = get_topic_blocks()
        assert "Nonlinear Equations" in topics
        assert "Linear Systems" in topics
        assert "Interpolation" in topics
        assert "Integration" in topics
        assert "Ordinary Differential Equations" in topics