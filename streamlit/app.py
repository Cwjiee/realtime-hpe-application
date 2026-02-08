"""
Yoga Pose Scoring Streamlit Application
Based on yoga_pose_scoring_video.ipynb
"""

import streamlit as st
import numpy as np
import json
import cv2
import tempfile
import os
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks import python

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
    "right_ankle": 28
}

ANGLE_TOLERANCE = 15.0

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

    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
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


def mae_to_score(mae, tolerance=ANGLE_TOLERANCE):
    """Convert MAE to a 0-100 score."""
    if mae <= tolerance:
        return 100.0
    cutoff = 45.0
    score = max(0.0, 1.0 - (mae - tolerance) / (cutoff - tolerance))
    return score * 100


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


def load_reference_pose(pose_name):
    """Load reference pose angles from JSON file."""
    file_name, pose_key = POSE_OPTIONS[pose_name]
    reference_path = os.path.join(os.path.dirname(__file__), "..", "reference", file_name)
    
    with open(reference_path, 'r') as f:
        pose_library = json.load(f)
    
    return pose_library[pose_key]


def load_pose_landmarker():
    """Load MediaPipe PoseLandmarker model."""
    model_path = os.path.join(os.path.dirname(__file__), "..", "pose_landmarker_heavy.task")
    
    base_options = mp.tasks.BaseOptions(model_asset_path=model_path)
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        output_segmentation_masks=True
    )
    return mp.tasks.vision.PoseLandmarker.create_from_options(options)


def batch_process_video(video_path, reference_angles, progress_bar, status_text):
    """Process video and score each frame."""
    landmarker = load_pose_landmarker()
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    all_frame_landmarks = []
    scores_over_time = []
    
    # Phase 1: Extract landmarks
    status_text.text("Extracting pose landmarks...")
    frame_index = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB, 
            data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        )
        
        timestamp_ms = int((frame_index / fps) * 1000)
        detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)
        
        if detection_result.pose_landmarks:
            all_frame_landmarks.append(detection_result.pose_landmarks[0])
        else:
            all_frame_landmarks.append(None)
        
        frame_index += 1
        progress_bar.progress(frame_index / (total_frames * 2))
    
    cap.release()
    landmarker.close()
    
    # Phase 2: Score frames
    status_text.text("Scoring poses...")
    
    for i, landmarks in enumerate(all_frame_landmarks):
        if landmarks is None:
            scores_over_time.append(0.0)
            continue
        
        landmarks_np = np.array([[lm.x, lm.y] for lm in landmarks])
        norm_landmarks = normalize_landmarks(landmarks_np)
        angles = extract_joint_angles(norm_landmarks)
        mae = compute_mae(angles, reference_angles)
        score = mae_to_score(mae)
        scores_over_time.append(score)
        
        progress_bar.progress(0.5 + (i + 1) / (len(all_frame_landmarks) * 2))
    
    return all_frame_landmarks, scores_over_time, fps


def generate_output_video(input_path, output_path, all_landmarks, all_scores):
    """Generate video with pose overlay and score display."""
    cap = cv2.VideoCapture(input_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_index = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_index < len(all_landmarks):
            landmarks = all_landmarks[frame_index]
            score = all_scores[frame_index]
            
            if landmarks:
                # Draw landmarks
                for landmark in landmarks:
                    x, y = int(landmark.x * width), int(landmark.y * height)
                    cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)
                
                # Draw connections
                connections = mp.tasks.vision.PoseLandmarksConnections.POSE_LANDMARKS
                for connection in connections:
                    start_idx = connection.start
                    end_idx = connection.end
                    
                    if start_idx < len(landmarks) and end_idx < len(landmarks):
                        start_point = (int(landmarks[start_idx].x * width), 
                                       int(landmarks[start_idx].y * height))
                        end_point = (int(landmarks[end_idx].x * width), 
                                     int(landmarks[end_idx].y * height))
                        cv2.line(frame, start_point, end_point, (255, 0, 0), 2)
                
                # Draw score text with background for visibility
                score_text = f"Score: {int(score)}"
                (text_width, text_height), _ = cv2.getTextSize(
                    score_text, cv2.FONT_HERSHEY_SIMPLEX, 1.2, 3
                )
                cv2.rectangle(frame, (45, 55), (55 + text_width, 110), (0, 0, 0), -1)
                
                # Color based on score
                if score >= 80:
                    color = (0, 255, 0)  # Green
                elif score >= 50:
                    color = (0, 255, 255)  # Yellow
                else:
                    color = (0, 0, 255)  # Red
                
                cv2.putText(frame, score_text, (50, 100), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)
        
        out.write(frame)
        frame_index += 1
    
    cap.release()
    out.release()


