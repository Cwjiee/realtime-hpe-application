"""
FastAPI Backend for Yoga Pose Scoring
"""

import tempfile
import os
from datetime import datetime, timezone
from typing import List, Optional

import numpy as np
from bson import ObjectId
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.database import sessions_collection, users_collection, custom_sets_collection
from backend.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from backend.pose_scoring import (
    POSE_OPTIONS,
    load_reference_pose,
    process_video,
    normalize_landmarks,
    extract_joint_angles,
    compute_mae,
    mae_to_score,
    generate_pose_feedback,
)

app = FastAPI(title="Yoga Pose Scoring API")

# CORS — allow the React frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://realtime-hpe-application.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mapping from frontend short names to backend POSE_OPTIONS keys
FRONTEND_POSE_MAP = {
    "warrior1": "Warrior 1 (Virabhadrasana I)",
    "warrior2": "Warrior 2 (Virabhadrasana II)",
    "tree": "Tree Pose (Vrksasana)",
    "triangle": "Triangle Pose (Trikonasana)",
}

# Reverse map for display labels
FRONTEND_POSE_LABELS = {
    "warrior1": "Warrior I",
    "warrior2": "Warrior II",
    "tree": "Tree",
    "triangle": "Triangle",
}


# --- Pydantic models ---

class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class AnalyzeFramesRequest(BaseModel):
    pose_name: str
    frames: List[List[Landmark]]
    video_width: int = 640
    video_height: int = 480
    session_id: Optional[str] = None


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class CustomSetCreate(BaseModel):
    name: str
    poses: List[str]


class Token(BaseModel):
    access_token: str
    token_type: str


@app.get("/api/poses")
def get_poses():
    """Return available pose options."""
    return {"poses": list(POSE_OPTIONS.keys())}


@app.post("/api/auth/signup", response_model=Token)
async def signup(user: UserCreate):
    if not user.name.strip() or not user.email.strip() or not user.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All fields are required and must not be empty"
        )
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    hashed_password = get_password_hash(user.password)
    user_doc = {
        "name": user.name,
        "email": user.email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc),
    }
    result = await users_collection.insert_one(user_doc)
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if not form_data.username.strip() or not form_data.password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )
    user = await users_collection.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user["_id"])})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/session/start")
async def start_session(current_user: dict = Depends(get_current_user)):
    """Create a new session and return its ID."""
    session_doc = {
        "user_id": str(current_user["_id"]),
        "created_at": datetime.now(timezone.utc),
        "status": "in_progress",
        "poses": [],
    }
    result = await sessions_collection.insert_one(session_doc)
    return {"session_id": str(result.inserted_id)}


