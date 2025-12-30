
from PIL import Image
import numpy as np

img = Image.open('public/textures/contact_sheet_frame.png')
img = img.convert('RGB')
data = np.array(img)
w, h = img.size

# Sample a known "hole" area
# Grid 3x4. Center of first cell:
cx, cy = int(w/6), int(h/8)
pixel = data[cy, cx]
print(f"Pixel at hole center ({cx}, {cy}): {pixel}")

# Sample a known "frame" area (e.g. very top left)
fx, fy = 10, 10
pixel_f = data[fy, fx]
print(f"Pixel at frame ({fx}, {fy}): {pixel_f}")
