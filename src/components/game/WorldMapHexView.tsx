"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/game/store";
import {
  AREA_TYPE_DEFS,
  RESOURCE_INFO,
  RESOURCE_ORDER,
  getNeighborHexes,
  hexToPixel,
} from "@/game/data";
import {
  Area,
  ResourceType,
  Resources,
  Survivor,
  Transfer,
} from "@/game/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Users,
  Compass,
  Package,
  ArrowRight,
  Footprints,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  MapPin,
} from "lucide-react";

// ---------------- Hex grid constants ----------------
const HEX_SIZE = 40;

/** Returns the 6 vertices of a pointy-top hexagon centered at (cx, cy). */
function hexPolygonPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-top: vertices at -30°, 30°, 90°, 150°, 210°, 270°
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(" ");
}

/**
 * Returns the list of areas that should be rendered on the map:
 * - All discovered areas (always visible)
 * - Undiscovered areas adjacent to at least one discovered area (visible as fog)
 * Truly hidden areas (not discovered, not adjacent to anything discovered) are NOT shown.
 */
function useVisibleAreas(areas: Record<string, Area>): Area[] {
  return useMemo(() => {
    const discoveredHexes = Object.values(areas)
      .filter((a) => a.discovered)
      .map((a) => a.hex);

    const visible: Area[] = [];
    for (const area of Object.values(areas)) {
      if (area.discovered) {
        visible.push(area);
        continue;
      }
      const neighbors = getNeighborHexes(area.hex);
      const isAdjacent = neighbors.some((nh) =>
        discoveredHexes.some((dh) => dh[0] === nh[0] && dh[1] === nh[1])
      );
      if (isAdjacent) visible.push(area);
    }
    return visible;
  }, [areas]);
}

/** True if `target` is one of the 6 hex neighbors of `source`. */
function isAdjacentHex(
  source: [number, number],
  target: [number, number]
): boolean {
  return getNeighborHexes(source).some(
    ([q, r]) => q === target[0] && r === target[1]
  );
}

