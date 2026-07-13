"""Inaya — Tasks API routes (includes task comments)."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

import crud
import schemas
from database import get_db

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.post("", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
    task = crud.create_task(db, payload)
    if task is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return crud._task_to_out(task)


@router.get("", response_model=List[schemas.TaskOut])
def list_tasks(
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    tasks = crud.list_tasks(db, project_id=project_id, status=status)
    return [crud._task_to_out(t) for t in tasks]


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return crud._task_to_out(task)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db)):
    task = crud.update_task(db, task_id, payload)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return crud._task_to_out(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    if not crud.delete_task(db, task_id):
        raise HTTPException(status_code=404, detail="Task not found.")
    return None


# --- Comments (nested under a task) ---------------------------------------

@router.post("/{task_id}/comments", response_model=schemas.CommentOut,
             status_code=status.HTTP_201_CREATED)
def add_comment(task_id: int, payload: schemas.CommentCreate, db: Session = Depends(get_db)):
    comment = crud.create_comment(db, task_id, payload)
    if comment is None:
        raise HTTPException(status_code=404, detail="Task not found.")
    return comment


@router.get("/{task_id}/comments", response_model=List[schemas.CommentOut])
def list_comments(task_id: int, db: Session = Depends(get_db)):
    return crud.list_comments(db, task_id)