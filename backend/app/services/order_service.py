from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.customer import Customer
from app.models.discount_code import DiscountCode
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.services.exceptions import BusinessLogicException, NotFoundException


def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


def _base_order_query(db: Session):
    return db.query(Order).options(
        selectinload(Order.order_items).selectinload(OrderItem.product),
        selectinload(Order.payment_method),
    )


def _serialize_order_item(item: OrderItem, order_status: str) -> dict:
    product = item.product
    price_at_purchase = item.price_at_purchase if item.price_at_purchase is not None else None
    unit_price = price_at_purchase
    if unit_price is None and product is not None:
        unit_price = product.unit_price

    return {
        "product_id": item.product_id,
        "quantity": item.quantity,
        "amount": item.amount,
        "price_at_purchase": price_at_purchase,
        "unit_price": unit_price,
        "product_name": product.product_name if product else None,
        "image_url": product.image_url if product else None,
        "description": product.description if product else None,
        "status": order_status,
    }


def serialize_order(order: Order) -> dict:
    order_items = order.order_items or []
    items = [_serialize_order_item(item, order.status) for item in order_items]

    subtotal = Decimal("0")
    for item in items:
        amount = item.get("amount")
        if amount is None:
            unit_price = _to_decimal(item.get("unit_price"))
            quantity = int(item.get("quantity") or 0)
            amount = unit_price * quantity
        subtotal += _to_decimal(amount)

    shipping_fee = _to_decimal(order.shipping_fee)
    discount_amount = _to_decimal(order.discount_amount)
    total_amount = subtotal + shipping_fee - discount_amount
    if total_amount < 0:
        total_amount = Decimal("0")

    return {
        "order_id": order.order_id,
        "customer_id": order.customer_id,
        "payment_method_id": order.payment_method_id,
        "payment_method_name": order.payment_method.mode_name if order.payment_method else None,
        "order_date": order.order_date,
        "status": order.status,
        "shipping_address": order.shipping_address,
        "shipping_fee": shipping_fee,
        "discount_amount": discount_amount,
        "total_amount": total_amount,
        "items": items,
        "order_items": items,
    }


def get_order_by_id(db: Session, order_id: str):
    """Lay order theo ID"""
    order = _base_order_query(db).filter(Order.order_id == order_id).first()

    if not order:
        raise NotFoundException("Order")

    return order


def get_order_response_by_id(db: Session, order_id: str):
    order = get_order_by_id(db, order_id)
    return serialize_order(order)


def get_all_orders(db: Session, skip: int = 0, limit: int = 10):
    """Lay tat ca orders (co pagination)"""
    orders = _base_order_query(db).offset(skip).limit(limit).all()
    return [serialize_order(order) for order in orders]


