
import os
from PIL import Image

# Configuration
input_dir = 'photos/Test'
output_dir = 'public/sheets'
output_filename = 'summer_sheet.webp'

# Target Dimensions
target_w = 1536
target_h = 2048
ref_w = 1024
ref_h = 1024

scale_x = target_w / ref_w
scale_y = target_h / ref_h

# Defined Bounding Boxes in 1024x1024 reference space (Left, Top, Right, Bottom)
# x-ranges: [23-334], [356-669], [692-1005]
# y-ranges: [108-302], [342-537], [575-772], [808-1005]

cols_x = [(23, 334), (356, 669), (692, 1005)]
rows_y = [(108, 302), (342, 537), (575, 772), (808, 1005)]

# Map linear index to (row, col)
# 0,1,2 -> Row 0, Cols 0,1,2
# 3,4,5 -> Row 1, Cols 0,1,2
# 6,7   -> Row 2, Cols 0,1
# 8,9   -> Row 3, Cols 0,1

grid_mapping = [
    (0,0), (0,1), (0,2),
    (1,0), (1,1), (1,2),
    (2,0), (2,1),
    (3,0), (3,1)
]

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

# Get list of images
image_files = sorted([f for f in os.listdir(input_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
image_files = image_files[:10]

print(f"Found {len(image_files)} images.")

# Create blank canvas (black background)
sheet = Image.new('RGB', (target_w, target_h), color=(0, 0, 0))

for i, filename in enumerate(image_files):
    if i >= len(grid_mapping): break
    
    r_idx, c_idx = grid_mapping[i]
    
    # Get reference coordinates
    x1_ref, x2_ref = cols_x[c_idx]
    y1_ref, y2_ref = rows_y[r_idx]
    
    # Scale to target coordinates
    # Add a small bleed (padding) to ensure valid coverage under the frame
    bleed_ref = 4 
    
    x1 = int((x1_ref - bleed_ref) * scale_x)
    x2 = int((x2_ref + bleed_ref) * scale_x)
    y1 = int((y1_ref - bleed_ref) * scale_y)
    y2 = int((y2_ref + bleed_ref) * scale_y)
    
    target_width = x2 - x1
    target_height = y2 - y1
    
    img_path = os.path.join(input_dir, filename)
    try:
        img = Image.open(img_path)
        
        # Auto-rotate portrait photos to fit landscape slots
        # User requested flip 180 from previous (so 90 degrees CW)
        if img.height > img.width:
            print(f"Rotating {filename} 90 degrees CW")
            img = img.rotate(-90, expand=True)
        
        # Resize/Crop logic
        img_ratio = img.width / img.height
        target_ratio = target_width / target_height
        
        if img_ratio > target_ratio:
            # Image is wider
            new_height = target_height
            new_width = int(new_height * img_ratio)
        else:
            # Image is taller
            new_width = target_width
            new_height = int(new_width / img_ratio)
            
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Center Crop
        left = (new_width - target_width) / 2
        top = (new_height - target_height) / 2
        right = (new_width + target_width) / 2
        bottom = (new_height + target_height) / 2
        
        img = img.crop((left, top, right, bottom))
        
        # Paste
        sheet.paste(img, (x1, y1))
        print(f"Placed {filename} at Row {r_idx}, Col {c_idx} ({x1},{y1})")
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")

# Save
output_path = os.path.join(output_dir, output_filename)
sheet.save(output_path, 'WEBP', quality=95)
print(f"Saved aligned contact sheet to {output_path}")
