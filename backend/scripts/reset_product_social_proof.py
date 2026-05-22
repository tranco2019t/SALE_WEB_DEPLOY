from __future__ import annotations

import json
import sys
from decimal import Decimal
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = PROJECT_ROOT / "backend"
DATASET_ROOT = PROJECT_ROOT / "project_seed_data" / "Dataset_goc"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.models.product import Product
from app.models.review import Review


def zero_product_payload(items: list[dict]) -> int:
    changed = 0
    for item in items:
        if not isinstance(item, dict):
            continue

        rating_changed = item.get("rating_avg") != "0.00"
        reviews_changed = int(item.get("total_reviews", 0) or 0) != 0

        item["rating_avg"] = "0.00"
        item["total_reviews"] = 0

        if rating_changed or reviews_changed:
            changed += 1
    return changed


def update_json_file(path: Path) -> int:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return 0

    changed = zero_product_payload(payload)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return changed


def reset_seed_json() -> tuple[int, int]:
    files = [DATASET_ROOT / "products_all.json"]
    files.extend(sorted(DATASET_ROOT.glob("CAT_*\\products.json")))

    changed_files = 0
    changed_products = 0
    for path in files:
        changed = update_json_file(path)
        if changed:
            changed_files += 1
            changed_products += changed
    return changed_files, changed_products


def reset_database() -> tuple[int, int]:
    session = SessionLocal()
    try:
        products = session.query(Product).all()
        changed_products = 0
        for product in products:
            rating = Decimal(str(product.rating_avg or 0))
            reviews = int(product.total_reviews or 0)
            if rating != Decimal("0") or reviews != 0:
                changed_products += 1
            product.rating_avg = Decimal("0.00")
            product.total_reviews = 0

        deleted_reviews = session.query(Review).delete(synchronize_session=False)
        session.commit()
        return changed_products, int(deleted_reviews or 0)
    finally:
        session.close()


def main() -> int:
    changed_files, changed_seed_products = reset_seed_json()
    changed_db_products, deleted_reviews = reset_database()

    print(f"Seed JSON updated: {changed_files} files, {changed_seed_products} product entries reset.")
    print(f"Database updated: {changed_db_products} products reset, {deleted_reviews} reviews deleted.")
    print("Admin sold_quantity is now forced to 0 for all products.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
