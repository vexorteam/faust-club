"""Turning a `Authorization: Bearer …` header into an administrator row.

This is the single place where the API decides whether somebody may write. The
frontend has its own guard, but it is a convenience for the owner and nothing
more: anybody can call this API directly, so every admin router asks for this
dependency instead of assuming the check already happened (§3.5).
"""

import logging
from typing import Annotated

from fastapi import Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.db import get_session
from faust_api.errors import UnauthorizedError
from faust_api.models import AdminUser
from faust_api.security.tokens import TokenClaims, issue_token, read_token

logger = logging.getLogger(__name__)

MISSING_MESSAGE = "Потрібно увійти"
EXPIRED_MESSAGE = "Сесія завершилась. Увійдіть ще раз"

SCHEME = "bearer"

# Where a renewed token travels (§13.4). Two headers rather than a body field,
# because the answer of every endpoint under a session has to be able to carry
# it without changing its own shape.
TOKEN_HEADER = "X-Session-Token"
EXPIRES_HEADER = "X-Session-Expires-In"

Session = Annotated[AsyncSession, Depends(get_session)]


def bearer_token(request: Request) -> str:
    header = request.headers.get("authorization", "")
    scheme, _, value = header.partition(" ")

    if scheme.lower() != SCHEME or not value.strip():
        raise UnauthorizedError(MISSING_MESSAGE)

    return value.strip()


async def authenticated_admin(request: Request, session: Session) -> AdminUser:
    """Signature, expiry, and — the part no signature can prove — `ver`.

    A token stays cryptographically perfect after the owner presses "sign out",
    so the version it was signed with is compared against the row. That is the
    whole revocation mechanism (§5.4): one integer, no deny-list.
    """
    claims: TokenClaims = read_token(bearer_token(request))

    admin = await session.get(AdminUser, claims.admin_id)

    if admin is None:
        logger.info("[auth] токен посилається на адміністратора, якого вже немає")
        raise UnauthorizedError(EXPIRED_MESSAGE)

    if admin.token_version != claims.version:
        logger.info("[auth] токен відкликаний: версія %s, поточна %s", claims.version, admin.token_version)
        raise UnauthorizedError(EXPIRED_MESSAGE)

    # Carried on the request so the renewing dependency does not decode twice.
    request.state.token_claims = claims

    return admin


async def current_admin(
    request: Request, response: Response, admin: Annotated[AdminUser, Depends(authenticated_admin)]
) -> AdminUser:
    """The same admin, plus the sliding renewal of §5.4.

    With less than a day left the answer carries a fresh token and the frontend
    quietly rewrites the cookie. Without this the owner would be thrown back to
    the login form every seventh day for no reason they could see.
    """
    claims: TokenClaims = request.state.token_claims

    if claims.expires_soon:
        issued = issue_token(admin)
        response.headers[TOKEN_HEADER] = issued.token
        response.headers[EXPIRES_HEADER] = str(issued.expires_in)

    return admin


CurrentAdmin = Annotated[AdminUser, Depends(current_admin)]
"""What every admin router asks for."""

AuthenticatedAdmin = Annotated[AdminUser, Depends(authenticated_admin)]
"""Same check without the renewal — for the one endpoint that ends the session."""
