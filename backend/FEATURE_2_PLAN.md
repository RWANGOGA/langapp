# Feature 2: Tutors Directory API

## API Endpoints
- `GET /api/v1/tutors` - List tutors with filters (specialty, language, search, sort, pagination)
- `GET /api/v1/tutors/{tutor_id}` - Single tutor profile

## Database Models
- Tutor profile with: id, name, headline, country, rating, reviews, years_experience, languages, specialties, bio, avatar_url, created_at, updated_at

## Tests
- Unit tests for schemas
- Integration tests for API endpoints (with test database)
- Filter/sort/pagination logic tests