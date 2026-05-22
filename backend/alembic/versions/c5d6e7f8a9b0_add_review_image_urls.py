"""Add image urls column to reviews.

Revision ID: c5d6e7f8a9b0
Revises: a7b8c9d0e1f2
Create Date: 2026-05-23
"""

from alembic import op
import sqlalchemy as sa


revision = "c5d6e7f8a9b0"
down_revision = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reviews",
        sa.Column("ImageUrls", sa.Text(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("reviews", "ImageUrls")
