import {
  AreaType,
  BuildingType,
  EnemyType,
  GameLocation,
  LocationType,
  ResourceType,
  Resources,
  Survivor,
  SurvivorStatus,
} from "./types";

export const RATIONS_PER_SURVIVOR = 1;
export const INTENSIVE_RATIONS_MULTIPLIER = 2;
export const NATURAL_HEAL_PER_DAY = 2;
export const INFIRMARY_HEAL_PER_LEVEL = 5;

export const WATCHTOWER_DEFENSE_PER_LEVEL = 15;
export const GUARD_COMBAT_DEFENSE_MULTIPLIER = 2;

export const RESOURCE_INFO: Record<
  ResourceType,
  { label: string; icon: string; color: string }
> = {
  food: { label: "Food", icon: "🍔", color: "text-amber-400" },
  water: { label: "Water", icon: "💧", color: "text-sky-400" },
  materials: { label: "Materials", icon: "🧱", color: "text-stone-400" },
};

export const RESOURCE_ORDER: ResourceType[] = [
  "food",
  "water",
  "materials",
];

export interface BuildingDef {
  type: BuildingType;
  label: string;
  icon: string;
  description: string;
  baseCost: Partial<Resources>;
  effects: string[];
  startingLevel: number;
  maxLevel: number;
  baseHp: number;
}

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  shelter: {
    type: "shelter",
    label: "Shelter",
    icon: "🏠",
    description: "Houses your survivors. Each level adds capacity for 2 more.",
    baseCost: { materials: 20 },
    effects: ["+2 survivor capacity per level"],
    startingLevel: 1,
    maxLevel: 5,
    baseHp: 100,
  },
  workshop: {
    type: "workshop",
    label: "Workshop",
    icon: "🔧",
    description: "Crafts tools. Higher level reduces all upgrade costs.",
    baseCost: { materials: 35 },
    effects: ["-10% upgrade cost per level"],
    startingLevel: 0,
    maxLevel: 5,
    baseHp: 80,
  },
  infirmary: {
    type: "infirmary",
    label: "Infirmary",
    icon: "⚕️",
    description: "Boosts recovery for survivors on bed rest.",
    baseCost: { materials: 30, water: 10 },
    effects: ["+5 HP per level for resting injured survivors"],
    startingLevel: 0,
    maxLevel: 5,
    baseHp: 70,
  },
  farm: {
    type: "farm",
    label: "Farm",
    icon: "🌾",
    description: "Produces food each day to keep survivors fed.",
    baseCost: { materials: 20, water: 10 },
    effects: ["+5 food per day per level"],
    startingLevel: 0,
    maxLevel: 5,
    baseHp: 60,
  },
  well: {
    type: "well",
    label: "Well",
    icon: "🚰",
    description: "Provides clean water each day.",
    baseCost: { materials: 25 },
    effects: ["+5 water per day per level"],
    startingLevel: 0,
    maxLevel: 5,
    baseHp: 60,
  },
  watchtower: {
    type: "watchtower",
    label: "Watchtower",
    icon: "🗼",
    description: "Defends the base against bandit raids.",
    baseCost: { materials: 35 },
    effects: ["+15 defense per level"],
    startingLevel: 0,
    maxLevel: 5,
    baseHp: 120,
  },
  storage: {
    type: "storage",
    label: "Storage",
    icon: "📦",
    description: "Increases how much of each resource you can hold.",
    baseCost: { materials: 20 },
    effects: ["+50 to all resource caps per level"],
    startingLevel: 0,
    maxLevel: 5,
    baseHp: 80,
  },
  barracks: {
    type: "barracks",
    label: "Barracks",
    icon: "🛡️",
    description: "Allows larger teams to be sent on missions.",
    baseCost: { materials: 40, food: 10 },
    effects: ["+1 team size per level"],
    startingLevel: 0,
    maxLevel: 5,
    baseHp: 100,
  },
};

