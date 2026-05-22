"""Add notifications table for user notifications.

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-05-22
"""

from alembic import op
import sqlalchemy as sa


revision = "a7b8c9d0e1f2"
down_revision = "b9c8d7e6f5a4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("NotificationID", sa.String(50), nullable=False),
        sa.Column("CustomerID", sa.String(50), nullable=False),
        sa.Column("Title", sa.String(200), nullable=False),
        sa.Column("Message", sa.Text, nullable=True),
        sa.Column("Type", sa.String(30), nullable=False, server_default="system"),
        sa.Column("ReferenceID", sa.String(50), nullable=True),
        sa.Column("IsRead", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("CreatedAt", sa.DateTime, nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(
            ["CustomerID"],
            ["customers.CustomerID"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("NotificationID"),
    )
    op.create_index(
        op.f("ix_notifications_NotificationID"),
        "notifications",
        ["NotificationID"],
        unique=False,
    )
    op.create_index(
        op.f("ix_notifications_CustomerID"),
        "notifications",
        ["CustomerID"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_CustomerID"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_NotificationID"), table_name="notifications")
    op.drop_table("notifications")
