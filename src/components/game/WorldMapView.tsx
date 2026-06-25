"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line, Html } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store";
import { LOCATION_DEFS, ENEMY_INFO, RESOURCE_INFO } from "@/game/data";
import { GameLocation, LocationType } from "@/game/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Crosshair,
  Users,
  Skull,
  Package,
  X,
  Flag,
  Target,
  Trash2,
} from "lucide-react";

// ---------- Low-poly terrain ----------
function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(60, 60, 30, 30);
    // subtle height variation
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.3;
      pos.setZ(i, noise + Math.sin(dist * 0.2) * 0.2);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.1, 0]}
      receiveShadow
    >
      <meshStandardMaterial color="#3a4a2a" flatShading roughness={1} />
    </mesh>
  );
}

// ---------- Low-poly base buildings ----------
function BaseBuildings() {
  return (
    <group position={[0, 0, 0]}>
      {/* Main shelter — bigger box */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[2.4, 1.6, 2]} />
        <meshStandardMaterial color="#6b5a3a" flatShading roughness={0.9} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.9, 0.8, 4]} />
        <meshStandardMaterial color="#3a2a1a" flatShading roughness={1} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.5, 1.01]}>
        <planeGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#2a1a0a" />
      </mesh>
      {/* Watchtower */}
      <mesh position={[2, 1.5, -1.5]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 3, 6]} />
        <meshStandardMaterial color="#4a3a2a" flatShading />
      </mesh>
      <mesh position={[2, 3, -1.5]} castShadow>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial color="#5a4a3a" flatShading />
      </mesh>
      {/* Farm plot */}
      <mesh position={[-2, 0.05, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial color="#4a5a2a" flatShading />
      </mesh>
      {/* Flag */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0.2, 3, 0]}>
        <planeGeometry args={[0.4, 0.25]} />
        <meshStandardMaterial color="#a83a3a" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ---------- Location building models ----------
function LocationBuilding({ type }: { type: LocationType }) {
  // Different low-poly shapes per type
  const color = LOCATION_DEFS[type].color;
  switch (type) {
    case "abandoned_house":
      return (
        <group>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshStandardMaterial color={color} flatShading roughness={1} />
          </mesh>
          <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1, 0.6, 4]} />
            <meshStandardMaterial color="#3a2a1a" flatShading />
          </mesh>
        </group>
      );
    case "supermarket":
      return (
        <group>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2, 1.5, 1.5]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <boxGeometry args={[2.1, 0.1, 1.6]} />
            <meshStandardMaterial color="#2a2a2a" flatShading />
          </mesh>
        </group>
      );
    case "hospital":
      return (
        <group>
          <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[1.5, 2, 1.5]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.6, 0.4, 0.05]} />
            <meshStandardMaterial color="#cc3333" />
          </mesh>
        </group>
      );
    case "gas_station":
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.4, 1, 1]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[1.5, 0.2, 1.1]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
          <mesh position={[0.8, 0.7, 0.6]}>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
        </group>
      );
    case "warehouse":
      return (
        <group>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2.2, 1.5, 1.6]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, 1.7, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1.6, 0.7, 4]} />
            <meshStandardMaterial color="#2a2a2a" flatShading />
          </mesh>
        </group>
      );
    case "military_base":
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2, 1, 1.5]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[-0.7, 1.3, -0.4]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 1.6, 6]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
          <mesh position={[-0.7, 2.2, -0.4]}>
            <boxGeometry args={[0.5, 0.3, 0.5]} />
            <meshStandardMaterial color="#4a5a3a" flatShading />
          </mesh>
          <mesh position={[0.7, 0.5, 0]} castShadow>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
            <meshStandardMaterial color="#3a4a2a" flatShading />
          </mesh>
        </group>
      );
    case "school":
      return (
        <group>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2.2, 1.5, 1.4]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <boxGeometry args={[2.3, 0.2, 1.5]} />
            <meshStandardMaterial color="#3a2a1a" flatShading />
          </mesh>
        </group>
      );
    case "church":
      return (
        <group>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[1.2, 1.5, 1.8]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, 2, 0.4]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.9, 1.2, 4]} />
            <meshStandardMaterial color="#3a2a1a" flatShading />
          </mesh>
          <mesh position={[0, 2.6, 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 4]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[0, 2.8, 0.4]}>
            <boxGeometry args={[0.2, 0.4, 0.04]} />
            <meshStandardMaterial color="#cc3333" />
          </mesh>
        </group>
      );
    case "factory":
      return (
        <group>
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2.2, 1.5, 1.6]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[-0.6, 1.9, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 1, 8]} />
            <meshStandardMaterial color="#2a2a2a" flatShading />
          </mesh>
          <mesh position={[0.6, 1.9, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 1, 8]} />
            <meshStandardMaterial color="#2a2a2a" flatShading />
          </mesh>
        </group>
      );
    case "pharmacy":
      return (
        <group>
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.3, 1.2, 1.2]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[1.4, 0.15, 1.3]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
          <mesh position={[0, 1, 0.61]}>
            <planeGeometry args={[0.4, 0.4]} />
            <meshStandardMaterial color="#cc3333" />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      );
  }
}

