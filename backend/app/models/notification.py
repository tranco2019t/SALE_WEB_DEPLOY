import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column("NotificationID", String(50), primary_key=True, index=True)
    customer_id = Column(
        "CustomerID",
        String(50),
        ForeignKey("customers.CustomerID", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column("Title", String(200), nullable=False)
    message = Column("Message", Text, nullable=True)
    type = Column("Type", String(30), nullable=False, default="system")  # promo, order, system
    reference_id = Column("ReferenceID", String(50), nullable=True)
    is_read = Column("IsRead", Boolean, nullable=False, default=False)
    created_at = Column("CreatedAt", DateTime, nullable=False, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="notifications")


def generate_notification_id() -> str:
    return "NOTIF" + uuid.uuid4().hex[:8].upper()
