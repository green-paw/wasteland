import * as THREE from "three";
import { AreaType } from "@/game/types";
import { AREA_TYPE_DEFS } from "@/game/data";

/** Secondary ground tones per area type: [light patch, dark patch, accent/dirt] */
const GROUND_PATCHES: Record<AreaType, [string, string, string]> = {
  farm: ["#9aaa5a", "#5a6a32", "#a89458"],
  village: ["#7a8a52", "#5a6a38", "#8a7a62"],
  town: ["#6a7a62", "#4a5248", "#7a7a6e"],
  city: ["#52525a", "#36363c", "#686870"],
  military: ["#5a6644", "#3e442e", "#6a6450"],
  industrial: ["#5a5248", "#3a342e", "#6a5e54"],
  wilderness: ["#3a6a3e", "#1e4a28", "#4a7a48"],
  ruins: ["#6a6256", "#4a443c", "#7a6e60"],
};

const DEFAULT_PATCHES: [string, string, string] = ["#4a5a3a", "#2a3a22", "#5a6a42"];

function areaSeedFromId(areaId: string): number {
  let h = 0;
  for (let i = 0; i < areaId.length; i++) {
    h = (Math.imul(31, h) + areaId.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function applyHeightVariation(geo: THREE.PlaneGeometry) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.3;
    pos.setZ(i, noise + Math.sin(dist * 0.2) * 0.2);
  }
}

function paintTerrainColors(
  geo: THREE.PlaneGeometry,
  baseHex: string,
  patches: [string, string, string],
  seed: number
) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(baseHex);
  const light = new THREE.Color(patches[0]);
  const dark = new THREE.Color(patches[1]);
  const accent = new THREE.Color(patches[2]);
  const edgeTint = new THREE.Color("#141210");
  const c = new THREE.Color();
  const seedOffset = seed * 0.0007;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);

    const n =
      Math.sin(x * 0.11 + seedOffset) * Math.cos(y * 0.09 + seedOffset * 1.3) +
      Math.sin(x * 0.23 - y * 0.19 + seedOffset * 2) * 0.55 +
      Math.sin((x + y) * 0.07 + seedOffset * 3) * 0.35 +
      Math.sin(x * 0.45 + y * 0.38 + seedOffset * 4) * 0.25;
    const t = (n + 2.2) / 4.4;

    if (t < 0.22) c.copy(dark);
    else if (t < 0.38) c.copy(dark).lerp(base, (t - 0.22) / 0.16);
    else if (t < 0.52) c.copy(base);
    else if (t < 0.68) c.copy(base).lerp(light, (t - 0.52) / 0.16);
    else if (t < 0.84) c.copy(light).lerp(accent, (t - 0.68) / 0.16);
    else c.copy(accent);

    const edgeFade = Math.min(1, dist / 36);
    c.lerp(edgeTint, edgeFade * 0.14);

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export function buildTerrainGeometry(
  areaType: AreaType,
  areaId: string,
  size = 80,
  segments = 40
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  applyHeightVariation(geo);
  const patches = GROUND_PATCHES[areaType];
  const base = AREA_TYPE_DEFS[areaType].color;
  paintTerrainColors(geo, base, patches, areaSeedFromId(areaId));
  geo.computeVertexNormals();
  return geo;
}

export function buildDefaultTerrainGeometry(
  size = 80,
  segments = 40
): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  applyHeightVariation(geo);
  paintTerrainColors(geo, "#3a4a2a", DEFAULT_PATCHES, 42);
  geo.computeVertexNormals();
  return geo;
}
