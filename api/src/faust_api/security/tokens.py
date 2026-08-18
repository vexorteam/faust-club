"""Signing and reading the session token (§5.4).

The frontend treats the token as opaque: it stores it in an httpOnly cookie and
attaches it to requests, and never checks it. That is why `JWT_SECRET` lives
here only — duplicating a signing key into two applications would mean two
places to leak it from.

Revocation has no table behind it. Every token carries the `token_version` it
was signed with; raising that number on the administrator row makes all of them
unreadable at once — which is exactly what "sign out on every device" means.
"""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt

from faust_api.errors import UnauthorizedError
from faust_api.models import AdminUser
from faust_api.settings import get_settings

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"

EXPIRED_MESSAGE = "Сесія завершилась. Увійдіть ще раз"
BROKEN_MESSAGE = "Сесія недійсна. Увійдіть ще раз"

# Less than this left, and the answer carries a fresh token (§13.4). A day is
# wide enough that the owner never meets the edge: they sign in about weekly.
RENEWAL_WINDOW = timedelta(days=1)


@dataclass(frozen=True, slots=True)
class TokenClaims:
    """What a valid token says. Nothing sensitive: a JWT is signed, not encrypted."""

    admin_id: uuid.UUID
    email: str
    name: str
    version: int
    expires_at: datetime

    @property
    def expires_soon(self) -> bool:
        return self.expires_at - datetime.now(UTC) < RENEWAL_WINDOW


@dataclass(frozen=True, slots=True)
class IssuedToken:
    token: str
    expires_in: int
    """Seconds. The frontend uses it verbatim as the cookie's Max-Age."""


def issue_token(admin: AdminUser) -> IssuedToken:
    settings = get_settings()

    issued_at = datetime.now(UTC)
    expires_at = issued_at + timedelta(days=settings.jwt_ttl_days)

    payload = {
        "sub": str(admin.id),
        "email": admin.email,
        "name": admin.name,
        "ver": admin.token_version,
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    token = jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=ALGORITHM)

    return IssuedToken(token=token, expires_in=int((expires_at - issued_at).total_seconds()))


def read_token(token: str) -> TokenClaims:
    """Verifies the signature and the expiry. `ver` is checked against the database.

    Whatever is wrong with the token — expired, forged, truncated, missing a
    claim — the visitor gets one of two sentences and no hint about which.
    """
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[ALGORITHM],
            options={"require": ["sub", "exp", "iat"]},
        )
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError(EXPIRED_MESSAGE) from None
    except jwt.InvalidTokenError as error:
        # Never the token itself, and never the secret — only the reason.
        logger.info("[auth] токен відхилено: %s", error)
        raise UnauthorizedError(BROKEN_MESSAGE) from None

    try:
        return TokenClaims(
            admin_id=uuid.UUID(str(payload["sub"])),
            email=str(payload.get("email", "")),
            name=str(payload.get("name", "")),
            version=int(payload.get("ver", 0)),
            expires_at=datetime.fromtimestamp(int(payload["exp"]), tz=UTC),
        )
    except (KeyError, TypeError, ValueError) as error:
        logger.info("[auth] токен підписаний нами, але не читається: %s", error)
        raise UnauthorizedError(BROKEN_MESSAGE) from None