def get_orders_by_customer(db: Session, customer_id: str, skip: int = 0, limit: int = 10):
    """Lay orders theo customer (co pagination)"""
    orders = (
        _base_order_query(db)
        .filter(Order.customer_id == customer_id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [serialize_order(order) for order in orders]


def _validate_discount_code(
    db: Session,
    code: str,
    customer_id: str,
    subtotal: Decimal,
    product_ids: set[str] | None = None,
) -> Decimal:
    from datetime import datetime
    normalized = code.strip().upper()
    normalized_product_ids = {str(product_id or "").strip() for product_id in (product_ids or set()) if str(product_id or "").strip()}
    discount_code = db.query(DiscountCode).filter(DiscountCode.code == normalized).first()
    if not discount_code:
        raise BusinessLogicException("Mã giảm giá không tồn tại.")
    if not discount_code.is_active:
        raise BusinessLogicException("Mã giảm giá đã bị vô hiệu hóa.")
    if discount_code.customer_id and discount_code.customer_id != customer_id:
        raise BusinessLogicException("Mã giảm giá không dành cho tài khoản của bạn.")
    if discount_code.product_id and discount_code.product_id not in normalized_product_ids:
        raise BusinessLogicException("Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng.")
    now = datetime.utcnow()
    if discount_code.starts_at and now < discount_code.starts_at:
        raise BusinessLogicException("Mã giảm giá chưa đến hạn sử dụng.")
    if discount_code.expires_at and now > discount_code.expires_at:
        raise BusinessLogicException("Mã giảm giá đã hết hạn.")
    if discount_code.used_count >= discount_code.usage_limit:
        raise BusinessLogicException("Mã giảm giá đã được sử dụng hết.")
    discount_percent = int(discount_code.discount_percent or 0)
    discount_amount = subtotal * Decimal(str(discount_percent)) / Decimal("100")
    discount_code.used_count = discount_code.used_count + 1
    db.flush()
    return discount_amount


def create_order(db: Session, payload):
    """Tao order moi - payload la OrderCreate schema"""
    customer_id = payload.customer_id
    payment_method_id = payload.payment_method_id
    shipping_address = getattr(payload, "shipping_address", None)
    shipping_fee = _to_decimal(getattr(payload, "shipping_fee", Decimal("0")))
    discount_amount = _to_decimal(getattr(payload, "discount_amount", Decimal("0")))
    discount_code = getattr(payload, "discount_code", None)
    items = [item.model_dump() for item in payload.items]

    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise NotFoundException("Customer")

    payment_method = db.query(PaymentMethod).filter(
        PaymentMethod.payment_method_id == payment_method_id
    ).first()
    if not payment_method:
        raise NotFoundException("Payment Method")

    if not items:
        raise BusinessLogicException("Order must contain at least one item")

    subtotal = Decimal("0")
    product_ids: set[str] = set()
    for item in items:
        product_check = db.query(Product).filter(Product.product_id == item["product_id"]).first()
        if not product_check:
            raise NotFoundException(f"Product {item['product_id']}")
        qty_check = int(item.get("quantity") or 0)
        if qty_check <= 0:
            raise BusinessLogicException("Quantity must be greater than 0")
        product_ids.add(str(product_check.product_id or "").strip())
        subtotal += _to_decimal(product_check.unit_price) * qty_check

    if discount_code:
        discount_amount = _validate_discount_code(db, discount_code, customer_id, subtotal, product_ids)

    try:
        new_order = Order(
            customer_id=customer_id,
            payment_method_id=payment_method_id,
            order_date=datetime.utcnow().date(),
            status="Pending",
            shipping_address=shipping_address,
            shipping_fee=shipping_fee,
            discount_amount=discount_amount,
        )

        db.add(new_order)
        db.flush()

        for item in items:
            quantity = int(item.get("quantity") or 0)
            if quantity <= 0:
                raise BusinessLogicException("Quantity must be greater than 0")

            product = db.query(Product).filter(Product.product_id == item["product_id"]).first()
            if not product:
                raise NotFoundException(f"Product {item['product_id']}")

            current_stock = int(product.stock_quantity or 0)
            if quantity > current_stock:
                raise BusinessLogicException(
                    f"Insufficient stock for product {product.product_id}"
                )

            unit_price = _to_decimal(product.unit_price)
            amount = unit_price * quantity
            product.stock_quantity = current_stock - quantity

            order_item = OrderItem(
                order_id=new_order.order_id,
                product_id=product.product_id,
                quantity=quantity,
                amount=amount,
                price_at_purchase=unit_price,
                profit=Decimal("0"),
                discount=Decimal("0"),
            )
            db.add(order_item)

        db.commit()
        db.refresh(new_order)

        reloaded = get_order_by_id(db, new_order.order_id)
        return serialize_order(reloaded)

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        raise BusinessLogicException("Database transaction failed")


def delete_order(db: Session, order_id: str):
    """Xoa order"""
    order = get_order_by_id(db, order_id)

    db.delete(order)
    db.commit()

    return {"message": "Order deleted successfully"}
