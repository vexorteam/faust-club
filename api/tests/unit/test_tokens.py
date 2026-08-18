"""Signing and reading a session token (§5.4).

The frontend never opens a token, so everything a token promises is promised
here: that it was signed by us, that it has not expired, and that it names the
version it was issued with.
"""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from faust_api.errors import UnauthorizedError
from faust_api.models import AdminUser
from faust_api.security.tokens import ALGORITHM, TokenClaims, issue_token, read_token
from faust_api.settings import get_settings


def admin(**extra: object) -> AdminUser:
    defaults: dict[str, object] = {
        "id": uuid.uuid4(),
        "email": "owner@faust.bar",
        "password_hash": "not-verified-here",
        "name": "Власник",
        "token_version": 0,
    }

    return AdminUser(**{**defaults, **extra})


def signed(payload: dict[str, object], *, secret: str | None = None) -> str:
    key = secret or get_settings().jwt_secret.get_secret_value()

    return jwt.encode(payload, key, algorithm=ALGORITHM)


def test_a_fresh_token_reads_back_as_the_admin_it_names() -> None:
    owner = admin(token_version=3)

    claims = read_token(issue_token(owner).token)

    assert claims.admin_id == owner.id
    assert claims.email == "owner@faust.bar"
    assert claims.name == "Власник"
    assert claims.version == 3


def test_expires_in_matches_the_configured_lifetime() -> None:
    """Seven days, because the cookie's Max-Age is copied from this number."""
    issued = issue_token(admin())

    assert issued.expires_in == get_settings().jwt_ttl_days * 24 * 60 * 60


def test_an_expired_token_is_refused() -> None:
    past = datetime.now(UTC) - timedelta(hours=1)
    token = signed(
        {
            "sub": str(uuid.uuid4()),
            "ver": 0,
            "iat": int((past - timedelta(days=7)).timestamp()),
            "exp": int(past.timestamp()),
        }
    )

    with pytest.raises(UnauthorizedError):
        read_token(token)


def test_a_token_signed_with_another_secret_is_refused() -> None:
    """The whole point of the signature: only this application can mint one."""
    token = signed(
        {
            "sub": str(uuid.uuid4()),
            "ver": 0,
            "iat": int(datetime.now(UTC).timestamp()),
            "exp": int((datetime.now(UTC) + timedelta(days=1)).timestamp()),
        },
        secret="somebody-elses-key-also-long-enough-for-sha256",
    )

    with pytest.raises(UnauthorizedError):
        read_token(token)


def test_garbage_is_refused_without_a_traceback() -> None:
    with pytest.raises(UnauthorizedError):
        read_token("not.a.token")


def test_our_own_token_without_a_readable_subject_is_refused() -> None:
    """Signed by us and still unusable — a `sub` that is not an id names nobody."""
    token = signed(
        {
            "sub": "не-uuid",
            "ver": 0,
            "iat": int(datetime.now(UTC).timestamp()),
            "exp": int((datetime.now(UTC) + timedelta(days=1)).timestamp()),
        }
    )

    with pytest.raises(UnauthorizedError):
        read_token(token)


def test_a_fresh_token_does_not_ask_for_renewal() -> None:
    assert read_token(issue_token(admin()).token).expires_soon is False


def test_a_token_with_hours_left_asks_for_renewal() -> None:
    """Less than a day to `exp` is what makes the answer carry a new token (§13.4)."""
    claims = TokenClaims(
        admin_id=uuid.uuid4(),
        email="owner@faust.bar",
        name="Власник",
        version=0,
        expires_at=datetime.now(UTC) + timedelta(hours=5),
    )

    assert claims.expires_soon is True
