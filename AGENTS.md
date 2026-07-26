# Agent Instructions

## 项目当前状态 (v0.2.1)

7/27/2026 — 记忆系统已完成，两重循环均收敛。pytest 71/71 + JS 68/68 + CI 绿灯。

## Agent skills

### Issue tracker

Issues 通过 GitHub Issues 管理，使用 `gh` CLI 操作。See `docs/agents/issue-tracker.md`.

### Triage labels

使用默认五标签体系（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。See `docs/agents/triage-labels.md`.

### Domain docs

单上下文布局：根目录 `CONTEXT.md` + `docs/adr/`。已新增领域概念：`memory.md`（学习记忆）、`profile.md`（用户画像）、`settings.json`（已废弃）。See `docs/agents/domain.md`.
