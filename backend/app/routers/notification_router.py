from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.customer_auth import get_current_customer
from app.core.dependencies import get_db
from app.models.customer import Customer
from app.schemas.notification import NotificationResponse, NotificationUpdate
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    return notification_service.get_notifications(db, current_customer.customer_id, skip=skip, limit=limit)


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    count = notification_service.get_unread_count(db, current_customer.customer_id)
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    return notification_service.mark_as_read(db, notification_id, current_customer.customer_id)


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    count = notification_service.mark_all_as_read(db, current_customer.customer_id)
    return {"marked_count": count}
