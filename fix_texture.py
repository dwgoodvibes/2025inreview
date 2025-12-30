
from PIL import Image
import numpy as np

try:
    path = 'public/textures/contact_sheet_frame.png'
    img = Image.open(path).convert('RGBA')
    data = np.array(img)
    
    # Calculate Luminance (standard weights)
    # R=0, G=1, B=2
    r, g, b, a = data.T
    luminance = (0.299 * r + 0.587 * g + 0.114 * b).T
    
    # Define Threshold
    # Holes are ~250. Frame is < 50. Text/Margin ~200?
    # Let's set a safe high threshold for holes.
    threshold = 230
    
    # Create Mask: True where Bright (Holes)
    mask = luminance > threshold
    
    # Set Alpha to 0 where mask is True
    data[..., 3][mask] = 0
    
    # Optional: Enhance Blacks
    # Where mask is False (Frame/Text), map pure blacks to pure blacks
    # If lum < 50, enforce (0,0,0)
    black_mask = (luminance < 50)
    data[..., 0][black_mask] = 0
    data[..., 1][black_mask] = 0
    data[..., 2][black_mask] = 0
    
    # Save back
    new_img = Image.fromarray(data)
    new_img.save(path, 'PNG')
    print(f"Successfully processed {path} with alpha transparency.")
    
except Exception as e:
    print(f"Error processing texture: {e}")
