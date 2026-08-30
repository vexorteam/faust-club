from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_testimonial"
down_revision: str | None = "0002_site_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "testimonial",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("text", sa.String(length=400), nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("meta", sa.String(length=60), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("visible", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_testimonial")),
    )
    op.create_index("ix_testimonial_order", "testimonial", ["order"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_testimonial_order", table_name="testimonial")
    op.drop_table("testimonial")