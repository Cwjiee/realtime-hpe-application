"""
FastAPI Backend for Yoga Pose Scoring
"""

import tempfile
import os

import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.pose_scoring import POSE_OPTIONS, load_reference_pose, process_video

app = FastAPI(title="Yoga Pose Scoring API")

# CORS — allow the React frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/poses")
def get_poses():
    """Return available pose options."""
    return {"poses": list(POSE_OPTIONS.keys())}


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
