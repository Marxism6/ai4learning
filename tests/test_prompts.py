"""Tests for the Socratic system prompt (Ticket 03 — Prerequisite flow & hint escalation)."""

from app.prompts import SOCRATIC_SYSTEM_PROMPT, get_system_prompt


class TestSocraticPromptContent:
    """Verify the system prompt contains all required sections."""

    def test_hint_escalation_section(self):
        assert "Hint Escalation" in SOCRATIC_SYSTEM_PROMPT
        assert "Level 1" in SOCRATIC_SYSTEM_PROMPT
        assert "Level 2" in SOCRATIC_SYSTEM_PROMPT
        assert "Level 3" in SOCRATIC_SYSTEM_PROMPT
        assert "Level 4" in SOCRATIC_SYSTEM_PROMPT

    def test_prerequisite_flow_section(self):
        assert "Prerequisite Flow" in SOCRATIC_SYSTEM_PROMPT
        assert "Assess readiness" in SOCRATIC_SYSTEM_PROMPT
        assert "Detect gaps" in SOCRATIC_SYSTEM_PROMPT
        assert "Teach prerequisite" in SOCRATIC_SYSTEM_PROMPT
        assert "Verify prerequisite" in SOCRATIC_SYSTEM_PROMPT
        assert "Confirm before proceeding" in SOCRATIC_SYSTEM_PROMPT

    def test_mastery_levels_section(self):
        assert "Mastery Levels" in SOCRATIC_SYSTEM_PROMPT
        assert "Manual execution" in SOCRATIC_SYSTEM_PROMPT
        assert "Method selection" in SOCRATIC_SYSTEM_PROMPT
        assert "Theoretical understanding" in SOCRATIC_SYSTEM_PROMPT

    def test_problem_block_format(self):
        assert "::: problem" in SOCRATIC_SYSTEM_PROMPT
        assert ":::" in SOCRATIC_SYSTEM_PROMPT

    def test_never_give_direct_answers(self):
        assert "NEVER give direct answers" in SOCRATIC_SYSTEM_PROMPT
        assert "Socratic" in SOCRATIC_SYSTEM_PROMPT

    def test_prerequisites_dynamic(self):
        """Prerequisites are determined dynamically by LLM, not via hardcoded DAG."""
        assert "dynamically" in SOCRATIC_SYSTEM_PROMPT.lower()
        assert "no hardcoded" in SOCRATIC_SYSTEM_PROMPT.lower()


class TestGetSystemPrompt:
    """Test the get_system_prompt helper."""

    def test_with_block_context(self):
        prompt = get_system_prompt("Test block context")
        assert "Test block context" in prompt
        assert "Hint Escalation" in prompt

    def test_without_block_context(self):
        prompt = get_system_prompt()
        assert "Hint Escalation" in prompt

    def test_length(self):
        prompt = get_system_prompt("some context")
        # Must be substantial enough to guide the LLM
        assert len(prompt) > 3000