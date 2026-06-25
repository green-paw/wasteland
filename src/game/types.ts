export type ResourceType =
  | "food"
  | "water"
  | "materials"
  | "medicine"
  | "fuel"
  | "ammo";

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

export interface GameState {
  day: number;
  started: boolean;
  resources: Resources;
  resourceCaps: Resources;
  buildings: Record<BuildingType, Building>;
  survivors: Survivor[];
  locations: GameLocation[];
  missions: Mission[];
  teams: Team[];
  log: GameLogEntry[];
  gameOver: boolean;
  gameOverReason?: string;
}
