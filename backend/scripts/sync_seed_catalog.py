from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from sqlalchemy import func


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.models.category import Category
from app.models.discount_code import DiscountCode
from app.models.order_item import OrderItem
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.review import Review
from app.models.wishlist import Wishlist


SEED_CATEGORIES_PATH = PROJECT_ROOT / "project_seed_data" / "Dataset_goc" / "categories_index.json"
SEED_PRODUCTS_PATH = PROJECT_ROOT / "project_seed_data" / "Dataset_goc" / "products_all.json"
MONEY_QUANT = Decimal("0.01")
RATING_QUANT = Decimal("0.01")


@dataclass
class SeedCategory:
    category_id: str
    category_name: str
    subcategory: str | None


@dataclass
class SeedProduct:
    product_id: str
    category_id: str
    product_name: str
    description: str | None
    image_url: str | None
    unit_price: Decimal
    discount_percent: int
    stock_quantity: int
    rating_avg: Decimal
    total_reviews: int


@dataclass
class SeedPaymentMethod:
    payment_method_id: str
    mode_name: str


# Edit this list when you want Docker startup to auto-seed default payment methods.
DEFAULT_PAYMENT_METHODS: tuple[SeedPaymentMethod, ...] = (
    SeedPaymentMethod(
        payment_method_id="SEED_PM_COD",
        mode_name="Thanh toán khi nhận hàng (COD)",
    ),
    SeedPaymentMethod(
        payment_method_id="SEED_PM_BANK_TRANSFER",
        mode_name="Chuyển khoản ngân hàng",
    ),
    SeedPaymentMethod(
        payment_method_id="SEED_PM_EWALLET",
        mode_name="Ví điện tử (Momo, ZaloPay)",
    ),
)


def _read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _normalize_decimal(value: Any, quant: Decimal) -> Decimal:
    return Decimal(str(value)).quantize(quant, rounding=ROUND_HALF_UP)


def _normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _build_local_image_url(raw_product: dict[str, Any]) -> str | None:
    category_folder = _normalize_text(raw_product.get("category_folder"))
    image_file = _normalize_text(raw_product.get("image_file"))
    if not category_folder or not image_file:
        return None
    return f"{category_folder}/{image_file.lstrip('/')}"


def load_seed_categories() -> dict[str, SeedCategory]:
    payload = _read_json(SEED_CATEGORIES_PATH)
    categories: dict[str, SeedCategory] = {}
    for item in payload:
        category_id = str(item["category_id"]).strip()
        categories[category_id] = SeedCategory(
            category_id=category_id,
            category_name=str(item["category_name"]).strip(),
            subcategory=_normalize_text(item.get("subcategory")),
        )
    return categories


def load_seed_products(image_mode: str) -> dict[str, SeedProduct]:
    payload = _read_json(SEED_PRODUCTS_PATH)
    products: dict[str, SeedProduct] = {}
    for item in payload:
        product_id = str(item["product_id"]).strip()
        remote_image = _normalize_text(item.get("image_source_url"))
        local_image = _build_local_image_url(item)
        image_url = remote_image if image_mode == "remote" and remote_image else local_image

        products[product_id] = SeedProduct(
            product_id=product_id,
            category_id=str(item["category_id"]).strip(),
            product_name=str(item["product_name"]).strip(),
            description=_normalize_text(item.get("description")),
            image_url=image_url,
            unit_price=_normalize_decimal(item["unit_price"], MONEY_QUANT),
            discount_percent=int(item.get("discount_percent", 0) or 0),
            stock_quantity=int(item.get("stock_quantity", 0) or 0),
            rating_avg=_normalize_decimal(item.get("rating_avg", 0), RATING_QUANT),
            total_reviews=int(item.get("total_reviews", 0) or 0),
        )
    return products


def diff_category(existing: Category, seed: SeedCategory) -> list[str]:
    changed: list[str] = []
    if (existing.category_name or "") != seed.category_name:
        changed.append("category_name")
    if (existing.subcategory or None) != seed.subcategory:
        changed.append("subcategory")
    return changed


def diff_product(existing: Product, seed: SeedProduct) -> list[str]:
    changed: list[str] = []
    if (existing.category_id or "") != seed.category_id:
        changed.append("category_id")
    if (existing.product_name or "") != seed.product_name:
        changed.append("product_name")
    if (existing.description or None) != seed.description:
        changed.append("description")
    if (existing.image_url or None) != seed.image_url:
        changed.append("image_url")
    if _normalize_decimal(existing.unit_price or 0, MONEY_QUANT) != seed.unit_price:
        changed.append("unit_price")
    if int(existing.discount_percent or 0) != seed.discount_percent:
        changed.append("discount_percent")
    if int(existing.stock_quantity or 0) != seed.stock_quantity:
        changed.append("stock_quantity")
    if _normalize_decimal(existing.rating_avg or 0, RATING_QUANT) != seed.rating_avg:
        changed.append("rating_avg")
    if int(existing.total_reviews or 0) != seed.total_reviews:
        changed.append("total_reviews")
    return changed


