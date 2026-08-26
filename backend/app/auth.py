import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.database import get_db

SESSION_COOKIE_NAME = "session_token"
SESSION_TTL = timedelta(days=30)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_session(db: Session, user: models.User) -> models.UserSession:
    session = models.UserSession(
        user_id=user.id,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.now(UTC) + SESSION_TTL,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
) -> models.User:
    if session_token is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = db.query(models.UserSession).filter(models.UserSession.token == session_token).first()
    if session is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return session.user
