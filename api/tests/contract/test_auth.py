"""`/auth/*` against §5.4, with a real database behind it.

The mirror on the frontend is `faust/src/schemas/auth.ts`: it reads
`access_token` and `expires_in` off the login answer and `{ user }` off
`/auth/me`, and treats any other shape as "the backend is down".
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.models import AdminUser
from faust_api.security.dependencies import EXPIRES_HEADER, TOKEN_HEADER
from faust_api.security.passwords import hash_password
from faust_api.security.tokens import ALGORITHM
from faust_api.services.rate_limit import MAX_ATTEMPTS
from faust_api.settings import get_settings

LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"
LOGOUT = "/api/v1/auth/logout"

EMAIL = "owner@faust.bar"
PASSWORD = "нічна зміна 22:00"

# One hash for the whole module: bcrypt at cost 12 is deliberately slow, and
# paying for it in every test would make the suite slow for no extra proof.
PASSWORD_HASH = hash_password(PASSWORD)


async def owner(session: AsyncSession, **extra: Any) -> AdminUser:
    defaults: dict[str, Any] = {"email": EMAIL, "password_hash": PASSWORD_HASH, "name": "Власник"}
    admin = AdminUser(**{**defaults, **extra})

    session.add(admin)
    await session.commit()

    return admin


def bearer(token: str) -> dict[str, str]:
    return {"authorization": f"Bearer {token}"}


async def sign_in(client: AsyncClient, password: str = PASSWORD) -> str:
    response = await client.post(LOGIN, json={"email": EMAIL, "password": password})

    return str(response.json()["access_token"])


async def test_a_successful_sign_in_answers_in_the_shape_the_frontend_reads(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    admin = await owner(session)

    response = await api_client.post(LOGIN, json={"email": EMAIL, "password": PASSWORD})
    body = response.json()

    assert response.status_code == 200
    assert body["expires_in"] == get_settings().jwt_ttl_days * 24 * 60 * 60
    assert body["user"] == {"id": str(admin.id), "name": "Власник", "email": EMAIL}
    assert jwt.decode(
        body["access_token"], get_settings().jwt_secret.get_secret_value(), algorithms=[ALGORITHM]
    )["sub"] == str(admin.id)


async def test_the_address_is_matched_case_insensitively(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """The owner types their address the way their keyboard felt like it."""
    await owner(session)

    response = await api_client.post(LOGIN, json={"email": "  Owner@Faust.BAR ", "password": PASSWORD})

    assert response.status_code == 200


async def test_a_wrong_password_and_an_unknown_address_answer_identically(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """Otherwise the form tells a stranger which addresses are registered (§5.4)."""
    await owner(session)

    wrong = await api_client.post(LOGIN, json={"email": EMAIL, "password": "не той пароль"})
    unknown = await api_client.post(LOGIN, json={"email": "stranger@faust.bar", "password": PASSWORD})

    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    assert wrong.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_the_sign_in_records_when_it_happened(api_client: AsyncClient, session: AsyncSession) -> None:
    admin = await owner(session)

    await api_client.post(LOGIN, json={"email": EMAIL, "password": PASSWORD})
    await session.refresh(admin)

    assert admin.last_login_at is not None


async def test_the_sixth_failed_attempt_is_refused_before_the_password_is_checked(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """Right or wrong, guess six waits ten minutes — that is what stops a script."""
    await owner(session)

    for _ in range(MAX_ATTEMPTS):
        assert (await api_client.post(LOGIN, json={"email": EMAIL, "password": "мимо"})).status_code == 401

    response = await api_client.post(LOGIN, json={"email": EMAIL, "password": PASSWORD})

    assert response.status_code == 429
    assert response.json()["error"]["code"] == "RATE_LIMITED"


async def test_a_successful_sign_in_frees_the_window(api_client: AsyncClient, session: AsyncSession) -> None:
    await owner(session)

    for _ in range(MAX_ATTEMPTS - 1):
        await api_client.post(LOGIN, json={"email": EMAIL, "password": "мимо"})

    assert (await api_client.post(LOGIN, json={"email": EMAIL, "password": PASSWORD})).status_code == 200
    assert (await api_client.post(LOGIN, json={"email": EMAIL, "password": "мимо"})).status_code == 401


async def test_me_returns_the_admin_behind_the_token(api_client: AsyncClient, session: AsyncSession) -> None:
    admin = await owner(session)
    token = await sign_in(api_client)

    response = await api_client.get(ME, headers=bearer(token))

    assert response.status_code == 200
    assert response.json() == {"user": {"id": str(admin.id), "name": "Власник", "email": EMAIL}}


async def test_a_request_without_a_bearer_header_is_refused(api_client: AsyncClient) -> None:
    response = await api_client.get(ME)

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


async def test_an_expired_token_is_refused(api_client: AsyncClient, session: AsyncSession) -> None:
    admin = await owner(session)
    past = datetime.now(UTC) - timedelta(minutes=1)
    token = jwt.encode(
        {
            "sub": str(admin.id),
            "email": EMAIL,
            "name": "Власник",
            "ver": 0,
            "iat": int((past - timedelta(days=7)).timestamp()),
            "exp": int(past.timestamp()),
        },
        get_settings().jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )

    assert (await api_client.get(ME, headers=bearer(token))).status_code == 401


async def test_signing_out_kills_the_token_it_was_made_with(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """This is the whole revocation mechanism: one integer, no deny-list (§5.4)."""
    admin = await owner(session)
    token = await sign_in(api_client)

    assert (await api_client.post(LOGOUT, headers=bearer(token))).status_code == 200
    assert (await api_client.get(ME, headers=bearer(token))).status_code == 401

    await session.refresh(admin)
    assert admin.token_version == 1


async def test_a_token_of_an_admin_who_is_gone_is_refused(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "ver": 0,
            "iat": int(datetime.now(UTC).timestamp()),
            "exp": int((datetime.now(UTC) + timedelta(days=1)).timestamp()),
        },
        get_settings().jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )

    assert (await api_client.get(ME, headers=bearer(token))).status_code == 401


async def test_a_fresh_token_carries_no_renewal_headers(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    await owner(session)
    token = await sign_in(api_client)

    response = await api_client.get(ME, headers=bearer(token))

    assert TOKEN_HEADER not in response.headers


async def test_a_token_in_its_last_day_comes_back_renewed(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """§13.4: the answer carries a new token and the frontend rewrites the cookie.

    Without it the owner would be dropped at the login form every seventh day
    with nothing on screen explaining why.
    """
    admin = await owner(session)
    now = datetime.now(UTC)
    almost_over = jwt.encode(
        {
            "sub": str(admin.id),
            "email": EMAIL,
            "name": "Власник",
            "ver": 0,
            "iat": int((now - timedelta(days=6, hours=20)).timestamp()),
            "exp": int((now + timedelta(hours=4)).timestamp()),
        },
        get_settings().jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )

    response = await api_client.get(ME, headers=bearer(almost_over))

    assert response.status_code == 200
    assert response.headers[EXPIRES_HEADER] == str(get_settings().jwt_ttl_days * 24 * 60 * 60)
    assert (await api_client.get(ME, headers=bearer(response.headers[TOKEN_HEADER]))).status_code == 200


async def test_signing_out_does_not_hand_back_a_token_it_just_killed(
    api_client: AsyncClient, session: AsyncSession
) -> None:
    """Logout deliberately skips the renewing dependency."""
    admin = await owner(session)
    now = datetime.now(UTC)
    almost_over = jwt.encode(
        {
            "sub": str(admin.id),
            "email": EMAIL,
            "name": "Власник",
            "ver": 0,
            "iat": int((now - timedelta(days=6, hours=20)).timestamp()),
            "exp": int((now + timedelta(hours=4)).timestamp()),
        },
        get_settings().jwt_secret.get_secret_value(),
        algorithm=ALGORITHM,
    )

    response = await api_client.post(LOGOUT, headers=bearer(almost_over))

    assert response.status_code == 200
    assert TOKEN_HEADER not in response.headers


async def test_a_malformed_body_is_a_field_error_not_a_crash(api_client: AsyncClient) -> None:
    response = await api_client.post(LOGIN, json={"email": "", "password": ""})

    assert response.status_code == 400
    assert set(response.json()["error"]["fields"]) == {"email", "password"}
