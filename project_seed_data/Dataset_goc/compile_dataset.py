import json
from pathlib import Path

DATASET_ROOT = Path(__file__).resolve().parent

folders = [
    "CAT_HEADPHONE_tai-nghe",
    "CAT_KEYBOARD_ban-phim",
    "CAT_LAPTOP_laptop",
    "CAT_MOUSE_chuot-may-tinh",
    "CAT_PHONE_dien-thoai",
    "CAT_SMARTWATCH_dong-ho-thong-minh"
]

categories = []
products_all = []

for folder in folders:
    folder_path = DATASET_ROOT / folder
    
    # Read category_info.json
    cat_info_path = folder_path / "category_info.json"
    if cat_info_path.exists():
        with cat_info_path.open("r", encoding="utf-8") as f:
            cat_data = json.load(f)
            categories.append(cat_data)
            
    # Read products.json
    prod_path = folder_path / "products.json"
    if prod_path.exists():
        with prod_path.open("r", encoding="utf-8") as f:
            prod_list = json.load(f)
            for prod in prod_list:
                prod["category_folder"] = folder
                products_all.append(prod)

# Write categories_index.json
with (DATASET_ROOT / "categories_index.json").open("w", encoding="utf-8") as f:
    json.dump(categories, f, indent=2, ensure_ascii=False)

# Write products_all.json
with (DATASET_ROOT / "products_all.json").open("w", encoding="utf-8") as f:
    json.dump(products_all, f, indent=2, ensure_ascii=False)

print(f"Compiled {len(categories)} categories and {len(products_all)} products successfully.")
