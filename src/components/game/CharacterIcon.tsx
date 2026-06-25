"use client";

import { makeRng } from "@/game/worldGen";

// 8x8 pixel art character icons.
// Each survivor gets a unique icon based on a seed.
// Colors are picked from curated palettes.

const SKIN_TONES = [
  "#f0c8a0", "#e0a878", "#c08858", "#8b5a3c",
  "#5c3a28", "#d8a878", "#b88858",
];

const HAIR_COLORS = [
  "#1a1a1a", "#3a2818", "#6b4423", "#a07028",
  "#d4a838", "#888888", "#cccccc", "#8b3a3a",
  "#3a5a8b", "#5a3a8b",
];

const EYE_COLORS = ["#1a1a1a", "#3a5a8b", "#5a3a28", "#2a6a4a"];

const ACCESSORY_COLORS = [
  "#5a3a28", "#3a3a3a", "#8b3a3a", "#3a5a8b",
  "#2a4a2a", "#5a3a8b",
];

// 8x8 face templates. 0 = transparent, 1 = skin, 2 = hair,
// 3 = eye, 4 = mouth/dark, 5 = accessory
const FACE_TEMPLATES: number[][][] = [
  // Template 0: standard short hair
  [
    [2,2,2,2,2,2,2,2],
    [2,1,1,1,1,1,1,2],
    [2,1,3,1,1,3,1,2],
    [2,1,1,1,1,1,1,2],
    [2,1,1,4,4,1,1,2],
    [2,1,1,1,1,1,1,2],
    [2,1,1,1,1,1,1,2],
    [0,2,2,2,2,2,2,0],
  ],
  // Template 1: bald / shaved
  [
    [0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1],
    [1,3,1,1,1,3,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,4,4,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
  ],
  // Template 2: long hair
  [
    [2,2,2,2,2,2,2,2],
    [2,1,1,1,1,1,1,2],
    [2,3,1,1,1,3,2,2],
    [2,1,1,1,1,1,2,2],
    [2,1,1,4,4,1,1,2],
    [2,1,1,1,1,1,1,2],
    [2,2,1,1,1,1,2,2],
    [2,2,2,2,2,2,2,2],
  ],
  // Template 3: mohawk / punk
  [
    [0,0,2,2,2,0,0,0],
    [0,2,1,1,1,2,0,0],
    [0,2,3,1,1,3,2,0],
    [0,2,1,1,1,1,2,0],
    [0,2,1,4,4,1,2,0],
    [0,2,1,1,1,1,2,0],
    [0,2,1,1,1,1,2,0],
    [0,2,2,2,2,2,2,0],
  ],
  // Template 4: bandana
  [
    [5,5,5,5,5,5,5,5],
    [5,1,1,1,1,1,1,5],
    [1,1,3,1,1,3,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,4,4,1,1,1],
    [1,1,1,1,1,1,1,1],
    [2,1,1,1,1,1,1,2],
    [0,2,2,2,2,2,2,0],
  ],
  // Template 5: beanie
  [
    [5,5,5,5,5,5,5,5],
    [5,5,5,5,5,5,5,5],
    [5,1,3,1,1,3,1,5],
    [5,1,1,1,1,1,1,5],
    [5,1,1,4,4,1,1,5],
    [0,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,0],
    [0,2,2,2,2,2,2,0],
  ],
  // Template 6: hood
  [
    [5,5,5,5,5,5,5,5],
    [5,2,2,2,2,2,2,5],
    [5,2,1,1,1,1,2,5],
    [5,1,3,1,1,3,1,5],
    [5,1,1,4,4,1,1,5],
    [5,1,1,1,1,1,1,5],
    [5,5,1,1,1,1,5,5],
    [5,5,5,5,5,5,5,5],
  ],
  // Template 7: cap
  [
    [5,5,5,5,5,5,0,0],
    [5,5,5,5,5,5,5,0],
    [2,2,2,2,2,2,2,2],
    [2,3,1,1,1,3,1,2],
    [2,1,1,1,1,1,1,2],
    [2,1,1,4,4,1,1,2],
    [2,1,1,1,1,1,1,2],
    [0,2,2,2,2,2,2,0],
  ],
];

// Beard overlay — only drawn if seed says so
const BEARD_TEMPLATES: number[][][] = [
  [
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,2,0,0,0,0,2,0],
    [0,2,2,2,2,2,2,0],
    [0,0,2,2,2,2,0,0],
  ],
  // mustache only
  [
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,2,2,0,0,2,2,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0],
  ],
];

function pickFrom<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

interface IconConfig {
  template: number[][];
  skin: string;
  hair: string;
  eye: string;
  accessory: string;
  beard: number[][] | null;
  bg: string;
}

function configFromSeed(seed: number): IconConfig {
  const rng = makeRng(seed + 12345);
  const template = pickFrom(rng, FACE_TEMPLATES);
  const bgColors = ["#1f2937", "#374151", "#1e293b", "#292524", "#1c1917", "#0f172a", "#3b2f2f"];
  let beard: number[][] | null = null;
  if (rng() < 0.3) {
    beard = pickFrom(rng, BEARD_TEMPLATES);
  }
  return {
    template,
    skin: pickFrom(rng, SKIN_TONES),
    hair: pickFrom(rng, HAIR_COLORS),
    eye: pickFrom(rng, EYE_COLORS),
    accessory: pickFrom(rng, ACCESSORY_COLORS),
    beard,
    bg: pickFrom(rng, bgColors),
  };
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
  const config = configFromSeed(seed);
  const cellSize = size / 8;

  // Compose final color matrix
  const matrix: (string | null)[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < 8; x++) {
      const cell = config.template[y][x];
      let color: string | null = null;
      if (cell === 1) color = config.skin;
      else if (cell === 2) color = config.hair;
      else if (cell === 3) color = config.eye;
      else if (cell === 4) color = "#3a1a1a";
      else if (cell === 5) color = config.accessory;
      // Beard overlay
      if (config.beard && config.beard[y][x] === 2) {
        color = config.hair;
      }
      row.push(color);
    }
    matrix.push(row);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{
        imageRendering: "pixelated",
        borderRadius: rounded ? `${Math.max(2, size / 12)}px` : 0,
        border: "1px solid rgba(255,255,255,0.1)",
        display: "block",
      }}
    >
      <rect width={size} height={size} fill={config.bg} />
      {matrix.map((row, y) =>
        row.map((color, x) =>
          color ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}
