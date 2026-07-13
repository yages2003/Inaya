"""
Inaya — FastAPI application entry point.
Run:  uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import projects, tasks, assignees, activity

app = FastAPI(
    title="Inaya API",
    description="Project Management & Collaboration Tool — backend API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "Inaya"}


app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(assignees.router)
app.include_router(activity.router)