export interface LocationDef {
  type: LocationType;
  label: string;
  icon: string;
  description: string;
  lootTable: Partial<Record<ResourceType, number>>;
  // Salvage pool: total resources extractable from ruins after clearing.
  // Materials always present (rubble), plus building-specific extras.
  salvageTable: Partial<Record<ResourceType, number>>;
  baseDanger: number;
  enemyTypes: EnemyType[];
  survivorChance: number;
  color: string;
}

export const LOCATION_DEFS: Record<LocationType, LocationDef> = {
  abandoned_house: {
    type: "abandoned_house",
    label: "Abandoned House",
    icon: "🏚️",
    description: "A collapsed home. Usually low danger, modest supplies.",
    lootTable: { food: 6, water: 5, materials: 1 },
    salvageTable: { materials: 24, food: 3, water: 2 },
    baseDanger: 1,
    enemyTypes: ["zombies", "wild_dogs"],
    survivorChance: 0.25,
    color: "#8b7355",
  },
  supermarket: {
    type: "supermarket",
    label: "Supermarket",
    icon: "🛒",
    description: "Once a food store — picked clean but still worth checking.",
    lootTable: { food: 14, water: 7, materials: 1 },
    salvageTable: { materials: 22, food: 8, water: 4 },
    baseDanger: 3,
    enemyTypes: ["zombies", "raiders"],
    survivorChance: 0.15,
    color: "#4a90a4",
  },
  hospital: {
    type: "hospital",
    label: "Hospital",
    icon: "🏥",
    description: "Risky but supplies remain. Walkers everywhere.",
    lootTable: { water: 9, food: 5, materials: 1 },
    salvageTable: { materials: 25, water: 6, food: 4 },
    baseDanger: 4,
    enemyTypes: ["zombies", "mutants"],
    survivorChance: 0.1,
    color: "#d9d9d9",
  },
  gas_station: {
    type: "gas_station",
    label: "Gas Station",
    icon: "⛽",
    description: "Snacks and scrap. Bandits like it here too.",
    lootTable: { food: 7, water: 6, materials: 1 },
    salvageTable: { materials: 22, food: 4, water: 3 },
    baseDanger: 2,
    enemyTypes: ["raiders", "wild_dogs"],
    survivorChance: 0.15,
    color: "#c98a3a",
  },
  warehouse: {
    type: "warehouse",
    label: "Warehouse",
    icon: "🏭",
    description: "Construction materials in bulk. Heavy raider presence.",
    lootTable: { materials: 2, food: 4, water: 3 },
    salvageTable: { materials: 45, food: 3, water: 2 },
    baseDanger: 3,
    enemyTypes: ["raiders"],
    survivorChance: 0.1,
    color: "#6b6b6b",
  },
  military_base: {
    type: "military_base",
    label: "Military Base",
    icon: "🎖️",
    description: "Highly dangerous. Valuable scrap to be had.",
    lootTable: { materials: 2, food: 4, water: 4 },
    salvageTable: { materials: 32, food: 4, water: 3 },
    baseDanger: 5,
    enemyTypes: ["mutants", "raiders"],
    survivorChance: 0.2,
    color: "#5a6b3a",
  },
  school: {
    type: "school",
    label: "School",
    icon: "🏫",
    description: "Children are gone. Walkers roam the halls.",
    lootTable: { food: 9, water: 5, materials: 1 },
    salvageTable: { materials: 26, food: 5, water: 3 },
    baseDanger: 2,
    enemyTypes: ["zombies"],
    survivorChance: 0.3,
    color: "#b85c3a",
  },
  church: {
    type: "church",
    label: "Church",
    icon: "⛪",
    description: "Survivors sometimes shelter here. Quiet but creepy.",
    lootTable: { food: 6, water: 5, materials: 1 },
    salvageTable: { materials: 20, food: 4, water: 3 },
    baseDanger: 1,
    enemyTypes: ["zombies"],
    survivorChance: 0.45,
    color: "#c9b88a",
  },
  factory: {
    type: "factory",
    label: "Factory",
    icon: "⚙️",
    description: "Industrial scrap. Mutants nest in the basement.",
    lootTable: { materials: 1, food: 4, water: 4 },
    salvageTable: { materials: 40, food: 3, water: 2 },
    baseDanger: 4,
    enemyTypes: ["mutants", "wild_dogs"],
    survivorChance: 0.1,
    color: "#4a4a4a",
  },
  pharmacy: {
    type: "pharmacy",
    label: "Pharmacy",
    icon: "💊",
    description: "Small but water-rich. Walkers inside.",
    lootTable: { water: 9, food: 5, materials: 1 },
    salvageTable: { materials: 18, water: 6, food: 4 },
    baseDanger: 2,
    enemyTypes: ["zombies"],
    survivorChance: 0.2,
    color: "#7ab8a4",
  },
};

