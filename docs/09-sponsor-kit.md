# 09 — Sponsor kit

Everything a brand needs to supply artwork for a panel.

The shell is **76 × 110 × 40 cm**. Panel dimensions below are the finished
printed area — the visible vinyl after cutting, not the artboard.

## The full panel map

| # | Code | Panel | Face | Print size | Opening bid |
| --- | --- | --- | --- | --- | --- |
| 01 | `FR-CROWN` | The Crown | Front shell | 62 x 13 cm | $48,000 |
| 02 | `FR-MED` | The Medallion | Front shell | 34 x 34 cm | $36,000 |
| 03 | `FR-PORT` | Port Tile | Front shell | 14 x 20 cm | $18,000 |
| 04 | `FR-STBD` | Starboard Tile | Front shell | 14 x 20 cm | $18,000 |
| 05 | `FR-BAND` | Lower Band | Front shell | 62 x 15 cm | $14,000 |
| 06 | `FR-RAIL` | Base Rail | Front shell | 50 x 12 cm | $11,000 |
| 07 | `RT-FLANK` | Right Handle Flank | Right spine | 22 x 10 cm | $10,000 |
| 08 | `RT-UPPER` | Right Spine Upper | Right spine | 26 x 20 cm | $16,000 |
| 09 | `RT-LOWER` | Right Spine Lower | Right spine | 26 x 30 cm | $13,000 |
| 10 | `RT-WELL` | Right Wheel Well | Right spine | 22 x 14 cm | $8,000 |
| 11 | `BK-CROWN` | Back Crown | Back shell | 62 x 13 cm | $20,000 |
| 12 | `BK-FIELD` | Back Field | Back shell | 52 x 36 cm | $15,000 |
| 13 | `BK-BAND` | Back Band | Back shell | 52 x 16 cm | $11,000 |
| 14 | `BK-BASE` | Back Base | Back shell | 44 x 12 cm | $8,000 |
| 15 | `LT-FLANK` | Left Handle Flank | Left spine | 22 x 10 cm | $10,000 |
| 16 | `LT-UPPER` | Left Spine Upper | Left spine | 26 x 20 cm | $16,000 |
| 17 | `LT-LOWER` | Left Spine Lower | Left spine | 26 x 30 cm | $13,000 |
| 18 | `LT-WELL` | Left Wheel Well | Left spine | 22 x 14 cm | $8,000 |
| 19 | `TP-CROWN` | Lid Crown | Lid | 46 x 15 cm | $22,000 |
| 20 | `TP-RAIL` | Lid Rail | Lid | 36 x 7 cm | $12,000 |

**Reserve floor across all twenty panels: $327,000. Campaign goal: $500,000.**

This table is generated from `src/data/placements.ts` by
`scripts/gen-panel-table.mts`. Regenerate it after any change to the panel map:

```bash
npx tsx scripts/gen-panel-table.mts
```

## Artwork specification

| | |
| --- | --- |
| **Format** | Vector preferred — PDF, AI, or SVG with outlined type. 300 dpi PNG or TIFF accepted at final size |
| **Colour** | CMYK for print accuracy. Supply Pantone references for brand-critical colours |
| **Bleed** | 3 mm on all four sides beyond the finished size |
| **Safe area** | Keep type and logo marks 6 mm inside the finished edge — the panels sit on a curved moulded surface and the outer few millimetres wrap |
| **Minimum type** | 6 mm cap height. Anything smaller will not read at the distance these panels are seen from |
| **Transparency** | Flatten before supplying. Knockouts must be real paths, not effects |
| **Material** | 3M IJ180Cv3 cast vinyl with 8518 gloss laminate |
| **Cut** | Die-cut to the panel rectangle. Contour cuts to a logo silhouette are possible on panels 02, 12 and 19 — ask first |

## Artboard sizes with bleed

Add 6 mm to each dimension (3 mm bleed per side):

| Panel | Finished | Artboard |
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

**Spine panels (07–10, 15–18) are portrait and narrow.** The spine is 40 cm
deep, so the widest a spine panel gets is 26 cm. Vertical lockups and stacked
marks work; long horizontal wordmarks do not. If your logo is a wide wordmark,
the crowns and bands are the better buy.

**Back-face panels are mirrored in the panel map, not in print.** Supply
back-face artwork reading normally, left to right. The mirroring in
`toWorld()` is a rendering concern only — it keeps "left on the panel" reading
as left when you walk around the case.

**Lid panels (19, 20) are seen from above and from behind.** Most photographs of
the lid are taken standing over the case with the handle towards the viewer, so
orient artwork to read with the handle at the *bottom* of the artboard.

**The Lid Rail (20) is only 7 cm tall.** It suits a wordmark or a single-line
lockup. Do not send a stacked logo for it.

## Process and timings

1. **Win the panel.** The auction closes on the date shown in the hero
   countdown.
2. **Send artwork** within 10 working days of the close, to the address on your
   bid confirmation.
3. **Proof.** A printed proof is photographed on the actual shell and sent for
   approval. One free revision round is included.
4. **Approval triggers the balance.** The remaining 80% is charged once you
   approve the proof.
5. **Fitting.** Panels are fitted by hand and the finished case is photographed
   as a studio set. You receive the full set.
6. **The term** is twelve months from the San Francisco date.

## What you receive

- Your panel on the shell for twelve months, across twelve cities
- A studio photography set of the fitted case, yours to use
- Inclusion in whatever the case appears in over the year — event photos, posts,
  and the build log

## What this is not

You are buying space on a case that will be in these rooms. You are **not**
buying a position on any event's official sponsor list. CODEC is not sponsored
by, endorsed by, or affiliated with OpenAI, Anthropic, or any conference
organiser, and no part of this kit should be represented as such.

## Right of refusal

Brands can be declined, and the deposit is returned in full with no fee. Panels
may not be resold or sublicensed without written approval.

---

Back to [the documentation index](../README.md#documentation).
