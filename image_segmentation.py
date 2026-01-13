import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import matplotlib.pyplot as plt
import numpy as np
import os

model_path = './pose_landmarker_heavy.task' 

# def get_pose_outline(model_pth, img_path):
#     print(f"Loading Pose Landmarker from {model_pth}")
    
#     BaseOptions = mp.tasks.BaseOptions
#     PoseLandmarker = mp.tasks.vision.PoseLandmarker
#     PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
#     VisionRunningMode = mp.tasks.vision.RunningMode

#     options = PoseLandmarkerOptions(
#         base_options=BaseOptions(model_asset_path=model_pth),
#         running_mode=VisionRunningMode.IMAGE,
#         output_segmentation_masks=True)
    
#     output_image = None
    
#     with PoseLandmarker.create_from_options(options) as landmarker:
#         img = cv2.imread(img_path)
#         if img is None:
#             print(f"Error: Could not read image from {img_path}")
#             return None
            
#         img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
#         mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

#         detection_result = landmarker.detect(mp_image)
        
#         if detection_result.segmentation_masks is None or len(detection_result.segmentation_masks) == 0:
#             print("No pose/segmentation detected.")
#             return None

#         # Get the first mask (assuming single person yoga)
#         segmentation_mask = detection_result.segmentation_masks[0].numpy_view()
        
#         # The mask comes in as float [0, 1]. We threshold it.
#         # Values > 0.5 are likely body.
#         binary_mask = (segmentation_mask > 0.5).astype(np.uint8) * 255

#         # --- ENHANCEMENT: SMOOTHING ---
#         # Yoga poses often have gaps. This fills small holes and smooths edges.
#         kernel = np.ones((5, 5), np.uint8)
#         # Dilate to fill gaps, then Erode to restore size (Closing)
#         binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
#         # Optional: Gaussian blur for softer edges before contouring
#         binary_mask = cv2.GaussianBlur(binary_mask, (5, 5), 0)
#         # ------------------------------

#         # Find contours
#         contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
#         # Prepare output
#         h, w = binary_mask.shape
#         output_image = np.zeros((h, w, 4), dtype=np.uint8)
        
#         # Draw outline (Cyan)
#         cv2.drawContours(output_image, contours, -1, (0, 255, 255, 255), thickness=2)

#     return output_image

def get_pose_outline(model_pth, img_path):
    print(f"Loading Pose Landmarker from {model_pth}")
    
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_pth),
        running_mode=VisionRunningMode.IMAGE,
        output_segmentation_masks=True)
    
    output_image = None
    
    with PoseLandmarker.create_from_options(options) as landmarker:
        # Load image normally
        # use IMREAD_UNCHANGED to detect if there's a hidden alpha channel
        img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
        
        if img is None:
            print(f"Error: Could not read image from {img_path}")
            return None

        # --- SAFETY CHECK: Force 3-Channel RGB ---
        if img.shape[2] == 4:
            # If image has 4 channels (BGRA), convert to RGB strictly
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)
        elif img.shape[2] == 3:
            # If image has 3 channels (BGR), convert to RGB
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        else:
            # Fallback for grayscale (1 channel)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
        # ----------------------------------------
            
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

        # Detect pose
        try:
            detection_result = landmarker.detect(mp_image)
        except RuntimeError as e:
            print(f"MediaPipe Runtime Error: {e}")
            return None
        
        # ... (rest of the code remains the same)
        if detection_result.segmentation_masks is None or len(detection_result.segmentation_masks) == 0:
            print("No pose/segmentation detected.")
            return None

        segmentation_mask = detection_result.segmentation_masks[0].numpy_view()
        binary_mask = (segmentation_mask > 0.5).astype(np.uint8) * 255

        kernel = np.ones((5, 5), np.uint8)
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
        binary_mask = cv2.GaussianBlur(binary_mask, (5, 5), 0)

        contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        h, w = binary_mask.shape
        output_image = np.zeros((h, w, 4), dtype=np.uint8)
        
        cv2.drawContours(output_image, contours, -1, (0, 255, 255, 255), thickness=2)

    return output_image

if __name__ == "__main__":
    # image_dir = os.listdir('images')
    # for image_file in image_dir:
    #     try:
    #         print(f"Processing {image_file}")
    #         outline_img = get_pose_outline(model_path, 'images/' + image_file)
    #         if outline_img is not None:
    #             cv2.imwrite('yoga_outline/' + image_file, cv2.cvtColor(outline_img, cv2.COLOR_RGBA2BGRA))
    #             print("Saved yoga_outline/" + image_file)

    #             # plt.figure(figsize=(10, 8), facecolor='black')
    #             # plt.gca().set_facecolor('black')
    #             # plt.imshow(outline_img)
    #             # plt.title("Pose Outline (Pose Model)", color='white')
    #             # plt.axis('off')
    #             # plt.tight_layout()
    #             # plt.show()
    #     except Exception as e:
    #         print(f"An error occurred: {e}")
    image_file = 'images/plank_2.jpg'
    outline_img = get_pose_outline(model_path, image_file)
    if outline_img is not None:
        image_name = image_file.split('/')[1]
        cv2.imwrite('yoga_outline/' + image_name, cv2.cvtColor(outline_img, cv2.COLOR_RGBA2BGRA))
        print("Saved yoga_outline/" + image_name)