export const ALL_LOCATION_TYPES = Object.keys(LOCATION_DEFS) as LocationType[];

export const ENEMY_INFO: Record<
  EnemyType,
  { label: string; icon: string; combatPower: number }
> = {
  zombies: { label: "Zombies", icon: "🧟", combatPower: 1 },
  wild_dogs: { label: "Wild Dogs", icon: "🐺", combatPower: 1.5 },
  raiders: { label: "Raiders", icon: "🔪", combatPower: 2.5 },
  mutants: { label: "Mutants", icon: "👹", combatPower: 3.5 },
};

export function getTeamCombatPower(survivors: Survivor[]): number {
  return (
    survivors.reduce((sum, s) => sum + s.skills.combat, 0) +
    survivors.reduce((sum, s) => sum + (s.health > 50 ? 1 : 0), 0) * 0.5
  );
}

export function getWatchtowerDefense(watchtowerLevel: number): number {
  return watchtowerLevel * WATCHTOWER_DEFENSE_PER_LEVEL;
}

export function getGuardDefense(survivors: Survivor[]): number {
  return survivors
    .filter((s) => s.role === "guarding")
    .reduce(
      (sum, s) => sum + s.skills.combat * GUARD_COMBAT_DEFENSE_MULTIPLIER,
      0
    );
}

export function getBaseDefense(
  watchtowerLevel: number,
  survivors: Survivor[]
): { tower: number; guards: number; total: number } {
  const tower = getWatchtowerDefense(watchtowerLevel);
  const guards = getGuardDefense(survivors);
  return { tower, guards, total: tower + guards };
}

export function survivorNeedsIntensiveCare(survivor: Survivor): boolean {
  return survivor.role === "resting" && survivor.status !== "healthy";
}

export function getSurvivorDailyRations(survivor: Survivor): {
  food: number;
  water: number;
} {
  if (survivorNeedsIntensiveCare(survivor)) {
    return {
      food: RATIONS_PER_SURVIVOR * INTENSIVE_RATIONS_MULTIPLIER,
      water: RATIONS_PER_SURVIVOR * INTENSIVE_RATIONS_MULTIPLIER,
    };
  }
  return { food: RATIONS_PER_SURVIVOR, water: RATIONS_PER_SURVIVOR };
}

export function getAreaConsumption(survivors: Survivor[]): {
  food: number;
  water: number;
} {
  return survivors.reduce(
    (acc, s) => {
      const rations = getSurvivorDailyRations(s);
      return {
        food: acc.food + rations.food,
        water: acc.water + rations.water,
      };
    },
    { food: 0, water: 0 }
  );
}

const REST_HEAL_BY_STATUS: Record<Exclude<SurvivorStatus, "healthy">, number> =
  {
    injured: 10,
    sick: 5,
    critical: 15,
  };

export function getRestHealAmount(
  survivor: Survivor,
  infirmaryLevel: number
): number {
  if (survivor.role !== "resting" || survivor.status === "healthy") return 0;

  const base = REST_HEAL_BY_STATUS[survivor.status];
  const infirmaryBonus = infirmaryLevel * INFIRMARY_HEAL_PER_LEVEL;
  const medicalBonus = Math.floor(survivor.skills.medical / 10);
  return base + infirmaryBonus + medicalBonus;
}

