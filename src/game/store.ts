"use client";

import { create } from "zustand";
import {
  Building,
  BuildingType,
  GameLocation,
  GameLogEntry,
  GameState,
  Mission,
  MissionResult,
  Resources,
  ResourceType,
  Survivor,
  Team,
} from "./types";
import {
  BUILDING_DEFS,
  ENEMY_INFO,
  getSurvivorCapacity,
  getMaxTeamSize,
  getUpgradeCost,
  INITIAL_RESOURCES,
  INITIAL_RESOURCE_CAPS,
  LOCATION_DEFS,
} from "./data";
import {
  generateSurvivor,
  generateWorld,
  makeRng,
  pick,
  randInt,
} from "./worldGen";

// ---------- Helper: empty resources ----------
function emptyResources(): Resources {
  return { food: 0, water: 0, materials: 0, medicine: 0, fuel: 0, ammo: 0 };
}

function clampResources(res: Resources, caps: Resources): Resources {
  const out: Resources = { ...res };
  (Object.keys(out) as ResourceType[]).forEach((k) => {
    out[k] = Math.max(0, Math.min(caps[k], out[k]));
  });
  return out;
}

function canAfford(res: Resources, cost: Partial<Resources>): boolean {
  for (const [k, v] of Object.entries(cost)) {
    if (res[k as ResourceType] < (v as number)) return false;
  }
  return true;
}

function subtractCost(res: Resources, cost: Partial<Resources>): Resources {
  const out = { ...res };
  for (const [k, v] of Object.entries(cost)) {
    out[k as ResourceType] -= v as number;
  }
  return out;
}

// ---------- Initial State ----------
function initialBuildings(): Record<BuildingType, Building> {
  const out = {} as Record<BuildingType, Building>;
  (Object.keys(BUILDING_DEFS) as BuildingType[]).forEach((type) => {
    const def = BUILDING_DEFS[type];
    out[type] = {
      type,
      level: def.startingLevel,
      maxLevel: def.maxLevel,
      hp: def.baseHp,
      maxHp: def.baseHp,
    };
  });
  return out;
}

function createInitialState(): GameState {
  const starter = generateSurvivor(1, "You");
  starter.role = "idle";
  return {
    day: 1,
    started: false,
    resources: { ...INITIAL_RESOURCES },
    resourceCaps: { ...INITIAL_RESOURCE_CAPS },
    buildings: initialBuildings(),
    survivors: [starter],
    locations: [],
    missions: [],
    teams: [],
    log: [
      {
        day: 1,
        message:
          "You wake up alone in an abandoned shelter. The world has fallen. Survive.",
        type: "info",
      },
    ],
    gameOver: false,
  };
}

// ---------- Store Interface ----------
interface GameStore extends GameState {
  startGame: () => void;
  resetGame: () => void;

  // building actions
  upgradeBuilding: (type: BuildingType) => void;
  repairBuilding: (type: BuildingType) => void;

  // team actions
  createTeam: (name: string) => string | null;
  deleteTeam: (teamId: string) => void;
  assignSurvivorToTeam: (survivorId: string, teamId: string) => void;
  unassignSurvivorFromTeam: (survivorId: string) => void;
  assignTeamToLocation: (teamId: string, locationId: string) => void;
  clearTeamLocation: (teamId: string) => void;

  // survivor actions
  setSurvivorResting: (survivorId: string, resting: boolean) => void;

  // main loop
  endDay: () => void;
}

// ---------- Calculate Resource Caps ----------
function calculateCaps(buildings: Record<BuildingType, Building>): Resources {
  const base = { ...INITIAL_RESOURCE_CAPS };
  const storageLevel = buildings.storage.level;
  (Object.keys(base) as ResourceType[]).forEach((k) => {
    base[k] += storageLevel * 50;
  });
  return base;
}

