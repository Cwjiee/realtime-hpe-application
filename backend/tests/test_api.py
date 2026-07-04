import pytest
from unittest.mock import patch
from bson import ObjectId
from datetime import datetime, timezone
import numpy as np

# Helper function to generate 33 valid mock landmarks for MediaPipe indexing
def make_dummy_landmarks(scale=1.0):
    landmarks = []
    # Index mapping:
    # 11: left_shoulder, 12: right_shoulder, 13: left_elbow, 14: right_elbow,
    # 15: left_wrist, 16: right_wrist, 23: left_hip, 24: right_hip,
    # 25: left_knee, 26: right_knee, 27: left_ankle, 28: right_ankle.
    for i in range(33):
        # Default coords that create a reasonable layout
        x, y, z = 0.5, 0.5, 0.0
        if i == 11: x, y = 0.4, 0.3  # left shoulder
        elif i == 12: x, y = 0.6, 0.3  # right shoulder
        elif i == 13: x, y = 0.35, 0.45 # left elbow
        elif i == 14: x, y = 0.65, 0.45 # right elbow
        elif i == 15: x, y = 0.35, 0.6  # left wrist
        elif i == 16: x, y = 0.65, 0.6  # right wrist
        elif i == 23: x, y = 0.45, 0.65 # left hip
        elif i == 24: x, y = 0.55, 0.65 # right hip
        elif i == 25: x, y = 0.45, 0.8  # left knee
        elif i == 26: x, y = 0.55, 0.8  # right knee
        elif i == 27: x, y = 0.45, 0.95 # left ankle
        elif i == 28: x, y = 0.55, 0.95 # right ankle
        
        # Scale coordinates to test scale variation
        landmarks.append({
            "x": x * scale,
            "y": y * scale,
            "z": z,
            "visibility": 0.95
        })
    return landmarks

# ----------------- Auth Endpoint Tests -----------------

