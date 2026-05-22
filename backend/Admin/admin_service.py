from datetime import date
from decimal import Decimal
import uuid

from sqlalchemy import func, literal, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from Admin.admin_schema import (
    AdminCustomerResponse,
    AdminCustomerUpdate,
    AdminDashboardResponse,
    AdminDashboardStats,
    AdminOrderResponse,
    AdminProductCreate,
    AdminProductResponse,
    AdminProductUpdate,
    DiscountCodeCreate,
    DiscountCodeResponse,
    DiscountCodeUpdate,
)
from app.models.category import Category
from app.models.customer import Customer
from app.models.discount_code import DiscountCode
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.schemas.order import OrderUpdate
from app.services import order_service, product_service
from app.services.exceptions import AlreadyExistsException, BusinessLogicException, NotFoundException
from app.services.notification_service import create_notifications


LOW_STOCK_THRESHOLD = 5


def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _normalize_keyword(keyword: str | None) -> str:
    return (keyword or "").strip()


def _normalize_discount_code(code: str) -> str:
    normalized = (code or "").strip().upper()
    if not normalized:
        raise BusinessLogicException("Discount code is required")
    return normalized


def _generate_discount_code_id() -> str:
    return "DC" + uuid.uuid4().hex[:10].upper()


def _is_pending_status(status: str | None) -> bool:
    normalized = (status or "").strip().lower()
    return normalized in {"pending", "processing", "confirmed", "cho xac nhan"}


def _serialize_admin_product(product: Product, category_name: str | None, sold_quantity: int = 0) -> AdminProductResponse:
    return AdminProductResponse(
        product_id=product.product_id,
        category_id=product.category_id,
        category_name=category_name,
        product_name=product.product_name,
        description=product.description,
        image_url=product.image_url,
        unit_price=_to_decimal(product.unit_price),
        discount_percent=int(product.discount_percent or 0),
        stock_quantity=int(product.stock_quantity or 0),
        rating_avg=_to_decimal(product.rating_avg),
        total_reviews=int(product.total_reviews or 0),
        sold_quantity=int(sold_quantity or 0),
    )


def _serialize_admin_order(order: Order) -> AdminOrderResponse:
    payload = order_service.serialize_order(order)
    customer = order.customer
    payload["customer_name"] = customer.customer_name if customer else None
    payload["customer_email"] = customer.customer_email if customer else None
    return AdminOrderResponse(**payload)


def _serialize_admin_customer(customer: Customer) -> AdminCustomerResponse:
    orders = customer.orders or []
    total_spent = Decimal("0")
    last_order_date = None

    for order in orders:
        total_spent += _to_decimal(order_service.serialize_order(order).get("total_amount"))
        if order.order_date and (last_order_date is None or order.order_date > last_order_date):
            last_order_date = order.order_date

    return AdminCustomerResponse(
        customer_id=customer.customer_id,
        customer_name=customer.customer_name,
        customer_email=customer.customer_email,
        phone_number=customer.phone_number,
        address=customer.address,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
        is_active=bool(customer.is_active),
        orders_count=len(orders),
        total_spent=total_spent,
        last_order_date=last_order_date,
    )


def _serialize_discount_code(discount_code: DiscountCode) -> DiscountCodeResponse:
    customer = discount_code.customer
    product = discount_code.product
    return DiscountCodeResponse(
        discount_code_id=discount_code.discount_code_id,
        code=discount_code.code,
        description=discount_code.description,
        discount_percent=int(discount_code.discount_percent or 0),
        product_id=discount_code.product_id,
        product_name=product.product_name if product else None,
        customer_id=discount_code.customer_id,
        customer_name=customer.customer_name if customer else None,
        customer_email=customer.customer_email if customer else None,
        usage_limit=int(discount_code.usage_limit or 0),
        used_count=int(discount_code.used_count or 0),
        starts_at=discount_code.starts_at,
        expires_at=discount_code.expires_at,
        is_active=bool(discount_code.is_active),
        created_at=discount_code.created_at,
    )


