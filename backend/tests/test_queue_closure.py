"""A human placement closes the paid order it was waiting for.

The queue is built from matching_pending orders. If assigning a learner by
hand left their paid order parked there, the band would keep offering a job
that is already done - and an admin who pressed "place" twice would be told
twice that a learner still waits. The engine closes the order when it places;
override must do the same.

Red first: this behaviour does not exist yet.
"""
import pytest

from app.models.package import OrderStatus
from tests.test_auto_matching import approved_tutor as make_tutor
from tests.sqlite_fixtures import (  # noqa: F401  (fixture registration)
    admin_user,
    db_session,
    learner_user,
    make_client,
    make_order,
    starter_package,
)


@pytest.mark.asyncio
async def test_an_admin_placement_closes_the_waiting_order(db_session, admin_user, learner_user, make_order):
    tutor = await make_tutor(db_session, email="t.close@example.com", full_name="Close Tutor")
    order = await make_order(status=OrderStatus.MATCHING_PENDING)

    async with make_client(db_session, admin_user) as client:
        response = await client.post(
            "/api/v1/admin/assign-student",
            json={"student_id": learner_user.id, "tutor_id": tutor.id},
        )
    assert response.status_code == 200, response.text

    await db_session.refresh(order)
    assert order.status == OrderStatus.COMPLETED
