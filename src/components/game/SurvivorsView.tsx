"use client";

import { useGameStore, selectSurvivorCapacity } from "@/game/store";
import { getMaxTeamSize } from "@/game/data";
import { Survivor, SurvivorStatus, Team } from "@/game/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  X,
  Wand2,
  AlertCircle,
  MapPin,
  ArrowRight,
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
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  if (!area) return null;

  const buildings = area.buildings;
  const teams: Team[] = area.teams;
  const survivors: Survivor[] = area.survivorIds
    .map((id) => allSurvivors[id])
    .filter(Boolean);

  const capacity = selectSurvivorCapacity(area);
  const maxTeamSize = getMaxTeamSize(buildings.barracks.level);
  const maxTeams = Math.max(3, survivors.length);

  // --- Sort survivors: unassigned first, then grouped by team ---
  const unassigned = survivors.filter(
    (s) => s.role === "idle" || s.role === "resting"
  );
  const teamGroups = teams.map((team) => ({
    team,
    members: team.memberIds
      .map((id) => allSurvivors[id])
      .filter((s): s is Survivor => Boolean(s)),
  }));

  // First team that has space (for the "assign to group A" quick button)
  const firstTeamWithSpace = teams.find((t) => t.memberIds.length < maxTeamSize);

  const selectedSurvivor = survivors.find((s) => s.id === selectedSurvivorId);

  // Team being deleted (for confirm dialog)
  const teamToDelete = deleteTeamId
    ? teams.find((t) => t.id === deleteTeamId)
    : null;
  const teamHasMission = teamToDelete
    ? area.missions.some(
        (m) => m.teamId === teamToDelete.id && m.status === "pending"
      )
    : false;

  const handleQuickAssign = (survivorId: string) => {
    let target = firstTeamWithSpace;
    if (!target) {
      // No team with space — create a new one
      if (teams.length >= maxTeams) return;
      const name = `Team ${String.fromCharCode(65 + teams.length)}`;
      const newId = createTeam(name);
      if (!newId) return;
      target = useGameStore.getState().areas[area.id].teams.find(
        (t) => t.id === newId
      );
    }
    if (target) {
      assignSurvivorToTeam(survivorId, target.id);
    }
  };

  const handleNewGroupAndAssign = (survivorId: string) => {
    if (teams.length >= maxTeams) return;
    const name = `Team ${String.fromCharCode(65 + teams.length)}`;
    const newId = createTeam(name);
    if (!newId) return;
    assignSurvivorToTeam(survivorId, newId);
  };

  const handleConfirmDelete = () => {
    if (deleteTeamId) {
      deleteTeam(deleteTeamId);
      setDeleteTeamId(null);
    }
  };

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
          <Badge variant="outline" className="border-stone-700 text-stone-400">
            Max team size: {maxTeamSize}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unassigned.length > 0 && (
            <Button
              size="sm"
              onClick={() => useGameStore.getState().autoAssignSurvivors()}
              variant="outline"
              className="border-emerald-800 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50"
            >
              <Wand2 className="w-4 h-4 mr-1" />
              Auto-Assign
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              const name = `Team ${String.fromCharCode(65 + teams.length)}`;
              createTeam(name);
            }}
            disabled={teams.length >= maxTeams}
            className="bg-amber-700 hover:bg-amber-600 text-amber-50"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            New Team ({teams.length}/{maxTeams})
          </Button>
        </div>
      </div>

      {/* Single list: unassigned first, then team groups */}
      <Card className="bg-stone-900/60 border-stone-800 p-3">
        {survivors.length === 0 ? (
          <div className="text-xs text-stone-500 italic py-3 text-center">
            No survivors in this area.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Unassigned survivors */}
            {unassigned.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1.5 flex items-center gap-1">
                  Unassigned ({unassigned.length})
                </div>
                <div className="space-y-1.5">
                  {unassigned.map((s) => (
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
                      onQuickAssign={() => handleQuickAssign(s.id)}
                      onNewGroup={() => handleNewGroupAndAssign(s.id)}
                      canAssign={teams.length < maxTeams || Boolean(firstTeamWithSpace)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Team groups */}
            {teamGroups.map(({ team, members }) => {
              const teamMission = area.missions.find(
                (m) => m.teamId === team.id && m.status === "pending"
              );
              return (
                <div key={team.id}>
                  <div className="text-[10px] uppercase tracking-wide text-amber-500 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Swords className="w-3 h-3" />
                      {team.name} ({members.length}/{maxTeamSize})
                      {teamMission && (
                        <Badge
                          variant="outline"
                          className="ml-1 text-[9px] border-amber-700 text-amber-300 bg-amber-950/40"
                        >
                          {teamMission.missionType === "salvage"
                            ? "⛏ Salvaging"
                            : "→ Scouting"}
                        </Badge>
                      )}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-stone-500 hover:text-red-400"
                      onClick={() => setDeleteTeamId(team.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {members.length === 0 ? (
                      <div className="text-[10px] text-stone-600 italic py-1">
                        Empty — assign a survivor
                      </div>
                    ) : (
                      members.map((s) => (
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
                          onUnassign={() => unassignSurvivorFromTeam(s.id)}
                          teamName={team.name}
                        />
                      ))
                    )}
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

      {/* Delete team confirmation */}
      <AlertDialog
        open={deleteTeamId !== null}
        onOpenChange={(open) => !open && setDeleteTeamId(null)}
      >
        <AlertDialogContent className="bg-stone-950 border-stone-800 text-stone-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-200">
              Delete {teamToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              {teamHasMission ? (
                <span className="text-amber-300">
                  This team is currently on a mission. Deleting the team will
                  also cancel the mission and the survivors will return to idle.
                  Are you sure?
                </span>
              ) : (
                "The team will be disbanded and all members will return to unassigned."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-stone-700 text-stone-300 hover:bg-stone-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-700 hover:bg-red-600 text-red-50"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  onUnassign,
  onQuickAssign,
  onNewGroup,
  canAssign,
  teamName,
}: {
  survivor: Survivor;
  selected: boolean;
  onClick: () => void;
  onRest?: () => void;
  onUnassign?: () => void;
  onQuickAssign?: () => void;
  onNewGroup?: () => void;
  canAssign?: boolean;
  teamName?: string;
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
        {onUnassign ? (
          // In a team — show remove button
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] text-stone-500 hover:text-red-400"
            onClick={onUnassign}
          >
            <X className="w-3 h-3 mr-0.5" />
            Remove
          </Button>
        ) : (
          // Unassigned — show quick assign + new group buttons
          <>
            {onQuickAssign && canAssign && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] border-amber-700 bg-amber-950/30 text-amber-200 hover:bg-amber-900/50"
                onClick={onQuickAssign}
              >
                <ArrowRight className="w-3 h-3 mr-0.5" />
                Assign
              </Button>
            )}
            {onNewGroup && canAssign && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] border-stone-700 text-stone-300 hover:bg-stone-800"
                onClick={onNewGroup}
              >
                <UserPlus className="w-3 h-3 mr-0.5" />
                New
              </Button>
            )}
          </>
        )}
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
              ? "Assigned to a team"
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
