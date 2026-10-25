from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime
from app.models.package import PlanName, PaymentMethod, OrderStatus


class Feature(BaseModel):
    icon: str
    label: str


class PackageBase(BaseModel):
    name: str
    months: int
    popular: bool = False
    price_jpy: int
    price_vnd: int
    price_usd: int
    features: List[Feature]


class PackageCreate(PackageBase):
    id: PlanName


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    months: Optional[int] = None
    popular: Optional[bool] = None
    price_jpy: Optional[int] = None
    price_vnd: Optional[int] = None
    price_usd: Optional[int] = None
    features: Optional[List[Feature]] = None


class PackageRead(PackageBase):
    id: PlanName
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderCreate(BaseModel):
    package_id: PlanName
    region: str
    payment_method: PaymentMethod
    subject: str
    session_type: str
    duration_minutes: int = 60


class CheckoutRegionOption(BaseModel):
    """One payment region: the currency it charges and the rails that serve it."""

    code: str
    label: str
    currency: str
    symbol: str
    methods: List[str]


class OrderRead(BaseModel):
    id: int
    package_id: PlanName
    user_id: Optional[int] = None
    subject: Optional[str] = None
    session_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: OrderStatus
    payment_method: Optional[PaymentMethod] = None
    amount_jpy: int
    amount_vnd: int
    amount_usd: int
    region: Optional[str] = None
    currency: Optional[str] = None
    external_payment_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckoutRequest(BaseModel):
    package_id: PlanName
    payment_method: PaymentMethod
    user_email: str


class CheckoutResponse(BaseModel):
    order_id: int
    status: OrderStatus
    payment_url: Optional[str] = None


class PaymentWebhook(BaseModel):
    order_id: int
    external_payment_id: str
    status: str
    provider_event_id: str
    signature: str | None = None


class PaymentSummary(BaseModel):
    status: str
    package_name: str | None = None
    subject: str | None = None
    tier: str | None = None
    started_at: datetime | None = None
    expires_at: datetime | None = None
    renews_at: datetime | None = None
    amount: int | None = None
    currency: str | None = None
    fulfillment_status: str | None = None


class PaymentHistoryItem(BaseModel):
    order_id: int
    package_name: str | None = None
    status: str
    amount_jpy: int
    amount_vnd: int
    amount_usd: int
    payment_method: PaymentMethod | None = None
    created_at: datetime
    paid_at: datetime | None = None


class PaymentConfirmation(BaseModel):
    """Money that arrived outside a provider, recorded by an administrator.

    The reference is not optional: a payment nobody can trace back to a bank
    line, a wallet screenshot or a receipt is not a record, it is a guess.
    """

    reference: str = Field(min_length=2, max_length=100)
    note: str | None = Field(default=None, max_length=500)
    paid_at: datetime | None = None


class PaymentConfirmationResult(BaseModel):
    order_id: int
    status: OrderStatus
    amount_minor: int
    currency: str
    reference: str
    matched: bool
    confirmed_at: datetime