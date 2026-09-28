import pytest
from app.schemas.tutor import TutorCreate, TutorRead, TutorUpdate, TutorListResponse


class TestTutorSchemas:
    def test_tutor_create_valid(self):
        data = {
            "id": "test-tutor-1",
            "name": "John Doe",
            "headline": "English Tutor",
            "country": "USA",
            "rating": 4.5,
            "reviews": 100,
            "years_experience": 5,
            "bio": "Experienced tutor",
            "languages": ["English", "Spanish"],
            "specialties": ["Business", "Conversation"],
            "avatar_url": "https://example.com/avatar.jpg",
        }
        tutor = TutorCreate(**data)
        assert tutor.id == "test-tutor-1"
        assert tutor.name == "John Doe"
        assert tutor.rating == 4.5
        assert tutor.languages == ["English", "Spanish"]
        assert tutor.specialties == ["Business", "Conversation"]

    def test_tutor_create_defaults(self):
        data = {
            "id": "test-tutor-2",
            "name": "Jane Smith",
            "headline": "ESL Teacher",
            "country": "UK",
            "rating": 4.0,
            "reviews": 50,
            "years_experience": 3,
        }
        tutor = TutorCreate(**data)
        assert tutor.bio == ""
        assert tutor.languages == []
        assert tutor.specialties == []
        assert tutor.avatar_url is None

    def test_tutor_update_partial(self):
        data = {
            "name": "Updated Name",
            "rating": 4.8,
        }
        update = TutorUpdate(**data)
        assert update.name == "Updated Name"
        assert update.rating == 4.8
        assert update.headline is None
        assert update.languages is None

    def test_tutor_list_response(self):
        tutor_data = {
            "id": "tutor-1",
            "name": "Test Tutor",
            "headline": "Headline",
            "country": "USA",
            "rating": 4.5,
            "reviews": 100,
            "years_experience": 5,
            "bio": "Bio",
            "languages": ["English"],
            "specialties": ["Business"],
            "created_at": "2024-01-01T00:00:00",
            "updated_at": "2024-01-01T00:00:00",
        }
        response = TutorListResponse(
            tutors=[TutorRead(**tutor_data)],
            total=1,
            page=1,
            page_size=10,
            total_pages=1,
        )
        assert response.total == 1
        assert response.page == 1
        assert len(response.tutors) == 1