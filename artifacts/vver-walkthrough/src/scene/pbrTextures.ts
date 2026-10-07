import * as THREE from 'three';

const SIZE = 256;

function pseudoRandom(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return v - Math.floor(v);
}

function smoothNoise(x: number, y: number, seed: number, scale: number): number {
  const scaledX = x / scale;
  const scaledY = y / scale;
  const ix = Math.floor(scaledX);
  const iy = Math.floor(scaledY);
  const fx = scaledX - ix;
  const fy = scaledY - iy;

  // Cubic Hermite spline
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);

  const n00 = pseudoRandom(ix, iy, seed);
  const n10 = pseudoRandom(ix + 1, iy, seed);
  const n01 = pseudoRandom(ix, iy + 1, seed);
  const n11 = pseudoRandom(ix + 1, iy + 1, seed);

  const nx0 = n00 + ux * (n10 - n00);
  const nx1 = n01 + ux * (n11 - n01);
  return nx0 + uy * (nx1 - nx0);
}

function buildNormalMap(heights: Float32Array, strength: number, size = SIZE): Uint8Array {
  const normalData = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const left = heights[y * size + ((x + size - 1) % size)];
      const right = heights[y * size + ((x + 1) % size)];
      const up = heights[((y + size - 1) % size) * size + x];
      const down = heights[((y + 1) % size) * size + x];

      const dx = (left - right) * strength;
      const dy = (up - down) * strength;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      const cIdx = idx * 4;
      normalData[cIdx] = Math.round((dx / len * 0.5 + 0.5) * 255);
      normalData[cIdx + 1] = Math.round((dy / len * 0.5 + 0.5) * 255);
      normalData[cIdx + 2] = Math.round((dz / len * 0.5 + 0.5) * 255);
      normalData[cIdx + 3] = 255;
    }
  }
  return normalData;
}

function makeTexture(data: Uint8Array, size = SIZE, isColor = false, repeatX = 1, repeatY = 1): THREE.DataTexture {
  const tex = new THREE.DataTexture(data as unknown as BufferSource, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// --------------------------------------------------------------------------------
// 1. Concrete PBR: Industrial concrete paneling lines + realistic roughness 0.85
// --------------------------------------------------------------------------------
function createConcreteMaps() {
  const colorData = new Uint8Array(SIZE * SIZE * 4);
  const roughnessData = new Uint8Array(SIZE * SIZE * 4);
  const heights = new Float32Array(SIZE * SIZE);

  const panelW = 128; // 2 panels horizontally per 256px
  const panelH = 64;  // 4 panels vertically per 256px

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = y * SIZE + x;

      // Local coordinates inside panel
      const px = x % panelW;
      const py = y % panelH;

      // Distance to panel seams
      const distBorderX = Math.min(px, panelW - px);
      const distBorderY = Math.min(py, panelH - py);
      const distBorder = Math.min(distBorderX, distBorderY);

      // Formwork panel groove
      let seamFactor = 1.0;
      if (distBorder < 2) {
        seamFactor = 0.55 + distBorder * 0.15; // Dark recessed joint
      } else if (distBorder < 5) {
        seamFactor = 0.85 + (distBorder - 2) * 0.05; // Beveled chamfer
      }

      // Formwork tie-rod anchor holes (4 per panel)
      const tiePoints = [
        [18, 14], [panelW - 18, 14],
        [18, panelH - 14], [panelW - 18, panelH - 14],
      ];
      let minTieDist = 999;
      for (const [tx, ty] of tiePoints) {
        const d = Math.hypot(px - tx, py - ty);
        if (d < minTieDist) minTieDist = d;
      }
      let tieFactor = 1.0;
      if (minTieDist < 3.2) {
        tieFactor = 0.45; // Dark tie rod center
      } else if (minTieDist < 5.0) {
        tieFactor = 0.75 + (minTieDist - 3.2) * 0.12; // Circular indentation ring
      }

      // Multi-frequency concrete grain & aggregate noise
      const nFine = (pseudoRandom(x, y, 42) - 0.5) * 14;
      const nMid = (smoothNoise(x, y, 77, 8) - 0.5) * 18;
      const nCoarse = (smoothNoise(x, y, 99, 32) - 0.5) * 12;
      const surfaceVariation = nFine + nMid + nCoarse;

      // Base concrete tones (Novovoronezh / Rosatom light sand-grey industrial concrete)
      const baseR = 196;
      const baseG = 193;
      const baseB = 186;

      const panelSeed = Math.floor(x / panelW) + Math.floor(y / panelH) * 5;
      const panelTint = (pseudoRandom(panelSeed, panelSeed, 13) - 0.5) * 8;

      const r = THREE.MathUtils.clamp(Math.round((baseR + surfaceVariation + panelTint) * seamFactor * tieFactor), 0, 255);
      const g = THREE.MathUtils.clamp(Math.round((baseG + surfaceVariation + panelTint) * seamFactor * tieFactor), 0, 255);
      const b = THREE.MathUtils.clamp(Math.round((baseB + surfaceVariation * 0.9 + panelTint) * seamFactor * tieFactor), 0, 255);

      const cIdx = idx * 4;
      colorData[cIdx] = r;
      colorData[cIdx + 1] = g;
      colorData[cIdx + 2] = b;
      colorData[cIdx + 3] = 255;

      // Realistic roughness 0.85 (0.85 * 255 ≈ 217)
      // Slightly higher roughness (more matte) on seams and textured aggregate
      const roughVal = THREE.MathUtils.clamp(
        Math.round(217 + (1.0 - seamFactor) * 20 + (1.0 - tieFactor) * 25 + (nFine * 0.8)),
        180,
        255
      );
      roughnessData[cIdx] = roughVal;
      roughnessData[cIdx + 1] = roughVal;
      roughnessData[cIdx + 2] = roughVal;
      roughnessData[cIdx + 3] = 255;

      // Heightmap for normal calculation (128 = neutral, seams are lower)
      const height = (128 + surfaceVariation * 0.8) * seamFactor * tieFactor;
      heights[idx] = height / 255.0;
    }
  }

  const normalData = buildNormalMap(heights, 2.4);

  return {
    map: makeTexture(colorData, SIZE, true, 4, 8),
    roughnessMap: makeTexture(roughnessData, SIZE, false, 4, 8),
    normalMap: makeTexture(normalData, SIZE, false, 4, 8),
  };
}

