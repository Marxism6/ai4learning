# Numerical Analysis Tutor

苏格拉底式数值分析学习工具。通过引导式对话帮助大学生掌握计算方法（Numerical Analysis）的核心知识，而不是直接给出答案。

## 项目背景

大学生学习计算方法时，往往面临两个困境：直接问 AI 会得到答案但跳过理解过程，独自做题又容易卡住无人引导。本项目构建了一个苏格拉底式辅导 agent——它通过提问引导学生自己发现答案，检查前置知识，逐步升级提示，最终确认学生真正掌握了知识。

参考教材：Timothy Sauer, *Numerical Analysis*（最新版）。

## 核心特性

- **苏格拉底式引导**：永远不直接给答案，通过反问、提示、部分演示、完整解释四级递进帮助学生理解
- **动态前置知识检测**：LLM 在运行时判断学生是否缺少前置知识，并在对话中补讲+验证
- **三级掌握体系**：手动执行算法 → 方法选择判断 → 理论理解（收敛性、误差分析）
- **知识块导航**：字典式分块（非线性章节），按 Sauer 教材小节粒度组织
- **主动训练模式**：选择知识块后 agent 主动出题评估，不需要学生先提问
- **公式渲染**：KaTeX 渲染数学公式，独立公式卡片提供沉浸式阅读体验
- **图表可视化**：Chart.js 渲染收敛曲线、误差衰减等可视化内容
- **图片识别**：上传题目截图，Vision LLM 识别后开始引导
- **进度追踪**：服务端 JSON 持久化，支持多用户隔离
- **AI 记忆系统**：后台 LLM 自动提取学习记忆（知识点、弱项、偏好），下次对话时注入系统提示
- **会话管理**：SQLite 服务端存储对话历史，FTS5 全文搜索，支持存档/恢复
- **护眼设计**：暖纸色画布（#f5f0e8）为默认主题，可切换标准模式

## 知识块

| Slug | 名称 | 主题分类 |
|------|------|----------|
| `interpolation` | Interpolation | Interpolation |
| `newton-method` | Newton's Method | Nonlinear Equations |
| `fixed-point-iteration` | Fixed-Point Iteration | Nonlinear Equations |
| `gauss-elimination` | Gaussian Elimination | Linear Systems |
| `lu-decomposition` | LU Decomposition | Linear Systems |
| `eigenvalues` | Eigenvalue Methods | Linear Systems |
| `numerical-integration` | Numerical Integration | Integration |
| `runge-kutta` | Runge-Kutta Methods | Ordinary Differential Equations |

## 技术架构

```
┌─────────────────────────────────────────────────┐
│  Browser (localhost:8000)                       │
│  ┌───────────────────────────────────────────┐  │
│  │  static/index.html                        │  │
│  │  static/css/style.css  (DESIGN.md 实现)   │  │
│  │  static/js/nat.js      (核心命名空间)     │  │
│  │  static/js/nat-*.js    (7 个功能模块)     │  │
│  │  KaTeX CDN + Chart.js CDN + Inter Font    │  │
│  └──────────────────┬────────────────────────┘  │
└─────────────────────┼───────────────────────────┘
                      │ HTTP (fetch)
┌─────────────────────┼───────────────────────────┐
│  FastAPI Backend    │                           │
│  ┌──────────────────▼────────────────────────┐  │
│  │  app/routes.py   API 端点                 │  │
│  │  app/llm.py      LLMClient (代理转发)     │  │
│  │  app/prompts.py  苏格拉底系统提示         │  │
│  │  app/blocks.py   知识块定义               │  │
│  │  app/progress.py JSON 进度持久化          │  │
│  │  app/memory.py   SQLite 会话 + 记忆系统   │  │
│  └──────────────────┬────────────────────────┘  │
└─────────────────────┼───────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────┐
│  OpenAI-compatible LLM API                      │
│  (API key 由浏览器设置面板提供，不存服务器)      │
└─────────────────────────────────────────────────┘
```

## 环境要求

