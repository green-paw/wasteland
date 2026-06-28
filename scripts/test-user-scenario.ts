/**
 * Simulate exactly what the user did:
 * 1. Travel to a neighbor area
 * 2. End day (transfer arrives, area discovered)
 * 3. Clear a location (force-cleared for test)
 * 4. Claim base
 * 5. Build farm + well
 * 6. End day
 * 7. Check that food/water increased (production worked)
 */
import { useGameStore } from "../src/game/store";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  } else {
    console.log("PASS:", msg);
  }
}

console.log("=== User scenario test ===");
useGameStore.getState().resetGame();
useGameStore.getState().startGame();

let state = useGameStore.getState();
const startAreaId = state.currentAreaId;
const survivor = Object.values(state.survivors)[0];
console.log(`1. Start area: ${state.areas[startAreaId].name}`);

// 1. Create team + assign
const teamId = useGameStore.getState().createTeam("Team A")!;
useGameStore.getState().assignSurvivorToTeam(survivor.id, teamId);

// 2. Find neighbor and travel
const neighbors = Object.values(state.areas).filter(
  (a) => a.id !== startAreaId
);
const dest = neighbors[0];
console.log(`2. Traveling to: ${dest.name}`);
useGameStore.getState().travelToArea(dest.id, [survivor.id]);

// 3. End day (transfer arrives)
useGameStore.getState().endDay();
state = useGameStore.getState();
console.log(
  `3. After end day: dest discovered=${state.areas[dest.id].discovered}, survivors in dest=${state.areas[dest.id].survivorIds.length}`
);

// 4. Switch to dest area
useGameStore.getState().setCurrentArea(dest.id);

// 5. Force-clear a location (simulate scouting)
const locToClear = state.areas[dest.id].locations[0];
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

// 6. Claim base
useGameStore.getState().claimBase(dest.id, locToClear.id);
state = useGameStore.getState();
console.log(
  `4. After claim: hasBase=${state.areas[dest.id].hasBase}, farm level=${state.areas[dest.id].buildings.farm.level}`
);

// 7. Give resources and build farm + well
useGameStore.setState({
  areas: {
    ...useGameStore.getState().areas,
    [dest.id]: {
      ...useGameStore.getState().areas[dest.id],
      resources: {
        food: 30,
        water: 30,
        materials: 50,
        medicine: 10,
        fuel: 5,
        ammo: 10,
      },
    },
  },
});

useGameStore.getState().upgradeBuilding("farm");
useGameStore.getState().upgradeBuilding("well");
state = useGameStore.getState();
console.log(
  `5. After build: farm=${state.areas[dest.id].buildings.farm.level}, well=${state.areas[dest.id].buildings.well.level}`
);

// 8. Check resources before end day
const foodBefore = state.areas[dest.id].resources.food;
const waterBefore = state.areas[dest.id].resources.water;
console.log(`6. Before end day: food=${foodBefore}, water=${waterBefore}`);

// 9. End day — should produce 5 food + 5 water, consume 1 each
useGameStore.getState().endDay();
state = useGameStore.getState();
const foodAfter = state.areas[dest.id].resources.food;
const waterAfter = state.areas[dest.id].resources.water;
console.log(`7. After end day: food=${foodAfter}, water=${waterAfter}`);
console.log(`   Change: food ${foodAfter - foodBefore}, water ${waterAfter - waterBefore}`);

assert(
  foodAfter > foodBefore,
  `Food should increase from production (was ${foodBefore}, now ${foodAfter})`
);
assert(
  waterAfter > waterBefore,
  `Water should increase from production (was ${waterBefore}, now ${waterAfter})`
);

// Check the log for production messages
const log = useGameStore.getState().log;
const farmLog = log.find((m) => m.message.includes("Farm produced"));
const wellLog = log.find((m) => m.message.includes("Well produced"));
console.log(`8. Log mentions farm: ${farmLog !== undefined}, well: ${wellLog !== undefined}`);
assert(farmLog !== undefined, "Log should mention farm production");
assert(wellLog !== undefined, "Log should mention well production");

console.log("\n=== All user scenario tests passed! Production works. ===");