export function getLocationEnemyPower(location: GameLocation): number {
  if (location.cleared || location.enemyCount <= 0) return 0;
  return location.enemyCount * ENEMY_INFO[location.enemyType].combatPower;
}

export function isLocationTooStrongForTeam(
  location: GameLocation,
  team: Survivor[]
): boolean {
  const enemyPower = getLocationEnemyPower(location);
  if (enemyPower <= 0 || team.length === 0) return false;
  return getTeamCombatPower(team) < enemyPower;
}

export const SURVIVOR_NAMES = [
  "Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn",
  "Avery", "Dakota", "Sage", "Reese", "Rowan", "Skyler", "Drew", "Blake",
  "Cameron", "Hayden", "Jamie", "Kendall", "Logan", "Parker", "Sydney", "Tatum",
  "Devon", "Emerson", "Finley", "Harper", "Kai", "Marlowe", "Nova", "Phoenix",
  "Remy", "Sasha", "Toby", "Wren", "Yuki", "Zane", "Iris", "Juno",
  "Marco", "Lena", "Nadia", "Oscar", "Priya", "Rafael", "Sofia", "Theo",
  "Vera", "Wade", "Xena", "Yara", "Boris", "Cora", "Dmitri", "Elena",
  "Felix", "Greta", "Hans", "Ingrid",
];

export const INITIAL_RESOURCES: Resources = {
  food: 30,
  water: 30,
  materials: 35,
};

export const INITIAL_RESOURCE_CAPS: Resources = {
  food: 100,
  water: 100,
  materials: 100,
};

export function getUpgradeCost(
  type: BuildingType,
  currentLevel: number,
  workshopLevel: number
): Partial<Resources> {
  const def = BUILDING_DEFS[type];
  const nextLevel = currentLevel + 1;
  const multiplier = 1 + (nextLevel - 1) * 0.8;
  const workshopDiscount = 1 - workshopLevel * 0.1;
  const cost: Partial<Resources> = {};
  for (const [k, v] of Object.entries(def.baseCost)) {
    cost[k as ResourceType] = Math.max(
      1,
      Math.round((v as number) * multiplier * workshopDiscount)
    );
  }
  return cost;
}

export function getMaxTeamSize(barracksLevel: number): number {
  // Base 3 survivors per team; barracks adds +1 per level.
  return 3 + barracksLevel;
}

export function getSurvivorCapacity(shelterLevel: number): number {
  return 1 + shelterLevel * 2;
}

// ============== Area Types (hex-grid world map) ==============

export interface AreaTypeDef {
  type: AreaType;
  label: string;
  icon: string;
  description: string;
  // How many locations to generate when the area is discovered.
  locationCount: [number, number];
  // Weights for each location type — higher = more common.
  locationWeights: Partial<Record<LocationType, number>>;
  // Base danger bias for the area (added to each location's base danger, clamped 1-5).
  dangerBias: number;
  // Color used on the hex grid.
  color: string;
}

