"use client";

import { Suspense, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { CaseScene } from "@/components/three/CaseScene";
import type { PanelState } from "@/lib/auction";

/**
 * The WebGL surface. Split from CaseStage so it can be dynamically imported
 * with ssr:false — three.js touches `window` at module scope and cannot be
 * evaluated on the server.
 */

interface CaseCanvasProps {
  panels: PanelState[];
  targetAngle: RefObject<number>;
  suppressClick: RefObject<boolean>;
  onSelect: (panel: PanelState) => void;
}

export default function CaseCanvas({
  panels,
  targetAngle,
  suppressClick,
  onSelect,
}: CaseCanvasProps) {
  return (
    <Canvas
      className="case-canvas"
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      camera={{ position: [0.08, 0.5, 2.8], fov: 32, near: 0.1, far: 40 }}
    >
      <Suspense fallback={null}>
        <CaseScene
          panels={panels}
          targetAngle={targetAngle}
          suppressClick={suppressClick}
          onSelect={onSelect}
        />
      </Suspense>
    </Canvas>
  );
}
