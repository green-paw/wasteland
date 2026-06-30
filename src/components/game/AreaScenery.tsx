"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { AreaType } from "@/game/types";
import { makeRng } from "@/game/worldGen";

type SceneryKind =
  | "tree"
  | "bush"
  | "rock"
  | "field"
  | "hay_bale"
  | "fence"
  | "barrel"
  | "rubble"
  | "sandbag"
  | "wire_post"
  | "lamp_post"
  | "pipe"
  | "dead_tree";

interface SceneryProp {
  kind: SceneryKind;
  position: [number, number, number];
  rotation: number;
  scale: number;
  variant: number;
}

const SCENERY_BY_AREA: Record<
  AreaType,
  { kinds: SceneryKind[]; count: [number, number] }
> = {
  farm: {
    kinds: ["field", "field", "hay_bale", "fence", "tree", "bush"],
    count: [14, 20],
  },
  village: {
    kinds: ["tree", "tree", "bush", "bush", "fence", "field"],
    count: [16, 22],
  },
  town: {
    kinds: ["tree", "bush", "lamp_post", "rubble", "fence"],
    count: [12, 16],
  },
  city: {
    kinds: ["rubble", "rubble", "barrel", "lamp_post", "dead_tree"],
    count: [10, 14],
  },
  military: {
    kinds: ["sandbag", "sandbag", "wire_post", "barrel", "fence"],
    count: [10, 14],
  },
  industrial: {
    kinds: ["barrel", "barrel", "pipe", "rubble", "fence"],
    count: [12, 16],
  },
  wilderness: {
    kinds: ["tree", "tree", "tree", "bush", "bush", "rock"],
    count: [20, 28],
  },
  ruins: {
    kinds: ["rubble", "rubble", "dead_tree", "rock", "barrel"],
    count: [12, 18],
  },
};

