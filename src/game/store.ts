"use client";

import { create } from "zustand";
import {
  Area,
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
  Transfer,
} from "./types";
import {
  AREA_TYPE_DEFS,
  BUILDING_DEFS,
  ENEMY_INFO,
  getNeighborHexes,
  getSurvivorCapacity,
  getMaxTeamSize,
  getUpgradeCost,
  INITIAL_RESOURCE_CAPS,
  INITIAL_RESOURCES,
  LOCATION_DEFS,
} from "./data";
import {
  generateAreaLocations,
  generateSurvivor,
  generateWorld,
  makeRng,
  pick,
  randInt,
} from "./worldGen";

// ---------- Helpers ----------
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

function emptyBuildings(): Record<BuildingType, Building> {
  const out = {} as Record<BuildingType, Building>;
  (Object.keys(BUILDING_DEFS) as BuildingType[]).forEach((type) => {
    const def = BUILDING_DEFS[type];
    out[type] = {
      type,
      level: 0,
      maxLevel: def.maxLevel,
      hp: 0,
      maxHp: def.baseHp,
    };
  });
  return out;
}

// Baseless areas get a small cap so they can temporarily hold scavenged resources.
const BASELESS_CAPS: Resources = {
  food: 20,
  water: 20,
  materials: 20,
  medicine: 10,
  fuel: 10,
  ammo: 10,
};

function calculateCaps(area: Area): Resources {
  if (!area.hasBase) return { ...BASELESS_CAPS };
  const base = { ...INITIAL_RESOURCE_CAPS };
  const storageLevel = area.buildings.storage.level;
  (Object.keys(base) as ResourceType[]).forEach((k) => {
    base[k] += storageLevel * 50;
  });
  return base;
}

// ---------- Initial State ----------
function createInitialState(): GameState {
  const starter = generateSurvivor(1);
  starter.role = "idle";
  return {
    day: 1,
    started: false,
    areas: {},
    currentAreaId: "",
    survivors: { [starter.id]: starter },
    transfers: [],
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

  // area navigation
  setCurrentArea: (areaId: string) => void;
  travelToArea: (areaId: string, survivorIds: string[]) => void;
  claimBase: (areaId: string, locationId: string) => void;

  // resource transfer between areas
  transferResources: (
    fromAreaId: string,
    toAreaId: string,
    resources: Partial<Resources>
  ) => void;

  // building actions (operate on current area)
  upgradeBuilding: (type: BuildingType) => void;
  repairBuilding: (type: BuildingType) => void;

  // team actions (operate on current area)
  createTeam: (name: string) => string | null;
  deleteTeam: (teamId: string) => void;
  assignSurvivorToTeam: (survivorId: string, teamId: string) => void;
  unassignSurvivorFromTeam: (survivorId: string) => void;
  assignTeamToLocation: (teamId: string, locationId: string) => void;
  assignTeamToSalvage: (teamId: string, locationId: string) => void;
  clearTeamLocation: (teamId: string) => void;
  autoAssignSurvivors: () => void;

  // survivor actions (operate on current area)
  setSurvivorResting: (survivorId: string, resting: boolean) => void;

  // main loop
  endDay: () => void;
}

// ---------- Resolve a scout Mission (combat + loot) ----------
function resolveMission(
  mission: Mission,
  survivors: Survivor[],
  location: GameLocation,
  day: number
): { result: MissionResult; log: GameLogEntry[] } {
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
      result.success = true;
      result.log.push(
        `Victory! Team combat ${teamCombat.toFixed(1)} vs enemy ${enemyPower.toFixed(1)}.`
      );
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
      const halfLoot: Partial<Resources> = {};
      for (const [k, v] of Object.entries(location.loot)) {
        halfLoot[k as ResourceType] = Math.floor((v as number) * 0.4);
      }
      result.lootGained = halfLoot;
    }
  } else {
    result.log.push(`No hostiles at ${location.name}.`);
  }

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

  location.explored = true;
  if (result.success) {
    location.cleared = true;
    location.enemyCount = 0;
  }

  result.log.forEach((msg) =>
    log.push({
      day,
      message: msg,
      type: msg.includes("killed")
        ? "danger"
        : msg.includes("injured") || msg.includes("Defeat")
        ? "warning"
        : msg.includes("Victory") ||
          msg.includes("Salvaged") ||
          msg.includes("Found")
        ? "success"
        : "info",
    })
  );

  return { result, log };
}

