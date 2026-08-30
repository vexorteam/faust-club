from sqlalchemy import Boolean, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from faust_api.models.base import Base, Timestamps, UUIDPrimaryKey

TEXT_LENGTH = 400
NAME_LENGTH = 60
META_LENGTH = 60


class Testimonial(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "testimonial"
    __table_args__ = (Index("ix_testimonial_order", "order"),)

    text: Mapped[str] = mapped_column(String(TEXT_LENGTH), nullable=False)
    name: Mapped[str] = mapped_column(String(NAME_LENGTH), nullable=False)
    meta: Mapped[str] = mapped_column(String(META_LENGTH), nullable=False)

    order: Mapped[int] = mapped_column(Integer, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")