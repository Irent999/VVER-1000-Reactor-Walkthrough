import * as THREE from 'three';

const SIZE = 128;

function hash(x: number, y: number, seed: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function makeMaps(base: [number, number, number], seed: number, brushed = false) {
  const colorData = new Uint8Array(SIZE * SIZE * 4);
  const heightData = new Uint8Array(SIZE * SIZE * 4);
  const roughnessData = new Uint8Array(SIZE * SIZE * 4);
  const heights = new Uint8Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = y * SIZE + x;
      const fineNoise = (hash(x, y, seed) - 0.5) * (brushed ? 9 : 22);
      const coarseNoise = (hash(Math.floor(x / 4), Math.floor(y / 4), seed + 1) - 0.5) * (brushed ? 6 : 14);
      const grain = brushed ? Math.sin(y * 0.64) * 4 : 0;
      const height = THREE.MathUtils.clamp(Math.round(128 + fineNoise + coarseNoise + grain), 0, 255);
      heights[index] = height;

      const colorNoise = (hash(x, y, seed + 2) - 0.5) * (brushed ? 13 : 16);
      const colorIndex = index * 4;
      colorData[colorIndex] = THREE.MathUtils.clamp(Math.round(base[0] + colorNoise), 0, 255);
      colorData[colorIndex + 1] = THREE.MathUtils.clamp(Math.round(base[1] + colorNoise), 0, 255);
      colorData[colorIndex + 2] = THREE.MathUtils.clamp(Math.round(base[2] + colorNoise), 0, 255);
      colorData[colorIndex + 3] = 255;
      roughnessData[colorIndex] = THREE.MathUtils.clamp(Math.round((brushed ? 176 : 220) + fineNoise * 2), 0, 255);
      roughnessData[colorIndex + 1] = roughnessData[colorIndex];
      roughnessData[colorIndex + 2] = roughnessData[colorIndex];
      roughnessData[colorIndex + 3] = 255;
    }
  }

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = y * SIZE + x;
      const left = heights[y * SIZE + ((x + SIZE - 1) % SIZE)];
      const right = heights[y * SIZE + ((x + 1) % SIZE)];
      const up = heights[((y + SIZE - 1) % SIZE) * SIZE + x];
      const down = heights[((y + 1) % SIZE) * SIZE + x];
      const nx = (left - right) / 90;
      const ny = (up - down) / 90;
      const length = Math.hypot(nx, ny, 1);
      const colorIndex = index * 4;
      heightData[colorIndex] = Math.round((nx / length * 0.5 + 0.5) * 255);
      heightData[colorIndex + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      heightData[colorIndex + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      heightData[colorIndex + 3] = 255;
    }
  }

  const texture = (data: Uint8Array) => {
    const ownedData = new Uint8Array(data.length);
    ownedData.set(data);
    const result = new THREE.DataTexture(ownedData, SIZE, SIZE, THREE.RGBAFormat);
    result.wrapS = THREE.RepeatWrapping;
    result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(brushed ? 2 : 4, brushed ? 6 : 4);
    result.generateMipmaps = true;
    result.minFilter = THREE.LinearMipmapLinearFilter;
    result.magFilter = THREE.LinearFilter;
    result.needsUpdate = true;
    return result;
  };

  const map = texture(colorData);
  map.colorSpace = THREE.SRGBColorSpace;

  return {
    map,
    roughnessMap: texture(roughnessData),
    normalMap: texture(heightData),
  };
}

const concreteMaps = makeMaps([184, 181, 173], 11);
const steelMaps = makeMaps([143, 153, 165], 37, true);

export const concreteMap = concreteMaps.map;
export const concreteRoughnessMap = concreteMaps.roughnessMap;
export const concreteNormalMap = concreteMaps.normalMap;
export const brushedSteelMap = steelMaps.map;
export const brushedSteelRoughnessMap = steelMaps.roughnessMap;
export const brushedSteelNormalMap = steelMaps.normalMap;
