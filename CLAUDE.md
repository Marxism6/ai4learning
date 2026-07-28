# 数值分析辅导应用 — 项目工作流与约定

> 本文档是通用工作流 `~/.qoder-cn/workflow/ITERATION-WORKFLOW.md` 在本项目的实例化。
> 通用部分（两重循环结构、退出条件、查证框架、triage 判定标准、角色分工）不重复，直接引用。
> 本文只写**本项目特有的**工具、命令、验证方式和约定。

## 项目速览

| 项 | 值 |
|----|----|
| 项目 | 苏格拉底式数值分析学习工具（计算方法辅导） |
| 仓库 | https://github.com/Marxism6/ai4learning |
| 本地路径 | /home/xingwangtan/Code/107competition |
| 技术栈 | Python FastAPI 后端 + 原生 HTML/JS/CSS 前端 + KaTeX + Chart.js |
| 启动 | `uv run serve` → http://localhost:8000 |
| 后端测试 | `uv run pytest tests/ -q`（71 个，只覆盖后端 API） |
| 前端验证 | **必须用 gstack /qa-only 浏览器实测**（pytest 覆盖不到前端渲染） |
| 当前版本 | v0.2.2（已发布） |
| PRD | GitHub Issue #1 |
| 设计系统 | DESIGN.md（不可修改） |
| 前端 JS 架构 | NAT namespace 模块（8 个 JS 文件，零构建工具，见「chat.js 模块化」节） |

## 角色（本项目）

| 角色 | 由谁担任 | 职责 |
|------|---------|------|
| 策划者（Orchestrator） | Claude Code（接手者） | 查证、triage、写方案、验证、决定优先级 |
| 执行者（Subagent） | Claude Code 的 Task subagent（默认 sonnet） | 浏览器找 bug、按方案修 bug、按方案实现新功能 |
| 维护者 | 用户（Marxism6） | 关键决策确认（wontfix / push / release） |

**权限边界**（沿用通用工作流）：策划者可本地修改、运行测试、写方案；**push、wontfix、打 tag、release 必须向维护者确认**。

## 新功能开发流程

```
新功能开发（策划者设计 + 执行者实施）
│
├── 1. 策划者分析需求 → 写功能方案（.scratch/feature-<名称>.md）
│   ├── 目标、成功标准、约束
│   ├── 涉及文件清单
│   ├── 分步骤实施计划（每步可独立验证）
│   └── 验证方式
│
├── 2. 可 fan-out 的子任务 → 并行派 subagent
│   ├── 同一文件不派多个 agent（避免冲突）
│   ├── 每个 subagent 给出：修改范围、具体指令、验证命令
│   └── 顺序依赖的步骤串行派发
│
├── 3. 策划者验证：uv run pytest + curl + 代码审查
│   ├── 功能是否按方案实现？
│   ├── 测试是否全部通过？
│   └── 是否有意外修改？
│
└── 4. 验证通过 → 自动进入 debug 迭代循环（内循环）
    └── 验证失败 → 写修复子方案 → 派 subagent 修复 → 回到步骤 3
```

### 新功能方案模板

```markdown
# feature: <名称>

## 目标
## 成功标准
## 约束
## 涉及文件
## 实施步骤

### Step 1: <步骤名>
- 修改文件：<路径>
- 具体改动：<描述>
- 验证：<命令>

### Step 2: <步骤名>
...

## 验证
1. uv run pytest tests/ -q
2. curl 验证 API
3. gstack /qa-only 浏览器实测（如涉及前端）
```

## 两重循环（本项目实例）

```
外循环（code-review 驱动 / 静态分析）
│
├── 内循环（浏览器测试驱动 / 动态测试）
│   ├── 1. 派 subagent 用 gstack /qa-only 做系统测试
│      → 返回结构化报告（健康评分、截图、复现步骤）
│   ├── 2. 策划者查证：代码分析 + 报告研判 → 判定真伪
│   │      （注意：测试 agent 的报告可能有误报，必须亲自查证！）
│   ├── 3. 真 bug → 写修复方案 → 派 subagent 修复
│   ├── 4. 验证修复：uv run pytest + gstack /qa-only 回归
│   └── 5. 循环直到连续一轮 0 真 bug
│
├── 内循环收敛后：
│   ├── 6. 打 review tag → /code-review（Standards + Spec 两轴，并行 subagent）
│   ├── 7. findings → 查证 → /triage → 修复 → 验证
│   └── 8. 循环直到连续一轮 0 findings
│
└── 外循环收敛后：
    └── 9. 整理 release notes → 维护者审核 → 发布
```

