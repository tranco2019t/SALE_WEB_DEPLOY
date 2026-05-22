from datetime import datetime
from pathlib import Path
import uuid

from fastapi import UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.review import Review
from app.schemas.review import ReviewCreate
from app.services.exceptions import BusinessLogicException, NotFoundException


REVIEW_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "reviews"
REVIEW_IMAGE_PREFIX = "/uploads/reviews/"
ALLOWED_REVIEW_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_REVIEW_IMAGES = 5
MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024


def _normalize_review_image_urls(image_urls) -> list[str]:
    if not isinstance(image_urls, list):
        return []
    return [str(item).strip() for item in image_urls if str(item or "").strip()]


def _build_review_image_url(filename: str) -> str:
    return REVIEW_IMAGE_PREFIX + filename


def _get_review_image_extension(upload: UploadFile) -> str:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix in ALLOWED_REVIEW_IMAGE_EXTENSIONS:
        return suffix

    content_type = (upload.content_type or "").lower()
    if content_type == "image/jpeg":
        return ".jpg"
    if content_type == "image/png":
        return ".png"
    if content_type == "image/webp":
        return ".webp"
    if content_type == "image/gif":
        return ".gif"
    return suffix


def _delete_review_images(image_urls) -> None:
    for image_url in _normalize_review_image_urls(image_urls):
        if not image_url.startswith(REVIEW_IMAGE_PREFIX):
            continue

        target = REVIEW_UPLOAD_DIR / Path(image_url).name
        try:
            if target.exists():
                target.unlink()
        except OSError:
            continue


def _save_review_images(images: list[UploadFile] | None) -> list[str]:
    valid_images = [item for item in (images or []) if item and (item.filename or "").strip()]
    if not valid_images:
        return []

    if len(valid_images) > MAX_REVIEW_IMAGES:
        raise BusinessLogicException(f"Bạn chỉ có thể tải tối đa {MAX_REVIEW_IMAGES} ảnh đánh giá.")

    REVIEW_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved_urls: list[str] = []

    try:
        for image in valid_images:
            content_type = (image.content_type or "").lower()
            if content_type and not content_type.startswith("image/"):
                raise BusinessLogicException("Tệp đính kèm phải là hình ảnh.")

            extension = _get_review_image_extension(image)
            if extension not in ALLOWED_REVIEW_IMAGE_EXTENSIONS:
                raise BusinessLogicException("Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF.")

            payload = image.file.read()
            if not payload:
                raise BusinessLogicException("Ảnh tải lên đang trống hoặc không hợp lệ.")
            if len(payload) > MAX_REVIEW_IMAGE_SIZE:
                raise BusinessLogicException("Mỗi ảnh đánh giá phải nhỏ hơn 5MB.")

            filename = "review_" + uuid.uuid4().hex + extension
            target = REVIEW_UPLOAD_DIR / filename
            with target.open("wb") as output:
                output.write(payload)

            saved_urls.append(_build_review_image_url(filename))
    except Exception:
        _delete_review_images(saved_urls)
        raise

    return saved_urls


def _update_product_review_stats(db: Session, product_id: str) -> None:
    total = db.query(Review).filter(Review.product_id == product_id).count()
    sum_rating = db.query(func.sum(Review.rating)).filter(Review.product_id == product_id).scalar() or 0
    avg = float(sum_rating) / total if total > 0 else 0.0

    from app.models.product import Product

    product = db.get(Product, product_id)
    if not product:
        return

    product.total_reviews = total
    product.rating_avg = avg
    db.commit()
    db.refresh(product)


def create_review(db: Session, data: ReviewCreate, images: list[UploadFile] | None = None):
    existing = db.query(Review).filter(
        Review.product_id == data.product_id,
        Review.customer_id == data.customer_id
    ).first()

    saved_image_urls = _save_review_images(images)

    if existing:
        old_image_urls = list(existing.image_urls or [])
        existing.rating = data.rating
        existing.comment = data.comment
        existing.created_at = datetime.utcnow()
        if saved_image_urls:
            existing.image_urls = saved_image_urls
        db.commit()
        db.refresh(existing)
        if saved_image_urls:
            _delete_review_images(old_image_urls)
        review_record = existing
    else:
        payload = data.model_dump()
        payload["image_urls"] = saved_image_urls
        new = Review(**payload)
        new.created_at = datetime.utcnow()
        db.add(new)
        db.commit()
        db.refresh(new)
        review_record = new

    _update_product_review_stats(db, review_record.product_id)
    return review_record


def get_reviews_by_product(db: Session, product_id: str):
    return db.query(Review).filter(Review.product_id == product_id).all()


def get_reviews_by_customer(db: Session, customer_id: str):
    return db.query(Review).filter(Review.customer_id == customer_id).all()


def get_review_by_id(db: Session, review_id: str):
    review = db.query(Review).filter(Review.review_id == review_id).first()
    if not review:
        raise NotFoundException("Review")
    return review


def delete_review(db: Session, review_id: str):
    review = get_review_by_id(db, review_id)
    _delete_review_images(review.image_urls)
    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}
