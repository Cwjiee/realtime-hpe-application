import os
from PIL import Image

def make_background_black(image_path):
    print(f"Processing {image_path}...")
    if not os.path.exists(image_path):
        print(f"Error: File {image_path} does not exist.")
        return

    # Open image
    img = Image.open(image_path)
    
    # If the image is not in RGBA mode, convert it
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Create a solid black background
    black_bg = Image.new('RGBA', img.size, (0, 0, 0, 255))
    
    # Composite the image on top of the black background
    # Since alpha_composite requires both images to be RGBA and have the same size:
    combined = Image.alpha_composite(black_bg, img)
    
    # Save the result, converting back to RGB (or keeping RGBA with full opacity)
    combined.convert('RGB').save(image_path)
    print(f"Successfully changed background of {image_path} to black.")

if __name__ == '__main__':
    workspace_root = os.path.abspath(os.path.dirname(__file__))
    warrior1_path = os.path.join(workspace_root, 'pose-estimation-app', 'public', 'yoga_outline', 'warrior1.png')
    warrior2_path = os.path.join(workspace_root, 'pose-estimation-app', 'public', 'yoga_outline', 'warrior2.png')
    
    make_background_black(warrior1_path)
    make_background_black(warrior2_path)
