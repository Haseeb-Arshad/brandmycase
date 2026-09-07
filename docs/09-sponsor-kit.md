# 09 — Sponsor kit

Everything a company needs to supply artwork for a CODEC ONE placement.

The shell is **76 × 110 × 40 cm**. Dimensions below are the finished printed
area — the visible vinyl after cutting, not the artboard.

> **Prices have changed and are now published.** Placements are sold at three
> fixed tiers — Anchor $1,000, Partner $500, Supporter $250 — defined in
> `src/data/sponsorship.ts`. The table below predates that and lists the old
> prominence tiers; regenerate it with `npx tsx scripts/gen-panel-table.mts`,
> which now emits the real tier and price for every panel. The artwork
> specification is unchanged and still authoritative. See
> [13 — Brand the Case](13-brand-the-case.md).

## The full placement map

| # | Code | Placement | Face | Print size | Tier | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | `FR-CROWN` | The Crown | Front shell | 62 x 13 cm | Prime placement | Open |
| 02 | `FR-MED` | The Medallion | Front shell | 34 x 34 cm | Prime placement | Open |
| 03 | `FR-PORT` | Port Tile | Front shell | 14 x 20 cm | Feature placement | Open |
| 04 | `FR-STBD` | Starboard Tile | Front shell | 14 x 20 cm | Feature placement | Open |
| 05 | `FR-BAND` | Lower Band | Front shell | 62 x 15 cm | Feature placement | Open |
| 06 | `FR-RAIL` | Base Rail | Front shell | 50 x 12 cm | Founding placement | Open |
| 07 | `RT-FLANK` | Right Handle Flank | Right spine | 22 x 10 cm | Founding placement | Open |
| 08 | `RT-UPPER` | Right Spine Upper | Right spine | 26 x 20 cm | Feature placement | Open |
| 09 | `RT-LOWER` | Right Spine Lower | Right spine | 26 x 30 cm | Feature placement | Open |
| 10 | `RT-WELL` | Right Wheel Well | Right spine | 22 x 14 cm | Founding placement | Open |
| 11 | `BK-CROWN` | Back Crown | Back shell | 62 x 13 cm | Prime placement | Open |
| 12 | `BK-FIELD` | Back Field | Back shell | 52 x 36 cm | Feature placement | Open |
| 13 | `BK-BAND` | Back Band | Back shell | 52 x 16 cm | Founding placement | Open |
| 14 | `BK-BASE` | Back Base | Back shell | 44 x 12 cm | Founding placement | Open |
| 15 | `LT-FLANK` | Left Handle Flank | Left spine | 22 x 10 cm | Founding placement | Open |
| 16 | `LT-UPPER` | Left Spine Upper | Left spine | 26 x 20 cm | Feature placement | Open |
| 17 | `LT-LOWER` | Left Spine Lower | Left spine | 26 x 30 cm | Feature placement | Open |
| 18 | `LT-WELL` | Left Wheel Well | Left spine | 22 x 14 cm | Founding placement | Open |
| 19 | `TP-CROWN` | Lid Crown | Lid | 46 x 15 cm | Prime placement | Open |
| 20 | `TP-RAIL` | Lid Rail | Lid | 36 x 7 cm | Feature placement | Open |

This table is generated from `src/data/placements.ts` by
`scripts/gen-panel-table.mts`. Regenerate it after any change to the placement
map or to a placement's status:

```bash
npx tsx scripts/gen-panel-table.mts
```

## Artwork specification

| | |
| --- | --- |
| **Format** | Vector preferred — PDF, AI, or SVG with outlined type. 300 dpi PNG or TIFF accepted at final size |
| **Colour** | CMYK for print accuracy. Supply Pantone references for brand-critical colours |
| **Bleed** | 3 mm on all four sides beyond the finished size |
| **Safe area** | Keep type and logo marks 6 mm inside the finished edge — the placements sit on a curved moulded surface and the outer few millimetres wrap |
| **Minimum type** | 6 mm cap height. Anything smaller will not read at the distance these placements are seen from |
| **Transparency** | Flatten before supplying. Knockouts must be real paths, not effects |
| **Material** | 3M IJ180Cv3 cast vinyl with 8518 gloss laminate |
| **Cut** | Die-cut to the placement rectangle. Contour cuts to a logo silhouette are possible on 02, 12 and 19 — ask first |

