export type ResourceType =
  | "food"
  | "water"
  | "materials";

export type Resources = Record<ResourceType, number>;

export type BuildingType =
  | "shelter"
  | "workshop"
  | "infirmary"
  | "farm"
  | "well"
  | "watchtower"
  | "storage"
  | "barracks";

export type EnemyType = "zombies" | "raiders" | "wild_dogs" | "mutants";

export type LocationType =
  | "abandoned_house"
  | "supermarket"
  | "hospital"
  | "gas_station"
  | "warehouse"
  | "military_base"
  | "school"
  | "church"
  | "factory"
  | "pharmacy";

export type SurvivorStatus = "healthy" | "injured" | "sick" | "critical";
export type SurvivorRole = "idle" | "resting" | "onMission" | "working";

export interface Skills {
  combat: number;
  scavenging: number;
  medical: number;
  engineering: number;
}

export interface Survivor {
  id: string;
  name: string;
  iconSeed: number;
  health: number;
  hunger: number;
  thirst: number;
  morale: number;
  skills: Skills;
  status: SurvivorStatus;
  role: SurvivorRole;
  assignedTeamId?: string;
}

export interface Building {
  type: BuildingType;
  level: number;
  maxLevel: number;
  hp: number;
  maxHp: number;
}

export interface GameLocation {
  id: string;
  name: string;
  type: LocationType;
  position: [number, number, number];
  dangerLevel: number;
  enemyType: EnemyType;
  enemyCount: number;
  loot: Partial<Resources>;
  survivorChance: number;
  explored: boolean;
  cleared: boolean;
  distance: number;
  // Salvage pool: after clearing, survivors can extract leftover resources
  // from the ruins. Each salvage mission depletes the pool.
  salvagePool: Partial<Resources>;
  salvageDepleted: boolean;
}

export interface Mission {
  id: string;
  teamId: string;
  team: string[];
  locationId: string;
  status: "pending" | "inProgress" | "completed";
  // "scout" = first exploration (combat + loot), "salvage" = extracting from cleared ruins
  missionType?: "scout" | "salvage";
  result?: MissionResult;
}

export interface MissionResult {
  success: boolean;
  lootGained: Partial<Resources>;
  survivorsRecruited: Survivor[];
  casualties: string[];
  injuries: string[];
  log: string[];
}

export interface GameLogEntry {
  day: number;
  message: string;
  type: "info" | "success" | "warning" | "danger";
}

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  locationId: string | null;
}

// ============== Areas (hex-grid world map) ==============

export type AreaType =
  | "farm"
  | "village"
  | "town"
  | "city"
  | "military"
  | "industrial"
  | "wilderness"
  | "ruins";

export interface Area {
  id: string;
  name: string;
  type: AreaType;
  // Axial hex coordinates [q, r]
  hex: [number, number];
  // false = only type+name known (fog of war); true = locations generated & visible
  discovered: boolean;
  // Whether the player has established a base here (claimed a building)
  hasBase: boolean;
  // The cleared location acting as this area's base (if any)
  baseLocationId?: string;
  // Per-area state (only meaningful once discovered, but always present)
  locations: GameLocation[];
  buildings: Record<BuildingType, Building>;
  resources: Resources;
  resourceCaps: Resources;
  teams: Team[];
  missions: Mission[];
  // Survivor IDs currently physically in this area
  survivorIds: string[];
}

// A transfer moves survivors and/or resources between two adjacent areas.
// It takes 1 day; while in transit the survivors can't act.
export interface Transfer {
  id: string;
  fromAreaId: string;
  toAreaId: string;
  survivorIds: string[];
  resources: Partial<Resources>;
  // Day on which the transfer arrives and is applied
  arrivalDay: number;
}

export interface GameState {
  day: number;
  started: boolean;
  // All areas indexed by id (hex grid). Undiscovered ones only have type/name.
  areas: Record<string, Area>;
  // The area the player is currently viewing in the Area Map / Base tabs.
  currentAreaId: string;
  // All survivors, indexed by id (so they can move between areas without dup).
  survivors: Record<string, Survivor>;
  // In-transit transfers between areas
  transfers: Transfer[];
  log: GameLogEntry[];
  gameOver: boolean;
  gameOverReason?: string;
}
