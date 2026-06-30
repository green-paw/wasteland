/**
 * Test that farm/well production works after claiming a base in a new area.
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

console.log("\n=== Test: farm/well production after claim ===");
reset();

const state = useGameStore.getState();
const startAreaId = state.currentAreaId;
const survivor = Object.values(state.survivors)[0];

// Find a neighbor area
const neighbors = Object.values(state.areas).filter(
  (a) => a.id !== startAreaId
);
const dest = neighbors[0];
console.log(`Traveling to: ${dest.name}`);

// Travel to neighbor
useGameStore.getState().travelToArea(dest.id, [survivor.id]);

// End day so transfer arrives
useGameStore.getState().endDay();

// Now survivor should be in dest area
let state2 = useGameStore.getState();
const destArea = state2.areas[dest.id];
console.log(
  `Dest area discovered: ${destArea.discovered}, survivors: ${destArea.survivorIds.length}, hasBase: ${destArea.hasBase}`
);
assert(destArea.discovered, "Dest area should be discovered");
assert(
  destArea.survivorIds.includes(survivor.id),
  "Survivor should be in dest area"
);

// Switch to dest area
useGameStore.getState().setCurrentArea(dest.id);

// Force-clear a location so we can claim base
const locToClear = destArea.locations[0];
useGameStore.setState({
  areas: {
    ...useGameStore.getState().areas,
    [dest.id]: {
      ...useGameStore.getState().areas[dest.id],
      locations: useGameStore.getState().areas[dest.id].locations.map((l) =>
        l.id === locToClear.id
          ? { ...l, cleared: true, enemyCount: 0 }
          : l
      ),
    },
  },
});

// Claim base
useGameStore.getState().claimBase(dest.id, locToClear.id);

state2 = useGameStore.getState();
assert(
  state2.areas[dest.id].hasBase,
  "Dest area should have base after claim"
);
console.log(
  `Buildings after claim: farm=${state2.areas[dest.id].buildings.farm.level}, well=${state2.areas[dest.id].buildings.well.level}`
);

// Give resources to build farm and well
useGameStore.setState({
  areas: {
    ...useGameStore.getState().areas,
    [dest.id]: {
      ...useGameStore.getState().areas[dest.id],
      resources: {
        food: 30,
        water: 30,
        materials: 50,
      },
    },
  },
});

// Build farm (level 0 -> 1)
useGameStore.getState().upgradeBuilding("farm");
// Build well (level 0 -> 1)
useGameStore.getState().upgradeBuilding("well");

state2 = useGameStore.getState();
console.log(
  `After upgrade: farm=${state2.areas[dest.id].buildings.farm.level}, well=${state2.areas[dest.id].buildings.well.level}`
);
assert(
  state2.areas[dest.id].buildings.farm.level === 1,
  "Farm should be level 1"
);
assert(
  state2.areas[dest.id].buildings.well.level === 1,
  "Well should be level 1"
);

// Check resources before endDay
const foodBefore = state2.areas[dest.id].resources.food;
const waterBefore = state2.areas[dest.id].resources.water;
console.log(`Before endDay: food=${foodBefore}, water=${waterBefore}`);

// End day — should produce 5 food and 5 water
useGameStore.getState().endDay();

state2 = useGameStore.getState();
const foodAfter = state2.areas[dest.id].resources.food;
const waterAfter = state2.areas[dest.id].resources.water;
console.log(`After endDay: food=${foodAfter}, water=${waterAfter}`);

// Farm produces 5, but 1 survivor consumes 1 food. Net +4.
// Well produces 5, but 1 survivor consumes 1 water. Net +4.
assert(
  foodAfter > foodBefore,
  `Food should increase (was ${foodBefore}, now ${foodAfter})`
);
assert(
  waterAfter > waterBefore,
  `Water should increase (was ${waterBefore}, now ${waterAfter})`
);

// Check log for production message
const log = useGameStore.getState().log;
const farmLog = log.find((m) => m.message.includes("Farm produced"));
const wellLog = log.find((m) => m.message.includes("Well produced"));
assert(
  farmLog !== undefined,
  `Log should mention farm production (got: ${log
    .filter((m) => m.day === 3)
    .map((m) => m.message)
    .join("; ")})`
);
assert(
  wellLog !== undefined,
  "Log should mention well production"
);

console.log("\n=== All production tests passed! ===");
