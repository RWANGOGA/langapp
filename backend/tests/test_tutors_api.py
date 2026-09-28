import pytest
from httpx import AsyncClient


class TestTutorsAPI:
    @pytest.mark.asyncio
    async def test_get_tutors_empty(self, client: AsyncClient):
        response = await client.get("/api/v1/tutors")
        assert response.status_code == 200
        data = response.json()
        assert "tutors" in data
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert data["total_pages"] == 1

    @pytest.mark.asyncio
    async def test_create_tutor(self, client: AsyncClient):
        tutor_data = {
            "id": "tutor-1",
            "name": "Sarah Johnson",
            "headline": "Senior English Tutor - Business & Conversation",
            "country": "USA",
            "rating": 4.9,
            "reviews": 412,
            "years_experience": 8,
            "bio": "Corporate comms lead turned full-time tutor.",
            "languages": ["English"],
            "specialties": ["Business", "Conversation"],
        }
        response = await client.post("/api/v1/tutors", json=tutor_data)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == "tutor-1"
        assert data["name"] == "Sarah Johnson"
        assert data["rating"] == 4.9
        assert data["languages"] == ["English"]
        assert data["specialties"] == ["Business", "Conversation"]

    @pytest.mark.asyncio
    async def test_get_tutor_by_id(self, client: AsyncClient):
        # First create a tutor
        tutor_data = {
            "id": "tutor-2",
            "name": "Emily Carter",
            "headline": "Cambridge-certified examiner",
            "country": "UK",
            "rating": 4.8,
            "reviews": 356,
            "years_experience": 6,
            "languages": ["English", "Vietnamese"],
            "specialties": ["IELTS", "Academic"],
        }
        await client.post("/api/v1/tutors", json=tutor_data)

        # Now get it
        response = await client.get("/api/v1/tutors/tutor-2")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "tutor-2"
        assert data["name"] == "Emily Carter"
        assert data["country"] == "UK"

    @pytest.mark.asyncio
    async def test_get_tutor_not_found(self, client: AsyncClient):
        response = await client.get("/api/v1/tutors/non-existent")
        assert response.status_code == 404
        assert response.json()["detail"] == "Tutor not found"

    @pytest.mark.asyncio
    async def test_get_tutors_with_filters(self, client: AsyncClient):
        # Create test tutors with unique specialties/languages to avoid conflicts
        tutors = [
            {
                "id": "tutor-a",
                "name": "Tutor A",
                "headline": "Business English expert",
                "country": "USA",
                "rating": 4.9,
                "reviews": 100,
                "years_experience": 5,
                "languages": ["English", "Japanese"],
                "specialties": ["Business"],
            },
            {
                "id": "tutor-b",
                "name": "Tutor B",
                "headline": "IELTS specialist",
                "country": "UK",
                "rating": 4.7,
                "reviews": 80,
                "years_experience": 3,
                "languages": ["English"],
                "specialties": ["IELTS", "Academic"],
            },
            {
                "id": "tutor-c",
                "name": "Tutor C",
                "headline": "Conversation practice",
                "country": "Australia",
                "rating": 4.5,
                "reviews": 50,
                "years_experience": 2,
                "languages": ["English", "Vietnamese"],
                "specialties": ["Conversation"],
            },
        ]
        for t in tutors:
            await client.post("/api/v1/tutors", json=t)

        # Test filter by specialty - count includes tutor-1 from previous test (Business) + tutor-a = 2
        response = await client.get("/api/v1/tutors?specialty=Business")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

        # Test filter by language - tutor-a has Japanese
        response = await client.get("/api/v1/tutors?language=Japanese")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

        # Test search - tutor-b has IELTS
        response = await client.get("/api/v1/tutors?search=IELTS")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_tutors_sort(self, client: AsyncClient):
        response = await client.get("/api/v1/tutors?sort=rating")
        assert response.status_code == 200
        data = response.json()
        ratings = [t["rating"] for t in data["tutors"]]
        assert ratings == sorted(ratings, reverse=True)

        response = await client.get("/api/v1/tutors?sort=reviews")
        assert response.status_code == 200
        data = response.json()
        reviews = [t["reviews"] for t in data["tutors"]]
        assert reviews == sorted(reviews, reverse=True)

        response = await client.get("/api/v1/tutors?sort=experience")
        assert response.status_code == 200
        data = response.json()
        exp = [t["years_experience"] for t in data["tutors"]]
        assert exp == sorted(exp, reverse=True)

        response = await client.get("/api/v1/tutors?sort=name")
        assert response.status_code == 200
        data = response.json()
        names = [t["name"] for t in data["tutors"]]
        assert names == sorted(names)

    @pytest.mark.asyncio
    async def test_pagination(self, client: AsyncClient):
        response = await client.get("/api/v1/tutors?page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["tutors"]) <= 2
        assert data["page"] == 1
        assert data["page_size"] == 2

    @pytest.mark.asyncio
    async def test_update_tutor(self, client: AsyncClient):
        tutor_data = {
            "id": "tutor-update",
            "name": "Original Name",
            "headline": "Headline",
            "country": "USA",
            "rating": 4.0,
            "reviews": 10,
            "years_experience": 2,
        }
        await client.post("/api/v1/tutors", json=tutor_data)

        update_data = {"name": "Updated Name", "rating": 4.5}
        response = await client.patch("/api/v1/tutors/tutor-update", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["rating"] == 4.5

    @pytest.mark.asyncio
    async def test_delete_tutor(self, client: AsyncClient):
        tutor_data = {
            "id": "tutor-delete",
            "name": "To Delete",
            "headline": "Headline",
            "country": "USA",
            "rating": 4.0,
            "reviews": 10,
            "years_experience": 2,
        }
        await client.post("/api/v1/tutors", json=tutor_data)

        response = await client.delete("/api/v1/tutors/tutor-delete")
        assert response.status_code == 204

        response = await client.get("/api/v1/tutors/tutor-delete")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_duplicate_tutor(self, client: AsyncClient):
        tutor_data = {
            "id": "duplicate-tutor",
            "name": "Test",
            "headline": "Headline",
            "country": "USA",
            "rating": 4.0,
            "reviews": 10,
            "years_experience": 2,
        }
        await client.post("/api/v1/tutors", json=tutor_data)
        response = await client.post("/api/v1/tutors", json=tutor_data)
        assert response.status_code == 400
        assert response.json()["detail"] == "Tutor with this ID already exists"