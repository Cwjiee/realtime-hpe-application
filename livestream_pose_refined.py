import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import math # Added for standard math functions if needed, though numpy covers most

CAMERA = 1 # [0 (external webcam), 1 (default webcam)]

def calculate_angle(a,b,c):
    a = np.array(a) # First
    b = np.array(b) # Mid
    c = np.array(c) # End

    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)

    if angle > 180.0:
        angle = 360-angle

    return angle

def calculate_slope(point1, point2):
    """Calculates the angle of a line relative to the horizontal axis."""
    # Returns absolute angle from horizontal
    slope = np.degrees(np.arctan2(point2[1] - point1[1], point2[0] - point1[0]))
    return abs(slope)

def classify_warrior2(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder, left_wrist, right_shoulder, right_wrist):
    """Classifies Warrior 2 pose with Refined Logic (Slope Check)."""
    
    # 1. Elbows Straight
    arms_straight_joint = (left_arm_angle > 150 and right_arm_angle > 150)

    # 2. Arms Parallel to Floor (Slope Check)
    # Ideally should be roughly 0 degrees or 180 degrees depending on direction
    # We allow a +/- 20 degree deviation from horizontal
    l_slope = calculate_slope(left_shoulder, left_wrist)
    r_slope = calculate_slope(right_shoulder, right_wrist)

    arms_horizontal = (l_slope < 20 or abs(l_slope - 180) < 20) and \
                      (r_slope < 20 or abs(r_slope - 180) < 20)

    # 3. Legs Logic (One bent ~90, one straight)
    warrior_2_left_bent = (left_leg_angle > 80 and left_leg_angle < 110 and
                           right_leg_angle > 160)

    warrior_2_right_bent = (right_leg_angle > 80 and right_leg_angle < 110 and
                            left_leg_angle > 160)

    if arms_straight_joint and arms_horizontal and (warrior_2_left_bent or warrior_2_right_bent):
        return True
    return False

def classify_warrior1(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Warrior 1 pose."""
    # Arms are straight and raised.
    arms_straight = left_arm_angle > 150 and right_arm_angle > 150
    arms_up = left_shoulder_angle > 140 and right_shoulder_angle > 140

    # One leg bent, one leg straight
    warrior_1_left_bent = (arms_straight and arms_up and
                           left_leg_angle > 80 and left_leg_angle < 120 and
                           right_leg_angle > 160)

    warrior_1_right_bent = (arms_straight and arms_up and
                            right_leg_angle > 80 and right_leg_angle < 120 and
                            left_leg_angle > 160)

    if warrior_1_left_bent or warrior_1_right_bent:
        return True
    return False


def classify_tree_pose(left_leg_angle, right_leg_angle, left_ankle, right_ankle, left_knee, right_knee):
    """Classifies Tree pose (Vrksasana) with Refined Logic (Ankle Placement)."""
    
    # Check 1: General Leg Shapes
    left_standing = (left_leg_angle > 165 and right_leg_angle < 110)
    right_standing = (right_leg_angle > 165 and left_leg_angle < 110)

    is_tree_pose = False

    # Check 2: Foot Placement (Ankle close to Knee)
    # Note: normalized coordinates (0.0 to 1.0)
    # Threshold: 0.15 is roughly 15% of screen width tolerance
    
    if left_standing:
        # Check if right ankle is close to left knee (in X-axis)
        horizontal_dist = abs(right_ankle[0] - left_knee[0])
        # Check if right ankle is vertically higher than the left ankle (y is inverted, smaller is higher)
        vertical_check = right_ankle[1] < left_ankle[1] 
        
        if horizontal_dist < 0.15 and vertical_check:
            is_tree_pose = True

    elif right_standing:
        horizontal_dist = abs(left_ankle[0] - right_knee[0])
        vertical_check = left_ankle[1] < right_ankle[1]
        
        if horizontal_dist < 0.15 and vertical_check:
            is_tree_pose = True

    return is_tree_pose

def classify_triangle_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Triangle pose (Trikonasana)."""
    # Legs should be straight
    legs_straight = left_leg_angle > 160 and right_leg_angle > 160
    
    # Arms should be straight
    arms_straight = left_arm_angle > 150 and right_arm_angle > 150
    
    # Arms raised (approx 90 degrees relative to body, or effectively out)
    # Using shoulder angle (hip-shoulder-wrist)
    arms_out = left_shoulder_angle > 60 and right_shoulder_angle > 60
    
    # Torso bent to one side. 
    # Normal standing is ~180. Triangle involves bending at hip.
    # We check if one side angle is significantly less than 165 indicating a bend.
    torso_bent = left_body_angle < 165 or right_body_angle < 165

    if legs_straight and arms_straight and arms_out and torso_bent:
        return True
    return False

def classify_mountain_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
    """Classifies Mountain pose (Tadasana)."""
    # Legs straight
    legs_straight = left_leg_angle > 170 and right_leg_angle > 170
    
    # Arms straight
    arms_straight = left_arm_angle > 160 and right_arm_angle > 160
    
    # Arms down at sides (angle between hip-shoulder-wrist should be small)
    arms_down = left_shoulder_angle < 30 and right_shoulder_angle < 30

    if legs_straight and arms_straight and arms_down:
        return True
    return False

def classify_plank_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle):
    """Classifies Plank pose (Phalakasana) with Refined Logic (Straight Line Check)."""
    
    # 1. Arms must be straight (supporting weight)
    arms_straight = left_arm_angle > 160 and right_arm_angle > 160

    # 2. Body must be straight (Shoulder-Hip-Knee angle should be ~180)
    # A sagging hip might result in < 160. A piqued hip (downward dog) might be < 140.
    body_straight = left_body_angle > 165 and right_body_angle > 165
    
    # 3. Legs Straight (Hip-Knee-Ankle)
    legs_straight = left_leg_angle > 160 and right_leg_angle > 160
    
    if arms_straight and body_straight and legs_straight:
        return True
    return False


