
from PIL import Image
import numpy as np

img = Image.open('public/textures/contact_sheet_frame.png').convert('L')
data = np.array(img)
threshold = 230
binary = data > threshold

def find_segments(line_data):
    segments = []
    in_segment = False
    start = 0
    for i, val in enumerate(line_data):
        if val and not in_segment:
            start = i
            in_segment = True
        elif not val and in_segment:
            if (i - start) > 50: # Filter small noise
                segments.append((start, i))
            in_segment = False
    if in_segment and (len(line_data) - start) > 50:
        segments.append((start, len(line_data)))
    return segments

# X-Centers based on previous run
x_centers = [178, 512, 848]

for i, x in enumerate(x_centers):
    segs = find_segments(binary[:, x])
    print(f"Col {i} (X={x}) Y-Segments: {segs}")