def _product_sales_subquery(db: Session):
    return (
        db.query(
            OrderItem.product_id.label("product_id"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("sold_quantity"),
        )
        .group_by(OrderItem.product_id)
        .subquery()
    )


def _admin_products_query(db: Session):
    sold_quantity = literal(0)
    query = (
        db.query(
            Product,
            Category.category_name.label("category_name"),
            sold_quantity.label("sold_quantity"),
        )
        .join(Category, Product.category_id == Category.category_id)
    )
    return query, sold_quantity


def _top_products_ordering():
    # Sold quantity is intentionally forced to 0 for every product, so we
    # avoid ordering by that constant expression because PostgreSQL treats
    # `ORDER BY 0` as an invalid positional reference.
    return (
        Product.total_reviews.desc(),
        Product.rating_avg.desc(),
        Product.product_name.asc(),
    )


def _admin_orders_query(db: Session):
    return db.query(Order).options(
        selectinload(Order.order_items).selectinload(OrderItem.product),
        joinedload(Order.customer),
        joinedload(Order.payment_method),
    )


def get_dashboard(db: Session) -> AdminDashboardResponse:
    total_products = db.query(func.count(Product.product_id)).scalar() or 0
    total_customers = db.query(func.count(Customer.customer_id)).scalar() or 0
    total_orders = db.query(func.count(Order.order_id)).scalar() or 0
    total_categories = db.query(func.count(Category.category_id)).scalar() or 0
    active_discount_codes = (
        db.query(func.count(DiscountCode.discount_code_id))
        .filter(DiscountCode.is_active.is_(True))
        .scalar()
        or 0
    )

    orders = _admin_orders_query(db).order_by(Order.order_date.desc(), Order.order_id.desc()).all()
    total_revenue = Decimal("0")
    pending_orders = 0
    for order in orders:
        total_revenue += _to_decimal(order_service.serialize_order(order).get("total_amount"))
        if _is_pending_status(order.status):
            pending_orders += 1

    query, sold_quantity = _admin_products_query(db)
    top_products = (
        query.order_by(*_top_products_ordering())
        .limit(5)
        .all()
    )
    low_stock_products = (
        query.filter(Product.stock_quantity <= LOW_STOCK_THRESHOLD)
        .order_by(Product.stock_quantity.asc(), Product.product_name.asc())
        .limit(5)
        .all()
    )

    stats = AdminDashboardStats(
        total_products=int(total_products),
        total_customers=int(total_customers),
        total_orders=int(total_orders),
        total_categories=int(total_categories),
        pending_orders=int(pending_orders),
        low_stock_products=int(
            db.query(func.count(Product.product_id))
            .filter(Product.stock_quantity <= LOW_STOCK_THRESHOLD)
            .scalar()
            or 0
        ),
        active_discount_codes=int(active_discount_codes),
        total_revenue=total_revenue,
    )

    return AdminDashboardResponse(
        stats=stats,
        recent_orders=[_serialize_admin_order(order) for order in orders[:5]],
        top_products=[
            _serialize_admin_product(product, category_name, sold)
            for product, category_name, sold in top_products
        ],
        low_stock_products=[
            _serialize_admin_product(product, category_name, sold)
            for product, category_name, sold in low_stock_products
        ],
    )


def get_products(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    keyword: str | None = None,
    category_id: str | None = None,
) -> list[AdminProductResponse]:
    query, _ = _admin_products_query(db)
    search = _normalize_keyword(keyword)

    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                Product.product_id.ilike(like_term),
                Product.product_name.ilike(like_term),
                Product.description.ilike(like_term),
                Category.category_name.ilike(like_term),
            )
        )

    if category_id:
        query = query.filter(Product.category_id == category_id)

    rows = query.order_by(Product.product_id.desc()).offset(skip).limit(limit).all()
    return [
        _serialize_admin_product(product, category_name, sold_quantity)
        for product, category_name, sold_quantity in rows
    ]


def get_product_by_id(db: Session, product_id: str) -> AdminProductResponse:
    query, _ = _admin_products_query(db)
    row = query.filter(Product.product_id == product_id).first()
    if not row:
        raise NotFoundException("Product")

    product, category_name, sold_quantity = row
    return _serialize_admin_product(product, category_name, sold_quantity)


def create_product(db: Session, payload: AdminProductCreate) -> AdminProductResponse:
    created = product_service.create_product(db, payload)
    return get_product_by_id(db, created.product_id)


