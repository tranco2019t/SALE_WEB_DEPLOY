import asyncio
import json
import logging
import os
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse


PROJECT_DIR = Path(__file__).resolve().parents[2]
CHATBOT_DIR = Path(__file__).resolve().parents[1]


def _load_env_files() -> None:
    candidates = (
        PROJECT_DIR / "backend" / ".env",
        CHATBOT_DIR / ".env",
        PROJECT_DIR / ".env",
    )
    for env_path in candidates:
        if env_path.exists():
            load_dotenv(env_path, override=False)


_load_env_files()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Chatbot"])

DEFAULT_SHOP_NAME = "TAM TAI"
MAX_MESSAGE_LENGTH = 2000
MAX_HISTORY_ITEMS = 10
MAX_HISTORY_MESSAGE_LENGTH = 500
REQUEST_TIMEOUT_SECONDS = 8
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

GEMINI_MODELS = (
    "gemini-3-flash",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
)
OPENROUTER_MODELS = (
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "qwen/qwen3-coder:free",
)
_working_provider_model: tuple[str, str] | None = None

SYSTEM_INSTRUCTION = """
Bạn là AI chatbot tư vấn cho website bán hàng điện tử.
Hãy trả lời tự nhiên, thân thiện, giống nhân viên tư vấn thật.
KHÔNG trả lời quá máy móc hoặc lặp template liên tục.

Nguyên tắc bắt buộc:
1. Luôn trả lời bằng tiếng Việt có dấu, rõ ràng, dễ đọc.
2. Phải nhớ ngữ cảnh hội thoại. Nếu người dùng đang hỏi laptop gaming thì các câu sau vẫn phải hiểu là cùng ngữ cảnh, trừ khi người dùng đổi chủ đề rõ ràng.
3. Nếu có dữ liệu catalog nội bộ của shop thì ưu tiên tuyệt đối dữ liệu đó.
4. Không bịa giá, tồn kho, chính sách, mã giảm giá, phí ship, bảo hành, doanh số hay số điện thoại nếu không có dữ liệu xác nhận.
5. Khi dữ liệu không có, trả lời tự nhiên như nhân viên tư vấn thật, không nói kiểu lỗi hệ thống hay "không có dữ liệu API".
6. Chỉ hỏi thêm khi câu hỏi còn mơ hồ. Nếu người dùng đã cho đủ category hoặc ngân sách thì hãy trả lời luôn trước.
7. Khi tư vấn sản phẩm, ưu tiên giải thích ngắn vì sao phù hợp với nhu cầu.
8. Nếu được yêu cầu so sánh sản phẩm, hãy so sánh thật sự theo hiệu năng, RAM, GPU/CPU, giá và đối tượng phù hợp nếu có dữ liệu.
9. Nếu category shop chưa bán thì trả lời ngắn gọn, không dump toàn bộ catalog.
10. Không tiết lộ API key, biến môi trường, cấu hình server, OTP, mật khẩu, số thẻ hay thông tin nhạy cảm.
""".strip()

CATEGORY_ALIASES = {
    "CAT_LAPTOP": ("laptop", "notebook", "ultrabook", "may tinh"),
    "CAT_PHONE": ("dien thoai", "smartphone", "phone", "mobile"),
    "CAT_HEADPHONE": ("tai nghe", "earbud", "earbuds", "headphone", "headset", "tws"),
    "CAT_KEYBOARD": ("ban phim", "keyboard"),
    "CAT_MOUSE": ("chuot", "mouse", "chuot may tinh"),
    "CAT_SMARTWATCH": ("dong ho", "dong ho thong minh", "smartwatch", "watch"),
}

CATEGORY_DISPLAY_NAMES = {
    "CAT_LAPTOP": "laptop",
    "CAT_PHONE": "điện thoại",
    "CAT_HEADPHONE": "tai nghe",
    "CAT_KEYBOARD": "bàn phím",
    "CAT_MOUSE": "chuột",
    "CAT_SMARTWATCH": "đồng hồ thông minh",
}

UNSUPPORTED_CATEGORY_ALIASES = {
    "màn hình": ("man hinh", "monitor"),
    "tablet": ("tablet", "may tinh bang"),
    "loa": ("loa", "speaker"),
    "máy in": ("may in", "printer"),
    "tivi": ("tivi", "tv"),
    "console": ("console", "playstation", "ps5", "xbox"),
}

USE_CASE_PROFILES = {
    "gaming": {
        "label": "gaming",
        "keywords": ("gaming", "choi game", "game", "esports", "fps", "stream"),
        "preferred_categories": ("CAT_LAPTOP", "CAT_MOUSE", "CAT_KEYBOARD", "CAT_HEADPHONE"),
    },
    "hoc_tap": {
        "label": "học tập",
        "keywords": ("hoc tap", "hoc online", "sinh vien", "hoc sinh", "di hoc"),
        "preferred_categories": ("CAT_LAPTOP", "CAT_HEADPHONE", "CAT_PHONE"),
    },
    "van_phong": {
        "label": "văn phòng",
        "keywords": ("van phong", "lam viec", "cong viec", "hop online", "doanh nghiep"),
        "preferred_categories": ("CAT_LAPTOP", "CAT_MOUSE", "CAT_KEYBOARD"),
    },
    "pin_trau": {
        "label": "pin trâu",
        "keywords": ("pin trau", "pin lau", "dung lau", "pin tot"),
        "preferred_categories": ("CAT_PHONE", "CAT_SMARTWATCH", "CAT_LAPTOP", "CAT_HEADPHONE"),
    },
    "chup_anh": {
        "label": "chụp ảnh",
        "keywords": ("chup anh", "camera", "quay video", "selfie"),
        "preferred_categories": ("CAT_PHONE",),
    },
    "hieu_nang": {
        "label": "hiệu năng",
        "keywords": ("hieu nang", "manh", "cau hinh", "render", "do hoa"),
        "preferred_categories": ("CAT_LAPTOP", "CAT_PHONE"),
    },
    "qua_tang": {
        "label": "quà tặng",
        "keywords": ("qua tang", "lam qua", "gift", "tang"),
        "preferred_categories": ("CAT_HEADPHONE", "CAT_SMARTWATCH", "CAT_PHONE"),
    },
}

SENSITIVE_KEYWORDS = (
    "api key",
    "apikey",
    "gemini_api_key",
    "openrouter_api_key",
    "bien moi truong",
    "environment variable",
    "server config",
    "server secret",
    "otp",
    "mat khau",
    "password",
    "so the",
    "credit card",
    "cvv",
)

