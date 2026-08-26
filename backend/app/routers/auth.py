from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import (
    SESSION_COOKIE_NAME,
    create_session,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db

router = APIRouter()


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24 * 30,
    )


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserCreate, response: Response, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = models.User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    session = create_session(db, user)
    _set_session_cookie(response, str(session.token))
    return user


@router.post("/login", response_model=schemas.UserOut)
def login(payload: schemas.UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user is None or not verify_password(payload.password, str(user.hashed_password)):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    session = create_session(db, user)
    _set_session_cookie(response, str(session.token))
    return user


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
    db: Session = Depends(get_db),
):
    if session_token is not None:
        db.query(models.UserSession).filter(models.UserSession.token == session_token).delete()
        db.commit()
    response.delete_cookie(SESSION_COOKIE_NAME)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