// ---------- Animated location marker ----------
function LocationMarker({
  location,
  selected,
  onClick,
  hasMission,
}: {
  location: GameLocation;
  selected: boolean;
  onClick: () => void;
  hasMission: boolean;
}) {
  const def = LOCATION_DEFS[location.type];
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (ringRef.current) {
      const t = state.clock.elapsedTime;
      const scale = 1 + Math.sin(t * 2) * 0.15;
      ringRef.current.scale.setScalar(scale);
    }
  });

  const markerColor = location.cleared
    ? "#22c55e"
    : hasMission
    ? "#fbbf24"
    : selected
    ? "#ef4444"
    : hovered
    ? "#f87171"
    : "#dc2626";

  return (
    <group position={location.position}>
      {/* Invisible larger click-catcher for easier interaction */}
      <mesh
        position={[0, 1, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <cylinderGeometry args={[2.2, 2.2, 3, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* The building */}
      <group>
        <LocationBuilding type={location.type} />
      </group>

      {/* Selection ring */}
      {(selected || hovered || hasMission) && (
        <mesh
          ref={ringRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
        >
          <ringGeometry args={[1.5, 1.7, 24]} />
          <meshBasicMaterial
            color={markerColor}
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Always-on small dot */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color={markerColor} />
      </mesh>

      {/* Hover label — fixed screen size, follows the 3D position */}
      {(hovered || selected) && (
        <Html
          position={[0, 3.5, 0]}
          center
          prepend
          zIndexRange={[100, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-stone-950/95 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-100 whitespace-nowrap shadow-xl">
            <div className="font-bold text-amber-100">{def.label}</div>
            <div className="text-[11px] text-stone-400">
              {location.cleared
                ? "Cleared"
                : `${location.enemyCount} ${ENEMY_INFO[location.enemyType].label}`}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ---------- Mission Lines ----------
function MissionLines() {
  const missions = useGameStore((s) => s.missions);
  const locations = useGameStore((s) => s.locations);
  const teams = useGameStore((s) => s.teams);

  const pendingMissions = missions.filter((m) => m.status === "pending");

  return (
    <>
      {pendingMissions.map((m) => {
        const loc = locations.find((l) => l.id === m.locationId);
        if (!loc) return null;
        const team = teams.find((t) => t.id === m.teamId);
        const teamColor = team?.name?.toLowerCase().includes("alpha")
          ? "#fbbf24"
          : team?.name?.toLowerCase().includes("bravo")
          ? "#60a5fa"
          : "#a78bfa";
        return (
          <Line
            key={m.id}
            points={[
              [0, 0.5, 0],
              [loc.position[0], 0.5, loc.position[2]],
            ]}
            color={teamColor}
            lineWidth={2}
            dashed
            dashSize={0.5}
            gapSize={0.3}
          />
        );
      })}
    </>
  );
}

// ---------- 3D Scene ----------
function Scene({
  selectedLocationId,
  onSelectLocation,
}: {
  selectedLocationId: string | null;
  onSelectLocation: (id: string | null) => void;
}) {
  const locations = useGameStore((s) => s.locations);
  const missions = useGameStore((s) => s.missions);

  return (
    <>
      <color attach="background" args={["#1a1410"]} />
      <fog attach="fog" args={["#1a1410", 20, 45]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={["#9a8a6a", "#2a2a1a", 0.4]} />

      <Terrain />
      <BaseBuildings />

      {locations.map((loc) => {
        const hasMission = missions.some(
          (m) => m.locationId === loc.id && m.status === "pending"
        );
        return (
          <LocationMarker
            key={loc.id}
            location={loc}
            selected={selectedLocationId === loc.id}
            hasMission={hasMission}
            onClick={() =>
              onSelectLocation(
                selectedLocationId === loc.id ? null : loc.id
              )
            }
          />
        );
      })}

      <MissionLines />

      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.3}
        target={[0, 0, 0]}
      />
    </>
  );
}

// ---------- Main World Map View ----------
export function WorldMapView() {
  const locations = useGameStore((s) => s.locations);
  const teams = useGameStore((s) => s.teams);
  const survivors = useGameStore((s) => s.survivors);
  const missions = useGameStore((s) => s.missions);
  const assignTeamToLocation = useGameStore((s) => s.assignTeamToLocation);
  const clearTeamLocation = useGameStore((s) => s.clearTeamLocation);
  const createTeam = useGameStore((s) => s.createTeam);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const handleAssign = () => {
    if (!selectedTeamId || !selectedLocationId) return;
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team || team.memberIds.length === 0) return;
    // Don't allow if team already has a pending mission (defensive — UI also blocks this)
    const teamHasPending = missions.some(
      (m) => m.teamId === selectedTeamId && m.status === "pending"
    );
    if (teamHasPending) return;
    assignTeamToLocation(selectedTeamId, selectedLocationId);
    // Clear team selection so the player must pick again (the just-dispatched team is now blocked)
    setSelectedTeamId(null);
  };

  const handleClearMission = (teamId: string) => {
    clearTeamLocation(teamId);
  };

  const pendingMissions = missions.filter((m) => m.status === "pending");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
      {/* 3D Map */}
      <Card className="bg-stone-950 border-stone-800 overflow-hidden h-[60vh] lg:h-[75vh] relative">
        <div className="absolute top-3 left-3 z-10 bg-stone-950/80 backdrop-blur border border-stone-800 rounded px-3 py-1.5">
          <div className="text-xs text-stone-400">WORLD MAP</div>
          <div className="text-[10px] text-stone-500">
            Click a location to scout • Drag to rotate • Scroll to zoom
          </div>
        </div>
        <div className="absolute top-3 right-3 z-10 bg-stone-950/80 backdrop-blur border border-stone-800 rounded px-2 py-1.5 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-600" />
            <span className="text-[10px] text-stone-400">Hostile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] text-stone-400">Mission</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-stone-400">Cleared</span>
          </div>
        </div>
        <Canvas
          shadows
          camera={{ position: [12, 14, 12], fov: 50 }}
          gl={{ antialias: false }}
        >
          <Scene
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
          />
        </Canvas>
      </Card>

      {/* Side panel */}
      <div className="space-y-3">
        {/* Selected location info */}
        {selectedLocation ? (
          <Card className="bg-stone-900/60 border-stone-800 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {LOCATION_DEFS[selectedLocation.type].icon}
                </span>
                <div>
                  <div className="font-bold text-stone-100">
                    {selectedLocation.name}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {selectedLocation.cleared
                      ? "Cleared — safe to revisit"
                      : `${selectedLocation.distance} day travel`}
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-stone-500 hover:text-stone-300"
                onClick={() => setSelectedLocationId(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-stone-400 mb-3">
              {LOCATION_DEFS[selectedLocation.type].description}
            </p>

            {/* Danger */}
            <div className="space-y-2">
              {!selectedLocation.cleared ? (
                <div className="bg-stone-950/50 rounded p-2 border border-stone-800">
                  <div className="flex items-center gap-1.5 text-xs text-stone-300 mb-1">
                    <Skull className="w-3 h-3 text-red-400" />
                    <span className="font-medium">Threat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {ENEMY_INFO[selectedLocation.enemyType].icon}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm text-stone-200">
                        {selectedLocation.enemyCount} {ENEMY_INFO[selectedLocation.enemyType].label}
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-sm ${
                              i <= selectedLocation.dangerLevel
                                ? selectedLocation.dangerLevel >= 4
                                  ? "bg-red-500"
                                  : selectedLocation.dangerLevel >= 3
                                  ? "bg-orange-500"
                                  : "bg-amber-500"
                                : "bg-stone-800"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 rounded p-2 border border-emerald-900/50">
                  <div className="text-xs text-emerald-300 flex items-center gap-1.5">
                    <Package className="w-3 h-3" />
                    Cleared — minimal scavenging left
                  </div>
                </div>
              )}

              {/* Loot */}
              <div className="bg-stone-950/50 rounded p-2 border border-stone-800">
                <div className="flex items-center gap-1.5 text-xs text-stone-300 mb-1">
                  <Package className="w-3 h-3 text-amber-400" />
                  <span className="font-medium">Expected Loot</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(selectedLocation.loot).map(([k, v]) => (
                    <Badge
                      key={k}
                      variant="outline"
                      className="text-[10px] border-stone-700 bg-stone-900"
                    >
                      {RESOURCE_INFO[k as keyof typeof RESOURCE_INFO].icon} {v} {k}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Survivor chance */}
              <div className="bg-stone-950/50 rounded p-2 border border-stone-800">
                <div className="flex items-center gap-1.5 text-xs text-stone-300 mb-1">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span className="font-medium">Survivor Chance</span>
                </div>
                <div className="text-sm text-emerald-300">
                  {Math.round(selectedLocation.survivorChance * 100)}%
                </div>
              </div>
            </div>

            {/* Assign team */}
            <div className="mt-3 pt-3 border-t border-stone-800">
              <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1.5">
                Dispatch Team
              </div>
              {teams.length === 0 ? (
                <div className="text-xs text-stone-500 mb-2">
                  No teams yet. Create one in the Survivors tab.
                </div>
              ) : (
                <div className="space-y-1 mb-2 max-h-32 overflow-y-auto">
                  {teams.map((t) => {
                    const teamSurvivors = survivors.filter((s) =>
                      t.memberIds.includes(s.id)
                    );
                    const hasMission = pendingMissions.some(
                      (m) => m.teamId === t.id
                    );
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTeamId(t.id)}
                        disabled={hasMission || teamSurvivors.length === 0}
                        className={`w-full text-left p-2 rounded text-xs border transition-colors ${
                          selectedTeamId === t.id
                            ? "border-amber-600 bg-amber-950/30 text-amber-200"
                            : hasMission
                            ? "border-stone-800 bg-stone-950/50 text-stone-600 cursor-not-allowed"
                            : teamSurvivors.length === 0
                            ? "border-stone-800 bg-stone-950/50 text-stone-600 cursor-not-allowed"
                            : "border-stone-700 bg-stone-900/50 text-stone-300 hover:border-stone-600"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{t.name}</span>
                          <span className="text-[10px] text-stone-500">
                            {teamSurvivors.length} ready
                          </span>
                        </div>
                        {hasMission && (
                          <div className="text-[10px] text-amber-500 mt-0.5">
                            Already dispatched
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              <Button
                size="sm"
                className="w-full bg-amber-700 hover:bg-amber-600 text-amber-50"
                disabled={
                  !selectedTeamId ||
                  // Disable if selected team already has a pending mission
                  (selectedTeamId
                    ? missions.some(
                        (m) =>
                          m.teamId === selectedTeamId && m.status === "pending"
                      )
                    : true)
                }
                onClick={handleAssign}
              >
                <Target className="w-3 h-3 mr-1" />
                Dispatch Team
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="bg-stone-900/40 border-stone-800 border-dashed p-6 text-center">
            <MapPin className="w-8 h-8 mx-auto text-stone-600 mb-2" />
            <div className="text-sm text-stone-400 font-medium mb-1">
              Select a location
            </div>
            <div className="text-xs text-stone-500">
              Click any marker on the map to view details and dispatch a team.
            </div>
          </Card>
        )}

        {/* Pending missions list */}
        <Card className="bg-stone-900/60 border-stone-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-wide text-stone-500 flex items-center gap-1.5">
              <Flag className="w-3 h-3" />
              Pending Missions
            </div>
            <Badge
              variant="outline"
              className="text-[10px] border-stone-700 text-stone-400"
            >
              {pendingMissions.length}
            </Badge>
          </div>
          {pendingMissions.length === 0 ? (
            <div className="text-xs text-stone-500 italic py-2">
              No teams dispatched. Click a location to send one.
            </div>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-1.5 pr-2">
                {pendingMissions.map((m) => {
                  const team = teams.find((t) => t.id === m.teamId);
                  const loc = locations.find((l) => l.id === m.locationId);
                  const teamSurvivors = survivors.filter((s) =>
                    m.team.includes(s.id)
                  );
                  return (
                    <div
                      key={m.id}
                      className="bg-stone-950/50 border border-stone-800 rounded p-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-amber-200 truncate">
                            {team?.name}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {teamSurvivors.length} surv → {loc?.name}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-stone-500 hover:text-red-400"
                          onClick={() => handleClearMission(m.teamId)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </Card>

        {/* Quick team creation */}
        {teams.length === 0 && (
          <Card className="bg-stone-900/60 border-stone-800 p-3">
            <div className="text-xs text-stone-400 mb-2">
              You don&apos;t have any teams yet. Create one to send survivors on
              missions.
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-amber-800 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50"
              onClick={() => createTeam("Alpha")}
            >
              <Crosshair className="w-3 h-3 mr-1" />
              Create Team Alpha
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
