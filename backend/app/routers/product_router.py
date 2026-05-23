from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse
)
from app.services import product_service
from app.core.dependencies import get_db
from Admin.admin_auth import get_current_admin

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED
)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    return product_service.create_product(db, payload)


@router.get(
    "/",
    response_model=List[ProductResponse]
)
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return product_service.get_all_products(db, skip=skip, limit=limit)


@router.get(
    "/{product_id}",
    response_model=ProductResponse
)
def get_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    return product_service.get_product_by_id(db, product_id)


@router.put(
    "/{product_id}",
    response_model=ProductResponse
)
def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    return product_service.update_product(db, product_id, payload)


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    admin: str = Depends(get_current_admin),
):
    product_service.delete_product(db, product_id)