- Python >= 3.12
- [uv](https://docs.astral.sh/uv/)（包管理器）
- 一个 OpenAI-compatible API key（支持 chat completions + vision）

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/Marxism6/ai4learning.git
cd ai4learning
```

### 2. 安装依赖

```bash
uv sync
```

### 3. （可选）设置环境变量

```bash
# 服务器端默认 API key（可被浏览器设置覆盖）
export LLM_API_KEY="sk-your-key-here"

# 可选：自定义模型（默认 gpt-4o）
export LLM_MODEL="gpt-4o"

# 可选：自定义 API 地址（默认 https://api.openai.com/v1）
export LLM_API_BASE="https://api.openai.com/v1"
```

> 也可以在浏览器设置面板中直接填写 API Key/Model/API Base，这些值**仅存储在浏览器 localStorage**，不会上传到服务器。

支持的 API 服务：OpenAI、Azure OpenAI、DeepSeek、Moonshot、本地 Ollama 等任何 OpenAI-compatible 端点。

### 4. 启动服务

```bash
uv run serve
```

### 5. 打开浏览器

访问 http://localhost:8000

## 使用指南

### 首次使用

1. 打开页面后输入用户名（用于区分不同学习者的进度和数据）
2. 点击设置按钮，填写 API Key / Model / API Base 并保存
3. 进入主界面，顶部导航栏显示所有知识块

### 学习流程

1. **选择知识块**：点击顶部下拉选择器，选一个知识块，agent 会主动开始评估你的水平
2. **对话引导**：agent 通过提问引导你思考，不会直接给答案
3. **前置知识补讲**：如果你缺少前置知识，agent 会在对话中补讲并出验证题确认
4. **提示升级**：卡住时 agent 会逐步给提示（反问 → 线索 → 部分解 → 完整解释）
5. **掌握确认**：通过三级验证后，进度自动更新为 mastered

### 自由提问

不选择任何知识块时，可以直接在输入框提问任何计算方法相关问题，agent 仍以苏格拉底方式引导。

### 上传题目

点击输入栏左侧的图片按钮，上传题目截图（PNG/JPG/WEBP，最大 10MB）。agent 会识别题目内容并开始引导。

### AI 记忆系统

设置面板中的"AI 记忆系统"开关控制后台记忆提取功能：

- **开启后**：需填写一个廉价的记忆提取模型（如 `deepseek-chat`）。每次对话后，该模型会在后台分析对话内容，提取你的知识点掌握情况、薄弱点和学习偏好，写入 `memory.md` 和 `profile.md`
- **下次对话时**：记忆内容会自动注入系统提示，让 agent 了解你的学习历史和偏好，提供个性化辅导
- **记忆文件位置**：`data/<用户名>/memory.md`（学习记忆）和 `data/<用户名>/profile.md`（用户画像）

### 历史对话

点击导航栏的时钟图标查看历史对话：

- 每次切换知识块或点击 "+ NEW" 时，当前对话自动存档
- 存档存储在服务端 SQLite 数据库中，支持全文搜索
- 点击历史记录可恢复对话继续学习
- 恢复后的对话会从存档中删除（数据不重复）

### 进度查看

- 导航栏右侧显示 `N/8` 完成计数
- 点击进度区域展开 Block Status 面板，查看各块状态：
  - 灰色：未开始
  - 浅青 + 动画点：进行中
  - 深青 + ✓：已掌握

### 护眼模式

设置面板中切换：

- **护眼**（默认）：暖纸色画布 #f5f0e8，适合长时间学习
- **标准**：浅色画布 #fafaf8，适合明亮环境

### 多用户切换

点击导航栏用户名即可登出/切换账号。切换时当前对话自动存档，每个用户的数据完全隔离。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/blocks` | 获取所有知识块 |
| GET | `/api/models` | 检测可用模型列表 |
| POST | `/api/chat` | 发送消息，获取 agent 回复 |
| POST | `/api/upload` | 上传题目截图识别 |
| GET | `/api/progress/{username}` | 获取用户学习进度 |
| POST | `/api/progress/{username}` | 更新块掌握状态 |
| POST | `/api/sessions/{username}` | 保存对话会话 |
| GET | `/api/sessions/{username}` | 列出用户所有会话 |
| GET | `/api/sessions/{username}/search?q=` | FTS5 全文搜索会话（多词 OR 宽召回） |
| POST | `/api/sessions/{username}/search-summarize` | 搜索冷记忆 + LLM 摘要 |
| GET | `/api/sessions/{username}/{id}` | 获取单条会话详情 |
| DELETE | `/api/sessions/{username}/{id}` | 删除单条会话 |
| DELETE | `/api/sessions/{username}` | 清空用户全部会话 |
| POST | `/api/memory/review/{username}` | 触发后台记忆提取 |

## 项目结构

```
.
├── app/                    # FastAPI 后端
│   ├── main.py             # 应用入口 + 静态文件挂载
│   ├── routes.py           # API 端点定义
│   ├── llm.py              # LLMClient（代理转发 + Vision）
│   ├── prompts.py          # 苏格拉底系统提示词
│   ├── blocks.py           # 知识块字典定义
│   ├── progress.py         # JSON 进度持久化
│   └── memory.py           # SQLite 会话存储 + 记忆系统
├── static/                 # 前端（纯 HTML/JS/CSS，零构建工具）
│   ├── index.html          # 主页面
│   ├── css/
│   │   └── style.css       # 设计系统实现（1495 行）
│   └── js/
│       ├── nat.js          # 核心命名空间、state、工具函数
│       ├── nat-i18n.js     # 中英文国际化
│       ├── nat-settings.js # 设置面板 + 模型检测
│       ├── nat-history.js  # 会话持久化 + 历史管理
│       ├── nat-blocks.js   # 块选择器 + 进度 chips
│       ├── nat-math.js     # KaTeX + 数学键盘 + Markdown
│       ├── nat-chat.js     # 消息渲染 + API 调用 + 图表
│       └── nat-main.js     # 初始化 + 事件绑定 + 登录
├── tests/                  # 测试
│   ├── test_api.py         # 后端 pytest（71 个）
│   └── js/                 # 前端 Node test（68 个）
│       ├── setup.js        # JSDOM 测试环境
│       ├── nat-utils.test.js
│       ├── nat-state.test.js
│       └── nat-latex.test.js
├── data/                   # 用户数据（运行时生成，已 gitignore）
│   └── <username>/
│       ├── progress.json   # 学习进度
│       ├── sessions.db     # SQLite 对话历史
│       ├── memory.md       # AI 提取的学习记忆
│       └── profile.md      # 用户画像
├── DESIGN.md               # 设计系统规范（不可修改）
├── AGENTS.md               # Agent 协作配置
├── docs/agents/            # Agent skills 文档
└── pyproject.toml          # 项目配置
```

## 数据存储

本项目的用户数据分为两层：**浏览器 localStorage**（API 配置和 UI 偏好）和**服务端文件**（学习数据）。

### 服务端：`data/<username>/`

**目录结构：**

```
data/<username>/
├── progress.json    — 学习进度（status/mastery_level per block）
├── sessions.db      — SQLite 对话历史（FTS5 全文搜索）
├── memory.md        — AI 自动提取的学习记忆（知识点、弱项、偏好）
└── profile.md       — 用户画像（水平、风格、目标）
```

**progress.json 结构：**

```json
{
  "username": "张三",
  "blocks": {
    "interpolation": {
      "status": "mastered",
      "mastery_level": 3,
      "updated_at": "2026-07-25T08:30:12.456789+00:00"
    },
    "newton-method": {
      "status": "in-progress",
      "mastery_level": 1,
      "updated_at": "2026-07-25T09:15:03.123456+00:00"
    }
  }
}
```

**状态自动推导规则：**
- `mastery_level >= 3` → status 自动设为 `"mastered"`
- `mastery_level >= 1` 且当前 status 为 `"not-started"` → 自动设为 `"in-progress"`

**注意事项：**
- 每个用户独立子目录，互不干扰
- `data/` 目录已加入 `.gitignore`，不会被提交到版本控制
- `data/` 不在 uvicorn 热重载监控范围（`reload_dirs` 白名单），写入不会触发服务重启

---

### 客户端：localStorage

**前缀：** 所有 key 以 `nat-` 开头。

**全局 key（跨用户共享）：**

| Key | 说明 |
|-----|------|
| `nat-username` | 上次登录的用户名 |
| `nat-lang` | 语言偏好（zh/en） |
| `nat-theme` | 主题（eye-protection/standard） |

**Per-user key（格式 `nat-{key}-{username}`）：**

| Key | 说明 |
|-----|------|
| `nat-api-key-{user}` | API Key（绝不离开浏览器） |
| `nat-model-{user}` | 模型名称 |
| `nat-api-base-{user}` | API 地址 |
| `nat-memory-enable-{user}` | 记忆系统开关（"0"/"1"） |
| `nat-mem-model-{user}` | 记忆提取模型 |
| `nat-session-{user}` | 当前会话缓存（作为 API 失败时的 fallback） |
| `nat-history-{user}` | 历史对话列表（作为 API 失败时的 fallback） |

**设计原则：**
- API Key/Model/API Base 仅存浏览器，不上传服务器
- 学习数据（进度/会话/记忆）存服务端，跨浏览器保持
- localStorage 作为服务端不可用时的 fallback
- 切换账号时所有设置和数据完全隔离

## 运行测试

```bash
# 后端测试（71 个）
uv run pytest tests/ -q

# 前端测试（68 个）
npm test
```

## CI/CD

GitHub Actions 自动运行：
- **Backend**：`uv sync --frozen` + `uv run pytest tests/ -q`
- **Frontend**：`npm ci` + `npm test`

## 设计系统

视觉设计遵循 "精密笔记本"（Precision Notebook）风格，详见 `DESIGN.md`：

- 暖纸色护眼画布，模拟纸质教材色温
- 单一深青强调色（#1a5c5c），所有交互元素统一
- Inter Variable 字体，sub-default weights（460/540/600）
- 大写 + 1.5px 字距知识块标签（工程精密感）
- 720px 居中对话列宽，1px hairline 定义结构

## 环境变量

| 变量 | 必须 | 默认值 | 说明 |
|------|------|--------|------|
| `LLM_API_KEY` | 否* | — | LLM API 密钥（也接受 `OPENAI_API_KEY`） |
| `LLM_MODEL` | 否 | `gpt-4o` | 使用的模型名称 |
| `LLM_API_BASE` | 否 | `https://api.openai.com/v1` | API 基础地址 |

> \* 如果用户通过浏览器设置面板提供了 API Key，则不需要环境变量。

## 开发说明

### 添加新知识块

在 `app/blocks.py` 的 `BLOCKS` 字典中添加新条目：

```python
"my-new-block": {
    "slug": "my-new-block",
    "title": "My New Topic",
    "title_zh": "新主题（My New Topic）",
    "topic": "Category Name",
    "topic_zh": "分类（Category Name）",
    "description": "What this block covers...",
    "description_zh": "本块涵盖的内容...",
    "mastery_levels": [
        "Can execute the algorithm step by step",
        "Can choose when to apply this method",
        "Understands convergence and error bounds",
    ],
    "mastery_levels_zh": [
        "能手动执行算法",
        "能选择合适的方法",
        "理解收敛性和误差界",
    ],
}
```

前端导航栏会自动从 `GET /api/blocks` 拉取，无需修改前端代码。

### 调整教学策略

编辑 `app/prompts.py` 中的 `SOCRATIC_SYSTEM_PROMPT`。这是整个教学设计的核心文件——提示升级规则、前置知识流程、掌握确认逻辑都在这里定义。

### 前端架构原则

- **零构建工具**：纯 `<script>` 标签加载，不引入 npm/esbuild/vite
- **命名空间模式**：所有模块挂到 `window.NAT`，`NAT.state` 跨模块共享
- **加载顺序即依赖顺序**：`nat.js` → `nat-i18n.js` → `nat-settings.js` → `nat-history.js` → `nat-blocks.js` → `nat-math.js` → `nat-chat.js` → `nat-main.js`
- 修改一个模块的函数签名时，需检查所有调用方

## License

MIT