# checks if the database is up and accepting connections every 1 second for 60 attempts
import asyncio
import asyncpg
import os
import sys

async def check_db():
    # using DATABASE_URL or default postgresql://vv_user:vv_password@localhost:5432/vectorvalley
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://vv_user:vv_password@localhost:5432/vectorvalley"
    )

    # removing postgresql+asyncpg if present
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

    print(f"Connecting to database: {db_url.split('@')[-1]}")
    for attempt in range(60):
        try:
            conn = await asyncpg.connect(db_url, timeout=3.0)
            await conn.close()
            print("Database is up and accepting connections!")
            sys.exit(0)
        except Exception as e:
            print(f"Database connection attempt {attempt + 1}/60 failed: {e}")
            await asyncio.sleep(1)
            
    print("Failed to connect to database within timeout limit.")
    sys.exit(1)

if __name__ == "__main__":
    asyncio.run(check_db())
