"""Signing in, checking a session, signing out (§5.4).

Three endpoints, and only the middle one is called often: the frontend asks
`/auth/me` on every admin page render, because a token it cannot open is a
token it cannot trust on its own.

What this router refuses to tell anyone: whether a given address is registered.
A wrong password and an unknown address take the same time, return the same
status and the same sentence.
"""

import logging
import secrets
from datetime import UTC, datetime
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.db import get_session
from faust_api.errors import InvalidCredentialsError, RateLimitError
from faust_api.models import AdminUser
from faust_api.schemas.auth import AdminUserPayload, LoginRequest, LoginResponse, LogoutResponse, MeResponse
from faust_api.security.dependencies import AuthenticatedAdmin, CurrentAdmin
from faust_api.security.passwords import hash_password, verify_password
from faust_api.security.tokens import issue_token
from faust_api.services.rate_limit import client_address, login_limiter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])

Session = Annotated[AsyncSession, Depends(get_session)]


@lru_cache
def _decoy_hash() -> str:
    """A hash of a value nobody knows, verified against when the address is unknown.

    Without it an unknown address answers in a millisecond and a wrong password
    in a quarter of a second, and the difference is enough to enumerate which
    addresses exist. Built from a random string at first use, so no password —
    not even a fake one — is written into the source (§3.5).
    """
    return hash_password(secrets.token_urlsafe(32))


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: Request, payload: LoginRequest, session: Session) -> LoginResponse:
    """Five failed attempts in ten minutes and this address waits (§3.5).

    The limit is checked before the password is, so the sixth guess is refused
    even if it happens to be the right one — otherwise the limit would only
    slow an attacker down, not stop them.
    """
    caller = client_address(request)

    if login_limiter.blocked(caller):
        raise RateLimitError()

    admin = await session.scalar(select(AdminUser).where(AdminUser.email == payload.email))
    stored_hash = admin.password_hash if admin is not None else _decoy_hash()

    if not verify_password(payload.password, stored_hash) or admin is None:
        login_limiter.record_failure(caller)
        logger.info("[auth] невдалий вхід з %s", caller)
        raise InvalidCredentialsError()

    login_limiter.reset(caller)

    admin.last_login_at = datetime.now(UTC)
    await session.commit()

    issued = issue_token(admin)
    logger.info("[auth] вхід: %s", admin.email)

    return LoginResponse(
        access_token=issued.token,
        expires_in=issued.expires_in,
        user=AdminUserPayload.of(admin),
    )


@router.get("/auth/me", response_model=MeResponse)
async def me(admin: CurrentAdmin) -> MeResponse:
    """Alive or not. The answer to a dead token is 401, never an empty user."""
    return MeResponse(user=AdminUserPayload.of(admin))


@router.post("/auth/logout", response_model=LogoutResponse)
async def logout(admin: AuthenticatedAdmin, session: Session) -> LogoutResponse:
    """Raising `token_version` ends every session on every device at once.

    Deliberately not `CurrentAdmin`: the renewing dependency would hand back a
    token signed with the version this handler is about to invalidate.
    """
    admin.token_version += 1
    await session.commit()

    logger.info("[auth] вихід: %s, версія токенів %s", admin.email, admin.token_version)

    return LogoutResponse()
