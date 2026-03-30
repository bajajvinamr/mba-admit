"""JWT authentication middleware for FastAPI.

Validates tokens from NextAuth (frontend) to identify the current user.
Provides a `get_current_user` dependency for protected endpoints.
"""

import os
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Request
from logging_config import setup_logging

logger = setup_logging()

# NextAuth signs JWTs with this secret — must match frontend NEXTAUTH_SECRET
_JWT_SECRET = os.environ.get("NEXTAUTH_SECRET", "")
_JWT_ALGORITHM = "HS256"
_ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")


def _is_dev_mode() -> bool:
    """Return True only when ENVIRONMENT is explicitly set to 'development'."""
    return _ENVIRONMENT == "development"


def _decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode a NextAuth JWT token. Returns claims dict or None."""
    if not _JWT_SECRET:
        if _is_dev_mode():
            logger.warning("NEXTAUTH_SECRET not set — auth disabled in development mode")
            return {"sub": "anonymous", "email": "dev@localhost", "name": "Dev User"}
        raise RuntimeError("NEXTAUTH_SECRET is not configured. Cannot authenticate requests in production.")

    try:
        from jose import jwt, JWTError
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        return payload
    except ImportError:
        if _is_dev_mode():
            logger.warning("python-jose not installed — auth disabled in development mode")
            return {"sub": "anonymous", "email": "dev@localhost", "name": "Dev User"}
        raise RuntimeError("python-jose is not installed. Cannot authenticate requests in production.")
    except Exception as e:
        logger.error("JWT decode failed: %s", e)
        return None


def _extract_token(request: Request) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


async def get_current_user(request: Request) -> Dict[str, Any]:
    """FastAPI dependency: returns the authenticated user or raises 401.

    In dev mode (no NEXTAUTH_SECRET set), returns a mock dev user.
    """
    token = _extract_token(request)

    if not token:
        # No token — only allow anonymous access in explicit development mode
        if not _JWT_SECRET and _is_dev_mode():
            return {"sub": "dev-user", "email": "dev@localhost", "name": "Dev User"}
        raise HTTPException(status_code=401, detail="Missing authentication token")

    claims = _decode_token(token)
    if claims is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return claims


async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    """FastAPI dependency: returns user if authenticated, None otherwise.

    Use for endpoints that work both authenticated and unauthenticated.
    """
    token = _extract_token(request)
    if not token:
        if not _JWT_SECRET and _is_dev_mode():
            return {"sub": "dev-user", "email": "dev@localhost", "name": "Dev User"}
        return None

    return _decode_token(token)
