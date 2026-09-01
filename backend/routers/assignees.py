"""Inaya — Assignees routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import crud, schemas, models
from database import get_db
from deps import require, get_current_user
from permissions import Perm

router = APIRouter(prefix="/assignees", tags=["Assignees"])


@router.post("", response_model=schemas.AssigneeOut, status_code=201)
def create_assignee(payload: schemas.AssigneeCreate,
                    user: models.User = Depends(require(Perm.task_edit_any)), db: Session = Depends(get_db)):
    try:
        return crud.create_assignee(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An assignee with this email already exists.")


@router.get("", response_model=List[schemas.AssigneeOut])
def list_assignees(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.list_assignees(db)