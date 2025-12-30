
from PIL import Image
import numpy as np

img = Image.open('public/textures/contact_sheet_frame.png').convert('L') # Grayscale
data = np.array(img)
h, w = data.shape

print(f"Image Shape: {w}x{h}")

threshold = 230
binary = data > threshold

# Find rows and cols that have "holes"
# Sum along axes
row_sum = np.sum(binary, axis=1) # Shape (h,)
col_sum = np.sum(binary, axis=0) # Shape (w,)

# Find indices where sum > 0 (meaning there is a hole in this row/col)
# But this aggregates everything. We want to identify the specific start/end of each cell.

# Let's scan a specific row (e.g. through the middle of the first row of cells) 
# and specific col to find boundaries.
# Based on previous analysis, y=128 intersects the first row of cells.
# x=170 intersects first col.

def find_segments(line_data):
    # Returns list of (start, end) tuples
    segments = []
    in_segment = False
    start = 0
    for i, val in enumerate(line_data):
        if val and not in_segment:
            start = i
            in_segment = True
        elif not val and in_segment:
            segments.append((start, i))
            in_segment = False
    if in_segment:
        segments.append((start, len(line_data)))
    return segments

# Scan horizontal line at Y=128 (Row 0)
row0_segments = find_segments(binary[128, :])
print(f"Row 0 (Y=128) X-Segments: {row0_segments}")

# Scan vertical line at X=170 (Col 0)
col0_segments = find_segments(binary[:, 170])
print(f"Col 0 (X=170) Y-Segments: {col0_segments}")

# Also check if margins are different for other rows/cols
# Scan Row 1 (Y=384)
row1_segments = find_segments(binary[384, :])
print(f"Row 1 (Y=384) X-Segments: {row1_segments}")
