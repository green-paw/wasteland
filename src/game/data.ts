import {
  BuildingType,
  EnemyType,
  LocationType,
  ResourceType,
  Resources,
} from "./types";

export const RESOURCE_INFO: Record<
  ResourceType,
  { label: string; icon: string; color: string }
> = {
  food: { label: "Food", icon: "🍔", color: "text-amber-400" },
  water: { label: "Water", icon: "💧", color: "text-sky-400" },
  materials: { label: "Materials", icon: "🧱", color: "text-stone-400" },
  medicine: { label: "Medicine", icon: "💊", color: "text-rose-400" },
  fuel: { label: "Fuel", icon: "⛽", color: "text-yellow-400" },
  ammo: { label: "Ammo", icon: "🔫", color: "text-orange-400" },
};

export const RESOURCE_ORDER: ResourceType[] = [
  "food",
  "water",
  "materials",
  "medicine",
  "fuel",
  "ammo",
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
    baseCost: { materials: 30, fuel: 5 },
    effects: ["-10% upgrade cost per level"],
    startingLevel: 0,
    maxLevel: 5,
    baseHp: 80,
  },
  infirmary: {
    type: "infirmary",
    label: "Infirmary",
    icon: "⚕️",
    description: "Heals injured and sick survivors each day.",
    baseCost: { materials: 25, medicine: 10 },
    effects: ["Heals +10 HP per survivor per level each day"],
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
    baseCost: { materials: 30, ammo: 5 },
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
    baseCost: { materials: 35, ammo: 10 },
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
    lootTable: { food: 5, water: 4, medicine: 1, materials: 1 },
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
    lootTable: { food: 12, water: 6, medicine: 2, materials: 1 },
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
    description: "Risky but rich in medicine. Walkers everywhere.",
    lootTable: { medicine: 12, water: 4, food: 2, materials: 1 },
    salvageTable: { materials: 25, medicine: 8, water: 2 },
    baseDanger: 4,
    enemyTypes: ["zombies", "mutants"],
    survivorChance: 0.1,
    color: "#d9d9d9",
  },
  gas_station: {
    type: "gas_station",
    label: "Gas Station",
    icon: "⛽",
    description: "Fuel and snacks. Bandits like it here too.",
    lootTable: { fuel: 9, food: 4, water: 2, materials: 1 },
    salvageTable: { materials: 20, fuel: 8, food: 2 },
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
    lootTable: { materials: 3, fuel: 4, ammo: 4, food: 2 },
    salvageTable: { materials: 40, fuel: 3, ammo: 2 },
    baseDanger: 3,
    enemyTypes: ["raiders"],
    survivorChance: 0.1,
    color: "#6b6b6b",
  },
  military_base: {
    type: "military_base",
    label: "Military Base",
    icon: "🎖️",
    description: "Highly dangerous. Ammo and fuel to be had.",
    lootTable: { ammo: 12, fuel: 6, medicine: 3, materials: 1 },
    salvageTable: { materials: 28, ammo: 8, fuel: 4, medicine: 2 },
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
    lootTable: { food: 7, water: 3, medicine: 2, materials: 1 },
    salvageTable: { materials: 26, food: 4, medicine: 2 },
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
    lootTable: { food: 4, medicine: 4, water: 2, materials: 1 },
    salvageTable: { materials: 20, medicine: 3, food: 2 },
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
    lootTable: { fuel: 6, ammo: 3, materials: 2, food: 1 },
    salvageTable: { materials: 35, fuel: 5, ammo: 2 },
    baseDanger: 4,
    enemyTypes: ["mutants", "wild_dogs"],
    survivorChance: 0.1,
    color: "#4a4a4a",
  },
  pharmacy: {
    type: "pharmacy",
    label: "Pharmacy",
    icon: "💊",
    description: "Small but medicine-rich. Walkers inside.",
    lootTable: { medicine: 9, food: 2, water: 2, materials: 1 },
    salvageTable: { materials: 18, medicine: 6, water: 2 },
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
  materials: 20,
  medicine: 10,
  fuel: 5,
  ammo: 10,
};

export const INITIAL_RESOURCE_CAPS: Resources = {
  food: 100,
  water: 100,
  materials: 100,
  medicine: 50,
  fuel: 50,
  ammo: 50,
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
