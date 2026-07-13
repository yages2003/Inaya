"""
Inaya — Project Management & Collaboration Tool
SQLAlchemy ORM models with production-grade constraints.

Design principles enforced here:
  * Native PostgreSQL ENUM types (invalid values rejected by the DB).
  * Referential integrity via FKs with explicit ON DELETE behaviour.
  * Audit columns (created_at / updated_at) on every business table.
  * CHECK constraints for logical invariants (date ordering, non-negative effort).
  * Indexes on foreign keys and frequently-filtered columns.
  * Many-to-many tasks <-> assignees through an association table.
"""

import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    CheckConstraint,
    UniqueConstraint,
    Index,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


# ---------------------------------------------------------------------------
# Enumerations (rendered as native PostgreSQL ENUM types)
# ---------------------------------------------------------------------------

class ProjectStatus(str, enum.Enum):
    on_track = "on_track"
    at_risk = "at_risk"
    delayed = "delayed"
    completed = "completed"


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    review = "review"
    done = "done"
    blocked = "blocked"


class TaskCategory(str, enum.Enum):
    development = "development"
    design = "design"
    testing = "testing"
    documentation = "documentation"
    research = "research"


class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class NarrativeFormat(str, enum.Enum):
    executive_summary = "executive_summary"
    operational_update = "operational_update"


# ---------------------------------------------------------------------------
# Association table: tasks <-> assignees (many-to-many)
# ---------------------------------------------------------------------------

class TaskAssignee(Base):
    """
    Join table linking tasks and assignees.
    Composite PK prevents assigning the same person to a task twice.
    """
    __tablename__ = "task_assignees"

    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    assignee_id = Column(
        Integer,
        ForeignKey("assignees.id", ondelete="CASCADE"),
        primary_key=True,
    )
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    task = relationship("Task", back_populates="task_assignees")
    assignee = relationship("Assignee", back_populates="task_assignees")