@pytest.mark.asyncio
async def test_auth_signup_success(client, db):
    payload = {
        "name": "New User",
        "email": "newuser@example.com",
        "password": "strongpassword123"
    }
    response = await client.post("/api/auth/signup", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert "access_token" in res_json
    assert res_json["token_type"] == "bearer"
    
    # Verify user was saved in DB
    user = await db["users"].find_one({"email": payload["email"]})
    assert user is not None
    assert user["name"] == payload["name"]

@pytest.mark.asyncio
async def test_auth_signup_missing_fields(client):
    payload = {
        "name": "  ",
        "email": "newuser@example.com",
        "password": ""
    }
    response = await client.post("/api/auth/signup", json=payload)
    assert response.status_code == 400
    assert "required" in response.json()["detail"]

@pytest.mark.asyncio
async def test_auth_signup_duplicate_email(client, db):
    # Register first user
    payload = {
        "name": "First User",
        "email": "duplicate@example.com",
        "password": "password123"
    }
    await client.post("/api/auth/signup", json=payload)
    
    # Try registering again
    response = await client.post("/api/auth/signup", json=payload)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_auth_login_success(client, db):
    # Setup user
    from backend.auth import get_password_hash
    hashed_password = get_password_hash("mypassword")
    await db["users"].insert_one({
        "name": "Login User",
        "email": "login@example.com",
        "hashed_password": hashed_password
    })
    
    # Login form details
    form_data = {
        "username": "login@example.com",
        "password": "mypassword"
    }
    response = await client.post("/api/auth/login", data=form_data)
    assert response.status_code == 200
    res_json = response.json()
    assert "access_token" in res_json

@pytest.mark.asyncio
async def test_auth_login_invalid_credentials(client, db):
    form_data = {
        "username": "nonexistent@example.com",
        "password": "wrongpassword"
    }
    response = await client.post("/api/auth/login", data=form_data)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

# ----------------- Pose Selection -----------------

@pytest.mark.asyncio
async def test_get_poses(client):
    response = await client.get("/api/poses")
    assert response.status_code == 200
    poses = response.json()["poses"]
    assert "Tree Pose (Vrksasana)" in poses
    assert "Warrior 1 (Virabhadrasana I)" in poses

# ----------------- Session Scenarios -----------------

@pytest.mark.asyncio
async def test_start_session_protected(client):
    # Protected endpoint should return 401 without auth headers
    response = await client.post("/api/session/start")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_start_session_success(client, auth_headers, db):
    response = await client.post("/api/session/start", headers=auth_headers)
    assert response.status_code == 200
    res_json = response.json()
    assert "session_id" in res_json
    
    # Verify session document exists in DB
    session_id = res_json["session_id"]
    session = await db["sessions"].find_one({"_id": ObjectId(session_id)})
    assert session is not None
    assert session["status"] == "in_progress"
    assert len(session["poses"]) == 0

# ----------------- Frame Scoring & Analytics -----------------

@pytest.mark.asyncio
async def test_analyze_frames_without_session(client):
    payload = {
        "pose_name": "tree",
        "frames": [make_dummy_landmarks()],
        "video_width": 640,
        "video_height": 480
    }
    response = await client.post("/api/analyze-frames", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert "scores" in res_json
    assert res_json["total_frames"] == 1
    assert "avg_score" in res_json

@pytest.mark.asyncio
async def test_analyze_frames_invalid_pose(client):
    payload = {
        "pose_name": "invalid_pose_name",
        "frames": [make_dummy_landmarks()]
    }
    response = await client.post("/api/analyze-frames", json=payload)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_analyze_frames_with_session_persistence(client, auth_headers, db):
    # 1. Start a session
    start_resp = await client.post("/api/session/start", headers=auth_headers)
    session_id = start_resp.json()["session_id"]
    
    # 2. Post frame data tied to this session_id
    payload = {
        "pose_name": "tree",
        "frames": [make_dummy_landmarks()],
        "video_width": 640,
        "video_height": 480,
        "session_id": session_id
    }
    response = await client.post("/api/analyze-frames", json=payload)
    assert response.status_code == 200
    assert "feedback" in response.json()
    
    # 3. Verify database session document was updated with the pose record
    session = await db["sessions"].find_one({"_id": ObjectId(session_id)})
    assert len(session["poses"]) == 1
    assert session["poses"][0]["pose_name"] == "tree"
    assert len(session["poses"][0]["feedback"]) > 0

@pytest.mark.asyncio
async def test_get_session_analytics(client, auth_headers, db):
    # 1. Start session
    start_resp = await client.post("/api/session/start", headers=auth_headers)
    session_id = start_resp.json()["session_id"]
    
    # 2. Add some pose scores to the session manually in DB
    pose_record = {
        "pose_name": "tree",
        "label": "Tree",
        "avg_score": 85.0,
        "max_score": 90.0,
        "min_score": 80.0,
        "total_frames": 10,
        "scores": [85.0] * 10,
        "feedback": ["Great!"],
        "timestamp": datetime.now(timezone.utc),
    }
    await db["sessions"].update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"poses": pose_record}}
    )
    
    # 3. Retrieve analytics
    analytics_resp = await client.get(f"/api/session/{session_id}/analytics")
    assert analytics_resp.status_code == 200
    data = analytics_resp.json()
    assert data["session_id"] == session_id
    assert data["total_poses"] == 1
    assert data["overall_avg_score"] == 85.0
    assert data["best_pose"]["name"] == "Tree"
    assert data["best_pose"]["avg_score"] == 85.0
    
    # 4. Verify session state marked as completed in DB
    session = await db["sessions"].find_one({"_id": ObjectId(session_id)})
    assert session["status"] == "completed"
    assert "completed_at" in session

@pytest.mark.asyncio
async def test_get_all_sessions(client, auth_headers, db):
    # Get current user details from headers to link user_id
    from backend.auth import oauth2_scheme, SECRET_KEY, ALGORITHM
    import jwt
    token = auth_headers["Authorization"].split(" ")[1]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload["sub"]
    
    # Create a mock session directly in DB
    await db["sessions"].insert_one({
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc),
        "status": "completed",
        "poses": [
            {"pose_name": "tree", "label": "Tree", "avg_score": 90.0}
        ]
    })
    
    response = await client.get("/api/sessions", headers=auth_headers)
    assert response.status_code == 200
    sessions = response.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["status"] == "completed"
    assert sessions[0]["overall_avg_score"] == 90.0

# ----------------- Custom Set CRUD -----------------

@pytest.mark.asyncio
async def test_custom_set_crud_flow(client, auth_headers, db):
    # 1. Create a custom set
    set_payload = {
        "name": "Daily Flow",
        "poses": ["warrior1", "tree"]
    }
    create_resp = await client.post("/api/custom-sets", json=set_payload, headers=auth_headers)
    assert create_resp.status_code == 200
    set_id = create_resp.json()["set_id"]
    
    # 2. Get custom sets
    get_resp = await client.get("/api/custom-sets", headers=auth_headers)
    assert get_resp.status_code == 200
    sets_list = get_resp.json()["custom_sets"]
    assert len(sets_list) == 1
    assert sets_list[0]["name"] == "Daily Flow"
    assert sets_list[0]["poses"] == ["warrior1", "tree"]
    
    # 3. Delete custom set
    del_resp = await client.delete(f"/api/custom-sets/{set_id}", headers=auth_headers)
    assert del_resp.status_code == 200
    
    # 4. Verify deletion
    get_resp_after = await client.get("/api/custom-sets", headers=auth_headers)
    assert len(get_resp_after.json()["custom_sets"]) == 0

