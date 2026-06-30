import {
  Area,
  AreaType,
  GameLocation,
  LocationType,
  Resources,
  ResourceType,
  Survivor,
} from "./types";
import {
  ALL_AREA_TYPES,
  AREA_NAME_PREFIXES,
  AREA_NAME_SUFFIXES,
  AREA_TYPE_DEFS,
  BUILDING_DEFS,
  getNeighborHexes,
  INITIAL_RESOURCE_CAPS,
  INITIAL_RESOURCES,
  LOCATION_DEFS,
  SURVIVOR_NAMES,
} from "./data";

// ---------- Seeded RNG (mulberry32) ----------
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ---------- Helper: generate salvage pool from salvage table ----------
function generateSalvagePool(
  rng: () => number,
  salvageTable: Partial<Record<ResourceType, number>>
): Partial<Resources> {
  const pool: Partial<Resources> = {};
  for (const [k, weight] of Object.entries(salvageTable)) {
    const base = weight as number;
    pool[k as ResourceType] = Math.max(
      1,
      Math.round(base * (0.8 + rng() * 0.4))
    );
  }
  return pool;
}

// ---------- Helper: weighted pick ----------
function weightedPick(
  rng: () => number,
  weights: Partial<Record<LocationType, number>>
): LocationType {
  const entries = Object.entries(weights) as [LocationType, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function distance2D(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dz = a[1] - b[1];
  return Math.sqrt(dx * dx + dz * dz);
}

function samplePositionWithMinDistance(
  rng: () => number,
  used: [number, number][],
  minRadius: number,
  maxRadius: number,
  minDistance: number
): { angle: number; radius: number; x: number; z: number } {
  // Best-effort Poisson-like sampling with graceful fallback if space is tight.
  for (let attempt = 0; attempt < 40; attempt++) {
    const angle = rng() * Math.PI * 2;
    const radius = minRadius + rng() * (maxRadius - minRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const overlaps = used.some((p) => distance2D([x, z], p) < minDistance);
    if (!overlaps) return { angle, radius, x, z };
  }

  const angle = rng() * Math.PI * 2;
  const radius = minRadius + rng() * (maxRadius - minRadius);
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  return { angle, radius, x, z };
}

// ---------- Generate locations for an area (called when discovered) ----------
export function generateAreaLocations(
  areaId: string,
  areaType: AreaType,
  seed: number,
  isStart = false
): GameLocation[] {
  const rng = makeRng(seed);
  const def = AREA_TYPE_DEFS[areaType];
  const numLocations = randInt(rng, def.locationCount[0], def.locationCount[1]);
  const locations: GameLocation[] = [];
  const usedAngles: number[] = [];
  const usedPositions: [number, number][] = [];
  const minLocationSpacing = 4.2;

  // Force at least 1 safe location near the area's base (danger 1-2).
  // For the starting area, this location is guaranteed to have exactly 1 enemy
  // so the player can clear it and claim it as a base on day 1.
  const safeTypes: LocationType[] = ["abandoned_house", "church", "school", "pharmacy"];
  {
    const type = pick(rng, safeTypes);
    const locDef = LOCATION_DEFS[type];
    const { angle, radius, x, z } = samplePositionWithMinDistance(
      rng,
      usedPositions,
      4.5,
      7.5,
      minLocationSpacing
    );
    const danger = Math.min(2, locDef.baseDanger);
    const enemyType = pick(rng, locDef.enemyTypes);
    // Starting area: exactly 1 enemy. Other areas: danger + 0-1.
    const enemyCount = isStart ? 1 : danger + randInt(rng, 0, 1);
    const loot: Partial<Resources> = {};
    for (const [k, weight] of Object.entries(locDef.lootTable)) {
      loot[k as ResourceType] = Math.max(
        1,
        Math.round((weight as number) * (0.6 + rng() * 0.9))
      );
    }
    const salvagePool = generateSalvagePool(rng, locDef.salvageTable);
    locations.push({
      id: `loc_${areaId}_safe_${Math.floor(rng() * 100000)}`,
      name: locDef.label,
      type,
      position: [x, 0, z],
      dangerLevel: danger,
      enemyType,
      enemyCount,
      loot,
      salvagePool,
      salvageDepleted: false,
      // Starting area: guaranteed survivor recruit from this easy location,
      // so the player can grow their group on day 1.
      survivorChance: isStart ? 1.0 : locDef.survivorChance,
      explored: false,
      cleared: false,
      distance: 0.5,
    });
    usedAngles.push(angle);
    usedPositions.push([x, z]);
  }

  // Remaining locations: weighted by area type
  for (let i = 0; i < numLocations - 1; i++) {
    const type = weightedPick(rng, def.locationWeights);
    const locDef = LOCATION_DEFS[type];

    let angle = rng() * Math.PI * 2;
    for (let a = 0; a < 8; a++) {
      const conflict = usedAngles.some(
        (used) =>
          Math.abs(used - angle) < 0.4 ||
          Math.abs(used - angle - Math.PI * 2) < 0.4
      );
      if (!conflict) break;
      angle = rng() * Math.PI * 2;
    }
    usedAngles.push(angle);

    const sampled = samplePositionWithMinDistance(
      rng,
      usedPositions,
      5.5,
      11.5,
      minLocationSpacing
    );
    angle = sampled.angle;
    const radius = sampled.radius;
    const x = sampled.x;
    const z = sampled.z;

    const danger = Math.min(
      5,
      Math.max(1, locDef.baseDanger + def.dangerBias + randInt(rng, -1, 1))
    );
    const enemyType = pick(rng, locDef.enemyTypes);
    const enemyCount = danger + randInt(rng, 0, 2);

    const loot: Partial<Resources> = {};
    for (const [k, weight] of Object.entries(locDef.lootTable)) {
      loot[k as ResourceType] = Math.max(
        1,
        Math.round((weight as number) * (0.6 + rng() * 0.9))
      );
    }

    const salvagePool = generateSalvagePool(rng, locDef.salvageTable);
    const distance = Math.max(0.5, Math.round(radius / 7) * 0.5);

    locations.push({
      id: `loc_${areaId}_${i}_${Math.floor(rng() * 100000)}`,
      name: locDef.label,
      type,
      position: [x, 0, z],
      dangerLevel: danger,
      enemyType,
      enemyCount,
      loot,
      salvagePool,
      salvageDepleted: false,
      survivorChance: locDef.survivorChance,
      explored: false,
      cleared: false,
      distance,
    });
    usedPositions.push([x, z]);
  }

  return locations;
}

// ---------- Area shell (undiscovered hex on the world map) ----------
function hexToAreaSeed(hex: [number, number]): number {
  const [q, r] = hex;
  return (((q + 8192) * 10007) ^ ((r + 8192) * 100003)) >>> 0;
}

function buildAreaShell(
  hex: [number, number],
  rng: () => number,
  options?: { isStart?: boolean }
): Area {
  const isStart = options?.isStart ?? false;
  const type: AreaType = isStart
    ? pick(rng, ["farm", "village", "village", "wilderness"] as AreaType[])
    : pick(rng, ALL_AREA_TYPES);
  const name = `${pick(rng, AREA_NAME_PREFIXES)} ${pick(rng, AREA_NAME_SUFFIXES)}`;
  const id = `area_${hex[0]}_${hex[1]}`;

  return {
    id,
    name,
    type,
    hex,
    discovered: false,
    hasBase: false,
    locations: [],
    buildings: emptyBuildings(isStart),
    resources: isStart ? { ...INITIAL_RESOURCES } : emptyResources(),
    resourceCaps: { ...INITIAL_RESOURCE_CAPS },
    teams: [],
    missions: [],
    survivorIds: [],
  };
}

export function createAreaShell(hex: [number, number], seed: number): Area {
  return buildAreaShell(hex, makeRng(seed));
}

/** Add undiscovered neighbor hexes around `centerHex` that are not in `areas` yet. */
export function expandWorldAroundHex(
  areas: Record<string, Area>,
  centerHex: [number, number]
): Record<string, Area> {
  let hasNew = false;
  const next = { ...areas };
  for (const neighborHex of getNeighborHexes(centerHex)) {
    const id = `area_${neighborHex[0]}_${neighborHex[1]}`;
    if (!next[id]) {
      next[id] = createAreaShell(neighborHex, hexToAreaSeed(neighborHex));
      hasNew = true;
    }
  }
  return hasNew ? next : areas;
}

// ---------- World (hex grid) Generation ----------
// Generates the starting area (discovered) + its 6 neighbors (undiscovered, type/name only).
export function generateWorld(seed: number): {
  areas: Record<string, Area>;
  startAreaId: string;
} {
  const rng = makeRng(seed);
  const areas: Record<string, Area> = {};

  // Start area at (0,0)
  const startArea = buildAreaShell([0, 0], rng, { isStart: true });
  startArea.discovered = true;
  // NOTE: hasBase stays false — the player must clear a location and claim it.
  // The starting area gets guaranteed 1 easy location (1 enemy) via isStart.
  startArea.hasBase = false;
  startArea.locations = generateAreaLocations(
    startArea.id,
    startArea.type,
    seed + 1,
    true // isStart → guaranteed 1 easy location
  );

  areas[startArea.id] = startArea;

  // 6 neighbors — only type/name known (undiscovered)
  for (const neighborHex of getNeighborHexes([0, 0])) {
    const area = buildAreaShell(neighborHex, rng);
    areas[area.id] = area;
  }

  return { areas, startAreaId: startArea.id };
}

// ---------- Helpers for empty state ----------
function emptyResources(): Resources {
  return { food: 0, water: 0, materials: 0 };
}

function emptyBuildings(starting: boolean): Record<string, any> {
  const out: Record<string, any> = {};
  for (const type of Object.keys(BUILDING_DEFS) as (keyof typeof BUILDING_DEFS)[]) {
    const def = BUILDING_DEFS[type];
    out[type] = {
      type,
      level: starting ? def.startingLevel : 0,
      maxLevel: def.maxLevel,
      hp: starting ? def.baseHp : 0,
      maxHp: def.baseHp,
    };
  }
  return out as any;
}

// ---------- Survivor Generation ----------
export function generateSurvivor(
  seed: number,
  forcedName?: string
): Survivor {
  const rng = makeRng(seed);
  const name = forcedName ?? pick(rng, SURVIVOR_NAMES);
  const iconSeed = Math.floor(rng() * 1000000);

  const isStarter = seed === 1;

  const skills = {
    combat: isStarter ? randInt(rng, 4, 6) : randInt(rng, 1, 5),
    scavenging: isStarter ? randInt(rng, 3, 5) : randInt(rng, 1, 5),
    medical: isStarter ? randInt(rng, 2, 4) : randInt(rng, 0, 4),
    engineering: isStarter ? randInt(rng, 2, 4) : randInt(rng, 0, 4),
  };

  return {
    id: `surv_${seed}_${Math.floor(rng() * 100000)}`,
    name,
    iconSeed,
    health: isStarter ? 100 : randInt(rng, 60, 100),
    hunger: isStarter ? 20 : randInt(rng, 20, 60),
    thirst: isStarter ? 20 : randInt(rng, 20, 60),
    morale: isStarter ? 70 : randInt(rng, 40, 80),
    skills,
    status: "healthy",
    role: "idle",
  };
}
