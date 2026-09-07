"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { CaseModel, GROUND_Y } from "@/components/three/CaseModel";
import { Panel } from "@/components/three/Panel";
import type { PlacementState } from "@/lib/placement-board";

/**
 * Everything inside the <Canvas>.
 *
 * The whole case — shell and panels together — lives in one group that spins
 * about Y. `targetAngle` is an unbounded radian value owned by the parent:
 * turning right subtracts 90 degrees forever rather than wrapping to 0, so
 * going from the left spine back to the front continues in the same direction
 * instead of unwinding three-quarters of a turn backwards.
 *
 * LIGHTING NOTE
 * The shell is near-black matte. A black object lit only from the front reads
 * as a silhouette, so most of the work here is done by the two rim lights
 * behind it: they draw the edge that separates the case from a white page, and
 * they are what makes the moulded ribbing legible as it turns.
 */

interface CaseSceneProps {
  panels: PlacementState[];
  targetAngle: RefObject<number>;
  suppressClick: RefObject<boolean>;
  onSelect: (panel: PlacementState) => void;
}

/** A small static pitch, so the lid is visible and the case is not dead-on. */
const BASE_PITCH = 0.045;

export function CaseScene({ panels, targetAngle, suppressClick, onSelect }: CaseSceneProps) {
  const rig = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = rig.current;
    if (!g) return;

    // Frame-rate independent exponential damping. delta is clamped so a
    // backgrounded tab returning after several seconds does not snap the case
    // round violently.
    const k = 1 - Math.pow(0.0022, Math.min(delta, 0.1));
    g.rotation.y += (targetAngle.current - g.rotation.y) * k;

    // A breath of idle motion so the case never looks like a static render.
    const t = state.clock.elapsedTime;
    g.position.y = Math.sin(t * 0.6) * 0.008;
    g.rotation.x = BASE_PITCH + Math.sin(t * 0.42) * 0.004;
  });

  return (
    <>
      <ambientLight intensity={0.5} />

      {/* Key */}
      <directionalLight
        position={[3.4, 5, 4.2]}
        intensity={2.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0006}
      />

      {/* Fill, from the opposite side and lower */}
      <directionalLight position={[-4.2, 1.8, 2.6]} intensity={0.75} />

      {/* Rim lights. These draw the edge of a black shell against white. */}
      <directionalLight position={[-2.6, 2.6, -4.4]} intensity={1.9} color="#eef2ff" />
      <directionalLight position={[3.2, 1.4, -4.0]} intensity={1.35} color="#ffffff" />

      {/* Overhead strip, to catch the top of every moulded rib */}
      <directionalLight position={[0, 6, 0.6]} intensity={0.8} />

      {/* Built from Lightformers rather than an HDR file: no network fetch, so
          the scene works offline and behind a strict CSP. These are also what
          the chrome tubes and hub caps actually reflect. */}
      <Environment resolution={256}>
        <Lightformer intensity={3.2} position={[0, 3.5, 2]} scale={[7, 3, 1]} color="#ffffff" />
        <Lightformer intensity={1.6} position={[-3.5, 1, 1.5]} scale={[3, 5, 1]} color="#eceef2" />
        <Lightformer intensity={1.4} position={[3.5, 0.6, -1.5]} scale={[3, 5, 1]} color="#dfe3ea" />
        <Lightformer
          intensity={2.2}
          position={[0, 1, -4]}
          scale={[6, 4, 1]}
          color="#ffffff"
        />
      </Environment>

      <group ref={rig}>
        <CaseModel />
        {panels.map((panel) => (
          <Panel
            key={panel.id}
            panel={panel}
            onSelect={onSelect}
            suppressClick={suppressClick}
          />
        ))}
      </group>

      <ContactShadows
        position={[0, GROUND_Y, 0]}
        opacity={0.5}
        scale={3.2}
        blur={2.4}
        far={1.2}
        resolution={512}
        color="#0d0e10"
      />
    </>
  );
}
