"use client";

import { RoundedBox } from "@react-three/drei";
import { CASE } from "@/data/placements";

/**
 * CODEC ONE — the case itself, built from primitives.
 *
 * Deliberately no .glb: a procedural model keeps the repo asset-free, means the
 * panel map in placements.ts is the literal geometry rather than a guess at
 * where a texture atlas lands, and lets the shell dimensions change in one
 * constant without re-exporting anything from a DCC tool.
 *
 * Parts, bottom to top: four spinner wheels in their housings, the moulded
 * shell, an aluminium split frame around the seam, eight corner bumpers, a TSA
 * lock on the lid, and a telescoping handle at the back of the lid.
 */

const HALF_W = CASE.width / 2;
const HALF_H = CASE.height / 2;
const HALF_D = CASE.depth / 2;

/** Where the wheels touch down. Used by the caller to place contact shadows. */
export const GROUND_Y = -HALF_H - 0.13;

const SHELL_COLOR = "#474c53";
const ALUMINIUM = "#b6babf";
const RUBBER = "#1d1f23";

function Wheel({ x, z }: { x: number; z: number }) {
  const housingY = -HALF_H - 0.025;
  const wheelY = -HALF_H - 0.085;
  return (
    <group>
      <RoundedBox
        args={[0.1, 0.06, 0.11]}
        radius={0.014}
        smoothness={3}
        position={[x, housingY, z]}
      >
        <meshStandardMaterial color={RUBBER} roughness={0.75} metalness={0.1} />
      </RoundedBox>
      {/* Axis along X so the wheel reads as a spinner castor from the front. */}
      <mesh position={[x, wheelY, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.034, 24]} />
        <meshStandardMaterial color="#17181b" roughness={0.55} metalness={0.15} />
      </mesh>
      {/* Hub cap */}
      <mesh position={[x + 0.018, wheelY, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.004, 16]} />
        <meshStandardMaterial color={ALUMINIUM} roughness={0.3} metalness={0.85} />
      </mesh>
    </group>
  );
}

function CornerBumper({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <RoundedBox args={[0.13, 0.13, 0.13]} radius={0.045} smoothness={4} position={[x, y, z]}>
      <meshStandardMaterial color={RUBBER} roughness={0.82} metalness={0.05} />
    </RoundedBox>
  );
}

function TelescopingHandle() {
  // Sits at the back of the lid, clear of the top-face panels (see placements.ts).
  const z = -0.155;
  const postH = 0.2;
  const postY = HALF_H + postH / 2 - 0.01;
  const barY = HALF_H + postH;

  return (
    <group>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, postY, z]} castShadow>
          <cylinderGeometry args={[0.013, 0.013, postH, 16]} />
          <meshStandardMaterial color={ALUMINIUM} roughness={0.26} metalness={0.9} />
        </mesh>
      ))}
      <RoundedBox
        args={[0.34, 0.032, 0.042]}
        radius={0.015}
        smoothness={4}
        position={[0, barY, z]}
        castShadow
      >
        <meshStandardMaterial color="#232529" roughness={0.6} metalness={0.2} />
      </RoundedBox>
      {/* Release button */}
      <mesh position={[0, barY + 0.018, z]}>
        <boxGeometry args={[0.05, 0.006, 0.022]} />
        <meshStandardMaterial color={ALUMINIUM} roughness={0.3} metalness={0.85} />
      </mesh>
    </group>
  );
}

export function CaseModel() {
  const bumperX = HALF_W - 0.03;
  const bumperY = HALF_H - 0.03;
  const bumperZ = HALF_D - 0.03;

  return (
    <group>
      {/* Moulded shell */}
      <RoundedBox
        args={[CASE.width, CASE.height, CASE.depth]}
        radius={CASE.radius}
        smoothness={6}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={SHELL_COLOR}
          roughness={0.42}
          metalness={0.12}
          clearcoat={0.55}
          clearcoatRoughness={0.35}
        />
      </RoundedBox>

      {/* Aluminium split frame: slightly proud in X and Y, thin in Z, so it
          reads as a rim band on the spines, lid and base but stays buried
          inside the front and back shells. */}
      <RoundedBox
        args={[CASE.width + 0.012, CASE.height + 0.012, 0.022]}
        radius={0.01}
        smoothness={4}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color={ALUMINIUM} roughness={0.28} metalness={0.88} />
      </RoundedBox>

      {/* Corner bumpers */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) =>
          [-1, 1].map((sz) => (
            <CornerBumper
              key={`${sx}${sy}${sz}`}
              x={sx * bumperX}
              y={sy * bumperY}
              z={sz * bumperZ}
            />
          )),
        ),
      )}

      {/* TSA lock, front edge of the lid */}
      <RoundedBox
        args={[0.07, 0.02, 0.035]}
        radius={0.007}
        smoothness={3}
        position={[0, HALF_H + 0.004, 0.165]}
      >
        <meshStandardMaterial color={ALUMINIUM} roughness={0.3} metalness={0.85} />
      </RoundedBox>

      <TelescopingHandle />

      {[-0.26, 0.26].map((x) =>
        [-0.13, 0.13].map((z) => <Wheel key={`${x}${z}`} x={x} z={z} />),
      )}
    </group>
  );
}
