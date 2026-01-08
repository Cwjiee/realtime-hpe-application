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
# image = cv2.imread(image_path)
# image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

# # Create the options that will be used for ImageSegmenter
BaseOptions = mp.tasks.BaseOptions
ImageSegmenter = mp.tasks.vision.ImageSegmenter
ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# Create a image segmenter instance with the image mode:
options = ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.IMAGE,
    output_category_mask=True)
with ImageSegmenter.create_from_options(options) as segmenter:
    # Load the input image from an image file.
    mp_image = mp.Image.create_from_file('images/warrior_1.png')

    # Perform image segmentation on the provided single image.
    # The image segmenter must be created with the image mode.
    segmentation_result = segmenter.segment(mp_image)
    category_mask = segmentation_result.category_mask

    # Process mask to find outlines
    mask = category_mask.numpy_view()
    if mask.ndim == 3:
        mask = mask.squeeze(-1)
    
    # Create binary mask (0 or 255) for contour detection
    # Value 0 appears to be the person, 255 is background.
    binary_mask = (mask == 0).astype(np.uint8) * 255
    
    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Create transparent output image (RGBA) - 4 channels
    h, w = mask.shape
    output_image = np.zeros((h, w, 4), dtype=np.uint8)
    
    # Draw contours in Cyan (0, 255, 255) with full alpha (255)
    outline_color = (0, 255, 255, 255) 
    cv2.drawContours(output_image, contours, -1, outline_color, thickness=2)

    # print(f'Segmentation mask of {name}:')
    # cv2.imshow(output_image)

    # Plot the result
    plt.figure(figsize=(12, 8))
    plt.imshow(output_image)
    plt.title("Human Body Outline - Warrior 1 Pose")
    plt.axis('off')
    plt.tight_layout()
    plt.show()

    # resize_and_show(output_image)