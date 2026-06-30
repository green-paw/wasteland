"use client";

import { useGameStore, selectSurvivorCapacity } from "@/game/store";
import { Survivor, SurvivorRole, SurvivorStatus } from "@/game/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CharacterIcon } from "./CharacterIcon";
import {
  Heart,
  Beef,
  Droplet,
  Smile,
  Swords,
  Backpack,
  Stethoscope,
  Wrench,
  Bed,
  AlertCircle,
  MapPin,
  Users,
  Shield,
} from "lucide-react";

const STATUS_DOT: Record<SurvivorStatus, string> = {
  healthy: "bg-emerald-400",
  injured: "bg-orange-400",
  sick: "bg-yellow-400",
  critical: "bg-red-500",
};

const STATUS_LABELS: Record<SurvivorStatus, string> = {
  healthy: "Healthy",
  injured: "Injured",
  sick: "Sick",
  critical: "Critical",
};

const ROLE_LABELS: Record<SurvivorRole, string> = {
  idle: "Idle",
  resting: "Resting",
  onMission: "On mission",
  working: "Assigned",
  guarding: "Guarding",
};

const ROW_GRID =
  "grid grid-cols-1 md:grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-3 gap-y-2 md:gap-y-0 md:items-center";

const STAT_GRID =
  "grid grid-cols-4 gap-x-2 sm:gap-x-3 w-full md:max-w-[12rem]";

function statColor(value: number, invert = false): string {
  const v = invert ? 100 - value : value;
  if (v < 30) return "text-red-400";
  if (v < 60) return "text-amber-400";
  return "text-stone-200";
}

function needColor(need: number): string {
  if (need >= 80) return "text-red-400";
  if (need >= 50) return "text-amber-400";
  return "text-stone-200";
}

