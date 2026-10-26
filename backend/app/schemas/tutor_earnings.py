"""What a tutor has earned, and what each lesson was worth.

Amounts are in US cents because the rate is a USD policy; a tutor's statement is
never mixed with the student-facing JPY / VND / USD prices the school charges.
"""
from datetime import datetime
from typing import List

from pydantic import BaseModel


class EarningRate(BaseModel):
    amount_cents: int
    currency: str
    per_minutes: int


class EarningTotals(BaseModel):
    all_time_cents: int
    all_time_lessons: int
    all_time_minutes: int
    this_month_cents: int
    last_month_cents: int


class EarningMonth(BaseModel):
    month: str
    lessons: int
    minutes: int
    amount_cents: int


class EarningLesson(BaseModel):
    id: int
    held_at: datetime
    learner: str
    topic: str
    minutes: int
    amount_cents: int


class TutorEarnings(BaseModel):
    rate: EarningRate
    totals: EarningTotals
    months: List[EarningMonth]
    lessons: List[EarningLesson]
