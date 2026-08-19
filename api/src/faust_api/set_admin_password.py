"""Changing an administrator's password from the command line.

The seed writes the first owner and then leaves the row alone (§13.7), so this
is the answer to "the password leaked" and to "the owner forgot it". There is
no such endpoint and there will not be one: a password change is something the
person with access to the server does, not something a web form offers.

    docker compose run --rm api python -m faust_api.set_admin_password owner@faust.bar

The new password is typed at the prompt, not passed as an argument — an
argument would end up in the shell history and in `docker ps`. Every token
issued to this administrator dies with the change: `token_version` goes up by
one, which is exactly what §5.4 promises about "sign out everywhere".
"""

import asyncio
import getpass
import logging
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from faust_api.db import get_engine, get_session_factory
from faust_api.errors import NotFoundError, ValidationError
from faust_api.models import AdminUser
from faust_api.security.passwords import MAX_PASSWORD_BYTES, PasswordTooLongError, hash_password

logger = logging.getLogger("faust_api.set_admin_password")

MIN_PASSWORD_LENGTH = 8
"""The same floor the login form keeps (`loginSchema`): a password this command
accepts must be one the owner can then actually sign in with."""


async def set_admin_password(session: AsyncSession, email: str, password: str) -> None:
    """Replaces the hash and revokes every token issued so far.

    Validates before it looks the row up, so a too-short password never even
    reaches the database.
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValidationError(
            f"Пароль закороткий: мінімум {MIN_PASSWORD_LENGTH} символів",
            fields={"password": "Мінімум 8 символів"},
        )

    normalized = email.strip().lower()
    admin = await session.scalar(select(AdminUser).where(AdminUser.email == normalized))

    if admin is None:
        raise NotFoundError(f"Адміністратора {normalized} немає в базі")

    try:
        admin.password_hash = hash_password(password)
    except PasswordTooLongError as error:
        raise ValidationError(
            f"Пароль задовгий: максимум {MAX_PASSWORD_BYTES} байтів",
            fields={"password": "Задовгий пароль"},
        ) from error

    # Everything signed with the old version stops working the moment this
    # commits — including the session of whoever stole the old password.
    admin.token_version += 1

    await session.commit()


def _read_password() -> str:
    """Asks twice at a terminal, reads one line when there is none.

    The second form is for scripts: `docker compose run --rm -T api ...` with
    the password on stdin never shows it to `ps`.
    """
    if not sys.stdin.isatty():
        return sys.stdin.readline().rstrip("\n")

    first = getpass.getpass("Новий пароль: ")
    second = getpass.getpass("Ще раз: ")

    if first != second:
        raise ValidationError("Паролі не збігаються — нічого не змінено")

    return first


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    if len(sys.argv) != 2:
        print("Використання: python -m faust_api.set_admin_password <пошта>", file=sys.stderr)
        raise SystemExit(2)

    email = sys.argv[1]
    password = _read_password()

    factory = get_session_factory()

    try:
        async with factory() as session:
            await set_admin_password(session, email, password)
    finally:
        await get_engine().dispose()

    logger.info("[password] пароль %s змінено, усі сесії завершено", email.strip().lower())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (NotFoundError, ValidationError) as error:
        print(error.message, file=sys.stderr)
        raise SystemExit(1) from error
