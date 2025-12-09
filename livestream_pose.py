import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Create a PoseLandmarker object.
base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=True)
detector = vision.PoseLandmarker.create_from_options(options)

# Initialize the video capture from the default camera.
cap = cv2.VideoCapture(1)

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
