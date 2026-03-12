"""Auth endpoints — verify credentials, create users."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import db
from logging_config import setup_logging

logger = setup_logging()

router = APIRouter(prefix="/api/auth", tags=["auth"])


class VerifyCredentialsRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=100)


@router.post("/verify")
def verify_credentials(req: VerifyCredentialsRequest):
    """Verify email/password for NextAuth credentials login."""
    user = db.get_user_by_email(req.email)
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    try:
        import bcrypt

        if not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except ImportError:
        logger.warning("bcrypt not installed — password check skipped in dev")
        if user.get("password_hash") and user["password_hash"] != "dev":
            raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"id": user["id"], "email": user["email"], "name": user.get("name", "")}


@router.post("/signup")
def signup(req: SignupRequest):
    """Create a new user account."""
    existing = db.get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        import bcrypt

        password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    except ImportError:
        logger.warning("bcrypt not installed — storing dev placeholder hash")
        password_hash = "dev"

    user = db.create_user(email=req.email, name=req.name, password_hash=password_hash)
    return {"id": user["id"], "email": user["email"], "name": user["name"]}