function areaSeedFromId(areaId: string): number {
  let h = 0;
  for (let i = 0; i < areaId.length; i++) {
    h = (Math.imul(31, h) + areaId.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function isTooClose(
  x: number,
  z: number,
  avoid: [number, number][],
  minDist: number
): boolean {
  const minDistSq = minDist * minDist;
  return avoid.some(([ax, az]) => {
    const dx = x - ax;
    const dz = z - az;
    return dx * dx + dz * dz < minDistSq;
  });
}

function generateScenery(
  areaType: AreaType,
  areaId: string,
  avoidPositions: [number, number][]
): SceneryProp[] {
  const profile = SCENERY_BY_AREA[areaType];
  const rng = makeRng(areaSeedFromId(areaId) ^ 0x9e3779b9);
  const count = Math.floor(
    rng() * (profile.count[1] - profile.count[0] + 1) + profile.count[0]
  );
  const props: SceneryProp[] = [];

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = rng() * Math.PI * 2;
      const radius = 6 + rng() * 28;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const minDist = 3.2 + rng() * 1.5;
      if (isTooClose(x, z, avoidPositions, minDist)) continue;
      if (props.some((p) => {
        const dx = p.position[0] - x;
        const dz = p.position[2] - z;
        return dx * dx + dz * dz < 2.2 * 2.2;
      })) continue;

      props.push({
        kind: profile.kinds[Math.floor(rng() * profile.kinds.length)],
        position: [x, 0, z],
        rotation: rng() * Math.PI * 2,
        scale: 0.75 + rng() * 0.55,
        variant: Math.floor(rng() * 3),
      });
      placed = true;
      break;
    }
    if (!placed) break;
  }

  return props;
}

function noopRaycast() {
  return null;
}

function Tree({ scale, variant }: { scale: number; variant: number }) {
  const trunkH = 0.55 * scale;
  const foliageH = 1.1 * scale;
  const foliageColor = variant === 0 ? "#3a6a3a" : variant === 1 ? "#4a7a4a" : "#2a5a2a";
  return (
    <group>
      <mesh position={[0, trunkH / 2, 0]} castShadow raycast={noopRaycast}>
        <cylinderGeometry args={[0.12 * scale, 0.16 * scale, trunkH, 6]} />
        <meshStandardMaterial color="#4a3520" flatShading />
      </mesh>
      <mesh position={[0, trunkH + foliageH * 0.4, 0]} castShadow raycast={noopRaycast}>
        <coneGeometry args={[0.55 * scale, foliageH, 7]} />
        <meshStandardMaterial color={foliageColor} flatShading />
      </mesh>
    </group>
  );
}

function DeadTree({ scale }: { scale: number }) {
  return (
    <group>
      <mesh position={[0, 0.7 * scale, 0]} rotation={[0.1, 0, 0.15]} castShadow raycast={noopRaycast}>
        <cylinderGeometry args={[0.08 * scale, 0.14 * scale, 1.4 * scale, 5]} />
        <meshStandardMaterial color="#3a3028" flatShading />
      </mesh>
      <mesh position={[0.25 * scale, 1.1 * scale, 0]} rotation={[0, 0, -0.8]} castShadow raycast={noopRaycast}>
        <cylinderGeometry args={[0.03 * scale, 0.05 * scale, 0.5 * scale, 4]} />
        <meshStandardMaterial color="#3a3028" flatShading />
      </mesh>
    </group>
  );
}

function Bush({ scale, variant }: { scale: number; variant: number }) {
  if (variant === 2) {
    return (
      <mesh position={[0, 0.18 * scale, 0]} castShadow raycast={noopRaycast}>
        <boxGeometry args={[1.4 * scale, 0.35 * scale, 0.5 * scale]} />
        <meshStandardMaterial color="#3a5a32" flatShading />
      </mesh>
    );
  }
  return (
    <mesh position={[0, 0.28 * scale, 0]} castShadow raycast={noopRaycast}>
      <sphereGeometry args={[0.35 * scale, 6, 6]} />
      <meshStandardMaterial color={variant === 0 ? "#3a6a34" : "#4a7a3a"} flatShading />
    </mesh>
  );
}

function Rock({ scale, variant }: { scale: number; variant: number }) {
  const color = variant === 0 ? "#6a6a62" : variant === 1 ? "#5a5a52" : "#7a7268";
  return (
    <mesh
      position={[0, 0.2 * scale, 0]}
      rotation={[0.2, variant * 0.8, 0.1]}
      castShadow
      raycast={noopRaycast}
    >
      <dodecahedronGeometry args={[0.35 * scale, 0]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

function FieldPatch({ scale, variant }: { scale: number; variant: number }) {
  const colors = ["#6a8a3a", "#7a9a42", "#5a7a32"];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow raycast={noopRaycast}>
        <planeGeometry args={[2.8 * scale, 1.6 * scale]} />
        <meshStandardMaterial color={colors[variant % 3]} flatShading side={THREE.DoubleSide} />
      </mesh>
      {variant !== 1 && (
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0.3 * scale, 0.03, 0.2 * scale]} raycast={noopRaycast}>
          <planeGeometry args={[2.2 * scale, 0.08 * scale]} />
          <meshStandardMaterial color="#8a7a4a" flatShading side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function HayBale({ scale }: { scale: number }) {
  return (
    <mesh position={[0, 0.35 * scale, 0]} rotation={[0, 0, Math.PI / 2]} castShadow raycast={noopRaycast}>
      <cylinderGeometry args={[0.35 * scale, 0.35 * scale, 0.7 * scale, 8]} />
      <meshStandardMaterial color="#b8a050" flatShading />
    </mesh>
  );
}

function Fence({ scale, variant }: { scale: number; variant: number }) {
  const posts = variant === 0 ? 3 : 4;
  return (
    <group>
      {Array.from({ length: posts }).map((_, i) => (
        <mesh
          key={i}
          position={[(i - (posts - 1) / 2) * 0.55 * scale, 0.35 * scale, 0]}
          castShadow
          raycast={noopRaycast}
        >
          <boxGeometry args={[0.08 * scale, 0.7 * scale, 0.08 * scale]} />
          <meshStandardMaterial color="#6a5030" flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.55 * scale, 0]} castShadow raycast={noopRaycast}>
        <boxGeometry args={[posts * 0.55 * scale, 0.06 * scale, 0.05 * scale]} />
        <meshStandardMaterial color="#5a4020" flatShading />
      </mesh>
    </group>
  );
}

function Barrel({ scale, variant }: { scale: number; variant: number }) {
  const color = variant === 0 ? "#5a4a38" : variant === 1 ? "#4a5a48" : "#6a3a2a";
  return (
    <mesh position={[0, 0.4 * scale, 0]} castShadow raycast={noopRaycast}>
      <cylinderGeometry args={[0.28 * scale, 0.3 * scale, 0.8 * scale, 8]} />
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

function Rubble({ scale, variant }: { scale: number; variant: number }) {
  const chunks = [
    [0, 0.12, 0, 0.5, 0.2, 0.4],
    [0.25 * scale, 0.08, 0.15 * scale, 0.35, 0.15, 0.3],
    [-0.2 * scale, 0.1, -0.1 * scale, 0.4, 0.18, 0.25],
  ];
  const colors = ["#5a5a58", "#6a6560", "#4a4a48"];
  return (
    <group>
      {chunks.slice(0, variant + 1).map((c, i) => (
        <mesh
          key={i}
          position={[c[0] as number, (c[1] as number) * scale, c[2] as number]}
          rotation={[0.1 * i, variant + i * 0.5, 0.05]}
          castShadow
          raycast={noopRaycast}
        >
          <boxGeometry args={[(c[3] as number) * scale, (c[4] as number) * scale, (c[5] as number) * scale]} />
          <meshStandardMaterial color={colors[i % 3]} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Sandbag({ scale }: { scale: number }) {
  return (
    <group>
      {[0, 1].map((row) =>
        [0, 1, 2].map((col) => (
          <mesh
            key={`${row}-${col}`}
            position={[(col - 1) * 0.42 * scale, (0.18 + row * 0.28) * scale, 0]}
            castShadow
            raycast={noopRaycast}
          >
            <boxGeometry args={[0.38 * scale, 0.22 * scale, 0.22 * scale]} />
            <meshStandardMaterial color="#8a7a5a" flatShading />
          </mesh>
        ))
      )}
    </group>
  );
}

function WirePost({ scale }: { scale: number }) {
  return (
    <group>
      <mesh position={[0, 0.55 * scale, 0]} castShadow raycast={noopRaycast}>
        <cylinderGeometry args={[0.05 * scale, 0.06 * scale, 1.1 * scale, 5]} />
        <meshStandardMaterial color="#4a4a48" flatShading />
      </mesh>
      <mesh position={[0, 0.85 * scale, 0]} rotation={[0, 0, Math.PI / 2]} raycast={noopRaycast}>
        <cylinderGeometry args={[0.008 * scale, 0.008 * scale, 1.6 * scale, 4]} />
        <meshStandardMaterial color="#3a3a38" flatShading />
      </mesh>
    </group>
  );
}

function LampPost({ scale }: { scale: number }) {
  return (
    <group>
      <mesh position={[0, 0.9 * scale, 0]} castShadow raycast={noopRaycast}>
        <cylinderGeometry args={[0.05 * scale, 0.07 * scale, 1.8 * scale, 6]} />
        <meshStandardMaterial color="#3a3a3a" flatShading />
      </mesh>
      <mesh position={[0, 1.85 * scale, 0]} castShadow raycast={noopRaycast}>
        <boxGeometry args={[0.25 * scale, 0.12 * scale, 0.12 * scale]} />
        <meshStandardMaterial color="#4a4a40" flatShading />
      </mesh>
    </group>
  );
}

function Pipe({ scale, variant }: { scale: number; variant: number }) {
  return (
    <group rotation={[0, variant * 0.6, 0]}>
      <mesh position={[0, 0.25 * scale, 0]} rotation={[0, 0, Math.PI / 2]} castShadow raycast={noopRaycast}>
        <cylinderGeometry args={[0.12 * scale, 0.12 * scale, 1.8 * scale, 8]} />
        <meshStandardMaterial color="#5a5a58" flatShading />
      </mesh>
      <mesh position={[0.7 * scale, 0.55 * scale, 0]} rotation={[0, 0, Math.PI / 4]} castShadow raycast={noopRaycast}>
        <cylinderGeometry args={[0.1 * scale, 0.1 * scale, 0.9 * scale, 8]} />
        <meshStandardMaterial color="#6a6a62" flatShading />
      </mesh>
    </group>
  );
}

function SceneryPropMesh({ prop }: { prop: SceneryProp }) {
  const { kind, scale, variant } = prop;
  let content;
  switch (kind) {
    case "tree":
      content = <Tree scale={scale} variant={variant} />;
      break;
    case "dead_tree":
      content = <DeadTree scale={scale} />;
      break;
    case "bush":
      content = <Bush scale={scale} variant={variant} />;
      break;
    case "rock":
      content = <Rock scale={scale} variant={variant} />;
      break;
    case "field":
      content = <FieldPatch scale={scale} variant={variant} />;
      break;
    case "hay_bale":
      content = <HayBale scale={scale} />;
      break;
    case "fence":
      content = <Fence scale={scale} variant={variant} />;
      break;
    case "barrel":
      content = <Barrel scale={scale} variant={variant} />;
      break;
    case "rubble":
      content = <Rubble scale={scale} variant={variant} />;
      break;
    case "sandbag":
      content = <Sandbag scale={scale} />;
      break;
    case "wire_post":
      content = <WirePost scale={scale} />;
      break;
    case "lamp_post":
      content = <LampPost scale={scale} />;
      break;
    case "pipe":
      content = <Pipe scale={scale} variant={variant} />;
      break;
  }

  return (
    <group position={prop.position} rotation={[0, prop.rotation, 0]}>
      {content}
    </group>
  );
}

export function AreaScenery({
  areaType,
  areaId,
  locationPositions,
}: {
  areaType: AreaType;
  areaId: string;
  locationPositions: [number, number][];
}) {
  const props = useMemo(() => {
    const avoid: [number, number][] = [[0, 0], ...locationPositions];
    return generateScenery(areaType, areaId, avoid);
  }, [areaType, areaId, locationPositions]);

  return (
    <group>
      {props.map((prop, i) => (
        <SceneryPropMesh key={`${prop.kind}-${i}`} prop={prop} />
      ))}
    </group>
  );
}
