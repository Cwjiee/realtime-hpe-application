"""
FastAPI Backend for Yoga Pose Scoring
"""

import tempfile
import os
from datetime import datetime, timezone
from typing import List, Optional

import numpy as np
from bson import ObjectId
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.database import sessions_collection
from backend.pose_scoring import (
    POSE_OPTIONS,
    load_reference_pose,
    process_video,
    normalize_landmarks,
    extract_joint_angles,
    compute_mae,
    mae_to_score,
)

app = FastAPI(title="Yoga Pose Scoring API")

# CORS — allow the React frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
    session_id: Optional[str] = None


@app.get("/api/poses")
def get_poses():
    """Return available pose options."""
    return {"poses": list(POSE_OPTIONS.keys())}


@app.post("/api/session/start")
async def start_session():
    """Create a new session and return its ID."""
    session_doc = {
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
        # Cleanup temp file
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
    # Resolve short frontend pose name to full POSE_OPTIONS key
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
        # Convert list of Landmark objects to numpy array (x, y)
        landmarks_np = np.array([[lm.x, lm.y] for lm in frame_landmarks])
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

    # Persist to MongoDB if session_id is provided
    if request.session_id:
        try:
            oid = ObjectId(request.session_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid session_id format.")

        pose_record = {
            "pose_name": request.pose_name,
            "label": FRONTEND_POSE_LABELS.get(request.pose_name, request.pose_name),
            "avg_score": result["avg_score"],
            "max_score": result["max_score"],
            "min_score": result["min_score"],
            "total_frames": result["total_frames"],
            "scores": scores,
            "timestamp": datetime.now(timezone.utc),
        }

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

    session = await sessions_collection.find_one({"_id": oid})
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