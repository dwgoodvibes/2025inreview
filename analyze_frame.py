
from PIL import Image
import numpy as np

img = Image.open('public/textures/contact_sheet_frame.png')
img = img.convert('RGB')
data = np.array(img)
w, h = img.size

print(f"Size: {w}x{h}")

# Define a grid of sample points
# Holes: Row 0 Col 0, Row 1 Col 1, etc.
# Gaps: Between Cols, Between Rows.

# Grid Constants from code (approx)
# SHEET_WIDTH = 0.6, SHEET_HEIGHT = 0.8
# The image maps to this UV.
# Cols=3, Rows=4.

hole_samples = [
    (int(w/6), int(h/8)),   # 0,0
    (int(w/2), int(h/8)),   # 1,0
    (int(5*w/6), int(h/8)), # 2,0
    (int(w/6), int(3*h/8)), # 0,1
]

gap_samples = [
    (int(w/3), int(h/8)),   # Vert gap col 0-1
    (int(2*w/3), int(h/8)), # Vert gap col 1-2
    (int(w/6), int(h/4)),   # Horz gap row 0-1
    (int(w/2), int(h/2)),   # Center of image
]

print("--- HOLES ---")
for x, y in hole_samples:
    print(f"Hole ({x}, {y}): {data[y, x]}")

print("--- GAPS ---")
for x, y in gap_samples:
    print(f"Gap ({x}, {y}): {data[y, x]}")

# Top left margin (Text area?)
print(f"Margin (20, h/2): {data[int(h/2), 20]}")
