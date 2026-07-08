#!/usr/bin/env python3
"""
Seed Data Script for Yoga Pose Scoring Application.
Seeds users, session history, and custom pose sets into MongoDB Atlas.
"""

import os
import asyncio
import random
from datetime import datetime, timedelta, timezone
import bcrypt
import numpy as np
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Base configuration
DB_NAME = "yoga_app"

# Poses maps matching backend/main.py
FRONTEND_POSE_MAP = {
    "warrior1": "Warrior 1 (Virabhadrasana I)",
    "warrior2": "Warrior 2 (Virabhadrasana II)",
    "tree": "Tree Pose (Vrksasana)",
    "triangle": "Triangle Pose (Trikonasana)",
}

FRONTEND_POSE_LABELS = {
    "warrior1": "Warrior I",
    "warrior2": "Warrior II",
    "tree": "Tree",
    "triangle": "Triangle",
}

# Sample realistic feedbacks depending on the pose and performance quality
POSE_FEEDBACK_TEMPLATES = {
    "tree": [
        "Lower your arm slightly — it's too high",
        "Raise your right knee more — it's too low",
        "Bring your hands closer at the chest",
        "Align your hips to the front — left hip is too open"
    ],
    "warrior1": [
        "Deepen your front knee bend — it's too straight",
        "Raise your arms higher — they are too low",
        "Square your shoulders to the front",
        "Keep your back leg fully extended"
    ],
    "warrior2": [
        "Lower your arms to shoulder height — they are too high",
        "Align your torso over your hips — don't lean forward",
        "Deepen your front knee bend — knee is too straight",
        "Lower your rear arm — it's too low"
    ],
    "triangle": [
        "Reach your top hand higher — raise your arm more",
        "Keep your torso aligned with your front leg — don't collapse forward",
        "Extend your front side body more",
        "Open up at your hips — your torso is too closed"
    ]
}

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def generate_mock_scores(avg_target: float, num_frames: int = 80) -> list[float]:
    """Generates a realistic sequence of scores centering around avg_target."""
    # Create a smooth wave representing holding a pose with slight wobble/stabilization
    x = np.linspace(0, 2 * np.pi, num_frames)
    wobble = np.sin(x * 2.5) * 4.0
    stabilize = np.linspace(-6, 4, num_frames) # Starts lower, stabilizes higher
    noise = np.random.normal(0, 2.0, num_frames)
    
    scores = avg_target + wobble + stabilize + noise
    # Keep within logical limits
    scores = np.clip(scores, 35.0, 100.0)
    return [round(float(s), 1) for s in scores]

def get_feedback_for_score(pose_name: str, avg_score: float) -> list[str]:
    """Generates realistic feedback based on the overall average score."""
    if avg_score >= 90.0:
        return ["Great job! All joints are within the ideal range."]
    
    # Pick 1 or 2 items from feedback templates based on score
    templates = POSE_FEEDBACK_TEMPLATES.get(pose_name, ["Adjust your posture."])
    num_issues = 1 if avg_score >= 80.0 else (2 if avg_score >= 65.0 else 3)
    issues = random.sample(templates, min(num_issues, len(templates)))
    
    # Capitalize and clean up feedback list
    return issues

