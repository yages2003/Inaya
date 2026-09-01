"""Inaya — Auth & user management routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import models, schemas
from database import get_db
from auth import hash_password, verify_password, create_access_token
from deps import get_current_user, require
from permissions import Role, Perm, permissions_for

router = APIRouter(prefix="/auth", tags=["Auth"])


def _uwp(u):
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role,
            "is_active": u.is_active, "created_at": u.created_at,
            "permissions": permissions_for(u.role)}


@router.post("/register", response_model=schemas.TokenOut, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    is_first = db.query(models.User).count() == 0
    role = Role.super_admin if is_first else Role.viewer
    user = models.User(name=payload.name, email=payload.email,
                       hashed_password=hash_password(payload.password), role=role)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    db.refresh(user)
    token = create_access_token(subject=str(user.id), extra={"role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": _uwp(user)}


@router.post("/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="This account is deactivated.")
    token = create_access_token(subject=str(user.id), extra={"role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": _uwp(user)}


@router.get("/me", response_model=schemas.UserWithPerms)
def me(user: models.User = Depends(get_current_user)):
    return _uwp(user)


@router.get("/users", response_model=List[schemas.UserWithPerms])
def list_users(user: models.User = Depends(require(Perm.manage_users)), db: Session = Depends(get_db)):
    return [_uwp(u) for u in db.query(models.User).order_by(models.User.name).all()]


@router.patch("/users/{user_id}/role", response_model=schemas.UserWithPerms)
def change_role(user_id: int, payload: schemas.RoleUpdate,
                actor: models.User = Depends(require(Perm.manage_users)), db: Session = Depends(get_db)):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.role == Role.super_admin and payload.role != Role.super_admin:
        if db.query(models.User).filter(models.User.role == Role.super_admin).count() <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last Super Admin.")
    target.role = payload.role
    db.commit(); db.refresh(target)
    return _uwp(target)


@router.patch("/users/{user_id}/active", response_model=schemas.UserWithPerms)
def set_active(user_id: int, active: bool,
               actor: models.User = Depends(require(Perm.manage_users)), db: Session = Depends(get_db)):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")
    target.is_active = active
    db.commit(); db.refresh(target)
    return _uwp(target)