from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.repositories.user_repository import UserRepository


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class CurrentUser:
    def __init__(self, user_id: str, role: str) -> None:
        self.user_id = user_id
        self.role = role


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> CurrentUser:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    sub = payload.get("sub")
    role = payload.get("role")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    repo = UserRepository(db)
    user = repo.get_by_id(sub)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active")

    return CurrentUser(user_id=sub, role=role or "user")


def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return user
