/**
 * Slice the character faces sprite sheet by detecting dark gutter lines,
 * so each cell uses its exact bounds (rows/columns may differ in size).
 *
 * Usage: bun run scripts/slice-character-faces.ts
 */
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const ROOT = path.join(import.meta.dir, "..");
const SRC = path.join(ROOT, "upload", "characterFaces.png");
const OUT_DIR = path.join(ROOT, "public", "characters");
const SHEET_OUT = path.join(ROOT, "public", "characters-sheet.png");
const MANIFEST_OUT = path.join(ROOT, "public", "characters-grid.json");

const COLS = 8;
const ROWS = 8;
const OUTPUT_SIZE = 64;
const GUTTER_THRESHOLD = 0.85;
const GUTTER_PIXEL_MAX = 60; // max RGB sum for a gutter pixel

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface GridManifest {
  sourceWidth: number;
  sourceHeight: number;
  cols: number;
  rows: number;
  outputSize: number;
  columnBounds: [number, number][];
  rowBounds: [number, number][];
  faces: { index: number; col: number; row: number; source: Bounds }[];
}

function isGutterPixel(r: number, g: number, b: number): boolean {
  return r + g + b < GUTTER_PIXEL_MAX;
}

function gutterScores(
  data: Buffer,
  width: number,
  height: number,
  axis: "x" | "y"
): number[] {
  const len = axis === "x" ? width : height;
  const scores = new Array<number>(len).fill(0);

  if (axis === "x") {
    for (let x = 0; x < width; x++) {
      let dark = 0;
      for (let y = 0; y < height; y++) {
        const i = (y * width + x) * 4;
        if (isGutterPixel(data[i], data[i + 1], data[i + 2])) dark++;
      }
      scores[x] = dark / height;
    }
  } else {
    for (let y = 0; y < height; y++) {
      let dark = 0;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (isGutterPixel(data[i], data[i + 1], data[i + 2])) dark++;
      }
      scores[y] = dark / width;
    }
  }

  return scores;
}

function findGutterCenters(scores: number[], threshold = GUTTER_THRESHOLD): number[] {
  const dark: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] >= threshold) dark.push(i);
  }
  if (dark.length === 0) return [];

  const centers: number[] = [];
  let start = dark[0];
  let prev = dark[0];
  for (let k = 1; k < dark.length; k++) {
    if (dark[k] - prev > 1) {
      centers.push(Math.floor((start + prev) / 2));
      start = dark[k];
    }
    prev = dark[k];
  }
  centers.push(Math.floor((start + prev) / 2));
  return centers;
}

/** Pick exactly `count` gutter lines closest to evenly spaced ideal positions. */
function pickGutters(centers: number[], total: number, count: number): number[] {
  if (centers.length === count) return centers.slice().sort((a, b) => a - b);
  if (centers.length < count) {
    throw new Error(
      `Expected at least ${count} gutter lines, found ${centers.length}`
    );
  }

  const ideals = Array.from({ length: count }, (_, i) => ((i + 1) * total) / (count + 1));
  const used = new Set<number>();
  const picked: number[] = [];

  for (const ideal of ideals) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < centers.length; j++) {
      if (used.has(j)) continue;
      const dist = Math.abs(centers[j] - ideal);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }
    used.add(bestIdx);
    picked.push(centers[bestIdx]);
  }

  return picked.sort((a, b) => a - b);
}

function cellBoundsFromGutters(
  gutterCenters: number[],
  total: number,
  scores: number[]
): [number, number][] {
  const gutters = gutterCenters.slice().sort((a, b) => a - b);
  const edges = [0, ...gutters, total];
  const cells: [number, number][] = [];

  for (let i = 0; i < edges.length - 1; i++) {
    let left = edges[i];
    let right = edges[i + 1];

    while (left < right - 1 && scores[left] > 0.7) left++;
    while (right > left + 1 && scores[right - 1] > 0.7) right--;

    if (right - left > 4) cells.push([left, right]);
  }

  return cells;
}

async function main() {
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  console.log(`Source: ${width}x${height}`);

  const colScores = gutterScores(data, width, height, "x");
  const rowScores = gutterScores(data, width, height, "y");

  const vCenters = pickGutters(
    findGutterCenters(colScores),
    width,
    COLS - 1
  );
  const hCenters = pickGutters(
    findGutterCenters(rowScores),
    height,
    ROWS - 1
  );

  const columnBounds = cellBoundsFromGutters(vCenters, width, colScores);
  const rowBounds = cellBoundsFromGutters(hCenters, height, rowScores);

  if (columnBounds.length !== COLS || rowBounds.length !== ROWS) {
    throw new Error(
      `Grid detection failed: ${columnBounds.length}x${rowBounds.length} (expected ${COLS}x${ROWS})`
    );
  }

  console.log(
    "Column widths:",
    columnBounds.map(([l, r]) => r - l).join(", ")
  );
  console.log(
    "Row heights:",
    rowBounds.map(([t, b]) => b - t).join(", ")
  );

  await mkdir(OUT_DIR, { recursive: true });

  const sheet = sharp({
    create: {
      width: OUTPUT_SIZE * COLS,
      height: OUTPUT_SIZE * ROWS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const composites: { input: Buffer; left: number; top: number }[] = [];
  const faces: GridManifest["faces"] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const [left, right] = columnBounds[col];
      const [top, bottom] = rowBounds[row];
      const cropWidth = right - left;
      const cropHeight = bottom - top;

      const faceBuffer = await sharp(SRC)
        .extract({ left, top, width: cropWidth, height: cropHeight })
        .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "cover", position: "centre" })
        .png()
        .toBuffer();

      const index = row * COLS + col;
      const facePath = path.join(OUT_DIR, `face_${String(index).padStart(2, "0")}.png`);
      await sharp(faceBuffer).toFile(facePath);

      composites.push({
        input: faceBuffer,
        left: col * OUTPUT_SIZE,
        top: row * OUTPUT_SIZE,
      });

      faces.push({
        index,
        col,
        row,
        source: { left, top, width: cropWidth, height: cropHeight },
      });
    }
  }

  await sheet.composite(composites).png().toFile(SHEET_OUT);

  const manifest: GridManifest = {
    sourceWidth: width,
    sourceHeight: height,
    cols: COLS,
    rows: ROWS,
    outputSize: OUTPUT_SIZE,
    columnBounds,
    rowBounds,
    faces,
  };

  await writeFile(MANIFEST_OUT, JSON.stringify(manifest, null, 2));

  console.log(`Wrote ${faces.length} faces to ${OUT_DIR}`);
  console.log(`Wrote sheet to ${SHEET_OUT}`);
  console.log(`Wrote manifest to ${MANIFEST_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
