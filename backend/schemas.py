"""
Inaya — Pydantic schemas (request/response validation layer).
These sit between the API and the SQLAlchemy models.
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from models import (
    ProjectStatus,
    TaskStatus,
    TaskCategory,
    TaskPriority,
    RiskLevel,
)


# ---------------------------------------------------------------------------
# Assignee
# ---------------------------------------------------------------------------

class AssigneeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    email: EmailStr
    role: Optional[str] = Field(None, max_length=120)


class AssigneeCreate(AssigneeBase):
    pass


class AssigneeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, max_length=120)
    is_active: Optional[int] = Field(None, ge=0, le=1)


class AssigneeOut(AssigneeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------

class CommentBase(BaseModel):
    content: str = Field(..., min_length=1)
    author_id: Optional[int] = None


class CommentCreate(CommentBase):
    pass


class CommentOut(CommentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.todo
    category: TaskCategory = TaskCategory.development
    priority: TaskPriority = TaskPriority.medium
    estimated_hours: Optional[int] = Field(None, ge=0)
    start_date: Optional[date] = None
    due_date: Optional[date] = None


class TaskCreate(TaskBase):
    project_id: int
    assignee_ids: List[int] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    category: Optional[TaskCategory] = None
    priority: Optional[TaskPriority] = None
    estimated_hours: Optional[int] = Field(None, ge=0)
    actual_hours: Optional[int] = Field(None, ge=0)
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    assignee_ids: Optional[List[int]] = None


class TaskOut(TaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    ai_predicted_hours: Optional[int] = None
    actual_hours: Optional[int] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    assignees: List[AssigneeOut] = []
    comments: List[CommentOut] = []


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.on_track
    start_date: date
    end_date: date


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class ProjectDetailOut(ProjectOut):
    """Project with its tasks nested — used for the detail view."""
    tasks: List[TaskOut] = []


# ---------------------------------------------------------------------------
# Activity
# ---------------------------------------------------------------------------

class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_type: str
    description: str
    project_id: int
    task_id: Optional[int] = None
    actor_id: Optional[int] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# AI output
# ---------------------------------------------------------------------------

class RiskSignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    scenario: str
    level: RiskLevel
    explanation: str
    recommendation: Optional[str] = None
    is_active: int
    detected_at: datetime


class ProjectAISummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    progress_summary: Optional[str] = None
    executive_narrative: Optional[str] = None
    operational_narrative: Optional[str] = None
    tasks_total: Optional[int] = None
    tasks_completed: Optional[int] = None
    completion_pct: Optional[int] = None
    derived_status: Optional[ProjectStatus] = None
    model_used: Optional[str] = None
    generated_at: datetime