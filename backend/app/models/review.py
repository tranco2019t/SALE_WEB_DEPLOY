import json

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.schema import FetchedValue
from sqlalchemy.orm import relationship
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"

    review_id = Column("ReviewID", String(50), primary_key=True, index=True, server_default=FetchedValue())
    product_id = Column("ProductID", String(50), ForeignKey("products.ProductID"), nullable=False)
    customer_id = Column("CustomerID", String(50), ForeignKey("customers.CustomerID"), nullable=False)
    rating = Column("Rating", Integer, nullable=False)
    comment = Column("Comment", String(1000))
    _image_urls = Column("ImageUrls", Text, nullable=False, default="[]", server_default="[]")
    created_at = Column("CreatedAt", DateTime)

    product = relationship("Product", back_populates="reviews")
    customer = relationship("Customer", back_populates="reviews")

    @property
    def image_urls(self):
        raw = self._image_urls or "[]"
        try:
            data = json.loads(raw)
        except (TypeError, ValueError):
            data = []

        if not isinstance(data, list):
            return []

        return [str(item) for item in data if str(item or "").strip()]

    @image_urls.setter
    def image_urls(self, value):
        items = value if isinstance(value, list) else []
        normalized = [str(item).strip() for item in items if str(item or "").strip()]
        self._image_urls = json.dumps(normalized, ensure_ascii=False)
