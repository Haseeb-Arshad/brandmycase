import * as THREE from "three";

/**
 * Procedural shell surface maps.
 *
 * The reference case is a matte black hardshell with deep diagonal ribs moulded
 * into the polycarbonate. That ribbing is what makes it read as a real object
 * rather than a black box: it catches a highlight along every rib edge and
 * gives the light something to travel across as the case turns.
 *
 * Rather than ship a texture file, the rib pattern is generated here as a
 * height field and converted to a tangent-space normal map. Two consequences:
 *
 *   - the repo stays asset-free, and the pattern is tweakable by changing a
 *     number rather than re-exporting a PNG
 *   - it tiles seamlessly, because the height function is defined on
 *     (x + y) mod PERIOD, which wraps exactly when the canvas size is a
 *     multiple of PERIOD
 */

const SIZE = 512;
/** Rib repeat distance, in pixels. Must divide SIZE for seamless tiling. */
const PERIOD = 64;
/** Fraction of each period occupied by the raised rib. */
const RIB_WIDTH = 0.62;

/**
 * Rib cross-section: a raised cosine, so the rib has soft shoulders and a
 * rounded crown like moulded plastic, rather than a hard square edge.
 */
function ribProfile(t: number): number {
  if (t > RIB_WIDTH) return 0;
  return 0.5 - 0.5 * Math.cos((t / RIB_WIDTH) * Math.PI * 2);
}

/**
 * Height at a pixel. Diagonal because it depends on (x + y): lines of constant
 * height run at 45 degrees, matching the moulding on the reference shell.
 */
function heightAt(x: number, y: number): number {
  const phase = (((x + y) % PERIOD) + PERIOD) % PERIOD;
  return ribProfile(phase / PERIOD);
}

/** Build the height field once; both maps below are derived from it. */
function buildHeightField(): Float32Array {
  const field = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      field[y * SIZE + x] = heightAt(x, y);
    }
  }
  return field;
}

/** Wrap an index so the Sobel kernel reads across the seam, keeping it tileable. */
const wrap = (i: number) => (i + SIZE) % SIZE;

/**
 * Convert the height field to a tangent-space normal map via central
 * differences. Encoded the usual way: +X into red, +Y into green, +Z into blue,
 * with 0.5 as flat.
 */
export function createShellNormalMap(strength = 2.6): THREE.CanvasTexture {
  const field = buildHeightField();

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(SIZE, SIZE);
  const data = image.data;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const left = field[y * SIZE + wrap(x - 1)];
      const right = field[y * SIZE + wrap(x + 1)];
      const up = field[wrap(y - 1) * SIZE + x];
      const down = field[wrap(y + 1) * SIZE + x];

      // Gradient of the surface, scaled into a normal.
      let nx = (left - right) * strength;
      let ny = (up - down) * strength;
      let nz = 1;

      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const i = (y * SIZE + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  // A normal map is data, not colour — it must not be sRGB-decoded.
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * A matching roughness map: rib crowns are very slightly polished by handling,
 * the recesses between them hold a little more scatter. The variation is small
 * on purpose — a large swing here reads as dirt, not moulding.
 */
export function createShellRoughnessMap(): THREE.CanvasTexture {
  const field = buildHeightField();

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(SIZE, SIZE);
  const data = image.data;

  for (let i = 0; i < SIZE * SIZE; i++) {
    // 0.72 in the grooves down to 0.58 on the crowns.
    const rough = 0.72 - field[i] * 0.14;
    const v = rough * 255;
    const p = i * 4;
    data[p] = v;
    data[p + 1] = v;
    data[p + 2] = v;
    data[p + 3] = 255;
  }

  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
