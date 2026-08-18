from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.focus import router as focus_router
from app.api.v1.goals import router as goals_router


app = FastAPI(
    title="Life Progress API",
    description=(
        "Backend API for tracking work, fitness, nutrition, "
        "self-care, sleep, goals, focus, and daily progress."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTES
# ============================================================

app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    tasks_router,
    prefix="/api/v1",
)

app.include_router(
    focus_router,
    prefix="/api/v1",
)

app.include_router(
    goals_router,
    prefix="/api/v1",
)


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/health",
    tags=["Health"],
)
async def health_check() -> dict[str, str]:

    return {
        "status": "ok",
        "service": "life-progress-api",
    }