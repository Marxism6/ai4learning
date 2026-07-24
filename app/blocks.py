"""Knowledge block definitions for Numerical Analysis Tutor.

Blocks are organized as a dictionary keyed by slug, referencing Sauer,
"Numerical Analysis" (latest edition) subsection granularity.
Prerequisites are determined dynamically by the LLM at runtime —
no hardcoded DAG. See system prompt for prerequisite flow.
"""

from typing import TypedDict


class BlockMetadata(TypedDict):
    """Metadata for a knowledge block."""
    slug: str
    title: str
    topic: str
    description: str
    mastery_levels: list[str]


# Full list of initial knowledge blocks
BLOCKS: dict[str, BlockMetadata] = {
    "interpolation": {
        "slug": "interpolation",
        "title": "Interpolation",
        "topic": "Interpolation",
        "description": "Polynomial interpolation, Lagrange basis, Newton's divided differences, error bounds",
        "mastery_levels": [
            "Construct Lagrange and Newton interpolating polynomials",
            "Select appropriate interpolation method for data characteristics",
            "Understand interpolation error and Runge's phenomenon",
        ],
    },
    "newton-method": {
        "slug": "newton-method",
        "title": "Newton's Method",
        "topic": "Nonlinear Equations",
        "description": "Newton-Raphson iteration for root-finding, convergence analysis, modifications",
        "mastery_levels": [
            "Apply Newton's method to find roots of a function",
            "Choose between Newton, secant, and bisection methods",
            "Understand quadratic convergence and failure cases",
        ],
    },
    "gauss-elimination": {
        "slug": "gauss-elimination",
        "title": "Gaussian Elimination",
        "topic": "Linear Systems",
        "description": "Naive Gaussian elimination, partial pivoting, LU decomposition, operation counts",
        "mastery_levels": [
            "Perform Gaussian elimination with partial pivoting",
            "Select elimination strategy based on matrix properties",
            "Analyze stability, pivoting strategies, and operation complexity",
        ],
    },
    "numerical-integration": {
        "slug": "numerical-integration",
        "title": "Numerical Integration",
        "topic": "Integration",
        "description": "Newton-Cotes formulas, trapezoidal rule, Simpson's rule, Romberg integration, Gaussian quadrature",
        "mastery_levels": [
            "Apply trapezoidal and Simpson's rules to approximate integrals",
            "Choose quadrature method based on accuracy requirements",
            "Understand error estimates, convergence order, and adaptive quadrature",
        ],
    },
    "runge-kutta": {
        "slug": "runge-kutta",
        "title": "Runge-Kutta Methods",
        "topic": "Ordinary Differential Equations",
        "description": "Initial value problems, Euler's method, RK2, RK4, stability regions, systems of ODEs",
        "mastery_levels": [
            "Implement RK2 and RK4 for a single ODE",
            "Select step size and method order for accuracy/stability",
            "Understand local truncation error, global error, and stability constraints",
        ],
    },
    "lu-decomposition": {
        "slug": "lu-decomposition",
        "title": "LU Decomposition",
        "topic": "Linear Systems",
        "description": "LU factorization, Cholesky decomposition, forward/backward substitution, applications",
        "mastery_levels": [
            "Compute LU decomposition and use it to solve linear systems",
            "Determine when LU vs Cholesky vs LDL^T is appropriate",
            "Analyze computational cost and numerical stability of factorizations",
        ],
    },
    "fixed-point-iteration": {
        "slug": "fixed-point-iteration",
        "title": "Fixed-Point Iteration",
        "topic": "Nonlinear Equations",
        "description": "Fixed-point theory, contraction mapping, functional iteration, convergence rate",
        "mastery_levels": [
            "Transform a root-finding problem into a fixed-point iteration",
            "Select appropriate iteration function for guaranteed convergence",
            "Analyze convergence conditions via the contraction mapping theorem",
        ],
    },
    "eigenvalues": {
        "slug": "eigenvalues",
        "title": "Eigenvalue Methods",
        "topic": "Linear Systems",
        "description": "Power method, inverse iteration, QR algorithm, eigenvalue decompositions",
        "mastery_levels": [
            "Compute dominant eigenvalues using the power method",
            "Select eigenvalue algorithm based on matrix size and structure",
            "Understand convergence rates and shift strategies",
        ],
    },
}


def get_block(slug: str) -> BlockMetadata | None:
    """Get a block by its slug. Returns None if not found."""
    return BLOCKS.get(slug)


def get_block_context(slug: str | None) -> str:
    """Get a context string for the given block slug for the system prompt.

    Returns an empty string if the block is not found or slug is None.
    Prerequisites info is intentionally omitted — the LLM determines
    them dynamically at runtime per the Socratic prompt specification.
    """
    if slug is None or slug == "":
        return ""

    block = BLOCKS.get(slug)
    if block is None:
        return ""

    levels_text = "\n".join(
        f"- Level {i+1}: {level}"
        for i, level in enumerate(block["mastery_levels"])
    )

    return f"""## Current Knowledge Block: {block['title']}

Topic: {block['topic']}
Description: {block['description']}

Mastery goals for this block:
{levels_text}

Always scope your teaching to this block. If the student asks about a different
topic, gently redirect or note that it will be covered in another block.
Start by assessing the student's current level before proceeding with new material."""