# ================================
# Streamlit App
# ================================

def main():
    st.set_page_config(
        page_title="Yoga Pose Scorer",
        page_icon="",
        layout="wide"
    )
    
    st.title("Yoga Pose Scoring")
    st.markdown("Upload a video of your yoga practice to get real-time pose scoring!")
    
    # Sidebar for pose selection
    st.sidebar.header("Settings")
    selected_pose = st.sidebar.selectbox(
        "Select Target Pose",
        options=list(POSE_OPTIONS.keys()),
        index=0
    )
    
    # Display reference angles for selected pose
    # st.sidebar.markdown("---")
    # st.sidebar.subheader("Reference Angles")
    reference_angles = load_reference_pose(selected_pose)
    # for joint, angle in reference_angles.items():
    #     st.sidebar.text(f"{joint}: {angle:.1f}°")
    
    # Main content
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Upload Video")
        uploaded_file = st.file_uploader(
            "Choose a video file", 
            type=["mp4", "mov", "avi", "mkv"],
            help="Upload a video of you performing the selected yoga pose"
        )
    
    if uploaded_file is not None:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_file:
            tmp_file.write(uploaded_file.read())
            input_path = tmp_file.name
        
        with col1:
            st.video(uploaded_file, muted=True)
        
        # Process button
        if st.button("Analyze Pose", type="primary", use_container_width=True):
            with st.spinner("Processing video..."):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                try:
                    # Process video
                    landmarks, scores, fps = batch_process_video(
                        input_path, reference_angles, progress_bar, status_text
                    )
                    
                    # Generate output video
                    status_text.text("Generating output video...")
                    output_path = tempfile.mktemp(suffix='.mp4')
                    generate_output_video(input_path, output_path, landmarks, scores)
                    
                    progress_bar.progress(1.0)
                    status_text.text("Processing complete!")
                    
                    # Store results in session state
                    st.session_state['scores'] = scores
                    st.session_state['output_path'] = output_path
                    st.session_state['fps'] = fps
                    st.session_state['processed'] = True
                    
                except Exception as e:
                    st.error(f"Error processing video: {str(e)}")
                    st.session_state['processed'] = False
        
        # Display results
        if st.session_state.get('processed', False):
            scores = st.session_state['scores']
            output_path = st.session_state['output_path']
            fps = st.session_state['fps']
            
            st.markdown("---")
            
            # Statistics
            col_stat1, col_stat2, col_stat3, col_stat4 = st.columns(4)
            with col_stat1:
                st.metric("Average Score", f"{np.mean(scores):.1f}")
            with col_stat2:
                st.metric("Max Score", f"{np.max(scores):.1f}")
            with col_stat3:
                st.metric("Min Score", f"{np.min(scores):.1f}")
            with col_stat4:
                st.metric("Frames Analyzed", len(scores))
            
            # Output video and chart
            # col_out1, col_out2 = st.columns(2)
            
            # with col_out1:
            #     st.subheader("📹 Analyzed Video")
            #     with open(output_path, 'rb') as video_file:
            #         video_bytes = video_file.read()
            #     st.video(video_bytes, muted=True)
            #     
            #     # Download button
            #     st.download_button(
            #         label="Download Analyzed Video",
            #         data=video_bytes,
            #         file_name="yoga_scored.mp4",
            #         mime="video/mp4"
            #     )
            
            # with col_out2:
            st.subheader("Score Over Time")
            
            # Create time axis based on fps
            time_seconds = [i / fps for i in range(len(scores))]
            
            chart_data = {
                "Time (s)": time_seconds,
                "Score": scores
            }
            
            st.line_chart(
                chart_data,
                x="Time (s)",
                y="Score",
                use_container_width=True
            )
            
            # Additional insights
            # st.markdown("### Insights")
            # avg_score = np.mean(scores)
            # 
            # if avg_score >= 80:
            #     st.success("Excellent! Your pose alignment is great!")
            # elif avg_score >= 60:
            #     st.info("Good effort! Focus on refining your angles.")
            # elif avg_score >= 40:
            #     st.warning("Keep practicing! Watch your hip and knee alignment.")
            # else:
            #     st.error("Need more work. Consider watching tutorial videos.")
        
        # Cleanup
        try:
            os.unlink(input_path)
        except:
            pass


if __name__ == "__main__":
    main()
