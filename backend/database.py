"""
MongoDB connection setup for the Yoga Pose Scoring API.
Uses motor (async MongoDB driver) for FastAPI compatibility.
Connection string is loaded from the MONGO_URL environment variable.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "yoga_app"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
sessions_collection = db["sessions"]
