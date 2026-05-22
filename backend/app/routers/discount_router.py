from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.customer_auth import get_current_customer
from app.core.dependencies import get_db
from app.models.customer import Customer
from app.models.discount_code import DiscountCode

router = APIRouter(prefix="/discount-codes", tags=["Discount Codes"])


class ValidateDiscountRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    subtotal: Decimal = Field(ge=0)
    product_ids: list[str] = Field(default_factory=list)


class ValidateDiscountResponse(BaseModel):
    valid: bool
    discount_percent: int = 0
    discount_amount: Decimal = Decimal("0")
    message: str = ""


@router.post("/validate", response_model=ValidateDiscountResponse)
def validate_discount_code(
    payload: ValidateDiscountRequest,
    db: Session = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer),
):
    code = payload.code.strip().upper()
    subtotal = payload.subtotal
    product_ids = {
        str(product_id or "").strip()
        for product_id in payload.product_ids
        if str(product_id or "").strip()
    }

    discount = db.query(DiscountCode).filter(DiscountCode.code == code).first()
    if not discount:
        return ValidateDiscountResponse(valid=False, message="Mã giảm giá không tồn tại.")

    if not discount.is_active:
        return ValidateDiscountResponse(valid=False, message="Mã giảm giá đã bị vô hiệu hóa.")

    if discount.customer_id and discount.customer_id != current_customer.customer_id:
        return ValidateDiscountResponse(valid=False, message="Mã giảm giá không dành cho tài khoản của bạn.")

    if discount.product_id and discount.product_id not in product_ids:
        return ValidateDiscountResponse(valid=False, message="MÃ£ giáº£m giÃ¡ khÃ´ng Ã¡p dá»¥ng cho sáº£n pháº©m trong giá» hÃ ng.")

    now = datetime.utcnow()
    if discount.starts_at and now < discount.starts_at:
        return ValidateDiscountResponse(valid=False, message="Mã giảm giá chưa đến hạn sử dụng.")

    if discount.expires_at and now > discount.expires_at:
        return ValidateDiscountResponse(valid=False, message="Mã giảm giá đã hết hạn.")

    if discount.used_count >= discount.usage_limit:
        return ValidateDiscountResponse(valid=False, message="Mã giảm giá đã được sử dụng hết.")

    discount_percent = int(discount.discount_percent or 0)
    discount_amount = subtotal * Decimal(str(discount_percent)) / Decimal("100")

    return ValidateDiscountResponse(
        valid=True,
        discount_percent=discount_percent,
        discount_amount=discount_amount,
        message=f"Giảm {discount_percent}% ({discount_amount:.0f}đ)",
    )
