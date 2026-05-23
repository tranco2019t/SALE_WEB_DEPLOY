import logging
import sys
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy import text

from app.database import engine, Base
from app.models import *
from app.core.logging_config import configure_json_logging, request_id_ctx
from app.routers import (
    customer_router,
    product_router,
    order_router,
    category_router,
    payment_router,
    review_router,
    address_router,
    wishlist_router,
    notification_router,
    discount_router,
)
from Admin import admin_router

_chatbot_path = Path(__file__).resolve().parents[2] / "CHAT BOT" / "backend"
if str(_chatbot_path) not in sys.path:
    sys.path.insert(0, str(_chatbot_path))

from chatbot_router import router as chatbot_router


configure_json_logging(service_name="sale_web_backend")

app = FastAPI(
    title="E-Commerce API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    # allow dev origins (IPv4, IPv6, localhost)
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://[::]:5500",
        "http://[::1]:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
_chatbot_frontend_path = Path(__file__).resolve().parents[2] / "CHAT BOT" / "frontend"
_uploads_path = Path(__file__).resolve().parents[2] / "backend" / "uploads"
_uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/chatbot-assets", StaticFiles(directory=_chatbot_frontend_path), name="chatbot-assets")
app.mount("/uploads", StaticFiles(directory=_uploads_path), name="uploads")
app.include_router(customer_router.router)
app.include_router(product_router.router)
app.include_router(order_router.router)
app.include_router(category_router.router)
app.include_router(payment_router.router)
app.include_router(review_router.router)
app.include_router(address_router.router)
app.include_router(wishlist_router.router)
app.include_router(notification_router.router)
app.include_router(discount_router.router)
app.include_router(chatbot_router)
app.include_router(admin_router.router)


logger = logging.getLogger("app")


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex
    token = request_id_ctx.set(request_id)
    start = time.perf_counter()
    try:
        response = await call_next(request)
    finally:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)

    response.headers["X-Request-Id"] = request_id
    logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    request_id_ctx.reset(token)
    return response


def _error_payload(
    *,
    code: str,
    message: str,
    details=None,
):
    payload = {"error": {"code": code, "message": message, "request_id": request_id_ctx.get()}}
    if details is not None:
        payload["error"]["details"] = details
    return payload


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        "http_error",
        extra={"status_code": exc.status_code, "detail": str(exc.detail), "path": request.url.path},
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            **_error_payload(code="http_error", message=str(exc.detail)),
        },
    )


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "validation_error",
        extra={"status_code": 422, "path": request.url.path, "errors": exc.errors()},
    )
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            **_error_payload(code="validation_error", message="Request validation failed", details=exc.errors()),
        },
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    logger.warning(
        "validation_error",
        extra={"status_code": 422, "path": request.url.path, "errors": exc.errors()},
    )
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            **_error_payload(code="validation_error", message="Validation failed", details=exc.errors()),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s %s", request.method, request.url, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content=_error_payload(code="internal_error", message="Internal server error"),
    )


@app.get("/")
def root():
    return {"message": "Backend is running 🚀"}


@app.get("/test-db")
def test_db():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"result": result.scalar()}
