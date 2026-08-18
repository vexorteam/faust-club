"""A section of the menu: "Авторські коктейлі", "Шоти", "Вино й ігристе"."""

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from faust_api.models.base import Base, Timestamps, UUIDPrimaryKey

if TYPE_CHECKING:
    from faust_api.models.item import MenuItem

SLUG_LENGTH = 60
TITLE_LENGTH = 60
NOTE_LENGTH = 120


class MenuCategory(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "menu_category"
    __table_args__ = (Index("ix_category_order", "order"),)

    slug: Mapped[str] = mapped_column(String(SLUG_LENGTH), unique=True, nullable=False)
    """Anchor of the public page: /menu#signature. Changing it breaks saved links."""

    title: Mapped[str] = mapped_column(String(TITLE_LENGTH), nullable=False)
    note: Mapped[str | None] = mapped_column(String(NOTE_LENGTH), nullable=True)
    """A line under the heading, e.g. "подаються з 22:00"."""

    order: Mapped[int] = mapped_column(Integer, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    items: Mapped[list["MenuItem"]] = relationship(
        back_populates="category",
        order_by="MenuItem.order",
        # RESTRICT lives on the foreign key: the ORM must not quietly help
        # around a category the owner is not allowed to delete.
        passive_deletes="all",
    )
