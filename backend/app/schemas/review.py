from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ReviewBase(BaseModel):
    product_id: str = Field(min_length=1, max_length=50)
    customer_id: str = Field(min_length=1, max_length=50)
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=1000)
    image_urls: list[str] = Field(default_factory=list)

class ReviewCreate(ReviewBase):
    pass

class ReviewResponse(ReviewBase):
    review_id: str
    created_at: Optional[datetime]

    model_config = {
        "from_attributes": True
    }
