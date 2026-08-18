"""Initial schema: menu categories, menu items, atmosphere photos, admin users.

The shape is CLAUDE.md §5.2 verbatim — lengths, nullability, the RESTRICT on
`menu_item.category_id` and the three ordering indexes included.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-08-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BADGE = sa.Enum("new", "hit", name="menu_item_badge")


def upgrade() -> None:
    op.create_table(
        "admin_user",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("token_version", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_user")),
        sa.UniqueConstraint("email", name=op.f("uq_admin_user_email")),
    )

    op.create_table(
        "atmosphere_photo",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("label", sa.String(length=60), nullable=False),
        sa.Column("image_key", sa.String(length=120), nullable=False),
        sa.Column("image_alt", sa.String(length=120), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("visible", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_atmosphere_photo")),
    )
    op.create_index("ix_atmosphere_order", "atmosphere_photo", ["order"], unique=False)

    op.create_table(
        "menu_category",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=60), nullable=False),
        sa.Column("note", sa.String(length=120), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("visible", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_menu_category")),
        sa.UniqueConstraint("slug", name=op.f("uq_menu_category_slug")),
    )
    op.create_index("ix_category_order", "menu_category", ["order"], unique=False)

    op.create_table(
        "menu_item",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("category_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("composition", sa.String(length=200), nullable=True),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("volume", sa.String(length=20), nullable=True),
        sa.Column("image_key", sa.String(length=120), nullable=True),
        sa.Column("image_alt", sa.String(length=120), nullable=True),
        sa.Column("badge", BADGE, nullable=True),
        sa.Column("available", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["menu_category.id"],
            name=op.f("fk_menu_item_category_id"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_menu_item")),
    )
    op.create_index("ix_item_category_order", "menu_item", ["category_id", "order"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_item_category_order", table_name="menu_item")
    op.drop_table("menu_item")
    op.drop_index("ix_category_order", table_name="menu_category")
    op.drop_table("menu_category")
    op.drop_index("ix_atmosphere_order", table_name="atmosphere_photo")
    op.drop_table("atmosphere_photo")
    op.drop_table("admin_user")

    # Dropping the table does not drop the type it used: without this line the
    # next `upgrade head` fails with "type menu_item_badge already exists".
    BADGE.drop(op.get_bind(), checkfirst=True)
