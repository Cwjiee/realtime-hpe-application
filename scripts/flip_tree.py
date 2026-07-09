import os
from PIL import Image

def flip_image_horizontally(image_path):
    print(f"Checking {image_path}...")
    if not os.path.exists(image_path):
        print(f"Warning: File {image_path} does not exist.")
        return

    # Open image
    img = Image.open(image_path)
    
    # Flip horizontally
    flipped_img = img.transpose(Image.FLIP_LEFT_RIGHT)
    
    # Save back
    flipped_img.save(image_path)
    print(f"Successfully flipped {image_path} horizontally.")

if __name__ == '__main__':
    workspace_root = os.path.abspath(os.path.dirname(__file__))
    
    # Source asset path
    src_tree_path = os.path.join(workspace_root, 'pose-estimation-app', 'src', 'assets', 'tree.jpg')
    # Public asset path
    public_tree_path = os.path.join(workspace_root, 'pose-estimation-app', 'public', 'yoga_outline', 'tree.jpg')
    
    flip_image_horizontally(src_tree_path)
    flip_image_horizontally(public_tree_path)