def update_product(db: Session, product_id: str, payload: AdminProductUpdate) -> AdminProductResponse:
    product_service.update_product(db, product_id, payload)
    return get_product_by_id(db, product_id)


def delete_product(db: Session, product_id: str) -> None:
    product = product_service.get_product_by_id(db, product_id)
    if product.order_items:
        raise BusinessLogicException("Cannot delete a product that already exists in orders")
    product_service.delete_product(db, product_id)


def get_orders(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    keyword: str | None = None,
) -> list[AdminOrderResponse]:
    query = _admin_orders_query(db).outerjoin(Customer, Order.customer_id == Customer.customer_id)
    search = _normalize_keyword(keyword)
    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                Order.order_id.ilike(like_term),
                Order.status.ilike(like_term),
                Customer.customer_name.ilike(like_term),
                Customer.customer_email.ilike(like_term),
            )
        )

    orders = query.order_by(Order.order_date.desc(), Order.order_id.desc()).offset(skip).limit(limit).all()
    return [_serialize_admin_order(order) for order in orders]


def get_order_by_id(db: Session, order_id: str) -> AdminOrderResponse:
    order = _admin_orders_query(db).filter(Order.order_id == order_id).first()
    if not order:
        raise NotFoundException("Order")
    return _serialize_admin_order(order)


def update_order_status(db: Session, order_id: str, payload: OrderUpdate) -> AdminOrderResponse:
    order = order_service.get_order_by_id(db, order_id)
    previous_status = order.status
    notification_status = None

    if payload.status is not None:
        next_status = payload.status.strip()
        if not next_status:
            raise BusinessLogicException("Order status is required")

        if next_status != order.status:
            order.status = next_status
            db.commit()
            db.refresh(order)

        if _normalize_order_status(previous_status) != _normalize_order_status(next_status):
            notification_status = order.status

    if notification_status and order.customer_id:
        create_notification(
            db,
            order.customer_id,
            _build_order_notification_title(order.order_id),
            _build_order_notification_message(order.order_id, notification_status),
            "order",
            order.order_id,
        )

    reloaded = _admin_orders_query(db).filter(Order.order_id == order_id).first()
    if not reloaded:
        raise NotFoundException("Order")
    return _serialize_admin_order(reloaded)


def get_customers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    keyword: str | None = None,
) -> list[AdminCustomerResponse]:
    query = db.query(Customer).options(
        selectinload(Customer.orders).selectinload(Order.order_items).selectinload(OrderItem.product),
        selectinload(Customer.orders).joinedload(Order.payment_method),
    )
    search = _normalize_keyword(keyword)

    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                Customer.customer_id.ilike(like_term),
                Customer.customer_name.ilike(like_term),
                Customer.customer_email.ilike(like_term),
                Customer.phone_number.ilike(like_term),
            )
        )

    customers = query.order_by(Customer.created_at.desc(), Customer.customer_id.desc()).offset(skip).limit(limit).all()
    return [_serialize_admin_customer(customer) for customer in customers]


def get_customer_by_id(db: Session, customer_id: str) -> AdminCustomerResponse:
    customer = (
        db.query(Customer)
        .options(
            selectinload(Customer.orders).selectinload(Order.order_items).selectinload(OrderItem.product),
            selectinload(Customer.orders).joinedload(Order.payment_method),
        )
        .filter(Customer.customer_id == customer_id)
        .first()
    )
    if not customer:
        raise NotFoundException("Customer")
    return _serialize_admin_customer(customer)


def update_customer(db: Session, customer_id: str, payload: AdminCustomerUpdate) -> AdminCustomerResponse:
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise NotFoundException("Customer")

    update_data = payload.model_dump(exclude_unset=True)
    email = update_data.get("customer_email")
    if email is not None:
        normalized_email = str(email).strip().lower()
        existing = (
            db.query(Customer)
            .filter(
                func.lower(Customer.customer_email) == normalized_email,
                Customer.customer_id != customer_id,
            )
            .first()
        )
        if existing:
            raise AlreadyExistsException("Email")
        update_data["customer_email"] = normalized_email

    if "is_active" in update_data:
        update_data["is_active"] = 1 if update_data["is_active"] else 0

    for field, value in update_data.items():
        setattr(customer, field, value)

    customer.updated_at = date.today()
    db.commit()
    return get_customer_by_id(db, customer_id)


