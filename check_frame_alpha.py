
from PIL import Image
import numpy as np

try:
    img = Image.open('public/textures/contact_sheet_frame.png')
    print(f"Format: {img.format}, Mode: {img.mode}")
    
    if 'A' in img.mode:
        # Check alpha channel statistics
        alpha = np.array(img.split()[-1])
        print(f"Alpha Mean: {np.mean(alpha)}")
        print(f"Alpha Max: {np.max(alpha)}")
        print(f"Alpha Min: {np.min(alpha)}")
        
        # Check if center is transparent (approx center of first cell)
        # Grid is 3x4. 
        w, h = img.size
        # cell roughly at w/6, h/8
        cx, cy = int(w/6), int(h/8)
        center_alpha = alpha[cy, cx]
        print(f"Alpha at likely photo position ({cx}, {cy}): {center_alpha}")
        
    else:
        print("No Alpha Channel detected!")

except Exception as e:
    print(f"Error: {e}")
