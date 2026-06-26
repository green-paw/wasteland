"use client";

import { useGameStore, selectSurvivorCapacity } from "@/game/store";
import { getMaxTeamSize } from "@/game/data";
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
  UserPlus,
  Users,
  Trash2,
  ArrowRight,
  X,
  Wand2,
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
  const createTeam = useGameStore((s) => s.createTeam);
  const deleteTeam = useGameStore((s) => s.deleteTeam);
  const assignSurvivorToTeam = useGameStore((s) => s.assignSurvivorToTeam);
  const unassignSurvivorFromTeam = useGameStore((s) => s.unassignSurvivorFromTeam);
  const setSurvivorResting = useGameStore((s) => s.setSurvivorResting);

  const [selectedSurvivorId, setSelectedSurvivorId] = useState<string | null>(
    null
  );
  const [assignTargetTeamId, setAssignTargetTeamId] = useState<string | null>(
    null
  );

  if (!area) return null;

  const buildings = area.buildings;
  const teams = area.teams;
  const survivors: Survivor[] = area.survivorIds
    .map((id) => allSurvivors[id])
    .filter(Boolean);

  const capacity = selectSurvivorCapacity(area);
  const maxTeamSize = getMaxTeamSize(buildings.barracks.level);
  // Match store logic: allow up to survivor count, min 3.
  const maxTeams = Math.max(3, survivors.length);

  const selectedSurvivor = survivors.find((s) => s.id === selectedSurvivorId);
  const idleSurvivors = survivors.filter(
    (s) => s.role === "idle" || s.role === "resting"
  );
  const teamSurvivors = survivors.filter((s) => s.role === "working");

  const handleCreateTeam = () => {
    const name = String.fromCharCode(65 + teams.length); // A, B, C...
    createTeam(`Team ${name}`);
  };

  // Auto-assign is now handled entirely by the store.
  const handleAutoAssign = () => {
    useGameStore.getState().autoAssignSurvivors();
  };

  const hasAvailableSurvivors = idleSurvivors.length > 0;

  return (
    <div className="space-y-4">
      <AreaHeader name={area.name} />

      {!area.hasBase && (
        <Card className="bg-amber-950/30 border-amber-900/50 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200">
            No base established in this area. You can still form teams and scout
            locations — clear one and claim it as your base to unlock building
            and production.
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
          <Badge
            variant="outline"
            className="border-stone-700 text-stone-400"
          >
            Max team size: {maxTeamSize}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleAutoAssign}
            disabled={!hasAvailableSurvivors}
            variant="outline"
            className="border-emerald-800 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50"
          >
            <Wand2 className="w-4 h-4 mr-1" />
            Auto-Assign
          </Button>
          <Button
            size="sm"
            onClick={handleCreateTeam}
            disabled={teams.length >= maxTeams}
            className="bg-amber-700 hover:bg-amber-600 text-amber-50"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            New Team ({teams.length}/{maxTeams})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        {/* LEFT: Idle survivors + Teams */}
        <div className="space-y-3">
          {/* Idle survivors */}
          <Card className="bg-stone-900/60 border-stone-800 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-stone-200">
                Available Survivors
              </h3>
              <Badge
                variant="outline"
                className="ml-auto text-[10px] border-stone-700 text-stone-400"
              >
                {idleSurvivors.length}
              </Badge>
            </div>
            {idleSurvivors.length === 0 ? (
              <div className="text-xs text-stone-500 italic py-3 text-center">
                No available survivors. Everyone is on a team or you have none.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                {idleSurvivors.map((s) => (
                  <SurvivorRow
                    key={s.id}
                    survivor={s}
                    selected={selectedSurvivorId === s.id}
                    onClick={() =>
                      setSelectedSurvivorId(
                        selectedSurvivorId === s.id ? null : s.id
                      )
                    }
                    onRest={() => setSurvivorResting(s.id, s.role !== "resting")}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Team survivors */}
          {teamSurvivors.length > 0 && (
            <Card className="bg-stone-900/60 border-stone-800 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Swords className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-stone-200">
                  On Teams
                </h3>
              </div>
              <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1">
                {teamSurvivors.map((s) => {
                  const team = teams.find((t) => t.id === s.assignedTeamId);
                  return (
                    <SurvivorRow
                      key={s.id}
                      survivor={s}
                      selected={selectedSurvivorId === s.id}
                      onClick={() =>
                        setSelectedSurvivorId(
                          selectedSurvivorId === s.id ? null : s.id
                        )
                      }
                      teamName={team?.name}
                      onUnassign={() => unassignSurvivorFromTeam(s.id)}
                    />
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: Teams + Selected survivor detail */}
        <div className="space-y-3">
          {/* Teams list */}
          <Card className="bg-stone-900/60 border-stone-800 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Swords className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-stone-200">Teams</h3>
              <Badge
                variant="outline"
                className="ml-auto text-[10px] border-stone-700 text-stone-400"
              >
                {teams.length}
              </Badge>
            </div>
            {teams.length === 0 ? (
              <div className="text-xs text-stone-500 italic py-3 text-center">
                No teams yet. Create one above to send survivors on missions.
              </div>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => {
                  const teamMembers = survivors.filter((s) =>
                    team.memberIds.includes(s.id)
                  );
                  return (
                    <div
                      key={team.id}
                      className={`border rounded p-2 ${
                        assignTargetTeamId === team.id
                          ? "border-amber-600 bg-amber-950/30"
                          : "border-stone-800 bg-stone-950/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm text-amber-200">
                          {team.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-stone-500">
                            {teamMembers.length}/{maxTeamSize}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 text-stone-500 hover:text-red-400"
                            onClick={() => deleteTeam(team.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5 min-h-[28px]">
                        {teamMembers.length === 0 ? (
                          <span className="text-[10px] text-stone-600 italic">
                            Empty — assign survivors
                          </span>
                        ) : (
                          teamMembers.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-1 bg-stone-900 rounded px-1 py-0.5"
                            >
                              <CharacterIcon seed={s.iconSeed} size={20} />
                              <span className="text-[10px] text-stone-300">
                                {s.name}
                              </span>
                              <button
                                onClick={() =>
                                  unassignSurvivorFromTeam(s.id)
                                }
                                className="text-stone-500 hover:text-red-400 ml-0.5"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      {teamMembers.length < maxTeamSize && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-6 text-[10px] border-stone-700 text-stone-400 hover:bg-stone-800"
                          onClick={() =>
                            setAssignTargetTeamId(
                              assignTargetTeamId === team.id ? null : team.id
                            )
                          }
                        >
                          {assignTargetTeamId === team.id
                            ? "Click an available survivor →"
                            : "+ Assign survivor"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Selected survivor detail */}
          {selectedSurvivor ? (
            <SurvivorDetailCard
              survivor={selectedSurvivor}
              teams={teams}
              assignTargetTeamId={assignTargetTeamId}
              onAssign={(teamId) => {
                assignSurvivorToTeam(selectedSurvivor.id, teamId);
                setAssignTargetTeamId(null);
              }}
              onRest={() =>
                setSurvivorResting(
                  selectedSurvivor.id,
                  selectedSurvivor.role !== "resting"
                )
              }
              onClose={() => setSelectedSurvivorId(null)}
            />
          ) : assignTargetTeamId ? (
            <Card className="bg-amber-950/20 border-amber-900/50 p-3 text-xs text-amber-300 flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Click an available survivor to assign them to this team.
            </Card>
          ) : null}
        </div>
      </div>
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
  teamName,
  onUnassign,
}: {
  survivor: Survivor;
  selected: boolean;
  onClick: () => void;
  onRest?: () => void;
  teamName?: string;
  onUnassign?: () => void;
}) {
  const status = STATUS_LABELS[survivor.status];
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
          <span className="text-[10px] text-stone-400">
            {survivor.health}
          </span>
        </div>
        {teamName && (
          <div className="text-[10px] text-amber-400 mt-0.5">{teamName}</div>
        )}
      </div>
      {teamName && onUnassign ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-stone-500 hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation();
            onUnassign();
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      ) : onRest ? (
        <Button
          size="sm"
          variant="ghost"
          className={`h-6 text-[10px] ${
            survivor.role === "resting"
              ? "text-emerald-400"
              : "text-stone-500 hover:text-stone-300"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onRest();
          }}
        >
          <Bed className="w-3 h-3 mr-0.5" />
          {survivor.role === "resting" ? "Resting" : "Rest"}
        </Button>
      ) : null}
    </div>
  );
}

// ---------- Survivor Detail Card ----------
function SurvivorDetailCard({
  survivor,
  teams,
  assignTargetTeamId,
  onAssign,
  onRest,
  onClose,
}: {
  survivor: Survivor;
  teams: { id: string; name: string; memberIds: string[] }[];
  assignTargetTeamId: string | null;
  onAssign: (teamId: string) => void;
  onRest: () => void;
  onClose: () => void;
}) {
  const stats = [
    { icon: <Heart className="w-3 h-3 text-rose-400" />, label: "Health", value: survivor.health, color: "rose" },
    { icon: <Beef className="w-3 h-3 text-amber-400" />, label: "Hunger", value: 100 - survivor.hunger, color: "amber" },
    { icon: <Droplet className="w-3 h-3 text-sky-400" />, label: "Thirst", value: 100 - survivor.thirst, color: "sky" },
    { icon: <Smile className="w-3 h-3 text-emerald-400" />, label: "Morale", value: survivor.morale, color: "emerald" },
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
              ? "Assigned to a team"
              : survivor.role === "onMission"
              ? "Currently on a mission"
              : "Idle — ready for orders"}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-stone-500"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-stone-950/50 border border-stone-800 rounded p-1.5"
          >
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

      {/* Skills */}
      <div className="bg-stone-950/50 border border-stone-800 rounded p-2 mb-3">
        <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1.5">
          Skills
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {skills.map((skill) => (
            <div
              key={skill.label}
              className="flex items-center gap-1.5 text-xs text-stone-300"
            >
              <span className="text-amber-400">{skill.icon}</span>
              <span>{skill.label}</span>
              <span className="ml-auto text-stone-100 font-bold">
                {skill.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className={`flex-1 ${
            survivor.role === "resting"
              ? "border-emerald-700 bg-emerald-950/30 text-emerald-300"
              : "border-stone-700 text-stone-300 hover:bg-stone-800"
          }`}
          onClick={onRest}
          disabled={survivor.role === "working"}
        >
          <Bed className="w-3 h-3 mr-1" />
          {survivor.role === "resting" ? "Stop Resting" : "Rest"}
        </Button>
      </div>

      {/* Assign to team */}
      {assignTargetTeamId && survivor.role === "idle" && (
        <Button
          size="sm"
          className="w-full mt-2 bg-amber-700 hover:bg-amber-600 text-amber-50"
          onClick={() => onAssign(assignTargetTeamId)}
        >
          <ArrowRight className="w-3 h-3 mr-1" />
          Assign to selected team
        </Button>
      )}

      {survivor.health < 30 && (
        <div className="mt-2 text-[10px] text-red-400 bg-red-950/30 border border-red-900/50 rounded p-1.5">
          Health too low — cannot join teams until treated at the infirmary.
        </div>
      )}
    </Card>
  );
}
