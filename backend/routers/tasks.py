"""Inaya — Tasks routes (permission-guarded, incl. My Tasks + comments)."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import crud, schemas, models
from database import get_db
from deps import require, get_current_user
from permissions import Perm, has_perm

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _can_edit_task(user, task):
    if has_perm(user.role, Perm.task_edit_any):
        return True
    if has_perm(user.role, Perm.task_edit_own):
        return user.email in [ta.assignee.email for ta in task.task_assignees]
    return False


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(payload: schemas.TaskCreate,
                user: models.User = Depends(require(Perm.task_create)), db: Session = Depends(get_db)):
    task = crud.create_task(db, payload)
    if task is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return crud._task_to_out(task)


@router.get("", response_model=List[schemas.TaskOut])
def list_tasks(project_id: Optional[int] = Query(None), status: Optional[models.TaskStatus] = Query(None),
               user: models.User = Depends(require(Perm.task_view)), db: Session = Depends(get_db)):
    return [crud._task_to_out(t) for t in crud.list_tasks(db, project_id=project_id, status=status)]


@router.get("/mine", response_model=List[schemas.TaskOut])
def my_tasks(user: models.User = Depends(require(Perm.task_view)), db: Session = Depends(get_db)):
    assignee = db.query(models.Assignee).filter(models.Assignee.email == user.email).first()
    if not assignee:
        return []
    task_ids = [ta.task_id for ta in assignee.task_assignees]
    return [crud._task_to_out(t) for t in (crud.get_task(db, tid) for tid in task_ids) if t]


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, user: models.User = Depends(require(Perm.task_view)),
             db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return crud._task_to_out(task)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, payload: schemas.TaskUpdate,
                user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    if not _can_edit_task(user, task):
        raise HTTPException(status_code=403, detail="You can only edit tasks assigned to you.")
    return crud._task_to_out(crud.update_task(db, task_id, payload))


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, user: models.User = Depends(require(Perm.task_delete)),
                db: Session = Depends(get_db)):
    if not crud.delete_task(db, task_id):
        raise HTTPException(status_code=404, detail="Task not found.")
    return None


@router.post("/{task_id}/comments", response_model=schemas.CommentOut, status_code=201)
def add_comment(task_id: int, payload: schemas.CommentCreate,
                user: models.User = Depends(require(Perm.comment_create)), db: Session = Depends(get_db)):
    comment = crud.create_comment(db, task_id, payload)
    if comment is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return comment


@router.get("/{task_id}/comments", response_model=List[schemas.CommentOut])
def list_comments(task_id: int, user: models.User = Depends(require(Perm.task_view)),
                  db: Session = Depends(get_db)):
    return crud.list_comments(db, task_id)