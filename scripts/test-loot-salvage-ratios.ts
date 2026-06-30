/**
 * Verify the new loot vs salvage ratios:
 * - Loot tables should have LOW materials, HIGH other resources
 * - Salvage tables should have HIGH materials, LOW other resources
 */
import { LOCATION_DEFS, ALL_LOCATION_TYPES } from "../src/game/data";
import { ResourceType } from "../src/game/types";

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  } else {
    console.log("PASS:", msg);
  }
}

console.log("\n=== Loot vs Salvage ratio check ===\n");

let allLootMaterialLow = true;
let allSalvageMaterialHigh = true;
let allSalvageHasMaterials = true;
let allLootHasOtherResources = true;

for (const type of ALL_LOCATION_TYPES) {
  const def = LOCATION_DEFS[type];
  const lootMats = (def.lootTable.materials ?? 0) as number;
  const lootOther =
    ((def.lootTable.food ?? 0) as number) +
    ((def.lootTable.water ?? 0) as number);

  const salvageMats = (def.salvageTable.materials ?? 0) as number;
  const salvageOther =
    ((def.salvageTable.food ?? 0) as number) +
    ((def.salvageTable.water ?? 0) as number);

  const lootMatsPct = lootMats + lootOther > 0 ? (lootMats / (lootMats + lootOther)) * 100 : 0;
  const salvageMatsPct =
    salvageMats + salvageOther > 0 ? (salvageMats / (salvageMats + salvageOther)) * 100 : 0;

  console.log(`${def.label}:`);
  console.log(
    `  Loot:    materials=${lootMats}, other=${lootOther}  →  materials is ${lootMatsPct.toFixed(0)}% of total`
  );
  console.log(
    `  Salvage: materials=${salvageMats}, other=${salvageOther}  →  materials is ${salvageMatsPct.toFixed(0)}% of total`
  );

  // Loot should have low materials share (< 25%)
  if (lootMatsPct >= 25) {
    console.error(`  ❌ Loot materials too high (${lootMatsPct.toFixed(0)}%)`);
    allLootMaterialLow = false;
  }
  // Salvage should have high materials share (> 60%)
  if (salvageMatsPct < 60) {
    console.error(`  ❌ Salvage materials too low (${salvageMatsPct.toFixed(0)}%)`);
    allSalvageMaterialHigh = false;
  }
  // Salvage must always have materials
  if (salvageMats === 0) {
    allSalvageHasMaterials = false;
  }
  // Loot must have at least one other resource
  if (lootOther === 0) {
    allLootHasOtherResources = false;
  }
  console.log("");
}

assert(allLootMaterialLow, "All loot tables should have low materials share (<25%)");
assert(allSalvageMaterialHigh, "All salvage tables should have high materials share (>60%)");
assert(allSalvageHasMaterials, "All salvage tables must include materials");
assert(allLootHasOtherResources, "All loot tables must include at least one non-material resource");

// Check that salvage yields more total materials than loot for the same building type
console.log("\n=== Salvage should yield more total materials than loot ===");
let salvageBeatsLoot = true;
for (const type of ALL_LOCATION_TYPES) {
  const def = LOCATION_DEFS[type];
  const lootMats = (def.lootTable.materials ?? 0) as number;
  const salvageMats = (def.salvageTable.materials ?? 0) as number;
  if (salvageMats <= lootMats) {
    console.error(`  ❌ ${def.label}: salvage materials (${salvageMats}) <= loot materials (${lootMats})`);
    salvageBeatsLoot = false;
  }
}
assert(salvageBeatsLoot, "Salvage should yield more materials than loot for every building type");

console.log("\n=== All ratio checks passed! ===");