def _validate_discount_targets(db: Session, product_id: str | None, customer_id: str | None) -> tuple[str | None, str | None]:
    normalized_product_id = (product_id or "").strip() or None
    normalized_customer_id = (customer_id or "").strip() or None

    if normalized_product_id:
        product = db.query(Product).filter(Product.product_id == normalized_product_id).first()
        if not product:
            raise NotFoundException("Product")

    if normalized_customer_id:
        customer = db.query(Customer).filter(Customer.customer_id == normalized_customer_id).first()
        if not customer:
            raise NotFoundException("Customer")

    return normalized_product_id, normalized_customer_id


def _validate_discount_dates(starts_at, expires_at) -> None:
    if starts_at and expires_at and expires_at < starts_at:
        raise BusinessLogicException("Expiry date must be after start date")


def _build_discount_notification_message(discount_code: DiscountCode) -> str:
    msg = f"Mã {discount_code.code} giảm {int(discount_code.discount_percent or 0)}%"
    if discount_code.product and discount_code.product.product_name:
        msg += f" cho sản phẩm {discount_code.product.product_name}"
    return msg


def _get_discount_notification_customer_ids(db: Session, customer_id: str | None) -> list[str]:
    normalized_customer_id = (customer_id or "").strip()
    if normalized_customer_id:
        return [normalized_customer_id]

    rows = (
        db.query(Customer.customer_id)
        .filter(Customer.is_active == 1)
        .order_by(Customer.customer_id.asc())
        .all()
    )
    return [str(row[0]).strip() for row in rows if row and str(row[0]).strip()]


def _notify_discount_targets(db: Session, discount_code: DiscountCode) -> int:
    customer_ids = _get_discount_notification_customer_ids(db, discount_code.customer_id)
    if not customer_ids:
        return 0

    create_notifications(
        db,
        customer_ids,
        "Bạn nhận được mã giảm giá mới",
        _build_discount_notification_message(discount_code),
        "promo",
        discount_code.discount_code_id,
    )
    return len(customer_ids)


def _normalize_order_status(status: str | None) -> str:
    return (status or "").strip().lower()


def _build_order_status_label(status: str | None) -> str:
    normalized = _normalize_order_status(status)
    if not normalized:
        return "Ch\u1edd x\u00e1c nh\u1eadn"
    if "deliver" in normalized:
        return "\u0110\u00e3 giao"
    if "ship" in normalized:
        return "\u0110ang giao"
    if "cancel" in normalized:
        return "\u0110\u00e3 h\u1ee7y"
    if "confirm" in normalized:
        return "\u0110\u00e3 x\u00e1c nh\u1eadn"
    if "pending" in normalized or "process" in normalized or "wait" in normalized:
        return "Ch\u1edd x\u00e1c nh\u1eadn"
    return (status or "").strip() or "Ch\u1edd x\u00e1c nh\u1eadn"


def _build_order_notification_title(order_id: str) -> str:
    return f"\u0110\u01a1n h\u00e0ng {order_id} c\u1ee7a b\u1ea1n \u0111\u00e3 \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt"


def _build_order_notification_message(order_id: str, status: str | None) -> str:
    status_label = _build_order_status_label(status)
    return f"Tr\u1ea1ng th\u00e1i \u0111\u01a1n h\u00e0ng {order_id} \u0111\u00e3 chuy\u1ec3n sang {status_label}."


def get_discount_codes(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    keyword: str | None = None,
) -> list[DiscountCodeResponse]:
    query = db.query(DiscountCode).options(
        joinedload(DiscountCode.product),
        joinedload(DiscountCode.customer),
    )
    search = _normalize_keyword(keyword)

    if search:
        like_term = f"%{search.upper()}%"
        query = query.outerjoin(Product, DiscountCode.product_id == Product.product_id).outerjoin(
            Customer,
            DiscountCode.customer_id == Customer.customer_id,
        ).filter(
            or_(
                func.upper(DiscountCode.code).ilike(like_term),
                Product.product_name.ilike(f"%{search}%"),
                Customer.customer_name.ilike(f"%{search}%"),
                Customer.customer_email.ilike(f"%{search}%"),
            )
        )

    items = query.order_by(DiscountCode.created_at.desc(), DiscountCode.code.asc()).offset(skip).limit(limit).all()
    return [_serialize_discount_code(item) for item in items]