// ---------- Resolve a Mission ----------
function resolveMission(
  mission: Mission,
  survivors: Survivor[],
  location: GameLocation,
  day: number
): { result: MissionResult; updatedSurvivors: Survivor[]; log: GameLogEntry[] } {
  const log: GameLogEntry[] = [];
  const teamSurvivors = survivors.filter((s) => mission.team.includes(s.id));
  const rng = makeRng(
    mission.id
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0) +
      day * 7919 +
      location.position[0] * 31
  );

  const result: MissionResult = {
    success: true,
    lootGained: {},
    survivorsRecruited: [],
    casualties: [],
    injuries: [],
    log: [],
  };

  // --- Combat ---
  if (!location.cleared && location.enemyCount > 0) {
    const enemyDef = ENEMY_INFO[location.enemyType];
    const teamCombat =
      teamSurvivors.reduce((sum, s) => sum + s.skills.combat, 0) +
      teamSurvivors.reduce((sum, s) => sum + (s.health > 50 ? 1 : 0), 0) * 0.5;
    const enemyPower = location.enemyCount * enemyDef.combatPower;

    result.log.push(
      `Team encountered ${location.enemyCount} ${enemyDef.label} at ${location.name}.`
    );

    if (teamCombat >= enemyPower) {
      // Victory
      result.success = true;
      result.log.push(
        `Victory! Team combat ${teamCombat.toFixed(1)} vs enemy ${enemyPower.toFixed(1)}.`
      );
      // Possible injuries
      teamSurvivors.forEach((s) => {
        const injuryChance = 0.15 + location.dangerLevel * 0.05;
        if (rng() < injuryChance) {
          const dmg = randInt(rng, 10, 30);
          s.health = Math.max(1, s.health - dmg);
          s.status = s.health < 30 ? "critical" : "injured";
          result.injuries.push(s.id);
          result.log.push(`${s.name} was injured (-${dmg} HP).`);
        }
      });
    } else {
      // Defeat — significant casualties
      result.success = false;
      result.log.push(
        `Defeat! Team combat ${teamCombat.toFixed(1)} vs enemy ${enemyPower.toFixed(1)}.`
      );
      teamSurvivors.forEach((s) => {
        const deathChance = 0.1 + Math.max(0, enemyPower - teamCombat) * 0.05;
        if (rng() < deathChance) {
          result.casualties.push(s.id);
          result.log.push(`${s.name} was killed in action.`);
        } else {
          const dmg = randInt(rng, 25, 55);
          s.health = Math.max(5, s.health - dmg);
          s.status = s.health < 30 ? "critical" : "injured";
          result.injuries.push(s.id);
          result.log.push(`${s.name} was badly injured (-${dmg} HP).`);
        }
      });
      // On defeat, gain half loot
      const halfLoot: Partial<Resources> = {};
      for (const [k, v] of Object.entries(location.loot)) {
        halfLoot[k as ResourceType] = Math.floor((v as number) * 0.4);
      }
      result.lootGained = halfLoot;
      if (Object.values(halfLoot).some((v) => (v as number) > 0)) {
        result.log.push("Team grabbed what they could before retreating.");
      }
    }
  } else {
    result.log.push(`No hostiles at ${location.name}.`);
  }

  // --- Loot (on success or partial) ---
  if (result.success && !location.cleared) {
    const scavenging = teamSurvivors.reduce(
      (sum, s) => sum + s.skills.scavenging,
      0
    );
    const lootMultiplier = 0.5 + scavenging * 0.15 + rng() * 0.3;
    const loot: Partial<Resources> = {};
    for (const [k, v] of Object.entries(location.loot)) {
      loot[k as ResourceType] = Math.max(
        0,
        Math.round((v as number) * lootMultiplier)
      );
    }
    result.lootGained = { ...result.lootGained, ...loot };
    const lootSummary = Object.entries(loot)
      .filter(([, v]) => (v as number) > 0)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ");
    if (lootSummary) {
      result.log.push(`Salvaged: ${lootSummary}.`);
    }
  }

  // --- Survivor Recruitment ---
  if (result.success && !location.cleared) {
    if (rng() < location.survivorChance) {
      const newSurvivor = generateSurvivor(
        Math.floor(rng() * 1000000) + day * 13
      );
      newSurvivor.health = randInt(rng, 50, 90);
      newSurvivor.hunger = randInt(rng, 30, 70);
      newSurvivor.thirst = randInt(rng, 30, 70);
      newSurvivor.morale = randInt(rng, 30, 70);
      result.survivorsRecruited.push(newSurvivor);
      result.log.push(
        `Found a survivor named ${newSurvivor.name}! They joined your group.`
      );
    }
  }

  // Mark as explored/cleared
  location.explored = true;
  if (result.success) {
    location.cleared = true;
    location.enemyCount = 0;
  }

  // Convert detailed log into global entries
  result.log.forEach((msg) =>
    log.push({ day, message: msg, type: msg.includes("killed") ? "danger" : msg.includes("injured") || msg.includes("Defeat") ? "warning" : msg.includes("Victory") || msg.includes("Salvaged") || msg.includes("Found") ? "success" : "info" })
  );

  return { result, updatedSurvivors: survivors, log };
}

