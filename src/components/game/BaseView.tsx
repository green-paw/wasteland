"use client";

import { useGameStore, selectSurvivorCapacity } from "@/game/store";
import { BUILDING_DEFS, getUpgradeCost } from "@/game/data";
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
  Plus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { RESOURCE_INFO } from "@/game/data";
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
  const buildings = useGameStore((s) => s.buildings);
  const survivors = useGameStore((s) => s.survivors);
  const resources = useGameStore((s) => s.resources);
  const upgradeBuilding = useGameStore((s) => s.upgradeBuilding);
  const repairBuilding = useGameStore((s) => s.repairBuilding);

  const capacity = selectSurvivorCapacity(useGameStore.getState());

  const injuredSurvivors = survivors.filter(
    (s) => s.status === "injured" || s.status === "critical" || s.status === "sick"
  );

  return (
    <div className="space-y-4">
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <OverviewCard
          icon={<Users className="w-5 h-5 text-emerald-400" />}
          label="Survivors"
          value={`${survivors.length} / ${capacity}`}
          sublabel={survivors.length >= capacity ? "Full" : "Slots open"}
          tone={survivors.length >= capacity ? "warning" : "ok"}
        />
        <OverviewCard
          icon={<HeartPulse className="w-5 h-5 text-rose-400" />}
          label="Injured"
          value={injuredSurvivors.length.toString()}
          sublabel={
            injuredSurvivors.length === 0 ? "All healthy" : "Needs infirmary"
          }
          tone={injuredSurvivors.length > 0 ? "warning" : "ok"}
        />
        <OverviewCard
          icon={<ShieldAlert className="w-5 h-5 text-amber-400" />}
          label="Defense"
          value={(buildings.watchtower.level * 15).toString()}
          sublabel={`Tower Lv ${buildings.watchtower.level}`}
          tone="ok"
        />
        <OverviewCard
          icon={<Hammer className="w-5 h-5 text-stone-300" />}
          label="Buildings"
          value={`${Object.values(buildings).filter((b) => b.level > 0).length} / 8`}
          sublabel="Operational"
          tone="ok"
        />
      </div>

      {/* Buildings list */}
      <div>
        <h2 className="text-sm uppercase tracking-wide text-stone-500 mb-2 px-1">
          Base Buildings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              ([k, v]) => resources[k as keyof typeof resources] >= (v as number)
            );
            const hpPct = (building.hp / building.maxHp) * 100;
            const damaged = building.hp < building.maxHp;
            const repairCost = damaged
              ? { materials: Math.ceil((building.maxHp - building.hp) / 5) }
              : null;
            const canRepair = repairCost
              ? resources.materials >= (repairCost.materials as number)
              : false;

            return (
              <Card
                key={type}
                className="bg-stone-900/60 border-stone-800 p-4 hover:border-stone-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded grid place-items-center text-2xl flex-shrink-0 ${
                      isBuilt
                        ? "bg-stone-800 border border-stone-700"
                        : "bg-stone-950 border border-stone-800 opacity-50"
                    }`}
                  >
                    {def.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-stone-100 text-sm">
                        {def.label}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          isBuilt
                            ? "border-emerald-800 text-emerald-300 bg-emerald-950/40"
                            : "border-stone-700 text-stone-500"
                        }`}
                      >
                        {isBuilt ? `Lv ${building.level}` : "Not Built"}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 leading-snug">
                      {def.description}
                    </p>
                  </div>
                </div>

                {isBuilt && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-stone-500">
                      <span>STRUCTURAL HP</span>
                      <span>
                        {building.hp} / {building.maxHp}
                      </span>
                    </div>
                    <Progress
                      value={hpPct}
                      className={`h-1.5 ${
                        hpPct < 30 ? "[&>div]:bg-red-500" : "[&>div]:bg-emerald-700"
                      }`}
                    />
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {isBuilt && (
                    <div className="text-[10px] text-stone-500 mr-auto">
                      {def.effects[0]}
                    </div>
                  )}
                  {!isBuilt && (
                    <div className="text-[10px] text-stone-600 mr-auto">
                      Build to unlock
                    </div>
                  )}

                  {!isMaxed && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canAfford}
                      onClick={() => upgradeBuilding(type)}
                      className={`h-7 text-xs ${
                        canAfford
                          ? "border-amber-800 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50"
                          : "border-stone-800 text-stone-600"
                      }`}
                    >
                      <ArrowUp className="w-3 h-3 mr-1" />
                      {isBuilt ? "Upgrade" : "Build"}
                      <span className="ml-1.5 flex items-center gap-1">
                        {Object.entries(cost).map(([k, v]) => (
                          <span key={k} className="flex items-center gap-0.5">
                            <span>{RESOURCE_INFO[k as keyof typeof RESOURCE_INFO].icon}</span>
                            <span>{v}</span>
                          </span>
                        ))}
                      </span>
                    </Button>
                  )}

                  {isMaxed && (
                    <div className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Max
                    </div>
                  )}

                  {damaged && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canRepair}
                      onClick={() => repairBuilding(type)}
                      className={`h-7 text-xs ${
                        canRepair
                          ? "border-stone-700 text-stone-200 hover:bg-stone-800"
                          : "border-stone-800 text-stone-600"
                      }`}
                    >
                      <Wrench className="w-3 h-3 mr-1" />
                      Repair
                      {repairCost && (
                        <span className="ml-1.5 flex items-center gap-0.5">
                          <span>{RESOURCE_INFO.materials.icon}</span>
                          <span>{repairCost.materials}</span>
                        </span>
                      )}
                    </Button>
                  )}
                </div>

                {!canAfford && !isMaxed && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    Not enough resources
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Survivor roster at base */}
      <div>
        <h2 className="text-sm uppercase tracking-wide text-stone-500 mb-2 px-1">
          Survivor Roster
        </h2>
        <Card className="bg-stone-900/60 border-stone-800 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {survivors.map((s) => (
              <SurvivorMiniCard key={s.id} survivor={s} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  tone: "ok" | "warning";
}) {
  return (
    <Card className="bg-stone-900/60 border-stone-800 p-3">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-[10px] uppercase tracking-wide text-stone-500">
          {label}
        </div>
      </div>
      <div
        className={`text-2xl font-bold mt-1 ${
          tone === "warning" ? "text-amber-300" : "text-stone-100"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] text-stone-500 mt-0.5">{sublabel}</div>
    </Card>
  );
}

function SurvivorMiniCard({ survivor }: { survivor: Survivor }) {
  const statusColor =
    survivor.status === "critical"
      ? "border-red-600 bg-red-950/40"
      : survivor.status === "injured"
      ? "border-orange-700 bg-orange-950/30"
      : survivor.status === "sick"
      ? "border-yellow-700 bg-yellow-950/30"
      : "border-stone-700 bg-stone-900/40";

  const roleLabel =
    survivor.role === "resting"
      ? "Resting"
      : survivor.role === "onMission"
      ? "On Mission"
      : survivor.role === "working"
      ? "On Team"
      : "Idle";

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded border ${statusColor}`}
    >
      <CharacterIcon seed={survivor.iconSeed} size={32} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-stone-100 truncate">
          {survivor.name}
        </div>
        <div className="text-[10px] text-stone-400">{roleLabel}</div>
        <div className="mt-0.5 flex items-center gap-1">
          <HeartPulse className="w-2.5 h-2.5 text-rose-400" />
          <Progress
            value={survivor.health}
            className={`h-1 flex-1 ${
              survivor.health < 30
                ? "[&>div]:bg-red-500"
                : survivor.health < 70
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-emerald-500"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
