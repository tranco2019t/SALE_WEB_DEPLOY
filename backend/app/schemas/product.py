from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal

class ProductBase(BaseModel):
    product_name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    unit_price: Decimal = Field(ge=0)
    category_id: str = Field(min_length=1, max_length=50)
    discount_percent: int = Field(default=0, ge=0, le=100)
    stock_quantity: int = Field(default=0, ge=0)
    rating_avg: Decimal = Field(default=Decimal("0"), ge=0, le=5)
    total_reviews: int = Field(default=0, ge=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    unit_price: Optional[Decimal] = Field(default=None, ge=0)
    category_id: Optional[str] = Field(default=None, min_length=1, max_length=50)
    discount_percent: Optional[int] = Field(default=None, ge=0, le=100)
    stock_quantity: Optional[int] = Field(default=None, ge=0)

class ProductResponse(ProductBase):
    product_id: str

    model_config = {
        "from_attributes": True
    }