POLICY_GAP_KEYWORDS = {
    "shipping": ("phi ship", "ship", "giao hang", "van chuyen"),
    "return_policy": ("doi tra", "tra hang", "hoan tien", "return"),
    "warranty": ("bao hanh", "warranty"),
    "discount_code": ("ma giam gia", "coupon", "voucher", "discount code"),
    "phone_number": ("so dien thoai", "hotline", "lien he", "sdt"),
}

WEBSITE_HELP_REPLIES = {
    "add_to_cart": (
        ("them vao gio", "thêm vào giỏ", "add to cart", "gio hang", "giỏ hàng"),
        "Bạn chỉ cần chọn sản phẩm rồi nhấn nút 'Thêm vào giỏ hàng' là được nhé 😄",
    ),
    "checkout": (
        ("thanh toan", "mua ngay", "checkout"),
        "Bạn chọn sản phẩm, thêm vào giỏ rồi vào bước thanh toán để hoàn tất đơn nhé.",
    ),
    "login": (
        ("dang nhap", "đăng nhập", "login"),
        "Bạn vào mục đăng nhập, nhập email và mật khẩu là được nhé. Nếu quên mật khẩu thì có thể dùng chức năng khôi phục.",
    ),
    "feature_missing": (
        ("khong thay tinh nang", "không thấy tính năng", "khong ho tro", "chua co tinh nang", "chưa có tính năng"),
        "Có thể giao diện hiện tại chưa hỗ trợ tính năng này nhé. Nếu bạn nói rõ hơn mình sẽ gợi ý cách thao tác phù hợp.",
    ),
}

BUDGET_QUESTIONS = (
    "Cho mình xin khoảng ngân sách để lọc dễ hơn nhé 😄",
    "Bạn đang nhắm khoảng bao nhiêu tiền để mình gợi ý sát hơn?",
    "Nếu có mức giá mong muốn thì mình sẽ lọc nhanh hơn cho bạn.",
)

USE_CASE_QUESTIONS = (
    "Bạn dùng chủ yếu để học tập, gaming hay văn phòng vậy?",
    "Bạn đang ưu tiên nhu cầu nào nhất: học tập, làm việc hay giải trí?",
    "Cho mình biết mục đích dùng chính để mình chọn mẫu hợp hơn nhé.",
)

LAPTOP_PRIORITY_QUESTIONS = (
    "Bạn thích máy mỏng nhẹ hay ưu tiên cấu hình mạnh hơn?",
    "Với laptop thì bạn đang nghiêng về pin, màn hình hay hiệu năng vậy?",
    "Bạn ưu tiên máy gọn nhẹ, pin lâu hay chơi game mượt hơn?",
)

PHONE_PRIORITY_QUESTIONS = (
    "Bạn đang ưu tiên pin, camera hay hiệu năng hơn?",
    "Với điện thoại thì bạn thích chụp ảnh đẹp hay pin trâu hơn?",
    "Bạn muốn máy thiên về camera, màn hình hay hiệu năng vậy?",
)

GENERAL_SUGGESTIONS = (
    "Nếu muốn, mình có thể lọc tiếp theo tiêu chí bạn ưu tiên.",
    "Bạn cần mình thu gọn theo ngân sách hoặc nhu cầu cụ thể hơn cũng được nhé.",
    "Nếu thích, mình có thể gợi ý tiếp theo kiểu dùng thực tế của bạn.",
)

SHOP_NAME_PATTERNS = (
    re.compile(r"(?i)(?:shop|cửa hàng)\s+(?:tên|ten)\s+([A-Za-zÀ-ỹ0-9\s&.-]{2,40}?)(?:\s+nhé|\s+nha|\s+nhá|[.!?]|$)"),
    re.compile(r"(?i)(?:gọi|goi)\s+(?:shop|cửa hàng)\s+là\s+([A-Za-zÀ-ỹ0-9\s&.-]{2,40}?)(?:\s+nhé|\s+nha|\s+nhá|[.!?]|$)"),
)


def _error(message: str, status_code: int) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": message})


async def _read_json_body(request: Request) -> tuple[dict[str, Any] | None, JSONResponse | None]:
    content_type = request.headers.get("content-type", "")
    if "application/json" not in content_type.lower():
        return None, _error("Request body must be JSON.", status.HTTP_400_BAD_REQUEST)

    try:
        payload = await request.json()
    except Exception:
        return None, _error("Invalid JSON body.", status.HTTP_400_BAD_REQUEST)

    if not isinstance(payload, dict):
        return None, _error("JSON body must be an object.", status.HTTP_400_BAD_REQUEST)

    return payload, None


def _validate_message(payload: dict[str, Any]) -> tuple[str | None, JSONResponse | None]:
    if "message" not in payload:
        return None, _error("Field 'message' is required.", status.HTTP_400_BAD_REQUEST)

    message = payload["message"]
    if not isinstance(message, str):
        return None, _error("Field 'message' must be a string.", status.HTTP_400_BAD_REQUEST)

    message = message.strip()
    if not message:
        return None, _error("Field 'message' must not be empty.", status.HTTP_400_BAD_REQUEST)

    if len(message) > MAX_MESSAGE_LENGTH:
        return None, _error(
            f"Field 'message' must be at most {MAX_MESSAGE_LENGTH} characters.",
            status.HTTP_400_BAD_REQUEST,
        )

    return message, None


def _validate_history(payload: dict[str, Any]) -> tuple[list[dict[str, str]], JSONResponse | None]:
    raw_history = payload.get("history", [])
    if raw_history in (None, ""):
        return [], None
    if not isinstance(raw_history, list):
        return [], _error("Field 'history' must be a list.", status.HTTP_400_BAD_REQUEST)

    history: list[dict[str, str]] = []
    for item in raw_history[-MAX_HISTORY_ITEMS:]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role", "")).strip().lower()
        content = item.get("content", item.get("message", ""))
        if role not in {"user", "assistant", "bot"} or not isinstance(content, str):
            continue
        content = re.sub(r"\s+", " ", content).strip()
        if not content:
            continue
        history.append(
            {
                "role": "assistant" if role == "bot" else role,
                "content": content[:MAX_HISTORY_MESSAGE_LENGTH],
            }
        )
    return history, None


def _normalize_text(text: str) -> str:
    lowered = text.lower().replace("đ", "d")
    normalized = unicodedata.normalize("NFD", lowered)
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _to_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        return float(value)
    except (TypeError, ValueError):
        return default


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _pick_variant(options: tuple[str, ...], message: str, history: list[dict[str, str]]) -> str:
    seed = len(history) + sum(ord(char) for char in message[:32])
    return options[seed % len(options)]


def _format_vnd(amount: int) -> str:
    return f"{amount:,}".replace(",", ".") + "đ"