// ---------- Process a single area for the day ----------
function processArea(
  area: Area,
  allSurvivors: Record<string, Survivor>,
  day: number,
  newLog: GameLogEntry[]
): { survivorsDied: string[] } {
  const survivorsDied: string[] = [];

  if (!area.hasBase && area.survivorIds.length === 0 && area.missions.length === 0) {
    return { survivorsDied };
  }

  const areaSurvivors = area.survivorIds
    .map((id) => allSurvivors[id])
    .filter((s) => s !== undefined);
  let resources = { ...area.resources };

  newLog.push({
    day,
    message: `--- ${area.name} (Day ${day}) ---`,
    type: "info",
  });

  // ---------- 1. Resolve pending missions ----------
  area.missions = area.missions.map((m) => {
    if (m.status !== "pending") return m;
    const location = area.locations.find((l) => l.id === m.locationId);
    if (!location) return { ...m, status: "completed" as const };

    const teamSurvivors = m.team
      .map((id) => allSurvivors[id])
      .filter((s) => s !== undefined);

    if (m.missionType !== "salvage") {
      teamSurvivors.forEach((s) => {
        s.role = "onMission";
      });
    }

    // -------- Salvage mission --------
    if (m.missionType === "salvage") {
      const salvageRng = makeRng(
        m.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + day * 7919
      );
      const totalScavenge = teamSurvivors.reduce(
        (sum, s) => sum + s.skills.scavenging,
        0
      );
      const salvageWork = totalScavenge + teamSurvivors.length * 2;
      const poolEntries = Object.entries(location.salvagePool).filter(
        ([, v]) => (v as number) > 0
      ) as [ResourceType, number][];

      const lootGained: Partial<Resources> = {};
      let depletedThisRun = false;

      if (poolEntries.length === 0) {
        location.salvageDepleted = true;
        depletedThisRun = true;
      } else {
        const hasMaterials = poolEntries.some(([k]) => k === "materials");
        const otherEntries = poolEntries.filter(([k]) => k !== "materials");
        const allocations: [ResourceType, number][] = [];
        if (hasMaterials) {
          allocations.push(["materials", salvageWork * 0.5]);
        }
        if (otherEntries.length > 0) {
          const perType = (salvageWork * (hasMaterials ? 0.5 : 1)) / otherEntries.length;
          for (const [k] of otherEntries) {
            allocations.push([k, perType]);
          }
        }
        for (const [k, work] of allocations) {
          const remaining = location.salvagePool[k] ?? 0;
          if (remaining <= 0) continue;
          const yield_ = Math.max(1, Math.round(work * (0.8 + salvageRng() * 0.4)));
          const extracted = Math.min(remaining, yield_);
          location.salvagePool[k] = remaining - extracted;
          lootGained[k] = extracted;
        }
        const totalRemaining = Object.values(location.salvagePool).reduce(
          (sum, v) => sum + (v as number),
          0
        );
        if (totalRemaining <= 0) {
          location.salvageDepleted = true;
          depletedThisRun = true;
        }
        const lootSummary = Object.entries(lootGained)
          .filter(([, v]) => (v as number) > 0)
          .map(([k, v]) => `${v} ${k}`)
          .join(", ");
        if (lootSummary) {
          newLog.push({
            day,
            message: `[${area.name}] Salvaged: ${lootSummary}.`,
            type: "success",
          });
        }
        if (depletedThisRun) {
          newLog.push({
            day,
            message: `[${area.name}] ${location.name} fully salvaged.`,
            type: "warning",
          });
        }
      }

      for (const [k, v] of Object.entries(lootGained)) {
        resources[k as ResourceType] += v as number;
      }

      if (depletedThisRun) {
        teamSurvivors.forEach((s) => {
          s.role = "idle";
          s.assignedTeamId = undefined;
        });
        const team = area.teams.find((t) => t.id === m.teamId);
        if (team) team.locationId = null;
        return { ...m, status: "completed" as const };
      }
      return m; // stays pending
    }

    // -------- Scout mission --------
    const { result, log } = resolveMission(m, teamSurvivors, location, day);
    newLog.push(...log);

    for (const [k, v] of Object.entries(result.lootGained)) {
      resources[k as ResourceType] += v as number;
    }

    result.casualties.forEach((id) => survivorsDied.push(id));
    result.survivorsRecruited.forEach((ns) => {
      allSurvivors[ns.id] = ns;
      area.survivorIds.push(ns.id);
    });

    teamSurvivors.forEach((s) => {
      const updated = allSurvivors[s.id];
      if (updated) {
        updated.role = "idle";
        updated.assignedTeamId = undefined;
      }
    });

    const team = area.teams.find((t) => t.id === m.teamId);
    if (team) team.locationId = null;

    return { ...m, status: "completed" as const, result };
  });

  area.missions = area.missions.filter((m) => m.status === "pending");

  // ---------- 2. Building production ----------
  if (area.hasBase) {
    const farmFood = area.buildings.farm.level * 5;
    const wellWater = area.buildings.well.level * 5;
    if (farmFood > 0) {
      resources.food += farmFood;
      newLog.push({ day, message: `[${area.name}] Farm produced ${farmFood} food.`, type: "success" });
    }
    if (wellWater > 0) {
      resources.water += wellWater;
      newLog.push({ day, message: `[${area.name}] Well produced ${wellWater} water.`, type: "success" });
    }
  }

  // ---------- 3. Survivor consumption ----------
  const consumption = areaSurvivors.length;
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
    newLog.push({ day, message: `[${area.name}] Food shortage! ${foodShortage} survivors go hungry.`, type: "warning" });
  } else if (consumption > 0) {
    newLog.push({ day, message: `[${area.name}] Survivors consumed ${foodNeeded} food and ${waterNeeded} water.`, type: "info" });
  }
  if (waterShortage > 0) {
    newLog.push({ day, message: `[${area.name}] Water shortage! ${waterShortage} survivors are dehydrated.`, type: "warning" });
  }

  // ---------- 4. Update survivor stats ----------
  areaSurvivors.forEach((s) => {
    if (foodShortage === 0 && s.role !== "onMission") {
      s.hunger = Math.max(0, s.hunger - 30);
    } else if (s.role === "onMission") {
      s.hunger = Math.min(100, s.hunger + 10);
    } else {
      s.hunger = Math.min(100, s.hunger + 25);
      s.health = Math.max(0, s.health - 5);
    }

    if (waterShortage === 0 && s.role !== "onMission") {
      s.thirst = Math.max(0, s.thirst - 35);
    } else if (s.role === "onMission") {
      s.thirst = Math.min(100, s.thirst + 15);
    } else {
      s.thirst = Math.min(100, s.thirst + 30);
      s.health = Math.max(0, s.health - 8);
    }

    if (s.hunger >= 90) {
      s.health = Math.max(0, s.health - 8);
      newLog.push({ day, message: `[${area.name}] ${s.name} is starving.`, type: "warning" });
    }
    if (s.thirst >= 90) {
      s.health = Math.max(0, s.health - 10);
      newLog.push({ day, message: `[${area.name}] ${s.name} is severely dehydrated.`, type: "warning" });
    }

    if (s.role === "resting") {
      s.morale = Math.min(100, s.morale + 10);
      s.health = Math.min(100, s.health + 5);
    }
    if (s.health < 30) {
      s.morale = Math.max(0, s.morale - 5);
    }
  });

  // ---------- 5. Healing ----------
  if (area.hasBase && area.buildings.infirmary.level > 0) {
    const heal = area.buildings.infirmary.level * 10;
    areaSurvivors.forEach((s) => {
      if (s.status !== "healthy" && s.health < 100) {
        if (resources.medicine >= 1) {
          resources.medicine -= 1;
          s.health = Math.min(100, s.health + heal);
          if (s.health >= 70) s.status = "healthy";
          else if (s.health >= 40 && s.status === "critical") s.status = "injured";
          newLog.push({ day, message: `[${area.name}] ${s.name} treated at infirmary (+${heal} HP).`, type: "success" });
        }
      }
    });
  } else {
    areaSurvivors.forEach((s) => {
      if (s.status !== "healthy" && s.health < 100) {
        const naturalHeal = 3;
        s.health = Math.min(100, s.health + naturalHeal);
        if (s.health >= 70) s.status = "healthy";
        else if (s.health >= 40 && s.status === "critical") s.status = "injured";
      }
    });
  }

  // Update status
  areaSurvivors.forEach((s) => {
    if (s.health <= 0) {
      // dead
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
  areaSurvivors.forEach((s) => {
    if (s.health <= 0) {
      survivorsDied.push(s.id);
      newLog.push({ day, message: `[${area.name}] ${s.name} has died.`, type: "danger" });
    }
  });
  area.survivorIds = area.survivorIds.filter((id) => {
    const s = allSurvivors[id];
    return s && s.health > 0;
  });

  // ---------- 7. Random bandit raid ----------
  if (area.hasBase) {
    const rng = makeRng(day * 9973 + 7 + area.hex[0] * 31 + area.hex[1] * 17);
    if (day > 2 && rng() < 0.2) {
      const raidPower = randInt(rng, 2, 4) + Math.floor(day / 3);
      const defense =
        area.buildings.watchtower.level * 15 +
        areaSurvivors
          .filter((s) => s.role === "idle")
          .reduce((sum, s) => sum + s.skills.combat * 2, 0);

      if (defense >= raidPower) {
        resources.ammo = Math.max(0, resources.ammo - Math.min(resources.ammo, raidPower));
        newLog.push({ day, message: `[${area.name}] Bandit raid repelled.`, type: "success" });
      } else {
        const stolenFood = Math.min(resources.food, randInt(rng, 5, 15));
        const stolenWater = Math.min(resources.water, randInt(rng, 5, 15));
        const stolenMats = Math.min(resources.materials, randInt(rng, 5, 15));
        resources.food -= stolenFood;
        resources.water -= stolenWater;
        resources.materials -= stolenMats;
        newLog.push({ day, message: `[${area.name}] Bandits broke through! Lost ${stolenFood} food, ${stolenWater} water, ${stolenMats} materials.`, type: "danger" });
      }
    }
  }

  // ---------- 8. Re-cap & save ----------
  area.resourceCaps = calculateCaps(area);
  area.resources = clampResources(resources, area.resourceCaps);

  // Reset onMission survivors to idle
  areaSurvivors.forEach((s) => {
    if (s.role === "onMission") s.role = "idle";
  });

  return { survivorsDied };
}

// ---------- Process transfers for the day ----------
function processTransfers(
  state: GameState,
  day: number,
  newLog: GameLogEntry[]
): Transfer[] {
  const remaining: Transfer[] = [];
  for (const transfer of state.transfers) {
    if (transfer.arrivalDay <= day) {
      // Arrived
      const destArea = state.areas[transfer.toAreaId];
      if (destArea) {
        // If area is undiscovered, discover it now
        if (!destArea.discovered) {
          destArea.discovered = true;
          destArea.locations = generateAreaLocations(
            destArea.id,
            destArea.type,
            day * 1000 + destArea.hex[0] * 100 + destArea.hex[1]
          );
          newLog.push({
            day,
            message: `${destArea.name} has been discovered!`,
            type: "success",
          });
        }
        // Add survivors to destination area
        for (const sid of transfer.survivorIds) {
          if (!destArea.survivorIds.includes(sid)) {
            destArea.survivorIds.push(sid);
          }
          // Reset their role
          const s = state.survivors[sid];
          if (s) {
            s.role = "idle";
            s.assignedTeamId = undefined;
          }
        }
        // Add resources
        for (const [k, v] of Object.entries(transfer.resources)) {
          destArea.resources[k as ResourceType] += v as number;
        }
        destArea.resourceCaps = calculateCaps(destArea);
        destArea.resources = clampResources(destArea.resources, destArea.resourceCaps);

        const survNames = transfer.survivorIds
          .map((id) => state.survivors[id]?.name)
          .filter(Boolean)
          .join(", ");
        newLog.push({
          day,
          message: `Travelers arrived at ${destArea.name}${survNames ? `: ${survNames}` : ""}.`,
          type: "info",
        });
      }
    } else {
      remaining.push(transfer);
    }
  }
  return remaining;
}

// ---------- Store ----------
export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  startGame: () => {
    const seed = Math.floor(Math.random() * 1000000);
    const { areas, startAreaId } = generateWorld(seed);
    const starter = Object.values(get().survivors)[0];
    if (starter) {
      areas[startAreaId].survivorIds.push(starter.id);
    }
    set({
      started: true,
      areas,
      currentAreaId: startAreaId,
      day: 1,
    });
  },

  resetGame: () => {
    set(createInitialState());
  },

  setCurrentArea: (areaId) => {
    const state = get();
    if (state.areas[areaId] && state.areas[areaId].discovered) {
      set({ currentAreaId: areaId });
    }
  },

  travelToArea: (areaId, survivorIds) => {
    const state = get();
    const fromArea = state.areas[state.currentAreaId];
    const toArea = state.areas[areaId];
    if (!fromArea || !toArea) return;

    // Check adjacency
    const neighbors = getNeighborHexes(fromArea.hex);
    const isNeighbor = neighbors.some(([q, r]) => q === toArea.hex[0] && r === toArea.hex[1]);
    if (!isNeighbor) return;

    // Validate survivors are in the from area
    const validSurvivors = survivorIds.filter((id) => fromArea.survivorIds.includes(id));
    if (validSurvivors.length === 0) return;

    // Remove survivors from source area
    fromArea.survivorIds = fromArea.survivorIds.filter((id) => !validSurvivors.includes(id));

    // Remove from any teams in source area
    fromArea.teams = fromArea.teams.map((t) => ({
      ...t,
      memberIds: t.memberIds.filter((id) => !validSurvivors.includes(id)),
    }));

    // Set survivors to in-transit
    validSurvivors.forEach((id) => {
      const s = state.survivors[id];
      if (s) {
        s.role = "idle";
        s.assignedTeamId = undefined;
      }
    });

    // Create transfer
    const transfer: Transfer = {
      id: `transfer_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fromAreaId: fromArea.id,
      toAreaId: toArea.id,
      survivorIds: validSurvivors,
      resources: {},
      arrivalDay: state.day + 1,
    };

    set({
      areas: { ...state.areas },
      transfers: [...state.transfers, transfer],
      log: [
        ...state.log,
        {
          day: state.day,
          message: `${validSurvivors.length} survivor(s) sent to ${toArea.name}. They will arrive tomorrow.`,
          type: "info",
        },
      ].slice(-100),
    });
  },

  claimBase: (areaId, locationId) => {
    const state = get();
    const area = state.areas[areaId];
    if (!area || area.hasBase) return;
    const loc = area.locations.find((l) => l.id === locationId);
    if (!loc || !loc.cleared) return;

    area.hasBase = true;
    area.baseLocationId = locationId;
    area.buildings = initialBuildings();
    area.resourceCaps = calculateCaps(area);
    area.resources = clampResources(area.resources, area.resourceCaps);

    set({
      areas: { ...state.areas },
      log: [
        ...state.log,
        {
          day: state.day,
          message: `${area.name} is now your base! Shelter established.`,
          type: "success",
        },
      ].slice(-100),
    });
  },

  transferResources: (fromAreaId, toAreaId, resources) => {
    const state = get();
    const fromArea = state.areas[fromAreaId];
    const toArea = state.areas[toAreaId];
    if (!fromArea || !toArea) return;

    // Check adjacency
    const neighbors = getNeighborHexes(fromArea.hex);
    const isNeighbor = neighbors.some(([q, r]) => q === toArea.hex[0] && r === toArea.hex[1]);
    if (!isNeighbor) return;

    // Validate resources
    const validResources: Partial<Resources> = {};
    for (const [k, v] of Object.entries(resources)) {
      const amount = Math.min(fromArea.resources[k as ResourceType], v as number);
      if (amount > 0) {
        validResources[k as ResourceType] = amount;
        fromArea.resources[k as ResourceType] -= amount;
      }
    }

    if (Object.keys(validResources).length === 0) return;

    const transfer: Transfer = {
      id: `transfer_res_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fromAreaId,
      toAreaId,
      survivorIds: [],
      resources: validResources,
      arrivalDay: state.day + 1,
    };

    set({
      areas: { ...state.areas },
      transfers: [...state.transfers, transfer],
      log: [
        ...state.log,
        {
          day: state.day,
          message: `Resources sent from ${fromArea.name} to ${toArea.name}.`,
          type: "info",
        },
      ].slice(-100),
    });
  },

  upgradeBuilding: (type) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area || !area.hasBase) return;
    const building = area.buildings[type];
    if (building.level >= building.maxLevel) return;
    const cost = getUpgradeCost(type, building.level, area.buildings.workshop.level);
    if (!canAfford(area.resources, cost)) return;
    const newResources = subtractCost(area.resources, cost);
    area.buildings = {
      ...area.buildings,
      [type]: {
        ...building,
        level: building.level + 1,
        maxHp: BUILDING_DEFS[type].baseHp + building.level * 20,
        hp: building.hp + 20,
      },
    };
    area.resources = clampResources(newResources, calculateCaps(area));
    area.resourceCaps = calculateCaps(area);
    set({
      areas: { ...state.areas },
      log: [
        ...state.log,
        {
          day: state.day,
          message: `[${area.name}] ${BUILDING_DEFS[type].label} upgraded to level ${building.level + 1}.`,
          type: "success",
        },
      ].slice(-100),
    });
  },

  repairBuilding: (type) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area || !area.hasBase) return;
    const building = area.buildings[type];
    if (building.hp >= building.maxHp) return;
    const repairCost = { materials: Math.ceil((building.maxHp - building.hp) / 5) };
    if (!canAfford(area.resources, repairCost)) return;
    area.resources = subtractCost(area.resources, repairCost);
    area.buildings = {
      ...area.buildings,
      [type]: { ...building, hp: building.maxHp },
    };
    set({
      areas: { ...state.areas },
      log: [
        ...state.log,
        {
          day: state.day,
          message: `[${area.name}] ${BUILDING_DEFS[type].label} repaired.`,
          type: "success",
        },
      ].slice(-100),
    });
  },

  createTeam: (name) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area || !area.hasBase) return null;
    const maxTeams = Math.max(3, area.survivorIds.length);
    if (area.teams.length >= maxTeams) return null;
    const team: Team = {
      id: `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name || `Team ${String.fromCharCode(65 + area.teams.length)}`,
      memberIds: [],
      locationId: null,
    };
    area.teams = [...area.teams, team];
    set({ areas: { ...state.areas } });
    return team.id;
  },

  deleteTeam: (teamId) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const team = area.teams.find((t) => t.id === teamId);
    if (!team) return;
    team.memberIds.forEach((id) => {
      const s = state.survivors[id];
      if (s) {
        s.assignedTeamId = undefined;
        s.role = "idle";
      }
    });
    area.teams = area.teams.filter((t) => t.id !== teamId);
    set({ areas: { ...state.areas } });
  },

  assignSurvivorToTeam: (survivorId, teamId) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const team = area.teams.find((t) => t.id === teamId);
    if (!team) return;
    const survivor = state.survivors[survivorId];
    if (!survivor) return;
    if (survivor.health < 30) return;
    if (team.memberIds.includes(survivorId)) return;
    const maxSize = getMaxTeamSize(area.buildings.barracks.level);
    if (team.memberIds.length >= maxSize) return;

    area.teams = area.teams.map((t) => ({
      ...t,
      memberIds: t.memberIds.filter((id) => id !== survivorId),
    }));
    const targetTeam = area.teams.find((t) => t.id === teamId);
    if (targetTeam) targetTeam.memberIds.push(survivorId);
    survivor.assignedTeamId = teamId;
    survivor.role = "working";
    set({ areas: { ...state.areas } });
  },

  unassignSurvivorFromTeam: (survivorId) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    area.teams = area.teams.map((t) => ({
      ...t,
      memberIds: t.memberIds.filter((id) => id !== survivorId),
    }));
    const survivor = state.survivors[survivorId];
    if (survivor) {
      survivor.assignedTeamId = undefined;
      survivor.role = "idle";
    }
    set({ areas: { ...state.areas } });
  },

  assignTeamToLocation: (teamId, locationId) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const team = area.teams.find((t) => t.id === teamId);
    if (!team || team.memberIds.length === 0) return;
    const location = area.locations.find((l) => l.id === locationId);
    if (!location) return;
    if (location.cleared) return; // use salvage for cleared

    const teamHasPending = area.missions.some(
      (m) => m.teamId === teamId && m.status === "pending"
    );
    if (teamHasPending) return;

    const mission: Mission = {
      id: `mission_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      teamId,
      team: [...team.memberIds],
      locationId,
      status: "pending",
      missionType: "scout",
    };
    area.teams = area.teams.map((t) =>
      t.id === teamId ? { ...t, locationId } : t
    );
    area.missions = [...area.missions, mission];
    set({
      areas: { ...state.areas },
      log: [
        ...state.log,
        {
          day: state.day,
          message: `[${area.name}] Team "${team.name}" assigned to scout ${location.name}.`,
          type: "info",
        },
      ].slice(-100),
    });
  },

  assignTeamToSalvage: (teamId, locationId) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const team = area.teams.find((t) => t.id === teamId);
    if (!team || team.memberIds.length === 0) return;
    const location = area.locations.find((l) => l.id === locationId);
    if (!location || !location.cleared || location.salvageDepleted) return;

    const teamHasPending = area.missions.some(
      (m) => m.teamId === teamId && m.status === "pending"
    );
    if (teamHasPending) return;

    const mission: Mission = {
      id: `salvage_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      teamId,
      team: [...team.memberIds],
      locationId,
      status: "pending",
      missionType: "salvage",
    };
    area.teams = area.teams.map((t) =>
      t.id === teamId ? { ...t, locationId } : t
    );
    area.missions = [...area.missions, mission];
    set({
      areas: { ...state.areas },
      log: [
        ...state.log,
        {
          day: state.day,
          message: `[${area.name}] Team "${team.name}" assigned to salvage ${location.name}.`,
          type: "info",
        },
      ].slice(-100),
    });
  },

  clearTeamLocation: (teamId) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const team = area.teams.find((t) => t.id === teamId);
    if (!team || !team.locationId) return;
    area.missions = area.missions.filter(
      (m) => !(m.teamId === teamId && m.status === "pending")
    );
    area.teams = area.teams.map((t) =>
      t.id === teamId ? { ...t, locationId: null } : t
    );
    set({ areas: { ...state.areas } });
  },

  setSurvivorResting: (survivorId, resting) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const survivor = state.survivors[survivorId];
    if (!survivor) return;
    survivor.role = resting ? "resting" : "idle";
    survivor.assignedTeamId = undefined;
    area.teams = area.teams.map((t) => ({
      ...t,
      memberIds: t.memberIds.filter((id) => id !== survivorId),
    }));
    set({ areas: { ...state.areas } });
  },

  autoAssignSurvivors: () => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area || !area.hasBase) return;
    const available = area.survivorIds
      .map((id) => state.survivors[id])
      .filter((s) => s && (s.role === "idle" || s.role === "resting"));
    if (available.length === 0) return;

    let teams = [...area.teams].sort((a, b) => a.memberIds.length - b.memberIds.length);
    const maxSize = getMaxTeamSize(area.buildings.barracks.level);

    for (const survivor of available) {
      let target = teams.find((t) => t.memberIds.length < maxSize);
      if (!target) {
        const maxTeamsCount = Math.max(3, area.survivorIds.length);
        if (teams.length >= maxTeamsCount) break;
        const newName = `Team ${String.fromCharCode(65 + teams.length)}`;
        const newId = get().createTeam(newName);
        if (!newId) break;
        const updated = get().areas[area.id].teams;
        target = updated.find((t) => t.id === newId);
        if (!target) break;
        teams = [...updated].sort((a, b) => a.memberIds.length - b.memberIds.length);
      }
      get().assignSurvivorToTeam(survivor.id, target.id);
      teams = [...get().areas[area.id].teams].sort(
        (a, b) => a.memberIds.length - b.memberIds.length
      );
    }
  },

  endDay: () => {
    set((state) => {
      const newLog: GameLogEntry[] = [...state.log];
      const day = state.day;
      const nextDay = day + 1;
      const allSurvivors = { ...state.survivors };

      newLog.push({ day, message: `=== Day ${day} ===`, type: "info" });

      // Process transfers (arrivals) — transfers with arrivalDay <= nextDay arrive now.
      // A transfer created on day N has arrivalDay = N+1, so it arrives at the end of
      // the End Day that advances to day N+1.
      const remainingTransfers = processTransfers(state, nextDay, newLog);

      // Process each discovered area
      const allDied: string[] = [];
      for (const area of Object.values(state.areas)) {
        if (!area.discovered) continue;
        const { survivorsDied } = processArea(area, allSurvivors, day, newLog);
        allDied.push(...survivorsDied);
      }

      // Remove dead survivors from global record
      for (const id of allDied) {
        delete allSurvivors[id];
      }

      // Check game over
      let gameOver = false;
      let gameOverReason: string | undefined;
      const allSurvivorIds = Object.keys(allSurvivors);
      if (allSurvivorIds.length === 0) {
        gameOver = true;
        gameOverReason = "All your survivors are dead. The wasteland claims another.";
      }

      newLog.push({ day: nextDay, message: `=== Day ${nextDay} ===`, type: "info" });

      return {
        ...state,
        day: nextDay,
        areas: { ...state.areas },
        survivors: allSurvivors,
        transfers: remainingTransfers,
        log: newLog.slice(-120),
        gameOver,
        gameOverReason,
      };
    });
  },
}));

// ---------- Selectors ----------
export function selectSurvivorCapacity(area: Area | undefined): number {
  if (!area || !area.hasBase) return 99;
  return getSurvivorCapacity(area.buildings.shelter.level);
}
