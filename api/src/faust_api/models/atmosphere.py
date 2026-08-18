"""A tile of the "Атмосфера" grid on the home page.

The photo is not optional here: a tile *is* its picture, so removing the shot
means removing the tile (§13.4). That is why `image_key` is NOT NULL, unlike
the same column on a menu position.
"""

from sqlalchemy import Boolean, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from faust_api.models.base import Base, Timestamps, UUIDPrimaryKey

LABEL_LENGTH = 60
IMAGE_KEY_LENGTH = 120
IMAGE_ALT_LENGTH = 120


class AtmospherePhoto(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "atmosphere_photo"
    __table_args__ = (Index("ix_atmosphere_order", "order"),)

    label: Mapped[str] = mapped_column(String(LABEL_LENGTH), nullable=False)
    """What the visitor sees on the tile: "Танцпол", "Бар"."""

    image_key: Mapped[str] = mapped_column(String(IMAGE_KEY_LENGTH), nullable=False)

    image_alt: Mapped[str] = mapped_column(String(IMAGE_ALT_LENGTH), nullable=False)
    """What a screen reader says instead of the picture. Not a copy of `label`."""

    order: Mapped[int] = mapped_column(Integer, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
