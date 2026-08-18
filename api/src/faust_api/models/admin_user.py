"""Whoever is allowed to change the site. In version 1.0 that is one owner.

`token_version` is the whole revocation mechanism (§5.4): every issued token
carries the number it was signed with, and raising the number here kills all of
them at once — no deny-list table, no session storage.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from faust_api.models.base import Base, UUIDPrimaryKey

EMAIL_LENGTH = 120
NAME_LENGTH = 60
PASSWORD_HASH_LENGTH = 100


class AdminUser(UUIDPrimaryKey, Base):
    """No `updated_at` here on purpose — §5.2 gives this table `created_at` only."""

    __tablename__ = "admin_user"

    email: Mapped[str] = mapped_column(String(EMAIL_LENGTH), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(PASSWORD_HASH_LENGTH), nullable=False)
    """bcrypt, cost 12. A plain password never reaches this column, a log or the code."""

    name: Mapped[str] = mapped_column(String(NAME_LENGTH), nullable=False)

    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