def _read_json_file(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _first_existing_data_file(paths: tuple[Path, ...]) -> Any:
    for path in paths:
        if path.exists():
            payload = _read_json_file(path)
            if payload is not None:
                return payload
    return None


def _extract_specs(product_name: str, description: str) -> dict[str, Any]:
    raw_text = f"{product_name} {description}".lower().replace("đ", "d")
    normalized = unicodedata.normalize("NFD", raw_text)
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = re.sub(r"\s+", " ", normalized)

    cpu_match = re.search(r"(ultra\s*\d|core\s*i[3579]|i[3579]|ryzen\s*[3579])", normalized)
    ram_match = re.search(r"ram\s*(\d+)\s*gb", normalized)
    storage_match = re.search(r"ssd\s*(\d+)\s*(tb|gb)", normalized)
    gpu_match = re.search(r"(rtx\s*\d{3,4}|gtx\s*\d{3,4}|rx\s*\d{3,4})", normalized)
    screen_match = re.search(r"(\d+(?:\.\d+)?)\s*inch", normalized)
    refresh_match = re.search(r"(\d{2,3})\s*hz", normalized)
    battery_hours_match = re.search(r"pin\s*(\d+)\s*gio", normalized)
    battery_mah_match = re.search(r"(\d{4,5})\s*mah", normalized)
    camera_match = re.search(r"camera\s*(\d+)\s*mp", normalized)
    weight_match = re.search(r"(\d+(?:\.\d+)?)\s*kg", normalized)
    gb_matches = re.findall(r"(\d+)\s*gb", normalized)
    tb_matches = re.findall(r"(\d+)\s*tb", normalized)

    ram_gb = _to_int(ram_match.group(1)) if ram_match else (_to_int(gb_matches[0]) if gb_matches else 0)
    if storage_match:
        storage = f"{storage_match.group(1)}{storage_match.group(2).upper()}"
    elif len(gb_matches) >= 2:
        storage = f"{gb_matches[1]}GB"
    elif tb_matches:
        storage = f"{tb_matches[0]}TB"
    else:
        storage = ""

    use_tags = set()
    if "gaming" in normalized or gpu_match:
        use_tags.add("gaming")
    if "hoc tap" in normalized or "sinh vien" in normalized:
        use_tags.add("hoc_tap")
    if "van phong" in normalized or "doanh nghiep" in normalized:
        use_tags.add("van_phong")
    if "do hoa" in normalized or "render" in normalized or "video" in normalized:
        use_tags.add("hieu_nang")
    if "camera" in normalized or camera_match:
        use_tags.add("chup_anh")

    return {
        "cpu": cpu_match.group(1).upper().replace("CORE ", "") if cpu_match else "",
        "ram_gb": ram_gb,
        "storage": storage,
        "gpu": gpu_match.group(1).upper().replace("RTX", "RTX ").replace("GTX", "GTX ").replace("RX", "RX ") if gpu_match else "",
        "screen_inch": screen_match.group(1) if screen_match else "",
        "refresh_hz": _to_int(refresh_match.group(1)) if refresh_match else 0,
        "battery_hours": _to_int(battery_hours_match.group(1)) if battery_hours_match else 0,
        "battery_mah": _to_int(battery_mah_match.group(1)) if battery_mah_match else 0,
        "camera_mp": _to_int(camera_match.group(1)) if camera_match else 0,
        "weight_kg": weight_match.group(1) if weight_match else "",
        "use_tags": use_tags,
    }


@lru_cache(maxsize=1)
def _load_catalog() -> dict[str, Any]:
    products_data = _first_existing_data_file(
        (
            CHATBOT_DIR / "data" / "products_all.json",
            PROJECT_DIR / "project_seed_data" / "Dataset_goc" / "products_all.json",
        )
    )
    categories_data = _first_existing_data_file(
        (
            CHATBOT_DIR / "data" / "categories_index.json",
            PROJECT_DIR / "project_seed_data" / "Dataset_goc" / "categories_index.json",
        )
    )

    categories_by_id: dict[str, dict[str, Any]] = {}
    if isinstance(categories_data, list):
        for item in categories_data:
            if not isinstance(item, dict):
                continue
            category_id = str(item.get("category_id", "")).strip()
            if not category_id:
                continue
            categories_by_id[category_id] = {
                "category_id": category_id,
                "category_name": CATEGORY_DISPLAY_NAMES.get(category_id, str(item.get("category_name") or category_id)),
                "subcategory": str(item.get("subcategory") or "").strip(),
                "product_count": _to_int(item.get("product_count")),
            }

    products: list[dict[str, Any]] = []
    if isinstance(products_data, list):
        for item in products_data:
            if not isinstance(item, dict):
                continue

            category_id = str(item.get("category_id", "")).strip()
            if not category_id:
                continue

            if category_id not in categories_by_id:
                categories_by_id[category_id] = {
                    "category_id": category_id,
                    "category_name": CATEGORY_DISPLAY_NAMES.get(category_id, category_id),
                    "subcategory": "",
                    "product_count": 0,
                }

            product_name = str(item.get("product_name") or "").strip()
            description = str(item.get("description") or "").strip()
            unit_price = max(0, _to_int(item.get("unit_price")))
            discount_percent = min(100, max(0, _to_int(item.get("discount_percent"))))
            current_price = int(round(unit_price * (100 - discount_percent) / 100)) if unit_price else 0
            specs = _extract_specs(product_name, description)
            category_name = categories_by_id[category_id]["category_name"]

            products.append(
                {
                    "product_id": str(item.get("product_id") or "").strip(),
                    "category_id": category_id,
                    "category_name": category_name,
                    "product_name": product_name,
                    "description": description,
                    "unit_price": unit_price,
                    "discount_percent": discount_percent,
                    "current_price": current_price or unit_price,
                    "stock_quantity": max(0, _to_int(item.get("stock_quantity"))),
                    "rating_avg": round(_to_float(item.get("rating_avg")), 2),
                    "total_reviews": max(0, _to_int(item.get("total_reviews"))),
                    "normalized_name": _normalize_text(product_name),
                    "search_text": _normalize_text(
                        " ".join(
                            [
                                product_name,
                                description,
                                category_name,
                                categories_by_id[category_id]["subcategory"],
                                " ".join(CATEGORY_ALIASES.get(category_id, ())),
                            ]
                        )
                    ),
                    "specs": specs,
                }
            )

    products_by_category: dict[str, list[dict[str, Any]]] = {category_id: [] for category_id in categories_by_id}
    for product in products:
        products_by_category.setdefault(product["category_id"], []).append(product)

    for category_id, category in categories_by_id.items():
        cat_products = products_by_category.get(category_id, [])
        category["product_count"] = len(cat_products)
        prices = [product["current_price"] for product in cat_products if product["current_price"] > 0]
        category["price_min"] = min(prices) if prices else 0
        category["price_max"] = max(prices) if prices else 0

    return {
        "products": products,
        "categories_by_id": categories_by_id,
        "products_by_category": products_by_category,
    }


def _convert_price_token(raw_value: str, unit: str | None) -> int | None:
    try:
        value = float(raw_value.replace(",", "."))
    except ValueError:
        return None

    normalized_unit = (unit or "").strip().lower()
    if normalized_unit in {"tr", "trieu", "m"}:
        return int(value * 1_000_000)
    if normalized_unit in {"k", "nghin", "ngan"}:
        return int(value * 1_000)
    if normalized_unit in {"vnd", "dong"}:
        return int(value)
    return int(value)


def _extract_budget(message: str) -> tuple[int | None, int | None]:
    normalized = _normalize_text(message)
    range_match = re.search(
        r"(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|k|nghin|ngan|vnd|dong)?\s*(?:-|den|toi)\s*(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|k|nghin|ngan|vnd|dong)?",
        normalized,
    )
    if range_match:
        lower = _convert_price_token(range_match.group(1), range_match.group(2))
        upper = _convert_price_token(range_match.group(3), range_match.group(4) or range_match.group(2))
        if lower and upper:
            return min(lower, upper), max(lower, upper)

    match = re.search(r"(\d+(?:[.,]\d+)?)\s*(tr|trieu|m|k|nghin|ngan|vnd|dong)", normalized)
    if not match:
        return None, None

    amount = _convert_price_token(match.group(1), match.group(2))
    if not amount:
        return None, None

    if any(token in normalized for token in ("duoi", "toi da", "khong qua", "tam", "khoang", "co", "cỡ")):
        return None, amount
    if any(token in normalized for token in ("tren", "tu ", "it nhat")):
        return amount, None
    return None, amount


def _find_category_ids(text: str) -> set[str]:
    category_ids: set[str] = set()
    for category_id, aliases in CATEGORY_ALIASES.items():
        if any(alias in text for alias in aliases):
            category_ids.add(category_id)
    return category_ids


def _detect_use_case(text: str) -> dict[str, Any] | None:
    for profile in USE_CASE_PROFILES.values():
        if any(keyword in text for keyword in profile["keywords"]):
            return profile
    return None


def _asks_comparison(text: str) -> bool:
    phrases = ("so sanh", "compare", "khac nhau", "hon kem")
    return any(phrase in text for phrase in phrases)


def _asks_catalog_overview(text: str) -> bool:
    phrases = ("ban gi", "dang ban", "co nhung gi", "shop co gi", "web ban gi", "danh muc")
    return any(phrase in text for phrase in phrases)


def _asks_availability(text: str) -> bool:
    phrases = ("co ban", "co khong", "ban laptop", "ban tai nghe", "ban dien thoai", "ban ban phim", "ban chuot")
    return any(phrase in text for phrase in phrases)


def _asks_recommendation(text: str) -> bool:
    phrases = (
        "tu van",
        "goi y",
        "nen mua",
        "chon gi",
        "phu hop",
        "tim giup",
        "de xuat",
        "re hon",
        "mau nao",
        "con nao",
        "loai nao",
        "mau khac",
    )
    return any(phrase in text for phrase in phrases)


def _asks_price_or_stock(text: str) -> bool:
    phrases = ("gia", "bao nhieu", "con hang", "ton kho", "stock", "co san")
    return any(phrase in text for phrase in phrases)


def _asks_best_seller(text: str) -> bool:
    return any(phrase in text for phrase in ("ban chay", "best seller", "ban chay nhat"))


def _looks_like_greeting(text: str) -> bool:
    greeting_tokens = ("xin chao", "chao shop", "hello", "hi", "alo", "shop oi")
    return text in greeting_tokens or (any(token in text for token in greeting_tokens) and len(text.split()) <= 6)


def _needs_context_from_history(message: str) -> bool:
    normalized = _normalize_text(message)
    if _find_category_ids(normalized):
        return False
    if _asks_catalog_overview(normalized):
        return False
    if _extract_budget(message) != (None, None):
        return True
    vague_phrases = (
        "re hon",
        "manh hon",
        "mau nao",
        "con nao",
        "loai nao",
        "mau nay",
        "con nay",
        "so sanh",
        "them",
        "khac",
    )
    return any(phrase in normalized for phrase in vague_phrases)


def _is_sensitive_message(text: str) -> bool:
    return any(keyword in text for keyword in SENSITIVE_KEYWORDS)


def _extract_shop_name_update(message: str) -> str | None:
    compact = _clean_text(message)
    for pattern in SHOP_NAME_PATTERNS:
        match = pattern.search(compact)
        if match:
            value = _clean_text(match.group(1)).strip(" .,!?:;")
            return value[:40] if value else None
    return None


def _resolve_shop_name(history: list[dict[str, str]], message: str = "") -> str:
    update = _extract_shop_name_update(message)
    if update:
        return update
    for item in reversed(history):
        if item["role"] != "user":
            continue
        update = _extract_shop_name_update(item["content"])
        if update:
            return update
    return DEFAULT_SHOP_NAME


def _match_unsupported_category(message: str) -> str | None:
    normalized = _normalize_text(message)
    if _find_category_ids(normalized):
        return None
    for display_name, aliases in UNSUPPORTED_CATEGORY_ALIASES.items():
        if any(alias in normalized for alias in aliases):
            return display_name
    return None


def _reply_shop_name_ack(shop_name: str) -> str:
    return f"Ok, mình sẽ gọi shop là {shop_name} nhé 😄"


def _reply_sensitive_request() -> str:
    return (
        "Mình không thể tiết lộ thông tin nhạy cảm như API key, OTP, mật khẩu, số thẻ "
        "hay cấu hình nội bộ của hệ thống đâu nhé."
    )


def _reply_policy_gap(topic: str) -> str:
    topic_map = {
        "shipping": "phí ship hoặc phạm vi giao hàng",
        "return_policy": "chính sách đổi trả",
        "warranty": "chính sách bảo hành",
        "discount_code": "mã giảm giá",
        "phone_number": "số điện thoại liên hệ",
    }
    return (
        f"Hiện mình chưa có thông tin xác nhận về {topic_map[topic]} trong dữ liệu chatbot này nhé. "
        "Nếu bạn muốn, mình vẫn có thể tư vấn sản phẩm phù hợp theo nhu cầu của bạn."
    )


def _reply_website_help(message: str) -> str | None:
    normalized = _normalize_text(message)
    for _, (keywords, reply) in WEBSITE_HELP_REPLIES.items():
        if any(keyword in normalized for keyword in keywords):
            return reply
    return None


def _reply_missing_category(category_name: str) -> str:
    return f"Hiện shop chưa có danh mục {category_name} nhé."


def _reply_greeting(shop_name: str) -> str:
    return (
        f"Chào bạn, mình là AI tư vấn của {shop_name} 😄\n"
        "Hiện mình có thể hỗ trợ tư vấn laptop, điện thoại, tai nghe, bàn phím, chuột và đồng hồ thông minh.\n"
        "Bạn cứ nói nhu cầu hoặc tầm giá, mình sẽ gợi ý giúp bạn."
    )


def _category_summary_lines() -> list[str]:
    catalog = _load_catalog()
    categories = sorted(catalog["categories_by_id"].values(), key=lambda item: item["category_name"])
    lines = []
    for category in categories:
        if category["product_count"] <= 0:
            continue
        lines.append(
            f"- {category['category_name'].capitalize()}: {category['product_count']} sản phẩm, "
            f"giá từ {_format_vnd(category['price_min'])} đến {_format_vnd(category['price_max'])}."
        )
    return lines


def _reply_catalog_overview(shop_name: str) -> str | None:
    lines = _category_summary_lines()
    if not lines:
        return None
    return "\n".join(
        [
            f"{shop_name} hiện đang bán các nhóm sản phẩm sau:",
            *lines,
            "Bạn có thể hỏi cụ thể hơn, ví dụ: laptop học tập dưới 20 triệu, tai nghe gaming hoặc điện thoại pin trâu.",
        ]
    )


def _budget_phrase(budget_min: int | None, budget_max: int | None) -> str:
    if budget_min and budget_max:
        return f"từ {_format_vnd(budget_min)} đến {_format_vnd(budget_max)}"
    if budget_max:
        return f"khoảng {_format_vnd(budget_max)} trở xuống"
    if budget_min:
        return f"từ {_format_vnd(budget_min)} trở lên"
    return "mức giá này"


def _product_signal_text(product: dict[str, Any]) -> str:
    specs = product["specs"]
    signals = []
    if specs["cpu"]:
        signals.append(specs["cpu"])
    if specs["ram_gb"]:
        signals.append(f"RAM {specs['ram_gb']}GB")
    if specs["gpu"]:
        signals.append(specs["gpu"])
    if specs["screen_inch"]:
        signals.append(f"màn {specs['screen_inch']} inch")
    if specs["refresh_hz"]:
        signals.append(f"{specs['refresh_hz']}Hz")
    if specs["camera_mp"]:
        signals.append(f"camera {specs['camera_mp']}MP")
    if specs["battery_hours"]:
        signals.append(f"pin khoảng {specs['battery_hours']} giờ")
    if specs["battery_mah"]:
        signals.append(f"pin {specs['battery_mah']}mAh")
    return ", ".join(signals[:3])


def _build_product_reason(product: dict[str, Any], use_case: dict[str, Any] | None) -> str:
    specs = product["specs"]
    category_id = product["category_id"]
    search_text = product["search_text"]

    if category_id == "CAT_LAPTOP":
        if use_case and use_case["label"] == "gaming":
            if specs["gpu"]:
                return f"phù hợp gaming nhờ {specs['gpu']}" + (
                    f" và màn {specs['refresh_hz']}Hz" if specs["refresh_hz"] else ""
                )
            return "phù hợp gaming nhờ cấu hình thiên về hiệu năng"
        if use_case and use_case["label"] == "học tập":
            if specs["weight_kg"]:
                return f"hợp học tập vì khá gọn nhẹ ({specs['weight_kg']}kg)"
            return "hợp học tập vì cấu hình đủ ổn và dễ dùng"
        if use_case and use_case["label"] == "văn phòng":
            if specs["ram_gb"] >= 16:
                return "hợp văn phòng vì đa nhiệm khá thoải mái"
            return "hợp văn phòng vì cấu hình cân bằng, dễ dùng"
        if "do hoa" in search_text or "render" in search_text:
            return "phù hợp công việc nặng hoặc sáng tạo nội dung"
        if specs["battery_hours"] >= 10:
            return "điểm mạnh là pin khá tốt cho nhu cầu di chuyển"
        return "cấu hình khá cân bằng cho nhu cầu phổ thông"

    if category_id == "CAT_PHONE":
        if use_case and use_case["label"] == "chụp ảnh" and specs["camera_mp"]:
            return f"phù hợp chụp ảnh vì có camera {specs['camera_mp']}MP"
        if use_case and use_case["label"] == "pin trâu" and specs["battery_mah"]:
            return f"điểm mạnh là viên pin {specs['battery_mah']}mAh"
        if "120hz" in search_text:
            return "máy cho trải nghiệm vuốt chạm khá mượt"
        return "mẫu này khá cân bằng giữa hiệu năng và trải nghiệm hằng ngày"

    if category_id == "CAT_HEADPHONE":
        if "anc" in search_text:
            return "điểm mạnh là chống ồn chủ động"
        if "gaming" in search_text or "7 1" in search_text:
            return "khá hợp chơi game nhờ thiên hướng gaming"
        if specs["battery_hours"] >= 24:
            return "pin dùng khá lâu"
        return "phù hợp nghe nhạc và dùng hằng ngày"

    if category_id == "CAT_SMARTWATCH":
        if use_case and use_case["label"] == "pin trâu":
            return "phù hợp nếu bạn cần dùng bền pin"
        return "hợp cho theo dõi sức khỏe và thông báo hằng ngày"

    if category_id == "CAT_KEYBOARD":
        return "phù hợp nếu bạn cần gõ phím ổn và dùng hằng ngày"

    if category_id == "CAT_MOUSE":
        return "phù hợp cho nhu cầu điều khiển hằng ngày"

    return "mẫu này khá ổn trong tầm giá"


def _format_product_recommendation(product: dict[str, Any], use_case: dict[str, Any] | None) -> str:
    price_text = _format_vnd(product["current_price"])
    reason = _build_product_reason(product, use_case)
    return f"- {product['product_name']}: khoảng {price_text}. {reason.capitalize()}."


def _format_product_detail(product: dict[str, Any]) -> str:
    specs = product["specs"]
    signals = _product_signal_text(product)
    lines = [
        f"Mình tìm thấy {product['product_name']}:",
        f"- Nhóm hàng: {product['category_name'].capitalize()}",
        f"- Giá hiện tại: {_format_vnd(product['current_price'])}",
        f"- Giá niêm yết: {_format_vnd(product['unit_price'])}",
        f"- Giảm giá: {product['discount_percent']}%",
        f"- Tồn kho: {product['stock_quantity']}",
        f"- Đánh giá: {product['rating_avg']:.2f}/5 từ {product['total_reviews']} lượt",
    ]
    if signals:
        lines.insert(2, f"- Điểm nổi bật: {signals}")
    return "\n".join(lines)


def _format_context_label(category_ids: set[str], use_case: dict[str, Any] | None) -> str:
    if len(category_ids) == 1:
        category_id = next(iter(category_ids))
        category_label = CATEGORY_DISPLAY_NAMES.get(category_id, "sản phẩm")
        if use_case and use_case["label"] in {"gaming", "học tập", "văn phòng", "pin trâu", "chụp ảnh", "hiệu năng"}:
            if category_id == "CAT_LAPTOP":
                if use_case["label"] in {"gaming", "học tập", "văn phòng"}:
                    return f"{category_label} {use_case['label']}"
                if use_case["label"] == "hiệu năng":
                    return f"{category_label} cấu hình mạnh"
            if category_id == "CAT_PHONE":
                if use_case["label"] == "pin trâu":
                    return "điện thoại pin trâu"
                if use_case["label"] == "chụp ảnh":
                    return "điện thoại chụp ảnh"
        return category_label
    if use_case:
        return f"sản phẩm thiên về {use_case['label']}"
    return "sản phẩm phù hợp"


def _pick_follow_up(
    message: str,
    history: list[dict[str, str]],
    category_ids: set[str],
    use_case: dict[str, Any] | None,
    budget_min: int | None,
    budget_max: int | None,
) -> str | None:
    normalized = _normalize_text(message)
    has_budget = budget_min is not None or budget_max is not None

    if not category_ids and not use_case:
        return _pick_variant(USE_CASE_QUESTIONS, message, history)

    if category_ids and not has_budget and len(normalized.split()) <= 8:
        return _pick_variant(BUDGET_QUESTIONS, message, history)

    if "CAT_LAPTOP" in category_ids and use_case is None:
        return _pick_variant(LAPTOP_PRIORITY_QUESTIONS, message, history)

    if "CAT_PHONE" in category_ids and use_case is None:
        return _pick_variant(PHONE_PRIORITY_QUESTIONS, message, history)

    if category_ids and has_budget and use_case:
        return GENERAL_SUGGESTIONS[(len(history) + len(message)) % len(GENERAL_SUGGESTIONS)]

    return None


def _build_search_source(message: str, history: list[dict[str, str]]) -> str:
    if not _needs_context_from_history(message):
        return message

    relevant_messages: list[str] = []
    for item in reversed(history):
        if item["role"] != "user":
            continue
        candidate = item["content"]
        candidate_text = _normalize_text(candidate)
        if _is_sensitive_message(candidate_text):
            continue
        has_product_signal = (
            bool(_find_category_ids(candidate_text))
            or _asks_recommendation(candidate_text)
            or _asks_availability(candidate_text)
            or _asks_price_or_stock(candidate_text)
            or _asks_comparison(candidate_text)
            or bool(_detect_use_case(candidate_text))
            or _extract_budget(candidate) != (None, None)
        )
        if has_product_signal:
            relevant_messages.append(candidate)
        if len(relevant_messages) >= 2:
            break

    if relevant_messages:
        relevant_messages.reverse()
        return " ".join(relevant_messages + [message])
    return message


def _score_product(
    product: dict[str, Any],
    text: str,
    tokens: set[str],
    category_ids: set[str],
    budget_min: int | None,
    budget_max: int | None,
    use_case: dict[str, Any] | None,
) -> float:
    score = 0.0

    if product["category_id"] in category_ids:
        score += 28

    if product["normalized_name"] and product["normalized_name"] in text:
        score += 90

    overlap = sum(1 for token in tokens if len(token) > 2 and token in product["search_text"])
    score += overlap * 4.5

    if use_case and product["category_id"] in use_case["preferred_categories"]:
        score += 12
        if use_case["label"] in product["specs"]["use_tags"]:
            score += 8

    current_price = product["current_price"]
    if budget_min is not None and current_price >= budget_min:
        score += 4
    if budget_max is not None:
        if current_price <= budget_max:
            score += 12
        else:
            score -= min(20, (current_price - budget_max) / 1_000_000)

    score += min(product["rating_avg"], 5.0) * 1.5
    score += min(product["total_reviews"], 500) / 100

    if product["stock_quantity"] > 0:
        score += 3
    else:
        score -= 40

    return score


def _search_products(message: str, history: list[dict[str, str]]) -> list[dict[str, Any]]:
    catalog = _load_catalog()
    if not catalog["products"]:
        return []

    search_source = _build_search_source(message, history)
    normalized = _normalize_text(search_source)
    tokens = set(normalized.split())
    category_ids = _find_category_ids(normalized)
    budget_min, budget_max = _extract_budget(search_source)
    use_case = _detect_use_case(normalized)

    scored: list[tuple[float, dict[str, Any]]] = []
    for product in catalog["products"]:
        if category_ids and product["category_id"] not in category_ids:
            continue
        score = _score_product(product, normalized, tokens, category_ids, budget_min, budget_max, use_case)
        if score > 0:
            scored.append((score, product))

    scored.sort(
        key=lambda item: (
            item[0],
            item[1]["rating_avg"],
            item[1]["total_reviews"],
            item[1]["stock_quantity"],
        ),
        reverse=True,
    )
    return [product for _, product in scored]


def _pick_comparison_products(message: str, history: list[dict[str, str]]) -> list[dict[str, Any]]:
    matched_products = _search_products(message, history)
    unique: list[dict[str, Any]] = []
    seen: set[str] = set()
    for product in matched_products:
        if product["product_id"] in seen:
            continue
        unique.append(product)
        seen.add(product["product_id"])
        if len(unique) >= 2:
            break
    return unique


def _comparison_line(label: str, left_value: str, right_value: str) -> str:
    return f"- {label}: {left_value} | {right_value}"


def _reply_comparison(products: list[dict[str, Any]]) -> str | None:
    if len(products) < 2:
        return None

    left, right = products[0], products[1]
    left_specs = left["specs"]
    right_specs = right["specs"]

    left_fit = _build_product_reason(left, _detect_use_case(left["search_text"]))
    right_fit = _build_product_reason(right, _detect_use_case(right["search_text"]))

    price_diff = left["current_price"] - right["current_price"]
    if price_diff == 0:
        price_text = f"Hai mẫu hiện đang cùng mức giá khoảng {_format_vnd(left['current_price'])}."
    elif price_diff > 0:
        price_text = f"{left['product_name']} cao hơn khoảng {_format_vnd(price_diff)} so với {right['product_name']}."
    else:
        price_text = f"{right['product_name']} cao hơn khoảng {_format_vnd(abs(price_diff))} so với {left['product_name']}."

    lines = [
        f"Nếu so nhanh giữa {left['product_name']} và {right['product_name']}:",
        _comparison_line("CPU", left_specs["cpu"] or "chưa rõ", right_specs["cpu"] or "chưa rõ"),
        _comparison_line("RAM", f"{left_specs['ram_gb']}GB" if left_specs["ram_gb"] else "chưa rõ", f"{right_specs['ram_gb']}GB" if right_specs["ram_gb"] else "chưa rõ"),
        _comparison_line("GPU", left_specs["gpu"] or "chưa rõ", right_specs["gpu"] or "chưa rõ"),
        _comparison_line("Giá", _format_vnd(left["current_price"]), _format_vnd(right["current_price"])),
        f"- Hợp với ai: {left['product_name']} {left_fit}; còn {right['product_name']} {right_fit}.",
        f"- Kết luận nhanh: {price_text}",
    ]

    if left_specs["refresh_hz"] or right_specs["refresh_hz"]:
        lines.insert(
            4,
            _comparison_line(
                "Màn hình",
                f"{left_specs['screen_inch']} inch / {left_specs['refresh_hz']}Hz" if left_specs["screen_inch"] or left_specs["refresh_hz"] else "chưa rõ",
                f"{right_specs['screen_inch']} inch / {right_specs['refresh_hz']}Hz" if right_specs["screen_inch"] or right_specs["refresh_hz"] else "chưa rõ",
            ),
        )

    return "\n".join(lines)


def _reply_best_seller(products: list[dict[str, Any]]) -> str:
    lines = [f"- {product['product_name']}: {_format_vnd(product['current_price'])}, đánh giá {product['rating_avg']:.2f}/5." for product in products[:3]]
    return "\n".join(
        [
            "Mình chưa có dữ liệu doanh số chính xác để khẳng định mẫu bán chạy nhất.",
            "Nhưng đây là vài mẫu đang có đánh giá khá tốt để bạn tham khảo:",
            *lines,
        ]
    )


def _reply_no_budget_match(message: str, history: list[dict[str, str]]) -> str:
    search_source = _build_search_source(message, history)
    normalized = _normalize_text(search_source)
    category_ids = _find_category_ids(normalized)
    use_case = _detect_use_case(normalized)
    budget_min, budget_max = _extract_budget(search_source)
    context_label = _format_context_label(category_ids, use_case)
    return f"Hiện shop chưa có {context_label} ở mức {_budget_phrase(budget_min, budget_max)} nhé."


def _reply_recommendations(message: str, history: list[dict[str, str]], matched_products: list[dict[str, Any]]) -> str | None:
    if not matched_products:
        return None

    search_source = _build_search_source(message, history)
    normalized = _normalize_text(search_source)
    category_ids = _find_category_ids(normalized)
    budget_min, budget_max = _extract_budget(search_source)
    use_case = _detect_use_case(normalized)

    filtered: list[dict[str, Any]] = []
    for product in matched_products:
        if budget_min is not None and product["current_price"] < budget_min:
            continue
        if budget_max is not None and product["current_price"] > budget_max:
            continue
        filtered.append(product)
        if len(filtered) >= 3:
            break

    if (budget_min is not None or budget_max is not None) and not filtered:
        return _reply_no_budget_match(message, history)

    shortlist = filtered or matched_products[:3]
    catalog = _load_catalog()
    normalized_message = _normalize_text(message)

    if category_ids and len(category_ids) == 1 and _asks_availability(normalized_message) and budget_min is None and budget_max is None:
        category_id = next(iter(category_ids))
        category = catalog["categories_by_id"].get(category_id, {})
        label = CATEGORY_DISPLAY_NAMES.get(category_id, shortlist[0]["category_name"])
        intro = (
            f"Shop có bán {label} nhé. "
            f"Hiện có khoảng {category.get('product_count', len(matched_products))} mẫu, "
            f"giá từ {_format_vnd(category.get('price_min', shortlist[0]['current_price']))} "
            f"đến {_format_vnd(category.get('price_max', shortlist[0]['current_price']))}.\n"
            "Mình gợi ý nhanh vài mẫu nổi bật như sau:"
        )
    elif category_ids:
        label = _format_context_label(category_ids, use_case)
        intro = f"Nếu bạn đang tìm {label} thì mấy mẫu này khá đáng cân nhắc:"
    elif use_case:
        intro = f"Nếu ưu tiên nhu cầu {use_case['label']} thì bạn có thể tham khảo:"
    else:
        intro = "Mình gợi ý nhanh cho bạn vài mẫu khá ổn nhé:"

    lines = [_format_product_recommendation(product, use_case) for product in shortlist]
    follow_up = _pick_follow_up(message, history, category_ids, use_case, budget_min, budget_max)
    parts = [intro, *lines]
    if follow_up:
        parts.append(follow_up)
    return "\n".join(parts)


def _build_catalog_context(message: str, history: list[dict[str, str]], shop_name: str) -> str:
    catalog = _load_catalog()
    if not catalog["products"]:
        return ""

    matched_products = _search_products(message, history)[:5]
    summary_lines = _category_summary_lines()[:6]

    lines = [f"Tên shop hiện tại: {shop_name}."]
    if summary_lines:
        lines.append("Tổng quan catalog nội bộ:")
        lines.extend(summary_lines)
    if matched_products:
        lines.append("Sản phẩm liên quan đến câu hỏi hiện tại:")
        lines.extend(_format_product_recommendation(product, _detect_use_case(_normalize_text(message))) for product in matched_products)
    return "\n".join(lines)


def _build_provider_messages(message: str, history: list[dict[str, str]], shop_name: str) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
    messages.extend(history[-MAX_HISTORY_ITEMS:])

    catalog_context = _build_catalog_context(message, history, shop_name)
    if catalog_context:
        user_content = (
            "Ngữ cảnh nội bộ của shop:\n"
            f"{catalog_context}\n\n"
            "Yêu cầu khi trả lời:\n"
            "- Ưu tiên dữ liệu catalog nội bộ nếu có.\n"
            "- Nếu không có dữ liệu xác nhận thì nói tự nhiên rằng hiện chưa có thông tin xác nhận.\n"
            "- Giữ văn phong tự nhiên, giống nhân viên tư vấn thật.\n\n"
            f"Câu hỏi hiện tại của khách: {message}"
        )
    else:
        user_content = message

    messages.append({"role": "user", "content": user_content})
    return messages


def _split_env_list(name: str) -> list[str]:
    value = os.getenv(name, "")
    return [item.strip() for item in value.split(",") if item.strip()]


def _provider_model_order(provider: str, models: tuple[str, ...]) -> list[str]:
    if _working_provider_model and _working_provider_model[0] == provider:
        working_model = _working_provider_model[1]
        return [working_model] + [model for model in models if model != working_model]
    return list(models)


def _openrouter_keys() -> list[str]:
    keys = _split_env_list("OPENROUTER_API_KEYS")
    single_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if single_key:
        keys.insert(0, single_key)
    return list(dict.fromkeys(keys))


def _openrouter_models() -> tuple[str, ...]:
    configured = _split_env_list("OPENROUTER_MODELS")
    return tuple(configured) if configured else OPENROUTER_MODELS


def _is_network_error(exc: Exception) -> bool:
    return exc.__class__.__name__ in {
        "ConnectError",
        "ConnectTimeout",
        "ReadTimeout",
        "Timeout",
        "TimeoutError",
    }


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc)
    return "RESOURCE_EXHAUSTED" in text or "quota" in text.lower()


