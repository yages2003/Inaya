"""
Inaya — CRUD layer.
All database read/write logic lives here so routers stay thin.
Activity-feed events are written automatically on task create / status change.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session, selectinload

import models
import schemas


# ---------------------------------------------------------------------------
# Activity helper
# ---------------------------------------------------------------------------

def log_activity(
    db: Session,
    *,
    event_type: str,
    description: str,
    project_id: int,
    task_id: Optional[int] = None,
    actor_id: Optional[int] = None,
    commit: bool = True,
) -> models.Activity:
    entry = models.Activity(
        event_type=event_type,
        description=description,
        project_id=project_id,
        task_id=task_id,
        actor_id=actor_id,
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry


# ---------------------------------------------------------------------------
# Assignees
# ---------------------------------------------------------------------------

def create_assignee(db: Session, data: schemas.AssigneeCreate) -> models.Assignee:
    obj = models.Assignee(name=data.name, email=data.email, role=data.role)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_assignees(db: Session) -> List[models.Assignee]:
    return db.query(models.Assignee).order_by(models.Assignee.name).all()


def get_assignee(db: Session, assignee_id: int) -> Optional[models.Assignee]:
    return db.query(models.Assignee).filter(models.Assignee.id == assignee_id).first()


def update_assignee(db: Session, assignee_id: int, data: schemas.AssigneeUpdate):
    obj = get_assignee(db, assignee_id)
    if not obj:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_assignee(db: Session, assignee_id: int) -> bool:
    obj = get_assignee(db, assignee_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

def create_project(db: Session, data: schemas.ProjectCreate) -> models.Project:
    obj = models.Project(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    log_activity(
        db,
        event_type="project_created",
        description=f"Project '{obj.name}' created",
        project_id=obj.id,
    )
    return obj


def list_projects(db: Session) -> List[models.Project]:
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()


def get_project(db: Session, project_id: int) -> Optional[models.Project]:
    return (
        db.query(models.Project)
        .options(
            selectinload(models.Project.tasks)
            .selectinload(models.Task.task_assignees)
            .selectinload(models.TaskAssignee.assignee)
        )
        .filter(models.Project.id == project_id)
        .first()
    )


def update_project(db: Session, project_id: int, data: schemas.ProjectUpdate):
    obj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not obj:
        return None
    changes = data.model_dump(exclude_unset=True)
    old_status = obj.status
    for field, value in changes.items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    if "status" in changes and changes["status"] != old_status:
        log_activity(
            db,
            event_type="project_status_changed",
            description=f"Project '{obj.name}' status changed to {obj.status.value}",
            project_id=obj.id,
        )
    return obj


def delete_project(db: Session, project_id: int) -> bool:
    obj = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

def _attach_assignees(db: Session, task: models.Task, assignee_ids: List[int]) -> None:
    """Replace a task's assignees with the given ids."""
    task.task_assignees.clear()
    db.flush()
    for aid in set(assignee_ids):
        exists = db.query(models.Assignee).filter(models.Assignee.id == aid).first()
        if exists:
            task.task_assignees.append(models.TaskAssignee(assignee_id=aid))


def _task_to_out(task: models.Task) -> dict:
    """Flatten association objects into a clean list of assignees for the response."""
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "category": task.category,
        "priority": task.priority,
        "estimated_hours": task.estimated_hours,
        "ai_predicted_hours": task.ai_predicted_hours,
        "actual_hours": task.actual_hours,
        "start_date": task.start_date,
        "due_date": task.due_date,
        "completed_at": task.completed_at,
        "created_at": task.created_at,
        "project_id": task.project_id,
        "assignees": [ta.assignee for ta in task.task_assignees],
        "comments": task.comments,
    }


def create_task(db: Session, data: schemas.TaskCreate) -> Optional[models.Task]:
    project = db.query(models.Project).filter(models.Project.id == data.project_id).first()
    if not project:
        return None

    payload = data.model_dump(exclude={"assignee_ids"})
    task = models.Task(**payload)
    db.add(task)
    db.flush()  # get task.id before attaching assignees

    _attach_assignees(db, task, data.assignee_ids)
    db.commit()
    db.refresh(task)

    log_activity(
        db,
        event_type="task_created",
        description=f"Task '{task.title}' created in project '{project.name}'",
        project_id=project.id,
        task_id=task.id,
    )
    return get_task(db, task.id)


def list_tasks(db: Session, project_id: Optional[int] = None,
               status: Optional[str] = None) -> List[models.Task]:
    q = db.query(models.Task).options(
        selectinload(models.Task.task_assignees).selectinload(models.TaskAssignee.assignee),
        selectinload(models.Task.comments),
    )
    if project_id is not None:
        q = q.filter(models.Task.project_id == project_id)
    if status is not None:
        q = q.filter(models.Task.status == status)
    return q.order_by(models.Task.created_at.desc()).all()


def get_task(db: Session, task_id: int) -> Optional[models.Task]:
    return (
        db.query(models.Task)
        .options(
            selectinload(models.Task.task_assignees).selectinload(models.TaskAssignee.assignee),
            selectinload(models.Task.comments),
        )
        .filter(models.Task.id == task_id)
        .first()
    )


def update_task(db: Session, task_id: int, data: schemas.TaskUpdate):
    task = get_task(db, task_id)
    if not task:
        return None

    changes = data.model_dump(exclude_unset=True, exclude={"assignee_ids"})
    old_status = task.status

    for field, value in changes.items():
        setattr(task, field, value)

    # mark completion timestamp when moving to done
    if changes.get("status") == models.TaskStatus.done and old_status != models.TaskStatus.done:
        task.completed_at = datetime.utcnow()

    if data.assignee_ids is not None:
        _attach_assignees(db, task, data.assignee_ids)

    db.commit()
    db.refresh(task)

    if "status" in changes and changes["status"] != old_status:
        log_activity(
            db,
            event_type="task_status_changed",
            description=f"Task '{task.title}' moved to {task.status.value}",
            project_id=task.project_id,
            task_id=task.id,
        )
    return get_task(db, task_id)


def delete_task(db: Session, task_id: int) -> bool:
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def create_comment(db: Session, task_id: int, data: schemas.CommentCreate):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return None
    comment = models.Comment(
        content=data.content,
        task_id=task_id,
        author_id=data.author_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    log_activity(
        db,
        event_type="comment_added",
        description=f"Comment added to task '{task.title}'",
        project_id=task.project_id,
        task_id=task.id,
        actor_id=data.author_id,
    )
    return comment


def list_comments(db: Session, task_id: int) -> List[models.Comment]:
    return (
        db.query(models.Comment)
        .filter(models.Comment.task_id == task_id)
        .order_by(models.Comment.created_at.asc())
        .all()
    )


# ---------------------------------------------------------------------------
# Activity feed
# ---------------------------------------------------------------------------

def list_activity(db: Session, project_id: Optional[int] = None,
                  limit: int = 50) -> List[models.Activity]:
    q = db.query(models.Activity)
    if project_id is not None:
        q = q.filter(models.Activity.project_id == project_id)
    return q.order_by(models.Activity.created_at.desc()).limit(limit).all()