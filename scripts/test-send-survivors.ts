/**
 * Test the simplified sendSurvivorsToLocation action.
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

console.log("\n=== Test: sendSurvivorsToLocation (scout) ===");
reset();

const state = useGameStore.getState();
const area = state.areas[state.currentAreaId];
const survivor = Object.values(state.survivors)[0];

// Find a non-cleared location
const loc = area.locations.find((l) => !l.cleared);
assert(loc !== undefined, "Should have a non-cleared location");

if (loc) {
  console.log(`Sending ${survivor.name} to scout ${loc.name}`);
  useGameStore.getState().sendSurvivorsToLocation([survivor.id], loc.id);

  // Verify a team was created automatically
  const state2 = useGameStore.getState();
  const area2 = state2.areas[state.currentAreaId];
  assert(
    area2.teams.length > 0,
    "A team should be auto-created"
  );
  assert(
    area2.teams.some((t) => t.memberIds.includes(survivor.id)),
    "Survivor should be in a team"
  );
  assert(
    area2.missions.some(
      (m) => m.locationId === loc.id && m.status === "pending"
    ),
    "A pending scout mission should exist"
  );
  const mission = area2.missions.find(
    (m) => m.locationId === loc.id && m.status === "pending"
  );
  assert(
    mission?.missionType === "scout",
    `Mission should be scout type (got ${mission?.missionType})`
  );
}

console.log("\n=== Test: sendSurvivorsToLocation (salvage) ===");
reset();

const state3 = useGameStore.getState();
const area3 = state3.areas[state3.currentAreaId];
const survivor3 = Object.values(state3.survivors)[0];

// Force-clear a location
const loc3 = area3.locations[0];
useGameStore.setState({
  areas: {
    ...useGameStore.getState().areas,
    [area3.id]: {
      ...useGameStore.getState().areas[area3.id],
      locations: useGameStore.getState().areas[area3.id].locations.map((l) =>
        l.id === loc3.id ? { ...l, cleared: true, enemyCount: 0 } : l
      ),
    },
  },
});

console.log(`Sending ${survivor3.name} to salvage ${loc3.name}`);
useGameStore.getState().sendSurvivorsToLocation([survivor3.id], loc3.id);

const state4 = useGameStore.getState();
const area4 = state4.areas[state4.currentAreaId];
assert(
  area4.missions.some(
    (m) => m.locationId === loc3.id && m.status === "pending"
  ),
  "A pending salvage mission should exist"
);
const salvageMission = area4.missions.find(
  (m) => m.locationId === loc3.id && m.status === "pending"
);
assert(
  salvageMission?.missionType === "salvage",
  `Mission should be salvage type (got ${salvageMission?.missionType})`
);

console.log("\n=== Test: send multiple survivors ===");
reset();
const state5 = useGameStore.getState();
const area5 = state5.areas[state5.currentAreaId];
const survivor5 = Object.values(state5.survivors)[0];

// Add a second survivor
const { generateSurvivor } = await import("../src/game/worldGen");
const survivor6 = generateSurvivor(99);
useGameStore.setState({
  survivors: {
    ...useGameStore.getState().survivors,
    [survivor6.id]: survivor6,
  },
  areas: {
    ...useGameStore.getState().areas,
    [area5.id]: {
      ...useGameStore.getState().areas[area5.id],
      survivorIds: [
        ...useGameStore.getState().areas[area5.id].survivorIds,
        survivor6.id,
      ],
    },
  },
});

const loc5 = area5.locations.find((l) => !l.cleared)!;
console.log(`Sending 2 survivors to scout ${loc5.name}`);
useGameStore.getState().sendSurvivorsToLocation(
  [survivor5.id, survivor6.id],
  loc5.id
);

const state6 = useGameStore.getState();
const area6 = state6.areas[state5.currentAreaId];
const mission6 = area6.missions.find(
  (m) => m.locationId === loc5.id && m.status === "pending"
);
assert(mission6 !== undefined, "Mission should exist");
assert(
  mission6!.team.length === 2,
  `Mission team should have 2 survivors (got ${mission6!.team.length})`
);

console.log("\n=== All sendSurvivorsToLocation tests passed! ===");
