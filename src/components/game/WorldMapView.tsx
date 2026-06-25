"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { MapControls, Line, Html } from "@react-three/drei";
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
  Hammer,
  Pickaxe,
} from "lucide-react";

// ---------- Helper: window ----------
function Window({
  position,
  rotation = [0, 0, 0],
  size = [0.3, 0.4],
  color = "#5a7a8a",
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive="#1a2a3a"
        emissiveIntensity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ---------- Helper: door ----------
function Door({
  position,
  rotation = [0, 0, 0],
  size = [0.5, 0.9],
  color = "#2a1a0a",
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------- Low-poly terrain ----------
function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(80, 80, 40, 40);
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

// ---------- Low-poly base buildings (more detailed) ----------
function BaseBuildings() {
  return (
    <group position={[0, 0, 0]}>
      {/* Main shelter — main body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[2.4, 1.6, 2]} />
        <meshStandardMaterial color="#6b5a3a" flatShading roughness={0.9} />
      </mesh>
      {/* Roof — pyramid shape */}
      <mesh position={[0, 1.85, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.9, 0.9, 4]} />
        <meshStandardMaterial color="#3a2a1a" flatShading roughness={1} />
      </mesh>
      {/* Chimney */}
      <mesh position={[0.6, 2.2, -0.3]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.3]} />
        <meshStandardMaterial color="#4a3a2a" flatShading />
      </mesh>
      {/* Door */}
      <Door position={[0, 0.45, 1.01]} size={[0.6, 0.9]} color="#2a1a0a" />
      {/* Door handle */}
      <mesh position={[0.2, 0.45, 1.02]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#aa8833" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Front windows */}
      <Window position={[-0.7, 0.9, 1.01]} size={[0.4, 0.4]} />
      <Window position={[0.7, 0.9, 1.01]} size={[0.4, 0.4]} />
      {/* Side windows */}
      <Window position={[1.21, 0.9, 0]} rotation={[0, Math.PI / 2, 0]} size={[0.4, 0.4]} />
      <Window position={[-1.21, 0.9, 0]} rotation={[0, Math.PI / 2, 0]} size={[0.4, 0.4]} />

      {/* Watchtower — 4 legs */}
      <mesh position={[2.3, 1, -1.5]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 2, 6]} />
        <meshStandardMaterial color="#4a3a2a" flatShading />
      </mesh>
      <mesh position={[1.7, 1, -1.5]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 2, 6]} />
        <meshStandardMaterial color="#4a3a2a" flatShading />
      </mesh>
      <mesh position={[2.3, 1, -0.9]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 2, 6]} />
        <meshStandardMaterial color="#4a3a2a" flatShading />
      </mesh>
      <mesh position={[1.7, 1, -0.9]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 2, 6]} />
        <meshStandardMaterial color="#4a3a2a" flatShading />
      </mesh>
      {/* Watchtower platform */}
      <mesh position={[2, 2.2, -1.2]} castShadow>
        <boxGeometry args={[1, 0.2, 1]} />
        <meshStandardMaterial color="#5a4a3a" flatShading />
      </mesh>
      {/* Watchtower roof */}
      <mesh position={[2, 2.9, -1.2]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.8, 0.6, 4]} />
        <meshStandardMaterial color="#3a2a1a" flatShading />
      </mesh>

      {/* Farm plot — rows of crops */}
      <mesh position={[-2, 0.05, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshStandardMaterial color="#4a3a1a" flatShading />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-2.6 + i * 0.4, 0.1, 1.5]} castShadow>
          <boxGeometry args={[0.1, 0.15, 1.4]} />
          <meshStandardMaterial color="#5a8a2a" flatShading />
        </mesh>
      ))}

      {/* Storage crates */}
      <mesh position={[-2, 0.4, -1.5]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#6a5a3a" flatShading />
      </mesh>
      <mesh position={[-1.4, 0.3, -1.7]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#5a4a2a" flatShading />
      </mesh>

      {/* Flag pole + flag */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0.25, 3, 0]}>
        <planeGeometry args={[0.5, 0.3]} />
        <meshStandardMaterial color="#a83a3a" side={THREE.DoubleSide} />
      </mesh>

      {/* Sandbags around perimeter */}
      {[
        [1.5, 0.2, 1.2],
        [1.8, 0.2, 1.0],
        [-1.5, 0.2, -1.2],
        [-1.8, 0.2, -1.0],
        [1.5, 0.2, -1.2],
        [-1.5, 0.2, 1.2],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.35, 0.25, 0.25]} />
          <meshStandardMaterial color="#8a7a5a" flatShading />
        </mesh>
      ))}
    </group>
  );
}

