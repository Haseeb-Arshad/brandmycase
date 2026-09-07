/**
 * Brand the Case - physical panel map.
 *
 * This file is the single source of truth for the case's brandable surface.
 * The 3D scene, the placement inventory and the print spec all read from here,
 * so a placement can never drift between what is rendered, what is offered,
 * and what is fabricated.
 *
 * COORDINATE SYSTEM
 * -----------------
 * The shell is CASE.width x CASE.height x CASE.depth, centred on the origin.
 * Each panel is placed in the 2D coordinate space *of its own face*:
 *
 *   u  horizontal offset from the face centre, in metres
 *   v  vertical   offset from the face centre, in metres
 *   w  panel width
 *   h  panel height
 *
 * For `front` / `back`, u runs along X and v along Y.
 * For `left`  / `right`, u runs along Z and v along Y.
 * For `top`,             u runs along X and v along Z.
 *
 * `toWorld()` below is the only place that mapping is encoded.
 *
 * AVAILABILITY
 * ------------
 * A panel is unavailable for one of two reasons, and they live in two places
 * on purpose:
 *
 *   HELD       an editorial decision, set by hand in `hold` below.
 *   SPONSORED  a CONFIRMED row in Supabase. Never set here, because a panel
 *              must not be able to look sold without a real sponsorship
 *              behind it.
 *
 * `src/lib/placement-board.ts` merges the two into the shape the UI consumes.
 *
 * NO SPONSOR NAME LIVES IN THIS FILE
 * ----------------------------------
 * Client components import this module for geometry and face labels, so
 * everything in it is compiled into the browser bundle. Sponsor identity comes
 * from the database, only for confirmed sponsorships, and only where display
 * permission has been granted. Nothing here may name a company.
 */

export const CASE = {
  /** Shell dimensions in metres - a 76 x 110 x 40 cm check-in trunk. */
  width: 0.76,
  height: 1.1,
  depth: 0.4,
  /** Corner radius of the moulded shell. */
  radius: 0.055,
  /** Panels float this far proud of the shell so they never z-fight. */
  panelLift: 0.004,
} as const;

export type Face = "front" | "right" | "back" | "left" | "top";

/** The four faces you can rotate between, in clockwise order. */
export const ROTATABLE_FACES: Face[] = ["front", "right", "back", "left"];

export const FACE_LABELS: Record<Face, string> = {
  front: "Front shell",
  right: "Right spine",
  back: "Back shell",
  left: "Left spine",
  top: "Lid",
};

/**
 * Manual availability override, maintained by hand in this file.
 *
 * OPEN  the placement can be requested
 * HELD  taken off the market deliberately — a conversation is far enough along
 *       that offering it to somebody else would be dishonest
 *
 * A third state, SPONSORED, is NOT here: it is derived at request time from
 * confirmed sponsorships in Supabase (see `src/lib/placement-board.ts`). A
 * panel is only ever shown as taken because a real, confirmed row says so.
 */
export type PlacementHold = "OPEN" | "HELD";

/**
 * Which panels belong to which sponsorship tier, and what each tier costs,
 * lives in `src/data/sponsorship.ts`. This file stays what it has always
 * been: the physical map of the object.
 */
export interface Placement {
  /** Two-digit id, stable forever - it is silkscreened on the real panel. */
  id: string;
  /** Short machine code used in fabrication files. */
  code: string;
  name: string;
  face: Face;
  /** One-line pitch shown in the placement inventory. */
  description: string;
  hold: PlacementHold;
  u: number;
  v: number;
  w: number;
  h: number;
  /** Human-readable print size, derived from w/h at 1 unit = 1 metre. */
  sizeLabel: string;
}

const cm = (metres: number) => Math.round(metres * 100);
const size = (w: number, h: number) => cm(w) + " x " + cm(h) + " cm";

/**
 * 20 placements across five faces. Prominence ladders by visibility: the front
 * crown and medallion carry the case in every photograph, the spines are seen
 * in every airport queue, the lid is what an overhead shot sees.
 */
