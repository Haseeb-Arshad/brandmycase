"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { CASE } from "@/data/placements";
import {
  createShellNormalMap,
  createShellRoughnessMap,
} from "@/components/three/shellTexture";

/**
 * The case.
 *
 * Modelled on a matte black hardshell spinner: two clamshell halves with
 * diagonal ribbing moulded into the polycarbonate, a zip seam running the whole
 * way round, recessed grab handles, a two-tube telescoping handle, and four
 * dual-wheel spinner castors.
 *
 * Still built from primitives rather than a .glb. That keeps the repo
 * asset-free and — more importantly — means the panel map in placements.ts is
 * the literal geometry rather than a guess at where a texture atlas lands. The
 * realism comes from the surface treatment and the fittings rather than from
 * polygon count: the ribbing is a generated normal map (see shellTexture.ts),
 * which is what gives the shell a highlight to travel along as the case turns.
 */

const HALF_W = CASE.width / 2;
const HALF_H = CASE.height / 2;
const HALF_D = CASE.depth / 2;

/** Depth of each clamshell half. The two together make up CASE.depth. */
const SHELL_HALF_DEPTH = HALF_D;

/** Where the wheels touch down. The caller puts contact shadows here. */
export const GROUND_Y = -HALF_H - 0.178;

/** Telescoping handle geometry, shared between the tubes and the grip. */
const HANDLE_Z = -0.155;
const HANDLE_RISE = 0.22;
const HANDLE_X = 0.152;

const COLORS = {
  shell: "#16171a",
  plastic: "#0e0f11",
  rubber: "#0a0b0c",
  chrome: "#c8ccd2",
  seam: "#121316",
} as const;

/* ------------------------------------------------------------------------- */

