"""A position of the menu. Always belongs to a category — there are no loose drinks."""

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from faust_api.models.base import Base, Timestamps, UUIDPrimaryKey

if TYPE_CHECKING:
    from faust_api.models.category import MenuCategory

NAME_LENGTH = 80
COMPOSITION_LENGTH = 200
VOLUME_LENGTH = 20
IMAGE_KEY_LENGTH = 120
IMAGE_ALT_LENGTH = 120


class MenuItemBadge(enum.StrEnum):
    """At most one mark per position (§5.2)."""

    NEW = "new"
    HIT = "hit"


class MenuItem(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "menu_item"
    __table_args__ = (Index("ix_item_category_order", "category_id", "order"),)

    category_id: Mapped[uuid.UUID] = mapped_column(
        # RESTRICT, not CASCADE: deleting a category full of positions is a
        # mistake worth a 409, not a silent loss of half the bar card.
        ForeignKey("menu_category.id", ondelete="RESTRICT"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(NAME_LENGTH), nullable=False)
    composition: Mapped[str | None] = mapped_column(String(COMPOSITION_LENGTH), nullable=True)
    """"джин, лайм, тонік, розмарин" — what the visitor reads under the name."""

    price: Mapped[int] = mapped_column(Integer, nullable=False)
    """Whole hryvnias. There are no kopecks behind a bar."""

    volume: Mapped[str | None] = mapped_column(String(VOLUME_LENGTH), nullable=True)

    image_key: Mapped[str | None] = mapped_column(String(IMAGE_KEY_LENGTH), nullable=True)
    """A key in the storage, not a URL: the frontend never learns the layout of the volume."""

    image_alt: Mapped[str | None] = mapped_column(String(IMAGE_ALT_LENGTH), nullable=True)

    badge: Mapped[MenuItemBadge | None] = mapped_column(
        Enum(
            MenuItemBadge,
            name="menu_item_badge",
            values_callable=lambda enum_type: [member.value for member in enum_type],
        ),
        nullable=True,
    )

    available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    """False dims the card on the showcase and adds "немає". It does not hide it."""

    order: Mapped[int] = mapped_column(Integer, nullable=False)

    category: Mapped["MenuCategory"] = relationship(back_populates="items")
