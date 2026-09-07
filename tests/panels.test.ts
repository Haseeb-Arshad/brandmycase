import { describe, it, expect } from "vitest";
import {
  PLACEMENTS,
  CASE,
  toWorld,
  placementsOnFace,
  ROTATABLE_FACES,
  type Placement,
} from "@/data/placements";
import { buildPlacementBoard, resolvePlacement } from "@/lib/placement-board";
import type { ConfirmedSponsorship } from "@/lib/funding";

/**
 * The panel map is offered, rendered and fabricated from one file, so these
 * tests guard the things that would be expensive to get wrong: a panel hanging
 * off the edge of the shell, two panels overlapping, or an id changing after it
 * has been quoted to a sponsor.
 *
 * They also guard a commercial promise: the campaign invents no sponsors, so
 * the board that reaches the browser must carry no company name that did not
 * come from a confirmed row with permission attached.
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

  it("states a print size for every placement", () => {
    for (const p of PLACEMENTS) {
      expect(p.sizeLabel).toMatch(/^\d+ x \d+ cm$/);
    }
  });

  it("ships with no placement held back and none claimed", () => {
    // A panel is only ever taken because a confirmed sponsorship says so. A
    // HELD panel checked into the repository would be a placement removed from
    // sale for no recorded reason.
    for (const p of PLACEMENTS) {
      expect(p.hold, `placement ${p.id} is held with no sponsorship behind it`).toBe(
        "OPEN",
      );
    }
  });

  it("names no company anywhere in the panel map", () => {
    // This file is compiled into the browser bundle. Sponsor identity belongs
    // to the database, only for confirmed rows, and only with permission.
    const json = JSON.stringify(PLACEMENTS);
    expect(json).not.toMatch(/sponsor|company|logo/i);
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

const confirmed = (over: Partial<ConfirmedSponsorship> = {}): ConfirmedSponsorship => ({
  id: "row-1",
  placementId: "02",
  tier: "ANCHOR",
  amountUsd: 1000,
  displayName: null,
  displayLogoUrl: null,
  companyUrl: null,
  displayPermission: false,
  confirmedAt: "2026-09-01T00:00:00Z",
  ...over,
});

describe("the placement board", () => {
  it("exposes every placement, in panel-map order, with a tier and a price", () => {
    const board = buildPlacementBoard([]);
    expect(board.placements.map((p) => p.id)).toEqual(PLACEMENTS.map((p) => p.id));
    expect(board.stats.total).toBe(20);
    expect(board.stats.faces).toBe(5);
    expect(board.stats.available).toBe(20);

    for (const placement of board.placements) {
      expect(placement.tier, `placement ${placement.id} has no tier`).toBeTruthy();
      expect(placement.priceUsd, `placement ${placement.id} has no price`).toBeGreaterThan(
        0,
      );
    }
  });

  it("marks a panel sponsored when — and only when — a confirmed row claims it", () => {
    const board = buildPlacementBoard([confirmed()]);
    const anchor = board.placements.find((p) => p.id === "02")!;

    expect(anchor.status).toBe("SPONSORED");
    expect(anchor.available).toBe(false);
    expect(board.stats.sponsored).toBe(1);
    expect(board.stats.available).toBe(19);

    // Every other panel is untouched by somebody else's sponsorship.
    for (const other of board.placements.filter((p) => p.id !== "02")) {
      expect(other.available, `panel ${other.id} was taken out with panel 02`).toBe(true);
    }
  });

  it("shows a sponsor's name only where they gave permission", () => {
    const withoutPermission = buildPlacementBoard([
      confirmed({ displayName: "Northbeam Labs", displayPermission: false }),
    ]).placements.find((p) => p.id === "02")!;

    expect(withoutPermission.sponsor).toBeNull();
    expect(withoutPermission.statusLabel).toBeTruthy();
    expect(JSON.stringify(withoutPermission)).not.toContain("Northbeam");

    const withPermission = buildPlacementBoard([
      confirmed({ displayName: "Northbeam Labs", displayPermission: true }),
    ]).placements.find((p) => p.id === "02")!;

    expect(withPermission.sponsor?.name).toBe("Northbeam Labs");
  });

  it("counts a tier-only sponsorship toward nothing on the board", () => {
    // Somebody can sponsor a tier without naming a panel. It funds the trip;
    // it does not silently take a placement off the market.
    const board = buildPlacementBoard([confirmed({ placementId: null })]);
    expect(board.stats.available).toBe(20);
    expect(board.stats.sponsored).toBe(0);
  });

  it("reports per-tier availability that matches the panels", () => {
    const board = buildPlacementBoard([confirmed()]);
    const anchor = board.tiers.find((t) => t.id === "ANCHOR")!;

    expect(anchor.total).toBe(1);
    expect(anchor.available).toBe(0);

    for (const tier of board.tiers) {
      const panels = board.placements.filter((p) => p.tier === tier.id);
      expect(tier.total, `tier ${tier.id} miscounts its panels`).toBe(panels.length);
      expect(tier.available, `tier ${tier.id} miscounts availability`).toBe(
        panels.filter((p) => p.available).length,
      );
    }
  });

  it("puts no private inquiry data on the wire", () => {
    // Serialising is the real test: it catches a field added upstream and
    // spread into PlacementState by accident, which a key-by-key check would
    // not. Nothing a company typed into the form may reach the browser.
    const json = JSON.stringify(
      buildPlacementBoard([
        confirmed({
          displayName: "Northbeam Labs",
          displayPermission: true,
          companyUrl: "https://northbeam.example",
        }),
      ]),
    );

    expect(json).not.toMatch(/contact_email|contactEmail|@|message|INTERESTED|INVOICED/i);
    expect(json).not.toMatch(/amountUsd|amount_usd/);
  });

  it("resolves a known placement and refuses an unknown one", () => {
    expect(resolvePlacement("01")?.name).toBe("The Crown");
    expect(resolvePlacement("99")).toBeNull();
    expect(resolvePlacement("")).toBeNull();
  });
});
