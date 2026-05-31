import cv2
import mediapipe as mp
import numpy as np
import matplotlib.pyplot as plt

# Initialize MediaPipe Pose with segmentation enabled
mp_pose = mp.solutions.pose

# Load the image
image_path = "images/warrior_1.png"
image = cv2.imread(image_path)
image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

# Perform pose estimation with segmentation enabled
with mp_pose.Pose(static_image_mode=True, enable_segmentation=True) as pose:
    results = pose.process(image_rgb)
    
    # Get the segmentation mask (values between 0 and 1)
    mask = results.segmentation_mask
    
    # Create a binary mask (threshold at 0.5)
    binary_mask = (mask > 0.5).astype(np.uint8) * 255
    
    # Apply morphological operations to clean up the mask
    kernel = np.ones((5, 5), np.uint8)
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
    binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
    
    # Find contours (outline) of the body
    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Create a copy of the original image to draw the outline
    output_image = image_rgb.copy()
    
    # Draw the outline with a bright color (cyan/turquoise)
    outline_color = (0, 255, 255)  # Cyan in RGB
    cv2.drawContours(output_image, contours, -1, outline_color, thickness=3)

# Draw the pose landmarks on the image
# mp_pose.Pose.draw_landmarks(output_image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

# Plot the result
plt.figure(figsize=(12, 8))
plt.imshow(output_image)
plt.title("Human Body Outline - Warrior 1 Pose")
plt.axis('off')
plt.tight_layout()
plt.show()

# output the image to a file
output_image = cv2.cvtColor(output_image, cv2.COLOR_RGB2BGR)
cv2.imwrite("images/outlines/warrior_1_outline.png", output_image)