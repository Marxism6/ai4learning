# Handoff: Numerical Analysis Tutor — Implementation

**Date:** 2026-07-24
**Repo:** https://github.com/Marxism6/ai4learning
**Local path:** /home/xingwangtan/Code/107competition
**Branch:** master

## Context

This is a competition project (107competition) to build a Socratic tutoring agent for university Numerical Analysis (计算方法). The design phase is complete. All planning artifacts are in the repo and GitHub Issues. Implementation has NOT started.

## Key Artifacts (do not recreate — read these)

| Artifact | Location |
|----------|----------|
| PRD (full spec) | GitHub Issue #1 |
| Ticket 01 — E2E Socratic conversation | GitHub Issue #2 (FRONTIER — start here) |
| Ticket 02 — Knowledge block navigation | GitHub Issue #3 |
| Ticket 03 — Prerequisite flow & hint escalation | GitHub Issue #4 |
| Ticket 04 — User identity & progress persistence | GitHub Issue #5 |
| Ticket 05 — Session persistence & cross-session memory | GitHub Issue #6 |
| Ticket 06 — Image upload & problem recognition | GitHub Issue #7 |
| Ticket 07 — Responsive polish & design QA | GitHub Issue #8 |
| Design system (single source of truth) | `DESIGN.md` in repo root |
| Agent skills config | `AGENTS.md` + `docs/agents/` |

## Architecture Decisions (confirmed by user)

- **Backend:** Python FastAPI, localhost:8000, serves static frontend + proxies LLM API
- **Frontend:** Static HTML/JS/CSS (no framework), KaTeX for formula rendering
- **LLM:** OpenAI-compatible API, key from env var, never exposed to frontend
- **Knowledge structure:** Dictionary-style blocks (slug-keyed), not linear chapters. Reference: Sauer "Numerical Analysis" latest edition, subsection granularity
- **Prerequisites:** LLM determines dynamically at runtime (no hardcoded DAG)
- **Socratic engine:** Never give direct answers. Hint escalation: question → clue → partial solution → full explanation + understanding check
- **Mastery levels:** (1) manual execution, (2) method selection, (3) theoretical understanding
- **Users:** 2 users, username only (no password), server-side JSON per user (`data/<username>.json`)
- **Session:** localStorage for conversation history, optional cross-session memory toggle
- **Design:** "Precision notebook" aesthetic — warm paper canvas #f5f0e8 (eye-protection default), single deep-teal accent #1a5c5c, Inter Variable 460/540/600, UPPERCASE block tags with 1.5px tracking

## Blocking Graph

```
#2 (01) ──→ #3 (02) ──→ #4 (03)
  │            │
  │            └──→ #5 (04) ──→ #6 (05)
  │            │
  │            └──→ #8 (07)
  └──→ #7 (06)
```

Frontier (can start now): **#2 (Ticket 01)**

## Tech Environment

- Python (use `uv` for environment management if available)
- Node.js v24.3.0 available (not needed for backend, but available for tooling)
- Git user: Marxism6
- GitHub CLI (`gh`) authenticated and working
- WSL2 Linux environment

## Suggested Skills

- `/run` or `/verify` — to visually confirm UI during implementation (screenshot capability)
- `/frontend-design` — reference DESIGN.md when building components
- `/diagnosing-bugs` — if hitting issues during implementation
- `/tdd` — for test-first development of API endpoints (pytest + httpx)

## What NOT to Do

- Do NOT recreate the spec or tickets — they're in GitHub Issues
- Do NOT modify DESIGN.md without user approval
- Do NOT add frameworks (React, Vue, etc.) — frontend is vanilla HTML/JS/CSS
- Do NOT hardcode prerequisite DAGs — LLM determines them at runtime
- Do NOT expose API keys in frontend code
- Do NOT create additional DESIGN reference files (the 4 reference files were intentionally deleted)

## User Preferences

- Communicate in Chinese (中文), keep code/API/technical terms in English
- User tests the product themselves (2 test users = the user + collaborator)
- Frontend design style was discussed with collaborator — DESIGN.md is the agreed result
- Competition timeline is tight — MVP first, polish later
