# 05 — The 3D case

## Why it is built from primitives

There is no `.glb` in this repo. The case is assembled from `RoundedBox`,
`cylinderGeometry` and `boxGeometry` in `src/components/three/CaseModel.tsx`.

That is a deliberate trade:

- **The panel map is the literal geometry.** Panel positions are computed from
  `CASE.width/height/depth`, not guessed against a texture atlas baked in a
  modelling tool. Change the shell dimensions in one constant and every panel,
  every price label and every printed size follows.
- **The repo is asset-free.** No binary to host, no loader to await, no
  `useGLTF` suspense boundary, nothing to go stale.
- **It is inspectable.** A reviewer can read the case.

The cost is that it looks like a well-lit product render rather than a
photograph. For a page whose job is to show *where the panels are*, that is the
right side of the trade.

## Parts

| Part | Geometry | Notes |
| --- | --- | --- |
| Shell | `RoundedBox` 0.76 × 1.10 × 0.40, radius 0.055 | `meshPhysicalMaterial` with clearcoat — the moulded polycarbonate look |
| Split frame | `RoundedBox`, +12 mm in X and Y, 22 mm thin in Z | Proud on the spines, lid and base; buried inside the front and back shells. This is why it reads as a rim band and not a stripe |
| Corner bumpers | 8 × `RoundedBox` 0.13³, radius 0.045 | At `(±x, ±y, ±z)` |
| TSA lock | `RoundedBox` on the lid front edge | |
| Handle | 2 cylinders + a rounded crossbar at `z = -0.155` | Positioned clear of the lid panels — see below |
| Wheels | 4 × housing + cylinder + hub cap | Axis along X so they read as spinner castors |

`GROUND_Y` is exported so `CaseScene` can put the contact shadows exactly where
the wheels touch down.

## The coordinate system

Every panel is placed in the 2D space **of its own face**:

```
u   horizontal offset from the face centre, metres
v   vertical   offset from the face centre, metres
w   panel width
h   panel height
```

Which world axes `u` and `v` map to depends on the face:

| Face | `u` runs along | `v` runs along |
| --- | --- | --- |
| `front`, `back` | X | Y |
| `left`, `right` | Z | Y |
| `top` | X | Z |

`toWorld()` in `src/data/placements.ts` is the **only** place that mapping is
encoded. A plane's default normal is +Z, so each face is one rotation away from
`front`:

```ts
front → position [ u,  v,  z]   rotation [0,     0,    0]
back  → position [-u,  v, -z]   rotation [0,     π,    0]
right → position [ x,  v, -u]   rotation [0,   π/2,    0]
left  → position [-x,  v,  u]   rotation [0,  -π/2,    0]
top   → position [ u,  y,  v]   rotation [-π/2,  0,    0]
```

Note `back` mirrors `u`. Without that, walking round the case would flip left
and right relative to the panel's own layout.

Panels sit `CASE.panelLift` (4 mm) proud of the shell so they never z-fight, and
`polygonOffset` on the material handles the remaining coplanar risk.

## Geometry is tested, not eyeballed

`tests/panels.test.ts` asserts that:

- no panel overhangs the bounds of its face
- no two panels on the same face overlap
- every panel has a positive integer price and a well-formed size label
- panel ids stay two-digit and sequential — they are printed on the real shell
- `toWorld()` puts each face's centre exactly `panelLift` proud, with the right
  rotation, and keeps `v` mapped to world Y on all four vertical faces

**This caught a real bug.** Panels 07 and 08 on the right spine (and their
mirrors 15 and 16 on the left) overlapped by 4 cm: the handle flank spanned
`v ∈ [0.41, 0.51]` while the spine upper spanned `v ∈ [0.15, 0.45]`. Two
sponsors would have been sold overlapping physical area. The spine upper panels
are now 20 cm tall at `v = 0.29`.

Anything that moves a panel should be checked against this suite.

## Panel chips

Each panel wears a canvas texture drawn in `panelTexture.ts`, rather than an
HTML overlay positioned over the canvas.

Drawing into the scene means the labels rotate, catch light, and go round the
back with the case — and there is no second coordinate system to keep in sync
with the 3D one. The chip is the reference site's spot card redrawn in canvas
2D: a white rounded panel, a hairline border (dashed and green while the panel
is open), the company name, and the price.

Two layouts, chosen by aspect ratio:

- **aspect > 2.6** — number, name and price on one line. Used by the crowns and
  bands.
- **otherwise** — number top-left, name centred and wrapped to at most two
  lines, price along the base. Used by the medallion, tiles and spine columns.

The wrapping fits by **wrapping first, then shrinking**. Fitting to a single
line before wrapping drives a two-word name like "Halcyon Compute" down to a
fraction of the size a square panel can carry.

Textures are built once per chip via `useMemo`, in a normal and a hovered
variant, and **disposed on unmount** — each is a full bitmap on the GPU, and a
board refresh after every bid would otherwise leak forty of them.

## The rotation model

`targetAngle` is an **unbounded** radian value held in a ref, not React state.

```ts
const targetAngle = useRef(0);

const turn = (dir: 1 | -1) => {
  targetAngle.current -= dir * QUARTER;      // never wraps to 0
  setFace(faceFromAngle(targetAngle.current));
};
```

Two consequences:

**Spinning does not re-render.** The scene reads the ref every frame in
`useFrame`. Only the face *label* is state, and that changes four times per turn
instead of sixty times a second.

**Turning always continues in the same direction.** Because the angle never
wraps, going from the left spine back to the front carries on forwards rather
than unwinding three-quarters of a turn backwards.

The scene damps toward the target frame-rate-independently:

```ts
const k = 1 - Math.pow(0.0022, Math.min(delta, 0.1));
g.rotation.y += (targetAngle.current - g.rotation.y) * k;
```

`Math.min(delta, 0.1)` clamps the step so a backgrounded tab returning after
several seconds does not snap the case round violently.

### Input

| Input | Behaviour |
| --- | --- |
| `←` `→` arrows | One quarter turn |
| Segmented control | Jumps to a named face **the short way round** — the delta is wrapped into `[-2, 2]` quarter turns |
| Drag | Free spin at 0.006 rad/px; on release, snaps to the nearest quarter turn |
| Click a panel | Opens the bid modal |
| `Escape` | Closes the modal |

Drag and click share a pointer, so a `suppressClick` ref is set once movement
passes a 5 px threshold and cleared on the next tick — otherwise the pointer-up
that ends a drag would also register as a click on whatever panel is underneath.

## Lighting

A key light with shadows, two fills, and a `drei` `<Environment>` built from
`<Lightformer>` children rather than an HDR file. That keeps the scene working
offline and behind a strict CSP — no external fetch — while still giving the
aluminium frame and the clearcoat something to reflect.

`<ContactShadows>` grounds the case at `GROUND_Y`.

---

Next: [06 — Payments](06-payments.md)
