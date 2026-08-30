"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld, CASE } from "@/data/placements";
import type { PanelState } from "@/lib/auction";
import { createPanelTexture } from "@/components/three/panelTexture";

/**
 * One brandable panel on the case.
 *
 * The panel is a plane sitting `CASE.panelLift` proud of its face. On hover it
 * lifts a further 12mm along its own normal and swaps to the highlighted chip
 * texture — the 3D equivalent of the reference site's scale-on-hover slot.
 */

interface PanelProps {
  panel: PanelState;
  onSelect: (panel: PanelState) => void;
  /** Set while the user is dragging the case, so a drag never fires a click. */
  suppressClick: React.RefObject<boolean>;
}

const LIFT_ON_HOVER = 0.012;

export function Panel({ panel, onSelect, suppressClick }: PanelProps) {
  const [hovered, setHovered] = useState(false);
  const group = useRef<THREE.Group>(null);

  const { position, rotation } = useMemo(() => toWorld(panel), [panel]);

  const chip = useMemo(
    () => ({
      slotId: panel.id,
      sponsor: panel.sponsor,
      amountUsd: panel.currentBidUsd ?? panel.openingBidUsd,
      taken: panel.taken,
      w: panel.w,
      h: panel.h,
    }),
    [panel],
  );

  const base = useMemo(() => createPanelTexture(chip, false), [chip]);
  const lit = useMemo(() => createPanelTexture(chip, true), [chip]);

  // Canvas textures hold a full bitmap each; without this a board refresh after
  // every bid would leak 40 of them on the GPU.
  useEffect(() => {
    return () => {
      base.dispose();
      lit.dispose();
    };
  }, [base, lit]);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  // Outward normal in local space is +Z for a plane, and the group already
  // carries the face rotation, so lifting on local Z lifts off the face.
  const targetLift = hovered ? LIFT_ON_HOVER : 0;
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.pow(0.001, delta);
    g.children[0].position.z += (targetLift - g.children[0].position.z) * k;
  });

  const texture = hovered ? lit : base;

  return (
    <group ref={group} position={position} rotation={rotation}>
      <mesh
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (suppressClick.current) return;
          onSelect(panel);
        }}
      >
        <planeGeometry args={[panel.w, panel.h]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.58}
          metalness={0}
          emissive={new THREE.Color(hovered ? "#ffffff" : "#000000")}
          emissiveIntensity={hovered ? 0.12 : 0}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
    </group>
  );
}

/** Sanity export so the lift never exceeds the gap to the next panel. */
export const MAX_PANEL_LIFT = CASE.panelLift + LIFT_ON_HOVER;
