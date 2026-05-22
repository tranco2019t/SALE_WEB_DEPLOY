from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from decimal import Decimal


class OrderItemInput(BaseModel):
    """Schema cho order item khi tạo order"""
    product_id: str = Field(min_length=1, max_length=50)
    quantity: int = Field(ge=1)


class OrderItemDetail(BaseModel):
    product_id: str = Field(min_length=1, max_length=50)
    quantity: int = Field(ge=1)
    amount: Optional[Decimal] = None
    price_at_purchase: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    product_name: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class OrderBase(BaseModel):
    customer_id: str = Field(min_length=1, max_length=50)
    payment_method_id: str = Field(min_length=1, max_length=50)
    order_date: date
    status: str = Field(min_length=1, max_length=50)
    shipping_address: Optional[str] = None
    shipping_fee: Decimal = Field(default=Decimal("0"), ge=0)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)


class OrderCreate(BaseModel):
    """Schema tạo order mới - client gửi items trong request"""
    customer_id: str = Field(min_length=1, max_length=50)
    payment_method_id: str = Field(min_length=1, max_length=50)
    shipping_address: Optional[str] = Field(default=None, max_length=500)
    shipping_fee: Decimal = Field(default=Decimal("0"), ge=0)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)
    discount_code: Optional[str] = Field(default=None, max_length=50)
    items: List[OrderItemInput]


class OrderUpdate(BaseModel):
    status: Optional[str] = Field(default=None, min_length=1, max_length=50)


class OrderResponse(OrderBase):
    order_id: str
    total_amount: Optional[Decimal] = None
    payment_method_name: Optional[str] = None
    items: List[OrderItemDetail] = Field(default_factory=list)
    order_items: List[OrderItemDetail] = Field(default_factory=list)

    model_config = {
        "from_attributes": True
    }
