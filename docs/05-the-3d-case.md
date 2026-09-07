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
| Clamshell halves | 2 × `RoundedBox` 0.76 × 1.10 × 0.20, radius 0.058, smoothness 8 | Front at `z = +0.10`, back at `z = -0.10`. Two halves rather than one box so the case reads as something that opens |
| Shell surface | `meshPhysicalMaterial`, matte black, clearcoat 0.3, sheen | Carries the generated rib normal map and roughness map |
| Zip seam | `RoundedBox`, +6 mm in X and Y, 26 mm thin in Z, at `z = 0` | Fills the groove between the halves; proud on the spines, lid and base, buried inside the front and back |
| Zip pulls | 2 × small chrome `RoundedBox` on the right spine | |
| Grab handles | 2 × recess + proud bar | One on the lid front edge, one low on the right spine — both placed to clear the panel map |
| Telescoping handle | 2 chrome cylinders + mount plate + grip + release button, at `z = -0.155` | Positioned clear of the lid panels |
| Wheels | 4 × plate + swivel yoke + **two** discs + hub caps | Dual spinner castors; the axle runs along X |

`GROUND_Y` is exported so `CaseScene` can put the contact shadows exactly where
the wheels touch down.

## The moulded ribbing

The single biggest contributor to the case reading as a real object is the
diagonal ribbing moulded into the shell. It is generated, not painted on:
`shellTexture.ts` builds a height field and converts it to a tangent-space
normal map, plus a matching roughness map.

```
height(x, y) = ribProfile(((x + y) mod PERIOD) / PERIOD)
```

Because the height depends on `x + y`, lines of constant height run at 45
degrees. Because it is a modulo of `PERIOD`, and the canvas size is a multiple
of `PERIOD`, it **tiles seamlessly** — the Sobel pass that derives the normals
wraps its kernel at the edges for the same reason. The rib cross-section is a
raised cosine, so ribs have soft shoulders and rounded crowns like moulded
plastic rather than hard square steps.

Two details that matter:

- the normal map is set to `THREE.NoColorSpace`. It is data, not colour — sRGB
  decoding it would bend every normal
- the roughness map varies only from 0.72 in the grooves to 0.58 on the crowns.
  A wider swing reads as dirt, not moulding

A near-black matte shell lit only from the front collapses into a silhouette, so
`CaseScene` puts two rim lights behind the case. Those are what draw its edge
against a white page and what make the ribbing legible as it turns.

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
board change would otherwise leak forty of them.

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
| Click a placement | Opens the placement request modal |
| `Escape` | Closes the modal |

Drag and click share a pointer, so a `suppressClick` ref is set once movement
passes a 5 px threshold and cleared on the next tick — otherwise the pointer-up
that ends a drag would also register as a click on whatever panel is underneath.

### Never capture the pointer on the stage wrapper

Drag is tracked with `pointermove` / `pointerup` listeners on `window`, and the
wrapper deliberately does **not** call `setPointerCapture`.

This is not a style preference. Pointer capture redirects every subsequent
pointer event for that pointer id to the capturing element. Capturing on the
wrapper therefore stops the `<canvas>` inside it from ever seeing `pointerup` —
and react-three-fiber only fires `onClick` when it observes `pointerdown` **and**
`pointerup` on the same object. The result is a stage that rotates perfectly and
silently ignores every single panel click, with nothing in the console.

This is a real bug that shipped and was fixed. If you reintroduce pointer
capture here, every panel becomes unclickable.

`tests/` cannot cover this — the click path runs through a WebGL raycast, so a
synthetic DOM event never reaches it. It is verified by driving real pointer
input through the DevTools protocol (`Input.dispatchMouseEvent`) and asserting
`.request-modal` appears.

## Lighting

A key light with shadows, two fills, and a `drei` `<Environment>` built from
`<Lightformer>` children rather than an HDR file. That keeps the scene working
offline and behind a strict CSP — no external fetch — while still giving the
aluminium frame and the clearcoat something to reflect.

`<ContactShadows>` grounds the case at `GROUND_Y`.

---

Next: [06 — Payments](06-payments.md)
