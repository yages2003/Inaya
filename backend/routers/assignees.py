"""Inaya — Assignees (team members) API routes."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import crud
import schemas
from database import get_db

router = APIRouter(prefix="/assignees", tags=["Assignees"])


@router.post("", response_model=schemas.AssigneeOut, status_code=status.HTTP_201_CREATED)
def create_assignee(payload: schemas.AssigneeCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_assignee(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An assignee with this email already exists.")


@router.get("", response_model=List[schemas.AssigneeOut])
def list_assignees(db: Session = Depends(get_db)):
    return crud.list_assignees(db)


@router.get("/{assignee_id}", response_model=schemas.AssigneeOut)
def get_assignee(assignee_id: int, db: Session = Depends(get_db)):
    obj = crud.get_assignee(db, assignee_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignee not found.")
    return obj


@router.patch("/{assignee_id}", response_model=schemas.AssigneeOut)
def update_assignee(assignee_id: int, payload: schemas.AssigneeUpdate, db: Session = Depends(get_db)):
    obj = crud.update_assignee(db, assignee_id, payload)
    if not obj:
        raise HTTPException(status_code=404, detail="Assignee not found.")
    return obj


@router.delete("/{assignee_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignee(assignee_id: int, db: Session = Depends(get_db)):
    if not crud.delete_assignee(db, assignee_id):
        raise HTTPException(status_code=404, detail="Assignee not found.")
    return None