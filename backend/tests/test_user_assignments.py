"""A learner's assigned tutor did not resolve.

`assigned_tutor` and `learners` form a self-referential pair on the same
foreign key. The `remote_side` marker sat on the collection side, so SQLAlchemy
read the many-to-one as its inverse: loading a learner's tutor looked for
learners whose `tutor_id` equalled the learner's own id and found nobody.

The admin roster therefore printed "Assigned" next to a blank tutor line, and
the panel could not name a single assigned tutor.

Under test: the pair points the right way round, in both directions.
"""
import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.user import User
from tests.sqlite_fixtures import db_session, learner_user, tutor_user  # noqa: F401


class TestAssignedTutor:
    @pytest.mark.asyncio
    async def test_learner_resolves_the_tutor_and_the_tutor_resolves_the_learner(
        self, db_session, learner_user, tutor_user
    ):
        learner_id, tutor_id = learner_user.id, tutor_user.id
        learner_user.tutor_id = tutor_id
        await db_session.commit()

        # populate_existing re-reads both rows from the database instead of
        # trusting whatever is already in the identity map.
        learner = await db_session.scalar(
            select(User)
            .options(selectinload(User.assigned_tutor))
            .where(User.id == learner_id)
            .execution_options(populate_existing=True)
        )
        assert learner is not None
        assert learner.assigned_tutor is not None, "a learner with a tutor_id must resolve that tutor"
        assert learner.assigned_tutor.id == tutor_id

        tutor = await db_session.scalar(
            select(User)
            .options(selectinload(User.learners))
            .where(User.id == tutor_id)
            .execution_options(populate_existing=True)
        )
        assert tutor is not None
        assert [student.id for student in tutor.learners] == [learner_id]
