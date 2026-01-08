import cv2
import mediapipe as mp

CAMERA = 1 # [0 (external webcam), 1 (default webcam)]

from pose_utils import (
    calculate_angle,
    classify_warrior2_refined,
    classify_warrior1_refined,
    classify_tree_pose_refined,
    classify_triangle_pose_refined,
    classify_mountain_pose_refined,
    classify_plank_pose_refined
)

# Create a PoseLandmarker object.
base_options = mp.tasks.BaseOptions(model_asset_path='pose_landmarker.task')
options = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=True)
detector = mp.tasks.vision.PoseLandmarker.create_from_options(options)

# Initialize the video capture from the default camera.
# NOTE: Ensure 'pose_landmarker.task' is in the same directory!
cap = cv2.VideoCapture(CAMERA)

while cap.isOpened():
    # Read a frame from the video.
    success, image = cap.read()
    if not success:
        print("Ignoring empty camera frame.")
        continue

    # Convert the BGR image to RGB.
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Process the image and get the pose landmarks.
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)
    detection_result = detector.detect(mp_image)

    # Draw the pose annotation on the image.
    annotated_image = image.copy()
    if detection_result.pose_landmarks:
        for landmark_list in detection_result.pose_landmarks:
            landmarks = landmark_list
            # Get coordinates
            shoulder_l = [landmarks[11].x,landmarks[11].y]
            elbow_l = [landmarks[13].x,landmarks[13].y]
            wrist_l = [landmarks[15].x,landmarks[15].y]

            shoulder_r = [landmarks[12].x,landmarks[12].y]
            elbow_r = [landmarks[14].x,landmarks[14].y]
            wrist_r = [landmarks[16].x,landmarks[16].y]

            hip_l = [landmarks[23].x,landmarks[23].y]
            knee_l = [landmarks[25].x,landmarks[25].y]
            ankle_l = [landmarks[27].x,landmarks[27].y]

            hip_r = [landmarks[24].x,landmarks[24].y]
            knee_r = [landmarks[26].x,landmarks[26].y]
            ankle_r = [landmarks[28].x,landmarks[28].y]

            # Calculate angles
            left_arm_angle = calculate_angle(shoulder_l, elbow_l, wrist_l)
            right_arm_angle = calculate_angle(shoulder_r, elbow_r, wrist_r)
            left_leg_angle = calculate_angle(hip_l, knee_l, ankle_l)
            right_leg_angle = calculate_angle(hip_r, knee_r, ankle_r)
            left_shoulder_angle = calculate_angle(hip_l, shoulder_l, wrist_l)
            right_shoulder_angle = calculate_angle(hip_r, shoulder_r, wrist_r)
            
            # These are crucial for Plank Logic (Shoulder-Hip-Knee)
            left_body_angle = calculate_angle(shoulder_l, hip_l, knee_l)
            right_body_angle = calculate_angle(shoulder_r, hip_r, knee_r)

            pose = "Unknown"
            
            # REFINED CALLS:
            if classify_warrior2_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, shoulder_l, wrist_l, shoulder_r, wrist_r):
                pose = "Warrior 2"
            elif classify_warrior1_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
                pose = "Warrior 1"
            elif classify_tree_pose_refined(left_leg_angle, right_leg_angle, ankle_l, ankle_r, knee_l, knee_r):
                pose = "Tree Pose"
            elif classify_triangle_pose_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle, left_shoulder_angle, right_shoulder_angle):
                pose = "Triangle Pose"
            elif classify_mountain_pose_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
                pose = "Mountain Pose"
            elif classify_plank_pose_refined(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle):
                pose = "Plank Pose"

            # Display the pose
            # Display the pose with outline for better visibility
            # Outline (black)
            cv2.putText(annotated_image, pose, (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 3, (0, 0, 0), 10, cv2.LINE_AA)
            # Text (white for high contrast)
            cv2.putText(annotated_image, pose, (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 3, (255, 0, 0), 3, cv2.LINE_AA)
            
            # Draw landmarks
            for idx, landmark in enumerate(landmark_list):
                x, y = int(landmark.x * image.shape[1]), int(landmark.y * image.shape[0])
                cv2.circle(annotated_image, (x, y), 5, (0, 255, 0), -1)

            # Draw connections
            connections = mp.tasks.vision.PoseLandmarksConnections.POSE_LANDMARKS
            for connection in connections:
                start_idx = connection.start
                end_idx = connection.end
                start_point = (int(landmark_list[start_idx].x * image.shape[1]),
                               int(landmark_list[start_idx].y * image.shape[0]))
                end_point = (int(landmark_list[end_idx].x * image.shape[1]),
                             int(landmark_list[end_idx].y * image.shape[0]))
                cv2.line(annotated_image, start_point, end_point, (255, 0, 0), 2)


    # Convert the RGB image back to BGR for display.
    annotated_image = cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR)

    # Display the annotated image.
    cv2.imshow('MediaPipe Pose Landmark', annotated_image)

    # Break the loop if 'q' is pressed.
    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

# Release the video capture and destroy all windows.
cap.release()
cv2.destroyAllWindows()
