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
- **跨会话记忆**：可选开启，agent 记住已掌握的块，不重复检查前置知识
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
│  │  static/js/chat.js     (交互逻辑)         │  │
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
│  │  app/progress.py JSON 文件持久化          │  │
│  └──────────────────┬────────────────────────┘  │
└─────────────────────┼───────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────┐
│  OpenAI-compatible LLM API                      │
│  (API key 从环境变量读取，不暴露给前端)          │
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

### 3. 设置环境变量

```bash
# 必须：LLM API 密钥
export LLM_API_KEY="sk-your-key-here"

# 可选：自定义模型（默认 gpt-4o）
export LLM_MODEL="gpt-4o"

# 可选：自定义 API 地址（默认 https://api.openai.com/v1）
export LLM_API_BASE="https://api.openai.com/v1"
```

支持的 API 服务：OpenAI、Azure OpenAI、DeepSeek、Moonshot、本地 Ollama 等任何 OpenAI-compatible 端点。

### 4. 启动服务

```bash
uv run serve
```

### 5. 打开浏览器

访问 http://localhost:8000

## 使用指南

### 首次使用

1. 打开页面后输入用户名（用于区分不同学习者的进度）
2. 进入主界面，顶部导航栏显示所有知识块

### 学习流程

1. **选择知识块**：点击顶部 tab（如 `NEWTON METHOD`），agent 会主动开始评估你的水平
2. **对话引导**：agent 通过提问引导你思考，不会直接给答案
3. **前置知识补讲**：如果你缺少前置知识，agent 会在对话中补讲并出验证题确认
4. **提示升级**：卡住时 agent 会逐步给提示（反问 → 线索 → 部分解 → 完整解释）
5. **掌握确认**：通过三级验证后，进度自动更新为 mastered

### 自由提问

不选择任何知识块时，可以直接在输入框提问任何计算方法相关问题，agent 仍以苏格拉底方式引导。

### 上传题目

点击输入栏左侧的图片按钮，上传题目截图（PNG/JPG/WEBP，最大 10MB）。agent 会识别题目内容并开始引导。

### 进度查看

- 导航栏右侧显示 `N/8` 完成计数
- 点击进度区域展开 Block Status 面板，查看各块状态：
  - 灰色：未开始
  - 浅青：进行中
  - 深青 + ✓：已掌握

### 跨会话记忆

导航栏的 `MEM` 开关控制跨会话记忆：
- **开启**：下次对话时 agent 知道你已掌握哪些块，不重复检查
- **关闭**：每次对话从零开始

### 护眼模式

导航栏右侧 `EYE / STD` 切换：
- **EYE**（默认）：暖纸色画布 #f5f0e8，适合长时间学习
- **STD**：标准浅色画布 #fafaf8，适合明亮环境

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/blocks` | 获取所有知识块 |
| POST | `/api/chat` | 发送消息，获取 agent 回复 |
| GET | `/api/progress/{username}` | 获取用户进度 |
| POST | `/api/progress/{username}` | 更新块掌握状态 |
| POST | `/api/upload` | 上传题目截图识别 |

## 项目结构

```
.
├── app/                    # FastAPI 后端
│   ├── main.py             # 应用入口 + 静态文件挂载
│   ├── routes.py           # API 端点定义
│   ├── llm.py              # LLMClient（代理转发 + Vision）
│   ├── prompts.py          # 苏格拉底系统提示词
│   ├── blocks.py           # 知识块字典定义
│   └── progress.py         # JSON 文件读写
├── static/                 # 前端（纯 HTML/JS/CSS）
│   ├── index.html          # 主页面
│   ├── css/style.css       # 设计系统实现
│   └── js/chat.js          # 交互逻辑
├── tests/                  # 测试（pytest）
│   ├── test_api.py
│   ├── test_blocks.py
│   ├── test_progress.py
│   └── test_prompts.py
├── data/                   # 用户进度 JSON（运行时生成）
├── DESIGN.md               # 设计系统规范
├── AGENTS.md               # Agent 协作配置
├── docs/agents/            # Agent skills 文档
└── pyproject.toml          # 项目配置
```

## 运行测试

```bash
uv run pytest tests/ -q
```

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
| `LLM_API_KEY` | 是 | — | LLM API 密钥（也接受 `OPENAI_API_KEY`） |
| `LLM_MODEL` | 否 | `gpt-4o` | 使用的模型名称 |
| `LLM_API_BASE` | 否 | `https://api.openai.com/v1` | API 基础地址 |

## 开发说明

### 添加新知识块

在 `app/blocks.py` 的 `BLOCKS` 字典中添加新条目：

```python
"my-new-block": {
    "title": "My New Topic",
    "topic": "Category Name",
    "description": "What this block covers...",
    "mastery_levels": {
        1: "Can execute the algorithm step by step",
        2: "Can choose when to apply this method",
        3: "Understands convergence and error bounds",
    },
}
```

前端导航栏会自动从 `GET /api/blocks` 拉取，无需修改前端代码。

### 调整教学策略

编辑 `app/prompts.py` 中的 `SOCRATIC_SYSTEM_PROMPT`。这是整个教学设计的核心文件——提示升级规则、前置知识流程、掌握确认逻辑都在这里定义。

## License

MIT
