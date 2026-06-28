/**
 * Test the persistent salvage mechanic.
 * Verifies:
 * 1. Salvage mission stays pending (and team stays assigned) until pool depletes
 * 2. Team survivors keep "working" role (eat from base) during salvage
 * 3. When pool depletes, team returns to idle and mission completes
 * 4. Player can manually recall the team via clearTeamLocation
 */
import { useGameStore } from "../src/game/store";

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

// ============== Test 1: Salvage mission persists until depleted ==============
console.log("\n=== Test 1: Salvage mission persists across days ===");
reset();

const state = useGameStore.getState();
const loc = state.locations[0];
console.log(`Location: ${loc.name}`);
console.log(`Initial salvage pool:`, loc.salvagePool);
const totalPool = Object.values(loc.salvagePool).reduce(
  (sum, v) => sum + (v as number),
  0
);
console.log(`Total pool: ${totalPool}`);

// Set a large pool so it takes multiple days
useGameStore.setState({
  locations: state.locations.map((l) =>
    l.id === loc.id
      ? {
          ...l,
          cleared: true,
          enemyCount: 0,
          salvagePool: { materials: 50, food: 10 }, // large pool
        }
      : l
  ),
});

// Create team and assign survivor
const survivor = useGameStore.getState().survivors[0];
const teamId = useGameStore.getState().createTeam("Salvagers")!;
useGameStore.getState().assignSurvivorToTeam(survivor.id, teamId);

// Send salvage team
useGameStore.getState().assignTeamToSalvage(teamId, loc.id);

let day = 1;
let daysSalvaging = 0;
let missionCompletedDay = -1;

for (let i = 0; i < 20; i++) {
  const beforeState = useGameStore.getState();
  const beforeMission = beforeState.missions.find(
    (m) => m.teamId === teamId && m.status === "pending"
  );
  const beforeDepleted = beforeState.locations.find(
    (l) => l.id === loc.id
  )!.salvageDepleted;

  if (beforeDepleted) {
    console.log(`Day ${day}: location already depleted, stopping`);
    break;
  }

  // Verify mission is still pending before endDay
  if (i > 0) {
    assert(
      beforeMission !== undefined,
      `Day ${day}: salvage mission should still be pending (persistent)`
    );
    // Verify team is still assigned
    const team = beforeState.teams.find((t) => t.id === teamId);
    assert(
      team?.locationId === loc.id,
      `Day ${day}: team should still be assigned to location`
    );
    // Verify survivor is NOT onMission (so they eat from base)
    const surv = beforeState.survivors.find((s) => s.id === survivor.id);
    assert(
      surv?.role !== "onMission",
      `Day ${day}: salvage survivor should not be "onMission" (must eat from base)`
    );
    daysSalvaging++;
  }

  useGameStore.getState().endDay();
  day++;

  // Check if mission completed (depleted)
  const afterState = useGameStore.getState();
  const afterMission = afterState.missions.find(
    (m) => m.teamId === teamId && m.status === "pending"
  );
  const afterLoc = afterState.locations.find((l) => l.id === loc.id)!;
  if (afterLoc.salvageDepleted && afterMission === undefined) {
    missionCompletedDay = day - 1;
    console.log(`Day ${day - 1}: pool depleted, mission completed`);
    break;
  }
}

assert(
  daysSalvaging >= 1,
  `Team should have salvaged for multiple days (got ${daysSalvaging})`
);
assert(
  missionCompletedDay > 0,
  `Mission should complete when pool depletes (completed on day ${missionCompletedDay})`
);

// ============== Test 2: Team returns to idle after depletion ==============
console.log("\n=== Test 2: Team returns to idle after depletion ===");
const finalState = useGameStore.getState();
const finalSurvivor = finalState.survivors.find((s) => s.id === survivor.id);
const finalTeam = finalState.teams.find((t) => t.id === teamId);

assert(
  finalSurvivor?.role === "idle",
  `Survivor should be idle after depletion (got ${finalSurvivor?.role})`
);
assert(
  finalSurvivor?.assignedTeamId === undefined,
  `Survivor should be unassigned after depletion`
);
assert(
  finalTeam?.locationId === null || finalTeam?.locationId === undefined,
  `Team location should be cleared after depletion`
);

// ============== Test 3: Player can manually recall team ==============
console.log("\n=== Test 3: Player can manually recall salvage team ===");
reset();

const state3 = useGameStore.getState();
const loc3 = state3.locations[0];
useGameStore.setState({
  locations: state3.locations.map((l) =>
    l.id === loc3.id
      ? {
          ...l,
          cleared: true,
          enemyCount: 0,
          salvagePool: { materials: 100 }, // huge pool, won't deplete
        }
      : l
  ),
});

const survivor3 = useGameStore.getState().survivors[0];
const teamId3 = useGameStore.getState().createTeam("RecallTest")!;
useGameStore.getState().assignSurvivorToTeam(survivor3.id, teamId3);
useGameStore.getState().assignTeamToSalvage(teamId3, loc3.id);

// End day once — should still be salvaging
useGameStore.getState().endDay();
const midState = useGameStore.getState();
const midMission = midState.missions.find(
  (m) => m.teamId === teamId3 && m.status === "pending"
);
assert(
  midMission !== undefined,
  "Mission should still be pending after 1 day (pool not depleted)"
);
assert(
  !midState.locations.find((l) => l.id === loc3.id)!.salvageDepleted,
  "Location should not be depleted"
);

// Player recalls the team
useGameStore.getState().clearTeamLocation(teamId3);
const afterRecall = useGameStore.getState();
const missionAfterRecall = afterRecall.missions.find(
  (m) => m.teamId === teamId3 && m.status === "pending"
);
assert(
  missionAfterRecall === undefined,
  "Mission should be removed after player recalls team"
);
assert(
  afterRecall.teams.find((t) => t.id === teamId3)?.locationId === null,
  "Team location should be cleared after recall"
);

console.log("\n=== All persistent salvage tests passed! ===");
