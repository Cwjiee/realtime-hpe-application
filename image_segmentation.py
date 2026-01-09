import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import matplotlib.pyplot as plt
import numpy as np

BG_COLOR = (192, 192, 192) # gray
MASK_COLOR = (255, 255, 255) # white

model_path = './selfie_segmenter_landscape.tflite'

# Load the image
# image_path = "images/warrior_1.png"

def segment_image(model_pth, img_path):
    print(f"Loading model from {model_pth}")
    BaseOptions = mp.tasks.BaseOptions
    ImageSegmenter = mp.tasks.vision.ImageSegmenter
    ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Create a image segmenter instance with the image mode:
    options = ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=model_pth),
        running_mode=VisionRunningMode.IMAGE,
        output_category_mask=True)
    
    mask_copy = None
    with ImageSegmenter.create_from_options(options) as segmenter:
        # Load the input image using OpenCV to avoid MP file loader issues
        img = cv2.imread(img_path)
        if img is None:
            print(f"Error: Could not read image from {img_path}")
            return None
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Create MP Image from numpy array
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

        # Perform image segmentation on the provided single image.
        segmentation_result = segmenter.segment(mp_image)
        category_mask = segmentation_result.category_mask
        
        # Copy the mask data out to a regular numpy array
        # .numpy_view() gives a view, .copy() owns the data
        mask_copy = category_mask.numpy_view().copy()
        
    return mask_copy

if __name__ == "__main__":
    image_file = 'images/warrior1.png'
    
    try:
        mask = segment_image(model_path, image_file)
        
        if mask is not None:
             # Process mask to find outlines
            if mask.ndim == 3:
                mask = mask.squeeze(-1)
            
            # Create binary mask (0 or 255) for contour detection
            binary_mask = (mask == 0).astype(np.uint8) * 255
            
            # Find contours
            contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Create transparent output image (RGBA - 4 channels, all zeros = fully transparent)
            h, w = mask.shape
            output_image = np.zeros((h, w, 4), dtype=np.uint8)
            
            # Draw only the outline in cyan with full opacity
            cv2.drawContours(output_image, contours, -1, (0, 255, 255, 255), thickness=2)

            # Save as PNG (preserves transparency)
            cv2.imwrite('pose_outline.png', cv2.cvtColor(output_image, cv2.COLOR_RGBA2BGRA))
            print("Saved pose_outline.png with transparent background")

            # Display the result
            plt.figure(figsize=(10, 8), facecolor='black')
            plt.gca().set_facecolor('black')
            plt.imshow(output_image)
            plt.title("Pose Outline (Transparent Background)", color='white')
            plt.axis('off')
            plt.tight_layout()
            plt.show()
        else:
            print("Error: Segmentation returned no mask.")
            
    except Exception as e:
        print(f"An error occurred: {e}")

