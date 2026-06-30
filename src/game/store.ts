"use client";

import { create } from "zustand";
import {
  Area,
  Building,
  BuildingType,
  GameLocation,
  GameLogEntry,
  GameState,
  MapFloaterEvent,
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
  getLocationEnemyPower,
  getTeamCombatPower,
  getBaseDefense,
  getAreaConsumption,
  getSurvivorDailyRations,
  getRestHealAmount,
  NATURAL_HEAL_PER_DAY,
  getNeighborHexes,
  getSurvivorCapacity,
  getMaxTeamSize,
  getUpgradeCost,
  INITIAL_RESOURCE_CAPS,
  INITIAL_RESOURCES,
  LOCATION_DEFS,
  RESOURCE_ORDER,
} from "./data";
import { buildLastNightReport } from "./nightReport";
import {
  expandWorldAroundHex,
  generateAreaLocations,
  generateSurvivor,
  generateWorld,
  makeRng,
  pick,
  randInt,
} from "./worldGen";

// ---------- Helpers ----------
function getPendingMissionSurvivorIds(area: Area): Set<string> {
  const ids = new Set<string>();
  for (const m of area.missions) {
    if (m.status === "pending") {
      for (const id of m.team) ids.add(id);
    }
  }
  return ids;
}

export function isSurvivorAvailableForDispatch(
  area: Area,
  survivor: Survivor,
  pendingIds?: Set<string>
): boolean {
  if (!area.survivorIds.includes(survivor.id)) return false;
  if (survivor.health < 30) return false;
  if (
    survivor.role === "resting" ||
    survivor.role === "onMission" ||
    survivor.role === "guarding"
  )
    return false;
  const pending = pendingIds ?? getPendingMissionSurvivorIds(area);
  return !pending.has(survivor.id);
}

function locationHasPendingMission(area: Area, locationId: string): boolean {
  return area.missions.some(
    (m) => m.locationId === locationId && m.status === "pending"
  );
}

function setSurvivorsOnMission(
  survivors: Record<string, Survivor>,
  survivorIds: string[]
): Record<string, Survivor> {
  const out = { ...survivors };
  for (const id of survivorIds) {
    const s = out[id];
    if (s) out[id] = { ...s, role: "onMission" };
  }
  return out;
}

function locationNeedsWork(area: Area, location: GameLocation): boolean {
  if (area.baseLocationId === location.id) return false;
  if (!location.cleared) return true;
  return !location.salvageDepleted;
}

/** Cleared locations that still have salvage — auto-dispatch targets these only. */
function locationsNeedingSalvage(area: Area): GameLocation[] {
  return area.locations.filter(
    (loc) =>
      area.baseLocationId !== loc.id &&
      loc.cleared &&
      !loc.salvageDepleted
  );
}

function locationsNeedingWork(area: Area): GameLocation[] {
  return area.locations
    .filter((loc) => locationNeedsWork(area, loc))
    .sort((a, b) => {
      if (!a.cleared && b.cleared) return -1;
      if (a.cleared && !b.cleared) return 1;
      if (!a.cleared && !b.cleared) return a.dangerLevel - b.dangerLevel;
      return 0;
    });
}

