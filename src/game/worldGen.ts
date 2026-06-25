import {
  GameLocation,
  LocationType,
  Resources,
  ResourceType,
  Survivor,
} from "./types";
import {
  ALL_LOCATION_TYPES,
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
    // Salvage pool is the full extractable amount — vary it ±20%
    pool[k as ResourceType] = Math.max(
      1,
      Math.round(base * (0.8 + rng() * 0.4))
    );
  }
  return pool;
}

// ---------- World Map Generation ----------
export function generateWorld(seed: number): GameLocation[] {
  const rng = makeRng(seed);
  const locations: GameLocation[] = [];
  const numLocations = randInt(rng, 10, 14);

  // Force at least 2 safe locations near base (danger 1-2)
  const safeTypes: LocationType[] = ["abandoned_house", "church", "school", "pharmacy"];
  for (let i = 0; i < 2; i++) {
    const type = pick(rng, safeTypes);
    const def = LOCATION_DEFS[type];
    const angle = (i / 2) * Math.PI + rng() * 0.5;
    const radius = 6 + rng() * 3; // close to base
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const danger = Math.min(2, def.baseDanger);
    const enemyType = pick(rng, def.enemyTypes);
    const enemyCount = danger + randInt(rng, 0, 1);

    const loot: Partial<Resources> = {};
    for (const [k, weight] of Object.entries(def.lootTable)) {
      loot[k as ResourceType] = Math.max(1, Math.round((weight as number) * (0.6 + rng() * 0.9)));
    }

    const salvagePool = generateSalvagePool(rng, def.salvageTable);

    locations.push({
      id: `loc_safe_${i}_${Math.floor(rng() * 100000)}`,
      name: def.label,
      type,
      position: [x, 0, z],
      dangerLevel: danger,
      enemyType,
      enemyCount,
      loot,
      salvagePool,
      salvageDepleted: false,
      survivorChance: def.survivorChance,
      explored: false,
      cleared: false,
      distance: 0.5,
    });
  }

  // base at (0,0,0) — locations spread around it
  const usedAngles: number[] = [];

  for (let i = 0; i < numLocations - 2; i++) {
    const type = pick(rng, ALL_LOCATION_TYPES);
    const def = LOCATION_DEFS[type];

    // pick a unique-ish angle
    let angle = rng() * Math.PI * 2;
    for (let a = 0; a < 8; a++) {
      const conflict = usedAngles.some(
        (used) => Math.abs(used - angle) < 0.4 || Math.abs(used - angle - Math.PI * 2) < 0.4
      );
      if (!conflict) break;
      angle = rng() * Math.PI * 2;
    }
    usedAngles.push(angle);

    const radius = 7 + rng() * 12; // 7..19 units from base
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0;

    const danger = Math.min(
      5,
      Math.max(1, def.baseDanger + randInt(rng, -1, 1))
    );
    const enemyType = pick(rng, def.enemyTypes);
    const enemyCount = danger + randInt(rng, 0, 2);

    // loot based on loot table
    const loot: Partial<Resources> = {};
    for (const [k, weight] of Object.entries(def.lootTable)) {
      const base = weight as number;
      loot[k as ResourceType] = Math.max(
        1,
        Math.round(base * (0.6 + rng() * 0.9))
      );
    }

    const salvagePool = generateSalvagePool(rng, def.salvageTable);
    const survivorChance = def.survivorChance;
    const distance = Math.max(0.5, Math.round(radius / 7) * 0.5); // 0.5, 1, 1.5

    locations.push({
      id: `loc_${i}_${Math.floor(rng() * 100000)}`,
      name: def.label,
      type,
      position: [x, y, z],
      dangerLevel: danger,
      enemyType,
      enemyCount,
      loot,
      salvagePool,
      salvageDepleted: false,
      survivorChance,
      explored: false,
      cleared: false,
      distance,
    });
  }

  return locations;
}

// ---------- Survivor Generation ----------
export function generateSurvivor(
  seed: number,
  forcedName?: string
): Survivor {
  const rng = makeRng(seed);
  const name = forcedName ?? pick(rng, SURVIVOR_NAMES);
  const iconSeed = Math.floor(rng() * 1000000);

  // starting survivor (seed=1) gets balanced stats
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
