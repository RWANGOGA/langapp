"""Where a student pays from decides the currency they are shown and the
payment rails that can actually serve them.

A region is not a flag in a dropdown. It fixes a single price (one currency,
never a wall of ¥/₫/$) and the set of methods that work there - offering PayPay
to someone in Dakar or Mobile Money to someone in Osaka would be decoration.

This is the one definition the checkout page, the order and (when a provider is
wired) the payment gateway all read from, so they cannot drift apart.
"""
from dataclasses import dataclass
from typing import Optional

from app.models.package import Order, Package, PaymentMethod


@dataclass(frozen=True)
class Region:
    code: str
    label: str
    currency: str  # JPY | VND | USD - the one currency this region is charged in
    symbol: str
    amount_attr: str  # which Package/Order column holds the price
    methods: tuple[PaymentMethod, ...]


REGIONS: tuple[Region, ...] = (
    Region(
        code="jp", label="Japan", currency="JPY", symbol="¥", amount_attr="price_jpy",
        methods=(PaymentMethod.CARD, PaymentMethod.LINE_PAY, PaymentMethod.PAYPAY, PaymentMethod.PAYPAL),
    ),
    Region(
        code="vn", label="Vietnam", currency="VND", symbol="₫", amount_attr="price_vnd",
        methods=(PaymentMethod.CARD, PaymentMethod.ZALOPAY, PaymentMethod.MOMO, PaymentMethod.PAYPAL),
    ),
    Region(
        code="intl", label="International", currency="USD", symbol="$", amount_attr="price_usd",
        methods=(PaymentMethod.CARD, PaymentMethod.MOBILE_MONEY, PaymentMethod.PAYPAL),
    ),
)

BY_CODE: dict[str, Region] = {region.code: region for region in REGIONS}


def region_for(code: str) -> Optional[Region]:
    return BY_CODE.get(code)


def serves(code: str, method: PaymentMethod) -> bool:
    """True only when `method` is a rail that works in region `code`."""
    region = BY_CODE.get(code)
    return region is not None and method in region.methods


def amount_in(region: Region, package: Package) -> int:
    """The single price a student in this region is charged."""
    return getattr(package, region.amount_attr)


# How many minor units make one whole unit of a currency. JPY and VND have no
# decimal subunit at all, so their minor unit is the yen/dong itself; USD is
# stored whole on the order and reported to the ledger in cents.
MINOR_UNITS: dict[str, int] = {"JPY": 1, "VND": 1, "USD": 100}


def order_charge(order: Order) -> tuple[int, str]:
    """The single amount an order is charged, and the currency it is charged in.

    An order written before regions existed carries no currency, so it reports
    what the previous admin analytics treated as revenue: the USD figure.
    """
    currency = order.currency or "USD"
    if currency == "JPY":
        amount = order.amount_jpy
    elif currency == "VND":
        amount = order.amount_vnd
    else:
        amount = order.amount_usd
    return amount * MINOR_UNITS.get(currency, 1), currency

