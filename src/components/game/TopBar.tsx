"use client";

import { RESOURCE_INFO, RESOURCE_ORDER, AREA_TYPE_DEFS } from "@/game/data";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Moon, AlertTriangle, Home, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { EndDayDialog } from "./EndDayDialog";

const END_DAY_DIALOG_KEY = "wasteland-end-day-dialog";

function Divider() {
  return <div className="h-6 w-px bg-stone-800 shrink-0 hidden sm:block" />;
}

export function TopBar() {
  const currentArea = useGameStore((s) => s.areas[s.currentAreaId]);
  const survivors = useGameStore((s) => s.survivors);
  const day = useGameStore((s) => s.day);
  const endDay = useGameStore((s) => s.endDay);
  const dismissAreaMapPopups = useGameStore((s) => s.dismissAreaMapPopups);
  const [endDayOpen, setEndDayOpen] = useState(false);
  const [dialogEnabled, setDialogEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(END_DAY_DIALOG_KEY);
    if (saved !== null) setDialogEnabled(saved === "true");
  }, []);

  const setDialogPreference = (enabled: boolean) => {
    setDialogEnabled(enabled);
    localStorage.setItem(END_DAY_DIALOG_KEY, String(enabled));
  };

  const handleEndDayClick = () => {
    dismissAreaMapPopups();
    if (dialogEnabled) {
      setEndDayOpen(true);
    } else {
      endDay();
    }
  };

  const aliveSurvivors = Object.values(survivors).filter((s) => s.health > 0);
  const totalSurvivors = aliveSurvivors.length;
  const areaSurvivors = currentArea
    ? currentArea.survivorIds.filter((id) => survivors[id]?.health > 0).length
    : 0;

  const resources = currentArea?.resources ?? {
    food: 0,
    water: 0,
    materials: 0,
  };
  const resourceCaps = currentArea?.resourceCaps ?? {
    food: 0,
    water: 0,
    materials: 0,
  };

  const areaDef = currentArea ? AREA_TYPE_DEFS[currentArea.type] : null;

  return (
    <div className="px-3 sm:px-4 py-2 max-w-7xl w-full mx-auto">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex flex-col gap-2 min-w-0 flex-1 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {currentArea && areaDef ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-lg leading-none shrink-0">{areaDef.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-stone-100 leading-tight truncate max-w-[10rem] sm:max-w-[180px]">
                    {currentArea.name}
                  </div>
                </div>
                {!currentArea.hasBase ? (
                  <Badge
                    variant="outline"
                    className="border-red-800 text-red-300 bg-red-950/50 text-[10px] px-1.5 py-0 shrink-0"
                  >
                    <AlertTriangle className="w-2.5 h-2.5" /> No Base
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-800 text-amber-300 bg-amber-950/40 text-[10px] px-1.5 py-0 shrink-0"
                  >
                    <Home className="w-2.5 h-2.5" /> Base
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-xs text-stone-500 italic">
                No area selected
              </span>
            )}

            <Divider />

            <div
              className="flex items-center gap-1 shrink-0"
              title="Survivors (total / in this area)"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-300 tabular-nums">
                {totalSurvivors}
                <span className="text-stone-500 font-normal">/</span>
                {areaSurvivors}
              </span>
            </div>
          </div>

          {currentArea && (
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {RESOURCE_ORDER.map((r) => {
                const info = RESOURCE_INFO[r];
                const val = resources[r];
                const cap = resourceCaps[r];
                const ratio = cap > 0 ? val / cap : 0;
                const low = cap > 0 && ratio < 0.2;
                return (
                  <div
                    key={r}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-900/80 border border-stone-800"
                    title={info.label}
                  >
                    <span className="text-sm leading-none">{info.icon}</span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        low ? "text-red-400" : info.color
                      }`}
                    >
                      {val}
                    </span>
                    <span className="text-[9px] text-stone-600 tabular-nums">
                      /{cap}
                    </span>
                    {low && (
                      <AlertTriangle className="w-2.5 h-2.5 text-red-500 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right leading-tight">
            <div className="text-[10px] text-stone-500 uppercase tracking-wide">
              Day
            </div>
            <div className="text-base font-bold text-amber-200 tabular-nums">
              {day}
            </div>
          </div>

          <div
            className="flex items-center gap-1.5"
            title="Show end-of-day preview dialog"
          >
            <Checkbox
              id="end-day-dialog"
              checked={dialogEnabled}
              onCheckedChange={(checked) =>
                setDialogPreference(checked === true)
              }
              className="border-stone-600 data-[state=checked]:bg-amber-700 data-[state=checked]:border-amber-600"
            />
            <label
              htmlFor="end-day-dialog"
              className="text-[10px] text-stone-500 cursor-pointer select-none hidden sm:inline"
            >
              Preview
            </label>
          </div>

          <Button
            onClick={handleEndDayClick}
            className="bg-amber-700 hover:bg-amber-600 text-amber-50 border border-amber-600/50 shadow-lg shadow-amber-900/30"
            size="sm"
          >
            <Moon className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">End Day</span>
            <span className="sm:hidden">End</span>
          </Button>
        </div>
      </div>

      <EndDayDialog open={endDayOpen} onOpenChange={setEndDayOpen} />
    </div>
  );
}
