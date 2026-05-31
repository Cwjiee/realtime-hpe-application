import cv2
import mediapipe as mp
import numpy as np
import os
import glob
import json
from mediapipe.tasks.python import vision
from mediapipe.tasks import python

# --- CONFIGURATION ---
# Folder structure: 
#   dataset/
#       warrior2/
#       tree/
#       plank/
IMAGES_ROOT_DIR = "archive"
OUTPUT_JSON_FILE = "reference/ground_truth_warrior2.json"

TRIANGLE_POSE_NUMBER = [10, 15, 17, 19, 20, 21, 22, 3, 4, 5]
WARRIOR1_POSE_NUMBER = [14, 17, 19, 24, 27, 28, 36, 38, 40, 41]
WARRIOR2_POSE_NUMBER = [1, 11, 12, 14, 17, 2, 21, 23, 27, 3]
WARRIOR2_POSE_NUMBER = [1, 11, 12, 14, 17, 2, 21, 23, 27, 3]

base_options = mp.tasks.BaseOptions(
    model_asset_path='pose_landmarker.task'
)
options = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,
    output_segmentation_masks=True)
pose = mp.tasks.vision.PoseLandmarker.create_from_options(options)

def calculate_angle(a, b, c):
    """Calculates angle ABC (B is the vertex). Returns degrees."""
    a = np.array(a) # End
    b = np.array(b) # Vertex
    c = np.array(c) # End
    
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians*180.0/np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
        
    return angle

def get_specific_files(folder_path, file_numbers):
    valid_paths = []
    
    for i in file_numbers:
        filename = f"File{i}.png" 
        full_path = os.path.join(folder_path, filename)
        
        if os.path.exists(full_path):
            valid_paths.append(full_path)
        else:
            print(f"Warning: Could not find {filename}")
            
    return valid_paths

def process_pose_folder(folder_path):
    """Scans all images in a folder and returns the average angles."""

    image_paths = get_specific_files(folder_path, WARRIOR2_POSE_NUMBER)

    # image_paths = glob.glob(os.path.join(folder_path, "*.jpg")) + \
    #               glob.glob(os.path.join(folder_path, "*.png")) + \
    #               glob.glob(os.path.join(folder_path, "*.jpeg"))
    
    if not image_paths:
        return None

    joint_data = {
        "left_elbow": [], "right_elbow": [],
        "left_shoulder": [], "right_shoulder": [],
        "left_knee": [], "right_knee": [],
        "left_hip": [], "right_hip": []
    }

    print(f"   -> Found {len(image_paths)} images. Processing...", end="")

    for img_path in image_paths:
        # if pose_name not in TARGET_POSES:
        #     print(f"Skipping folder: '{pose_name}' (not in target list)")
        #     continue

        image = cv2.imread(img_path)
        if image is None: continue
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=image_rgb
        )
        results = pose.detect(mp_image)

        if results.pose_landmarks:
            lm = results.pose_landmarks[0]
            def get_xy(idx): return [lm[idx].x, lm[idx].y]

            # --- MP INDICES ---
            # 11,12=Shoulders | 13,14=Elbows | 15,16=Wrists
            # 23,24=Hips | 25,26=Knees | 27,28=Ankles

            # 1. ELBOWS (Shoulder - Elbow - Wrist)
            joint_data["left_elbow"].append(calculate_angle(get_xy(11), get_xy(13), get_xy(15)))
            joint_data["right_elbow"].append(calculate_angle(get_xy(12), get_xy(14), get_xy(16)))

            # 2. SHOULDERS (Elbow - Shoulder - Hip) -> Measures arm lift
            joint_data["left_shoulder"].append(calculate_angle(get_xy(13), get_xy(11), get_xy(23)))
            joint_data["right_shoulder"].append(calculate_angle(get_xy(14), get_xy(12), get_xy(24)))

            # 3. HIPS (Shoulder - Hip - Knee) -> Measures torso/leg bend
            joint_data["left_hip"].append(calculate_angle(get_xy(11), get_xy(23), get_xy(25)))
            joint_data["right_hip"].append(calculate_angle(get_xy(12), get_xy(24), get_xy(26)))

            # 4. KNEES (Hip - Knee - Ankle)
            joint_data["left_knee"].append(calculate_angle(get_xy(23), get_xy(25), get_xy(27)))
            joint_data["right_knee"].append(calculate_angle(get_xy(24), get_xy(26), get_xy(28)))

    print(" Done.")
    
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

    TARGET_POSES = [
        # "Vrksasana",
        # "Phalakasana",
        # "Trikonasana",
        # "Virabhadrasana One",
        # "Virabhadrasana Two",
        # "Tadasana"
    ]

    full_database = {}

    subfolders = [f.path for f in os.scandir(IMAGES_ROOT_DIR) if f.is_dir()]
    
    print(f"Scanning for target poses: {TARGET_POSES}...")

    for folder in subfolders:
        pose_name = os.path.basename(folder)
        
        if pose_name not in TARGET_POSES:
            print(f"Skipping folder: '{pose_name}' (not in target list)")
            continue
            
        print(f"Processing: {pose_name}")
        avg_data = process_pose_folder(folder)
        
        if avg_data:
            full_database[pose_name] = avg_data

    # Save to JSON
    if full_database:
        with open(OUTPUT_JSON_FILE, "w") as f:
            json.dump(full_database, f, indent=4)
        print(f"\nSUCCESS! Saved data for {len(full_database)} poses to: {OUTPUT_JSON_FILE}")
    else:
        print("\nWarning: No matching folders found. Check your folder names!")

if __name__ == "__main__":
    main()
