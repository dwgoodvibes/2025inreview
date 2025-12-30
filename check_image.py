
from PIL import Image
import numpy as np
import os

try:
    img = Image.open('public/sheets/summer_sheet.webp')
    print(f"Image format: {img.format}")
    print(f"Image size: {img.size}")
    print(f"Image mode: {img.mode}")
    
    # Check stats
    data = np.array(img)
    print(f"Mean pixel value: {np.mean(data)}")
    print(f"Max pixel value: {np.max(data)}")
    print(f"Min pixel value: {np.min(data)}")
    
    if np.mean(data) < 5:
        print("WARNING: Image seems very dark/black.")
    else:
        print("Image content looks OK (not black).")
        
except Exception as e:
    print(f"Error reading image: {e}")
