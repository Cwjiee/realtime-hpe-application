import mediapipe as mp
import json
import os

# Create a PoseLandmarker object.
base_options = mp.tasks.BaseOptions(
    model_asset_path='pose_landmarker.task'
)
options = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=True)
pose_landmarker = mp.tasks.vision.PoseLandmarker.create_from_options(options)

# Load the image.
IMAGE_PATH = 'images'
images = os.listdir(IMAGE_PATH)
for image in images:
    mp_image = mp.Image.create_from_file(f'{IMAGE_PATH}/{image}')

    # Run pose landmarker.
    pose_landmarker_result = pose_landmarker.detect(mp_image)

    # print(vars(pose_landmarker_result))
    # Process result.
    if pose_landmarker_result.pose_landmarks:

        # Print the pose landmarks.
        # for idx, landmarks in enumerate(pose_landmarker_result.pose_landmarks):
        #     for landmark in landmarks:
        #         print(f'#{idx} {landmark.x}, {landmark.y}, {landmark.z}, {landmark.visibility}')

        # ... assuming 'detection_result' is your result object ...

        if pose_landmarker_result.pose_landmarks:
            # 1. Get the first person detected (Index 0)
            raw_landmarks = pose_landmarker_result.pose_landmarks[0]

        # 2. Convert to a clean JSON-serializable list
        # We loop through and manually pick x, y, z, and visibility
        json_ready_landmarks = []
        
        for landmark in raw_landmarks:
            json_ready_landmarks.append({
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility
            })

        # 3. Save to file
        pose_name = image.split('.')[0]
        with open(f"yoga_landmarks/{pose_name}.json", "w") as f:
            json.dump(json_ready_landmarks, f, indent=4)
        print("Bestie, your perfect pose is saved! 🧘‍♀️")
