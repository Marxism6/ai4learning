"""FastAPI application for the Socratic Numerical Analysis Tutor."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle."""
    logger.info("Starting Numerical Analysis Tutor server")
    yield
    logger.info("Shutting down Numerical Analysis Tutor server")


app = FastAPI(
    title="Numerical Analysis Tutor",
    description="Socratic tutoring agent for Numerical Analysis",
    version="0.1.0",
    lifespan=lifespan,
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register API routes
app.include_router(router, prefix="/api")

# Root serves the frontend
from fastapi.responses import FileResponse


@app.get("/")
async def index():
    return FileResponse("static/index.html")


@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


def run():
    """Entry point for `uv run serve`."""
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_excludes=["data", ".scratch", ".git", "node_modules"],
    )


if __name__ == "__main__":
    run()