// ---------- Day End Logic ----------
function processEndDay(state: GameState): GameState {
  const day = state.day;
  const newLog: GameLogEntry[] = [...state.log];
  const buildings = { ...state.buildings };
  // deep clone buildings
  (Object.keys(buildings) as BuildingType[]).forEach((k) => {
    buildings[k] = { ...buildings[k] };
  });

  let resources = { ...state.resources };
  let resourceCaps = calculateCaps(buildings);
  let survivors = state.survivors.map((s) => ({ ...s }));
  let locations = state.locations.map((l) => ({ ...l }));
  let missions = state.missions.map((m) => ({ ...m }));
  const teams = state.teams.map((t) => ({ ...t }));

  newLog.push({
    day,
    message: `--- Day ${day} begins ---`,
    type: "info",
  });

  // ---------- 1. Resolve pending missions ----------
  const completedMissions: Mission[] = [];
  missions = missions.map((m) => {
    if (m.status !== "pending") return m;
    const location = locations.find((l) => l.id === m.locationId);
    if (!location) return { ...m, status: "completed", result: { success: false, lootGained: {}, survivorsRecruited: [], casualties: [], injuries: [], log: ["Location not found."] } };

    // Survivors on mission can't rest/eat at base this turn — but they do consume travel rations
    const teamSurvivors = survivors.filter((s) => m.team.includes(s.id));
    teamSurvivors.forEach((s) => {
      s.role = "onMission";
    });

    const { result, log } = resolveMission(m, survivors, location, day);
    newLog.push(...log);

    // Apply loot
    const lootAdd = emptyResources();
    for (const [k, v] of Object.entries(result.lootGained)) {
      lootAdd[k as ResourceType] += v as number;
    }
    resources = { ...resources };
    for (const [k, v] of Object.entries(lootAdd)) {
      resources[k as ResourceType] += v as number;
    }

    // Apply casualties
    if (result.casualties.length > 0) {
      survivors = survivors.filter((s) => !result.casualties.includes(s.id));
    }

    // Apply recruitment
    if (result.survivorsRecruited.length > 0) {
      survivors.push(...result.survivorsRecruited);
    }

    // Reset team survivors to idle
    teamSurvivors.forEach((s) => {
      // re-find — survivors list may have changed
      const updated = survivors.find((su) => su.id === s.id);
      if (updated) {
        updated.role = "idle";
        updated.assignedTeamId = undefined;
      }
    });

    // Clear team location
    const team = teams.find((t) => t.id === m.teamId);
    if (team) {
      team.locationId = null;
    }

    return { ...m, status: "completed", result };
  });

  // remove completed missions
  missions = missions.filter((m) => m.status === "pending");

  // ---------- 2. Building production ----------
  const farmFood = buildings.farm.level * 5;
  const wellWater = buildings.well.level * 5;
  if (farmFood > 0) {
    resources.food += farmFood;
    newLog.push({
      day,
      message: `Farm produced ${farmFood} food.`,
      type: "success",
    });
  }
  if (wellWater > 0) {
    resources.water += wellWater;
    newLog.push({
      day,
      message: `Well produced ${wellWater} water.`,
      type: "success",
    });
  }

  // ---------- 3. Survivor consumption ----------
  const consumption = survivors.length;
  const foodNeeded = consumption;
  const waterNeeded = consumption;

  let foodShortage = 0;
  let waterShortage = 0;

  if (resources.food >= foodNeeded) {
    resources.food -= foodNeeded;
  } else {
    foodShortage = foodNeeded - resources.food;
    resources.food = 0;
  }
  if (resources.water >= waterNeeded) {
    resources.water -= waterNeeded;
  } else {
    waterShortage = waterNeeded - resources.water;
    resources.water = 0;
  }

  if (foodShortage > 0) {
    newLog.push({
      day,
      message: `Food shortage! ${foodShortage} survivors go hungry.`,
      type: "warning",
    });
  } else {
    newLog.push({
      day,
      message: `Survivors consumed ${foodNeeded} food and ${waterNeeded} water.`,
      type: "info",
    });
  }
  if (waterShortage > 0) {
    newLog.push({
      day,
      message: `Water shortage! ${waterShortage} survivors are dehydrated.`,
      type: "warning",
    });
  }

  // ---------- 4. Update survivor stats ----------
  survivors.forEach((s) => {
    // hunger & thirst increase
    s.hunger = Math.min(100, s.hunger + 15);
    s.thirst = Math.min(100, s.thirst + 20);

    // food shortage damage
    if (foodShortage > 0 && s.role !== "onMission") {
      s.hunger = Math.min(100, s.hunger + 25);
      s.health = Math.max(0, s.health - 5);
    }
    if (waterShortage > 0 && s.role !== "onMission") {
      s.thirst = Math.min(100, s.thirst + 30);
      s.health = Math.max(0, s.health - 8);
    }

    // starvation damage
    if (s.hunger >= 90) {
      s.health = Math.max(0, s.health - 8);
      if (s.role !== "onMission") {
        newLog.push({
          day,
          message: `${s.name} is starving.`,
          type: "warning",
        });
      }
    }
    if (s.thirst >= 90) {
      s.health = Math.max(0, s.health - 10);
      if (s.role !== "onMission") {
        newLog.push({
          day,
          message: `${s.name} is severely dehydrated.`,
          type: "warning",
        });
      }
    }

    // resting restores morale and small HP
    if (s.role === "resting") {
      s.morale = Math.min(100, s.morale + 10);
      s.health = Math.min(100, s.health + 5);
    }

    // morale drop from low health
    if (s.health < 30) {
      s.morale = Math.max(0, s.morale - 5);
    }
  });

  // ---------- 5. Infirmary healing ----------
  if (buildings.infirmary.level > 0) {
    const heal = buildings.infirmary.level * 10;
    const medicinePerHeal = 1;
    survivors.forEach((s) => {
      if (s.status !== "healthy" && s.health < 100) {
        if (resources.medicine >= medicinePerHeal) {
          resources.medicine -= medicinePerHeal;
          s.health = Math.min(100, s.health + heal);
          if (s.health >= 70) {
            s.status = "healthy";
          } else if (s.health >= 40) {
            s.status = s.status === "critical" ? "injured" : s.status;
          }
          newLog.push({
            day,
            message: `${s.name} was treated at the infirmary (+${heal} HP).`,
            type: "success",
          });
        }
      }
    });
  }

  // Update survivor status based on health
  survivors.forEach((s) => {
    if (s.health <= 0) {
      // will be removed below
    } else if (s.health < 25) {
      s.status = "critical";
    } else if (s.health < 50) {
      s.status = s.status === "sick" ? "sick" : "injured";
    } else if (s.health < 70 && (s.status === "injured" || s.status === "critical")) {
      s.status = "injured";
    } else if (s.health >= 70 && s.status !== "sick") {
      s.status = "healthy";
    }
  });

  // ---------- 6. Remove dead ----------
  const deadToday = survivors.filter((s) => s.health <= 0);
  deadToday.forEach((s) => {
    newLog.push({
      day,
      message: `${s.name} has died.`,
      type: "danger",
    });
  });
  survivors = survivors.filter((s) => s.health > 0);

  // ---------- 7. Random bandit raid ----------
  const rng = makeRng(day * 9973 + 7);
  if (day > 2 && rng() < 0.25) {
    const raidPower = randInt(rng, 2, 4) + Math.floor(day / 3);
    const defense = buildings.watchtower.level * 15 + survivors.filter((s) => s.role === "idle").reduce((sum, s) => sum + s.skills.combat * 2, 0);

    newLog.push({
      day,
      message: `Bandit raid! Raider power ${raidPower} vs base defense ${defense}.`,
      type: "warning",
    });

    if (defense >= raidPower) {
      newLog.push({
        day,
        message: `Base repelled the bandit raid. Ammo used: ${Math.min(resources.ammo, raidPower)}.`,
        type: "success",
      });
      resources.ammo = Math.max(0, resources.ammo - Math.min(resources.ammo, raidPower));
    } else {
      // Lose resources
      const stolenFood = Math.min(resources.food, randInt(rng, 5, 15));
      const stolenWater = Math.min(resources.water, randInt(rng, 5, 15));
      const stolenMats = Math.min(resources.materials, randInt(rng, 5, 15));
      resources.food -= stolenFood;
      resources.water -= stolenWater;
      resources.materials -= stolenMats;
      newLog.push({
        day,
        message: `Bandits broke through! Lost ${stolenFood} food, ${stolenWater} water, ${stolenMats} materials.`,
        type: "danger",
      });
      // Random building damage
      const buildingTypes = Object.keys(buildings) as BuildingType[];
      const target = pick(rng, buildingTypes);
      const dmg = randInt(rng, 10, 30);
      buildings[target].hp = Math.max(0, buildings[target].hp - dmg);
      newLog.push({
        day,
        message: `${BUILDING_DEFS[target].label} took ${dmg} damage.`,
        type: "danger",
      });
    }
  }

  // ---------- 8. Re-cap resources ----------
  resourceCaps = calculateCaps(buildings);
  resources = clampResources(resources, resourceCaps);

  // ---------- 9. Reset roles for next day ----------
  survivors.forEach((s) => {
    if (s.role === "onMission") s.role = "idle";
  });

  // ---------- 10. Game over check ----------
  let gameOver = false;
  let gameOverReason: string | undefined;
  if (survivors.length === 0) {
    gameOver = true;
    gameOverReason = "All your survivors are dead. The wasteland claims another.";
  }

  // ---------- 11. New day ----------
  const nextDay = day + 1;
  newLog.push({
    day: nextDay,
    message: `--- Day ${nextDay} begins ---`,
    type: "info",
  });

  // Keep last 80 log entries
  const trimmedLog = newLog.slice(-80);

  return {
    ...state,
    day: nextDay,
    resources,
    resourceCaps,
    buildings,
    survivors,
    locations,
    missions,
    teams,
    log: trimmedLog,
    gameOver,
    gameOverReason,
  };
}

