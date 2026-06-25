"""Slice the 8x8 character faces sprite sheet into individual PNGs."""
from PIL import Image
import os

SRC = "/home/z/my-project/upload/characterFaces.png"
DST_DIR = "/home/z/my-project/public/characters"

os.makedirs(DST_DIR, exist_ok=True)

img = Image.open(SRC).convert("RGBA")
W, H = img.size
cols, rows = 8, 8
cell_w = W // cols
cell_h = H // rows

print(f"Source: {W}x{H}, cells: {cell_w}x{cell_h}")

# Also build a single sprite-sheet (8x8) at lower resolution for the browser
# Keep individual files for direct use
SPRITE_SIZE = 64  # each face rendered at 64x64
sheet = Image.new("RGBA", (SPRITE_SIZE * cols, SPRITE_SIZE * rows), (0, 0, 0, 0))

for row in range(rows):
    for col in range(cols):
        left = col * cell_w
        top = row * cell_h
        right = left + cell_w
        bottom = top + cell_h
        cell = img.crop((left, top, right, bottom))
        # Auto-crop transparent/empty borders
        bbox = cell.getbbox()
        if bbox:
            # pad a little
            pad = 4
            b_l = max(0, bbox[0] - pad)
            b_t = max(0, bbox[1] - pad)
            b_r = min(cell_w, bbox[2] + pad)
            b_b = min(cell_h, bbox[3] + pad)
            cell = cell.crop((b_l, b_t, b_r, b_b))
        # Resize to sprite size, preserve aspect with transparent padding
        cell.thumbnail((SPRITE_SIZE, SPRITE_SIZE), Image.LANCZOS)
        # Center on transparent canvas
        canvas = Image.new("RGBA", (SPRITE_SIZE, SPRITE_SIZE), (0, 0, 0, 0))
        off_x = (SPRITE_SIZE - cell.width) // 2
        off_y = (SPRITE_SIZE - cell.height) // 2
        canvas.paste(cell, (off_x, off_y), cell)
        # Save individual
        idx = row * cols + col
        canvas.save(f"{DST_DIR}/face_{idx:02d}.png")
        # Add to sheet
        sheet.paste(canvas, (col * SPRITE_SIZE, row * SPRITE_SIZE))

# Save the sheet
sheet.save("/home/z/my-project/public/characters-sheet.png")
print(f"Saved 64 individual faces + sprite sheet to {DST_DIR}")
print(f"Sheet size: {sheet.size}")
