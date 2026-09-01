"""
Inaya — Security dependencies.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import models
from database import get_db
from auth import decode_token
from permissions import Perm, has_perm

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme),
                     db: Session = Depends(get_db)) -> models.User:
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Could not validate credentials",
                        headers={"WWW-Authenticate": "Bearer"})
    payload = decode_token(token)
    if not payload:
        raise exc
    uid = payload.get("sub")
    if uid is None:
        raise exc
    user = db.query(models.User).filter(models.User.id == int(uid)).first()
    if user is None or not user.is_active:
        raise exc
    return user


def require(perm: Perm):
    def checker(user: models.User = Depends(get_current_user)) -> models.User:
        if not has_perm(user.role, perm):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"Your role ({user.role.value}) lacks permission: {perm.value}")
        return user
    return checker