export const AREA_TYPE_DEFS: Record<AreaType, AreaTypeDef> = {
  farm: {
    type: "farm",
    label: "Farmland",
    icon: "🌾",
    description: "Open fields, scattered farmhouses. Low danger, plenty of food.",
    locationCount: [6, 9],
    locationWeights: {
      abandoned_house: 5,
      supermarket: 1,
      gas_station: 1,
      church: 1,
      school: 1,
    },
    dangerBias: -1,
    color: "#7a8a4a",
  },
  village: {
    type: "village",
    label: "Village",
    icon: "🏘️",
    description: "A small settlement. Quiet, modest supplies, low danger.",
    locationCount: [7, 10],
    locationWeights: {
      abandoned_house: 4,
      church: 2,
      school: 2,
      pharmacy: 1,
      gas_station: 1,
    },
    dangerBias: 0,
    color: "#8a7a5a",
  },
  town: {
    type: "town",
    label: "Town",
    icon: "🏙️",
    description: "A mid-size town. Mixed supplies, medium danger.",
    locationCount: [9, 12],
    locationWeights: {
      supermarket: 3,
      pharmacy: 2,
      school: 2,
      church: 1,
      gas_station: 2,
      warehouse: 2,
      abandoned_house: 2,
    },
    dangerBias: 0,
    color: "#5a7a8a",
  },
  city: {
    type: "city",
    label: "City",
    icon: "🌆",
    description: "Dense urban ruins. Rich loot, but dangerous.",
    locationCount: [11, 14],
    locationWeights: {
      supermarket: 3,
      hospital: 2,
      warehouse: 2,
      factory: 2,
      pharmacy: 2,
      gas_station: 1,
      abandoned_house: 1,
    },
    dangerBias: 1,
    color: "#4a4a6a",
  },
  military: {
    type: "military",
    label: "Military Zone",
    icon: "🎖️",
    description: "Fortified military installations. High danger, rare gear.",
    locationCount: [6, 9],
    locationWeights: {
      military_base: 5,
      warehouse: 2,
      gas_station: 2,
      hospital: 1,
    },
    dangerBias: 2,
    color: "#5a6b3a",
  },
  industrial: {
    type: "industrial",
    label: "Industrial Park",
    icon: "🏭",
    description: "Factories and warehouses. Materials-rich, hostile.",
    locationCount: [7, 10],
    locationWeights: {
      factory: 4,
      warehouse: 3,
      gas_station: 2,
      abandoned_house: 1,
    },
    dangerBias: 1,
    color: "#6a5a4a",
  },
  wilderness: {
    type: "wilderness",
    label: "Wilderness",
    icon: "🌲",
    description: "Overgrown countryside. Few buildings, very low danger.",
    locationCount: [4, 6],
    locationWeights: {
      abandoned_house: 3,
      church: 2,
      gas_station: 1,
    },
    dangerBias: -1,
    color: "#4a6a4a",
  },
  ruins: {
    type: "ruins",
    label: "Ruins",
    icon: "🏚️",
    description: "A long-abandoned area. Mixed danger, picked clean.",
    locationCount: [6, 9],
    locationWeights: {
      abandoned_house: 4,
      factory: 2,
      church: 1,
      school: 1,
      warehouse: 1,
    },
    dangerBias: 0,
    color: "#5a5a5a",
  },
};

export const ALL_AREA_TYPES = Object.keys(AREA_TYPE_DEFS) as AreaType[];

// Names used for area generation
export const AREA_NAME_PREFIXES = [
  "Old", "New", "North", "South", "East", "West", "Lost", "Forgotten",
  "Broken", "Dead", "Hollow", "Silent", "Dusty", "Rusted", "Shattered",
];
export const AREA_NAME_SUFFIXES = [
  "Hollow", "Crossing", "Reach", "Hollow", "Fields", "Heights", "Vale",
  "Ridge", "Mills", "Creek", "Junction", "Pond", "Grove", "Fork", "Pass",
];

// Hex grid math (axial coordinates)
export const HEX_NEIGHBORS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

export function hexDistance(a: [number, number], b: [number, number]): number {
  return (
    (Math.abs(a[0] - b[0]) +
      Math.abs(a[0] + a[1] - b[0] - b[1]) +
      Math.abs(a[1] - b[1])) /
    2
  );
}

export function getNeighborHexes(hex: [number, number]): [number, number][] {
  return HEX_NEIGHBORS.map(([dq, dr]) => [hex[0] + dq, hex[1] + dr]);
}

export function hexToPixel(hex: [number, number], size: number): [number, number] {
  const [q, r] = hex;
  // Pointy-top orientation: hexes share horizontal edges with their
  // east/west neighbors and slanted edges with the others.
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return [x, y];
}

