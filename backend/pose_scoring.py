"""
Yoga Pose Scoring Logic
Ported from streamlit/app.py for use with FastAPI backend.
"""

import numpy as np
import json
import cv2
import os
import mediapipe as mp
from mediapipe.tasks.python import vision

# ================================
# Constants and Configuration
# ================================

LANDMARKS = {
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_elbow": 13,
    "right_elbow": 14,
    "left_wrist": 15,
    "right_wrist": 16,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
}

ANGLE_TOLERANCE = 15.0
SCORING_SIGMA = 25.0

# Available poses and their reference files
POSE_OPTIONS = {
    "Tree Pose (Vrksasana)": ("ground_truth_tree.json", "Vrksasana"),
    "Warrior 1 (Virabhadrasana I)": ("ground_truth_warrior1.json", "Virabhadrasana One"),
    "Warrior 2 (Virabhadrasana II)": ("ground_truth_warrior2.json", "Virabhadrasana Two"),
    "Triangle Pose (Trikonasana)": ("ground_truth_triangle.json", "Trikonasana"),
}

# ================================
# Utility Functions
# ================================


def calculate_angle(a, b, c):
    """Calculate angle ABC (in degrees) given 3 points."""
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(
        a[1] - b[1], a[0] - b[0]
    )
    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180.0:
        angle = 360 - angle

    return angle


def normalize_landmarks(landmarks):
    """Normalize landmarks relative to hip center and shoulder width."""
    left_hip = landmarks[LANDMARKS["left_hip"]]
    right_hip = landmarks[LANDMARKS["right_hip"]]
    hip_center = (left_hip + right_hip) / 2

    left_shoulder = landmarks[LANDMARKS["left_shoulder"]]
    right_shoulder = landmarks[LANDMARKS["right_shoulder"]]
    shoulder_width = np.linalg.norm(left_shoulder - right_shoulder) + 1e-6

    normalized = (landmarks - hip_center) / shoulder_width
    return normalized


def extract_joint_angles(lm):
    """Extract joint angles from landmarks."""
    return {
        "left_knee": calculate_angle(
            lm[LANDMARKS["left_hip"]],
            lm[LANDMARKS["left_knee"]],
            lm[LANDMARKS["left_ankle"]],
        ),
        "right_knee": calculate_angle(
            lm[LANDMARKS["right_hip"]],
            lm[LANDMARKS["right_knee"]],
            lm[LANDMARKS["right_ankle"]],
        ),
        "left_hip": calculate_angle(
            lm[LANDMARKS["left_shoulder"]],
            lm[LANDMARKS["left_hip"]],
            lm[LANDMARKS["left_knee"]],
        ),
        "right_hip": calculate_angle(
            lm[LANDMARKS["right_shoulder"]],
            lm[LANDMARKS["right_hip"]],
            lm[LANDMARKS["right_knee"]],
        ),
    }


def get_shortest_angle_distance(a, b):
    """Calculates the shortest distance between two angles in degrees."""
    diff = (b - a + 180) % 360 - 180
    return abs(diff)


def mae_to_score(mae, sigma=SCORING_SIGMA):
    """Convert MAE to a 0-100 score."""
    score = 100.0 * np.exp(-(mae**2) / (2 * sigma**2))

    if score < 1.0:
        return 0.0

    return score


def compute_mae(user_angles, reference_pose):
    """Compute mean absolute error between user angles and reference pose."""
    total_error = 0.0
    total_weight = 0.0

    for joint, ref_angle in reference_pose.items():
        if joint not in user_angles:
            continue
        error = get_shortest_angle_distance(user_angles[joint], ref_angle)
        total_error += error
        total_weight += 1

    return total_error / (total_weight + 1e-6)


def load_reference_pose(pose_name: str) -> dict:
    """Load reference pose angles from JSON file."""
    file_name, pose_key = POSE_OPTIONS[pose_name]
    reference_path = os.path.join(
        os.path.dirname(__file__), "..", "reference", file_name
    )

    with open(reference_path, "r") as f:
        pose_library = json.load(f)

    return pose_library[pose_key]


def load_pose_landmarker():
    """Load MediaPipe PoseLandmarker model."""
    model_path = os.path.join(
        os.path.dirname(__file__), "..", "pose_landmarker_heavy.task"
    )

    base_options = mp.tasks.BaseOptions(model_asset_path=model_path)
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        output_segmentation_masks=True,
    )
    return mp.tasks.vision.PoseLandmarker.create_from_options(options)


def process_video(video_path: str, reference_angles: dict) -> tuple[list[float], float]:
    """
    Process video and score each frame.
    Returns (scores_over_time, fps).
    """
    landmarker = load_pose_landmarker()

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)

    all_frame_landmarks = []

    # Phase 1: Extract landmarks
    frame_index = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),
        )

        timestamp_ms = int((frame_index / fps) * 1000)
        detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)

        if detection_result.pose_landmarks:
            all_frame_landmarks.append(detection_result.pose_landmarks[0])
        else:
            all_frame_landmarks.append(None)

        frame_index += 1

    cap.release()
    landmarker.close()

    # Phase 2: Score frames
    scores_over_time = []

    for landmarks in all_frame_landmarks:
        if landmarks is None:
            scores_over_time.append(0.0)
            continue

        landmarks_np = np.array([[lm.x, lm.y] for lm in landmarks])
        norm_landmarks = normalize_landmarks(landmarks_np)
        angles = extract_joint_angles(norm_landmarks)
        mae = compute_mae(angles, reference_angles)
        score = mae_to_score(mae)
        scores_over_time.append(score)

    return scores_over_time, fps