def apply_category(existing: Category, seed: SeedCategory) -> None:
    existing.category_name = seed.category_name
    existing.subcategory = seed.subcategory


def apply_product(existing: Product, seed: SeedProduct) -> None:
    existing.category_id = seed.category_id
    existing.product_name = seed.product_name
    existing.description = seed.description
    existing.image_url = seed.image_url
    existing.unit_price = seed.unit_price
    existing.discount_percent = seed.discount_percent
    existing.stock_quantity = seed.stock_quantity
    existing.rating_avg = seed.rating_avg
    existing.total_reviews = seed.total_reviews


def diff_payment_method(existing: PaymentMethod, seed: SeedPaymentMethod) -> list[str]:
    changed: list[str] = []
    if (existing.mode_name or "") != seed.mode_name:
        changed.append("mode_name")
    return changed


def apply_payment_method(existing: PaymentMethod, seed: SeedPaymentMethod) -> None:
    existing.mode_name = seed.mode_name


def _group_reference_counts(session, model, extra_product_ids: list[str]) -> dict[str, int]:
    if not extra_product_ids:
        return {}

    rows = (
        session.query(model.product_id, func.count())
        .filter(model.product_id.in_(extra_product_ids))
        .group_by(model.product_id)
        .all()
    )
    return {product_id: int(count) for product_id, count in rows}


def build_reference_report(session, extra_product_ids: list[str]) -> dict[str, dict[str, int]]:
    return {
        "orderitems": _group_reference_counts(session, OrderItem, extra_product_ids),
        "reviews": _group_reference_counts(session, Review, extra_product_ids),
        "wishlists": _group_reference_counts(session, Wishlist, extra_product_ids),
        "discountcodes": _group_reference_counts(session, DiscountCode, extra_product_ids),
    }


def print_summary(
    *,
    category_inserts: list[str],
    category_updates: dict[str, list[str]],
    category_extras: list[str],
    product_inserts: list[str],
    product_updates: dict[str, list[str]],
    product_extras: list[str],
    payment_method_inserts: list[str],
    payment_method_updates: dict[str, list[str]],
    reference_report: dict[str, dict[str, int]],
    apply: bool,
    prune_extra: bool,
    image_mode: str,
) -> None:
    mode = "APPLY" if apply else "DRY-RUN"
    print(f"[{mode}] image_mode={image_mode} prune_extra={prune_extra}")
    print(
        "Categories:",
        f"insert={len(category_inserts)}",
        f"update={len(category_updates)}",
        f"extra={len(category_extras)}",
    )
    print(
        "Products:",
        f"insert={len(product_inserts)}",
        f"update={len(product_updates)}",
        f"extra={len(product_extras)}",
    )
    print(
        "Payment methods:",
        f"insert={len(payment_method_inserts)}",
        f"update={len(payment_method_updates)}",
    )

    if category_inserts:
        print("  New categories:", ", ".join(category_inserts[:10]))
    if category_updates:
        preview = [f"{category_id}({','.join(fields)})" for category_id, fields in list(category_updates.items())[:10]]
        print("  Category updates:", ", ".join(preview))
    if product_inserts:
        print("  New products:", ", ".join(product_inserts[:10]))
    if product_updates:
        preview = [f"{product_id}({','.join(fields)})" for product_id, fields in list(product_updates.items())[:10]]
        print("  Product updates:", ", ".join(preview))
    if payment_method_inserts:
        print("  New payment methods:", ", ".join(payment_method_inserts[:10]))
    if payment_method_updates:
        preview = [
            f"{payment_method_id}({','.join(fields)})"
            for payment_method_id, fields in list(payment_method_updates.items())[:10]
        ]
        print("  Payment method updates:", ", ".join(preview))
    if product_extras:
        print("  Extra products:", ", ".join(product_extras[:10]))
    if category_extras:
        print("  Extra categories:", ", ".join(category_extras[:10]))

    referenced_ids = sorted(
        {
            product_id
            for refs in reference_report.values()
            for product_id, count in refs.items()
            if count > 0
        }
    )
    if referenced_ids:
        print("  Extra products with references:", ", ".join(referenced_ids[:10]))


