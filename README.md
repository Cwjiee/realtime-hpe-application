# Yoga Pose Scoring App

An AI-powered yoga assistant that provides real-time pose estimation, scoring, and corrective feedback using MediaPipe.

## 🚀 Key Features

*   **Real-time Tracking**: Live webcam pose detection with landmark overlays.
*   **Pose Scoring**: Joint angle analysis compared against ground-truth reference data.
*   **Guided Sequences**: Practice curated or custom-built yoga routines with countdowns and transitions.
*   **Session Analytics**: Detailed breakdown of performance, including max/min scores and corrective tips.
*   **Video Analysis**: Support for uploading pre-recorded videos for offline scoring.

---

## 🛠️ Tech Stack

### Backend (`/backend`)
*   **Framework**: FastAPI (Python)
*   **Database**: MongoDB (via Motor async driver)
*   **Pose Engine**: MediaPipe for landmark extraction and angle calculation.
*   **Security**: JWT-based authentication with `bcrypt` password hashing.

**Setup**:
1. `cd backend`
2. `pip install -r requirements.txt`
3. Configure `.env` with `MONGO_URL` and `JWT_SECRET`.
4. Run: `uvicorn backend.main:app --reload`

### Frontend (`/pose-estimation-app`)
*   **Framework**: React 19 + Vite
*   **Styling**: Tailwind CSS 4
*   **Vision**: `@mediapipe/tasks-vision` for client-side pose detection.
*   **State**: React Context API for authentication and session management.

**Setup**:
1. `cd pose-estimation-app`
2. `npm install`
3. Configure `.env` with `VITE_API_BASE` (pointing to FastAPI server).
4. Run: `npm run dev`

---

## 📂 Project Structure

*   **`backend/main.py`**: Primary API entry point for auth, session history, and pose analysis.
*   **`backend/pose_scoring.py`**: Core logic for landmark normalization, angle computation, and MAE scoring.
*   **`pose-estimation-app/src/pages/`**:
    *   `SetPage.jsx`: Orchestrates the guided yoga routines and frame collection.
    *   `BuildSetPage.jsx`: UI for creating and managing custom pose sequences.
    *   `SessionDetailPage.jsx`: Visualizes performance analytics for completed sessions.
*   **`pose-estimation-app/src/utils/`**: Utilities for skeleton drawing and pose matching algorithms.
