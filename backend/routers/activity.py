"""Inaya — Activity feed API routes (read-only)."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import crud
import schemas
from database import get_db

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("", response_model=List[schemas.ActivityOut])
def list_activity(
    project_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return crud.list_activity(db, project_id=project_id, limit=limit)