def _call_openrouter(messages: list[dict[str, str]]) -> str | None:
    global _working_provider_model

    keys = _openrouter_keys()
    if not keys:
        return None

    payload_base = {
        "messages": messages,
        "temperature": 0.55,
        "max_tokens": 650,
    }

    for model in _provider_model_order("openrouter", _openrouter_models()):
        for api_key in keys:
            try:
                payload = {**payload_base, "model": model}
                response = requests.post(
                    OPENROUTER_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://127.0.0.1:5500",
                        "X-Title": "SALE_WEB_PROJECT",
                    },
                    json=payload,
                    timeout=REQUEST_TIMEOUT_SECONDS,
                )
                if response.status_code != 200:
                    logger.warning("OpenRouter model %s failed with status %s", model, response.status_code)
                    continue

                data = response.json()
                choices = data.get("choices") or []
                message_data = choices[0].get("message", {}) if choices else {}
                text = message_data.get("content", "")
                if isinstance(text, str) and text.strip():
                    _working_provider_model = ("openrouter", model)
                    return text.strip()
            except Exception as exc:
                logger.warning("OpenRouter model %s failed with %s", model, exc.__class__.__name__)
                if isinstance(exc, requests.RequestException) and _is_network_error(exc):
                    return None

    return None


def _extract_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()
    raise RuntimeError("Gemini returned an empty response")