// --------------------------------------------------------------------------------
// 2. Floor Tile PBR: Dark grey anti-slip floor tiles for the main deck (+15.0m)
// --------------------------------------------------------------------------------
function createFloorTileMaps() {
  const colorData = new Uint8Array(SIZE * SIZE * 4);
  const roughnessData = new Uint8Array(SIZE * SIZE * 4);
  const heights = new Float32Array(SIZE * SIZE);

  const tileSize = 64; // 4x4 tiles per 256px texture

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = y * SIZE + x;
      const tx = x % tileSize;
      const ty = y % tileSize;
      const distBorder = Math.min(tx, tileSize - tx, ty, tileSize - ty);

      // Deep dark grout joint
      let groutFactor = 1.0;
      if (distBorder < 2) {
        groutFactor = 0.42; // Deep dark grout
      } else if (distBorder < 4) {
        groutFactor = 0.75 + (distBorder - 2) * 0.12; // Chamfered tile edge
      }

      // Anti-slip stippled grit micro-texture
      const grit = (pseudoRandom(x, y, 101) - 0.5) * 14;
      const tileId = Math.floor(x / tileSize) + Math.floor(y / tileSize) * 4;
      const tileShade = (pseudoRandom(tileId, tileId, 88) - 0.5) * 6;

      // Dark grey base for Rosatom anti-slip deck tiles (#363b40)
      const baseR = 54;
      const baseG = 58;
      const baseB = 64;

      const r = THREE.MathUtils.clamp(Math.round((baseR + grit + tileShade) * groutFactor), 0, 255);
      const g = THREE.MathUtils.clamp(Math.round((baseG + grit + tileShade) * groutFactor), 0, 255);
      const b = THREE.MathUtils.clamp(Math.round((baseB + grit + tileShade) * groutFactor), 0, 255);

      const cIdx = idx * 4;
      colorData[cIdx] = r;
      colorData[cIdx + 1] = g;
      colorData[cIdx + 2] = b;
      colorData[cIdx + 3] = 255;

      // Anti-slip matte finish (roughness ~ 0.74, grout ~ 0.9)
      const roughVal = THREE.MathUtils.clamp(Math.round(188 + (1.0 - groutFactor) * 50 + grit * 0.6), 160, 255);
      roughnessData[cIdx] = roughVal;
      roughnessData[cIdx + 1] = roughVal;
      roughnessData[cIdx + 2] = roughVal;
      roughnessData[cIdx + 3] = 255;

      // Height: recessed grout joints + surface grit
      const h = (128 + grit * 0.6) * groutFactor;
      heights[idx] = h / 255.0;
    }
  }

  const normalData = buildNormalMap(heights, 2.6);

  return {
    map: makeTexture(colorData, SIZE, true, 8, 8),
    roughnessMap: makeTexture(roughnessData, SIZE, false, 8, 8),
    normalMap: makeTexture(normalData, SIZE, false, 8, 8),
  };
}

