import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import inspect, text
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.settings import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    APP_LOGIN_EMAIL,
    APP_LOGIN_PASSWORD,
    JWT_ALGORITHM,
    JWT_SECRET,
)


security = HTTPBearer(auto_error=False)


def generate_verification_code(now: datetime | None = None) -> str:
    current = now.astimezone() if now else datetime.now().astimezone()
    return current.strftime("%d%m%y")


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        encoded_salt, encoded_digest = password_hash.split("$", maxsplit=1)
    except ValueError:
        return False

    salt = base64.b64decode(encoded_salt.encode())
    expected = base64.b64decode(encoded_digest.encode())
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return hmac.compare_digest(actual, expected)


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address is not verified.",
        )
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )
    return user


def seed_default_user(db: Session) -> None:
    if not APP_LOGIN_EMAIL or not APP_LOGIN_PASSWORD:
        return

    email = APP_LOGIN_EMAIL.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    hashed_password = hash_password(APP_LOGIN_PASSWORD)

    if existing is None:
        db.add(
            User(
                email=email,
                password_hash=hashed_password,
                is_verified=True,
                verification_code=generate_verification_code(),
            )
        )
    else:
        existing.password_hash = hashed_password
        existing.is_verified = True
        existing.verification_code = generate_verification_code()

    db.commit()


def ensure_auth_schema(db: Session) -> None:
    inspector = inspect(db.bind)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "is_verified" not in columns:
        db.execute(
            text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE")
        )

    if "verification_code" not in columns:
        db.execute(
            text("ALTER TABLE users ADD COLUMN verification_code VARCHAR(6) NOT NULL DEFAULT ''")
        )

    db.execute(
        text(
            "UPDATE users SET verification_code = :code WHERE verification_code IS NULL OR verification_code = ''"
        ),
        {"code": generate_verification_code()},
    )
    db.commit()
