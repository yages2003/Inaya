"""
Inaya — FastAPI application entry point.
Run:  uvicorn main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, projects, tasks, assignees, activity, ai_router

app = FastAPI(title="Inaya",
              description="Project Management & Collaboration Tool — S2-C-03",
              version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "Inaya"}


app.include_router(auth_router.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(assignees.router)
app.include_router(activity.router)
app.include_router(ai_router.router)