// --------------------------------------------------------------------------------
// 3. Diamond-Plate Metal PBR: Walkways & service platforms pattern
// --------------------------------------------------------------------------------
function createDiamondPlateMaps() {
  const colorData = new Uint8Array(SIZE * SIZE * 4);
  const roughnessData = new Uint8Array(SIZE * SIZE * 4);
  const heights = new Float32Array(SIZE * SIZE);

  const cell = 32; // 8x8 diamond units in 256px

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = y * SIZE + x;
      const cx = x % cell;
      const cy = y % cell;
      const cellX = Math.floor(x / cell);
      const cellY = Math.floor(y / cell);
      const isAlt = (cellX + cellY) % 2 === 0;

      // Calculate distance to diamond lug center
      // Alternating 45-degree angled diamond lugs
      const dx = cx - cell / 2;
      const dy = cy - cell / 2;

      // Rotate 45 or -45 degrees
      const rotAngle = isAlt ? Math.PI / 4 : -Math.PI / 4;
      const rx = dx * Math.cos(rotAngle) - dy * Math.sin(rotAngle);
      const ry = dx * Math.sin(rotAngle) + dy * Math.cos(rotAngle);

      // Diamond lug shape: elongated ellipse / rhombus
      const normDist = Math.hypot(rx / 10.0, ry / 4.2);
      let lugHeight = 0;
      if (normDist < 1.0) {
        lugHeight = Math.cos(normDist * Math.PI * 0.5); // Smooth dome profile
      }

      // Base steel tone with specular highlight on raised lugs
      const baseSteel = 148;
      const highlight = lugHeight * 58;
      const fineGrit = (pseudoRandom(x, y, 55) - 0.5) * 6;

      const val = THREE.MathUtils.clamp(Math.round(baseSteel + highlight + fineGrit), 0, 255);

      const cIdx = idx * 4;
      colorData[cIdx] = val;
      colorData[cIdx + 1] = Math.round(val * 1.02);
      colorData[cIdx + 2] = Math.round(val * 1.05);
      colorData[cIdx + 3] = 255;

      // Polished shiny lug tops (roughness 0.28), rougher base plate (0.55)
      const roughVal = THREE.MathUtils.clamp(Math.round(140 - lugHeight * 68 + fineGrit * 2), 65, 200);
      roughnessData[cIdx] = roughVal;
      roughnessData[cIdx + 1] = roughVal;
      roughnessData[cIdx + 2] = roughVal;
      roughnessData[cIdx + 3] = 255;

      // Height
      heights[idx] = (100 + lugHeight * 120) / 255.0;
    }
  }

  const normalData = buildNormalMap(heights, 3.2);

  return {
    map: makeTexture(colorData, SIZE, true, 6, 6),
    roughnessMap: makeTexture(roughnessData, SIZE, false, 6, 6),
    normalMap: makeTexture(normalData, SIZE, false, 6, 6),
  };
}

// --------------------------------------------------------------------------------
// 4. Brushed Steel PBR: Machinery, piping & vessels
// --------------------------------------------------------------------------------
function createBrushedSteelMaps() {
  const colorData = new Uint8Array(SIZE * SIZE * 4);
  const roughnessData = new Uint8Array(SIZE * SIZE * 4);
  const heights = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = y * SIZE + x;
      // Linear brushed horizontal grain
      const grain = Math.sin(y * 1.8) * 8 + (pseudoRandom(Math.floor(x / 2), y, 33) - 0.5) * 12;
      const base = 180 + grain;

      const cIdx = idx * 4;
      colorData[cIdx] = THREE.MathUtils.clamp(Math.round(base * 0.95), 0, 255);
      colorData[cIdx + 1] = THREE.MathUtils.clamp(Math.round(base), 0, 255);
      colorData[cIdx + 2] = THREE.MathUtils.clamp(Math.round(base * 1.05), 0, 255);
      colorData[cIdx + 3] = 255;

      // Low roughness for metallic finish ~ 0.28
      const r = THREE.MathUtils.clamp(Math.round(72 + Math.abs(grain) * 1.5), 50, 140);
      roughnessData[cIdx] = r;
      roughnessData[cIdx + 1] = r;
      roughnessData[cIdx + 2] = r;
      roughnessData[cIdx + 3] = 255;

      heights[idx] = (128 + grain * 0.8) / 255.0;
    }
  }

  const normalData = buildNormalMap(heights, 1.4);

  return {
    map: makeTexture(colorData, SIZE, true, 3, 3),
    roughnessMap: makeTexture(roughnessData, SIZE, false, 3, 3),
    normalMap: makeTexture(normalData, SIZE, false, 3, 3),
  };
}

// Generate singleton PBR map instances
const concreteMaps = createConcreteMaps();
const floorTileMaps = createFloorTileMaps();
const diamondPlateMaps = createDiamondPlateMaps();
const brushedSteelMaps = createBrushedSteelMaps();

export const concreteMap = concreteMaps.map;
export const concreteRoughnessMap = concreteMaps.roughnessMap;
export const concreteNormalMap = concreteMaps.normalMap;

export const floorTileMap = floorTileMaps.map;
export const floorTileRoughnessMap = floorTileMaps.roughnessMap;
export const floorTileNormalMap = floorTileMaps.normalMap;

export const diamondPlateMap = diamondPlateMaps.map;
export const diamondPlateRoughnessMap = diamondPlateMaps.roughnessMap;
export const diamondPlateNormalMap = diamondPlateMaps.normalMap;

export const brushedSteelMap = brushedSteelMaps.map;
export const brushedSteelRoughnessMap = brushedSteelMaps.roughnessMap;
export const brushedSteelNormalMap = brushedSteelMaps.normalMap;