function findOrCreateMissionTeam(
  area: Area,
  survivorCount: number
): Team | null {
  const maxTeamSize = getMaxTeamSize(area.buildings.barracks.level);
  const maxTeams = Math.max(3, area.survivorIds.length);

  const reusable = area.teams.find(
    (t) =>
      t.memberIds.length === 0 &&
      !area.missions.some((m) => m.teamId === t.id && m.status === "pending")
  );
  if (reusable) return reusable;

  if (area.teams.length < maxTeams) {
    return {
      id: `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: `Team ${String.fromCharCode(65 + area.teams.length)}`,
      memberIds: [],
      locationId: null,
    };
  }

  return (
    area.teams.find(
      (t) =>
        t.memberIds.length + survivorCount <= maxTeamSize &&
        !area.missions.some((m) => m.teamId === t.id && m.status === "pending")
    ) ?? null
  );
}

function assignSurvivorToTeamInArea(
  area: Area,
  allSurvivors: Record<string, Survivor>,
  survivorId: string,
  teamId: string
): boolean {
  const team = area.teams.find((t) => t.id === teamId);
  const survivor = allSurvivors[survivorId];
  if (!team || !survivor) return false;
  if (survivor.health < 30) return false;
  if (team.memberIds.includes(survivorId)) return false;
  const maxSize = getMaxTeamSize(area.buildings.barracks.level);
  if (team.memberIds.length >= maxSize) return false;

  survivor.assignedTeamId = teamId;
  survivor.role = "working";
  area.teams = area.teams.map((t) => ({
    ...t,
    memberIds: [
      ...t.memberIds.filter((id) => id !== survivorId),
      ...(t.id === teamId ? [survivorId] : []),
    ],
  }));
  return true;
}

function dispatchSurvivorsToLocationInArea(
  area: Area,
  allSurvivors: Record<string, Survivor>,
  survivorIds: string[],
  locationId: string
): boolean {
  const location = area.locations.find((l) => l.id === locationId);
  if (!location || !locationNeedsWork(area, location)) return false;
  if (locationHasPendingMission(area, locationId)) return false;

  const pendingMissionSurvivors = getPendingMissionSurvivorIds(area);
  const validSurvivors = survivorIds.filter((id) => {
    const s = allSurvivors[id];
    return (
      s && isSurvivorAvailableForDispatch(area, s, pendingMissionSurvivors)
    );
  });
  if (validSurvivors.length === 0) return false;

  let team = findOrCreateMissionTeam(area, validSurvivors.length);
  if (!team) return false;

  const teamExists = area.teams.some((t) => t.id === team!.id);
  if (!teamExists) {
    area.teams = [...area.teams, team];
  }

  for (const sid of validSurvivors) {
    if (!assignSurvivorToTeamInArea(area, allSurvivors, sid, team.id)) {
      return false;
    }
  }

  const updatedTeam = area.teams.find((t) => t.id === team!.id);
  if (!updatedTeam || updatedTeam.memberIds.length === 0) return false;

  const isSalvage = location.cleared && !location.salvageDepleted;
  const mission: Mission = {
    id: `${isSalvage ? "salvage" : "mission"}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    teamId: updatedTeam.id,
    team: [...updatedTeam.memberIds],
    locationId,
    status: "pending",
    missionType: isSalvage ? "salvage" : "scout",
  };

  area.teams = area.teams.map((t) =>
    t.id === updatedTeam.id ? { ...t, locationId } : t
  );
  area.missions = [...area.missions, mission];

  for (const id of updatedTeam.memberIds) {
    const s = allSurvivors[id];
    if (s) s.role = "onMission";
  }

  return true;
}

function autoDispatchIdleSurvivors(
  area: Area,
  allSurvivors: Record<string, Survivor>,
  day: number,
  newLog: GameLogEntry[]
): void {
  const maxTeamSize = getMaxTeamSize(area.buildings.barracks.level);
  for (const location of locationsNeedingSalvage(area)) {
    if (locationHasPendingMission(area, location.id)) continue;

    const pendingIds = getPendingMissionSurvivorIds(area);
    const available = area.survivorIds
      .map((id) => allSurvivors[id])
      .filter(
        (s): s is Survivor =>
          s !== undefined && isSurvivorAvailableForDispatch(area, s, pendingIds)
      );

    if (available.length === 0) break;

    const assigned = available.slice(0, maxTeamSize);
    const dispatched = dispatchSurvivorsToLocationInArea(
      area,
      allSurvivors,
      assigned.map((s) => s.id),
      location.id
    );

    if (dispatched) {
      newLog.push({
        day,
        message: `[${area.name}] ${assigned.length} survivor(s) auto-dispatched to salvage ${location.name}.`,
        type: "info",
      });
    }
  }
}

function applySurvivorGuardRole(
  area: Area,
  allSurvivors: Record<string, Survivor>,
  survivorId: string,
  guarding: boolean
): void {
  const survivor = allSurvivors[survivorId];
  if (!survivor) return;
  allSurvivors[survivorId] = {
    ...survivor,
    role: guarding ? "guarding" : "idle",
    assignedTeamId: undefined,
  };
  area.teams = area.teams.map((t) => ({
    ...t,
    memberIds: t.memberIds.filter((id) => id !== survivorId),
  }));
}

/** When nothing remains to scout/salvage, idle survivors guard the base. */
function autoAssignBaseGuards(
  area: Area,
  allSurvivors: Record<string, Survivor>,
  day: number,
  newLog: GameLogEntry[]
): void {
  if (!area.hasBase || locationsNeedingWork(area).length > 0) return;

  const toGuard = area.survivorIds.filter(
    (id) => allSurvivors[id]?.role === "idle"
  );
  for (const id of toGuard) {
    applySurvivorGuardRole(area, allSurvivors, id, true);
  }
  if (toGuard.length > 0) {
    newLog.push({
      day,
      message: `[${area.name}] ${toGuard.length} idle survivor(s) assigned to guard the base.`,
      type: "info",
    });
  }
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

// ---------- Helper: produce a new areas dict with one area replaced by a fresh clone ----------
// Zustand uses reference equality on the selector result, so mutating an area
// in place is NOT enough to trigger re-renders. Always use this helper to
// publish area changes.
function updateArea(
  state: GameState,
  areaId: string,
  mutate: (area: Area) => void
): Record<string, Area> {
  const oldArea = state.areas[areaId];
  if (!oldArea) return state.areas;
  const newArea: Area = {
    ...oldArea,
    buildings: { ...oldArea.buildings },
    resources: { ...oldArea.resources },
    resourceCaps: { ...oldArea.resourceCaps },
    teams: [...oldArea.teams],
    missions: [...oldArea.missions],
    locations: [...oldArea.locations],
    survivorIds: [...oldArea.survivorIds],
  };
  mutate(newArea);
  return { ...state.areas, [areaId]: newArea };
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
    areaMapFloaters: [],
    areaMapDismissSignal: 0,
    lastNightDay: 0,
    lastNightReport: [],
  };
}

function pushResourceFloater(
  floaters: MapFloaterEvent[],
  opts: {
    id: string;
    areaId: string;
    locationId: string;
    kind: MapFloaterEvent["kind"];
    loot: Partial<Resources>;
  }
): void {
  const lines = RESOURCE_ORDER.flatMap((resource) => {
    const amount = opts.loot[resource] ?? 0;
    return amount > 0 ? [{ resource, amount }] : [];
  });
  if (lines.length === 0) return;
  floaters.push({ ...opts, lines });
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
  // Simplified dispatch: send a set of survivors to a location directly.
  // Creates/reuses a team automatically — the player never manages teams.
  sendSurvivorsToLocation: (
    survivorIds: string[],
    locationId: string
  ) => void;

  // survivor actions (operate on current area)
  setSurvivorResting: (survivorId: string, resting: boolean) => void;
  setSurvivorGuarding: (survivorId: string, guarding: boolean) => void;

  // main loop
  endDay: () => void;
  clearAreaMapFloater: (id: string) => void;
  dismissAreaMapPopups: () => void;
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
    const teamCombat = getTeamCombatPower(teamSurvivors);
    const enemyPower = getLocationEnemyPower(location);

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
  newLog: GameLogEntry[],
  floaters: MapFloaterEvent[]
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

  // Auto-assign salvage work only at End Day processing.
  // These missions are resolved in the same cycle, so they don't block daytime actions.
  autoDispatchIdleSurvivors(area, allSurvivors, day, newLog);

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

      pushResourceFloater(floaters, {
        id: `salvage_${m.id}_${day}`,
        areaId: area.id,
        locationId: location.id,
        kind: "salvage",
        loot: lootGained,
      });

      // Salvage missions are one-cycle tasks: resolve now, then free survivors.
      teamSurvivors.forEach((s) => {
        s.role = "idle";
        s.assignedTeamId = undefined;
      });
      area.teams = area.teams.filter((t) => t.id !== m.teamId);
      return { ...m, status: "completed" as const };
    }

    // -------- Scout mission --------
    const { result, log } = resolveMission(m, teamSurvivors, location, day);
    newLog.push(...log);

    for (const [k, v] of Object.entries(result.lootGained)) {
      resources[k as ResourceType] += v as number;
    }

    pushResourceFloater(floaters, {
      id: `scout_${m.id}_${day}`,
      areaId: area.id,
      locationId: location.id,
      kind: "scout",
      loot: result.lootGained,
    });

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
    area.teams = area.teams.filter((t) => t.id !== m.teamId);

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
  const survivorFed = new Map<string, boolean>();
  let foodConsumed = 0;
  let waterConsumed = 0;
  let unfedCount = 0;

  areaSurvivors.forEach((s) => {
    const { food, water } = getSurvivorDailyRations(s);
    const fed = resources.food >= food && resources.water >= water;
    if (fed) {
      resources.food -= food;
      resources.water -= water;
      foodConsumed += food;
      waterConsumed += water;
    } else {
      unfedCount++;
    }
    survivorFed.set(s.id, fed);
  });

  if (unfedCount > 0) {
    newLog.push({
      day,
      message: `[${area.name}] Ration shortage! ${unfedCount} survivor${unfedCount === 1 ? "" : "s"} went without full rations.`,
      type: "warning",
    });
  } else if (areaSurvivors.length > 0) {
    newLog.push({
      day,
      message: `[${area.name}] Survivors consumed ${foodConsumed} food and ${waterConsumed} water.`,
      type: "info",
    });
  }

  // ---------- 4. Update survivor stats ----------
  const infirmaryLevel = area.hasBase ? area.buildings.infirmary.level : 0;

  areaSurvivors.forEach((s) => {
    const fed = survivorFed.get(s.id) ?? false;

    if (fed && s.role !== "onMission") {
      s.hunger = Math.max(0, s.hunger - 30);
    } else if (s.role === "onMission") {
      s.hunger = Math.min(100, s.hunger + 10);
    } else {
      s.hunger = Math.min(100, s.hunger + 25);
      s.health = Math.max(0, s.health - 5);
    }

    if (fed && s.role !== "onMission") {
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
      if (s.status === "healthy") {
        s.morale = Math.min(100, s.morale + 10);
      } else if (fed) {
        const heal = getRestHealAmount(s, infirmaryLevel);
        s.health = Math.min(100, s.health + heal);
        s.morale = Math.min(100, s.morale + 5);
        if (heal > 0) {
          newLog.push({
            day,
            message: `[${area.name}] ${s.name} recuperating on bed rest (+${heal} HP).`,
            type: "success",
          });
        }
      } else {
        s.morale = Math.max(0, s.morale - 5);
        newLog.push({
          day,
          message: `[${area.name}] ${s.name} lacked rations for bed rest.`,
          type: "warning",
        });
      }
    }

    if (s.health < 30) {
      s.morale = Math.max(0, s.morale - 5);
    }
  });

  // ---------- 5. Natural heal (idle injured) ----------
  areaSurvivors.forEach((s) => {
    if (
      s.status !== "healthy" &&
      s.health < 100 &&
      s.role !== "resting" &&
      s.role !== "onMission"
    ) {
      s.health = Math.min(100, s.health + NATURAL_HEAL_PER_DAY);
    }
  });
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
      const { total: defense } = getBaseDefense(
        area.buildings.watchtower.level,
        areaSurvivors
      );

      if (defense >= raidPower) {
        newLog.push({ day, message: `[${area.name}] Bandit raid repelled.`, type: "success" });
      } else {
        const stolenFood = Math.min(resources.food, randInt(rng, 5, 15));
        const stolenWater = Math.min(resources.water, randInt(rng, 5, 15));
        const stolenMats = Math.min(resources.materials, randInt(rng, 5, 15));
        resources.food -= stolenFood;
        resources.water -= stolenWater;
        resources.materials -= stolenMats;
        const stolenTotal = stolenFood + stolenWater + stolenMats;
        if (area.baseLocationId && stolenTotal > 0) {
          pushResourceFloater(floaters, {
            id: `raid_${area.id}_${day}_${stolenTotal}`,
            areaId: area.id,
            locationId: area.baseLocationId,
            kind: "raid",
            loot: {
              food: stolenFood,
              water: stolenWater,
              materials: stolenMats,
            },
          });
        }
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

  autoAssignBaseGuards(area, allSurvivors, day, newLog);

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
        state.areas = expandWorldAroundHex(state.areas, destArea.hex);
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
    const area = state.areas[areaId];
    if (!area || !area.discovered) return;
    const areas = expandWorldAroundHex(state.areas, area.hex);
    set({ currentAreaId: areaId, areas });
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

    // Set survivors to in-transit (immutable)
    const survivors = { ...state.survivors };
    validSurvivors.forEach((id) => {
      const s = survivors[id];
      if (s) {
        survivors[id] = { ...s, role: "idle", assignedTeamId: undefined };
      }
    });

    // Find teams that lose members — if a team loses any member, cancel its
    // pending missions (the team composition changed, can't continue salvage/scout).
    const affectedTeamIds = new Set<string>();
    for (const t of fromArea.teams) {
      if (t.memberIds.some((id) => validSurvivors.includes(id))) {
        affectedTeamIds.add(t.id);
      }
    }

    // Update the source area immutably
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.survivorIds = a.survivorIds.filter((id) => !validSurvivors.includes(id));
      a.teams = a.teams.map((t) => ({
        ...t,
        memberIds: t.memberIds.filter((id) => !validSurvivors.includes(id)),
        // Clear locationId for teams that lost members (they're no longer deployed)
        locationId:
          affectedTeamIds.has(t.id) && t.memberIds.length === 0
            ? null
            : t.locationId,
      }));
      // Cancel pending missions for affected teams
      if (affectedTeamIds.size > 0) {
        a.missions = a.missions.filter(
          (m) =>
            !(
              affectedTeamIds.has(m.teamId) &&
              m.status === "pending"
            )
        );
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
      areas,
      survivors,
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

    const newBuildings = initialBuildings();
    const areas = updateArea(state, areaId, (a) => {
      // Ensure the area is marked discovered (defensive — should already be true
      // since you can only claim a cleared location in a discovered area).
      a.discovered = true;
      a.hasBase = true;
      a.baseLocationId = locationId;
      a.buildings = newBuildings;
      a.resourceCaps = calculateCaps({ ...a, buildings: newBuildings });
      a.resources = clampResources(a.resources, a.resourceCaps);
    });

    set({
      areas,
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

    // Validate resources and compute the deduction
    const validResources: Partial<Resources> = {};
    const newFromResources = { ...fromArea.resources };
    for (const [k, v] of Object.entries(resources)) {
      const amount = Math.min(fromArea.resources[k as ResourceType], v as number);
      if (amount > 0) {
        validResources[k as ResourceType] = amount;
        newFromResources[k as ResourceType] -= amount;
      }
    }

    if (Object.keys(validResources).length === 0) return;

    const areas = updateArea(state, fromAreaId, (a) => {
      a.resources = newFromResources;
    });

    const transfer: Transfer = {
      id: `transfer_res_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      fromAreaId,
      toAreaId,
      survivorIds: [],
      resources: validResources,
      arrivalDay: state.day + 1,
    };

    set({
      areas,
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
    const newBuilding = {
      ...building,
      level: building.level + 1,
      maxHp: BUILDING_DEFS[type].baseHp + building.level * 20,
      hp: building.hp + 20,
    };
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.buildings = { ...a.buildings, [type]: newBuilding };
      a.resourceCaps = calculateCaps({ ...a, buildings: a.buildings });
      a.resources = clampResources(newResources, a.resourceCaps);
    });
    set({
      areas,
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
    const newResources = subtractCost(area.resources, repairCost);
    const newBuilding = { ...building, hp: building.maxHp };
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.buildings = { ...a.buildings, [type]: newBuilding };
      a.resources = newResources;
    });
    set({
      areas,
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
    if (!area) return null;
    const maxTeams = Math.max(3, area.survivorIds.length);
    if (area.teams.length >= maxTeams) return null;
    const team: Team = {
      id: `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name || `Team ${String.fromCharCode(65 + area.teams.length)}`,
      memberIds: [],
      locationId: null,
    };
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.teams = [...a.teams, team];
    });
    set({ areas });
    return team.id;
  },

  deleteTeam: (teamId) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const team = area.teams.find((t) => t.id === teamId);
    if (!team) return;
    // Reset all team members to idle (immutable)
    const survivors = { ...state.survivors };
    team.memberIds.forEach((id) => {
      const s = survivors[id];
      if (s) {
        survivors[id] = { ...s, assignedTeamId: undefined, role: "idle" as const };
      }
    });
    const areas = updateArea(state, state.currentAreaId, (a) => {
      // Remove the team
      a.teams = a.teams.filter((t) => t.id !== teamId);
      // Also remove any pending missions for this team (salvage/scout),
      // otherwise the mission would be orphaned and re-dispatched each day.
      a.missions = a.missions.filter(
        (m) => !(m.teamId === teamId && m.status === "pending")
      );
    });
    set({ areas, survivors });
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

    const survivors = { ...state.survivors };
    survivors[survivorId] = {
      ...survivor,
      assignedTeamId: teamId,
      role: "working",
    };
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.teams = a.teams.map((t) => ({
        ...t,
        memberIds: [
          ...t.memberIds.filter((id) => id !== survivorId),
          ...(t.id === teamId ? [survivorId] : []),
        ],
      }));
    });
    set({ areas, survivors });
  },

  unassignSurvivorFromTeam: (survivorId) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const survivor = state.survivors[survivorId];
    const survivors = { ...state.survivors };
    if (survivor) {
      survivors[survivorId] = {
        ...survivor,
        assignedTeamId: undefined,
        role: "idle",
      };
    }
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.teams = a.teams.map((t) => ({
        ...t,
        memberIds: t.memberIds.filter((id) => id !== survivorId),
      }));
    });
    set({ areas, survivors });
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
    if (locationHasPendingMission(area, locationId)) return;

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
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.teams = a.teams.map((t) =>
        t.id === teamId ? { ...t, locationId } : t
      );
      a.missions = [...a.missions, mission];
    });
    const survivors = setSurvivorsOnMission(state.survivors, team.memberIds);
    set({
      areas,
      survivors,
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
    if (locationHasPendingMission(area, locationId)) return;

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
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.teams = a.teams.map((t) =>
        t.id === teamId ? { ...t, locationId } : t
      );
      a.missions = [...a.missions, mission];
    });
    const survivors = setSurvivorsOnMission(state.survivors, team.memberIds);
    set({
      areas,
      survivors,
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
    const survivors = { ...state.survivors };
    team.memberIds.forEach((id) => {
      const s = survivors[id];
      if (s) survivors[id] = { ...s, role: "idle" };
    });
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.missions = a.missions.filter(
        (m) => !(m.teamId === teamId && m.status === "pending")
      );
      a.teams = a.teams.filter((t) => t.id !== teamId);
    });
    set({ areas, survivors });
  },

  sendSurvivorsToLocation: (survivorIds, locationId) => {
    const state = get();
    const areaId = state.currentAreaId;
    const area = state.areas[areaId];
    if (!area || survivorIds.length === 0) return;

    const survivors = { ...state.survivors };
    let dispatched = false;
    const areas = updateArea(state, areaId, (a) => {
      dispatched = dispatchSurvivorsToLocationInArea(
        a,
        survivors,
        survivorIds,
        locationId
      );
    });
    if (!dispatched) return;

    const updatedArea = areas[areaId];
    const location = updatedArea.locations.find((l) => l.id === locationId);
    const team = updatedArea.missions.find((m) => m.locationId === locationId);
    const missionType = team?.missionType ?? "scout";

    set({
      areas,
      survivors,
      log: [
        ...state.log,
        {
          day: state.day,
          message: `[${updatedArea.name}] Survivors dispatched to ${missionType} ${location?.name ?? "location"}.`,
          type: "info",
        },
      ].slice(-120),
    });
  },

  setSurvivorResting: (survivorId, resting) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
    const survivor = state.survivors[survivorId];
    if (!survivor) return;
    const survivors = { ...state.survivors };
    survivors[survivorId] = {
      ...survivor,
      role: resting ? "resting" : "idle",
      assignedTeamId: undefined,
    };
    const areas = updateArea(state, state.currentAreaId, (a) => {
      a.teams = a.teams.map((t) => ({
        ...t,
        memberIds: t.memberIds.filter((id) => id !== survivorId),
      }));
    });
    set({ areas, survivors });
  },

  setSurvivorGuarding: (survivorId, guarding) => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area?.hasBase) return;
    const survivor = state.survivors[survivorId];
    if (!survivor) return;
    const survivors = { ...state.survivors };
    const areas = updateArea(state, state.currentAreaId, (a) => {
      applySurvivorGuardRole(a, survivors, survivorId, guarding);
    });
    set({ areas, survivors });
  },

  autoAssignSurvivors: () => {
    const state = get();
    const area = state.areas[state.currentAreaId];
    if (!area) return;
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
      const areaMapFloaters: MapFloaterEvent[] = [];
      for (const area of Object.values(state.areas)) {
        if (!area.discovered) continue;
        const { survivorsDied } = processArea(
          area,
          allSurvivors,
          day,
          newLog,
          areaMapFloaters
        );
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

      // Shallow-clone every area so reference equality changes for the
      // Zustand selectors that depend on `s.areas[id]`.
      const newAreas: Record<string, Area> = {};
      for (const [id, area] of Object.entries(state.areas)) {
        newAreas[id] = {
          ...area,
          buildings: { ...area.buildings },
          resources: { ...area.resources },
          resourceCaps: { ...area.resourceCaps },
          teams: [...area.teams],
          missions: [...area.missions],
          locations: area.locations.map((l) => ({ ...l })),
          survivorIds: [...area.survivorIds],
        };
      }

      const lastNightReport = buildLastNightReport(
        newLog,
        day,
        allSurvivors,
        newAreas
      );

      return {
        ...state,
        day: nextDay,
        areas: newAreas,
        survivors: allSurvivors,
        transfers: remainingTransfers,
        log: newLog.slice(-120),
        areaMapFloaters,
        lastNightDay: day,
        lastNightReport,
        gameOver,
        gameOverReason,
      };
    });
  },

  clearAreaMapFloater: (id) => {
    set((state) => ({
      areaMapFloaters: state.areaMapFloaters.filter((f) => f.id !== id),
    }));
  },

  dismissAreaMapPopups: () => {
    set((state) => ({
      areaMapDismissSignal: state.areaMapDismissSignal + 1,
    }));
  },
}));

// ---------- Selectors ----------
export function selectSurvivorCapacity(area: Area | undefined): number {
  if (!area || !area.hasBase) return 99;
  return getSurvivorCapacity(area.buildings.shelter.level);
}