@app.post("/api/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    pose_name: str = Form(...),
):
    """Analyze an uploaded video against a reference pose."""
    if pose_name not in POSE_OPTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown pose: {pose_name}. Available: {list(POSE_OPTIONS.keys())}",
        )

    # Save uploaded video to a temp file
    suffix = os.path.splitext(video.filename or "video.mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await video.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        reference_angles = load_reference_pose(pose_name)
        scores, fps = process_video(tmp_path, reference_angles)

        scores_list = [float(s) for s in scores]

        return {
            "scores": scores_list,
            "fps": float(fps),
            "total_frames": len(scores_list),
            "avg_score": float(np.mean(scores_list)) if scores_list else 0.0,
            "max_score": float(np.max(scores_list)) if scores_list else 0.0,
            "min_score": float(np.min(scores_list)) if scores_list else 0.0,
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.post("/api/analyze-frames")
async def analyze_frames(request: AnalyzeFramesRequest):
    """
    Analyze pre-extracted landmark frames from the frontend webcam.
    Accepts JSON with pose_name (short key), frames (list of landmark arrays),
    and an optional session_id to persist results.
    """
    full_pose_name = FRONTEND_POSE_MAP.get(request.pose_name)
    if full_pose_name is None or full_pose_name not in POSE_OPTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown pose: {request.pose_name}. "
                   f"Available: {list(FRONTEND_POSE_MAP.keys())}",
        )

    if not request.frames:
        raise HTTPException(status_code=400, detail="No frames provided.")

    reference_angles = load_reference_pose(full_pose_name)

    scores = []
    for frame_landmarks in request.frames:
        landmarks_np = np.array([[lm.x * request.video_width, lm.y * request.video_height] for lm in frame_landmarks])
        try:
            norm_landmarks = normalize_landmarks(landmarks_np)
            angles = extract_joint_angles(norm_landmarks)
            mae = compute_mae(angles, reference_angles)
            score = mae_to_score(mae)
            scores.append(float(score))
        except Exception:
            scores.append(0.0)

    result = {
        "scores": scores,
        "total_frames": len(scores),
        "avg_score": float(np.mean(scores)) if scores else 0.0,
        "max_score": float(np.max(scores)) if scores else 0.0,
        "min_score": float(np.min(scores)) if scores else 0.0,
    }

    if request.session_id:
        try:
            oid = ObjectId(request.session_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid session_id format.")

        feedback = generate_pose_feedback(request.frames, reference_angles, request.video_width, request.video_height)

        pose_record = {
            "pose_name": request.pose_name,
            "label": FRONTEND_POSE_LABELS.get(request.pose_name, request.pose_name),
            "avg_score": result["avg_score"],
            "max_score": result["max_score"],
            "min_score": result["min_score"],
            "total_frames": result["total_frames"],
            "scores": scores,
            "frames": [[{"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility} for lm in frame] for frame in request.frames],
            "feedback": feedback,
            "timestamp": datetime.now(timezone.utc),
        }

        result["feedback"] = feedback

        update_result = await sessions_collection.update_one(
            {"_id": oid},
            {"$push": {"poses": pose_record}},
        )

        if update_result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Session not found.")

    return result


@app.get("/api/session/{session_id}/analytics")
async def get_session_analytics(session_id: str):
    """Return aggregated analytics for a completed session."""
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session_id format.")

    session = await sessions_collection.find_one(
        {"_id": oid},
        {"poses.scores": 0, "poses.frames": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    poses = session.get("poses", [])

    if not poses:
        return {
            "session_id": session_id,
            "created_at": session.get("created_at"),
            "total_poses": 0,
            "overall_avg_score": 0.0,
            "best_pose": None,
            "worst_pose": None,
            "poses": [],
        }

    pose_summaries = []
    for p in poses:
        pose_summaries.append({
            "pose_name": p["pose_name"],
            "label": p.get("label", p["pose_name"]),
            "avg_score": p["avg_score"],
            "max_score": p["max_score"],
            "min_score": p["min_score"],
            "total_frames": p["total_frames"],
            "feedback": p.get("feedback", []),
        })

    avg_scores = [p["avg_score"] for p in pose_summaries]
    overall_avg = float(np.mean(avg_scores))

    best = max(pose_summaries, key=lambda x: x["avg_score"])
    worst = min(pose_summaries, key=lambda x: x["avg_score"])

    # Mark session as completed
    await sessions_collection.update_one(
        {"_id": oid},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}},
    )

    return {
        "session_id": session_id,
        "created_at": session.get("created_at"),
        "total_poses": len(pose_summaries),
        "overall_avg_score": overall_avg,
        "best_pose": {"name": best["label"], "avg_score": best["avg_score"]},
        "worst_pose": {"name": worst["label"], "avg_score": worst["avg_score"]},
        "poses": pose_summaries,
    }


@app.get("/api/sessions")
async def get_all_sessions(current_user: dict = Depends(get_current_user)):
    """Return a list of all sessions for the current user, most recent first."""
    cursor = sessions_collection.find(
        {"user_id": str(current_user["_id"])},
        # Exclude the raw per-frame scores and frames array to keep the response lean
        {"poses.scores": 0, "poses.frames": 0},
    ).sort("created_at", -1)

    sessions = []
    async for session in cursor:
        poses = session.get("poses", [])
        avg_scores = [p["avg_score"] for p in poses if "avg_score" in p]
        overall_avg = float(np.mean(avg_scores)) if avg_scores else 0.0
        pose_labels = [p.get("label", p.get("pose_name", "")) for p in poses]

        sessions.append({
            "session_id": str(session["_id"]),
            "created_at": session.get("created_at"),
            "completed_at": session.get("completed_at"),
            "status": session.get("status", "in_progress"),
            "total_poses": len(poses),
            "overall_avg_score": round(overall_avg, 1),
            "poses": pose_labels,
        })

    return {"sessions": sessions}


@app.post("/api/custom-sets")
async def create_custom_set(custom_set: CustomSetCreate, current_user: dict = Depends(get_current_user)):
    """Create a new custom pose set for the current user."""
    # Validate poses
    for pose in custom_set.poses:
        if pose not in FRONTEND_POSE_MAP:
            raise HTTPException(status_code=400, detail=f"Unknown pose: {pose}")
            
    custom_set_doc = {
        "user_id": str(current_user["_id"]),
        "name": custom_set.name,
        "poses": custom_set.poses,
        "created_at": datetime.now(timezone.utc),
    }
    result = await custom_sets_collection.insert_one(custom_set_doc)
    return {"set_id": str(result.inserted_id), "message": "Custom set created successfully"}


@app.get("/api/custom-sets")
async def get_custom_sets(current_user: dict = Depends(get_current_user)):
    """Get all custom pose sets for the current user."""
    cursor = custom_sets_collection.find({"user_id": str(current_user["_id"])})
    custom_sets = []
    async for c_set in cursor:
        custom_sets.append({
            "set_id": str(c_set["_id"]),
            "name": c_set["name"],
            "poses": c_set["poses"],
            "created_at": c_set.get("created_at"),
        })
    return {"custom_sets": custom_sets}


@app.delete("/api/custom-sets/{set_id}")
async def delete_custom_set(set_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a custom pose set belonging to the current user."""
    try:
        oid = ObjectId(set_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid set_id format")
        
    result = await custom_sets_collection.delete_one(
        {"_id": oid, "user_id": str(current_user["_id"])}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom set not found or unauthorized")
        
    return {"message": "Custom set deleted successfully"}


@app.get("/api/leaderboard")
async def get_leaderboard(pose: Optional[str] = None):
    """
    Return the global leaderboard ranked by best average score.
    - No pose filter  → overall ranking (avg of all pose scores per session)
    - pose=warrior1   → ranking for that specific pose only (best attempt)
    """
    if pose and pose not in FRONTEND_POSE_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown pose filter: {pose}. Available: {list(FRONTEND_POSE_MAP.keys())}",
        )

    if pose:
        pipeline = [
            {"$match": {"status": "completed"}},
            {"$unwind": "$poses"},
            {"$match": {"poses.pose_name": pose}},
            {
                "$group": {
                    "_id": "$user_id",
                    "best_score": {"$max": "$poses.avg_score"},
                    "total_attempts": {"$sum": 1},
                    "latest_attempt": {"$max": "$poses.timestamp"},
                }
            },
            {"$sort": {"best_score": -1}},
        ]
    else:
        pipeline = [
            {"$match": {"status": "completed", "poses": {"$ne": []}}},
            {
                "$project": {
                    "user_id": 1,
                    "created_at": 1,
                    "session_avg": {"$avg": "$poses.avg_score"},
                }
            },
            {
                "$group": {
                    "_id": "$user_id",
                    "best_score": {"$max": "$session_avg"},
                    "total_sessions": {"$sum": 1},
                    "latest_session": {"$max": "$created_at"},
                }
            },
            {"$sort": {"best_score": -1}},
        ]

    cursor = sessions_collection.aggregate(pipeline)
    raw_entries = []
    async for entry in cursor:
        raw_entries.append(entry)

    # Fetch user names in bulk
    user_ids = [e["_id"] for e in raw_entries if e["_id"]]
    user_oids = []
    for uid in user_ids:
        try:
            user_oids.append(ObjectId(uid))
        except Exception:
            pass

    users_map = {}
    if user_oids:
        users_cursor = users_collection.find(
            {"_id": {"$in": user_oids}},
            {"name": 1},
        )
        async for u in users_cursor:
            users_map[str(u["_id"])] = u.get("name", "Unknown")

    rankings = []
    for rank, entry in enumerate(raw_entries, start=1):
        uid = entry["_id"]
        rankings.append({
            "rank": rank,
            "user_id": uid,
            "name": users_map.get(uid, "Unknown"),
            "avatar": _initials(users_map.get(uid, "?")),
            "score": round(entry["best_score"], 1),
            "total_sessions": entry.get("total_sessions", entry.get("total_attempts", 0)),
            "latest_activity": entry.get("latest_session", entry.get("latest_attempt")),
        })

    return {"rankings": rankings, "pose_filter": pose}


@app.get("/api/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Return the current user's profile information and practice statistics."""
    user_id = str(current_user["_id"])

    # --- Basic info ---
    profile = {
        "name": current_user.get("name", "Unknown"),
        "email": current_user.get("email", ""),
        "joined_at": current_user.get("created_at"),
    }

    # --- Session statistics ---
    all_sessions_cursor = sessions_collection.find(
        {"user_id": user_id},
        {"poses.scores": 0, "poses.frames": 0},
    )
    sessions = []
    async for s in all_sessions_cursor:
        sessions.append(s)

    total_sessions = len(sessions)
    completed_sessions = sum(1 for s in sessions if s.get("status") == "completed")

    # Per-pose aggregation
    pose_stats: dict[str, list[float]] = {}  # pose_name -> list of avg_scores
    total_poses_practiced = 0

    for s in sessions:
        for p in s.get("poses", []):
            total_poses_practiced += 1
            pn = p.get("pose_name", "")
            avg = p.get("avg_score", 0.0)
            pose_stats.setdefault(pn, []).append(avg)

    per_pose = []
    for pn, scores in pose_stats.items():
        per_pose.append({
            "pose_name": pn,
            "label": FRONTEND_POSE_LABELS.get(pn, pn),
            "attempts": len(scores),
            "best_score": round(float(max(scores)), 1),
            "avg_score": round(float(np.mean(scores)), 1),
        })
    per_pose.sort(key=lambda x: x["best_score"], reverse=True)

    # Overall average across all completed session averages
    session_averages = []
    for s in sessions:
        if s.get("status") == "completed":
            poses = s.get("poses", [])
            avgs = [p["avg_score"] for p in poses if "avg_score" in p]
            if avgs:
                session_averages.append(float(np.mean(avgs)))

    overall_avg = round(float(np.mean(session_averages)), 1) if session_averages else 0.0

    # Recent sessions (last 5)
    recent = sorted(sessions, key=lambda s: s.get("created_at", datetime.min), reverse=True)[:5]
    recent_sessions = []
    for s in recent:
        poses = s.get("poses", [])
        avgs = [p["avg_score"] for p in poses if "avg_score" in p]
        avg = round(float(np.mean(avgs)), 1) if avgs else 0.0
        recent_sessions.append({
            "session_id": str(s["_id"]),
            "created_at": s.get("created_at"),
            "status": s.get("status", "in_progress"),
            "total_poses": len(poses),
            "overall_avg_score": avg,
        })

    # Custom sets count
    custom_sets_count = await custom_sets_collection.count_documents({"user_id": user_id})

    return {
        **profile,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "total_poses_practiced": total_poses_practiced,
        "overall_avg_score": overall_avg,
        "custom_sets_count": custom_sets_count,
        "per_pose_stats": per_pose,
        "recent_sessions": recent_sessions,
    }


def _initials(name: str) -> str:
    """Return up to 2-letter initials from a display name."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return name[:2].upper() if name else "?"

