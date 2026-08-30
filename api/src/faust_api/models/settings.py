from sqlalchemy import Boolean, Integer, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from faust_api.models.base import Base, Timestamps, UUIDPrimaryKey

NAME_LENGTH = 60
TAGLINE_LENGTH = 120
DESCRIPTION_LENGTH = 300
PHONE_LENGTH = 30
EMAIL_LENGTH = 120
ADDRESS_LENGTH = 160
ADDRESS_SHORT_LENGTH = 80
URL_LENGTH = 300
AGE_RESTRICTION_LENGTH = 10

SOCIAL_NAME_LENGTH = 40
SOCIAL_HANDLE_LENGTH = 60

HOURS_LABEL_LENGTH = 20
HOURS_TIME_LENGTH = 5
"""\"HH:MM\" — the same shape the frontend's `<input type=\"time\">` sends."""


class SiteSettings(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "site_settings"

    name: Mapped[str] = mapped_column(String(NAME_LENGTH), nullable=False)
    tagline: Mapped[str] = mapped_column(String(TAGLINE_LENGTH), nullable=False)
    description: Mapped[str] = mapped_column(String(DESCRIPTION_LENGTH), nullable=False)

    phone: Mapped[str] = mapped_column(String(PHONE_LENGTH), nullable=False)
    phone_href: Mapped[str] = mapped_column(String(PHONE_LENGTH), nullable=False)
    email: Mapped[str] = mapped_column(String(EMAIL_LENGTH), nullable=False)
    email_href: Mapped[str] = mapped_column(String(EMAIL_LENGTH), nullable=False)
    address: Mapped[str] = mapped_column(String(ADDRESS_LENGTH), nullable=False)
    address_short: Mapped[str] = mapped_column(String(ADDRESS_SHORT_LENGTH), nullable=False)
    maps_url: Mapped[str] = mapped_column(String(URL_LENGTH), nullable=False)
    maps_embed_query: Mapped[str] = mapped_column(String(ADDRESS_LENGTH), nullable=False)
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)

    age_restriction: Mapped[str] = mapped_column(String(AGE_RESTRICTION_LENGTH), nullable=False)
    """Free text on purpose — \"16+\", \"18+\" — the showcase only ever prints it."""


class SocialLink(UUIDPrimaryKey, Timestamps, Base):
    """One entry of the footer's \"Ми в соцмережах\" row."""

    __tablename__ = "social_link"

    name: Mapped[str] = mapped_column(String(SOCIAL_NAME_LENGTH), nullable=False)
    """\"Instagram\", \"TikTok\" — the frontend maps this to an icon it already knows."""

    href: Mapped[str] = mapped_column(String(URL_LENGTH), nullable=False)
    handle: Mapped[str] = mapped_column(String(SOCIAL_HANDLE_LENGTH), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)


class OperatingHours(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "operating_hours"

    day: Mapped[int] = mapped_column(SmallInteger, unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(HOURS_LABEL_LENGTH), nullable=False)

    open: Mapped[str | None] = mapped_column(String(HOURS_TIME_LENGTH), nullable=True)
    close: Mapped[str | None] = mapped_column(String(HOURS_TIME_LENGTH), nullable=True)

    closes_next_day: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )