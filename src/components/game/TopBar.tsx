"use client";

import { RESOURCE_INFO, RESOURCE_ORDER, AREA_TYPE_DEFS } from "@/game/data";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skull, Sun, Moon, AlertTriangle, Home } from "lucide-react";
import { useState } from "react";
import { EndDayDialog } from "./EndDayDialog";

export function TopBar() {
  const currentArea = useGameStore((s) => s.areas[s.currentAreaId]);
  const survivors = useGameStore((s) => s.survivors);
  const day = useGameStore((s) => s.day);
  const [endDayOpen, setEndDayOpen] = useState(false);

  // Total alive survivors across all areas (dead survivors are removed from
  // the record by the end-of-day processing, but we guard against health<=0
  // just in case).
  const totalSurvivors = Object.values(survivors).filter(
    (s) => s.health > 0
  ).length;

  // Show current area's resources (or empty record if no area selected)
  const resources = currentArea?.resources ?? {
    food: 0,
    water: 0,
    materials: 0,
    medicine: 0,
    fuel: 0,
    ammo: 0,
  };
  const resourceCaps = currentArea?.resourceCaps ?? {
    food: 0,
    water: 0,
    materials: 0,
    medicine: 0,
    fuel: 0,
    ammo: 0,
  };

  const areaDef = currentArea ? AREA_TYPE_DEFS[currentArea.type] : null;

  return (
    <div className="border-b border-stone-800 bg-stone-950/95 backdrop-blur sticky top-0 z-30">
      {/* Top row: title + current area + day + survivors + end day */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-700 to-stone-900 grid place-items-center border border-amber-900/50">
              <Skull className="w-4 h-4 text-amber-300" />
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-amber-100 leading-tight">
                WASTELAND
              </div>
              <div className="text-[10px] text-stone-500 leading-tight">
                Post-Apocalyptic Survival
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-stone-800 mx-1" />

          {/* Current area name + type icon */}
          {currentArea && areaDef && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-lg leading-none">{areaDef.icon}</span>
              <div className="min-w-0">
                <div className="text-[10px] text-stone-500 leading-tight">
                  {areaDef.label.toUpperCase()}
                </div>
                <div className="text-sm font-bold text-stone-100 leading-tight truncate max-w-[140px] sm:max-w-[220px]">
                  {currentArea.name}
                </div>
              </div>
              {!currentArea.hasBase && (
                <Badge
                  variant="outline"
                  className="ml-1 border-red-800 text-red-300 bg-red-950/50 text-[10px] px-1.5 py-0"
                >
                  <AlertTriangle className="w-2.5 h-2.5" /> No Base
                </Badge>
              )}
              {currentArea.hasBase && (
                <Badge
                  variant="outline"
                  className="ml-1 border-amber-800 text-amber-300 bg-amber-950/40 text-[10px] px-1.5 py-0"
                >
                  <Home className="w-2.5 h-2.5" /> Base
                </Badge>
              )}
            </div>
          )}

          <div className="h-8 w-px bg-stone-800 mx-1" />

          <div className="flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-500" />
            <div>
              <div className="text-[10px] text-stone-500 leading-tight">DAY</div>
              <div className="text-base font-bold text-amber-200 leading-tight">
                {day}
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-stone-800 mx-1" />

          <div className="flex items-center gap-1.5">
            <div className="text-[10px] text-stone-500 leading-tight">
              SURVIVORS
            </div>
            <div className="text-base font-bold text-emerald-300 leading-tight">
              {totalSurvivors}
            </div>
          </div>
        </div>

        <Button
          onClick={() => setEndDayOpen(true)}
          className="bg-amber-700 hover:bg-amber-600 text-amber-50 border border-amber-600/50 shadow-lg shadow-amber-900/30"
          size="sm"
        >
          <Moon className="w-4 h-4 mr-1.5" />
          End Day
        </Button>
      </div>

      {/* Resources row — current area's resources */}
      <div className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-1.5 border-t border-stone-900 bg-stone-950 overflow-x-auto">
        {currentArea ? (
          <>
            <span className="text-[10px] text-stone-500 uppercase tracking-wide mr-1 whitespace-nowrap">
              {currentArea.name}:
            </span>
            {RESOURCE_ORDER.map((r) => {
              const info = RESOURCE_INFO[r];
              const val = resources[r];
              const cap = resourceCaps[r];
              const ratio = cap > 0 ? val / cap : 0;
              const low = cap > 0 && ratio < 0.2;
              return (
                <div
                  key={r}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-stone-900/80 border border-stone-800 min-w-fit"
                >
                  <span className="text-base leading-none">{info.icon}</span>
                  <div className="flex flex-col leading-tight">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-stone-500 hidden sm:inline">
                        {info.label}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          low ? "text-red-400" : info.color
                        }`}
                      >
                        {val}
                      </span>
                      <span className="text-[9px] text-stone-600">/{cap}</span>
                    </div>
                  </div>
                  {low && (
                    <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <span className="text-xs text-stone-500 italic">
            No area selected.
          </span>
        )}
      </div>

      <EndDayDialog open={endDayOpen} onOpenChange={setEndDayOpen} />
    </div>
  );
}
