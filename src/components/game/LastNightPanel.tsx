"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/game/store";
import { NightReportItem } from "@/game/types";
import {
  Skull,
  HeartPulse,
  AlertTriangle,
  ShieldAlert,
  Droplet,
} from "lucide-react";

function ReportIcon({ kind }: { kind: NightReportItem["kind"] }) {
  switch (kind) {
    case "death":
      return <Skull className="w-3.5 h-3.5 shrink-0 text-red-400" />;
    case "critical":
      return <HeartPulse className="w-3.5 h-3.5 shrink-0 text-red-400" />;
    case "injury":
      return <HeartPulse className="w-3.5 h-3.5 shrink-0 text-orange-400" />;
    case "raid":
      return <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-400" />;
    case "needs":
      return <Droplet className="w-3.5 h-3.5 shrink-0 text-amber-400" />;
    default:
      return <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />;
  }
}

function severityClass(severity: NightReportItem["severity"]): string {
  if (severity === "danger") return "text-red-300";
  if (severity === "warning") return "text-amber-300";
  return "text-stone-300";
}

export function LastNightPanel() {
  const day = useGameStore((s) => s.day);
  const lastNightDay = useGameStore((s) => s.lastNightDay);
  const lastNightReport = useGameStore((s) => s.lastNightReport);

  const hasReport =
    lastNightDay !== 0 &&
    lastNightDay === day - 1 &&
    lastNightReport.length > 0;

  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!hasReport) {
      setVisible(false);
      setFadingOut(false);
      return;
    }

    setVisible(true);
    setFadingOut(false);

    const fadeTimer = window.setTimeout(() => setFadingOut(true), 4500);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      setFadingOut(false);
    }, 5000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [hasReport, lastNightDay]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-3 left-3 z-40 w-[min(100vw-1.5rem,22rem)] pointer-events-none transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="rounded-md bg-stone-950/45 backdrop-blur-sm px-3 py-2.5 pointer-events-none overflow-hidden max-h-32">
        <ul className="space-y-1.5 night-report-scroll-in">
          {lastNightReport.map((item) => (
            <li
              key={item.id}
              className={`flex items-start gap-1.5 text-[11px] leading-snug ${severityClass(item.severity)}`}
            >
              <span className="mt-0.5">
                <ReportIcon kind={item.kind} />
              </span>
              <span className="flex-1 min-w-0">{item.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
