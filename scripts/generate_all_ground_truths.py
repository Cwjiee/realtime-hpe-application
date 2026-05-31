import cv2
import mediapipe as mp
import numpy as np
import os
import glob
import json
from mediapipe.tasks.python import vision

IMAGES_ROOT_DIR = "archive"
OUTPUT_DIR = "reference"

POSE_MAPPINGS = {
    "Vrksasana": "ground_truth_tree.json",
    "Virabhadrasana One": "ground_truth_warrior1.json",
    "Virabhadrasana Two": "ground_truth_warrior2.json",
    "Trikonasana": "ground_truth_triangle.json"
}

# The manually curated lists from the original script
KNOWN_GOOD_FILES = {
    "Trikonasana": [10, 15, 17, 19, 20, 21, 22, 3, 4, 5],
    "Virabhadrasana One": [14, 17, 19, 24, 27, 28, 36, 38, 40, 41],
    "Virabhadrasana Two": [1, 11, 12, 14, 17, 2, 21, 23, 27, 3],
    # For Tree pose, we don't have the list, so we'll use all valid ones
    "Vrksasana": None
}

base_options = mp.tasks.BaseOptions(model_asset_path='pose_landmarker.task')
options = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,
    output_segmentation_masks=False)
pose = mp.tasks.vision.PoseLandmarker.create_from_options(options)

def calculate_angle(a, b, c):
    a = np.array(a); b = np.array(b); c = np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    if angle > 180.0: angle = 360 - angle
    return angle

def process_pose_folder(folder_path, pose_name):
    good_files = KNOWN_GOOD_FILES.get(pose_name)
    if good_files is not None:
        image_paths = [os.path.join(folder_path, f"File{i}.png") for i in good_files]
        image_paths = [p for p in image_paths if os.path.exists(p)]
    else:
        image_paths = glob.glob(os.path.join(folder_path, "*.jpg")) + \
                      glob.glob(os.path.join(folder_path, "*.png")) + \
                      glob.glob(os.path.join(folder_path, "*.jpeg"))

    if not image_paths:
        return None

    joint_data = {
        "left_elbow": [], "right_elbow": [],
        "left_shoulder": [], "right_shoulder": [],
        "left_knee": [], "right_knee": [],
        "left_hip": [], "right_hip": []
    }

    print(f"   -> Processing {len(image_paths)} images for {pose_name}...")

    for img_path in image_paths:
        image = cv2.imread(img_path)
        if image is None: continue
        
        height, width, _ = image.shape
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        results = pose.detect(mp_image)

        if results.pose_landmarks:
            lm = results.pose_landmarks[0]
            # UN-NORMALIZE COORDINATES (Multiply by width/height to fix aspect ratio distortion)
            def get_xy(idx): return [lm[idx].x * width, lm[idx].y * height]

            joint_data["left_elbow"].append(calculate_angle(get_xy(11), get_xy(13), get_xy(15)))
            joint_data["right_elbow"].append(calculate_angle(get_xy(12), get_xy(14), get_xy(16)))
            joint_data["left_shoulder"].append(calculate_angle(get_xy(13), get_xy(11), get_xy(23)))
            joint_data["right_shoulder"].append(calculate_angle(get_xy(14), get_xy(12), get_xy(24)))
            joint_data["left_hip"].append(calculate_angle(get_xy(11), get_xy(23), get_xy(25)))
            joint_data["right_hip"].append(calculate_angle(get_xy(12), get_xy(24), get_xy(26)))
            joint_data["left_knee"].append(calculate_angle(get_xy(23), get_xy(25), get_xy(27)))
            joint_data["right_knee"].append(calculate_angle(get_xy(24), get_xy(26), get_xy(28)))

    averaged_pose = {}
    for joint, values in joint_data.items():
        if values:
            averaged_pose[joint] = round(sum(values) / len(values), 1)
        else:
            averaged_pose[joint] = 0.0
            
    return averaged_pose

def main():
    if not os.path.exists(IMAGES_ROOT_DIR):
        print(f"Error: Directory '{IMAGES_ROOT_DIR}' not found.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for pose_name, out_file in POSE_MAPPINGS.items():
        folder = os.path.join(IMAGES_ROOT_DIR, pose_name)
        if not os.path.exists(folder):
            print(f"Skipping folder: '{pose_name}' (not found)")
            continue
            
        print(f"Processing: {pose_name}")
        avg_data = process_pose_folder(folder, pose_name)
        
        if avg_data:
            full_database = {pose_name: avg_data}
            out_path = os.path.join(OUTPUT_DIR, out_file)
            with open(out_path, "w") as f:
                json.dump(full_database, f, indent=4)
            print(f"Saved {pose_name} to {out_path}")

if __name__ == "__main__":
    main()
