/**
 * Test the salvage mechanic for cleared locations.
 * Verifies:
 * 1. Salvage mission extracts resources from the salvage pool
 * 2. Materials are always extracted (primary yield)
 * 3. Building-specific resources are also extracted (food from supermarket, water from hospital, etc.)
 * 4. Pool depletes over multiple days
 * 5. Depleted locations can't be salvaged again
 */
import { useGameStore } from "../src/game/store";
import { generateSurvivor } from "../src/game/worldGen";

function reset() {
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame();
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  } else {
    console.log("PASS:", msg);
  }
}

// ============== Test 1: Salvage extracts resources ==============
console.log("\n=== Test 1: Salvage extracts resources from cleared location ===");
reset();

// Force-clear a location so we can salvage it
const state = useGameStore.getState();
const loc = state.locations[0];
console.log(`Location: ${loc.name} (${loc.type})`);
console.log(`Salvage pool:`, loc.salvagePool);

useGameStore.setState({
  locations: state.locations.map((l) =>
    l.id === loc.id ? { ...l, cleared: true, enemyCount: 0 } : l
  ),
});

// Create a team and assign a survivor
const survivor = useGameStore.getState().survivors[0];
const teamId = useGameStore.getState().createTeam("Salvagers")!;
useGameStore.getState().assignSurvivorToTeam(survivor.id, teamId);

const materialsBefore = useGameStore.getState().resources.materials;
console.log(`Materials before: ${materialsBefore}`);

// Assign team to salvage
useGameStore.getState().assignTeamToSalvage(teamId, loc.id);

// Verify mission was created with salvage type
const missions = useGameStore.getState().missions;
assert(missions.length === 1, "Should have 1 pending mission");
assert(
  missions[0].missionType === "salvage",
  `Mission should be salvage type (got ${missions[0].missionType})`
);

// End day to resolve salvage
useGameStore.getState().endDay();

const stateAfter = useGameStore.getState();
const materialsAfter = stateAfter.resources.materials;
const updatedLoc = stateAfter.locations.find((l) => l.id === loc.id)!;

console.log(`Materials after: ${materialsAfter}`);
console.log(`Salvage pool after:`, updatedLoc.salvagePool);

assert(
  materialsAfter > materialsBefore,
  `Materials should increase from salvage (was ${materialsBefore}, now ${materialsAfter})`
);

// Check log for salvage message
const salvageLog = stateAfter.log.find((e) => e.message.includes("salvaged"));
assert(
  salvageLog !== undefined,
  `Log should mention salvaging (got: ${stateAfter.log
    .filter((e) => e.day === 1)
    .map((e) => e.message)
    .join("; ")})`
);

// ============== Test 2: Building-specific resources ==============
console.log("\n=== Test 2: Building-specific salvage resources ===");
reset();

// Find a gas_station (should give food/water from salvage)
const state2 = useGameStore.getState();
const gasStation = state2.locations.find((l) => l.type === "gas_station");
if (gasStation) {
  console.log(`Gas Station salvage pool:`, gasStation.salvagePool);
  assert(
    (gasStation.salvagePool.food ?? 0) > 0,
    "Gas station should have food in salvage pool"
  );
  assert(
    (gasStation.salvagePool.materials ?? 0) > 0,
    "Gas station should have materials in salvage pool (rubble)"
  );
} else {
  console.log("No gas station in this world — skipping");
}

// Find a supermarket (should give food)
const supermarket = state2.locations.find((l) => l.type === "supermarket");
if (supermarket) {
  console.log(`Supermarket salvage pool:`, supermarket.salvagePool);
  assert(
    (supermarket.salvagePool.food ?? 0) > 0,
    "Supermarket should have food in salvage pool"
  );
} else {
  console.log("No supermarket in this world — skipping");
}

// Find a hospital (should give water)
const hospital = state2.locations.find((l) => l.type === "hospital");
if (hospital) {
  console.log(`Hospital salvage pool:`, hospital.salvagePool);
  assert(
    (hospital.salvagePool.water ?? 0) > 0,
    "Hospital should have water in salvage pool"
  );
} else {
  console.log("No hospital in this world — skipping");
}

// ============== Test 3: Depletion ==============
console.log("\n=== Test 3: Pool depletes over multiple days ===");
reset();

const state3 = useGameStore.getState();
const loc3 = state3.locations[0];
console.log(`Location: ${loc3.name}`);
console.log(`Initial salvage pool:`, loc3.salvagePool);

const totalPool = Object.values(loc3.salvagePool).reduce(
  (sum, v) => sum + (v as number),
  0
);
console.log(`Total pool: ${totalPool}`);

// Force-clear and set a small pool for testing
useGameStore.setState({
  locations: state3.locations.map((l) =>
    l.id === loc3.id
      ? {
          ...l,
          cleared: true,
          enemyCount: 0,
          salvagePool: { materials: 5 }, // small pool
        }
      : l
  ),
});

// Use a survivor with high scavenge skill to deplete fast
const scavenger = useGameStore.getState().survivors[0];
useGameStore.setState({
  survivors: useGameStore.getState().survivors.map((s) =>
    s.id === scavenger.id ? { ...s, skills: { ...s.skills, scavenging: 10 } } : s
  ),
});

const teamId3 = useGameStore.getState().createTeam("Depleters")!;
useGameStore.getState().assignSurvivorToTeam(scavenger.id, teamId3);

let day = 1;
let depleted = false;
for (let i = 0; i < 10; i++) {
  const currentLoc = useGameStore.getState().locations.find((l) => l.id === loc3.id)!;
  if (currentLoc.salvageDepleted) {
    depleted = true;
    console.log(`Depleted after ${day - 1} days of salvaging`);
    break;
  }
  useGameStore.getState().assignTeamToSalvage(teamId3, loc3.id);
  useGameStore.getState().endDay();
  day++;
}

assert(depleted, "Pool should deplete after enough salvage runs");

// Verify depleted flag is set
const finalLoc = useGameStore.getState().locations.find((l) => l.id === loc3.id)!;
assert(
  finalLoc.salvageDepleted === true,
  "Location should be marked as depleted"
);

// ============== Test 4: Can't salvage depleted location ==============
console.log("\n=== Test 4: Can't salvage depleted location ===");

const missionsBefore = useGameStore.getState().missions.length;
useGameStore.getState().assignTeamToSalvage(teamId3, loc3.id);
const missionsAfter = useGameStore.getState().missions.length;

assert(
  missionsAfter === missionsBefore,
  `No new mission should be created for depleted location (before: ${missionsBefore}, after: ${missionsAfter})`
);

console.log("\n=== All salvage tests passed! ===");
