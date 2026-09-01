"""Inaya — AI routes (Week 7-8): effort estimation, summaries, risk signals."""
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from database import get_db
from deps import require, get_current_user
from permissions import Perm
from ai.groq_estimator import estimate_task_effort

router = APIRouter(prefix="/ai", tags=["AI"])


class EstimateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    category: str = "development"
    priority: str = "medium"


class EstimateResponse(BaseModel):
    estimated_hours: int
    rationale: str
    source: str          # "groq" or "fallback"
    model: Optional[str] = None


@router.post("/estimate", response_model=EstimateResponse)
def estimate_effort(payload: EstimateRequest,
                    user: models.User = Depends(require(Perm.task_create))):
    """Predict effort hours for a task via Groq (Llama 3.3 70B), with fallback."""
    return estimate_task_effort(
        title=payload.title, description=payload.description,
        category=payload.category, priority=payload.priority)


@router.post("/tasks/{task_id}/estimate", response_model=EstimateResponse)
def estimate_existing_task(task_id: int,
                           user: models.User = Depends(require(Perm.task_edit_any)),
                           db: Session = Depends(get_db)):
    """Estimate an existing task and save the prediction to ai_predicted_hours."""
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    result = estimate_task_effort(
        title=task.title, description=task.description or "",
        category=task.category.value, priority=task.priority.value)
    task.ai_predicted_hours = result["estimated_hours"]
    db.commit()
    return result


# ======================= Week 8: summaries + risk signals =======================

from datetime import datetime
from typing import List
from ai.metrics import compute_project_metrics
from ai.gemini_summarizer import generate_summary
from ai.risk_detector import detect_risks
import crud


class AISummaryOut(BaseModel):
    project_id: int
    progress_summary: Optional[str] = None
    executive_narrative: Optional[str] = None
    operational_narrative: Optional[str] = None
    tasks_total: Optional[int] = None
    tasks_completed: Optional[int] = None
    completion_pct: Optional[int] = None
    derived_status: Optional[str] = None
    model_used: Optional[str] = None
    source: Optional[str] = None
    generated_at: Optional[datetime] = None


class RiskOut(BaseModel):
    id: int
    scenario: str
    level: str
    explanation: str
    recommendation: Optional[str] = None
    detected_at: datetime


class InsightsOut(BaseModel):
    summary: AISummaryOut
    risks: List[RiskOut]


def _persist_summary(db, project, result, m):
    row = db.query(models.ProjectAISummary).filter(
        models.ProjectAISummary.project_id == project.id).first()
    if not row:
        row = models.ProjectAISummary(project_id=project.id)
        db.add(row)
    row.progress_summary = result["progress_summary"]
    row.executive_narrative = result["executive_narrative"]
    row.operational_narrative = result["operational_narrative"]
    row.tasks_total = m["total_tasks"]
    row.tasks_completed = m["done"]
    row.completion_pct = m["completion_pct"]
    row.derived_status = models.ProjectStatus(result["derived_status"])
    row.model_used = result["model"] or "fallback"
    db.commit(); db.refresh(row)
    return row


def _persist_risks(db, project, risks):
    # replace previous signals for this project
    db.query(models.RiskSignal).filter(
        models.RiskSignal.project_id == project.id).delete()
    saved = []
    for r in risks:
        row = models.RiskSignal(
            project_id=project.id, scenario=r["scenario"],
            level=models.RiskLevel(r["level"]), explanation=r["explanation"],
            recommendation=r.get("recommendation"))
        db.add(row); saved.append(row)
    db.commit()
    for row in saved:
        db.refresh(row)
    return saved


def _summary_out(project_id, row, source=None):
    if not row:
        return {"project_id": project_id}
    return {
        "project_id": project_id,
        "progress_summary": row.progress_summary,
        "executive_narrative": row.executive_narrative,
        "operational_narrative": row.operational_narrative,
        "tasks_total": row.tasks_total, "tasks_completed": row.tasks_completed,
        "completion_pct": row.completion_pct,
        "derived_status": row.derived_status.value if row.derived_status else None,
        "model_used": row.model_used, "source": source,
        "generated_at": row.generated_at,
    }


def _risks_out(risks):
    return [{
        "id": r.id, "scenario": r.scenario, "level": r.level.value,
        "explanation": r.explanation, "recommendation": r.recommendation,
        "detected_at": r.detected_at,
    } for r in risks]


