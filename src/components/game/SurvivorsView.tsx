"use client";

import { useGameStore, selectSurvivorCapacity } from "@/game/store";
import { Survivor, SurvivorStatus } from "@/game/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  X,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { useState } from "react";

const STATUS_LABELS: Record<SurvivorStatus, { label: string; color: string }> = {
  healthy: { label: "Healthy", color: "text-emerald-400" },
  injured: { label: "Injured", color: "text-orange-400" },
  sick: { label: "Sick", color: "text-yellow-400" },
  critical: { label: "Critical", color: "text-red-400" },
};

export function SurvivorsView() {
  const area = useGameStore((s) => s.areas[s.currentAreaId]);
  const allSurvivors = useGameStore((s) => s.survivors);
  const setSurvivorResting = useGameStore((s) => s.setSurvivorResting);

  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string | null>(
    null
  );

  if (!area) return null;

  const survivors: Survivor[] = area.survivorIds
    .map((id) => allSurvivors[id])
    .filter(Boolean);

  const capacity = selectSurvivorCapacity(area);
  const idleCount = survivors.filter((s) => s.role === "idle").length;
  const missionCount = survivors.filter((s) => s.role === "onMission").length;
  const restingCount = survivors.filter((s) => s.role === "resting").length;
  const pendingMissions = area.missions.filter((m) => m.status === "pending");

  const selectedSurvivor = survivors.find((s) => s.id === selectedSurvivorId);

  return (
    <div className="space-y-4">
      <AreaHeader name={area.name} />

      {!area.hasBase && (
        <Card className="bg-amber-950/30 border-amber-900/50 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200">
            No base established in this area. You can still scout locations.
            Clear one and claim it as your base to unlock building and production.
          </p>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="text-sm text-stone-400">
            <span className="text-emerald-300 font-bold text-lg">
              {survivors.length}
            </span>{" "}
            / {capacity} survivors
          </div>
          <Badge variant="outline" className="border-stone-700 text-stone-400">Idle: {idleCount}</Badge>
          <Badge variant="outline" className="border-stone-700 text-stone-400">On Mission: {missionCount}</Badge>
          <Badge variant="outline" className="border-stone-700 text-stone-400">Resting: {restingCount}</Badge>
        </div>
      </div>

      <Card className="bg-stone-900/60 border-stone-800 p-3">
        {survivors.length === 0 ? (
          <div className="text-xs text-stone-500 italic py-3 text-center">
            No survivors in this area.
          </div>
        ) : (
          <div className="space-y-1.5">
            {survivors.map((s) => (
              <SurvivorRow
                key={s.id}
                survivor={s}
                selected={selectedSurvivorId === s.id}
                onClick={() =>
                  setSelectedSurvivorId(
                    selectedSurvivorId === s.id ? null : s.id
                  )
                }
                onRest={() =>
                  setSurvivorResting(s.id, s.role !== "resting")
                }
              />
            ))}
          </div>
        )}
      </Card>

      <Card className="bg-stone-900/60 border-stone-800 p-3">
        <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-2">
          Pending Missions ({pendingMissions.length})
        </div>
        {pendingMissions.length === 0 ? (
          <div className="text-xs text-stone-500 italic">
            No missions pending.
          </div>
        ) : (
          <div className="space-y-1.5">
            {pendingMissions.map((m) => {
              const location = area.locations.find((l) => l.id === m.locationId);
              const names = m.team
                .map((id) => allSurvivors[id]?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={m.id}
                  className="text-xs rounded border border-stone-800 bg-stone-950/40 px-2 py-1.5 text-stone-300"
                >
                  <span className="text-amber-300">
                    {m.missionType === "salvage" ? "Salvage" : "Scout"}
                  </span>{" "}
                  {location?.name ?? "Unknown location"}
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    {names || "Unknown survivors"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Selected survivor detail */}
      {selectedSurvivor && (
        <SurvivorDetailCard
          survivor={selectedSurvivor}
          onClose={() => setSelectedSurvivorId(null)}
        />
      )}
    </div>
  );
}

function AreaHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <MapPin className="w-4 h-4 text-stone-500" />
      <h2 className="text-base font-semibold text-stone-100">{name}</h2>
    </div>
  );
}

// ---------- Survivor Row ----------
function SurvivorRow({
  survivor,
  selected,
  onClick,
  onRest,
}: {
  survivor: Survivor;
  selected: boolean;
  onClick: () => void;
  onRest?: () => void;
}) {
  const status = STATUS_LABELS[survivor.status];
  const isResting = survivor.role === "resting";
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
        selected
          ? "border-amber-600 bg-amber-950/30"
          : "border-stone-800 bg-stone-950/40 hover:border-stone-700"
      }`}
      onClick={onClick}
    >
      <CharacterIcon seed={survivor.iconSeed} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-stone-100 truncate">
            {survivor.name}
          </span>
          <span className={`text-[10px] ${status.color}`}>{status.label}</span>
          {isResting && (
            <span className="text-[10px] text-emerald-400">Resting</span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
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
          <span className="text-[10px] text-stone-400">{survivor.health}</span>
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {/* Rest button (always available unless on mission) */}
        {onRest && (
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 text-[10px] ${
              isResting
                ? "text-emerald-400"
                : "text-stone-500 hover:text-stone-300"
            }`}
            onClick={onRest}
          >
            <Bed className="w-3 h-3 mr-0.5" />
            {isResting ? "Stop" : "Rest"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- Survivor Detail Card ----------
function SurvivorDetailCard({
  survivor,
  onClose,
}: {
  survivor: Survivor;
  onClose: () => void;
}) {
  const stats = [
    { icon: <Heart className="w-3 h-3 text-rose-400" />, label: "Health", value: survivor.health },
    { icon: <Beef className="w-3 h-3 text-amber-400" />, label: "Hunger", value: 100 - survivor.hunger },
    { icon: <Droplet className="w-3 h-3 text-sky-400" />, label: "Thirst", value: 100 - survivor.thirst },
    { icon: <Smile className="w-3 h-3 text-emerald-400" />, label: "Morale", value: survivor.morale },
  ];

  const skills = [
    { icon: <Swords className="w-3 h-3" />, label: "Combat", value: survivor.skills.combat },
    { icon: <Backpack className="w-3 h-3" />, label: "Scavenge", value: survivor.skills.scavenging },
    { icon: <Stethoscope className="w-3 h-3" />, label: "Medical", value: survivor.skills.medical },
    { icon: <Wrench className="w-3 h-3" />, label: "Engineer", value: survivor.skills.engineering },
  ];

  const status = STATUS_LABELS[survivor.status];

  return (
    <Card className="bg-stone-900/60 border-stone-800 p-4">
      <div className="flex items-start gap-3 mb-3">
        <CharacterIcon seed={survivor.iconSeed} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-bold text-stone-100">{survivor.name}</div>
            <span className={`text-xs ${status.color}`}>{status.label}</span>
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {survivor.role === "resting"
              ? "Resting at base"
              : survivor.role === "working"
              ? "Assigned"
              : survivor.role === "onMission"
              ? "Currently on a mission"
              : "Idle — ready for orders"}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-stone-500" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-stone-950/50 border border-stone-800 rounded p-1.5">
            <div className="flex items-center gap-1 text-[10px] text-stone-400 mb-0.5">
              {stat.icon}
              {stat.label}
            </div>
            <div className="flex items-center gap-1">
              <Progress
                value={stat.value}
                className={`h-1.5 flex-1 ${
                  stat.value < 30
                    ? "[&>div]:bg-red-500"
                    : stat.value < 60
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-emerald-500"
                }`}
              />
              <span className="text-[10px] text-stone-400">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-stone-950/50 border border-stone-800 rounded p-2">
        <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1.5">
          Skills
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {skills.map((skill) => (
            <div key={skill.label} className="flex items-center gap-1.5 text-xs text-stone-300">
              <span className="text-amber-400">{skill.icon}</span>
              <span>{skill.label}</span>
              <span className="ml-auto text-stone-100 font-bold">{skill.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
