"""Knowledge block definitions for Numerical Analysis Tutor.

Blocks are organized as a dictionary keyed by slug, referencing Sauer,
"Numerical Analysis" (latest edition) subsection granularity.
Prerequisites are determined dynamically by the LLM at runtime —
no hardcoded DAG. See system prompt for prerequisite flow.

Each block has both English (title/topic/description) and Chinese
(title_zh/topic_zh/description_zh) fields for bilingual support.
"""

from typing import TypedDict


class BlockMetadata(TypedDict):
    """Metadata for a knowledge block."""
    slug: str
    title: str
    title_zh: str
    topic: str
    topic_zh: str
    description: str
    description_zh: str
    mastery_levels: list[str]
    mastery_levels_zh: list[str]


# Full list of initial knowledge blocks
BLOCKS: dict[str, BlockMetadata] = {
    "interpolation": {
        "slug": "interpolation",
        "title": "Interpolation",
        "title_zh": "插值法（Interpolation）",
        "topic": "Interpolation",
        "topic_zh": "插值（Interpolation）",
        "description": "Polynomial interpolation, Lagrange basis, Newton's divided differences, error bounds",
        "description_zh": "多项式插值、拉格朗日基函数、牛顿差商、误差界",
        "mastery_levels": [
            "Construct Lagrange and Newton interpolating polynomials",
            "Select appropriate interpolation method for data characteristics",
            "Understand interpolation error and Runge's phenomenon",
        ],
        "mastery_levels_zh": [
            "能构造拉格朗日和牛顿插值多项式",
            "能根据数据特征选择合适的插值方法",
            "理解插值误差和龙格现象（Runge's Phenomenon）",
        ],
    },
    "newton-method": {
        "slug": "newton-method",
        "title": "Newton's Method",
        "title_zh": "牛顿法（Newton's Method）",
        "topic": "Nonlinear Equations",
        "topic_zh": "非线性方程（Nonlinear Equations）",
        "description": "Newton-Raphson iteration for root-finding, convergence analysis, modifications",
        "description_zh": "牛顿-拉夫森迭代求根、收敛性分析、改进方法",
        "mastery_levels": [
            "Apply Newton's method to find roots of a function",
            "Choose between Newton, secant, and bisection methods",
            "Understand quadratic convergence and failure cases",
        ],
        "mastery_levels_zh": [
            "能手动执行牛顿法迭代求根",
            "能在牛顿法、割线法、二分法之间做出选择",
            "理解二次收敛性及失败情形",
        ],
    },
    "gauss-elimination": {
        "slug": "gauss-elimination",
        "title": "Gaussian Elimination",
        "title_zh": "高斯消元法（Gaussian Elimination）",
        "topic": "Linear Systems",
        "topic_zh": "线性方程组（Linear Systems）",
        "description": "Naive Gaussian elimination, partial pivoting, LU decomposition, operation counts",
        "description_zh": "朴素高斯消元、列主元消去、LU 分解、运算量分析",
        "mastery_levels": [
            "Perform Gaussian elimination with partial pivoting",
            "Select elimination strategy based on matrix properties",
            "Analyze stability, pivoting strategies, and operation complexity",
        ],
        "mastery_levels_zh": [
            "能执行带列主元的高斯消元",
            "能根据矩阵性质选择消元策略",
            "分析稳定性、选主元策略和运算复杂度",
        ],
    },
    "numerical-integration": {
        "slug": "numerical-integration",
        "title": "Numerical Integration",
        "title_zh": "数值积分（Numerical Integration）",
        "topic": "Integration",
        "topic_zh": "积分（Integration）",
        "description": "Newton-Cotes formulas, trapezoidal rule, Simpson's rule, Romberg integration, Gaussian quadrature",
        "description_zh": "牛顿-柯特斯公式、梯形法则、辛普森法则、龙贝格积分、高斯求积",
        "mastery_levels": [
            "Apply trapezoidal and Simpson's rules to approximate integrals",
            "Choose quadrature method based on accuracy requirements",
            "Understand error estimates, convergence order, and adaptive quadrature",
        ],
        "mastery_levels_zh": [
            "能用梯形法和辛普森法近似计算积分",
            "能根据精度要求选择求积方法",
            "理解误差估计、收敛阶和自适应求积",
        ],
    },
    "runge-kutta": {
        "slug": "runge-kutta",
        "title": "Runge-Kutta Methods",
        "title_zh": "龙格-库塔方法（Runge-Kutta Methods）",
        "topic": "Ordinary Differential Equations",
        "topic_zh": "常微分方程（Ordinary Differential Equations）",
        "description": "Initial value problems, Euler's method, RK2, RK4, stability regions, systems of ODEs",
        "description_zh": "初值问题、欧拉法、RK2、RK4、稳定性区域、常微分方程组",
        "mastery_levels": [
            "Implement RK2 and RK4 for a single ODE",
            "Select step size and method order for accuracy/stability",
            "Understand local truncation error, global error, and stability constraints",
        ],
        "mastery_levels_zh": [
            "能对单个常微分方程实现 RK2 和 RK4",
            "能为精度/稳定性选择合适的步长和方法阶数",
            "理解局部截断误差、全局误差和稳定性约束",
        ],
    },
    "lu-decomposition": {
        "slug": "lu-decomposition",
        "title": "LU Decomposition",
        "title_zh": "LU 分解（LU Decomposition）",
        "topic": "Linear Systems",
        "topic_zh": "线性方程组（Linear Systems）",
        "description": "LU factorization, Cholesky decomposition, forward/backward substitution, applications",
        "description_zh": "LU 分解、乔列斯基分解、前代/回代、应用",
        "mastery_levels": [
            "Compute LU decomposition and use it to solve linear systems",
            "Determine when LU vs Cholesky vs LDL^T is appropriate",
            "Analyze computational cost and numerical stability of factorizations",
        ],
        "mastery_levels_zh": [
            "能计算 LU 分解并用其求解线性方程组",
            "能判断何时使用 LU、Cholesky 或 LDL^T 分解",
            "分析分解的计算代价和数值稳定性",
        ],
    },
    "fixed-point-iteration": {
        "slug": "fixed-point-iteration",
        "title": "Fixed-Point Iteration",
        "title_zh": "不动点迭代（Fixed-Point Iteration）",
        "topic": "Nonlinear Equations",
        "topic_zh": "非线性方程（Nonlinear Equations）",
        "description": "Fixed-point theory, contraction mapping, functional iteration, convergence rate",
        "description_zh": "不动点理论、压缩映射、函数迭代、收敛速度",
        "mastery_levels": [
            "Transform a root-finding problem into a fixed-point iteration",
            "Select appropriate iteration function for guaranteed convergence",
            "Analyze convergence conditions via the contraction mapping theorem",
        ],
        "mastery_levels_zh": [
            "能将求根问题转化为不动点迭代",
            "能选择保证收敛的迭代函数",
            "通过压缩映射定理分析收敛条件",
        ],
    },
    "eigenvalues": {
        "slug": "eigenvalues",
        "title": "Eigenvalue Methods",
        "title_zh": "特征值方法（Eigenvalue Methods）",
        "topic": "Linear Systems",
        "topic_zh": "线性方程组（Linear Systems）",
        "description": "Power method, inverse iteration, QR algorithm, eigenvalue decompositions",
        "description_zh": "幂法、反迭代、QR 算法、特征值分解",
        "mastery_levels": [
            "Compute dominant eigenvalues using the power method",
            "Select eigenvalue algorithm based on matrix size and structure",
            "Understand convergence rates and shift strategies",
        ],
        "mastery_levels_zh": [
            "能用幂法计算主特征值",
            "能根据矩阵大小和结构选择特征值算法",
            "理解收敛率和位移策略",
        ],
    },
}


def get_block(slug: str) -> BlockMetadata | None:
    """Get a block by its slug. Returns None if not found."""
    return BLOCKS.get(slug)


def get_block_context(slug: str | None, lang: str = "en") -> str:
    """Get a context string for the given block slug for the system prompt.

    Returns an empty string if the block is not found or slug is None.
    Supports bilingual output: lang="zh" returns Chinese fields.
    """
    if not slug:
        return ""

    block = BLOCKS.get(slug)
    if block is None:
        return ""

    suf = "_zh" if lang == "zh" else ""
    levels_key = f"mastery_levels{suf}"
    levels_text = "\n".join(
        f"- Level {i+1}: {m}"
        for i, m in enumerate(block.get(levels_key, block["mastery_levels"]))
    )

    return f"""## Current Knowledge Block: {block[f'title{suf}']}

Topic: {block[f'topic{suf}']}
Description: {block[f'description{suf}']}

Mastery goals for this block:
{levels_text}

Always scope your teaching to this block. If the student asks about a different
topic, gently redirect or note that it will be covered in another block.
Start by assessing the student's current level before proceeding with new material."""