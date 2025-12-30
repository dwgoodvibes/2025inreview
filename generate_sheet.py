
import os
from PIL import Image

# Configuration
input_dir = 'photos/Test'
output_dir = 'public/sheets'
output_filename = 'summer_sheet.webp'
grid_cols = 3
grid_rows = 4
# Output dimensions (standard high-res texture)
# We want decent quality. Let's say 2048x2048 or similar aspect ratio.
# The shader uses SHEET_WIDTH=0.6, SHEET_HEIGHT=0.8. Aspect 3:4.
# Let's use 1536x2048.
sheet_width = 1536
sheet_height = 2048
cell_width = sheet_width // grid_cols
cell_height = sheet_height // grid_rows

# Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

# Get list of images
image_files = sorted([f for f in os.listdir(input_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
# Limit to 10
image_files = image_files[:10]

print(f"Found {len(image_files)} images.")

# Create blank canvas (black background)
sheet = Image.new('RGB', (sheet_width, sheet_height), color=(0, 0, 0))

# 3-3-2-2 Layout logic from useStore
# Row 0: 3 photos (indices 0, 1, 2)
# Row 1: 3 photos (indices 3, 4, 5)
# Row 2: 2 photos (indices 6, 7)
# Row 3: 2 photos (indices 8, 9)

for i, filename in enumerate(image_files):
    img_path = os.path.join(input_dir, filename)
    try:
        img = Image.open(img_path)
        
        # Calculate grid position
        col = 0
        row = 0
        
        if i < 3:
            row = 0
            col = i
        elif i < 6:
            row = 1
            col = i - 3
        elif i < 8:
            row = 2
            col = i - 6
        else: # i < 10
            row = 3
            col = i - 8
            
        # Determine target position on canvas
        x = col * cell_width
        y = row * cell_height
        
        # Resize and Crop to fill cell (Center Crop)
        img_ratio = img.width / img.height
        target_ratio = cell_width / cell_height
        
        if img_ratio > target_ratio:
            # Image is wider than target
            new_height = cell_height
            new_width = int(new_height * img_ratio)
        else:
            # Image is taller than target
            new_width = cell_width
            new_height = int(new_width / img_ratio)
            
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Center crop the resized image
        left = (new_width - cell_width) / 2
        top = (new_height - cell_height) / 2
        right = (new_width + cell_width) / 2
        bottom = (new_height + cell_height) / 2
        
        img = img.crop((left, top, right, bottom))
        
        # Paste onto sheet
        sheet.paste(img, (x, y))
        print(f"Placed {filename} at col {col}, row {row}")
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")

# Save
output_path = os.path.join(output_dir, output_filename)
sheet.save(output_path, 'WEBP', quality=90)
print(f"Saved contact sheet to {output_path}")