// ---------- Location building models (detailed) ----------
function LocationBuilding({ type }: { type: LocationType }) {
  const color = LOCATION_DEFS[type].color;
  switch (type) {
    case "abandoned_house":
      return (
        <group>
          {/* Main body */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshStandardMaterial color={color} flatShading roughness={1} />
          </mesh>
          {/* Roof — pyramid */}
          <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1, 0.7, 4]} />
            <meshStandardMaterial color="#3a2a1a" flatShading />
          </mesh>
          {/* Door */}
          <Door position={[0, 0.35, 0.61]} size={[0.4, 0.7]} color="#1a0a00" />
          {/* Windows (broken/dark) */}
          <Window position={[-0.35, 0.8, 0.61]} size={[0.3, 0.3]} color="#1a1a1a" />
          <Window position={[0.35, 0.8, 0.61]} size={[0.3, 0.3]} color="#1a1a1a" />
          {/* Side window */}
          <Window position={[0.61, 0.8, 0]} rotation={[0, Math.PI / 2, 0]} size={[0.3, 0.3]} color="#1a1a1a" />
          {/* Collapsed porch / debris */}
          <mesh position={[0, 0.1, 0.9]} castShadow>
            <boxGeometry args={[0.8, 0.2, 0.4]} />
            <meshStandardMaterial color="#4a3a2a" flatShading />
          </mesh>
        </group>
      );
    case "supermarket":
      return (
        <group>
          {/* Main body */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2, 1.5, 1.5]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Flat roof */}
          <mesh position={[0, 1.55, 0]} castShadow>
            <boxGeometry args={[2.1, 0.1, 1.6]} />
            <meshStandardMaterial color="#2a2a2a" flatShading />
          </mesh>
          {/* Roof AC unit */}
          <mesh position={[0.5, 1.7, 0]} castShadow>
            <boxGeometry args={[0.5, 0.25, 0.5]} />
            <meshStandardMaterial color="#4a4a4a" flatShading />
          </mesh>
          {/* Entrance doors (double) */}
          <Door position={[-0.25, 0.45, 0.76]} size={[0.35, 0.9]} color="#1a1a1a" />
          <Door position={[0.25, 0.45, 0.76]} size={[0.35, 0.9]} color="#1a1a1a" />
          {/* Storefront windows (wide) */}
          <Window position={[-0.8, 0.8, 0.76]} size={[0.4, 0.6]} color="#2a3a4a" />
          <Window position={[0.8, 0.8, 0.76]} size={[0.4, 0.6]} color="#2a3a4a" />
          {/* Sign */}
          <mesh position={[0, 1.3, 0.76]}>
            <boxGeometry args={[1.5, 0.25, 0.05]} />
            <meshStandardMaterial color="#aa3333" />
          </mesh>
          {/* Shopping cart */}
          <mesh position={[1.3, 0.3, 0.8]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.4]} />
            <meshStandardMaterial color="#5a5a5a" wireframe />
          </mesh>
        </group>
      );
    case "hospital":
      return (
        <group>
          {/* Main tower */}
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[1.5, 2.4, 1.5]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Flat roof */}
          <mesh position={[0, 2.45, 0]} castShadow>
            <boxGeometry args={[1.6, 0.1, 1.6]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
          {/* Red cross sign */}
          <mesh position={[0, 1.8, 0.76]}>
            <boxGeometry args={[0.7, 0.2, 0.05]} />
            <meshStandardMaterial color="#cc3333" emissive="#cc3333" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 1.8, 0.76]}>
            <boxGeometry args={[0.2, 0.7, 0.05]} />
            <meshStandardMaterial color="#cc3333" emissive="#cc3333" emissiveIntensity={0.3} />
          </mesh>
          {/* Entrance (double doors) */}
          <Door position={[-0.25, 0.5, 0.76]} size={[0.35, 1]} color="#2a4a5a" />
          <Door position={[0.25, 0.5, 0.76]} size={[0.35, 1]} color="#2a4a5a" />
          {/* Row of windows floor 1 */}
          <Window position={[-0.5, 1.2, 0.76]} size={[0.3, 0.4]} color="#6a8a9a" />
          <Window position={[0.5, 1.2, 0.76]} size={[0.3, 0.4]} color="#6a8a9a" />
          {/* Row of windows floor 2 */}
          <Window position={[-0.5, 2, 0.76]} size={[0.3, 0.4]} color="#6a8a9a" />
          <Window position={[0.5, 2, 0.76]} size={[0.3, 0.4]} color="#6a8a9a" />
          {/* Ambulance */}
          <mesh position={[1.3, 0.4, 0.5]} castShadow>
            <boxGeometry args={[0.7, 0.6, 1.2]} />
            <meshStandardMaterial color="#eeeeee" flatShading />
          </mesh>
          <mesh position={[1.3, 0.7, 0.5]}>
            <boxGeometry args={[0.6, 0.3, 0.8]} />
            <meshStandardMaterial color="#cc3333" flatShading />
          </mesh>
        </group>
      );
    case "gas_station":
      return (
        <group>
          {/* Convenience store */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.4, 1, 1]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Flat roof */}
          <mesh position={[0, 1.05, 0]} castShadow>
            <boxGeometry args={[1.5, 0.1, 1.1]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
          {/* Door */}
          <Door position={[0, 0.35, 0.51]} size={[0.4, 0.7]} color="#1a1a1a" />
          {/* Window */}
          <Window position={[-0.4, 0.5, 0.51]} size={[0.4, 0.4]} color="#3a4a5a" />
          {/* Canopy over pumps */}
          <mesh position={[1.3, 1.4, 0]} castShadow>
            <boxGeometry args={[1.6, 0.15, 1.6]} />
            <meshStandardMaterial color="#5a5a5a" flatShading />
          </mesh>
          {/* Canopy supports */}
          <mesh position={[0.7, 0.7, -0.6]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[1.9, 0.7, -0.6]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[0.7, 0.7, 0.6]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[1.9, 0.7, 0.6]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          {/* Gas pumps */}
          <mesh position={[1.3, 0.5, 0]} castShadow>
            <boxGeometry args={[0.25, 0.8, 0.5]} />
            <meshStandardMaterial color="#3a4a5a" flatShading />
          </mesh>
          <mesh position={[1.3, 0.9, 0.15]}>
            <boxGeometry args={[0.2, 0.15, 0.2]} />
            <meshStandardMaterial color="#2a3a4a" />
          </mesh>
        </group>
      );
    case "warehouse":
      return (
        <group>
          {/* Main body */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2.2, 1.5, 1.6]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Curved roof — half cylinder */}
          <mesh position={[0, 1.7, 0]} rotation={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.85, 0.85, 2.2, 8, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#2a2a2a" flatShading side={THREE.DoubleSide} />
          </mesh>
          {/* Loading dock door (large) */}
          <mesh position={[0, 0.6, 0.81]}>
            <boxGeometry args={[1.2, 1.1, 0.05]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
          {/* Door lines (rolled up) */}
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, 0.2 + i * 0.2, 0.82]}>
              <boxGeometry args={[1.2, 0.03, 0.02]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          ))}
          {/* Small office window */}
          <Window position={[-0.8, 1, 0.81]} size={[0.3, 0.3]} color="#2a3a4a" />
          {/* Pallets */}
          <mesh position={[1.2, 0.15, 0.5]} castShadow>
            <boxGeometry args={[0.5, 0.15, 0.5]} />
            <meshStandardMaterial color="#5a4a2a" flatShading />
          </mesh>
          <mesh position={[1.2, 0.4, 0.5]} castShadow>
            <boxGeometry args={[0.4, 0.3, 0.4]} />
            <meshStandardMaterial color="#6a5a3a" flatShading />
          </mesh>
        </group>
      );
    case "military_base":
      return (
        <group>
          {/* Bunker main body */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2, 1, 1.5]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Sandbag wall in front */}
          {[-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => (
            <mesh key={i} position={[x, 0.2, 0.9]} castShadow>
              <boxGeometry args={[0.35, 0.3, 0.25]} />
              <meshStandardMaterial color="#8a7a5a" flatShading />
            </mesh>
          ))}
          {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
            <mesh key={`s${i}`} position={[x, 0.45, 0.9]} castShadow>
              <boxGeometry args={[0.35, 0.3, 0.25]} />
              <meshStandardMaterial color="#7a6a4a" flatShading />
            </mesh>
          ))}
          {/* Radio antenna tower */}
          <mesh position={[-1, 1.3, -0.4]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 1.8, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[-1, 2, -0.4]}>
            <boxGeometry args={[0.4, 0.05, 0.05]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
          <mesh position={[-1, 2.2, -0.4]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#aa3333" emissive="#aa3333" emissiveIntensity={0.5} />
          </mesh>
          {/* Sandbag bunker (small) */}
          <mesh position={[0.9, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.6, 0.7, 8]} />
            <meshStandardMaterial color="#6a5a3a" flatShading />
          </mesh>
          {/* Door */}
          <Door position={[0, 0.4, 0.76]} size={[0.5, 0.8]} color="#2a3a1a" />
          {/* Ammo crate */}
          <mesh position={[0.7, 0.2, 0.7]} castShadow>
            <boxGeometry args={[0.4, 0.3, 0.4]} />
            <meshStandardMaterial color="#4a5a3a" flatShading />
          </mesh>
        </group>
      );
    case "school":
      return (
        <group>
          {/* Main body */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2.2, 1.5, 1.4]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Flat roof */}
          <mesh position={[0, 1.55, 0]} castShadow>
            <boxGeometry args={[2.3, 0.15, 1.5]} />
            <meshStandardMaterial color="#3a2a1a" flatShading />
          </mesh>
          {/* Front entrance — steps */}
          <mesh position={[0, 0.1, 0.8]} castShadow>
            <boxGeometry args={[1.2, 0.2, 0.3]} />
            <meshStandardMaterial color="#5a5a5a" flatShading />
          </mesh>
          <mesh position={[0, 0.25, 0.95]} castShadow>
            <boxGeometry args={[1, 0.15, 0.2]} />
            <meshStandardMaterial color="#4a4a4a" flatShading />
          </mesh>
          {/* Double doors */}
          <Door position={[-0.2, 0.55, 0.71]} size={[0.3, 0.9]} color="#2a1a0a" />
          <Door position={[0.2, 0.55, 0.71]} size={[0.3, 0.9]} color="#2a1a0a" />
          {/* Row of windows */}
          <Window position={[-0.8, 0.9, 0.71]} size={[0.35, 0.5]} color="#3a4a5a" />
          <Window position={[0.8, 0.9, 0.71]} size={[0.35, 0.5]} color="#3a4a5a" />
          <Window position={[-0.8, 1.3, 0.71]} size={[0.35, 0.3]} color="#3a4a5a" />
          <Window position={[0.8, 1.3, 0.71]} size={[0.35, 0.3]} color="#3a4a5a" />
          {/* Flagpole */}
          <mesh position={[1.2, 1.5, 0.6]}>
            <cylinderGeometry args={[0.04, 0.04, 1.5, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[1.35, 2.1, 0.6]}>
            <planeGeometry args={[0.3, 0.2]} />
            <meshStandardMaterial color="#aa3333" side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    case "church":
      return (
        <group>
          {/* Nave (main body) */}
          <mesh position={[0, 0.75, 0.3]} castShadow>
            <boxGeometry args={[1.2, 1.5, 1.8]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Roof — triangular prism */}
          <mesh position={[0, 1.7, 0.3]} rotation={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.7, 0.7, 1.8, 3]} />
            <meshStandardMaterial color="#3a2a1a" flatShading />
          </mesh>
          {/* Bell tower */}
          <mesh position={[0, 1.2, -0.7]} castShadow>
            <boxGeometry args={[0.8, 2.4, 0.8]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Bell tower roof — pyramid */}
          <mesh position={[0, 2.7, -0.7]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.65, 0.8, 4]} />
            <meshStandardMaterial color="#3a2a1a" flatShading />
          </mesh>
          {/* Bell opening */}
          <mesh position={[0, 1.5, -0.31]}>
            <boxGeometry args={[0.4, 0.5, 0.05]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          {/* Cross on top */}
          <mesh position={[0, 3.3, -0.7]}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshStandardMaterial color="#aaaaaa" metalness={0.5} />
          </mesh>
          <mesh position={[0, 3.35, -0.7]}>
            <boxGeometry args={[0.25, 0.05, 0.05]} />
            <meshStandardMaterial color="#aaaaaa" metalness={0.5} />
          </mesh>
          {/* Main door (arched look) */}
          <Door position={[0, 0.5, 1.21]} size={[0.5, 1]} color="#1a0a00" />
          {/* Stained glass windows */}
          <Window position={[-0.45, 1, 1.21]} size={[0.3, 0.5]} color="#aa6a3a" />
          <Window position={[0.45, 1, 1.21]} size={[0.3, 0.5]} color="#aa6a3a" />
          {/* Gravestones */}
          <mesh position={[1, 0.3, 0.5]} castShadow>
            <boxGeometry args={[0.2, 0.5, 0.05]} />
            <meshStandardMaterial color="#6a6a6a" flatShading />
          </mesh>
          <mesh position={[-1, 0.3, 0.8]} castShadow>
            <boxGeometry args={[0.2, 0.4, 0.05]} />
            <meshStandardMaterial color="#5a5a5a" flatShading />
          </mesh>
        </group>
      );
    case "factory":
      return (
        <group>
          {/* Main body */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[2.2, 1.5, 1.6]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Sawtooth roof — multiple angled sections */}
          {[-0.7, -0.2, 0.3, 0.8].map((x, i) => (
            <mesh key={i} position={[x, 1.6, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
              <boxGeometry args={[0.45, 0.05, 1.6]} />
              <meshStandardMaterial color="#2a2a2a" flatShading />
            </mesh>
          ))}
          {/* Two chimneys */}
          <mesh position={[-0.6, 2, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 1.2, 8]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
          <mesh position={[-0.6, 2.65, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.15, 8]} />
            <meshStandardMaterial color="#1a1a1a" flatShading />
          </mesh>
          <mesh position={[0.6, 2.3, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 1.6, 8]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
          <mesh position={[0.6, 3.15, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.15, 8]} />
            <meshStandardMaterial color="#1a1a1a" flatShading />
          </mesh>
          {/* Large industrial door */}
          <mesh position={[0, 0.6, 0.81]}>
            <boxGeometry args={[1.2, 1.2, 0.05]} />
            <meshStandardMaterial color="#2a2a2a" flatShading />
          </mesh>
          {/* Rust stains */}
          <mesh position={[-0.7, 0.5, 0.81]}>
            <planeGeometry args={[0.4, 0.6]} />
            <meshStandardMaterial color="#5a3a1a" transparent opacity={0.4} />
          </mesh>
          {/* Pipes on side */}
          <mesh position={[1.11, 1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.4, 6]} />
            <meshStandardMaterial color="#5a4a3a" />
          </mesh>
          <mesh position={[1.11, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 6]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
        </group>
      );
    case "pharmacy":
      return (
        <group>
          {/* Main body */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <boxGeometry args={[1.3, 1.2, 1.2]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Flat roof */}
          <mesh position={[0, 1.25, 0]} castShadow>
            <boxGeometry args={[1.4, 0.1, 1.3]} />
            <meshStandardMaterial color="#3a3a3a" flatShading />
          </mesh>
          {/* Green cross sign (pharmacy) */}
          <mesh position={[0, 1, 0.61]}>
            <boxGeometry args={[0.4, 0.4, 0.05]} />
            <meshStandardMaterial color="#22aa55" emissive="#22aa55" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0, 1, 0.63]}>
            <boxGeometry args={[0.15, 0.15, 0.05]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          {/* Door */}
          <Door position={[0, 0.35, 0.61]} size={[0.4, 0.7]} color="#1a1a1a" />
          {/* Display windows */}
          <Window position={[-0.45, 0.6, 0.61]} size={[0.35, 0.5]} color="#4a6a5a" />
          <Window position={[0.45, 0.6, 0.61]} size={[0.35, 0.5]} color="#4a6a5a" />
          {/* Awning */}
          <mesh position={[0, 0.85, 0.75]} rotation={[-Math.PI / 6, 0, 0]} castShadow>
            <boxGeometry args={[1.2, 0.05, 0.4]} />
            <meshStandardMaterial color="#3a8a5a" flatShading />
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

  const markerColor = location.salvageDepleted
    ? "#6b7280" // grey for depleted
    : location.cleared
    ? "#22c55e" // green for cleared (still has salvage)
    : hasMission
    ? "#fbbf24"
    : selected
    ? "#ef4444"
    : hovered
    ? "#f87171"
    : "#dc2626";

  return (
    <group position={location.position}>
      {/* Invisible larger click-catcher for easier interaction (box for top-down view) */}
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
        <boxGeometry args={[3, 3, 3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* The building — faded if cleared */}
      <group>
        <LocationBuilding type={location.type} />
        {location.cleared && (
          // Overlay a translucent green tint on cleared buildings
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.5, 2.5, 2.5]} />
            <meshBasicMaterial
              color="#22c55e"
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      {/* Selection ring (animated) — for selected/hovered/mission */}
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

      {/* Cleared indicator — green ring on the ground + floating checkmark flag */}
      {location.cleared && (
        <>
          {/* Persistent green ring on the ground (always visible from top) */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.08, 0]}
          >
            <ringGeometry args={[2.0, 2.3, 24]} />
            <meshBasicMaterial
              color="#22c55e"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Floating flag with checkmark (visible from any angle) */}
          <group position={[0, 3.5, 0]}>
            {/* Pole */}
            <mesh position={[0, -0.6, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
              <meshBasicMaterial color="#1a1a1a" />
            </mesh>
            {/* Flag */}
            <mesh position={[0.3, -0.1, 0]}>
              <planeGeometry args={[0.6, 0.4]} />
              <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} />
            </mesh>
          </group>
        </>
      )}

      {/* Hover label — fixed screen size, follows the 3D position */}
      {(hovered || selected) && (
        <Html
          position={[0, 3.5, 0]}
          center
          prepend
          zIndexRange={[100, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="bg-stone-950/95 border border-stone-700 rounded px-3 py-2 text-xs text-stone-100 whitespace-nowrap shadow-xl">
            <div className="font-bold text-amber-100 text-sm">{def.label}</div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {location.cleared ? (
                <span className="text-emerald-400">✓ Cleared</span>
              ) : (
                <>
                  {ENEMY_INFO[location.enemyType].icon} {location.enemyCount}{" "}
                  {ENEMY_INFO[location.enemyType].label}
                </>
              )}
            </div>
            {!location.cleared &&
              Object.keys(location.loot).length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-stone-800">
                  <div className="text-[9px] uppercase tracking-wide text-stone-500 mb-0.5">
                    Expected Loot
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(location.loot).map(([k, v]) => (
                      <span
                        key={k}
                        className="flex items-center gap-0.5 text-[11px] text-stone-200"
                      >
                        <span>
                          {
                            RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]
                              .icon
                          }
                        </span>
                        <span className="font-medium">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            {location.cleared &&
              !location.salvageDepleted &&
              Object.keys(location.salvagePool).length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-stone-800">
                  <div className="text-[9px] uppercase tracking-wide text-emerald-500 mb-0.5">
                    Salvage Pool
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(location.salvagePool).map(([k, v]) => (
                      <span
                        key={k}
                        className="flex items-center gap-0.5 text-[11px] text-emerald-200"
                      >
                        <span>
                          {
                            RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]
                              .icon
                          }
                        </span>
                        <span className="font-medium">{v as number}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            {location.cleared && location.salvageDepleted && (
              <div className="mt-1.5 pt-1.5 border-t border-stone-800">
                <div className="text-[10px] text-stone-500 italic">
                  Fully salvaged
                </div>
              </div>
            )}
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
        // Salvage missions use a green dashed line, scout missions use team color
        const isSalvage = m.missionType === "salvage";
        const teamColor = isSalvage
          ? "#22c55e"
          : team?.name?.toLowerCase().includes("alpha")
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
      <fog attach="fog" args={["#1a1410", 45, 90]} />

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

      <MapControls
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        minDistance={12}
        maxDistance={55}
        target={[0, 0, 0]}
        screenSpacePanning={false}
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
  const assignTeamToSalvage = useGameStore((s) => s.assignTeamToSalvage);
  const clearTeamLocation = useGameStore((s) => s.clearTeamLocation);
  const createTeam = useGameStore((s) => s.createTeam);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  // Determine mission type based on location state
  const isSalvageMission =
    selectedLocation?.cleared && !selectedLocation?.salvageDepleted;

  const handleAssign = () => {
    if (!selectedTeamId || !selectedLocationId) return;
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team || team.memberIds.length === 0) return;
    // Don't allow if team already has a pending mission (defensive — UI also blocks this)
    const teamHasPending = missions.some(
      (m) => m.teamId === selectedTeamId && m.status === "pending"
    );
    if (teamHasPending) return;
    if (isSalvageMission) {
      assignTeamToSalvage(selectedTeamId, selectedLocationId);
    } else {
      assignTeamToLocation(selectedTeamId, selectedLocationId);
    }
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
            Click a location to scout • Drag to pan • Scroll to zoom
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
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-stone-500" />
            <span className="text-[10px] text-stone-400">Depleted</span>
          </div>
        </div>
        <Canvas
          shadows
          camera={{ position: [0, 22, 18], fov: 45 }}
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
                  <div className="text-xs text-emerald-300 flex items-center gap-1.5 mb-1">
                    <Package className="w-3 h-3" />
                    {selectedLocation.salvageDepleted
                      ? "Depleted — nothing left to salvage"
                      : "Cleared — ready to salvage ruins"}
                  </div>
                  {!selectedLocation.salvageDepleted &&
                    Object.keys(selectedLocation.salvagePool).length > 0 && (
                      <div className="mt-1.5">
                        <div className="text-[9px] uppercase tracking-wide text-stone-500 mb-1">
                          Salvage Pool (remaining)
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(selectedLocation.salvagePool).map(
                            ([k, v]) => (
                              <Badge
                                key={k}
                                variant="outline"
                                className="text-[10px] border-emerald-800 bg-emerald-950/30 text-emerald-300"
                              >
                                {
                                  RESOURCE_INFO[k as keyof typeof RESOURCE_INFO]
                                    .icon
                                }{" "}
                                {v as number} {k}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
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

            {/* Assign team / Salvage */}
            <div className="mt-3 pt-3 border-t border-stone-800">
              {isSalvageMission ? (
                <>
                  <div className="text-[10px] uppercase tracking-wide text-emerald-500 mb-1.5 flex items-center gap-1">
                    <Pickaxe className="w-3 h-3" />
                    Salvage Operation
                  </div>
                  <div className="text-[11px] text-stone-400 mb-2 leading-snug">
                    Send a team to extract resources from the ruins. Yield
                    scales with the team&apos;s total Scavenge skill.
                  </div>
                </>
              ) : (
                <div className="text-[10px] uppercase tracking-wide text-stone-500 mb-1.5">
                  Dispatch Team
                </div>
              )}
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
                    // For salvage, show the team's total scavenge skill
                    const teamScavenge = teamSurvivors.reduce(
                      (sum, s) => sum + s.skills.scavenging,
                      0
                    );
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTeamId(t.id)}
                        disabled={hasMission || teamSurvivors.length === 0}
                        className={`w-full text-left p-2 rounded text-xs border transition-colors ${
                          selectedTeamId === t.id
                            ? isSalvageMission
                              ? "border-emerald-600 bg-emerald-950/30 text-emerald-200"
                              : "border-amber-600 bg-amber-950/30 text-amber-200"
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
                            {isSalvageMission && (
                              <span className="ml-1 text-emerald-500">
                                · scavenge {teamScavenge}
                              </span>
                            )}
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
              {isSalvageMission ? (
                <Button
                  size="sm"
                  className="w-full bg-emerald-700 hover:bg-emerald-600 text-emerald-50"
                  disabled={
                    !selectedTeamId ||
                    (selectedTeamId
                      ? missions.some(
                          (m) =>
                            m.teamId === selectedTeamId &&
                            m.status === "pending"
                        )
                      : true)
                  }
                  onClick={handleAssign}
                >
                  <Hammer className="w-3 h-3 mr-1" />
                  Send Salvage Team
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-amber-700 hover:bg-amber-600 text-amber-50"
                  disabled={
                    !selectedTeamId ||
                    // Disable if selected team already has a pending mission
                    (selectedTeamId
                      ? missions.some(
                          (m) =>
                            m.teamId === selectedTeamId &&
                            m.status === "pending"
                        )
                      : true)
                  }
                  onClick={handleAssign}
                >
                  <Target className="w-3 h-3 mr-1" />
                  Dispatch Team
                </Button>
              )}
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
                  const isSalvage = m.missionType === "salvage";
                  return (
                    <div
                      key={m.id}
                      className={`border rounded p-2 ${
                        isSalvage
                          ? "bg-emerald-950/30 border-emerald-900/50"
                          : "bg-stone-950/50 border-stone-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            {isSalvage ? (
                              <Hammer className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <Target className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            )}
                            <div
                              className={`text-xs font-medium truncate ${
                                isSalvage
                                  ? "text-emerald-200"
                                  : "text-amber-200"
                              }`}
                            >
                              {team?.name}
                            </div>
                          </div>
                          <div className="text-[10px] text-stone-400 ml-4">
                            {isSalvage ? "Salvaging" : "Scouting"} →{" "}
                            {loc?.name}
                          </div>
                          <div className="text-[10px] text-stone-500 ml-4">
                            {teamSurvivors.length} survivor
                            {teamSurvivors.length !== 1 ? "s" : ""}
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
