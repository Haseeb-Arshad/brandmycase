"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { CaseModel, GROUND_Y } from "@/components/three/CaseModel";
import { Panel } from "@/components/three/Panel";
import type { PanelState } from "@/lib/auction";

/**
 * Everything inside the <Canvas>.
 *
 * The whole case — shell and panels together — lives in one group that spins
 * about Y. `targetAngle` is an unbounded radian value owned by the parent:
 * turning right subtracts 90 degrees forever rather than wrapping to 0, so
 * going from the left spine back to the front continues in the same direction
 * instead of unwinding three-quarters of a turn backwards.
 */

interface CaseSceneProps {
  panels: PanelState[];
  targetAngle: RefObject<number>;
  suppressClick: RefObject<boolean>;
  onSelect: (panel: PanelState) => void;
}

export function CaseScene({ panels, targetAngle, suppressClick, onSelect }: CaseSceneProps) {
  const rig = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = rig.current;
    if (!g) return;

    // Frame-rate independent exponential damping.
    const k = 1 - Math.pow(0.0022, Math.min(delta, 0.1));
    g.rotation.y += (targetAngle.current - g.rotation.y) * k;

    // A breath of idle motion so the case never looks like a static render.
    const t = state.clock.elapsedTime;
    g.position.y = Math.sin(t * 0.6) * 0.008;
    g.rotation.z = Math.sin(t * 0.42) * 0.004;
  });

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight
        position={[3.2, 5, 4]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0008}
      />
      <directionalLight position={[-4, 2.4, -2.5]} intensity={0.55} />
      <directionalLight position={[0, 1.5, -5]} intensity={0.42} />

      {/* Built from Lightformers rather than an HDR file: no network fetch, so
          the scene works offline and behind a strict CSP. */}
      <Environment resolution={128}>
        <Lightformer intensity={2.4} position={[0, 3, 2]} scale={[6, 3, 1]} color="#ffffff" />
        <Lightformer
          intensity={1.1}
          position={[-3, 1, 1]}
          scale={[3, 4, 1]}
          color="#e8eae3"
        />
        <Lightformer intensity={0.9} position={[3, 0.5, -2]} scale={[3, 4, 1]} color="#cfd4c9" />
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
        opacity={0.42}
        scale={3.4}
        blur={2.6}
        far={1.4}
        resolution={512}
        color="#3a3d42"
      />
    </>
  );
}
