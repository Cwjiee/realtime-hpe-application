import os
import sys

# Add project root to path so backend module can be resolved
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Configure environment variables for tests before importing backend modules
os.environ["MONGO_URL"] = "mongodb://localhost:27017/test_db"
os.environ["JWT_SECRET"] = "supersecretkey-change-in-production-test-only"


import pytest
import pytest_asyncio
from mongomock_motor import AsyncMongoMockClient

# Patch the backend database module with mongomock-motor collections
import backend.database

mock_client = AsyncMongoMockClient()
mock_db = mock_client["yoga_app"]

backend.database.client = mock_client
backend.database.db = mock_db
backend.database.sessions_collection = mock_db["sessions"]
backend.database.users_collection = mock_db["users"]
backend.database.custom_sets_collection = mock_db["custom_sets"]

# Now we can safely import the FastAPI app and modules
from backend.main import app
import httpx

@pytest_asyncio.fixture(scope="function")
async def db():
    """Fixture to yield the mock database and clean up collections after each test."""
    yield mock_db
    # Clean up all mock collections
    await mock_db["users"].delete_many({})
    await mock_db["sessions"].delete_many({})
    await mock_db["custom_sets"].delete_many({})

@pytest_asyncio.fixture(scope="function")
async def client(db):
    """Fixture to yield an async HTTP client for the FastAPI app."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture(scope="function")
async def auth_headers(db):
    """Fixture to register a test user and yield OAuth2 Bearer Authorization headers."""
    from backend.auth import get_password_hash, create_access_token
    from datetime import datetime, timezone
    
    hashed_password = get_password_hash("testpassword123")
    user_doc = {
        "name": "Test User",
        "email": "testuser@example.com",
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db["users"].insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    token = create_access_token(data={"sub": user_id})
    return {"Authorization": f"Bearer {token}"}
