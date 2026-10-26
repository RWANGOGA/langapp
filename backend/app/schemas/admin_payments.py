"""Contracts for the admin payment ledger.

Amounts are always `amount_minor` + `currency`, never a bare number: a page that
mixes yen, dong and dollars has no single figure to show, and rounding them into
one would invent an exchange rate the school never used.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class LedgerRow(BaseModel):
    order_id: int
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    package_id: str
    package_name: str
    status: str
    region: Optional[str] = None
    currency: str
    amount_minor: int
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None


class CurrencyTotal(BaseModel):
    currency: str
    amount_minor: int
    count: int


class LedgerSummary(BaseModel):
    awaiting_payment: int
    awaiting_match: int
    paid: int
    collected: list[CurrencyTotal]


class LedgerPage(BaseModel):
    orders: list[LedgerRow]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: LedgerSummary


class LedgerEvent(BaseModel):
    id: int
    event_type: str
    actor_type: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    amount_minor: Optional[int] = None
    currency: Optional[str] = None
    summary: str
    reference: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime


class LedgerSubscription(BaseModel):
    tier: str
    status: str
    started_at: datetime
    current_period_end: datetime
    cancelled_at: Optional[datetime] = None


class LedgerOrder(LedgerRow):
    subject: Optional[str] = None
    session_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    package_months: int
    tutor_name: Optional[str] = None
    events: list[LedgerEvent]
    subscription: Optional[LedgerSubscription] = None