// ---------- Store ----------
export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  startGame: () => {
    const seed = Math.floor(Math.random() * 1000000);
    const locations = generateWorld(seed);
    set({
      started: true,
      locations,
      day: 1,
    });
  },

  resetGame: () => {
    set(createInitialState());
  },

  upgradeBuilding: (type) => {
    const state = get();
    const building = state.buildings[type];
    if (building.level >= building.maxLevel) return;
    const cost = getUpgradeCost(type, building.level, state.buildings.workshop.level);
    if (!canAfford(state.resources, cost)) return;
    const newResources = subtractCost(state.resources, cost);
    const newBuildings = {
      ...state.buildings,
      [type]: { ...building, level: building.level + 1, maxHp: BUILDING_DEFS[type].baseHp + building.level * 20, hp: building.hp + 20 },
    };
    const newCaps = calculateCaps(newBuildings);
    set({
      resources: clampResources(newResources, newCaps),
      resourceCaps: newCaps,
      buildings: newBuildings,
      log: [
        ...state.log,
        {
          day: state.day,
          message: `${BUILDING_DEFS[type].label} upgraded to level ${building.level + 1}.`,
          type: "success",
        },
      ].slice(-80),
    });
  },

  repairBuilding: (type) => {
    const state = get();
    const building = state.buildings[type];
    if (building.hp >= building.maxHp) return;
    const repairCost = { materials: Math.ceil((building.maxHp - building.hp) / 5) };
    if (!canAfford(state.resources, repairCost)) return;
    const newResources = subtractCost(state.resources, repairCost);
    set({
      resources: newResources,
      buildings: {
        ...state.buildings,
        [type]: { ...building, hp: building.maxHp },
      },
      log: [
        ...state.log,
        {
          day: state.day,
          message: `${BUILDING_DEFS[type].label} repaired.`,
          type: "success",
        },
      ].slice(-80),
    });
  },

  createTeam: (name) => {
    const state = get();
    const maxTeams = Math.max(1, Math.ceil(state.survivors.length / 2));
    if (state.teams.length >= maxTeams) return null;
    const team: Team = {
      id: `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name || `Team ${state.teams.length + 1}`,
      memberIds: [],
      locationId: null,
    };
    set({ teams: [...state.teams, team] });
    return team.id;
  },

  deleteTeam: (teamId) => {
    const state = get();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return;
    // unassign survivors
    const survivors = state.survivors.map((s) =>
      team.memberIds.includes(s.id)
        ? { ...s, assignedTeamId: undefined, role: "idle" as const }
        : s
    );
    set({
      teams: state.teams.filter((t) => t.id !== teamId),
      survivors,
    });
  },

  assignSurvivorToTeam: (survivorId, teamId) => {
    const state = get();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return;
    const survivor = state.survivors.find((s) => s.id === survivorId);
    if (!survivor) return;
    if (survivor.health < 30) return; // too injured
    if (team.memberIds.includes(survivorId)) return;
    const maxSize = getMaxTeamSize(state.buildings.barracks.level);
    if (team.memberIds.length >= maxSize) return;

    // remove from other team
    const teams = state.teams.map((t) => ({
      ...t,
      memberIds: t.memberIds.filter((id) => id !== survivorId),
    }));
    const targetTeam = teams.find((t) => t.id === teamId);
    if (targetTeam) targetTeam.memberIds.push(survivorId);

    const survivors = state.survivors.map((s) =>
      s.id === survivorId
        ? { ...s, assignedTeamId: teamId, role: "working" as const }
        : s
    );
    set({ teams, survivors });
  },

  unassignSurvivorFromTeam: (survivorId) => {
    const state = get();
    const teams = state.teams.map((t) => ({
      ...t,
      memberIds: t.memberIds.filter((id) => id !== survivorId),
    }));
    const survivors = state.survivors.map((s) =>
      s.id === survivorId
        ? { ...s, assignedTeamId: undefined, role: "idle" as const }
        : s
    );
    set({ teams, survivors });
  },

  assignTeamToLocation: (teamId, locationId) => {
    const state = get();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team || team.memberIds.length === 0) return;
    const location = state.locations.find((l) => l.id === locationId);
    if (!location) return;

    // create pending mission
    const mission: Mission = {
      id: `mission_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      teamId,
      team: [...team.memberIds],
      locationId,
      status: "pending",
    };

    const teams = state.teams.map((t) =>
      t.id === teamId ? { ...t, locationId } : t
    );

    set({
      teams,
      missions: [...state.missions, mission],
      log: [
        ...state.log,
        {
          day: state.day,
          message: `Team "${team.name}" assigned to scout ${location.name}.`,
          type: "info",
        },
      ].slice(-80),
    });
  },

  clearTeamLocation: (teamId) => {
    const state = get();
    const team = state.teams.find((t) => t.id === teamId);
    if (!team || !team.locationId) return;
    // remove pending mission for this team
    const missions = state.missions.filter(
      (m) => !(m.teamId === teamId && m.status === "pending")
    );
    const teams = state.teams.map((t) =>
      t.id === teamId ? { ...t, locationId: null } : t
    );
    set({ teams, missions });
  },

  setSurvivorResting: (survivorId, resting) => {
    const state = get();
    const survivors = state.survivors.map((s) => {
      if (s.id !== survivorId) return s;
      return {
        ...s,
        role: resting ? ("resting" as const) : ("idle" as const),
        assignedTeamId: undefined,
      };
    });
    const teams = state.teams.map((t) => ({
      ...t,
      memberIds: t.memberIds.filter((id) => id !== survivorId),
    }));
    set({ survivors, teams });
  },

  endDay: () => {
    set((state) => processEndDay(state));
  },
}));

// ---------- Selectors ----------
export function selectTeamSize(state: GameState): number {
  return getMaxTeamSize(state.buildings.barracks.level);
}

export function selectSurvivorCapacity(state: GameState): number {
  return getSurvivorCapacity(state.buildings.shelter.level);
}
