# Agent Instructions

## 项目当前状态 (v0.2.1)

7/27/2026 — 记忆系统已完成，两重循环均收敛。pytest 71/71 + JS 68/68 + CI 绿灯。

## 技术栈

Python FastAPI 后端 + 原生 HTML/JS/CSS 前端 + KaTeX + Chart.js。
前端为 8 个 NAT namespace 模块（零构建工具，`<script>` 标签加载）。

## 关键概念

- **memory.md**：AI 提取的学习记忆（知识点、弱项、偏好）
- **profile.md**：用户画像（水平、风格、目标）
- **sessions.db**：SQLite 对话历史，FTS5 全文搜索
- **progress.json**：块级掌握状态（not-started/in-progress/mastered）
- **NAT namespace**：`window.NAT` — 所有前端 JS 模块通过此命名空间共享状态

## 领域规则

1. API Key 绝不存服务器 — 仅 localStorage per-user
2. data/ 不在 uvicorn 热重载范围（`reload_dirs` 白名单）
3. 每次测试用新用户名 + 检查 data/ 完整性
4. `/code-review` = mattpocock skill，非 gstack `/review`

## Agent skills

### Issue tracker

Issues 通过 GitHub Issues 管理，使用 `gh` CLI 操作。See `docs/agents/issue-tracker.md`.

### Triage labels

使用默认五标签体系（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。See `docs/agents/triage-labels.md`.

### Domain docs

See `docs/agents/domain.md`.