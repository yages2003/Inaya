"""
Inaya — CRUD layer with automatic activity-feed logging.
"""

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session, selectinload

import models
import schemas


def log_activity(db, *, event_type, description, project_id,
                 task_id=None, actor_id=None, commit=True):
    entry = models.Activity(event_type=event_type, description=description,
                            project_id=project_id, task_id=task_id, actor_id=actor_id)
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry


# ---- Assignees ----
def create_assignee(db, data):
    obj = models.Assignee(name=data.name, email=data.email, role=data.role)
    db.add(obj); db.commit(); db.refresh(obj)
    return obj


def list_assignees(db):
    return db.query(models.Assignee).order_by(models.Assignee.name).all()


def get_assignee(db, aid):
    return db.query(models.Assignee).filter(models.Assignee.id == aid).first()


# ---- Projects ----
def create_project(db, data):
    obj = models.Project(**data.model_dump())
    db.add(obj); db.commit(); db.refresh(obj)
    log_activity(db, event_type="project_created",
                 description=f"Project '{obj.name}' created", project_id=obj.id)
    return obj


def list_projects(db):
    return db.query(models.Project).order_by(models.Project.created_at.desc()).all()


def get_project(db, pid):
    return (db.query(models.Project)
            .options(selectinload(models.Project.tasks)
                     .selectinload(models.Task.task_assignees)
                     .selectinload(models.TaskAssignee.assignee))
            .filter(models.Project.id == pid).first())


def update_project(db, pid, data):
    obj = db.query(models.Project).filter(models.Project.id == pid).first()
    if not obj:
        return None
    changes = data.model_dump(exclude_unset=True)
    old_status = obj.status
    for f, v in changes.items():
        setattr(obj, f, v)
    db.commit(); db.refresh(obj)
    if "status" in changes and changes["status"] != old_status:
        log_activity(db, event_type="project_status_changed",
                     description=f"Project '{obj.name}' status changed to {obj.status.value}",
                     project_id=obj.id)
    return obj


def delete_project(db, pid):
    obj = db.query(models.Project).filter(models.Project.id == pid).first()
    if not obj:
        return False
    db.delete(obj); db.commit()
    return True


# ---- Tasks ----
def _attach_assignees(db, task, ids):
    task.task_assignees.clear()
    db.flush()
    for aid in set(ids):
        if db.query(models.Assignee).filter(models.Assignee.id == aid).first():
            task.task_assignees.append(models.TaskAssignee(assignee_id=aid))


def _task_to_out(task):
    return {
        "id": task.id, "title": task.title, "description": task.description,
        "status": task.status, "category": task.category, "priority": task.priority,
        "estimated_hours": task.estimated_hours, "ai_predicted_hours": task.ai_predicted_hours,
        "actual_hours": task.actual_hours, "start_date": task.start_date,
        "due_date": task.due_date, "completed_at": task.completed_at,
        "created_at": task.created_at, "project_id": task.project_id,
        "assignees": [ta.assignee for ta in task.task_assignees],
        "comments": task.comments,
    }


def create_task(db, data):
    project = db.query(models.Project).filter(models.Project.id == data.project_id).first()
    if not project:
        return None
    payload = data.model_dump(exclude={"assignee_ids"})
    task = models.Task(**payload)
    db.add(task); db.flush()
    _attach_assignees(db, task, data.assignee_ids)
    db.commit(); db.refresh(task)
    log_activity(db, event_type="task_created",
                 description=f"Task '{task.title}' created in project '{project.name}'",
                 project_id=project.id, task_id=task.id)
    return get_task(db, task.id)


def list_tasks(db, project_id=None, status=None):
    q = db.query(models.Task).options(
        selectinload(models.Task.task_assignees).selectinload(models.TaskAssignee.assignee),
        selectinload(models.Task.comments))
    if project_id is not None:
        q = q.filter(models.Task.project_id == project_id)
    if status is not None:
        q = q.filter(models.Task.status == status)
    return q.order_by(models.Task.created_at.desc()).all()


def get_task(db, tid):
    return (db.query(models.Task)
            .options(selectinload(models.Task.task_assignees).selectinload(models.TaskAssignee.assignee),
                     selectinload(models.Task.comments))
            .filter(models.Task.id == tid).first())


def update_task(db, tid, data):
    task = get_task(db, tid)
    if not task:
        return None
    changes = data.model_dump(exclude_unset=True, exclude={"assignee_ids"})
    old_status = task.status
    for f, v in changes.items():
        setattr(task, f, v)
    if changes.get("status") == models.TaskStatus.done and old_status != models.TaskStatus.done:
        task.completed_at = datetime.now(timezone.utc)
    if data.assignee_ids is not None:
        _attach_assignees(db, task, data.assignee_ids)
    db.commit(); db.refresh(task)
    if "status" in changes and changes["status"] != old_status:
        log_activity(db, event_type="task_status_changed",
                     description=f"Task '{task.title}' moved to {task.status.value}",
                     project_id=task.project_id, task_id=task.id)
    return get_task(db, tid)


def delete_task(db, tid):
    task = db.query(models.Task).filter(models.Task.id == tid).first()
    if not task:
        return False
    db.delete(task); db.commit()
    return True


# ---- Comments ----
def create_comment(db, tid, data):
    task = db.query(models.Task).filter(models.Task.id == tid).first()
    if not task:
        return None
    c = models.Comment(content=data.content, task_id=tid, author_id=data.author_id)
    db.add(c); db.commit(); db.refresh(c)
    log_activity(db, event_type="comment_added",
                 description=f"Comment added to task '{task.title}'",
                 project_id=task.project_id, task_id=task.id, actor_id=data.author_id)
    return c


def list_comments(db, tid):
    return (db.query(models.Comment).filter(models.Comment.task_id == tid)
            .order_by(models.Comment.created_at.asc()).all())


# ---- Activity ----
def list_activity(db, project_id=None, limit=50):
    q = db.query(models.Activity)
    if project_id is not None:
        q = q.filter(models.Activity.project_id == project_id)
    return q.order_by(models.Activity.created_at.desc()).limit(limit).all()