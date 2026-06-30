"use client";

// Each survivor picks a face by index based on their iconSeed.
// Faces are pre-sliced from the source sheet using detected gutter boundaries
// (see scripts/slice-character-faces.ts and public/characters-grid.json).

const TOTAL_FACES = 64;

function pickFaceIndex(seed: number): number {
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
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const faceSrc = `${basePath}/characters/face_${String(faceIndex).padStart(2, "0")}.png`;

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
        src={faceSrc}
        alt="Survivor face"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          display: "block",
        }}
        draggable={false}
      />
    </div>
  );
}
