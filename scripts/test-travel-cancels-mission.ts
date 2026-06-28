/**
 * Test that travelToArea cancels pending missions for affected teams.
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

console.log("\n=== Test: travelToArea cancels salvage mission ===");
reset();

const state = useGameStore.getState();
const startArea = state.areas[state.currentAreaId];
const survivor = Object.values(state.survivors)[0];

// Create a team and assign the survivor
const teamId = useGameStore.getState().createTeam("Salvagers")!;
useGameStore.getState().assignSurvivorToTeam(survivor.id, teamId);

// Force-clear a location for salvage
const loc = startArea.locations[0];
useGameStore.setState({
  areas: {
    ...useGameStore.getState().areas,
    [startArea.id]: {
      ...useGameStore.getState().areas[startArea.id],
      locations: useGameStore.getState().areas[startArea.id].locations.map(
        (l) => (l.id === loc.id ? { ...l, cleared: true, enemyCount: 0 } : l)
      ),
    },
  },
});

// Assign salvage mission
useGameStore.getState().assignTeamToSalvage(teamId, loc.id);

// Verify mission exists
let missions = useGameStore.getState().areas[startArea.id].missions;
assert(
  missions.some((m) => m.teamId === teamId && m.status === "pending"),
  "Salvage mission should exist before travel"
);

// Find a neighbor area to travel to
const neighbors = Object.values(state.areas).filter(
  (a) => a.id !== startArea.id
);
assert(neighbors.length > 0, "Should have neighbor areas");
const dest = neighbors[0];

// Travel with the survivor
useGameStore.getState().travelToArea(dest.id, [survivor.id]);

// Verify the mission was cancelled
missions = useGameStore.getState().areas[startArea.id].missions;
assert(
  !missions.some((m) => m.teamId === teamId && m.status === "pending"),
  "Salvage mission should be cancelled when team member travels away"
);

// Verify the survivor is no longer in the start area
const startSurvivors = useGameStore.getState().areas[startArea.id].survivorIds;
assert(
  !startSurvivors.includes(survivor.id),
  "Survivor should be removed from start area"
);

// Verify a transfer was created
const transfers = useGameStore.getState().transfers;
assert(
  transfers.some((t) => t.survivorIds.includes(survivor.id)),
  "Transfer should be created for the traveling survivor"
);

console.log("\n=== All travel-mission tests passed! ===");