# Create a PoseLandmarker object.
base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=True)
detector = vision.PoseLandmarker.create_from_options(options)

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
            shoulder_l = [landmarks[mp.solutions.pose.PoseLandmark.LEFT_SHOULDER.value].x,landmarks[mp.solutions.pose.PoseLandmark.LEFT_SHOULDER.value].y]
            elbow_l = [landmarks[mp.solutions.pose.PoseLandmark.LEFT_ELBOW.value].x,landmarks[mp.solutions.pose.PoseLandmark.LEFT_ELBOW.value].y]
            wrist_l = [landmarks[mp.solutions.pose.PoseLandmark.LEFT_WRIST.value].x,landmarks[mp.solutions.pose.PoseLandmark.LEFT_WRIST.value].y]

            shoulder_r = [landmarks[mp.solutions.pose.PoseLandmark.RIGHT_SHOULDER.value].x,landmarks[mp.solutions.pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            elbow_r = [landmarks[mp.solutions.pose.PoseLandmark.RIGHT_ELBOW.value].x,landmarks[mp.solutions.pose.PoseLandmark.RIGHT_ELBOW.value].y]
            wrist_r = [landmarks[mp.solutions.pose.PoseLandmark.RIGHT_WRIST.value].x,landmarks[mp.solutions.pose.PoseLandmark.RIGHT_WRIST.value].y]

            hip_l = [landmarks[mp.solutions.pose.PoseLandmark.LEFT_HIP.value].x,landmarks[mp.solutions.pose.PoseLandmark.LEFT_HIP.value].y]
            knee_l = [landmarks[mp.solutions.pose.PoseLandmark.LEFT_KNEE.value].x,landmarks[mp.solutions.pose.PoseLandmark.LEFT_KNEE.value].y]
            ankle_l = [landmarks[mp.solutions.pose.PoseLandmark.LEFT_ANKLE.value].x,landmarks[mp.solutions.pose.PoseLandmark.LEFT_ANKLE.value].y]

            hip_r = [landmarks[mp.solutions.pose.PoseLandmark.RIGHT_HIP.value].x,landmarks[mp.solutions.pose.PoseLandmark.RIGHT_HIP.value].y]
            knee_r = [landmarks[mp.solutions.pose.PoseLandmark.RIGHT_KNEE.value].x,landmarks[mp.solutions.pose.PoseLandmark.RIGHT_KNEE.value].y]
            ankle_r = [landmarks[mp.solutions.pose.PoseLandmark.RIGHT_ANKLE.value].x,landmarks[mp.solutions.pose.PoseLandmark.RIGHT_ANKLE.value].y]

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
            if classify_warrior2(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, shoulder_l, wrist_l, shoulder_r, wrist_r):
                pose = "Warrior 2"
            elif classify_warrior1(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
                pose = "Warrior 1"
            elif classify_tree_pose(left_leg_angle, right_leg_angle, ankle_l, ankle_r, knee_l, knee_r):
                pose = "Tree Pose"
            elif classify_triangle_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle, left_shoulder_angle, right_shoulder_angle):
                pose = "Triangle Pose"
            elif classify_mountain_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_shoulder_angle, right_shoulder_angle):
                pose = "Mountain Pose"
            elif classify_plank_pose(left_arm_angle, right_arm_angle, left_leg_angle, right_leg_angle, left_body_angle, right_body_angle):
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
            connections = mp.solutions.pose.POSE_CONNECTIONS
            for connection in connections:
                start_idx = connection[0]
                end_idx = connection[1]
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
