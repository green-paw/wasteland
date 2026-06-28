/**
 * Test that the starting area's safe location guarantees a survivor recruit.
 */
import { useGameStore } from "../src/game/store";
import { generateAreaLocations, generateWorld } from "../src/game/worldGen";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  } else {
    console.log("PASS:", msg);
  }
}

console.log("\n=== Test: starting area safe location guarantees survivor ===");

// Generate a world and check the start area
const { areas, startAreaId } = generateWorld(12345);
const startArea = areas[startAreaId];

console.log(`Start area: ${startArea.name} (${startArea.type})`);
console.log(`Locations: ${startArea.locations.length}`);

// Find the "safe" location (id starts with loc_..._safe_)
const safeLoc = startArea.locations.find((l) => l.id.includes("_safe_"));
assert(safeLoc !== undefined, "Should have a safe location in start area");

if (safeLoc) {
  console.log(`Safe location: ${safeLoc.name} (${safeLoc.type})`);
  console.log(`  enemyCount: ${safeLoc.enemyCount}`);
  console.log(`  survivorChance: ${safeLoc.survivorChance}`);
  console.log(`  dangerLevel: ${safeLoc.dangerLevel}`);

  assert(
    safeLoc.enemyCount === 1,
    `Safe location should have exactly 1 enemy (got ${safeLoc.enemyCount})`
  );
  assert(
    safeLoc.survivorChance >= 1.0,
    `Safe location should guarantee survivor recruit (got ${safeLoc.survivorChance})`
  );
  assert(
    safeLoc.dangerLevel <= 2,
    `Safe location should be low danger (got ${safeLoc.dangerLevel})`
  );
}

// Verify non-start areas don't get guaranteed survivor
const { areas: areas2, startAreaId: start2 } = generateWorld(99999);
const startArea2 = areas2[start2];
const neighborArea = Object.values(areas2).find((a) => a.id !== start2)!;
// Generate locations for a neighbor
const neighborLocs = generateAreaLocations(
  neighborArea.id,
  neighborArea.type,
  12345
);
const neighborSafe = neighborLocs.find((l) => l.id.includes("_safe_"));
if (neighborSafe) {
  console.log(`\nNeighbor safe location: ${neighborSafe.name}`);
  console.log(`  survivorChance: ${neighborSafe.survivorChance}`);
  assert(
    neighborSafe.survivorChance < 1.0,
    `Non-start area safe location should NOT guarantee survivor (got ${neighborSafe.survivorChance})`
  );
}

// Test full flow: scout the safe location, should recruit a survivor
console.log("\n=== Test: scouting safe location recruits a survivor ===");
useGameStore.getState().resetGame();
useGameStore.getState().startGame();

const s = useGameStore.getState();
const startAreaId3 = s.currentAreaId;
const survivor3 = Object.values(s.survivors)[0];

// Create team and assign
const teamId3 = useGameStore.getState().createTeam("Scout")!;
useGameStore.getState().assignSurvivorToTeam(survivor3.id, teamId3);

// Find the safe location
const safeLoc3 = useGameStore
  .getState()
  .areas[startAreaId3].locations.find((l) => l.id.includes("_safe_"))!;

console.log(`Scouting: ${safeLoc3.name} (${safeLoc3.enemyCount} enemies)`);
useGameStore.getState().assignTeamToLocation(teamId3, safeLoc3.id);

const survivorsBefore = Object.keys(useGameStore.getState().survivors).length;
console.log(`Survivors before endDay: ${survivorsBefore}`);

// End day
useGameStore.getState().endDay();

const survivorsAfter = Object.keys(useGameStore.getState().survivors).length;
console.log(`Survivors after endDay: ${survivorsAfter}`);

assert(
  survivorsAfter > survivorsBefore,
  `Should have recruited a new survivor (was ${survivorsBefore}, now ${survivorsAfter})`
);

// Check log for recruit message
const log = useGameStore.getState().log;
const recruitMsg = log.find((m) => m.message.includes("joined your group"));
assert(
  recruitMsg !== undefined,
  "Log should mention survivor joining"
);

console.log("\n=== All start-area-survivor tests passed! ===");