@pytest.mark.asyncio
async def test_create_custom_set_invalid_pose(client, auth_headers):
    set_payload = {
        "name": "Bad Flow",
        "poses": ["unknown_pose"]
    }
    response = await client.post("/api/custom-sets", json=set_payload, headers=auth_headers)
    assert response.status_code == 400

# ----------------- Leaderboard -----------------

@pytest.mark.asyncio
async def test_leaderboard(client, db):
    # Register 2 users manually and give them completed sessions
    user_a_id = str(ObjectId())
    user_b_id = str(ObjectId())
    
    await db["users"].insert_many([
        {"_id": ObjectId(user_a_id), "name": "Yogi Alice", "email": "alice@yoga.com"},
        {"_id": ObjectId(user_b_id), "name": "Yogi Bob", "email": "bob@yoga.com"}
    ])
    
    # Session for Alice: average score 95.0
    await db["sessions"].insert_one({
        "user_id": user_a_id,
        "status": "completed",
        "created_at": datetime.now(timezone.utc),
        "poses": [{"pose_name": "warrior1", "avg_score": 95.0, "timestamp": datetime.now(timezone.utc)}]
    })
    
    # Session for Bob: average score 80.0
    await db["sessions"].insert_one({
        "user_id": user_b_id,
        "status": "completed",
        "created_at": datetime.now(timezone.utc),
        "poses": [{"pose_name": "warrior1", "avg_score": 80.0, "timestamp": datetime.now(timezone.utc)}]
    })
    
    # Get overall leaderboard
    response = await client.get("/api/leaderboard")
    assert response.status_code == 200
    rankings = response.json()["rankings"]
    assert len(rankings) == 2
    
    # Alice should be ranked #1
    assert rankings[0]["name"] == "Yogi Alice"
    assert rankings[0]["score"] == 95.0
    assert rankings[1]["name"] == "Yogi Bob"
    assert rankings[1]["score"] == 80.0
    
    # Filter by specific pose
    response_pose = await client.get("/api/leaderboard?pose=warrior1")
    assert response_pose.status_code == 200
    assert response_pose.json()["pose_filter"] == "warrior1"

# ----------------- Profile -----------------

@pytest.mark.asyncio
async def test_get_profile(client, auth_headers, db):
    # Decode user token to link session to this user
    from backend.auth import oauth2_scheme, SECRET_KEY, ALGORITHM
    import jwt
    token = auth_headers["Authorization"].split(" ")[1]
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload["sub"]
    
    # Insert completed session for Alice
    await db["sessions"].insert_one({
        "user_id": user_id,
        "status": "completed",
        "created_at": datetime.now(timezone.utc),
        "poses": [{"pose_name": "tree", "avg_score": 92.5}]
    })
    
    # Insert custom set
    await db["custom_sets"].insert_one({
        "user_id": user_id,
        "name": "Power Set",
        "poses": ["warrior1", "warrior2"]
    })
    
    response = await client.get("/api/profile", headers=auth_headers)
    assert response.status_code == 200
    profile = response.json()
    assert profile["total_sessions"] == 1
    assert profile["completed_sessions"] == 1
    assert profile["overall_avg_score"] == 92.5
    assert profile["custom_sets_count"] == 1
    assert len(profile["per_pose_stats"]) == 1
    assert profile["per_pose_stats"][0]["pose_name"] == "tree"
    assert profile["per_pose_stats"][0]["best_score"] == 92.5

# ----------------- Video Analysis -----------------

@pytest.mark.asyncio
async def test_analyze_video_endpoint(client):
    # Patch process_video and OpenCV logic to prevent real model load
    with patch("backend.main.process_video") as mock_process:
        mock_process.return_value = ([80.0, 85.0, 90.0], 30.0)
        
        # Mock file content
        file_content = b"mock mp4 data"
        files = {"video": ("test_run.mp4", file_content, "video/mp4")}
        data = {"pose_name": "Tree Pose (Vrksasana)"}
        
        response = await client.post("/api/analyze", files=files, data=data)
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["total_frames"] == 3
        assert res_data["fps"] == 30.0
        assert res_data["avg_score"] == 85.0
        assert res_data["max_score"] == 90.0
        assert res_data["min_score"] == 80.0