// ---------------- Main component ----------------
export function WorldMapHexView() {
  const areas = useGameStore((s) => s.areas);
  const currentAreaId = useGameStore((s) => s.currentAreaId);
  const survivors = useGameStore((s) => s.survivors);
  const transfers = useGameStore((s) => s.transfers);
  const day = useGameStore((s) => s.day);

  const visibleAreas = useVisibleAreas(areas);
  const currentArea = areas[currentAreaId];

  // Side-panel selection. null = show current area.
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  // Expedition dialog target
  const [expeditionTarget, setExpeditionTarget] = useState<Area | null>(null);

  const selectedArea = selectedAreaId ? areas[selectedAreaId] : currentArea;

  // Compute SVG layout centered on the current area
  const { viewBox, hexPositions } = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    if (!currentArea || visibleAreas.length === 0) {
      return { viewBox: `-100 -100 200 200`, hexPositions: positions };
    }
    const [cx0, cy0] = hexToPixel(currentArea.hex, HEX_SIZE);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const area of visibleAreas) {
      const [px, py] = hexToPixel(area.hex, HEX_SIZE);
      const x = px - cx0;
      const y = py - cy0;
      positions.set(area.id, { x, y });
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const pad = HEX_SIZE * 1.4;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = maxX - minX + pad * 2;
    const vbH = maxY - minY + pad * 2;
    return {
      viewBox: `${vbX.toFixed(2)} ${vbY.toFixed(2)} ${vbW.toFixed(2)} ${vbH.toFixed(2)}`,
      hexPositions: positions,
    };
  }, [currentArea, visibleAreas]);

  if (!currentArea) {
    return (
      <Card className="bg-stone-950 border-stone-800 text-stone-100">
        <CardContent className="text-stone-400 text-sm py-8 text-center">
          No world loaded. Start a new game to explore the wasteland.
        </CardContent>
      </Card>
    );
  }

  // Click handlers ----------------------------------------------------------
  const handleHexClick = (area: Area) => {
    // Just select the area in the side panel. Don't auto-switch current area,
    // so the player can use the "Send Survivors" action on discovered neighbors.
    setSelectedAreaId(area.id);
    // Only undiscovered neighbors auto-open the expedition dialog
    if (!area.discovered && isAdjacentHex(currentArea.hex, area.hex)) {
      setExpeditionTarget(area);
    }
  };

  // Transfers as lines (only those between currently visible areas) --------
  const transferLines = transfers
    .map((t) => {
      const from = areas[t.fromAreaId];
      const to = areas[t.toAreaId];
      if (!from || !to) return null;
      const fp = hexPositions.get(from.id);
      const tp = hexPositions.get(to.id);
      if (!fp || !tp) return null;
      return { transfer: t, from: fp, to: tp };
    })
    .filter(
      (
        x
      ): x is {
        transfer: Transfer;
        from: { x: number; y: number };
        to: { x: number; y: number };
      } => x !== null
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Hex grid */}
      <Card className="lg:col-span-2 bg-stone-950 border-stone-800 text-stone-100">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-200">
            <Compass className="w-4 h-4" />
            World Map
          </CardTitle>
          <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> Discovered
            </span>
            <span className="flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> Fog of War
            </span>
            <span className="flex items-center gap-1">
              <Home className="w-3 h-3" /> Base
            </span>
            <span className="flex items-center gap-1">
              <Footprints className="w-3 h-3" /> In transit
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-[55vh] min-h-[380px] bg-stone-950 rounded-md border border-stone-900"
          >
            {/* Transfers (dashed lines + arrival-day badge) */}
            {transferLines.map(({ transfer, from, to }) => {
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              return (
                <g key={transfer.id}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    opacity={0.85}
                  />
                  <circle
                    cx={mx}
                    cy={my}
                    r={11}
                    fill="#1c1917"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                  />
                  <text
                    x={mx}
                    y={my + 3.5}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill="#fbbf24"
                  >
                    {`D${transfer.arrivalDay}`}
                  </text>
                </g>
              );
            })}

            {/* Hexagons */}
            {visibleAreas.map((area) => {
              const pos = hexPositions.get(area.id);
              if (!pos) return null;
              const def = AREA_TYPE_DEFS[area.type];
              const isCurrent = area.id === currentAreaId;
              const isSelected = selectedArea?.id === area.id;
              const isFog = !area.discovered;
              const isNeighborOfCurrent = isAdjacentHex(
                currentArea.hex,
                area.hex
              );

              const fill = isFog ? "#1c1917" : def.color;
              let stroke = "#44403c";
              let strokeWidth = 1.5;
              if (isCurrent) {
                stroke = "#fde68a";
                strokeWidth = 3.5;
              } else if (isSelected) {
                stroke = "#7dd3fc";
                strokeWidth = 2.5;
              } else if (!isFog) {
                stroke = "#57534e";
                strokeWidth = 1.5;
              }

              return (
                <g
                  key={area.id}
                  className="cursor-pointer"
                  onClick={() => handleHexClick(area)}
                >
                  {/* Dashed ring on fog hexes that are expedition-eligible */}
                  {isFog && isNeighborOfCurrent && (
                    <polygon
                      points={hexPolygonPoints(pos.x, pos.y, HEX_SIZE + 3)}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      opacity={0.55}
                    />
                  )}
                  <polygon
                    points={hexPolygonPoints(pos.x, pos.y, HEX_SIZE)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    opacity={isFog ? 0.92 : 1}
                  />
                  {/* Base badge top-right */}
                  {area.hasBase && (
                    <g>
                      <circle
                        cx={pos.x + HEX_SIZE * 0.55}
                        cy={pos.y - HEX_SIZE * 0.55}
                        r={9}
                        fill="#7c2d12"
                        stroke="#fbbf24"
                        strokeWidth={1.5}
                      />
                      <text
                        x={pos.x + HEX_SIZE * 0.55}
                        y={pos.y - HEX_SIZE * 0.55 + 4}
                        textAnchor="middle"
                        fontSize={11}
                      >
                        🏠
                      </text>
                    </g>
                  )}
                  {/* Center icon */}
                  <text
                    x={pos.x}
                    y={pos.y - 2}
                    textAnchor="middle"
                    fontSize={22}
                    opacity={isFog ? 0.5 : 1}
                  >
                    {isFog ? "?" : def.icon}
                  </text>
                  {/* Type label */}
                  <text
                    x={pos.x}
                    y={pos.y + 14}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontWeight={600}
                    fill={isFog ? "#a8a29e" : "#f5f5f4"}
                    opacity={isFog ? 0.7 : 0.95}
                  >
                    {def.label.length > 12
                      ? def.label.slice(0, 11) + "…"
                      : def.label}
                  </text>
                  {/* Current area marker dot */}
                  {isCurrent && (
                    <circle
                      cx={pos.x}
                      cy={pos.y + HEX_SIZE * 0.62}
                      r={3}
                      fill="#fde68a"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      {/* Side panel: details + expedition + transfers */}
      <Card className="bg-stone-950 border-stone-800 text-stone-100">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-200">
            <Eye className="w-4 h-4" />
            Area Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedArea ? (
            <AreaDetails
              area={selectedArea}
              isCurrent={selectedArea.id === currentAreaId}
              isNeighborOfCurrent={isAdjacentHex(
                currentArea.hex,
                selectedArea.hex
              )}
              survivors={survivors}
              onSendExpedition={() => setExpeditionTarget(selectedArea)}
            />
          ) : (
            <div className="text-sm text-stone-500 italic">
              Select an area on the map.
            </div>
          )}

          <Separator className="bg-stone-800" />

          {/* In-transit transfers */}
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-stone-500 mb-2">
              <Footprints className="w-3.5 h-3.5" />
              In Transit ({transfers.length})
            </div>
            {transfers.length === 0 ? (
              <div className="text-xs text-stone-600 italic">
                No survivors or resources currently traveling.
              </div>
            ) : (
              <ScrollArea className="h-40 rounded-md border border-stone-800 bg-stone-900/40">
                <div className="p-2 space-y-1.5">
                  {transfers.map((t) => (
                    <TransferRow
                      key={t.id}
                      transfer={t}
                      fromArea={areas[t.fromAreaId]}
                      toArea={areas[t.toAreaId]}
                      currentDay={day}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expedition Dialog */}
      <ExpeditionDialog
        target={expeditionTarget}
        currentArea={currentArea}
        survivors={survivors}
        onOpenChange={(open) => {
          if (!open) setExpeditionTarget(null);
        }}
      />
    </div>
  );
}

// ---------------- Sub-components ----------------

function AreaDetails({
  area,
  isCurrent,
  isNeighborOfCurrent,
  survivors,
  onSendExpedition,
}: {
  area: Area;
  isCurrent: boolean;
  isNeighborOfCurrent: boolean;
  survivors: Record<string, Survivor>;
  onSendExpedition: () => void;
}) {
  const def = AREA_TYPE_DEFS[area.type];
  const aliveSurvivorsHere = area.survivorIds.filter(
    (id) => survivors[id] && survivors[id].health > 0
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-md grid place-items-center text-2xl border shrink-0"
          style={{
            background: area.discovered ? def.color : "#1c1917",
            borderColor: area.discovered ? "#57534e" : "#292524",
            opacity: area.discovered ? 1 : 0.6,
          }}
        >
          {area.discovered ? def.icon : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-stone-100 leading-tight">
            {area.discovered ? area.name : "Unknown Territory"}
          </div>
          <div className="text-xs text-stone-400">{def.label}</div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5">
        {area.discovered ? (
          <Badge
            variant="outline"
            className="border-emerald-700 text-emerald-300 bg-emerald-950/40"
          >
            <Eye className="w-3 h-3" /> Discovered
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-stone-700 text-stone-400 bg-stone-900/60"
          >
            <EyeOff className="w-3 h-3" /> Fog of War
          </Badge>
        )}
        {area.hasBase && (
          <Badge
            variant="outline"
            className="border-amber-700 text-amber-300 bg-amber-950/40"
          >
            <Home className="w-3 h-3" /> Base
          </Badge>
        )}
        {isCurrent && (
          <Badge
            variant="outline"
            className="border-sky-700 text-sky-300 bg-sky-950/40"
          >
            <Compass className="w-3 h-3" /> Current
          </Badge>
        )}
      </div>

      {/* Description */}
      <div className="text-xs text-stone-400 leading-relaxed bg-stone-900/40 border border-stone-800 rounded p-2.5">
        {area.discovered ? (
          def.description
        ) : (
          <span className="italic text-stone-500">
            Your scouts have heard rumors of {def.label.toLowerCase()} terrain
            in this direction. Send an expedition to discover what lies there.
          </span>
        )}
      </div>

      {/* Switch to this area (if discovered and not current) */}
      {area.discovered && !isCurrent && (
        <Button
          onClick={() => useGameStore.getState().setCurrentArea(area.id)}
          size="sm"
          className="w-full bg-emerald-700 hover:bg-emerald-600 text-emerald-50"
        >
          <MapPin className="w-4 h-4 mr-1.5" />
          Switch to {area.name}
        </Button>
      )}

      {/* Survivor count (only meaningful once discovered) */}
      {area.discovered && (
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="text-stone-300">
            <span className="font-bold text-emerald-300">
              {aliveSurvivorsHere}
            </span>{" "}
            survivor{aliveSurvivorsHere === 1 ? "" : "s"} here
          </span>
        </div>
      )}

      {/* Resources snapshot (only if discovered) */}
      {area.discovered && (
        <div className="grid grid-cols-3 gap-1.5">
          {RESOURCE_ORDER.map((r) => {
            const info = RESOURCE_INFO[r];
            return (
              <div
                key={r}
                className="flex items-center gap-1 px-1.5 py-1 rounded bg-stone-900/60 border border-stone-800"
              >
                <span className="text-sm leading-none">{info.icon}</span>
                <span className="text-xs font-bold text-stone-200">
                  {area.resources[r]}
                </span>
                <span className="text-[9px] text-stone-600">
                  /{area.resourceCaps[r]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Expedition action for undiscovered neighbors of current area */}
      {!area.discovered && isNeighborOfCurrent && (
        <div className="rounded-md border border-amber-900/60 bg-amber-950/20 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <Compass className="w-3.5 h-3.5" />
            Undiscovered Neighbor
          </div>
          <div className="text-[11px] text-stone-400 leading-relaxed">
            Send survivors from your current area to explore. They will arrive
            tomorrow and reveal what&apos;s here.
          </div>
          <Button
            onClick={onSendExpedition}
            size="sm"
            className="w-full bg-amber-700 hover:bg-amber-600 text-amber-50"
          >
            <Footprints className="w-4 h-4 mr-1.5" />
            Send Expedition
          </Button>
        </div>
      )}

      {/* Discovered neighbor — allow sending survivors/resources back and forth */}
      {area.discovered && isNeighborOfCurrent && !isCurrent && (
        <div className="rounded-md border border-sky-900/60 bg-sky-950/20 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
            <Footprints className="w-3.5 h-3.5" />
            Discovered Neighbor
          </div>
          <div className="text-[11px] text-stone-400 leading-relaxed">
            Send survivors and resources from your current area to{" "}
            <span className="text-stone-200">{area.name}</span>. They will
            arrive tomorrow.
          </div>
          <Button
            onClick={onSendExpedition}
            size="sm"
            className="w-full bg-sky-700 hover:bg-sky-600 text-sky-50"
          >
            <Footprints className="w-4 h-4 mr-1.5" />
            Send Survivors / Resources
          </Button>
        </div>
      )}

      {/* Hint for fog areas that aren't reachable right now */}
      {!area.discovered && !isNeighborOfCurrent && (
        <div className="rounded-md border border-stone-800 bg-stone-900/40 p-2.5 text-[11px] text-stone-500 italic">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-stone-500" />
          Not adjacent to your current area. Travel closer to explore.
        </div>
      )}
    </div>
  );
}

function TransferRow({
  transfer,
  fromArea,
  toArea,
  currentDay,
}: {
  transfer: Transfer;
  fromArea?: Area;
  toArea?: Area;
  currentDay: number;
}) {
  const daysLeft = transfer.arrivalDay - currentDay;
  const survivorsById = useGameStore.getState().survivors;
  const survNames = transfer.survivorIds
    .map((id) => survivorsById[id]?.name)
    .filter(Boolean)
    .join(", ");
  const resourceEntries = Object.entries(transfer.resources).filter(
    ([, v]) => (v as number) > 0
  ) as [ResourceType, number][];

  return (
    <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-300 font-medium truncate">
          {fromArea?.name ?? "?"}
        </span>
        <ArrowRight className="w-3 h-3 text-amber-400 mx-1 shrink-0" />
        <span className="text-stone-300 font-medium truncate">
          {toArea?.name ?? "?"}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px]">
        <span className="text-stone-400">
          {transfer.survivorIds.length > 0 && (
            <>
              <Users className="w-3 h-3 inline mr-0.5" />
              {transfer.survivorIds.length}{" "}
              {transfer.survivorIds.length === 1 ? "survivor" : "survivors"}
            </>
          )}
          {transfer.survivorIds.length > 0 && resourceEntries.length > 0 && (
            <span className="mx-1">·</span>
          )}
          {resourceEntries.length > 0 && (
            <>
              <Package className="w-3 h-3 inline mr-0.5" />
              {resourceEntries.length} resource
              {resourceEntries.length === 1 ? "" : "s"}
            </>
          )}
        </span>
        <span className="flex items-center gap-0.5 text-amber-400">
          <Clock className="w-3 h-3" />
          {daysLeft <= 0 ? "Arriving tonight" : `${daysLeft}d left`}
        </span>
      </div>
      {(survNames || resourceEntries.length > 0) && (
        <div className="mt-1 text-[10px] text-stone-500 leading-tight">
          {survNames && <div>Survivors: {survNames}</div>}
          {resourceEntries.length > 0 && (
            <div>
              {resourceEntries.map(([r, v]) => (
                <span key={r} className="mr-2">
                  {RESOURCE_INFO[r].icon}
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Expedition Dialog ----------------

function ExpeditionDialog({
  target,
  currentArea,
  survivors,
  onOpenChange,
}: {
  target: Area | null;
  currentArea: Area;
  survivors: Record<string, Survivor>;
  onOpenChange: (open: boolean) => void;
}) {
  const open = target !== null;
  const [selectedSurvivorIds, setSelectedSurvivorIds] = useState<string[]>([]);
  const [resourceAmounts, setResourceAmounts] = useState<
    Partial<Record<ResourceType, number>>
  >({});
  const [confirmed, setConfirmed] = useState(false);

  // Reset the form whenever the target changes (i.e. a new dialog opens)
  const lastTargetIdRef = useRef<string | null>(null);
  useEffect(() => {
    const targetId = target?.id ?? null;
    if (lastTargetIdRef.current !== targetId) {
      lastTargetIdRef.current = targetId;
      setSelectedSurvivorIds([]);
      setResourceAmounts({});
      setConfirmed(false);
    }
  }, [target]);

  if (!target) {
    return null;
  }

  const def = AREA_TYPE_DEFS[target.type];

  // Available survivors = those physically in the current area and alive
  const availableSurvivors = currentArea.survivorIds
    .map((id) => survivors[id])
    .filter((s): s is Survivor => !!s && s.health > 0);

  const toggleSurvivor = (id: string) => {
    setSelectedSurvivorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setResourceAmount = (r: ResourceType, value: number) => {
    const clamped = Math.max(0, Math.min(currentArea.resources[r], value || 0));
    setResourceAmounts((prev) => ({ ...prev, [r]: clamped }));
  };

  const resourcesToSend: Partial<Resources> = {};
  for (const r of RESOURCE_ORDER) {
    const amt = resourceAmounts[r] ?? 0;
    if (amt > 0) resourcesToSend[r] = amt;
  }

  const hasSurvivors = selectedSurvivorIds.length > 0;
  const hasResources = Object.keys(resourcesToSend).length > 0;
  const canConfirm = hasSurvivors || hasResources;
  const nextDay = useGameStore.getState().day + 1;

  const handleConfirm = () => {
    if (!target) return;
    // Send survivors (creates a survivor transfer; arrives tomorrow)
    if (hasSurvivors) {
      useGameStore.getState().travelToArea(target.id, selectedSurvivorIds);
    }
    // Send resources separately (creates a resource-only transfer)
    if (hasResources) {
      useGameStore
        .getState()
        .transferResources(currentArea.id, target.id, resourcesToSend);
    }
    setConfirmed(true);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="bg-stone-950 border-stone-800 text-stone-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-200">
            <Compass className="w-5 h-5" />
            Send Expedition
          </DialogTitle>
          <DialogDescription className="text-stone-400">
            Dispatch survivors from{" "}
            <span className="text-stone-200 font-medium">
              {currentArea.name}
            </span>{" "}
            to explore the unknown {def.label.toLowerCase()} territory.
          </DialogDescription>
        </DialogHeader>

        {confirmed ? (
          <div className="space-y-3">
            <div className="rounded-md border border-emerald-800/60 bg-emerald-950/30 p-3 text-sm text-emerald-200 flex items-start gap-2">
              <Footprints className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Expedition dispatched!</div>
                <div className="text-xs text-stone-300 mt-1">
                  {hasSurvivors && (
                    <span>
                      {selectedSurvivorIds.length} survivor
                      {selectedSurvivorIds.length === 1 ? "" : "s"} will arrive
                      tomorrow (Day {nextDay}) and reveal{" "}
                      <span className="text-amber-300">{target.name}</span>.
                    </span>
                  )}
                  {!hasSurvivors && hasResources && (
                    <span>
                      Resources are on their way and will arrive tomorrow (Day{" "}
                      {nextDay}).
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleClose}
                className="bg-amber-700 hover:bg-amber-600 text-amber-50"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Survivor selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Select Survivors
                </div>
                <div className="text-[11px] text-stone-500">
                  {selectedSurvivorIds.length} selected
                </div>
              </div>
              {availableSurvivors.length === 0 ? (
                <div className="text-xs text-stone-500 italic border border-stone-800 bg-stone-900/40 rounded p-2">
                  No survivors are currently at {currentArea.name}.
                </div>
              ) : (
                <ScrollArea className="h-40 rounded-md border border-stone-800 bg-stone-900/40">
                  <div className="p-2 space-y-1">
                    {availableSurvivors.map((s) => {
                      const checked = selectedSurvivorIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-stone-800/60 ${
                            checked ? "bg-amber-950/30" : ""
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSurvivor(s.id)}
                          />
                          <span className="text-sm text-stone-200 flex-1">
                            {s.name}
                          </span>
                          <span className="text-[10px] text-stone-500 capitalize">
                            {s.role.replace(/([A-Z])/g, " $1")}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Optional resources */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wide text-stone-500">
                  Send Resources (optional)
                </div>
                <div className="text-[11px] text-stone-500">
                  from {currentArea.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RESOURCE_ORDER.map((r) => {
                  const info = RESOURCE_INFO[r];
                  const available = currentArea.resources[r];
                  const value = resourceAmounts[r] ?? 0;
                  return (
                    <div
                      key={r}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-stone-900/60 border border-stone-800"
                    >
                      <span className="text-base leading-none">
                        {info.icon}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={available}
                        value={value}
                        onChange={(e) =>
                          setResourceAmount(
                            r,
                            parseInt(e.target.value || "0", 10)
                          )
                        }
                        className="h-7 text-xs px-1.5 bg-stone-950 border-stone-700"
                      />
                      <span className="text-[10px] text-stone-500 whitespace-nowrap">
                        /{available}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-stone-700 text-stone-300 hover:bg-stone-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="bg-amber-700 hover:bg-amber-600 text-amber-50"
              >
                <Footprints className="w-4 h-4 mr-1.5" />
                Dispatch
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
