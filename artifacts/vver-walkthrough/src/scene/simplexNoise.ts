/**
 * 2D Simplex Noise and Fractional Brownian Motion (fBm)
 * Provides smooth, natural, continuous procedural terrain elevation without grid artifacts.
 */

// Permutation table initialized with fixed seed for determinism
const PERM = new Uint8Array(512);
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

(function initPermutation() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 1234567;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    PERM[i] = p[i & 255];
  }
})();

const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

/**
 * 2D Simplex Noise in range [-1, 1]
 */
export function simplex2D(xin: number, yin: number): number {
  let n0 = 0;
  let n1 = 0;
  let n2 = 0;

  // Skew input space to determine simplex cell
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);

  // Unskew cell origin back to (x, y) space
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;

  // Determine which simplex triangle we are in
  let i1 = 0;
  let j1 = 0;
  if (x0 > y0) {
    i1 = 1;
    j1 = 0;
  } else {
    i1 = 0;
    j1 = 1;
  }

  // Offsets for middle and last corners
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1.0 + 2.0 * G2;
  const y2 = y0 - 1.0 + 2.0 * G2;

  // Hash coordinates
  const ii = i & 255;
  const jj = j & 255;

  // Contribution from first corner
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) {
    t0 *= t0;
    const gi0 = PERM[ii + PERM[jj]] % 8;
    n0 = t0 * t0 * (GRAD2[gi0][0] * x0 + GRAD2[gi0][1] * y0);
  }

  // Contribution from second corner
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) {
    t1 *= t1;
    const gi1 = PERM[ii + i1 + PERM[jj + j1]] % 8;
    n1 = t1 * t1 * (GRAD2[gi1][0] * x1 + GRAD2[gi1][1] * y1);
  }

  // Contribution from third corner
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) {
    t2 *= t2;
    const gi2 = PERM[ii + 1 + PERM[jj + 1]] % 8;
    n2 = t2 * t2 * (GRAD2[gi2][0] * x2 + GRAD2[gi2][1] * y2);
  }

  // Scale result to [-1, 1]
  return 70.0 * (n0 + n1 + n2);
}

/**
 * Multi-octave Fractional Brownian Motion (fBm) for natural terrain
 * Returns normalized elevation value in range [-1, 1]
 */
export function fbm2D(x: number, y: number, octaves = 4, lacunarity = 2.0, gain = 0.5): number {
  let total = 0;
  let frequency = 1.0;
  let amplitude = 1.0;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    total += simplex2D(x * frequency, y * frequency) * amplitude;
    maxAmp += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  return total / maxAmp;
}

/**
 * Ridged noise for dramatic hilltops and outcrops
 */
export function ridgeNoise2D(x: number, y: number, octaves = 3): number {
  let total = 0;
  let frequency = 1.0;
  let amplitude = 1.0;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    let n = simplex2D(x * frequency, y * frequency);
    n = 1.0 - Math.abs(n);
    n = n * n;
    total += n * amplitude;
    maxAmp += amplitude;
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return total / maxAmp;
}