# ---------------------------------------------------------------------------
# Core entities
# ---------------------------------------------------------------------------

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text)
    status = Column(
        SQLEnum(ProjectStatus, name="project_status"),
        nullable=False,
        default=ProjectStatus.on_track,
        server_default=ProjectStatus.on_track.value,
    )
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    tasks = relationship(
        "Task",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    activities = relationship(
        "Activity",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    ai_summary = relationship(
        "ProjectAISummary",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    risk_signals = relationship(
        "RiskSignal",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_project_dates_valid"),
        CheckConstraint("length(trim(name)) > 0", name="ck_project_name_not_blank"),
        Index("ix_projects_status", "status"),
    )


class Assignee(Base):
    __tablename__ = "assignees"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(200), nullable=False, unique=True)
    role = Column(String(120))
    is_active = Column(Integer, nullable=False, default=1, server_default="1")  # 1=active,0=archived

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    task_assignees = relationship(
        "TaskAssignee",
        back_populates="assignee",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("position('@' in email) > 1", name="ck_assignee_email_has_at"),
        CheckConstraint("length(trim(name)) > 0", name="ck_assignee_name_not_blank"),
        Index("ix_assignees_email", "email"),
    )


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)

    status = Column(
        SQLEnum(TaskStatus, name="task_status"),
        nullable=False,
        default=TaskStatus.todo,
        server_default=TaskStatus.todo.value,
    )
    category = Column(
        SQLEnum(TaskCategory, name="task_category"),
        nullable=False,
        default=TaskCategory.development,
        server_default=TaskCategory.development.value,
    )
    priority = Column(
        SQLEnum(TaskPriority, name="task_priority"),
        nullable=False,
        default=TaskPriority.medium,
        server_default=TaskPriority.medium.value,
    )

    # Effort: human estimate + AI-predicted estimate stored separately for QA comparison
    estimated_hours = Column(Integer)          # manual estimate
    ai_predicted_hours = Column(Integer)       # Groq-predicted estimate
    actual_hours = Column(Integer)             # logged actuals (for prediction accuracy QA)

    start_date = Column(Date)
    due_date = Column(Date)
    completed_at = Column(DateTime(timezone=True))

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    project = relationship("Project", back_populates="tasks")
    comments = relationship(
        "Comment",
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    task_assignees = relationship(
        "TaskAssignee",
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint(
            "estimated_hours IS NULL OR estimated_hours >= 0",
            name="ck_task_estimated_hours_nonneg",
        ),
        CheckConstraint(
            "ai_predicted_hours IS NULL OR ai_predicted_hours >= 0",
            name="ck_task_ai_hours_nonneg",
        ),
        CheckConstraint(
            "actual_hours IS NULL OR actual_hours >= 0",
            name="ck_task_actual_hours_nonneg",
        ),
        CheckConstraint(
            "due_date IS NULL OR start_date IS NULL OR due_date >= start_date",
            name="ck_task_dates_valid",
        ),
        CheckConstraint("length(trim(title)) > 0", name="ck_task_title_not_blank"),
        Index("ix_tasks_project_id", "project_id"),
        Index("ix_tasks_status", "status"),
        Index("ix_tasks_due_date", "due_date"),
        Index("ix_tasks_project_status", "project_id", "status"),  # composite for board queries
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)

    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id = Column(
        Integer,
        ForeignKey("assignees.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    task = relationship("Task", back_populates="comments")
    author = relationship("Assignee")

    __table_args__ = (
        CheckConstraint("length(trim(content)) > 0", name="ck_comment_not_blank"),
        Index("ix_comments_task_id", "task_id"),
    )


class Activity(Base):
    """Immutable activity-feed events (append-only; no updated_at)."""
    __tablename__ = "activity"

    id = Column(Integer, primary_key=True)
    event_type = Column(String(60), nullable=False)   # e.g. task_created, status_changed, comment_added
    description = Column(String(500), nullable=False)  # human-readable line for the feed

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    task_id = Column(
        Integer,
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_id = Column(
        Integer,
        ForeignKey("assignees.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="activities")

    __table_args__ = (
        Index("ix_activity_project_id", "project_id"),
        Index("ix_activity_created_at", "created_at"),
    )


# ---------------------------------------------------------------------------
# AI output tables
# ---------------------------------------------------------------------------

class ProjectAISummary(Base):
    """
    Latest AI-generated summary + stakeholder narratives for a project.
    One row per project (UNIQUE project_id) — upserted on each regeneration.
    """
    __tablename__ = "project_ai_summary"

    id = Column(Integer, primary_key=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    progress_summary = Column(Text)                 # plain-English progress narrative (Gemini)
    executive_narrative = Column(Text)              # stakeholder: executive summary format
    operational_narrative = Column(Text)            # stakeholder: detailed operational format

    # Snapshot of metrics the summary was grounded on (for QA / hallucination checks)
    tasks_total = Column(Integer)
    tasks_completed = Column(Integer)
    completion_pct = Column(Integer)                # 0–100
    derived_status = Column(SQLEnum(ProjectStatus, name="ai_derived_status"))

    model_used = Column(String(120))                # provenance, e.g. "gemini-2.5-flash"
    generated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    project = relationship("Project", back_populates="ai_summary")

    __table_args__ = (
        CheckConstraint(
            "completion_pct IS NULL OR (completion_pct >= 0 AND completion_pct <= 100)",
            name="ck_ai_completion_pct_range",
        ),
        UniqueConstraint("project_id", name="uq_ai_summary_project"),
    )


class RiskSignal(Base):
    """
    AI-detected delivery risk signals (RFP: >= 3 distinct scenarios).
    Multiple per project; each carries a plain-English explanation.
    """
    __tablename__ = "risk_signals"

    id = Column(Integer, primary_key=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    scenario = Column(String(120), nullable=False)   # e.g. schedule_slip, overallocation, blocked_dependency
    level = Column(
        SQLEnum(RiskLevel, name="risk_level"),
        nullable=False,
        default=RiskLevel.medium,
        server_default=RiskLevel.medium.value,
    )
    explanation = Column(Text, nullable=False)        # plain-English AI explanation
    recommendation = Column(Text)                     # suggested remediation

    is_active = Column(Integer, nullable=False, default=1, server_default="1")
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    project = relationship("Project", back_populates="risk_signals")

    __table_args__ = (
        Index("ix_risk_project_id", "project_id"),
        Index("ix_risk_project_active", "project_id", "is_active"),
    )