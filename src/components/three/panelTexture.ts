import * as THREE from "three";

/**
 * Panel chip textures.
 *
 * Every brandable panel on the case is a plane wearing a canvas texture drawn
 * here. Drawing the chip rather than overlaying HTML means the labels are
 * genuinely part of the 3D scene: they rotate, catch light, and go round the
 * back with the case, and there is no second coordinate system to keep in sync.
 *
 * The chip is the reference site's spot card, redrawn in canvas: a white
 * rounded panel, a hairline border (dashed and green while the panel is still
 * available), the company name, and the price beneath it.
 */

const INK = "#1d1d1f";
const INK_2 = "#56565c";
const INK_3 = "#86868b";
const WHITE = "#ffffff";
const HAIRLINE = "#d2d2d7";
const GREEN = "#1a7f37";

/** Pixels per metre of panel. Enough to stay crisp at close camera range. */
const RESOLUTION = 1500;
const MAX_DIM = 2048;

export interface PanelChip {
  slotId: string;
  /** Company holding the panel, or null when it is still open. */
  sponsor: string | null;
  /** Amount to show as the price. */
  amountUsd: number;
  taken: boolean;
  /** Panel size in metres, used for aspect and text fitting. */
  w: number;
  h: number;
}

function compact(amountUsd: number): string {
  if (amountUsd >= 1_000_000) {
    const m = amountUsd / 1_000_000;
    return "$" + (m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)) + "M";
  }
  if (amountUsd >= 1000) {
    const k = amountUsd / 1000;
    return "$" + (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + "K";
  }
  return "$" + amountUsd;
}

const font = (weight: number, size: number) =>
  `${weight} ${size}px ${"Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"}`;

/** Shrink until the string fits `maxWidth`. */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight: number,
  minSize = 8,
): number {
  let size = Math.floor(startSize);
  ctx.font = font(weight, size);
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = font(weight, size);
  }
  return size;
}

/** Word-wrap `text` at `size`. Does not shrink. */
function wrapAt(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: number,
): string[] {
  ctx.font = font(weight, size);
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? line + " " + word : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Largest size at which `text` wraps into at most two lines that fit the box.
 * Wrapping is tried before shrinking, so "Halcyon Compute" becomes two large
 * lines rather than one small one.
 */
function fitWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startSize: number,
  weight: number,
  minSize = 9,
): { size: number; lines: string[] } {
  let size = Math.max(minSize, Math.floor(startSize));
  while (size > minSize) {
    const lines = wrapAt(ctx, text, maxWidth, size, weight);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (lines.length <= 2 && widest <= maxWidth && lines.length * size * 1.2 <= maxHeight) {
      return { size, lines };
    }
    size -= 1;
  }
  return { size, lines: wrapAt(ctx, text, maxWidth, size, weight).slice(0, 2) };
}

function ellipsise(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + "…").width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + "…";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Render one panel chip to a texture.
 *
 * `hovered` is drawn as a separate texture rather than a material tint so the
 * border weight and the price colour can lift independently of the paper.
 */
export function createPanelTexture(chip: PanelChip, hovered = false): THREE.CanvasTexture {
  const aspect = chip.w / chip.h;
  const width = Math.min(MAX_DIM, Math.round(chip.w * RESOLUTION));
  const height = Math.min(MAX_DIM, Math.round(chip.h * RESOLUTION));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const short = Math.min(width, height);
  const pad = Math.max(7, short * 0.1);
  const radius = Math.max(8, short * 0.13);
  const stroke = Math.max(2, short * 0.016);

  // Card
  ctx.fillStyle = WHITE;
  roundRect(ctx, stroke, stroke, width - stroke * 2, height - stroke * 2, radius);
  ctx.fill();

  // Border — dashed green while the panel is still open, as on the reference.
  ctx.strokeStyle = chip.taken ? HAIRLINE : GREEN;
  ctx.lineWidth = stroke * (hovered ? 2 : 1);
  if (!chip.taken) ctx.setLineDash([stroke * 3, stroke * 2.4]);
  roundRect(ctx, stroke, stroke, width - stroke * 2, height - stroke * 2, radius);
  ctx.stroke();
  ctx.setLineDash([]);

  const label = chip.sponsor ?? "Available";
  const price = compact(chip.amountUsd);
  const priceColor = chip.taken ? INK_2 : GREEN;

  ctx.textBaseline = "middle";

  // ---- Wide panels: number | name | price, all on one line -----------------
  if (aspect > 2.6) {
    const numSize = Math.max(9, height * 0.26);
    ctx.font = font(600, numSize);
    ctx.fillStyle = INK_3;
    ctx.textAlign = "left";
    ctx.fillText(chip.slotId, pad, height / 2);
    const numW = ctx.measureText(chip.slotId).width;

    const priceSize = Math.max(10, height * 0.34);
    ctx.font = font(600, priceSize);
    const priceW = ctx.measureText(price).width;
    ctx.fillStyle = priceColor;
    ctx.textAlign = "right";
    ctx.fillText(price, width - pad, height / 2);

    const nameX = pad + numW + pad * 0.9;
    const nameMax = width - pad - priceW - pad * 0.9 - nameX;
    const nameSize = fitText(ctx, label, nameMax, height * 0.42, 600);
    ctx.font = font(600, nameSize);
    ctx.fillStyle = chip.taken ? INK : INK_2;
    ctx.textAlign = "left";
    ctx.fillText(ellipsise(ctx, label, nameMax), nameX, height / 2);

    return finish(canvas);
  }

  // ---- Squarer panels: number top-left, name centred, price beneath --------
  const numSize = Math.max(9, Math.min(height * 0.13, width * 0.15));
  ctx.font = font(600, numSize);
  ctx.fillStyle = INK_3;
  ctx.textAlign = "left";
  ctx.fillText(chip.slotId, pad, pad + numSize * 0.55);

  const priceSize = Math.max(10, Math.min(height * 0.19, width * 0.17));
  const priceY = height - pad - priceSize * 0.55;

  const nameMax = width - pad * 2;
  const nameTop = pad + numSize;
  const nameBottom = priceY - priceSize * 0.8;
  const { size: nameSize, lines } = fitWrapped(
    ctx,
    label,
    nameMax,
    nameBottom - nameTop,
    Math.min(height * 0.24, width * 0.2),
    600,
  );

  ctx.font = font(600, nameSize);
  ctx.fillStyle = chip.taken ? INK : INK_2;
  ctx.textAlign = "center";

  const blockH = lines.length * nameSize * 1.2;
  let y = (nameTop + nameBottom) / 2 - blockH / 2 + nameSize * 0.6;
  for (const line of lines) {
    ctx.fillText(ellipsise(ctx, line, nameMax), width / 2, y);
    y += nameSize * 1.2;
  }

  ctx.font = font(600, priceSize);
  ctx.fillStyle = priceColor;
  ctx.textAlign = "center";
  ctx.fillText(price, width / 2, priceY);

  return finish(canvas);
}

function finish(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
