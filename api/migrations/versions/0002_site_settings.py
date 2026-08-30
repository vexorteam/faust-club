from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_site_settings"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "site_settings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("tagline", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=300), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("phone_href", sa.String(length=30), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False),
        sa.Column("email_href", sa.String(length=120), nullable=False),
        sa.Column("address", sa.String(length=160), nullable=False),
        sa.Column("address_short", sa.String(length=80), nullable=False),
        sa.Column("maps_url", sa.String(length=300), nullable=False),
        sa.Column("maps_embed_query", sa.String(length=160), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("age_restriction", sa.String(length=10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_site_settings")),
    )

    op.create_table(
        "social_link",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=40), nullable=False),
        sa.Column("href", sa.String(length=300), nullable=False),
        sa.Column("handle", sa.String(length=60), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_social_link")),
    )
    op.create_index("ix_social_link_order", "social_link", ["order"], unique=False)

    op.create_table(
        "operating_hours",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.SmallInteger(), nullable=False),
        sa.Column("label", sa.String(length=20), nullable=False),
        sa.Column("open", sa.String(length=5), nullable=True),
        sa.Column("close", sa.String(length=5), nullable=True),
        sa.Column("closes_next_day", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_operating_hours")),
        sa.UniqueConstraint("day", name=op.f("uq_operating_hours_day")),
    )


def downgrade() -> None:
    op.drop_table("operating_hours")
    op.drop_index("ix_social_link_order", table_name="social_link")
    op.drop_table("social_link")
    op.drop_table("site_settings")