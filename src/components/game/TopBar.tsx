"use client";

import { RESOURCE_INFO, RESOURCE_ORDER, AREA_TYPE_DEFS } from "@/game/data";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, AlertTriangle, Home, Users } from "lucide-react";
import { useState } from "react";
import { EndDayDialog } from "./EndDayDialog";

function Divider() {
  return <div className="h-6 w-px bg-stone-800 shrink-0" />;
}

export function TopBar() {
  const currentArea = useGameStore((s) => s.areas[s.currentAreaId]);
  const survivors = useGameStore((s) => s.survivors);
  const day = useGameStore((s) => s.day);
  const [endDayOpen, setEndDayOpen] = useState(false);

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
    <div className="border-b border-stone-800 bg-stone-950/95 px-3 sm:px-4 py-2">
      <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto">
          {currentArea && areaDef ? (
            <div className="flex items-center gap-1.5 min-w-0 shrink-0">
              <span className="text-lg leading-none">{areaDef.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-stone-100 leading-tight truncate max-w-[100px] sm:max-w-[180px]">
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
            <span className="text-xs text-stone-500 italic shrink-0">
              No area selected
            </span>
          )}

          <Divider />

          <div className="flex items-center gap-1 shrink-0" title="Survivors (total / in this area)">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-300 tabular-nums">
              {totalSurvivors}
              <span className="text-stone-500 font-normal">/</span>
              {areaSurvivors}
            </span>
          </div>

          {currentArea && (
            <>
              <Divider />
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
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
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right leading-tight">
            <div className="text-[10px] text-stone-500 uppercase tracking-wide">
              Day
            </div>
            <div className="text-base font-bold text-amber-200 tabular-nums">
              {day}
            </div>
          </div>
          <Button
            onClick={() => setEndDayOpen(true)}
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
