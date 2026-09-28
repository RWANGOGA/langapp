import enum
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Enum as SQLEnum, ForeignKey, Text, Numeric, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class PlanName(str, enum.Enum):
    STARTER = "starter"
    INTENSIVE = "intensive"
    MASTERY = "mastery"


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    months: Mapped[int] = mapped_column(Integer, nullable=False)
    popular: Mapped[bool] = mapped_column(default=False)
    price_jpy: Mapped[int] = mapped_column(Integer, nullable=False)
    price_vnd: Mapped[int] = mapped_column(Integer, nullable=False)
    price_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    features: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders: Mapped[list["Order"]] = relationship(back_populates="package")


class PaymentMethod(str, enum.Enum):
    CARD = "card"
    LINE_PAY = "line"
    PAYPAY = "paypay"
    ZALOPAY = "zalopay"
    PAYPAL = "paypal"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    package_id: Mapped[str] = mapped_column(String(20), ForeignKey("packages.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    status: Mapped[OrderStatus] = mapped_column(SQLEnum(OrderStatus), default=OrderStatus.PENDING)
    payment_method: Mapped[PaymentMethod] = mapped_column(SQLEnum(PaymentMethod), nullable=True)
    amount_jpy: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_vnd: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_usd: Mapped[int] = mapped_column(Integer, nullable=False)
    external_payment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    package: Mapped["Package"] = relationship(back_populates="orders")
    user: Mapped["User"] = relationship(back_populates="orders")