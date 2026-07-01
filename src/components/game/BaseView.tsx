"use client";

import { useGameStore, selectSurvivorCapacity } from "@/game/store";
import {
  BUILDING_DEFS,
  getUpgradeCost,
  RESOURCE_INFO,
  getBaseDefense,
  getAreaConsumption,
  INFIRMARY_HEAL_PER_LEVEL,
} from "@/game/data";
import { BuildingType, Survivor } from "@/game/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Hammer,
  Wrench,
  HeartPulse,
  Users,
  ShieldAlert,
  ArrowUp,
  CheckCircle2,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { CharacterIcon } from "./CharacterIcon";

const BUILDING_ORDER: BuildingType[] = [
  "shelter",
  "workshop",
  "infirmary",
  "farm",
  "well",
  "watchtower",
  "storage",
  "barracks",
];

export function BaseView() {
  const area = useGameStore((s) => s.areas[s.currentAreaId]);
  const allSurvivors = useGameStore((s) => s.survivors);
  const upgradeBuilding = useGameStore((s) => s.upgradeBuilding);
  const repairBuilding = useGameStore((s) => s.repairBuilding);

  if (!area) return null;

  const buildings = area.buildings;
  const resources = area.resources;

  const survivors: Survivor[] = area.survivorIds
    .map((id) => allSurvivors[id])
    .filter(Boolean);
  const pendingMissions = area.missions.filter((m) => m.status === "pending");

  const capacity = selectSurvivorCapacity(area);

  if (!area.hasBase) {
    return (
      <div className="space-y-2">
        <AreaHeader name={area.name} />
        <Card className="bg-stone-900/60 border-stone-800 p-4 flex flex-col items-center text-center">
          <AlertCircle className="w-6 h-6 text-amber-400 mb-1.5" />
          <p className="text-xs text-stone-300 max-w-md">
            No base established in this area. Clear a location in the Area Map
            and claim it as your base.
          </p>
        </Card>
      </div>
    );
  }

  const injuredSurvivors = survivors.filter(
    (s) =>
      s.status === "injured" || s.status === "critical" || s.status === "sick"
  );

  const farmFood = buildings.farm.level * 5;
  const wellWater = buildings.well.level * 5;
  const baseDefense = getBaseDefense(buildings.watchtower.level, survivors);
  const dailyConsumption = getAreaConsumption(survivors);
  const infirmaryBonus = buildings.infirmary.level * INFIRMARY_HEAL_PER_LEVEL;
  const foodNet = farmFood - dailyConsumption.food;
  const waterNet = wellWater - dailyConsumption.water;

  return (
    <div className="space-y-2">
      <AreaHeader name={area.name} />

      {/* Stats + daily summary */}
      <Card className="bg-stone-900/60 border-stone-800 p-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          <StatChip
            icon={<Users className="w-3.5 h-3.5 text-emerald-400" />}
            label="Survivors"
            value={`${survivors.length}/${capacity}`}
            warn={survivors.length >= capacity}
          />
          <StatChip
            icon={<HeartPulse className="w-3.5 h-3.5 text-rose-400" />}
            label="Injured"
            value={String(injuredSurvivors.length)}
            warn={injuredSurvivors.length > 0}
          />
          <StatChip
            icon={<ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
            label="Defense"
            value={String(baseDefense.total)}
            hint={`${baseDefense.tower}+${baseDefense.guards}`}
          />
          <StatChip
            icon={<Hammer className="w-3.5 h-3.5 text-stone-400" />}
            label="Built"
            value={`${Object.values(buildings).filter((b) => b.level > 0).length}/8`}
          />
        </div>

        <div className="mt-2 pt-2 border-t border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px]">
          <div className="flex items-center justify-between gap-2 bg-stone-950/40 rounded px-1.5 py-0.5">
            <span className="text-stone-500 shrink-0">🍔 Food</span>
            <span
              className={`tabular-nums ${foodNet >= 0 ? "text-emerald-300" : "text-red-300"}`}
            >
              +{farmFood} −{dailyConsumption.food} = {foodNet >= 0 ? "+" : ""}
              {foodNet}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-stone-950/40 rounded px-1.5 py-0.5">
            <span className="text-stone-500 shrink-0">💧 Water</span>
            <span
              className={`tabular-nums ${waterNet >= 0 ? "text-emerald-300" : "text-red-300"}`}
            >
              +{wellWater} −{dailyConsumption.water} ={" "}
              {waterNet >= 0 ? "+" : ""}
              {waterNet}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 bg-stone-950/40 rounded px-1.5 py-0.5">
            <span className="text-stone-500 shrink-0">⚕️ Heal</span>
            <span className="text-stone-300 tabular-nums">
              {infirmaryBonus > 0 ? `+${infirmaryBonus} resting` : "rest"}
            </span>
          </div>
        </div>

        {(foodNet < 0 || waterNet < 0) && (
          <p className="mt-1.5 text-[10px] text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Production won&apos;t cover consumption tonight.
          </p>
        )}
      </Card>

      {/* Buildings */}
      <div>
        <h2 className="text-[10px] uppercase tracking-wide text-stone-500 mb-1 px-0.5">
          Buildings
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
          {BUILDING_ORDER.map((type) => {
            const def = BUILDING_DEFS[type];
            const building = buildings[type];
            const isBuilt = building.level > 0;
            const isMaxed = building.level >= building.maxLevel;
            const cost = getUpgradeCost(
              type,
              building.level,
              buildings.workshop.level
            );
            const canAfford = Object.entries(cost).every(
              ([k, v]) =>
                resources[k as keyof typeof resources] >= (v as number)
            );
            const hpPct = (building.hp / building.maxHp) * 100;
            const damaged = isBuilt && building.hp < building.maxHp;
            const repairCost = damaged
              ? { materials: Math.ceil((building.maxHp - building.hp) / 5) }
              : null;
            const canRepair = repairCost
              ? resources.materials >= (repairCost.materials as number)
              : false;

            return (
              <Card
                key={type}
                className="bg-stone-900/60 border-stone-800 p-2 hover:border-stone-700 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded grid place-items-center text-lg shrink-0 ${
                      isBuilt
                        ? "bg-stone-800 border border-stone-700"
                        : "bg-stone-950 border border-stone-800 opacity-50"
                    }`}
                    title={def.description}
                  >
                    {def.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-stone-100 truncate">
                        {def.label}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1 py-0 h-4 shrink-0 ${
                          isBuilt
                            ? "border-emerald-800 text-emerald-300 bg-emerald-950/40"
                            : "border-stone-700 text-stone-500"
                        }`}
                      >
                        {isBuilt ? `Lv${building.level}` : "—"}
                      </Badge>
                    </div>
                    <p
                      className="text-[10px] text-stone-500 truncate"
                      title={def.description}
                    >
                      {isBuilt ? def.effects[0] : "Not built"}
                    </p>
                    {damaged && (
                      <Progress
                        value={hpPct}
                        className={`h-1 mt-1 ${
                          hpPct < 30
                            ? "[&>div]:bg-red-500"
                            : "[&>div]:bg-emerald-700"
                        }`}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isMaxed && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canAfford}
                        onClick={() => upgradeBuilding(type)}
                        className={`h-6 px-1.5 text-[10px] ${
                          canAfford
                            ? "border-amber-800 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50"
                            : "border-stone-800 text-stone-600"
                        }`}
                        title={
                          !canAfford
                            ? "Not enough resources"
                            : isBuilt
                              ? "Upgrade"
                              : "Build"
                        }
                      >
                        <ArrowUp className="w-3 h-3" />
                        {Object.entries(cost).map(([k, v]) => (
                          <span key={k} className="ml-0.5">
                            {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO].icon}
                            {v}
                          </span>
                        ))}
                      </Button>
                    )}
                    {isMaxed && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {damaged && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canRepair}
                        onClick={() => repairBuilding(type)}
                        className={`h-6 px-1.5 text-[10px] ${
                          canRepair
                            ? "border-stone-700 text-stone-200"
                            : "border-stone-800 text-stone-600"
                        }`}
                      >
                        <Wrench className="w-3 h-3" />
                        {repairCost?.materials}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Roster */}
      <div>
        <h2 className="text-[10px] uppercase tracking-wide text-stone-500 mb-1 px-0.5">
          Roster
          {survivors.length > 0 && (
            <span className="text-stone-600 font-normal normal-case ml-1">
              ({survivors.length})
            </span>
          )}
        </h2>

        {survivors.length === 0 ? (
          <Card className="bg-stone-900/60 border-stone-800 p-3 text-center">
            <p className="text-xs text-stone-400">
              No survivors in this area.
            </p>
          </Card>
        ) : (
          <Card className="bg-stone-900/60 border-stone-800 p-2 space-y-2">
            {pendingMissions.length > 0 && (
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-stone-400 pb-1.5 border-b border-stone-800">
                <span className="text-stone-500 uppercase tracking-wide shrink-0">
                  Missions:
                </span>
                {pendingMissions.map((m) => {
                  const location = area.locations.find(
                    (l) => l.id === m.locationId
                  );
                  return (
                    <span key={m.id} className="text-stone-300">
                      <span className="text-amber-300">
                        {m.missionType === "salvage" ? "Salvage" : "Scout"}
                      </span>{" "}
                      {location?.name ?? "?"} ({m.team.length})
                    </span>
                  );
                })}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
              {survivors.map((s) => (
                <SurvivorMiniCard key={s.id} survivor={s} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function AreaHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1.5 px-0.5">
      <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
      <h2 className="text-sm font-semibold text-stone-100 truncate">{name}</h2>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  hint,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-stone-950/40 rounded px-2 py-1.5 min-w-0">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-stone-500">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={`text-base font-bold tabular-nums leading-tight ${
          warn ? "text-amber-300" : "text-stone-100"
        }`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[9px] text-stone-600 tabular-nums">{hint}</div>
      )}
    </div>
  );
}

function SurvivorMiniCard({ survivor }: { survivor: Survivor }) {
  const statusColor =
    survivor.status === "critical"
      ? "border-red-600/80 bg-red-950/30"
      : survivor.status === "injured"
        ? "border-orange-700/80 bg-orange-950/25"
        : survivor.status === "sick"
          ? "border-yellow-700/80 bg-yellow-950/25"
          : "border-stone-800 bg-stone-950/40";

  const roleLabel =
    survivor.role === "resting"
      ? "Rest"
      : survivor.role === "onMission"
        ? "Mission"
        : survivor.role === "working"
          ? "Work"
          : survivor.role === "guarding"
            ? "Guard"
            : "Idle";

  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 rounded border ${statusColor}`}
      title={`${survivor.name} — ${survivor.status}, ${roleLabel}`}
    >
      <CharacterIcon seed={survivor.iconSeed} size={24} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium text-stone-100 truncate leading-tight">
          {survivor.name}
        </div>
        <div className="text-[9px] text-stone-500 leading-tight">
          {roleLabel}
        </div>
        <Progress
          value={survivor.health}
          className={`h-0.5 mt-0.5 ${
            survivor.health < 30
              ? "[&>div]:bg-red-500"
              : survivor.health < 70
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-emerald-500"
          }`}
        />
      </div>
    </div>
  );
}
