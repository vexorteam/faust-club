"""Changing the owner's password is a server-side command, and it has to do
two things at once: let the new password in, and shut every old session out.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.errors import NotFoundError, ValidationError
from faust_api.models import AdminUser
from faust_api.security.passwords import verify_password
from faust_api.set_admin_password import set_admin_password

NEW_PASSWORD = "ще одна нічна зміна"


async def test_the_new_password_opens_the_account(session: AsyncSession, admin: AdminUser) -> None:
    await set_admin_password(session, admin.email, NEW_PASSWORD)
    await session.refresh(admin)

    assert verify_password(NEW_PASSWORD, admin.password_hash)


async def test_the_old_password_stops_working(session: AsyncSession, admin: AdminUser) -> None:
    from tests.conftest import ADMIN_PASSWORD

    await set_admin_password(session, admin.email, NEW_PASSWORD)
    await session.refresh(admin)

    assert not verify_password(ADMIN_PASSWORD, admin.password_hash)


async def test_it_revokes_every_issued_token(session: AsyncSession, admin: AdminUser) -> None:
    """`token_version` is what §5.4 checks on every request — raising it is how
    a stolen session dies without a denylist."""
    before = admin.token_version

    await set_admin_password(session, admin.email, NEW_PASSWORD)
    await session.refresh(admin)

    assert admin.token_version == before + 1


async def test_the_address_is_matched_without_case(session: AsyncSession, admin: AdminUser) -> None:
    await set_admin_password(session, "  Owner@Faust.BAR  ", NEW_PASSWORD)
    await session.refresh(admin)

    assert verify_password(NEW_PASSWORD, admin.password_hash)


async def test_an_unknown_address_changes_nothing(session: AsyncSession, admin: AdminUser) -> None:
    with pytest.raises(NotFoundError):
        await set_admin_password(session, "stranger@faust.bar", NEW_PASSWORD)

    await session.refresh(admin)

    assert admin.token_version == 0


async def test_a_short_password_never_reaches_the_row(session: AsyncSession, admin: AdminUser) -> None:
    from tests.conftest import ADMIN_PASSWORD

    with pytest.raises(ValidationError):
        await set_admin_password(session, admin.email, "коротко")

    await session.refresh(admin)

    assert verify_password(ADMIN_PASSWORD, admin.password_hash)
    assert admin.token_version == 0


async def test_a_password_past_the_bcrypt_limit_is_refused(session: AsyncSession, admin: AdminUser) -> None:
    """Not a theoretical limit: bcrypt ignores everything past 72 bytes, and a
    truncated password would quietly open the account for a shorter one."""
    with pytest.raises(ValidationError):
        await set_admin_password(session, admin.email, "п" * 40)

    await session.refresh(admin)

    assert admin.token_version == 0
