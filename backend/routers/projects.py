"""Inaya — Projects routes (permission-guarded)."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import crud, schemas, models
from database import get_db
from deps import require
from permissions import Perm

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(payload: schemas.ProjectCreate,
                   user: models.User = Depends(require(Perm.project_create)), db: Session = Depends(get_db)):
    try:
        return crud.create_project(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A project with this name already exists.")


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(user: models.User = Depends(require(Perm.project_view)), db: Session = Depends(get_db)):
    return crud.list_projects(db)


@router.get("/{project_id}", response_model=schemas.ProjectDetailOut)
def get_project(project_id: int, user: models.User = Depends(require(Perm.project_view)),
                db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    result = schemas.ProjectDetailOut.model_validate(project).model_dump()
    result["tasks"] = [crud._task_to_out(t) for t in project.tasks]
    return result


@router.patch("/{project_id}", response_model=schemas.ProjectOut)
def update_project(project_id: int, payload: schemas.ProjectUpdate,
                   user: models.User = Depends(require(Perm.project_edit)), db: Session = Depends(get_db)):
    project = crud.update_project(db, project_id, payload)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, user: models.User = Depends(require(Perm.project_delete)),
                   db: Session = Depends(get_db)):
    if not crud.delete_project(db, project_id):
        raise HTTPException(status_code=404, detail="Project not found.")
    return None