## 本项目查证方法（重要）

通用查证框架见 ITERATION-WORKFLOW.md。本项目特别注意：

1. **前端 bug 必须浏览器复现** — pytest 只测后端。前端渲染/交互 bug（如 KaTeX 渲染、语言切换、面板显隐）只能用 gstack /qa-only 复现。
2. **警惕测试 agent 误报** — 历史上有 3 次误报：
   - 把 KaTeX 的 `textContent`（"E=mc2E = mc^2..."）当成显示内容（实际视觉渲染正确）
   - 把 `innerHTML` 残留当成"面板未隐藏"（实际 `display: none` 已隐藏）
   - review subagent 把压缩 IIFE 风格当 smell、把 closeXxx 各自独立当 Duplicated Code
   - **判定原则**：以浏览器实测的 DOM 状态（`display`、`.katex` 元素是否存在）为准，不轻信报告文字描述。
3. **后端 bug 用 curl + pytest** — API 行为用 `curl http://localhost:8000/api/...` 验证。
4. **gh 命令用 --json** — `gh issue view <N> --json title,body`（默认文本输出会触发 projectCards 弃用报错）。

## gstack 浏览器测试要点

内循环浏览器测试使用 gstack `/qa-only` skill。该 skill 自动处理导航、交互、截图、断言、报告生成，不需要手动提示词文件。

### /qa-only 调用方式

```
派 subagent（general-purpose），提示词包含：
- 测试目标和范围
- 应用 URL（http://localhost:8000）
- 测试用户名规则（每次用新用户名，如 test_rN）
- 需要测试的具体功能点
- 截图保存目录（bugpicture/）
- 要求输出表格汇总 + 详细发现
```

### 已知注意点

1. `/qa-only` 是 report-only，不会修改代码 — 适合内循环
2. 返回结构化报告（健康评分、console 错误、功能/UX/视觉评分）
3. 截图自动处理，不需要手动管道
4. 如果 API key 失效，对话测试会跳过（报告标注 N/A）
5. 复杂多步流程可能需要分多次 `/qa-only` 调用

### 测试提示词模板

```
用 gstack /qa-only 测试 http://localhost:8000。
新用户 test_rN。配置 API（Key=..., Base=..., Model=...）。
测试点：
- [具体功能列表]
- data/ 完整性检查（ls data/test_rN/）
截图存 bugpicture/。输出表格汇总。
```

## 测试用 API 配置

测试真实对话需要 LLM API（配置在浏览器设置面板）：
- API Key：见 `.scratch/browser-test-prompt.md`（本地文件，.scratch 已 gitignore，**不要提交、不要在转交文档明文写出**）
- Base URL：`https://api.llm.ustc.edu.cn/`（无 /v1，应用自动补全）
- 模型：`deepseek-chat`（该 key 无权访问 gpt/claude，必须用这个）
- 对话消耗配额，每轮测试控制 3-5 轮

## 外循环 code-review 须知

`/code-review` 是 **mattpocock skill**（非 gstack `/review`）。调用时：

- 固定点：tag（`reviewed-YYYY-MM-DD-rN`）或 commit SHA
- 两轴并行 subagent（Standards + Spec）
- **必须给 review subagent 追加防误报提示**，否则会误报：
  - 压缩 IIFE 风格 → 非 smell，是有意设计
  - `closeXxx()` 各自独立 → 非 Duplicated Code，操作不同 DOM 元素
  - 单文件大量修改 → 非 Divergent Change，是既有单体设计
  - "可以更好" ≠ "缺失需求"；"分次修复" ≠ "Scope Creep"
  - guard clause `if(!state.username)return` 就是实现了需求
- 只报告本次 diff 引入的问题，不报告已有代码问题
- diff 若是空 → 打 tag 后无变更 → 直接判 0 findings

## 修复方案 + 提示词模板

沿用 ITERATION-WORKFLOW.md 的修复方案模板。本项目修复提示词固定包含：

```
你接手 N 个 issue（#X-#Y）。项目是苏格拉底式数值分析学习工具（FastAPI + 原生 HTML/JS/CSS + KaTeX）。

请先阅读：
- 各 issue：gh issue view X --json title,body（用 --json 避免弃用报错）
- 修复方案：.scratch/<对应方案文件>.md
- 设计系统（不要修改）：DESIGN.md

执行顺序：<按依赖排列，每个 issue 一个 commit>

验证（关键：pytest 只覆盖后端，前端必须 gstack /qa-only 实测）：
1. uv run pytest tests/ -q → 全部通过
2. uv run serve 后用 gstack /qa-only 实测各修复点
3. 每个 issue 修复后 gh issue close <N> --comment "已修复：<说明>"

用中文沟通，代码和技术术语用英文。不要修改 DESIGN.md。
```