export const PLACEMENTS: Placement[] = [
  // ---- FRONT: the face that carries every photograph ----------------------
  {
    id: "01", code: "FR-CROWN", name: "The Crown", face: "front",
    description: "Full-width crown band above the medallion - first thing in every frame.",
    hold: "OPEN",
    u: 0, v: 0.4, w: 0.62, h: 0.13, sizeLabel: size(0.62, 0.13),
  },
  {
    id: "02", code: "FR-MED", name: "The Medallion", face: "front",
    description: "The large centre plate. The single most photographed surface on the case.",
    hold: "OPEN",
    u: 0, v: 0.13, w: 0.34, h: 0.34, sizeLabel: size(0.34, 0.34),
  },
  {
    id: "03", code: "FR-PORT", name: "Port Tile", face: "front",
    description: "Upper-left tile, flanking the medallion.",
    hold: "OPEN",
    u: -0.25, v: 0.13, w: 0.14, h: 0.2, sizeLabel: size(0.14, 0.2),
  },
  {
    id: "04", code: "FR-STBD", name: "Starboard Tile", face: "front",
    description: "Upper-right tile, flanking the medallion.",
    hold: "OPEN",
    u: 0.25, v: 0.13, w: 0.14, h: 0.2, sizeLabel: size(0.14, 0.2),
  },
  {
    id: "05", code: "FR-BAND", name: "Lower Band", face: "front",
    description: "Full-width band beneath the medallion - reads at distance.",
    hold: "OPEN",
    u: 0, v: -0.16, w: 0.62, h: 0.15, sizeLabel: size(0.62, 0.15),
  },
  {
    id: "06", code: "FR-RAIL", name: "Base Rail", face: "front",
    description: "Ground-level rail above the wheels.",
    hold: "OPEN",
    u: 0, v: -0.4, w: 0.5, h: 0.12, sizeLabel: size(0.5, 0.12),
  },

  // ---- RIGHT SPINE: seen by everyone standing in the queue behind you -----
  {
    id: "07", code: "RT-FLANK", name: "Right Handle Flank", face: "right",
    description: "Beside the telescoping handle, at eye level when the case is upright.",
    hold: "OPEN",
    u: 0, v: 0.46, w: 0.22, h: 0.1, sizeLabel: size(0.22, 0.1),
  },
  {
    id: "08", code: "RT-UPPER", name: "Right Spine Upper", face: "right",
    description: "Upper spine column - a tall vertical lockup.",
    hold: "OPEN",
    u: 0, v: 0.29, w: 0.26, h: 0.2, sizeLabel: size(0.26, 0.2),
  },
  {
    id: "09", code: "RT-LOWER", name: "Right Spine Lower", face: "right",
    description: "Lower spine column, directly below the upper.",
    hold: "OPEN",
    u: 0, v: -0.06, w: 0.26, h: 0.3, sizeLabel: size(0.26, 0.3),
  },
  {
    id: "10", code: "RT-WELL", name: "Right Wheel Well", face: "right",
    description: "Above the right spinner wheels - the belt-level mark.",
    hold: "OPEN",
    u: 0, v: -0.38, w: 0.22, h: 0.14, sizeLabel: size(0.22, 0.14),
  },

  // ---- BACK: what the room sees when you walk away ------------------------
  {
    id: "11", code: "BK-CROWN", name: "Back Crown", face: "back",
    description: "Full-width crown on the reverse shell.",
    hold: "OPEN",
    u: 0, v: 0.4, w: 0.62, h: 0.13, sizeLabel: size(0.62, 0.13),
  },
  {
    id: "12", code: "BK-FIELD", name: "Back Field", face: "back",
    description: "The large open field on the reverse - room for a full lockup.",
    hold: "OPEN",
    u: 0, v: 0.1, w: 0.52, h: 0.36, sizeLabel: size(0.52, 0.36),
  },
  {
    id: "13", code: "BK-BAND", name: "Back Band", face: "back",
    description: "Wide band under the field, above the strap line.",
    hold: "OPEN",
    u: 0, v: -0.2, w: 0.52, h: 0.16, sizeLabel: size(0.52, 0.16),
  },
  {
    id: "14", code: "BK-BASE", name: "Back Base", face: "back",
    description: "Reverse ground rail.",
    hold: "OPEN",
    u: 0, v: -0.42, w: 0.44, h: 0.12, sizeLabel: size(0.44, 0.12),
  },

  // ---- LEFT SPINE ---------------------------------------------------------
  {
    id: "15", code: "LT-FLANK", name: "Left Handle Flank", face: "left",
    description: "Beside the telescoping handle on the left spine.",
    hold: "OPEN",
    u: 0, v: 0.46, w: 0.22, h: 0.1, sizeLabel: size(0.22, 0.1),
  },
  {
    id: "16", code: "LT-UPPER", name: "Left Spine Upper", face: "left",
    description: "Upper left spine column.",
    hold: "OPEN",
    u: 0, v: 0.29, w: 0.26, h: 0.2, sizeLabel: size(0.26, 0.2),
  },
  {
    id: "17", code: "LT-LOWER", name: "Left Spine Lower", face: "left",
    description: "Lower left spine column.",
    hold: "OPEN",
    u: 0, v: -0.06, w: 0.26, h: 0.3, sizeLabel: size(0.26, 0.3),
  },
  {
    id: "18", code: "LT-WELL", name: "Left Wheel Well", face: "left",
    description: "Above the left spinner wheels.",
    hold: "OPEN",
    u: 0, v: -0.38, w: 0.22, h: 0.14, sizeLabel: size(0.22, 0.14),
  },

  // ---- LID: the overhead shot, the overhead bin, the baggage belt ---------
  {
    id: "19", code: "TP-CROWN", name: "Lid Crown", face: "top",
    description: "The top plate. Every overhead photo, every bin, every belt.",
    hold: "OPEN",
    u: 0, v: 0.06, w: 0.46, h: 0.15, sizeLabel: size(0.46, 0.15),
  },
  {
    // Sits between the crown and the telescoping handle mount at z = -0.155.
    id: "20", code: "TP-RAIL", name: "Lid Rail", face: "top",
    description: "Rear lid rail, between the crown and the handle mount.",
    hold: "OPEN",
    u: 0, v: -0.075, w: 0.36, h: 0.07, sizeLabel: size(0.36, 0.07),
  },
];

