import { Area, GameLogEntry, NightReportItem, Survivor } from "./types";

const NOISE_PATTERNS = [
  /^---/,
  /^===/,
  /Farm produced/i,
  /Well produced/i,
  /Survivors consumed/i,
  /auto-dispatched/i,
  /assigned to guard/i,
  /Bandit raid repelled/i,
  /recuperating on bed rest/i,
  /^Salvaged:/i,
  /fully salvaged/i,
  /Travelers arrived/i,
];

const IMPORTANT_PATTERNS = [
  /has died/i,
  /killed in action/i,
  /injured/i,
  /badly injured/i,
  /starving/i,
  /dehydrated/i,
  /shortage/i,
  /lacked rations/i,
  /bandit/i,
  /broke through/i,
  /defeat/i,
  /critical/i,
];

function isNoise(message: string): boolean {
  return NOISE_PATTERNS.some((p) => p.test(message));
}

function isImportantLog(entry: GameLogEntry): boolean {
  if (isNoise(entry.message)) return false;
  if (entry.type === "danger") return true;
  if (entry.type === "warning") {
    return IMPORTANT_PATTERNS.some((p) => p.test(entry.message));
  }
  return IMPORTANT_PATTERNS.some((p) => p.test(entry.message));
}

function severityForMessage(message: string): NightReportItem["severity"] {
  if (/has died|killed in action/i.test(message)) return "danger";
  if (/critical|broke through|defeat/i.test(message)) return "danger";
  if (/injured|starving|dehydrated|shortage|lacked rations|bandit/i.test(message))
    return "warning";
  return "info";
}

function kindForMessage(message: string): NightReportItem["kind"] {
  if (/has died|killed in action/i.test(message)) return "death";
  if (/critical condition/i.test(message)) return "critical";
  if (/injured/i.test(message)) return "injury";
  if (/starving|dehydrated|shortage|lacked rations/i.test(message))
    return "needs";
  if (/bandit|broke through/i.test(message)) return "raid";
  return "event";
}

export function buildLastNightReport(
  log: GameLogEntry[],
  nightDay: number,
  survivors: Record<string, Survivor>,
  areas: Record<string, Area>
): NightReportItem[] {
  const items: NightReportItem[] = [];
  const seen = new Set<string>();

  const add = (message: string, kind: NightReportItem["kind"]) => {
    const key = `${kind}:${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      id: key,
      kind,
      severity: severityForMessage(message),
      message,
    });
  };

  for (const entry of log) {
    if (entry.day !== nightDay) continue;
    if (!isImportantLog(entry)) continue;
    add(entry.message, kindForMessage(entry.message));
  }

  for (const area of Object.values(areas)) {
    if (!area.discovered) continue;
    for (const id of area.survivorIds) {
      const s = survivors[id];
      if (!s || s.health <= 0) continue;
      if (s.status === "critical") {
        add(
          `[${area.name}] ${s.name} is in critical condition (${s.health} HP)`,
          "critical"
        );
      }
    }
  }

  const order: Record<NightReportItem["kind"], number> = {
    death: 0,
    critical: 1,
    injury: 2,
    raid: 3,
    needs: 4,
    event: 5,
  };

  items.sort((a, b) => order[a.kind] - order[b.kind]);
  return items.slice(0, 12);
}