async def seed_database():
    load_dotenv()
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        print("❌ ERROR: MONGO_URL environment variable is not set in .env")
        return

    print("Connecting to MongoDB Atlas...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[DB_NAME]
    
    # Collections
    users_coll = db["users"]
    sessions_coll = db["sessions"]
    custom_sets_coll = db["custom_sets"]

    # Define seed users
    seed_users_data = [
        {
            "name": "Jane Doe",
            "email": "jane@example.com",
            "password": "password123",
            "level": "intermediate",
            "days_ago_joined": 14,
        },
        {
            "name": "John Smith",
            "email": "john@example.com",
            "password": "password123",
            "level": "beginner",
            "days_ago_joined": 10,
        },
        {
            "name": "Alice Johnson",
            "email": "alice@example.com",
            "password": "password123",
            "level": "advanced",
            "days_ago_joined": 20,
        },
        {
            "name": "Bob Brown",
            "email": "bob@example.com",
            "password": "password123",
            "level": "beginner",
            "days_ago_joined": 5,
        }
    ]

    # Clean existing seed data to prevent duplicates
    seed_emails = [u["email"] for u in seed_users_data]
    print(f"🧹 Cleaning up existing seed users with emails: {', '.join(seed_emails)}")
    
    # Find existing IDs to clean up their sessions and custom sets too
    existing_users = await users_coll.find({"email": {"$in": seed_emails}}).to_list(length=100)
    existing_ids = [str(u["_id"]) for u in existing_users]
    
    if existing_ids:
        res_sessions = await sessions_coll.delete_many({"user_id": {"$in": existing_ids}})
        res_sets = await custom_sets_coll.delete_many({"user_id": {"$in": existing_ids}})
        res_users = await users_coll.delete_many({"_id": {"$in": [u["_id"] for u in existing_users]}})
        print(f"Deleted {res_users.deleted_count} users, {res_sessions.deleted_count} sessions, and {res_sets.deleted_count} custom sets.")

    # 1. Seed Users
    print("\n👤 Seeding users...")
    user_id_map = {}
    hashed_pwd = get_password_hash("password123")  # Hash once for performance
    
    for u in seed_users_data:
        join_date = datetime.now(timezone.utc) - timedelta(days=u["days_ago_joined"])
        user_doc = {
            "name": u["name"],
            "email": u["email"],
            "hashed_password": hashed_pwd,
            "created_at": join_date,
        }
        res = await users_coll.insert_one(user_doc)
        user_id_map[u["email"]] = {
            "id": str(res.inserted_id),
            "name": u["name"],
            "level": u["level"],
            "joined_at": join_date
        }
        print(f"  Added user: {u['name']} ({u['email']}) -> ID: {res.inserted_id}")

    # 2. Seed Custom Sets
    print("\n✨ Seeding custom sets...")
    custom_sets_definitions = {
        "jane@example.com": [
            {"name": "Morning Balance Flow", "poses": ["tree", "warrior1", "warrior2"]},
            {"name": "Hip Opener Trio", "poses": ["warrior2", "triangle"]}
        ],
        "alice@example.com": [
            {"name": "Power Standing Poses", "poses": ["warrior1", "warrior2", "triangle", "tree"]},
            {"name": "Quick Alignment Check", "poses": ["warrior2", "triangle"]}
        ],
        "john@example.com": [
            {"name": "Beginner Essentials", "poses": ["tree", "warrior1"]}
        ]
    }
    
    for email, sets in custom_sets_definitions.items():
        uid = user_id_map[email]["id"]
        for s in sets:
            set_doc = {
                "user_id": uid,
                "name": s["name"],
                "poses": s["poses"],
                "created_at": datetime.now(timezone.utc) - timedelta(days=2)
            }
            res = await custom_sets_coll.insert_one(set_doc)
            print(f"  Added custom set '{s['name']}' for {email}")

    # 3. Seed Session History (with progress trends!)
    print("\n🧘 Seeding yoga sessions...")
    
    # Helper to generate sessions over time with score trends
    # Beginner: scores start low (60s) and end medium-low (70s)
    # Intermediate: scores start medium (70s) and end high (80s-90)
    # Advanced: scores start high (80s) and end excellent (90-96)
    for email, uinfo in user_id_map.items():
        uid = uinfo["id"]
        level = uinfo["level"]
        joined_at = uinfo["joined_at"]
        
        # Decide how many sessions to generate
        if level == "advanced":
            num_sessions = 8
            base_score_range = (80.0, 85.0)
            improvement_factor = 1.5  # gains +1.5% per session
        elif level == "intermediate":
            num_sessions = 6
            base_score_range = (70.0, 75.0)
            improvement_factor = 2.5  # gains +2.5% per session
        else: # beginner
            num_sessions = 4
            base_score_range = (55.0, 62.0)
            improvement_factor = 3.5  # gains +3.5% per session
            
        print(f"  Generating {num_sessions} sessions for {email} ({level} level)...")
        
        for s_idx in range(num_sessions):
            # Sessions distributed from joined_at to yesterday
            time_offset_days = (s_idx + 1) * ((datetime.now(timezone.utc) - joined_at).days / (num_sessions + 1))
            session_date = joined_at + timedelta(days=time_offset_days, hours=random.randint(-2, 2))
            
            # Progress average score
            start_base = random.uniform(*base_score_range)
            session_target_avg = start_base + (s_idx * improvement_factor)
            session_target_avg = min(session_target_avg, 97.0) # Cap at 97%
            
            # Select 1-4 random poses for this session
            available_poses = list(FRONTEND_POSE_MAP.keys())
            num_poses_in_session = random.randint(2, 4)
            poses_to_practice = random.sample(available_poses, num_poses_in_session)
            
            pose_records = []
            for p_key in poses_to_practice:
                # Add some variance between individual poses in a session
                pose_avg = session_target_avg + random.uniform(-4.0, 4.0)
                pose_avg = np.clip(pose_avg, 40.0, 98.0)
                
                max_score = min(pose_avg + random.uniform(3.0, 8.0), 100.0)
                min_score = max(pose_avg - random.uniform(5.0, 15.0), 30.0)
                total_frames = random.randint(50, 100)
                
                scores_list = generate_mock_scores(pose_avg, total_frames)
                feedback = get_feedback_for_score(p_key, pose_avg)
                
                # Mock minimal landmark frames to avoid empty record issues
                # (1 frame with 33 dummy joints is enough to look structure-compliant)
                dummy_frame = [{"x": 0.5 + random.uniform(-0.02, 0.02), 
                                "y": 0.5 + random.uniform(-0.02, 0.02), 
                                "z": 0.0, 
                                "visibility": 0.95} for _ in range(33)]
                
                pose_records.append({
                    "pose_name": p_key,
                    "label": FRONTEND_POSE_LABELS[p_key],
                    "avg_score": round(float(pose_avg), 1),
                    "max_score": round(float(max_score), 1),
                    "min_score": round(float(min_score), 1),
                    "total_frames": total_frames,
                    "scores": scores_list,
                    "frames": [dummy_frame], # simplified mock
                    "feedback": feedback,
                    "timestamp": session_date + timedelta(minutes=random.randint(2, 10))
                })
                
            session_doc = {
                "user_id": uid,
                "created_at": session_date,
                "completed_at": session_date + timedelta(minutes=15),
                "status": "completed",
                "poses": pose_records
            }
            
            await sessions_coll.insert_one(session_doc)
            
    print("\n✅ Seeding complete! Database successfully populated with:")
    print(f" - {len(seed_users_data)} users")
    print(f" - {sum(len(sets) for sets in custom_sets_definitions.values())} custom pose sets")
    # Count totals in db
    total_db_users = await users_coll.count_documents({})
    total_db_sessions = await sessions_coll.count_documents({})
    total_db_sets = await custom_sets_coll.count_documents({})
    print(f"\n📊 Current database collection counts:")
    print(f" - 'users' collection: {total_db_users} documents")
    print(f" - 'sessions' collection: {total_db_sessions} documents")
    print(f" - 'custom_sets' collection: {total_db_sets} documents")

if __name__ == "__main__":
    asyncio.run(seed_database())
