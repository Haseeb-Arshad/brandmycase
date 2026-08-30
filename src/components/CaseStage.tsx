"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ROTATABLE_FACES, FACE_LABELS, type Face } from "@/data/placements";
import { useAuction } from "@/components/AuctionProvider";

/**
 * The interactive stage: the case in its product card, plus the segmented face
 * switcher underneath.
 *
 * ANGLE MODEL
 * -----------
 * `targetAngle` is an unbounded radian value in a ref, not React state. The
 * scene reads it every frame, so spinning the case never re-renders the tree —
 * only the face *label* is state, and that changes four times per turn rather
 * than sixty times a second.
 *
 * Turning right subtracts a quarter turn forever. Coming back to the front from
 * the left spine therefore continues in the same direction rather than
 * unwinding backwards through three faces.
 */

const CaseCanvas = dynamic(() => import("@/components/three/CaseCanvas"), {
  ssr: false,
  loading: () => <div className="case-loading">Loading the case…</div>,
});

const QUARTER = Math.PI / 2;
/** Screen pixels to radians while dragging. A full turn is roughly 260px. */
const DRAG_SENSITIVITY = 0.006;
/** Movement under this many pixels counts as a click, not a drag. */
const DRAG_THRESHOLD = 5;

function faceFromAngle(angle: number): Face {
  const index = ((Math.round(-angle / QUARTER) % 4) + 4) % 4;
  return ROTATABLE_FACES[index];
}

export function CaseStage() {
  const { panels, selectPanel } = useAuction();

  const targetAngle = useRef(0);
  const suppressClick = useRef(false);
  const [face, setFace] = useState<Face>("front");

  const dragStartX = useRef(0);
  const dragStartAngle = useRef(0);
  const dragging = useRef(false);
  const dragDistance = useRef(0);

  /** dir = 1 turns right (reveals the next face clockwise), -1 turns left. */
  const turn = useCallback((dir: 1 | -1) => {
    targetAngle.current -= dir * QUARTER;
    setFace(faceFromAngle(targetAngle.current));
  }, []);

  /** Jump straight to a named face, taking the shortest way round. */
  const goToFace = useCallback((next: Face) => {
    const from = ((Math.round(-targetAngle.current / QUARTER) % 4) + 4) % 4;
    const to = ROTATABLE_FACES.indexOf(next);
    let delta = to - from;
    if (delta > 2) delta -= 4;
    if (delta < -2) delta += 4;
    targetAngle.current -= delta * QUARTER;
    setFace(next);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Ignore secondary buttons so a right-click never grabs the case.
    if (e.button !== 0) return;
    dragging.current = true;
    dragDistance.current = 0;
    dragStartX.current = e.clientX;
    dragStartAngle.current = targetAngle.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStartX.current;
    dragDistance.current = Math.max(dragDistance.current, Math.abs(dx));
    // Dragging right swings the front face rightwards, revealing the left spine.
    targetAngle.current = dragStartAngle.current + dx * DRAG_SENSITIVITY;
    if (dragDistance.current > DRAG_THRESHOLD) suppressClick.current = true;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (dragDistance.current > DRAG_THRESHOLD) {
      // Settle on the nearest face rather than leaving the case at an angle.
      targetAngle.current = Math.round(targetAngle.current / QUARTER) * QUARTER;
      setFace(faceFromAngle(targetAngle.current));
      // Let the click that ends this drag pass by before re-arming panels.
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    } else {
      suppressClick.current = false;
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") turn(1);
      else if (e.key === "ArrowLeft") turn(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  const onThisFace = panels.filter((p) => p.face === face);
  const openHere = onThisFace.filter((p) => !p.taken).length;

  return (
    <>
      <div className="case-card">
        <div
          className="case-stage"
          id="case"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <CaseCanvas
            panels={panels}
            targetAngle={targetAngle}
            suppressClick={suppressClick}
            onSelect={selectPanel}
          />
          <p className="stage-badge">CODEC ONE · 20 panels</p>
        </div>
      </div>

      <div className="face-switch">
        <button className="face-arrow" onClick={() => turn(-1)} aria-label="Previous face">
          ‹
        </button>

        <div className="segmented" role="group" aria-label="Choose a face">
          {ROTATABLE_FACES.map((f) => (
            <button
              key={f}
              aria-pressed={f === face}
              onClick={() => goToFace(f)}
            >
              {FACE_LABELS[f]}
            </button>
          ))}
        </div>

        <button className="face-arrow" onClick={() => turn(1)} aria-label="Next face">
          ›
        </button>
      </div>

      <p className="stage-hint" aria-live="polite">
        Drag to spin · tap any panel to place a bid ·{" "}
        <b>
          {onThisFace.length} panels here, {openHere} open
        </b>
      </p>
    </>
  );
}
