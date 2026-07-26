# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

## Use the glossary's vocabulary

Key project concepts:
- **memory.md**: AI-extracted learning insights per user (topics, weaknesses, preferences)
- **profile.md**: User learning profile (level, style, goals)
- **sessions.db**: SQLite conversation history with FTS5 search
- **progress.json**: Block-level mastery status (not-started/in-progress/mastered)
- **NAT namespace**: `window.NAT` — all frontend JS modules share state via this

## Domain-specific rules

1. API keys NEVER stored on server — localStorage per-user only
2. data/ excluded from hot-reload (`reload_dirs` whitelist)
3. Every test must use new username + check data/ integrity
4. `/code-review` = mattpocock skill, not gstack `/review`

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