## Artboard sizes with bleed

Add 6 mm to each dimension (3 mm bleed per side):

| Placement | Finished | Artboard |
| --- | --- | --- |
| Crowns (01, 11) | 62 × 13 cm | 62.6 × 13.6 cm |
| Medallion (02) | 34 × 34 cm | 34.6 × 34.6 cm |
| Tiles (03, 04) | 14 × 20 cm | 14.6 × 20.6 cm |
| Lower Band (05) | 62 × 15 cm | 62.6 × 15.6 cm |
| Base Rail (06) | 50 × 12 cm | 50.6 × 12.6 cm |
| Flanks (07, 15) | 22 × 10 cm | 22.6 × 10.6 cm |
| Spine Upper (08, 16) | 26 × 20 cm | 26.6 × 20.6 cm |
| Spine Lower (09, 17) | 26 × 30 cm | 26.6 × 30.6 cm |
| Wheel Wells (10, 18) | 22 × 14 cm | 22.6 × 14.6 cm |
| Back Field (12) | 52 × 36 cm | 52.6 × 36.6 cm |
| Back Band (13) | 52 × 16 cm | 52.6 × 16.6 cm |
| Back Base (14) | 44 × 12 cm | 44.6 × 12.6 cm |
| Lid Crown (19) | 46 × 15 cm | 46.6 × 15.6 cm |
| Lid Rail (20) | 36 × 7 cm | 36.6 × 7.6 cm |

## Orientation notes

**Spine placements (07–10, 15–18) are portrait and narrow.** The spine is 40 cm
deep, so the widest a spine placement gets is 26 cm. Vertical lockups and
stacked marks work; long horizontal wordmarks do not. If your logo is a wide
wordmark, the crowns and bands are the better fit.

**Back-face placements are mirrored in the placement map, not in print.**
Supply back-face artwork reading normally, left to right. The mirroring in
`toWorld()` is a rendering concern only — it keeps "left on the panel" reading
as left when you walk around the case.

**Lid placements (19, 20) are seen from above and from behind.** Most
photographs of the lid are taken standing over the case with the handle towards
the viewer, so orient artwork to read with the handle at the *bottom* of the
artboard.

**The Lid Rail (20) is only 7 cm tall.** It suits a wordmark or a single-line
lockup. Do not send a stacked logo for it.

## Process

1. **Send a placement request** from the site, or by email. It is non-binding,
   no payment is taken, and nothing is reserved.
2. **We reply either way.** If there is a fit, we discuss placement, scope,
   artwork, timing and commercial terms directly.
3. **Written agreement.** A sponsorship exists only once both sides have agreed
   written terms. Contracting and invoicing happen off-site.
4. **Send artwork** to the address on the agreement, to the specification above.
5. **Proof.** A printed proof is photographed on the actual shell and sent for
   approval. One revision round is included.
6. **Fitting.** Placements are fitted by hand and the finished case is
   photographed as a studio set. You receive the full set.

## What you receive

- Your artwork produced in cast vinyl for the selected measured placement, and
  fitted to the case
- A studio photography set of the finished branded object, yours to use
- Inclusion in the CODEC ONE build log and project documentation
- Inclusion in project content where the case naturally appears

The exact scope is written into the agreement before anything is produced.

## What this is not

You are commissioning a physical placement on a privately owned object, plus an
agreed media package. You are **not** buying:

- an official event sponsorship, or a position on anybody's sponsor list
- event rights, credentials, access, exhibitor status or introductions
- guaranteed impressions, reach, audience numbers or media coverage
- guaranteed photographs at any named event
- a guarantee that the case will be permitted inside any particular venue

CODEC ONE is an independent project. The creator has received an invitation to
attend OpenAI DevDay 2026 in San Francisco. CODEC ONE is not sponsored by,
endorsed by, affiliated with, or operated by OpenAI or any event organiser, and
no part of this kit may be represented as such.

## Right of refusal

Companies can be declined. No payment is taken on the site, so there is nothing
to return. Placements may not be resold or sublicensed without written
approval.

---

Back to [the documentation index](../README.md#documentation).