## 文件布局（本项目）

```
107competition/
├── .scratch/
│   ├── browser-test-prompt.md   # 浏览器测试提示词（含 API key，勿提交）
│   ├── data-persistence.md      # 持久化机制完整文档
│   └── RELEASE-NOTES-*.md       # Release notes（参考用）
│   ├── RELEASE-NOTES-*.md       # Release notes（参考用）
│   ├── fix-plan-*.md            # 修复方案（修复完成后删除）
│   └── feature-*.md             # 功能方案（完成后删除）
├── bugpicture/                  # 测试截图（.gitignore）
├── DESIGN.md                    # 设计系统（不可改）
├── app/                         # FastAPI 后端
│   ├── main.py                 # 应用入口
│   ├── routes.py               # API 端点
│   ├── llm.py                  # LLMClient
│   ├── prompts.py              # 苏格拉底提示词
│   ├── blocks.py               # 知识块定义
│   ├── progress.py             # JSON 进度持久化
│   └── memory.py               # SQLite 会话 + 记忆系统
├── static/                      # 前端
│   ├── index.html
│   ├── css/
│   └── js/
│       ├── nat.js               # 全局 namespace: window.NAT + 工具函数
│       ├── nat-i18n.js          # I18N 对象 + applyLanguage
│       ├── nat-settings.js      # 设置面板
│       ├── nat-history.js       # 历史存档/恢复
│       ├── nat-blocks.js        # 块选择器 + 进度 chips
│       ├── nat-math.js          # 数学键盘 + LaTeX
│       ├── nat-chat.js          # 消息渲染 + API 调用
│       └── nat-main.js          # 初始化 + 事件绑定 + 用户名
├── tests/                       # pytest（后端 71 个）
│   ├── test_api.py
│   └── js/                      # Node --test + JSDOM（前端 68 个）
│       ├── setup.js
│       ├── nat-utils.test.js
│       ├── nat-state.test.js
│       └── nat-latex.test.js
├── data/                        # 用户数据（已 gitignore）
│   └── <username>/
│       ├── progress.json
│       ├── sessions.db
│       ├── memory.md
│       └── profile.md
```

## chat.js 模块化

### 当前状态

原 `static/js/chat.js`（~545 行单体 IIFE）已按关注点拆分为 `static/js/nat-*.js` 命名空间模块。各模块通过 `window.NAT` 共享状态和函数。

### 架构原则

- **零构建工具**：纯 `<script>` 标签加载，不引入 npm/esbuild/vite
- **加载顺序**：各 nat-*.js 按依赖顺序排列在 index.html 中（nat.js → nat-i18n.js → ... → nat-main.js），加载顺序即依赖顺序
- **命名空间**：所有模块挂到 `window.NAT`，状态对象 `NAT.state` 跨模块共享
- **修改时注意**：改一个模块的函数签名时，检查所有调用方（grep 模块名）

## 退出条件（沿用通用）

| 循环 | 退出条件 | 防护 |
|------|----------|------|
| 内循环 | 连续一轮 0 真 bug | 连续 3 轮只产出 wontfix → 视为收敛 |
| 外循环 | 连续一轮 0 findings | 同上 |

## 文档卫生约定（重要）

**不要让旧方案文档堆积。** 维护者明确要求：已完成的修复方案、功能方案、bug 报告要及时清理。

- **每轮修复完成并验证后**，删除对应的 `.scratch/fix-plan-*.md` 和 `.scratch/feature-*.md`（issue 已 closed，方案已无用）。
- **保留**：`browser-test-prompt.md`（活跃测试提示词）、`data-persistence.md`（持久化机制文档）。
- 旧的 `handoff.md` 类临时转交文档用完即删。
- 删除前确认对应 issue 已 closed、修复已 push。
- `.scratch/` 已 gitignore，删除是本地操作，不影响仓库。

**当前 `.scratch/` 应只保留**：
```
.scratch/
├── browser-test-prompt.md     # 活跃测试提示词
├── data-persistence.md        # 持久化机制文档
└── RELEASE-NOTES-*.md         # Release notes（保留参考）
└── RELEASE-NOTES-*.md         # Release notes（保留参考）
```

新一轮产生的 fix-plan 在修复完成后同样删除，保持目录干净。