@router.post("/projects/{project_id}/generate", response_model=InsightsOut)
def generate_insights(project_id: int,
                      user: models.User = Depends(require(Perm.project_view)),
                      db: Session = Depends(get_db)):
    """Run Gemini summary + risk detection for a project and persist both."""
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    m = compute_project_metrics(project)
    result = generate_summary(m)
    risks = detect_risks(m)
    row = _persist_summary(db, project, result, m)
    saved = _persist_risks(db, project, risks)
    return {
        "summary": _summary_out(project_id, row, source=result["source"]),
        "risks": _risks_out(saved),
    }


@router.post("/projects/{project_id}/summary", response_model=AISummaryOut)
def generate_project_summary(project_id: int,
                             user: models.User = Depends(require(Perm.project_view)),
                             db: Session = Depends(get_db)):
    """Run only the Gemini progress summary + narratives for a project (no risk analysis)."""
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    m = compute_project_metrics(project)
    result = generate_summary(m)
    row = _persist_summary(db, project, result, m)
    return _summary_out(project_id, row, source=result["source"])


@router.get("/projects/{project_id}/narrative", response_model=dict)
def get_project_narrative(project_id: int,
                          format: str = "executive",
                          user: models.User = Depends(require(Perm.project_view)),
                          db: Session = Depends(get_db)):
    """Return one narrative format (executive|operational) from the last-generated summary."""
    if format not in ("executive", "operational"):
        raise HTTPException(status_code=422, detail="format must be 'executive' or 'operational'.")
    row = db.query(models.ProjectAISummary).filter(
        models.ProjectAISummary.project_id == project_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="No AI summary generated yet for this project.")
    narrative = row.executive_narrative if format == "executive" else row.operational_narrative
    return {"project_id": project_id, "format": format, "narrative": narrative,
            "generated_at": row.generated_at}


@router.post("/projects/{project_id}/risks/analyze", response_model=List[RiskOut])
def analyze_project_risks(project_id: int,
                          user: models.User = Depends(require(Perm.project_view)),
                          db: Session = Depends(get_db)):
    """Run only risk detection for a project and persist the resulting signals."""
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    m = compute_project_metrics(project)
    risks = detect_risks(m)
    saved = _persist_risks(db, project, risks)
    return _risks_out(saved)


@router.get("/projects/{project_id}/risks", response_model=List[RiskOut])
def list_project_risks(project_id: int,
                       user: models.User = Depends(require(Perm.project_view)),
                       db: Session = Depends(get_db)):
    """Return the project's currently active risk signals (no AI call)."""
    risks = db.query(models.RiskSignal).filter(
        models.RiskSignal.project_id == project_id,
        models.RiskSignal.is_active == 1).all()
    return _risks_out(risks)


@router.get("/projects/{project_id}/history", response_model=List[AISummaryOut])
def get_project_ai_history(project_id: int,
                           user: models.User = Depends(require(Perm.project_view)),
                           db: Session = Depends(get_db)):
    """
    Return AI summary history for a project. The schema keeps only the latest
    summary per project (no versioned history table), so this returns that
    single most-recent summary wrapped in a list for API shape compatibility.
    """
    row = db.query(models.ProjectAISummary).filter(
        models.ProjectAISummary.project_id == project_id).first()
    if not row:
        return []
    return [_summary_out(project_id, row)]


@router.get("/projects/{project_id}/insights", response_model=InsightsOut)
def get_insights(project_id: int,
                 user: models.User = Depends(require(Perm.project_view)),
                 db: Session = Depends(get_db)):
    """Read the last-generated summary + risks for a project (no AI call)."""
    row = db.query(models.ProjectAISummary).filter(
        models.ProjectAISummary.project_id == project_id).first()
    risks = db.query(models.RiskSignal).filter(
        models.RiskSignal.project_id == project_id).all()
    summary = None
    if row:
        summary = {
            "project_id": project_id,
            "progress_summary": row.progress_summary,
            "executive_narrative": row.executive_narrative,
            "operational_narrative": row.operational_narrative,
            "tasks_total": row.tasks_total, "tasks_completed": row.tasks_completed,
            "completion_pct": row.completion_pct,
            "derived_status": row.derived_status.value if row.derived_status else None,
            "model_used": row.model_used, "source": None,
            "generated_at": row.generated_at,
        }
    else:
        summary = {"project_id": project_id}
    return {
        "summary": summary,
        "risks": [{
            "id": r.id, "scenario": r.scenario, "level": r.level.value,
            "explanation": r.explanation, "recommendation": r.recommendation,
            "detected_at": r.detected_at,
        } for r in risks],
    }