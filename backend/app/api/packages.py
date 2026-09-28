from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db.session import get_db
from app.models.package import Package, Order, PlanName, PaymentMethod, OrderStatus
from app.schemas.package import PackageRead, PackageCreate, OrderCreate, OrderRead

router = APIRouter()


@router.get("/packages", response_model=List[PackageRead])
async def get_packages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Package).order_by(Package.months))
    packages = result.scalars().all()
    return packages


@router.get("/packages/{package_id}", response_model=PackageRead)
async def get_package(package_id: PlanName, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return package


@router.post("/checkout", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_checkout(order_in: OrderCreate, db: AsyncSession = Depends(get_db)):
    # Get package
    result = await db.execute(select(Package).where(Package.id == order_in.package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    # Create order
    order = Order(
        package_id=package.id,
        user_id=None,  # Will be set from auth later
        status=OrderStatus.PENDING,
        payment_method=order_in.payment_method,
        amount_jpy=package.price_jpy,
        amount_vnd=package.price_vnd,
        amount_usd=package.price_usd,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    # TODO: Integrate with payment provider (Stripe, LINE Pay, etc.)
    # For now, return the created order

    return order


@router.get("/checkout/{order_id}", response_model=OrderRead)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order