import asyncio
from app.db.session import engine
from app.models.user import User, UserRole
from app.api.auth import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def create_admin():
    async with engine.begin() as conn:
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.ext.asyncio import AsyncSession
        session = AsyncSession(bind=conn)
        
        result = await session.execute(select(User).where(User.email == 'admin@langapp.com'))
        if not result.scalar_one_or_none():
            admin = User(
                email='admin@langapp.com',
                full_name='Admin User',
                hashed_password=get_password_hash('admin123'),
                role=UserRole.ADMIN,
                native_language='English',
                timezone='UTC',
                is_active=True,
                is_verified=True
            )
            session.add(admin)
            await session.commit()
            print('✅ Admin created: admin@langapp.com / admin123')
        else:
            print('ℹ️ Admin already exists')

asyncio.run(create_admin())