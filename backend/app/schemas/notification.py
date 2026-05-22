from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    notification_id: str
    customer_id: str
    title: str
    message: Optional[str] = None
    type: str
    reference_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
