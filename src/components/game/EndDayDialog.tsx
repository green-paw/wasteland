"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Moon, AlertCircle } from "lucide-react";
import { GameLogEntry } from "@/game/types";

export function EndDayDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const endDay = useGameStore((s) => s.endDay);
  const missions = useGameStore((s) => s.missions);
  const teams = useGameStore((s) => s.teams);
  const locations = useGameStore((s) => s.locations);
  const survivors = useGameStore((s) => s.survivors);
  const gameOver = useGameStore((s) => s.gameOver);
  const gameOverReason = useGameStore((s) => s.gameOverReason);
  const resetGame = useGameStore((s) => s.resetGame);
  const startGame = useGameStore((s) => s.startGame);
  const [resolving, setResolving] = useState(false);
  const [lastDayLog, setLastDayLog] = useState<GameLogEntry[]>([]);
  const [endingDay, setEndingDay] = useState<number | null>(null);

  const pendingMissions = missions.filter((m) => m.status === "pending");

  const handleEndDay = async () => {
    setResolving(true);
    const currentDay = useGameStore.getState().day;
    setEndingDay(currentDay);
    // small delay for UX
    await new Promise((r) => setTimeout(r, 200));
    endDay();
    // pull log entries from this day
    const allLog = useGameStore.getState().log;
    setLastDayLog(allLog.filter((e) => e.day === currentDay || e.day === currentDay + 1));
    setResolving(false);
  };

  const handleReset = () => {
    resetGame();
    startGame();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-stone-950 border-stone-800 text-stone-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            <Moon className="w-5 h-5" />
            {lastDayLog.length > 0
              ? `Day ${endingDay ?? useGameStore.getState().day - 1} Results`
              : `End Day ${useGameStore.getState().day}?`}
          </DialogTitle>
          <DialogDescription className="text-stone-400">
            Review your plans, then let the night unfold.
          </DialogDescription>
        </DialogHeader>

        {gameOver ? (
          <div className="space-y-4">
            <div className="bg-red-950/40 border border-red-800/50 rounded-md p-4">
              <div className="flex items-center gap-2 text-red-300 font-bold mb-1">
                <AlertCircle className="w-5 h-5" />
                Game Over
              </div>
              <p className="text-stone-300 text-sm">{gameOverReason}</p>
            </div>
            <Button
              onClick={handleReset}
              className="bg-amber-700 hover:bg-amber-600 text-amber-50"
            >
              Start New Game
            </Button>
          </div>
        ) : lastDayLog.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm text-stone-300">The night passes...</div>
            <ScrollArea className="h-64 w-full rounded-md border border-stone-800 bg-stone-900/50">
              <div className="p-3 space-y-1.5">
                {lastDayLog.map((entry, i) => (
                  <div
                    key={i}
                    className={`text-sm leading-snug ${
                      entry.type === "danger"
                        ? "text-red-300"
                        : entry.type === "warning"
                        ? "text-amber-300"
                        : entry.type === "success"
                        ? "text-emerald-300"
                        : "text-stone-300"
                    }`}
                  >
                    {entry.type === "danger" && "✖ "}
                    {entry.type === "warning" && "⚠ "}
                    {entry.type === "success" && "✓ "}
                    {entry.message}
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                onClick={() => {
                  setLastDayLog([]);
                  setEndingDay(null);
                  onOpenChange(false);
                }}
                className="bg-amber-700 hover:bg-amber-600 text-amber-50"
              >
                Continue
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-stone-900/50 border border-stone-800 rounded-md p-3">
              <div className="text-xs uppercase tracking-wide text-stone-500 mb-2">
                Pending Missions
              </div>
              {pendingMissions.length === 0 ? (
                <div className="text-sm text-stone-500 italic">
                  No teams dispatched. The day will pass quietly.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pendingMissions.map((m) => {
                    const team = teams.find((t) => t.id === m.teamId);
                    const loc = locations.find((l) => l.id === m.locationId);
                    const teamSurvivors = survivors.filter((s) =>
                      m.team.includes(s.id)
                    );
                    const isSalvage = m.missionType === "salvage";
                    return (
                      <div
                        key={m.id}
                        className={`text-sm flex items-center gap-2 rounded p-2 ${
                          isSalvage
                            ? "bg-emerald-950/30 border border-emerald-900/50"
                            : "bg-stone-950/50"
                        }`}
                      >
                        <span
                          className={
                            isSalvage ? "text-emerald-300" : "text-amber-300"
                          }
                        >
                          {isSalvage ? "⛏" : "→"}
                        </span>
                        <span className="text-stone-200 font-medium">
                          {team?.name}
                        </span>
                        <span className="text-stone-500">
                          ({teamSurvivors.length} survivor
                          {teamSurvivors.length !== 1 ? "s" : ""})
                        </span>
                        <span className="text-stone-400">
                          {isSalvage ? "salvaging" : "scouting"}
                        </span>
                        <span className="text-emerald-300">{loc?.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-stone-900/30 border border-stone-800 rounded-md p-3 text-xs text-stone-400 space-y-1">
              <div>• Teams will travel and resolve their missions.</div>
              <div>• Survivors will consume food and water.</div>
              <div>• Buildings will produce resources.</div>
              <div>• Random events may occur during the night.</div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-stone-700 text-stone-300 hover:bg-stone-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEndDay}
                disabled={resolving}
                className="bg-amber-700 hover:bg-amber-600 text-amber-50"
              >
                {resolving ? "Resolving..." : "End Day"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
