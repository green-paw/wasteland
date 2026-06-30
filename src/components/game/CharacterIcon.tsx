"use client";

// Character icon component using the uploaded 8x8 sprite sheet.
// The sprite sheet is at /characters-sheet.png (512x512, 64x64 per face).
// Each survivor picks a face by index based on their iconSeed.

const TOTAL_FACES = 64; // 8x8 grid

function pickFaceIndex(seed: number): number {
  // Deterministic per-seed; stable across renders.
  // Use a simple hash to avoid clustering.
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  const r = ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  return Math.floor(r * TOTAL_FACES);
}

export interface CharacterIconProps {
  seed: number;
  size?: number;
  className?: string;
  rounded?: boolean;
}

export function CharacterIcon({
  seed,
  size = 48,
  className = "",
  rounded = true,
}: CharacterIconProps) {
  const faceIndex = pickFaceIndex(seed);
  const col = faceIndex % 8;
  const row = Math.floor(faceIndex / 8);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const sheetSrc = `${basePath}/characters-sheet.png`;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: rounded ? `${Math.max(2, size / 10)}px` : 0,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "#1f2937",
        imageRendering: "auto",
        display: "block",
        flexShrink: 0,
      }}
    >
      <img
        src={sheetSrc}
        alt="Survivor face"
        width={size}
        height={size}
        style={{
          width: size * 8,
          height: size * 8,
          maxWidth: "none",
          objectFit: "cover",
          transform: `translate(-${col * size}px, -${row * size}px)`,
          imageRendering: "auto",
          display: "block",
        }}
        draggable={false}
      />
    </div>
  );
}
