from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.init_db import init_db
from app.api import resources, staff, tasks, constraints, schedules, dashboard, import_csv, scenarios, audit, demo

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="AirOps API", version="1.0.0", description="Air Operations Resource Planning & Optimisation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "AirOps API"}

app.include_router(resources.router, prefix="/api")
app.include_router(staff.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(constraints.router, prefix="/api")
app.include_router(schedules.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(import_csv.router, prefix="/api")
app.include_router(scenarios.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
