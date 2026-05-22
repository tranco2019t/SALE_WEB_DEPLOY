from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.notification import Notification, generate_notification_id
from app.services.exceptions import NotFoundException


MOJIBAKE_MARKERS = ("Ã", "Â", "Ä", "Æ", "áº", "á»", "â€", "�")


def _repair_text(value: str | None) -> str | None:
    if value is None:
        return None

    text = str(value)
    if not any(marker in text for marker in MOJIBAKE_MARKERS):
        return text

    for encoding in ("cp1252", "latin1"):
        try:
            repaired = text.encode(encoding).decode("utf-8")
        except UnicodeError:
            continue
        if repaired and repaired != text:
            return repaired

    return text


def _serialize(notification: Notification) -> dict:
    return {
        "notification_id": notification.notification_id,
        "customer_id": notification.customer_id,
        "title": _repair_text(notification.title),
        "message": _repair_text(notification.message),
        "type": notification.type,
        "reference_id": notification.reference_id,
        "is_read": bool(notification.is_read),
        "created_at": _as_utc(notification.created_at),
    }


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def create_notification(
    db: Session,
    customer_id: str,
    title: str,
    message: str | None = None,
    type: str = "system",
    reference_id: str | None = None,
) -> Notification:
    normalized_title = _repair_text(title) or ""
    normalized_message = _repair_text(message)
    notification = Notification(
        notification_id=generate_notification_id(),
        customer_id=customer_id,
        title=normalized_title,
        message=normalized_message,
        type=type,
        reference_id=reference_id,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def create_notifications(
    db: Session,
    customer_ids: list[str],
    title: str,
    message: str | None = None,
    type: str = "system",
    reference_id: str | None = None,
) -> list[Notification]:
    unique_customer_ids: list[str] = []
    seen_customer_ids: set[str] = set()

    for raw_customer_id in customer_ids:
        customer_id = str(raw_customer_id or "").strip()
        if not customer_id or customer_id in seen_customer_ids:
            continue
        seen_customer_ids.add(customer_id)
        unique_customer_ids.append(customer_id)

    if not unique_customer_ids:
        return []

    normalized_title = _repair_text(title) or ""
    normalized_message = _repair_text(message)
    created_at = datetime.now(timezone.utc)
    notifications = [
        Notification(
            notification_id=generate_notification_id(),
            customer_id=customer_id,
            title=normalized_title,
            message=normalized_message,
            type=type,
            reference_id=reference_id,
            is_read=False,
            created_at=created_at,
        )
        for customer_id in unique_customer_ids
    ]
    db.add_all(notifications)
    db.commit()
    for notification in notifications:
        db.refresh(notification)
    return notifications


def get_notifications(
    db: Session,
    customer_id: str,
    skip: int = 0,
    limit: int = 50,
) -> list[dict]:
    notifications = (
        db.query(Notification)
        .filter(Notification.customer_id == customer_id)
        .order_by(Notification.created_at.desc(), Notification.notification_id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize(n) for n in notifications]


def get_unread_count(db: Session, customer_id: str) -> int:
    return (
        db.query(Notification)
        .filter(Notification.customer_id == customer_id, Notification.is_read.is_(False))
        .count()
    )


def mark_as_read(db: Session, notification_id: str, customer_id: str) -> dict:
    notification = (
        db.query(Notification)
        .filter(
            Notification.notification_id == notification_id,
            Notification.customer_id == customer_id,
        )
        .first()
    )
    if not notification:
        raise NotFoundException("Notification")
    notification.is_read = True
    db.commit()
    return _serialize(notification)


def mark_all_as_read(db: Session, customer_id: str) -> int:
    count = (
        db.query(Notification)
        .filter(Notification.customer_id == customer_id, Notification.is_read.is_(False))
        .update({"is_read": True})
    )
    db.commit()
    return count