def create_discount_code(db: Session, payload: DiscountCodeCreate) -> DiscountCodeResponse:
    code = _normalize_discount_code(payload.code)
    existing = db.query(DiscountCode).filter(DiscountCode.code == code).first()
    if existing:
        raise AlreadyExistsException("Discount code")

    product_id, customer_id = _validate_discount_targets(db, payload.product_id, payload.customer_id)
    _validate_discount_dates(payload.starts_at, payload.expires_at)

    discount_code = DiscountCode(
        discount_code_id=_generate_discount_code_id(),
        code=code,
        description=(payload.description or "").strip() or None,
        discount_percent=payload.discount_percent,
        product_id=product_id,
        customer_id=customer_id,
        usage_limit=payload.usage_limit,
        used_count=0,
        starts_at=payload.starts_at,
        expires_at=payload.expires_at,
        is_active=payload.is_active,
    )
    db.add(discount_code)
    db.commit()

    reloaded = (
        db.query(DiscountCode)
        .options(joinedload(DiscountCode.product), joinedload(DiscountCode.customer))
        .filter(DiscountCode.discount_code_id == discount_code.discount_code_id)
        .first()
    )
    if not reloaded:
        raise NotFoundException("Discount code")

    _notify_discount_targets(db, reloaded)
    return _serialize_discount_code(reloaded)


def update_discount_code(db: Session, discount_code_id: str, payload: DiscountCodeUpdate) -> DiscountCodeResponse:
    discount_code = db.query(DiscountCode).filter(DiscountCode.discount_code_id == discount_code_id).first()
    if not discount_code:
        raise NotFoundException("Discount code")

    previous_customer_id = discount_code.customer_id
    update_data = payload.model_dump(exclude_unset=True)
    if "code" in update_data and update_data["code"] is not None:
        normalized_code = _normalize_discount_code(update_data["code"])
        existing = (
            db.query(DiscountCode)
            .filter(
                DiscountCode.code == normalized_code,
                DiscountCode.discount_code_id != discount_code_id,
            )
            .first()
        )
        if existing:
            raise AlreadyExistsException("Discount code")
        update_data["code"] = normalized_code

    if "product_id" in update_data or "customer_id" in update_data:
        product_id, customer_id = _validate_discount_targets(
            db,
            update_data.get("product_id", discount_code.product_id),
            update_data.get("customer_id", discount_code.customer_id),
        )
        update_data["product_id"] = product_id
        update_data["customer_id"] = customer_id

    starts_at = update_data.get("starts_at", discount_code.starts_at)
    expires_at = update_data.get("expires_at", discount_code.expires_at)
    _validate_discount_dates(starts_at, expires_at)

    usage_limit = int(update_data.get("usage_limit", discount_code.usage_limit or 0))
    used_count = int(update_data.get("used_count", discount_code.used_count or 0))
    if used_count > usage_limit:
        raise BusinessLogicException("Used count cannot be greater than usage limit")

    for field, value in update_data.items():
        if field == "description":
            value = (value or "").strip() or None
        setattr(discount_code, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AlreadyExistsException("Discount code")

    reloaded = (
        db.query(DiscountCode)
        .options(joinedload(DiscountCode.product), joinedload(DiscountCode.customer))
        .filter(DiscountCode.discount_code_id == discount_code_id)
        .first()
    )
    if not reloaded:
        raise NotFoundException("Discount code")

    should_notify_specific_customer = bool(reloaded.customer_id and reloaded.customer_id != previous_customer_id)
    should_notify_broadcast = bool(previous_customer_id and not reloaded.customer_id)
    if should_notify_specific_customer or should_notify_broadcast:
        _notify_discount_targets(db, reloaded)

    return _serialize_discount_code(reloaded)


def delete_discount_code(db: Session, discount_code_id: str) -> None:
    discount_code = db.query(DiscountCode).filter(DiscountCode.discount_code_id == discount_code_id).first()
    if not discount_code:
        raise NotFoundException("Discount code")

    db.delete(discount_code)
    db.commit()
