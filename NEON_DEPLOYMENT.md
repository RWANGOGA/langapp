# Neon Database Deployment Guide

## Prerequisites
- Neon account (https://neon.tech)
- Project ID: `long-snow-72232234`

## Step-by-Step Deployment

### 1. Install & Setup Neon CLI
```bash
# Install Neon CLI globally
npm i -g neon@latest

# Login to your Neon account (opens browser)
neon login

# Enable skills & MCP
neon skills -y
neon mcp -y
```

### 2. Link Project
```bash
# Link to your existing Neon project
neon link --project-id long-snow-72232234 --branch production -y
```

### 3. Initialize Config
```bash
# Creates neon.toml or updates neon.ts
neon config init
```

### 4. Deploy Schema
```bash
# Deploys your SQL migrations to Neon
neon deploy
```

---

## After Deployment

### 1. Update Backend Config
Copy the connection string from Neon dashboard and update `backend/.env`:

```env
# Runtime connection. A pooled Neon endpoint is fine for API traffic.
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# Migration connection. Use the direct/unpooled endpoint from Neon.
DATABASE_URL_UNPOOLED=postgresql+asyncpg://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### 2. Run Migrations
```bash
cd /Users/macbookpro/langapp/backend
alembic upgrade head
```

### 3. Create Admin User
```bash
python create_admin.py
```

### 4. Verify Connection
```bash
curl http://127.0.0.1:8004/health
curl -X POST http://127.0.0.1:8004/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@langapp.com","password":"admin123456"}'
```

---

## Neon Connection String Format

Neon provides connection strings like:
```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

For asyncpg (FastAPI), use:
```
postgresql+asyncpg://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

Neon provides pooled and direct connection strings. Set the pooled string as
`DATABASE_URL` for application traffic and the direct string as
`DATABASE_URL_UNPOOLED` for Alembic. Migrations fall back to `DATABASE_URL` if
the direct variable is not set.

---

## Environment Variables Reference

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://...
API_V1_STR=/api/v1
PROJECT_NAME=LinguaBridge API
SECRET_KEY=your-production-secret
ACCESS_TOKEN_EXPIRE_MINUTES=10080
BACKEND_CORS_ORIGINS=["http://localhost:3000","https://yourdomain.com"]
ENVIRONMENT=production
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api/v1
```

---

## Post-Deployment Checklist

- [ ] Database deployed to Neon
- [ ] Migrations applied (`alembic upgrade head`)
- [ ] Admin user created (`python create_admin.py`)
- [ ] Backend health check passes
- [ ] Admin login works
- [ ] Frontend connects to backend
- [ ] Admin dashboard loads real data
- [ ] CORS configured for production domain

---

## Troubleshooting

### Connection Issues
- Ensure `sslmode=require` in connection string
- Check Neon dashboard for connection limits
- Verify IP allowlist (Neon allows all by default)

### Migration Failures
```bash
# Check migration status
alembic current

# Reset if needed (CAUTION: drops data)
alembic downgrade base
alembic upgrade head
```

### Connection Pool Settings (for production)
Add to DATABASE_URL or SQLAlchemy engine:
```
pool_size=5&max_overflow=10&pool_pre_ping=true
```