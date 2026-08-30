# 07 — Design system

The UI follows [brandmymac.com](https://brandmymac.com). The tokens below are
the values that site ships, read from its stylesheet; the rest is the same
Apple-flavoured idiom applied to this product's components.

Everything lives in one file, `src/app/globals.css`. There is no utility
framework: the system is about forty tokens and sixty component rules, which is
less than the machinery a framework would add.

## Tokens

```css
--background: #fff;      /* page ground — white, not off-white       */
--surface:    #f5f5f7;   /* cards, sunk sections                     */
--surface-2:  #ebebed;   /* pressed / hover on surface               */
--ink:        #1d1d1f;   /* primary text — never pure black          */
--ink-2:      #56565c;   /* secondary text, nav links, body copy     */
--ink-3:      #86868b;   /* tertiary — captions, fine print          */
--hairline:   #d2d2d7;   /* every border, always 1px                 */
--green:      #1a7f37;   /* money, availability                      */
--green-bright: #2da44e; /* progress fill, live dot                  */
--blue:       #0071e3;   /* the primary action, and only that        */

--ease-out: cubic-bezier(0, 0, 0.2, 1);
--nav-h: 52px;
--wide:   1152px;   /* nav, tour grid, inventory   */
--mid:    1024px;   /* hero, prose sections        */
--narrow:  720px;   /* FAQ, ticker                 */
```

**Font** is Inter, self-hosted by `next/font/google` at build time — no runtime
request and no layout shift. Exposed as `--font-inter` so the stack lives in
CSS.

## Rules of the system

1. **Everything is centred and column-based.** There is no editorial
   side-by-side layout anywhere. The hero, every section head, the footer — all
   centred, capped at a `ch`-based measure.
2. **Ink is `#1d1d1f`, never `#000`.** Secondary text is `#56565c`. Pure black
   does not appear.
3. **Borders are 1px hairlines.** Depth comes from shadow, not rules.
4. **Green means money or availability; blue means the primary action.** Green
   is never decorative. Blue appears on exactly one control per view.
5. **Nothing is square.** 999px on pills, 10–22px on cards and inputs.

## Type scale

| Role | Size | Weight | Tracking |
| --- | --- | --- | --- |
| `h1` | `clamp(2rem, 5vw, 4rem)` | 500 | `-0.06em` |
| `.h2` | `clamp(1.6rem, 3.6vw, 2.6rem)` | 500 | `-0.04em` |
| `.h3`, card titles | 17–19px | 600 | `-0.02em` |
| `.lede` | 16px / 1.625 | 400 | — |
| Body, cards | 13–15px | 400 | — |
| `.eyebrow`, `.section-kicker` | 12–13px | 500 | — |
| Fine print | 11–12px | 400 | — |

The display sizes carry a strong negative tracking; body copy carries none. Add
`.tnum` to anything numeric that updates in place — funding totals, bid amounts,
countdowns — so digits do not jitter.

## Component patterns

**`.segmented`** — the pill-group control, used for both the face switcher and
the inventory filters. Selected item gets white fill, a 1px ring and a soft
shadow; the rest are `--ink-2` on a translucent hairline bed. Drive it with
`aria-pressed`, which is also the CSS selector, so state and semantics cannot
diverge.

**`.case-card`** — the product card. A light brushed gradient, an inner white
top highlight, an inner dark base line, and two stacked soft shadows:

```css
box-shadow:
  inset 0  1px 0 rgba(255,255,255,0.9),
  inset 0 -1px 0 rgba(0,0,0,0.18),
  0 30px 60px -18px rgba(0,0,0,0.28),
  0 12px 24px -12px rgba(0,0,0,0.18);
```

That four-part stack is what makes it read as a physical object on white rather
than a div with a drop shadow.

**`.panel-card`** — inventory cards. Solid hairline border when taken; **dashed
green border with a tinted ground when open**, which is the same visual language
as the dashed chips on the 3D case. Hover lifts 2px, drops the border and adds a
two-layer shadow.

**`.progress`** — 8px tall, fully rounded, inset hairline ring, `--green-bright`
fill with a 0.6s eased width transition.

**`details` / `summary`** — the FAQ. The `+` rotates 45° into an `×` on open.
`list-style: none` plus `::-webkit-details-marker { display: none }` to kill the
native triangle.

## Accessibility

- `:focus-visible` is a 2px `--blue` ring at 2px offset, on everything.
- The face switcher is a labelled `role="group"`; the face name is `aria-live`.
- The funding bar is a real `role="progressbar"` with `aria-valuenow`.
- The modal is `role="dialog" aria-modal="true"`, focuses its first field on
  open, closes on `Escape` and on backdrop click, and locks body scroll.
- Field errors are rendered inside their `<label>`, so they are announced with
  the input rather than floating loose.
- Every icon-only control has an `aria-label`; every decorative glyph is
  `aria-hidden`.

## Motion

Transitions are 0.16–0.6s on `--ease-out`. The only looping animation is the
2px `ping` on the live dot.

`prefers-reduced-motion: reduce` collapses every animation and transition to
0.01ms and disables smooth scrolling. The 3D scene's idle float is subtle enough
to leave running, but the rotation damping still respects the clamped delta so
it never lurches.

## Responsive

One breakpoint at 860px and a minor one at 520px.

At 860px the nav links collapse (the CTA stays), the hero tightens, the case
card goes from `aspect-ratio: 1.14` to `1.02` so a portrait object still fits a
portrait viewport, hero actions stack, and the modal meta grid goes single
column.

## Where the two reference sites differ

This project was first built against `vr.skeptrune.com`, which is an *editorial*
system: paper ground, Arial with Georgia italic accents, 0.87 line-height
display type at `-0.07em`, hard 1px rules, square corners, no shadows.

`brandmymac.com` is the opposite idiom — white, Inter, rounded, shadowed,
centred. They look like relatives because they sell the same thing, but the
systems are not interchangeable. This codebase now implements the brandmymac
one throughout; if you are reading old commits, that is what changed.

---

Next: [08 — Deployment](08-deployment.md)