def _call_gemini(messages: list[dict[str, str]]) -> str | None:
    global _working_provider_model

    if not os.getenv("GEMINI_API_KEY"):
        return None

    try:
        from google import genai
        from google.genai import types
    except Exception as exc:
        logger.warning("Gemini client import failed with %s", exc.__class__.__name__)
        return None

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.55,
        max_output_tokens=650,
        http_options=types.HttpOptions(timeout=15000),
    )

    conversation = []
    for item in messages[1:]:
        role = "ASSISTANT" if item["role"] == "assistant" else "USER"
        conversation.append(f"{role}: {item['content']}")
    prompt = "\n\n".join(conversation)

    for model in _provider_model_order("gemini", GEMINI_MODELS):
        try:
            client = genai.Client()
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            text = _extract_text(response)
            _working_provider_model = ("gemini", model)
            return text
        except Exception as exc:
            logger.warning("Gemini model %s failed with %s", model, exc.__class__.__name__)
            if _is_network_error(exc) or _is_quota_error(exc):
                return None

    return None


def _clean_response_text(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _maybe_generate_local_response(message: str, history: list[dict[str, str]]) -> str | None:
    shop_name = _resolve_shop_name(history, message)
    normalized = _normalize_text(message)

    if update := _extract_shop_name_update(message):
        return _reply_shop_name_ack(update)

    if unsupported_category := _match_unsupported_category(message):
        return _reply_missing_category(unsupported_category)

    if website_help := _reply_website_help(message):
        return website_help

    if _is_sensitive_message(normalized):
        return _reply_sensitive_request()

    for topic, keywords in POLICY_GAP_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            return _reply_policy_gap(topic)

    if _looks_like_greeting(normalized):
        return _reply_greeting(shop_name)

    if _asks_catalog_overview(normalized):
        overview = _reply_catalog_overview(shop_name)
        if overview:
            return overview

    if _asks_comparison(normalized):
        comparison_products = _pick_comparison_products(message, history)
        if comparison := _reply_comparison(comparison_products):
            return comparison

    matched_products = _search_products(message, history)
    search_source = _build_search_source(message, history)
    normalized_context = _normalize_text(search_source)
    category_ids = _find_category_ids(normalized_context)
    use_case = _detect_use_case(normalized_context)
    budget_min, budget_max = _extract_budget(search_source)

    if _asks_best_seller(normalized):
        if matched_products:
            return _reply_best_seller(matched_products)
        return "Mình chưa có dữ liệu doanh số chính xác, nhưng nếu bạn nói rõ nhóm hàng thì mình sẽ gợi ý vài mẫu đang được đánh giá tốt nhé."

    if matched_products and _asks_price_or_stock(normalized):
        return _format_product_detail(matched_products[0])

    if matched_products and (category_ids or use_case or _asks_availability(normalized) or _asks_recommendation(normalized)):
        return _reply_recommendations(message, history, matched_products)

    if (budget_min is not None or budget_max is not None) and (category_ids or use_case):
        return _reply_no_budget_match(message, history)

    if category_ids or use_case:
        follow_up = _pick_follow_up(message, history, category_ids, use_case, budget_min, budget_max)
        if follow_up:
            return follow_up

    return None


def _generate_chatbot_response(message: str, history: list[dict[str, str]]) -> str:
    local_response = _maybe_generate_local_response(message, history)
    if local_response:
        return _clean_response_text(local_response)

    shop_name = _resolve_shop_name(history, message)
    provider_messages = _build_provider_messages(message, history, shop_name)
    for call_provider in (_call_openrouter, _call_gemini):
        try:
            text = call_provider(provider_messages)
        except Exception as exc:
            logger.warning("Provider call failed with %s", exc.__class__.__name__)
            text = None
        if text:
            return _clean_response_text(text)

    fallback = _reply_catalog_overview(shop_name)
    if fallback:
        return _clean_response_text(fallback)

    return "Mình vẫn đang ở đây nhé. Bạn cứ nói rõ hơn nhu cầu, mình sẽ cố gắng tư vấn sát nhất có thể."


@router.post("/chatbot")
async def chat_with_bot(request: Request):
    payload, body_error = await _read_json_body(request)
    if body_error:
        return body_error

    message, message_error = _validate_message(payload or {})
    if message_error:
        return message_error

    history, history_error = _validate_history(payload or {})
    if history_error:
        return history_error

    try:
        response = await asyncio.to_thread(_generate_chatbot_response, message, history)
        return {"response": response}
    except Exception as exc:
        logger.error("Chatbot request failed with %s", exc.__class__.__name__)
        return _error(
            "Xin lỗi, hiện tại chatbot đang gặp lỗi. Bạn thử lại sau giúp mình nhé.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
