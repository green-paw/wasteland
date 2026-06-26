/**
 * Test that deleteTeam removes pending missions (salvage/scout).
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

console.log("\n=== Test: deleteTeam removes pending missions ===");
reset();

const state = useGameStore.getState();
const area = state.areas[state.currentAreaId];
const survivor = Object.values(state.survivors)[0];

// Create a team
const teamId = useGameStore.getState().createTeam("TestTeam")!;
useGameStore.getState().assignSurvivorToTeam(survivor.id, teamId);

// Force-clear a location so we can assign a salvage mission
const loc = area.locations[0];
useGameStore.setState({
  areas: {
    ...useGameStore.getState().areas,
    [area.id]: {
      ...useGameStore.getState().areas[area.id],
      locations: useGameStore.getState().areas[area.id].locations.map((l) =>
        l.id === loc.id ? { ...l, cleared: true, enemyCount: 0 } : l
      ),
    },
  },
});

// Assign salvage mission
useGameStore.getState().assignTeamToSalvage(teamId, loc.id);

// Verify mission exists
let missions = useGameStore.getState().areas[area.id].missions;
assert(
  missions.some((m) => m.teamId === teamId && m.status === "pending"),
  "Salvage mission should exist before delete"
);

// Delete the team
useGameStore.getState().deleteTeam(teamId);

// Verify team is gone
const teamsAfter = useGameStore.getState().areas[area.id].teams;
assert(
  !teamsAfter.some((t) => t.id === teamId),
  "Team should be deleted"
);

// Verify mission is also gone
missions = useGameStore.getState().areas[area.id].missions;
assert(
  !missions.some((m) => m.teamId === teamId && m.status === "pending"),
  "Pending mission should be removed when team is deleted"
);

// Verify survivor is back to idle
const survAfter = useGameStore.getState().survivors[survivor.id];
assert(
  survAfter.role === "idle",
  `Survivor should be idle after team delete (got ${survAfter.role})`
);
assert(
  survAfter.assignedTeamId === undefined,
  "Survivor should be unassigned after team delete"
);

console.log("\n=== All delete-mission tests passed! ===");