function DualWheel({ x, z }: { x: number; z: number }) {
  const plateY = -HALF_H - 0.012;
  const housingY = -HALF_H - 0.05;
  const axleY = -HALF_H - 0.118;

  return (
    <group position={[x, 0, z]}>
      {/* Mounting plate, flush under the shell */}
      <RoundedBox
        args={[0.135, 0.026, 0.135]}
        radius={0.008}
        smoothness={3}
        position={[0, plateY, 0]}
      >
        <meshStandardMaterial color={COLORS.plastic} roughness={0.6} metalness={0.05} />
      </RoundedBox>

      {/* Swivel yoke */}
      <RoundedBox
        args={[0.098, 0.062, 0.112]}
        radius={0.022}
        smoothness={4}
        position={[0, housingY, 0]}
      >
        <meshStandardMaterial color={COLORS.plastic} roughness={0.55} metalness={0.08} />
      </RoundedBox>

      {/* Two discs on a shared axle — a dual spinner castor. */}
      {[-0.031, 0.031].map((dx) => (
        <mesh key={dx} position={[dx, axleY, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.026, 28]} />
          <meshStandardMaterial color={COLORS.rubber} roughness={0.85} metalness={0.02} />
        </mesh>
      ))}

      {/* Hub caps */}
      {[-0.046, 0.046].map((dx) => (
        <mesh key={dx} position={[dx, axleY, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.019, 0.019, 0.005, 18]} />
          <meshStandardMaterial color={COLORS.chrome} roughness={0.2} metalness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** Recessed grab handle sunk into a face. `rotation` orients it per face. */
function GrabHandle({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* The recess it sits in */}
      <RoundedBox args={[0.205, 0.02, 0.062]} radius={0.009} smoothness={3}>
        <meshStandardMaterial color="#000000" roughness={0.9} metalness={0} />
      </RoundedBox>
      {/* The bar itself, proud of the recess */}
      <RoundedBox
        args={[0.17, 0.028, 0.034]}
        radius={0.014}
        smoothness={4}
        position={[0, 0.012, 0]}
        castShadow
      >
        <meshStandardMaterial color={COLORS.plastic} roughness={0.45} metalness={0.1} />
      </RoundedBox>
    </group>
  );
}

function TelescopingHandle() {
  const tubeY = HALF_H + HANDLE_RISE / 2;
  const gripY = HALF_H + HANDLE_RISE + 0.022;

  return (
    <group>
      {/* Mount plate the tubes retract into */}
      <RoundedBox
        args={[0.4, 0.024, 0.078]}
        radius={0.01}
        smoothness={4}
        position={[0, HALF_H - 0.004, HANDLE_Z]}
      >
        <meshStandardMaterial color={COLORS.plastic} roughness={0.55} metalness={0.1} />
      </RoundedBox>

      {/* Two chrome tubes */}
      {[-HANDLE_X, HANDLE_X].map((x) => (
        <mesh key={x} position={[x, tubeY, HANDLE_Z]} castShadow>
          <cylinderGeometry args={[0.0145, 0.0145, HANDLE_RISE, 20]} />
          <meshStandardMaterial color={COLORS.chrome} roughness={0.16} metalness={1} />
        </mesh>
      ))}

      {/* Grip */}
      <RoundedBox
        args={[0.345, 0.05, 0.062]}
        radius={0.022}
        smoothness={5}
        position={[0, gripY, HANDLE_Z]}
        castShadow
      >
        <meshStandardMaterial color={COLORS.plastic} roughness={0.5} metalness={0.08} />
      </RoundedBox>

      {/* Release button set into the grip */}
      <RoundedBox
        args={[0.062, 0.01, 0.026]}
        radius={0.004}
        smoothness={3}
        position={[0, gripY + 0.026, HANDLE_Z]}
      >
        <meshStandardMaterial color={COLORS.chrome} roughness={0.28} metalness={0.9} />
      </RoundedBox>
    </group>
  );
}

/* ------------------------------------------------------------------------- */

export function CaseModel() {
  // Built once. Each is a 512 x 512 bitmap on the GPU, so both are disposed.
  const normalMap = useMemo(() => createShellNormalMap(), []);
  const roughnessMap = useMemo(() => createShellRoughnessMap(), []);

  useEffect(() => {
    // Repeat chosen so the ribs land around 2.5 cm apart on the front face,
    // scaled on V to hold them near 45 degrees across a 76 x 110 cm panel.
    for (const map of [normalMap, roughnessMap]) {
      map.repeat.set(4, 5.8);
      map.needsUpdate = true;
    }
    return () => {
      normalMap.dispose();
      roughnessMap.dispose();
    };
  }, [normalMap, roughnessMap]);

  const normalScale = useMemo(() => new THREE.Vector2(0.9, 0.9), []);

  /**
   * Both halves share this treatment. Rendered from a function rather than a
   * shared element so each RoundedBox gets its own material instance.
   */
  const shellMaterial = () => (
    <meshPhysicalMaterial
      color={COLORS.shell}
      normalMap={normalMap}
      normalScale={normalScale}
      roughnessMap={roughnessMap}
      roughness={1}
      metalness={0.04}
      clearcoat={0.3}
      clearcoatRoughness={0.6}
      sheen={0.2}
      sheenColor="#2b2f36"
    />
  );

  return (
    <group>
      {/* Front clamshell */}
      <RoundedBox
        args={[CASE.width, CASE.height, SHELL_HALF_DEPTH]}
        radius={0.058}
        smoothness={8}
        position={[0, 0, SHELL_HALF_DEPTH / 2]}
        castShadow
        receiveShadow
      >
        {shellMaterial()}
      </RoundedBox>

      {/* Back clamshell */}
      <RoundedBox
        args={[CASE.width, CASE.height, SHELL_HALF_DEPTH]}
        radius={0.058}
        smoothness={8}
        position={[0, 0, -SHELL_HALF_DEPTH / 2]}
        castShadow
        receiveShadow
      >
        {shellMaterial()}
      </RoundedBox>

      {/* Zip seam: fills the groove where the halves meet, so the case reads as
          a clamshell that opens rather than a solid block. */}
      <RoundedBox
        args={[CASE.width + 0.006, CASE.height + 0.006, 0.026]}
        radius={0.013}
        smoothness={5}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color={COLORS.seam} roughness={0.72} metalness={0.12} />
      </RoundedBox>

      {/* Zip pulls, parked on the right spine */}
      {[0.055, -0.005].map((y) => (
        <RoundedBox
          key={y}
          args={[0.02, 0.036, 0.008]}
          radius={0.003}
          smoothness={3}
          position={[HALF_W + 0.012, y, 0]}
        >
          <meshStandardMaterial color={COLORS.chrome} roughness={0.25} metalness={0.92} />
        </RoundedBox>
      ))}

      {/* Grab handles: one on the lid at the front edge, one low on the right
          spine — both placed to clear the panel map. */}
      <GrabHandle position={[0, HALF_H - 0.002, 0.168]} />
      <GrabHandle position={[HALF_W - 0.002, -0.5, 0]} rotation={[0, 0, Math.PI / 2]} />

      <TelescopingHandle />

      {[-0.27, 0.27].map((x) =>
        [-0.125, 0.125].map((z) => <DualWheel key={`${x}:${z}`} x={x} z={z} />),
      )}
    </group>
  );
}
