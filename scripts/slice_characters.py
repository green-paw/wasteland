"""Slice the 8x8 character faces sprite sheet into individual PNGs.
Grid: 1254x1254 image, 9px outer border, 152px cells, 3px gaps between cells.
Cell (col, row) top-left = (9 + col*155, 9 + row*155).
"""
from PIL import Image
import os

SRC = "/home/z/my-project/upload/characterFaces.png"
DST_DIR = "/home/z/my-project/public/characters"

os.makedirs(DST_DIR, exist_ok=True)

img = Image.open(SRC).convert("RGBA")
W, H = img.size
cols, rows = 8, 8

# Grid parameters (detected from image analysis)
BORDER = 9
CELL = 152
GAP = 3
STRIDE = CELL + GAP  # 155

print(f"Source: {W}x{H}")
print(f"Grid: {BORDER}px border, {CELL}px cells, {GAP}px gaps, {STRIDE}px stride")

# Verify: BORDER + 8*CELL + 7*GAP + BORDER = 9 + 1216 + 21 + 9 = 1255 (close to 1254, off by 1)
# Actually 2*9 + 8*152 + 7*3 = 18 + 1216 + 21 = 1255. Image is 1254. Close enough — last border is 8.
# Let's just use the formula and clamp.

SPRITE_SIZE = 64  # each face rendered at 64x64 in the output sheet
sheet = Image.new("RGBA", (SPRITE_SIZE * cols, SPRITE_SIZE * rows), (0, 0, 0, 0))

for row in range(rows):
    for col in range(cols):
        left = BORDER + col * STRIDE
        top = BORDER + row * STRIDE
        right = left + CELL
        bottom = top + CELL
        # Clamp to image bounds
        right = min(right, W)
        bottom = min(bottom, H)
        cell = img.crop((left, top, right, bottom))

        # Auto-crop transparent/empty borders within the cell
        # Convert to RGBA and find bounding box of non-transparent content
        # But the cell has a dark background, not transparent. So find non-uniform content.
        # Use alpha channel — but image is fully opaque. Use brightness variance instead.
        # Simplest: just resize the whole cell to fit SPRITE_SIZE, preserving aspect.
        cell_resized = cell.resize((SPRITE_SIZE, SPRITE_SIZE), Image.LANCZOS)

        # Save individual
        idx = row * cols + col
        cell_resized.save(f"{DST_DIR}/face_{idx:02d}.png")
        # Add to sheet
        sheet.paste(cell_resized, (col * SPRITE_SIZE, row * SPRITE_SIZE))

# Save the sheet
sheet.save("/home/z/my-project/public/characters-sheet.png")
print(f"Saved 64 individual faces + sprite sheet to {DST_DIR}")
print(f"Sheet size: {sheet.size}")

# Also save a preview montage to visually verify
preview = sheet.resize((512, 512), Image.NEAREST)
preview.save("/home/z/my-project/download/characters-preview.png")
print(f"Saved preview to /home/z/my-project/download/characters-preview.png")