export const PLACEMENTS_BY_ID = new Map(PLACEMENTS.map((p) => [p.id, p]));

export function getPlacement(id: string): Placement | undefined {
  return PLACEMENTS_BY_ID.get(id);
}

export function placementsOnFace(face: Face): Placement[] {
  return PLACEMENTS.filter((p) => p.face === face);
}

/** Has this placement been taken off the market by hand? */
export function isHeld(placement: Placement): boolean {
  return placement.hold === "HELD";
}

export interface WorldPanel {
  /** Centre of the panel in world space. */
  position: [number, number, number];
  /** Euler rotation that lays the panel flat on its face. */
  rotation: [number, number, number];
}

const HALF_PI = Math.PI / 2;

/**
 * Map a face-local placement to world position + rotation.
 * A plane's default normal is +Z, so each face is a rotation away from `front`.
 */
export function toWorld(p: Pick<Placement, "face" | "u" | "v">): WorldPanel {
  const x = CASE.width / 2;
  const y = CASE.height / 2;
  const z = CASE.depth / 2;
  const lift = CASE.panelLift;

  switch (p.face) {
    case "front":
      return { position: [p.u, p.v, z + lift], rotation: [0, 0, 0] };
    case "back":
      // Mirror u so that "left on the panel" stays left when you walk around.
      return { position: [-p.u, p.v, -(z + lift)], rotation: [0, Math.PI, 0] };
    case "right":
      return { position: [x + lift, p.v, -p.u], rotation: [0, HALF_PI, 0] };
    case "left":
      return { position: [-(x + lift), p.v, p.u], rotation: [0, -HALF_PI, 0] };
    case "top":
      return { position: [p.u, y + lift, p.v], rotation: [-HALF_PI, 0, 0] };
  }
}
