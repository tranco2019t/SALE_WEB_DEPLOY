from sqlalchemy import Column, Integer, String, Date
from sqlalchemy.schema import FetchedValue
from sqlalchemy.orm import relationship
from app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column("CustomerID", String(50), primary_key=True, index=True, server_default=FetchedValue())
    customer_name = Column("CustomerName", String(255), nullable=False)
    customer_email = Column("CustomerEmail", String(255), unique=True, index=True, nullable=False)
    phone_number = Column("PhoneNumber", String(20))
    password_hash = Column("Password_Hash", String(255), nullable=False)
    address = Column("Address", String(500))
    created_at = Column("CreatedAt", Date)
    updated_at = Column("UpdatedAt", Date)
    is_active = Column("IsActive", Integer, nullable=False, default=1)

    orders = relationship("Order", back_populates="customer", cascade="all, delete")
    reviews = relationship("Review", back_populates="customer", cascade="all, delete")
    addresses = relationship("Address", back_populates="customer", cascade="all, delete")
    wishlist_items = relationship("Wishlist", back_populates="customer", cascade="all, delete")
    discount_codes = relationship("DiscountCode", back_populates="customer")
    notifications = relationship("Notification", back_populates="customer", cascade="all, delete")
