"""Tests for the Socratic system prompt — including i18n lang support (H3)."""

from app.prompts import (
    SOCRATIC_SYSTEM_PROMPT,
    LANGUAGE_INSTRUCTION_ZH,
    LANGUAGE_INSTRUCTION_EN,
    get_system_prompt,
)


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


class TestLanguageInstruction:
    """Verify language instructions exist and contain correct directives."""

    def test_lang_zh_contains_chinese_rules(self):
        assert "Chinese (中文)" in LANGUAGE_INSTRUCTION_ZH
        assert "中文术语（English Term）" in LANGUAGE_INSTRUCTION_ZH
        assert "LaTeX" in LANGUAGE_INSTRUCTION_ZH

    def test_lang_en_contains_english_rule(self):
        assert "English" in LANGUAGE_INSTRUCTION_EN
        assert "standard mathematical terminology" in LANGUAGE_INSTRUCTION_EN


class TestGetSystemPrompt:
    """Test the get_system_prompt helper with i18n."""

    def test_with_block_context(self):
        prompt = get_system_prompt("Test block context")
        assert "Test block context" in prompt
        assert "Hint Escalation" in prompt

    def test_without_block_context(self):
        prompt = get_system_prompt()
        assert "Hint Escalation" in prompt

    def test_length(self):
        prompt = get_system_prompt("some context")
        assert len(prompt) > 3000

    def test_lang_zh_includes_chinese_instruction(self):
        prompt = get_system_prompt(lang="zh")
        assert "Chinese (中文)" in prompt

    def test_lang_en_includes_english_instruction(self):
        prompt = get_system_prompt(lang="en")
        assert "English" in prompt
        # EN must NOT contain Chinese instruction
        assert "Chinese (中文)" not in prompt

    def test_lang_zh_default_block_prompt_is_chinese(self):
        prompt = get_system_prompt(lang="zh")
        assert "数值分析" in prompt

    def test_lang_en_default_block_prompt_is_english(self):
        prompt = get_system_prompt(lang="en")
        assert "Numerical Analysis" in prompt