export function SurvivorsView() {
  const area = useGameStore((s) => s.areas[s.currentAreaId]);
  const allSurvivors = useGameStore((s) => s.survivors);
  const setSurvivorResting = useGameStore((s) => s.setSurvivorResting);
  const setSurvivorGuarding = useGameStore((s) => s.setSurvivorGuarding);

  if (!area) return null;

  const survivors: Survivor[] = area.survivorIds
    .map((id) => allSurvivors[id])
    .filter(Boolean);

  const capacity = selectSurvivorCapacity(area);
  const idleCount = survivors.filter((s) => s.role === "idle").length;
  const missionCount = survivors.filter((s) => s.role === "onMission").length;
  const restingCount = survivors.filter((s) => s.role === "resting").length;
  const guardingCount = survivors.filter((s) => s.role === "guarding").length;
  const pendingMissions = area.missions.filter((m) => m.status === "pending");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <MapPin className="w-4 h-4 text-stone-500 shrink-0" />
        <h2 className="text-base font-semibold text-stone-100 truncate">
          {area.name}
        </h2>
      </div>

      {!area.hasBase && (
        <Card className="bg-amber-950/30 border-amber-900/50 p-2.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-200">
            No base in this area — scout and claim a location to unlock building.
          </p>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400 px-1">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 font-bold tabular-nums">
            {survivors.length}
          </span>
          <span className="text-stone-600">/</span>
          <span className="tabular-nums">{capacity}</span>
        </span>
        <span className="text-stone-700 hidden sm:inline">·</span>
        <span className="tabular-nums">Idle {idleCount}</span>
        <span className="tabular-nums">Mission {missionCount}</span>
        <span className="tabular-nums">Rest {restingCount}</span>
        {area.hasBase && (
          <span className="tabular-nums">Guard {guardingCount}</span>
        )}
      </div>

      <Card className="bg-stone-900/60 border-stone-800 p-2">
        {survivors.length === 0 ? (
          <div className="text-xs text-stone-500 italic py-3 text-center">
            No survivors in this area.
          </div>
        ) : (
          <div className="divide-y divide-stone-800/80">
            <div
              className={`${ROW_GRID} hidden md:grid px-1.5 pb-1.5 text-[10px] uppercase tracking-wide text-stone-500`}
            >
              <div>Survivor</div>
              <div>Needs</div>
              <div>Skills</div>
              <div className="text-right pr-1">Actions</div>
            </div>

            {survivors.map((s) => (
              <SurvivorRow
                key={s.id}
                survivor={s}
                hasBase={area.hasBase}
                onRest={() => setSurvivorResting(s.id, s.role !== "resting")}
                onGuard={() =>
                  setSurvivorGuarding(s.id, s.role !== "guarding")
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card className="bg-stone-900/60 border-stone-800 p-2.5">
        <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1.5">
          Pending Missions ({pendingMissions.length})
        </div>
        {pendingMissions.length === 0 ? (
          <div className="text-xs text-stone-500 italic">No missions pending.</div>
        ) : (
          <div className="space-y-1">
            {pendingMissions.map((m) => {
              const location = area.locations.find((l) => l.id === m.locationId);
              const names = m.team
                .map((id) => allSurvivors[id]?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={m.id}
                  className="text-[11px] rounded border border-stone-800 bg-stone-950/40 px-2 py-1 text-stone-300 flex flex-wrap gap-x-1.5 gap-y-0.5"
                >
                  <span className="text-amber-300 shrink-0">
                    {m.missionType === "salvage" ? "Salvage" : "Scout"}
                  </span>
                  <span className="text-stone-500">→</span>
                  <span className="truncate">{location?.name ?? "Unknown"}</span>
                  <span className="text-stone-600 w-full sm:w-auto sm:ml-auto text-[10px] truncate">
                    {names}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:hidden text-[10px] uppercase tracking-wide text-stone-500 mb-0.5">
      {children}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  value,
  className,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  className?: string;
  title: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 tabular-nums text-[11px] ${className ?? "text-stone-200"}`}
      title={title}
    >
      <Icon className="w-3 h-3 shrink-0 opacity-80" />
      {value}
    </span>
  );
}

function SurvivorRow({
  survivor,
  hasBase,
  onRest,
  onGuard,
}: {
  survivor: Survivor;
  hasBase: boolean;
  onRest?: () => void;
  onGuard?: () => void;
}) {
  const isResting = survivor.role === "resting";
  const isGuarding = survivor.role === "guarding";
  const onMission = survivor.role === "onMission";
  const onAssignment = survivor.role === "working";
  const actionsLocked = onMission || onAssignment;

  return (
    <div className={`${ROW_GRID} py-2.5 md:py-2 px-1.5`}>
      <div className="min-w-0">
        <SectionLabel>Survivor</SectionLabel>
        <div className="flex items-center gap-2 min-w-0">
          <CharacterIcon seed={survivor.iconSeed} size={32} className="shrink-0" />
          <div className="min-w-0">
            <div
              className="text-xs sm:text-sm font-medium text-stone-100 truncate"
              title={survivor.name}
            >
              {survivor.name}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-stone-400">
              <span className="inline-flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[survivor.status]}`}
                />
                {STATUS_LABELS[survivor.status]}
              </span>
              <span className="text-stone-600">·</span>
              <span>{ROLE_LABELS[survivor.role]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <SectionLabel>Needs</SectionLabel>
        <div className={STAT_GRID}>
          <MiniStat
            icon={Heart}
            value={survivor.health}
            className={statColor(survivor.health)}
            title={`Health ${survivor.health}`}
          />
          <MiniStat
            icon={Beef}
            value={survivor.hunger}
            className={needColor(survivor.hunger)}
            title={`Hunger ${survivor.hunger} (lower is better)`}
          />
          <MiniStat
            icon={Droplet}
            value={survivor.thirst}
            className={needColor(survivor.thirst)}
            title={`Thirst ${survivor.thirst} (lower is better)`}
          />
          <MiniStat
            icon={Smile}
            value={survivor.morale}
            className={statColor(survivor.morale)}
            title={`Morale ${survivor.morale}`}
          />
        </div>
      </div>

      <div className="min-w-0">
        <SectionLabel>Skills</SectionLabel>
        <div className={STAT_GRID}>
          <MiniStat
            icon={Swords}
            value={survivor.skills.combat}
            title={`Combat ${survivor.skills.combat}`}
          />
          <MiniStat
            icon={Backpack}
            value={survivor.skills.scavenging}
            title={`Scavenging ${survivor.skills.scavenging}`}
          />
          <MiniStat
            icon={Stethoscope}
            value={survivor.skills.medical}
            title={`Medical ${survivor.skills.medical}`}
          />
          <MiniStat
            icon={Wrench}
            value={survivor.skills.engineering}
            title={`Engineering ${survivor.skills.engineering}`}
          />
        </div>
      </div>

      <div>
        <SectionLabel>Actions</SectionLabel>
        <div className="flex items-center gap-1 md:justify-end">
          {onRest && !actionsLocked && (
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 shrink-0 ${
                isResting
                  ? "text-emerald-400 bg-emerald-950/40"
                  : "text-stone-500 hover:text-stone-300"
              }`}
              onClick={onRest}
              title={
                isResting
                  ? survivor.status !== "healthy"
                    ? "Stop bed rest"
                    : "Stop resting"
                  : survivor.status !== "healthy"
                    ? "Bed rest — heals faster, costs 2 food & water/day"
                    : "Rest — recover morale"
              }
            >
              <Bed className="w-4 h-4" />
            </Button>
          )}
          {onGuard && hasBase && !actionsLocked && (
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 shrink-0 ${
                isGuarding
                  ? "text-sky-400 bg-sky-950/40"
                  : "text-stone-500 hover:text-stone-300"
              }`}
              onClick={onGuard}
              title={isGuarding ? "Stop guarding" : "Guard base"}
            >
              <Shield className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
