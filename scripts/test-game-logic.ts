/**
 * Quick logic test for the game store.
 * Verifies:
 * 1. Survivors don't starve when there's enough food/water
 * 2. Multiple survivors can be in a team (max 3)
 * 3. Multiple teams can be created
 * 4. Survivors heal without infirmary (slow natural recovery)
 */
import { useGameStore } from "../src/game/store";
import { generateSurvivor } from "../src/game/worldGen";

function reset() {
  useGameStore.getState().resetGame();
  useGameStore.getState().startGame();
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("❌ FAIL:", msg);
    process.exit(1);
  } else {
    console.log("✅ PASS:", msg);
  }
}

// ============== Test 1: Survivors don't starve with food ==============
console.log("\n=== Test 1: Survivors eat when food available ===");
reset();
const state0 = useGameStore.getState();
const initialHunger = state0.survivors[0].hunger;
const initialThirst = state0.survivors[0].thirst;
console.log(
  `Initial: hunger=${initialHunger}, thirst=${initialThirst}, food=${state0.resources.food}, water=${state0.resources.water}`
);

useGameStore.getState().endDay();
const state1 = useGameStore.getState();
const afterHunger = state1.survivors[0].hunger;
const afterThirst = state1.survivors[0].thirst;
console.log(
  `After day 1: hunger=${afterHunger}, thirst=${afterThirst}, food=${state1.resources.food}, water=${state1.resources.water}`
);

assert(
  afterHunger < initialHunger,
  `Hunger should DECREASE when food available (was ${initialHunger}, now ${afterHunger})`
);
assert(
  afterThirst < initialThirst,
  `Thirst should DECREASE when water available (was ${initialThirst}, now ${afterThirst})`
);

// Run a few more days
for (let i = 0; i < 5; i++) {
  useGameStore.getState().endDay();
}
const state2 = useGameStore.getState();
console.log(
  `After 6 days: hunger=${state2.survivors[0].hunger}, thirst=${state2.survivors[0].thirst}, food=${state2.resources.food}, water=${state2.resources.water}`
);
assert(
  state2.survivors[0].hunger === 0,
  `Hunger should be 0 after multiple days of eating (got ${state2.survivors[0].hunger})`
);
assert(
  state2.survivors[0].thirst === 0,
  `Thirst should be 0 after multiple days of drinking (got ${state2.survivors[0].thirst})`
);
assert(
  state2.survivors[0].status === "healthy",
  `Survivor should still be healthy with food/water`
);

// ============== Test 2: Team size up to 3 ==============
console.log("\n=== Test 2: Team size up to 3 survivors ===");
reset();
// Add 2 more survivors so we have 3
const s1 = useGameStore.getState().survivors[0];
const s2 = generateSurvivor(2);
const s3 = generateSurvivor(3);
useGameStore.setState({
  survivors: [...useGameStore.getState().survivors, s2, s3],
});

const teamId = useGameStore.getState().createTeam("TestTeam")!;
console.log(`Created team: ${teamId}`);

useGameStore.getState().assignSurvivorToTeam(s1.id, teamId);
useGameStore.getState().assignSurvivorToTeam(s2.id, teamId);
useGameStore.getState().assignSurvivorToTeam(s3.id, teamId);

const team = useGameStore.getState().teams.find((t) => t.id === teamId);
console.log(`Team members: ${team?.memberIds.length}`);
assert(
  team?.memberIds.length === 3,
  `Team should have 3 members (got ${team?.memberIds.length})`
);

// ============== Test 3: Multiple teams ==============
console.log("\n=== Test 3: Multiple teams can be created ===");
reset();
const team1 = useGameStore.getState().createTeam("Alpha");
const team2 = useGameStore.getState().createTeam("Bravo");
const team3 = useGameStore.getState().createTeam("Charlie");
console.log(`Teams: ${team1}, ${team2}, ${team3}`);
assert(team1 !== null, "Team 1 should be created");
assert(team2 !== null, "Team 2 should be created");
assert(team3 !== null, "Team 3 should be created");
assert(
  useGameStore.getState().teams.length === 3,
  `Should have 3 teams (got ${useGameStore.getState().teams.length})`
);

// ============== Test 4: Natural healing without infirmary ==============
console.log("\n=== Test 4: Natural healing without infirmary ===");
reset();
// Make sure infirmary is level 0
const buildings = useGameStore.getState().buildings;
assert(
  buildings.infirmary.level === 0,
  `Infirmary should be level 0 (got ${buildings.infirmary.level})`
);

// Injure the survivor
const injured = useGameStore.getState().survivors[0];
useGameStore.setState({
  survivors: useGameStore.getState().survivors.map((s) =>
    s.id === injured.id
      ? { ...s, health: 40, status: "injured" as const, role: "idle" as const }
      : s
  ),
});
console.log(
  `Before end day: health=${useGameStore.getState().survivors[0].health}`
);

useGameStore.getState().endDay();
const afterHealth = useGameStore.getState().survivors[0].health;
console.log(`After end day: health=${afterHealth}`);
assert(
  afterHealth > 40,
  `Survivor should heal without infirmary (was 40, now ${afterHealth})`
);

// Check log mentions natural recovery
const log = useGameStore.getState().log;
const recoveryLog = log.find((e) => e.message.includes("recovered naturally"));
assert(
  recoveryLog !== undefined,
  `Log should mention natural recovery (got: ${log
    .filter((e) => e.day === 1)
    .map((e) => e.message)
    .join("; ")})`
);

console.log("\n=== All tests passed! ===");
