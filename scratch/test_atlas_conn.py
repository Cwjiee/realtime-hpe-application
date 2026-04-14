import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check_connection():
    load_dotenv()
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        print("❌ MONGO_URL not found in .env")
        return

    print(f"Connecting to: {mongo_url.split('@')[-1] if '@' in mongo_url else mongo_url}")
    
    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        # The ping command is cheap and does not require a database to exist
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
        
        db = client["yoga_app"]
        count = await db.sessions.count_documents({})
        print(f"📊 Current session count in 'yoga_app.sessions': {count}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(check_connection())
