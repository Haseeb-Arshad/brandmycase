import { describe, it, expect } from "vitest";
import {
  PLACEMENTS,
  CASE,
  toWorld,
  placementsOnFace,
  ROTATABLE_FACES,
  RESERVE_FLOOR_USD,
  type Placement,
} from "@/data/placements";

/**
 * The panel map is sold, rendered, and fabricated from one file, so these tests
 * guard the things that would be expensive to get wrong: a panel hanging off
 * the edge of the shell, two panels overlapping, or an id changing after it has
 * been quoted to a sponsor.
 */

/** Half-extents of a face, in the face's own (u, v) coordinates. */
function faceExtent(p: Placement): { u: number; v: number } {
  switch (p.face) {
    case "front":
    case "back":
      return { u: CASE.width / 2, v: CASE.height / 2 };
    case "left":
    case "right":
      return { u: CASE.depth / 2, v: CASE.height / 2 };
    case "top":
      return { u: CASE.width / 2, v: CASE.depth / 2 };
  }
}

/** Do two panels on the same face overlap? */
function overlaps(a: Placement, b: Placement): boolean {
  const dx = Math.abs(a.u - b.u);
  const dy = Math.abs(a.v - b.v);
  return dx < (a.w + b.w) / 2 && dy < (a.h + b.h) / 2;
}

describe("panel map", () => {
  it("has 20 panels with unique ids and codes", () => {
    expect(PLACEMENTS).toHaveLength(20);
    expect(new Set(PLACEMENTS.map((p) => p.id)).size).toBe(20);
    expect(new Set(PLACEMENTS.map((p) => p.code)).size).toBe(20);
  });

  it("keeps ids two-digit and sequential, since they are printed on the shell", () => {
    PLACEMENTS.forEach((p, i) => {
      expect(p.id).toBe(String(i + 1).padStart(2, "0"));
    });
  });

  it("keeps every panel inside the bounds of its face", () => {
    for (const p of PLACEMENTS) {
      const extent = faceExtent(p);
      expect(
        Math.abs(p.u) + p.w / 2,
        `panel ${p.id} (${p.code}) overhangs its face horizontally`,
      ).toBeLessThanOrEqual(extent.u);
      expect(
        Math.abs(p.v) + p.h / 2,
        `panel ${p.id} (${p.code}) overhangs its face vertically`,
      ).toBeLessThanOrEqual(extent.v);
    }
  });

  it("never overlaps two panels on the same face", () => {
    for (const face of [...ROTATABLE_FACES, "top" as const]) {
      const onFace = placementsOnFace(face);
      for (let i = 0; i < onFace.length; i++) {
        for (let j = i + 1; j < onFace.length; j++) {
          expect(
            overlaps(onFace[i], onFace[j]),
            `panels ${onFace[i].id} and ${onFace[j].id} overlap on ${face}`,
          ).toBe(false);
        }
      }
    }
  });

  it("prices every panel above zero and states a print size", () => {
    for (const p of PLACEMENTS) {
      expect(p.openingBidUsd).toBeGreaterThan(0);
      expect(Number.isInteger(p.openingBidUsd)).toBe(true);
      expect(p.sizeLabel).toMatch(/^\d+ x \d+ cm$/);
    }
  });

  it("sums opening bids into the published reserve floor", () => {
    const sum = PLACEMENTS.reduce((t, p) => t + p.openingBidUsd, 0);
    expect(RESERVE_FLOOR_USD).toBe(sum);
    expect(sum).toBe(327_000);
  });
});

describe("toWorld", () => {
  it("puts each panel just proud of its own face", () => {
    const x = CASE.width / 2 + CASE.panelLift;
    const y = CASE.height / 2 + CASE.panelLift;
    const z = CASE.depth / 2 + CASE.panelLift;

    // Compared component-wise: mirroring u produces -0 for a centred panel,
    // which toEqual treats as distinct from 0 even though three.js does not.
    const at = (face: Placement["face"], want: [number, number, number]) => {
      const got = toWorld({ face, u: 0, v: 0 }).position;
      got.forEach((value, i) => expect(value, `${face}[${i}]`).toBeCloseTo(want[i], 10));
    };

    at("front", [0, 0, z]);
    at("back", [0, 0, -z]);
    at("right", [x, 0, 0]);
    at("left", [-x, 0, 0]);
    at("top", [0, y, 0]);
  });

  it("mirrors u on the back so left stays left as you walk around", () => {
    expect(toWorld({ face: "back", u: 0.2, v: 0 }).position[0]).toBe(-0.2);
  });

  it("rotates each face onto its own plane", () => {
    const half = Math.PI / 2;
    expect(toWorld({ face: "front", u: 0, v: 0 }).rotation).toEqual([0, 0, 0]);
    expect(toWorld({ face: "right", u: 0, v: 0 }).rotation).toEqual([0, half, 0]);
    expect(toWorld({ face: "left", u: 0, v: 0 }).rotation).toEqual([0, -half, 0]);
    expect(toWorld({ face: "top", u: 0, v: 0 }).rotation).toEqual([-half, 0, 0]);
  });

  it("keeps v mapped to world Y on every vertical face", () => {
    for (const face of ROTATABLE_FACES) {
      expect(toWorld({ face, u: 0, v: 0.3 }).position[1]).toBe(0.3);
    }
  });
});
