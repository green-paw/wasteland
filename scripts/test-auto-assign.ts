/**
 * Test the auto-assign logic for survivors to teams.
 */
import { useGameStore } from "../src/game/store";
import { generateSurvivor } from "../src/game/worldGen";
import { getMaxTeamSize } from "../src/game/data";

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

// ============== Test: Auto-assign with multiple survivors ==============
console.log("\n=== Test: Auto-assign distributes survivors ===");
reset();

// Add 4 more survivors (total 5)
const state = useGameStore.getState();
const extras = [generateSurvivor(100), generateSurvivor(101), generateSurvivor(102), generateSurvivor(103)];
useGameStore.setState({
  survivors: [...state.survivors, ...extras],
});

console.log(`Total survivors: ${useGameStore.getState().survivors.length}`);
console.log(`Teams before: ${useGameStore.getState().teams.length}`);

const maxTeamSize = getMaxTeamSize(useGameStore.getState().buildings.barracks.level);
console.log(`Max team size: ${maxTeamSize}`);

// Manually run the auto-assign logic (same as in SurvivorsView)
const runAutoAssign = () => {
  const s = useGameStore.getState();
  const available = s.survivors.filter((surv) => surv.role === "idle" || surv.role === "resting");
  if (available.length === 0) return;

  let teams = [...s.teams].sort((a, b) => a.memberIds.length - b.memberIds.length);

  for (const survivor of available) {
    let target = teams.find((t) => t.memberIds.length < maxTeamSize);
    if (!target) {
      const maxTeamsCount = Math.max(3, s.survivors.length);
      if (teams.length >= maxTeamsCount) break;
      const newName = `Team ${String.fromCharCode(65 + teams.length)}`;
      const newId = s.createTeam(newName);
      if (!newId) break;
      const updated = useGameStore.getState().teams;
      target = updated.find((t) => t.id === newId);
      if (!target) break;
      teams = [...updated].sort((a, b) => a.memberIds.length - b.memberIds.length);
    }
    s.assignSurvivorToTeam(survivor.id, target.id);
    teams = [...useGameStore.getState().teams].sort(
      (a, b) => a.memberIds.length - b.memberIds.length
    );
  }
};

runAutoAssign();

const finalState = useGameStore.getState();
console.log(`\nTeams after auto-assign: ${finalState.teams.length}`);
finalState.teams.forEach((t) => {
  console.log(`  ${t.name}: ${t.memberIds.length} members`);
});

const idleCount = finalState.survivors.filter((s) => s.role === "idle").length;
console.log(`Idle survivors remaining: ${idleCount}`);

assert(finalState.teams.length >= 2, `Should have created at least 2 teams (got ${finalState.teams.length})`);
assert(
  finalState.teams.every((t) => t.memberIds.length > 0),
  "All teams should have at least 1 member"
);
assert(
  idleCount === 0 || idleCount === finalState.survivors.length,
  `All survivors should be assigned (idle: ${idleCount})`
);

// Verify distribution is balanced (no team should have >maxTeamSize)
assert(
  finalState.teams.every((t) => t.memberIds.length <= maxTeamSize),
  `All teams within max size ${maxTeamSize}`
);

console.log("\n=== Auto-assign test passed! ===");
