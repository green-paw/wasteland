"use client";

import { useGameStore } from "@/game/store";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper } from "lucide-react";

export function GameLogPanel() {
  const log = useGameStore((s) => s.log);

  // Show last 12 entries, newest at bottom (already in order)
  const recent = log.slice(-15);

  return (
    <Card className="bg-stone-900/60 border-stone-800 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Newspaper className="w-3.5 h-3.5 text-stone-400" />
        <h3 className="text-xs uppercase tracking-wide text-stone-500">
          Recent Events
        </h3>
      </div>
      <ScrollArea className="h-40">
        <div className="space-y-1 pr-2">
          {recent.map((entry, i) => (
            <div
              key={i}
              className={`text-[11px] leading-snug flex items-start gap-1 ${
                entry.type === "danger"
                  ? "text-red-300"
                  : entry.type === "warning"
                  ? "text-amber-300"
                  : entry.type === "success"
                  ? "text-emerald-300"
                  : "text-stone-400"
              }`}
            >
              <span className="text-stone-600 text-[10px] mt-0.5">
                D{entry.day}
              </span>
              <span className="flex-1">{entry.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