def sync_catalog(*, apply: bool, prune_extra: bool, image_mode: str) -> int:
    seed_categories = load_seed_categories()
    seed_products = load_seed_products(image_mode=image_mode)
    seed_payment_methods = {
        payment_method.payment_method_id: payment_method
        for payment_method in DEFAULT_PAYMENT_METHODS
    }

    session = SessionLocal()
    try:
        existing_categories = {
            category.category_id: category
            for category in session.query(Category).all()
        }
        existing_products = {
            product.product_id: product
            for product in session.query(Product).all()
        }
        existing_payment_methods = {
            payment_method.payment_method_id: payment_method
            for payment_method in session.query(PaymentMethod)
            .filter(PaymentMethod.payment_method_id.in_(list(seed_payment_methods.keys())))
            .all()
        }

        category_inserts: list[str] = []
        category_updates: dict[str, list[str]] = {}
        product_inserts: list[str] = []
        product_updates: dict[str, list[str]] = {}
        payment_method_inserts: list[str] = []
        payment_method_updates: dict[str, list[str]] = {}

        for category_id, seed_category in seed_categories.items():
            existing = existing_categories.get(category_id)
            if existing is None:
                category_inserts.append(category_id)
                if apply:
                    session.add(
                        Category(
                            category_id=seed_category.category_id,
                            category_name=seed_category.category_name,
                            subcategory=seed_category.subcategory,
                        )
                    )
                continue

            changed = diff_category(existing, seed_category)
            if changed:
                category_updates[category_id] = changed
                if apply:
                    apply_category(existing, seed_category)

        for product_id, seed_product in seed_products.items():
            existing = existing_products.get(product_id)
            if existing is None:
                product_inserts.append(product_id)
                if apply:
                    session.add(
                        Product(
                            product_id=seed_product.product_id,
                            category_id=seed_product.category_id,
                            product_name=seed_product.product_name,
                            description=seed_product.description,
                            image_url=seed_product.image_url,
                            unit_price=seed_product.unit_price,
                            discount_percent=seed_product.discount_percent,
                            stock_quantity=seed_product.stock_quantity,
                            rating_avg=seed_product.rating_avg,
                            total_reviews=seed_product.total_reviews,
                        )
                    )
                continue

            changed = diff_product(existing, seed_product)
            if changed:
                product_updates[product_id] = changed
                if apply:
                    apply_product(existing, seed_product)

        for payment_method_id, seed_payment_method in seed_payment_methods.items():
            existing = existing_payment_methods.get(payment_method_id)
            if existing is None:
                payment_method_inserts.append(payment_method_id)
                if apply:
                    session.add(
                        PaymentMethod(
                            payment_method_id=seed_payment_method.payment_method_id,
                            mode_name=seed_payment_method.mode_name,
                        )
                    )
                continue

            changed = diff_payment_method(existing, seed_payment_method)
            if changed:
                payment_method_updates[payment_method_id] = changed
                if apply:
                    apply_payment_method(existing, seed_payment_method)

        category_extras = sorted(set(existing_categories) - set(seed_categories))
        product_extras = sorted(set(existing_products) - set(seed_products))
        reference_report = build_reference_report(session, product_extras)

        print_summary(
            category_inserts=category_inserts,
            category_updates=category_updates,
            category_extras=category_extras,
            product_inserts=product_inserts,
            product_updates=product_updates,
            product_extras=product_extras,
            payment_method_inserts=payment_method_inserts,
            payment_method_updates=payment_method_updates,
            reference_report=reference_report,
            apply=apply,
            prune_extra=prune_extra,
            image_mode=image_mode,
        )

        if not apply:
            session.rollback()
            return 0

        if prune_extra and product_extras:
            referenced_ids = sorted(
                {
                    product_id
                    for refs in reference_report.values()
                    for product_id, count in refs.items()
                    if count > 0
                }
            )
            if referenced_ids:
                session.rollback()
                print("Cannot prune extra products because they are referenced by existing data.")
                print("Referenced product IDs:", ", ".join(referenced_ids[:20]))
                return 2

            session.query(Product).filter(Product.product_id.in_(product_extras)).delete(synchronize_session=False)

        if prune_extra and category_extras:
            categories_still_used = {
                category_id
                for category_id, in session.query(Product.category_id)
                .filter(Product.category_id.in_(category_extras))
                .distinct()
                .all()
            }
            deletable_categories = [category_id for category_id in category_extras if category_id not in categories_still_used]
            if deletable_categories:
                session.query(Category).filter(Category.category_id.in_(deletable_categories)).delete(synchronize_session=False)

        session.commit()
        print("Catalog sync completed.")
        return 0
    finally:
        session.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync categories/products/default payment methods in SQL database from seed data."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to the database. Without this flag the script runs in dry-run mode.",
    )
    parser.add_argument(
        "--prune-extra",
        action="store_true",
        help="Delete products/categories that are not present in the seed data when safe to do so.",
    )
    parser.add_argument(
        "--image-mode",
        choices=("remote", "local"),
        default="remote",
        help="Choose product image URLs from remote source URLs or local dataset-relative paths.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    return sync_catalog(
        apply=args.apply,
        prune_extra=args.prune_extra,
        image_mode=args.image_mode,
    )


if __name__ == "__main__":
    raise SystemExit(main())
