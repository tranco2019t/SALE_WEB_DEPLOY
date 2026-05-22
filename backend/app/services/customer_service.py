from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.services.exceptions import *
from datetime import datetime, date
import hashlib
import secrets
from passlib.context import CryptContext


_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _sha256(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("$2"):
        return _pwd_context.verify(password, stored_hash)
    return stored_hash == _sha256(password)


def get_customer_by_id(db: Session, customer_id: str):
    customer = db.query(Customer).filter(
        Customer.customer_id == customer_id
    ).first()

    if not customer:
        raise NotFoundException("Customer")

    return customer


def get_all_customers(db: Session, skip: int = 0, limit: int = 10):
    """Lấy tất cả customers (có pagination)"""
    return db.query(Customer).offset(skip).limit(limit).all()


def create_customer(db: Session, data: CustomerCreate):

    existing = db.query(Customer).filter(
        Customer.customer_email == data.customer_email
    ).first()

    if existing:
        raise AlreadyExistsException("Email")

    new_customer = Customer(
        customer_name=data.customer_name,
        customer_email=data.customer_email,
        phone_number=data.phone_number,
        address=data.address,
        password_hash=hash_password(data.password),
        created_at=datetime.utcnow()
    )

    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    return new_customer


def authenticate_customer(db: Session, email_or_phone: str, password: str):
    """Xác thực customer bằng email/phone và password"""
    customer = db.query(Customer).filter(
        (Customer.customer_email == email_or_phone) |
        (Customer.phone_number == email_or_phone)
    ).first()

    if not customer:
        raise NotFoundException("Customer")

    if not verify_password(password, customer.password_hash):
        raise ValidationException("Invalid password")

    if not customer.password_hash.startswith("$2"):
        customer.password_hash = hash_password(password)
        db.commit()
        db.refresh(customer)

    return customer


def get_customer_by_email(db: Session, email: str):
    normalized_email = (email or "").strip().lower()
    if not normalized_email:
        raise ValidationException("Email is required")

    customer = db.query(Customer).filter(
        func.lower(Customer.customer_email) == normalized_email
    ).first()

    if not customer:
        raise ValidationException("Email not found")

    return customer


def reset_customer_password_by_email(db: Session, email: str, new_password: str):
    sanitized_password = (new_password or "").strip()
    if len(sanitized_password) < 6:
        raise ValidationException("New password must be at least 6 characters")

    customer = get_customer_by_email(db, email)
    customer.password_hash = hash_password(sanitized_password)
    customer.updated_at = date.today()

    db.commit()
    db.refresh(customer)

    return {"message": "Password updated successfully"}


def change_customer_password(
    db: Session,
    customer_id: str,
    current_password: str,
    new_password: str
):
    customer = get_customer_by_id(db, customer_id)

    if not verify_password((current_password or "").strip(), customer.password_hash):
        raise ValidationException("Current password is incorrect")

    sanitized_new_password = (new_password or "").strip()
    if len(sanitized_new_password) < 8:
        raise ValidationException("New password must be at least 8 characters")

    has_upper = any(char.isupper() for char in sanitized_new_password)
    has_lower = any(char.islower() for char in sanitized_new_password)
    has_digit = any(char.isdigit() for char in sanitized_new_password)
    if not (has_upper and has_lower and has_digit):
        raise ValidationException("New password must include uppercase, lowercase and digit")

    if verify_password(sanitized_new_password, customer.password_hash):
        raise ValidationException("New password must be different from current password")

    customer.password_hash = hash_password(sanitized_new_password)
    customer.updated_at = date.today()
    db.commit()
    db.refresh(customer)

    return {"message": "Password updated successfully"}


def get_or_create_google_customer(db: Session, email: str, name: str):
    normalized_email = email.strip().lower()
    customer = db.query(Customer).filter(
        func.lower(Customer.customer_email) == normalized_email
    ).first()

    if customer:
        return customer

    local_part = normalized_email.split("@")[0].strip()
    display_name = (local_part or "user")[:255]
    generated_password = secrets.token_urlsafe(32)

    customer = Customer(
        customer_name=display_name[:255],
        customer_email=normalized_email,
        phone_number=None,
        address=None,
        password_hash=hash_password(generated_password),
        created_at=date.today()
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer_id: str, data: CustomerUpdate):

    customer = get_customer_by_id(db, customer_id)

    update_data = data.model_dump(exclude_unset=True)

    email = update_data.get("customer_email")
    if email is not None:
        normalized_email = str(email).strip().lower()
        existing = db.query(Customer).filter(
            func.lower(Customer.customer_email) == normalized_email,
            Customer.customer_id != customer_id
        ).first()
        if existing:
            raise AlreadyExistsException("Email")
        update_data["customer_email"] = normalized_email

    for field, value in update_data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)

    return customer


def delete_customer(db: Session, customer_id: str):

    customer = get_customer_by_id(db, customer_id)

    db.delete(customer)
    db.commit()

    return {"message": "Customer deleted successfully"}
