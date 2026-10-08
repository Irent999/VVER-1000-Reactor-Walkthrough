/**
 * ============================================================================
 * МОДУЛЬ ОКРУЖЕНИЯ И ВИЗУАЛЬНОГО СТИЛЯ ГЕНПЛАНА АЭС ДЛЯ THREE.JS / WEBXR
 * ============================================================================
 * 
 * Включает:
 * 1. Небо и Солнце (Sky.js) с углом возвышения 45° и голубой атмосферой
 * 2. Мягкий туман THREE.FogExp2(0x87ceeb, 0.0025) в тон неба
 * 3. DirectionalLight (солнечный свет с мягкими тенями) + HemisphereLight (небо/земля)
 * 4. Процедурные повторяющиеся бесшовные текстуры травы и гравия
 * 5. Травянистый газонный материал (MeshStandardMaterial, roughness: 0.85)
 * 6. WebXR/VR оптимизации для стабильных 72-90 FPS
 */

import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// ============================================================================
// 1. ПРОЦЕДУРНЫЕ ТЕКСТУРЫ СТЕПИ, ПЕСКА И ГРАВИЯ (HIGH-PERFORMANCE PROCEDURAL CANVAS)
// ============================================================================

export interface ProceduralTextureOptions {
  size?: number;
  repeatX?: number;
  repeatY?: number;
}

/**
 * Создает процедурную повторяющуюся бесшовную текстуру полупустынной глинисто-песчаной степи
 * (рельеф Джизакской области / оз. Тузкан) с естественными выгоревшими травами и суглинком.
 */
export function createProceduralSteppeTexture(options: ProceduralTextureOptions = {}): {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = options.size ?? 256;
  const repeatX = options.repeatX ?? 45;
  const repeatY = options.repeatY ?? 45;

  // 1. Color canvas
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  // Базовый цвет сухой глинистой полупустынной степи (0xC2B280 / 0xA39B7B)
  ctx.fillStyle = '#bda87a';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Roughness & height buffer
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImgData = roughCtx.createImageData(size, size);
  const roughData = roughImgData.data;

  // Heights for normal map
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const hIdx = y * size + x;

      // Многослойный шум полупустынной песчано-глинистой почвы с вкраплениями сухого кустарника
      const n1 = Math.sin(x * 0.16 + Math.cos(y * 0.20) * 2.2) * 0.5 + 0.5;
      const n2 = (Math.sin(x * 0.48 + y * 0.32) * Math.cos(y * 0.65 - x * 0.28)) * 0.5 + 0.5;
      const grain = (Math.random() - 0.5) * 0.22;
      const noise = THREE.MathUtils.clamp(n1 * 0.55 + n2 * 0.35 + grain + 0.05, 0, 1);

      // Песчано-бежевые и сухие глинистые оттенки (0xC2B280 - 0xA39B7B)
      const r = Math.round(184 + (noise - 0.5) * 42); // ~163 - 205
      const g = Math.round(168 + (noise - 0.5) * 38); // ~149 - 187
      const b = Math.round(122 + (noise - 0.5) * 28); // ~108 - 136

      data[idx] = THREE.MathUtils.clamp(r, 0, 255);
      data[idx + 1] = THREE.MathUtils.clamp(g, 0, 255);
      data[idx + 2] = THREE.MathUtils.clamp(b, 0, 255);
      data[idx + 3] = 255;

      // Высокая шероховатость сухой земли/песка ~ 0.88 - 0.94
      const roughVal = Math.round(226 + noise * 18);
      roughData[idx] = roughVal;
      roughData[idx + 1] = roughVal;
      roughData[idx + 2] = roughVal;
      roughData[idx + 3] = 255;

      heights[hIdx] = noise;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  roughCtx.putImageData(roughImgData, 0, 0);

  // Normal map canvas
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normalCtx = normalCanvas.getContext('2d')!;
  const normalImg = normalCtx.createImageData(size, size);
  const normalData = normalImg.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const left = heights[y * size + ((x + size - 1) % size)];
      const right = heights[y * size + ((x + 1) % size)];
      const up = heights[((y + size - 1) % size) * size + x];
      const down = heights[((y + 1) % size) * size + x];

      const dx = (left - right) * 1.5;
      const dy = (up - down) * 1.5;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      normalData[idx] = Math.round((dx / len * 0.5 + 0.5) * 255);
      normalData[idx + 1] = Math.round((dy / len * 0.5 + 0.5) * 255);
      normalData[idx + 2] = Math.round((dz / len * 0.5 + 0.5) * 255);
      normalData[idx + 3] = 255;
    }
  }
  normalCtx.putImageData(normalImg, 0, 0);

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(repeatX, repeatY);
  colorMap.generateMipmaps = true;
  colorMap.minFilter = THREE.LinearMipmapLinearFilter;
  colorMap.magFilter = THREE.LinearFilter;
  colorMap.colorSpace = THREE.SRGBColorSpace;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeatX, repeatY);
  roughnessMap.generateMipmaps = true;

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(repeatX, repeatY);
  normalMap.generateMipmaps = true;

  return { colorMap, roughnessMap, normalMap };
}

// Для совместимости оставляем алиас createProceduralGrassTexture
export const createProceduralGrassTexture = createProceduralSteppeTexture;

/**
 * Создает процедурную повторяющуюся текстуру серого гравия (0x808080) для промышленной площадки
 */
export function createProceduralGravelTexture(options: ProceduralTextureOptions = {}): {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = options.size ?? 256;
  const repeatX = options.repeatX ?? 40;
  const repeatY = options.repeatY ?? 40;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Базовый цвет серого гравийного/асфальтового покрытия (0x808080)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * 36;
    const g = THREE.MathUtils.clamp(128 + grain, 0, 255);
    data[i] = g;
    data[i + 1] = g;
    data[i + 2] = g;
  }

  ctx.putImageData(imgData, 0, 0);

  const colorMap = new THREE.CanvasTexture(canvas);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(repeatX, repeatY);
  colorMap.generateMipmaps = true;
  colorMap.minFilter = THREE.LinearMipmapLinearFilter;
  colorMap.colorSpace = THREE.SRGBColorSpace;

  // Roughness texture
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#e8e8e8';
  rctx.fillRect(0, 0, size, size);
  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeatX, repeatY);

  // Normal texture
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const nctx = normCanvas.getContext('2d')!;
  nctx.fillStyle = '#8080ff';
  nctx.fillRect(0, 0, size, size);
  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(repeatX, repeatY);

  return { colorMap, roughnessMap, normalMap };
}

// ============================================================================
// 2. МАТЕРИАЛЫ ЛАНДШАФТА И СТЕПИ ДЖИЗАКСКОЙ ОБЛАСТИ (ОЗЕРО ТУЗКАН)
// ============================================================================

/**
 * Материал полупустынного степного рельефа Джизакской области
 * Естественный песчано-степной оттенок: 0xC2B280 (песчано-бежевый) или 0xA39B7B (сухая глина)
 */
export function createSteppeTerrainMaterial(options: { repeat?: number; color?: number | string } = {}): THREE.MeshStandardMaterial {
  const repeat = options.repeat ?? 50;
  const steppeTextures = createProceduralSteppeTexture({ repeatX: repeat, repeatY: repeat });

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(options.color ?? 0xC2B280), // Песчано-бежевый цвет полупустыни
    roughness: 0.92,
    metalness: 0.02,
    map: steppeTextures.colorMap,
    roughnessMap: steppeTextures.roughnessMap,
    normalMap: steppeTextures.normalMap,
    normalScale: new THREE.Vector2(0.28, 0.28),
    flatShading: false,
  });
}

/**
 * Материал серого/гравийного покрытия внутренней промышленной площадки АЭС (0x808080)
 */
export function createIndustrialSitePlatformMaterial(options: { repeat?: number } = {}): THREE.MeshStandardMaterial {
  const repeat = options.repeat ?? 35;
  const gravelTextures = createProceduralGravelTexture({ repeatX: repeat, repeatY: repeat });

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x808080), // Серое гравийное покрытие промплощадки
    roughness: 0.88,
    metalness: 0.04,
    map: gravelTextures.colorMap,
    roughnessMap: gravelTextures.roughnessMap,
    normalMap: gravelTextures.normalMap,
    normalScale: new THREE.Vector2(0.3, 0.3),
  });
}

/**
 * Материал холмов и горизонтных гряд: сухой серо-оливковый / выгоревшая степь (0x8B8C7A)
 */
export function createDistantHillsMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x8B8C7A), // Сухой серо-оливковый оттенок
    roughness: 0.95,
    metalness: 0.01,
    flatShading: true,
  });
}

// Singleton инстансы
export const jizzakhSteppeTerrainMaterial = typeof document !== 'undefined'
  ? createSteppeTerrainMaterial({ repeat: 50, color: 0xC2B280 })
  : new THREE.MeshStandardMaterial({ color: 0xC2B280, roughness: 0.92 });

export const industrialSitePlatformMaterial = typeof document !== 'undefined'
  ? createIndustrialSitePlatformMaterial({ repeat: 35 })
  : new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.88 });

export const distantHillsMaterial = new THREE.MeshStandardMaterial({
  color: 0x8B8C7A,
  roughness: 0.95,
  metalness: 0.01,
  flatShading: true,
});

// Обратная совместимость с предыдущими именами экспорта
export const siteGrassLawnMaterial = jizzakhSteppeTerrainMaterial;
export const createGrassLawnMaterial = createSteppeTerrainMaterial;

// ============================================================================
// 3. ПОЛНАЯ СИСТЕМА ОКРУЖЕНИЯ: НЕБО, ТУМАН, СВЕТ, WebXR
// ============================================================================

export interface NPPEnvironmentConfig {
  sunElevationDeg?: number;      // Высота солнца (по ТЗ: 45°)
  sunAzimuthDeg?: number;        // Азимут солнца
  turbidity?: number;            // Мутность атмосферы
  rayleigh?: number;             // Рэлеевское рассеяние (голубой оттенок неба)
  fogColor?: number;             // Цвет тумана: мягкий пыльно-голубой/песчано-голубой 0xB0C4DE / 0x9CB0C3
  fogDensity?: number;           // Плотность экспоненциального тумана (0.0022)
  enableSoftShadows?: boolean;   // Включение мягких теней
  shadowMapSize?: number;        // Разрешение теней (2048 для Desktop, 1024 для VR)
}

export interface NPPEnvironmentInstance {
  sky: Sky;
  sunPosition: THREE.Vector3;
  dirLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  fog: THREE.FogExp2;
  dispose: () => void;
}

/**
 * Главный инициализатор визуального стиля генплана АЭС.
 * Настраивает Sky, атмосферу, туман FogExp2, DirectionalLight и HemisphereLight под полупустынный степной климат.
 */
export function setupNPPEnvironment(
  scene: THREE.Scene,
  renderer?: THREE.WebGLRenderer,
  config: NPPEnvironmentConfig = {}
): NPPEnvironmentInstance {
  const {
    sunElevationDeg = 45,       // Солнце на высоте 45°
    sunAzimuthDeg = 135,
    turbidity = 2.8,            // Легкая сухая песчаная дымка степи
    rayleigh = 1.15,            // Естественный пыльно-голубой тон неба
    fogColor = 0x9CB0C3,        // Мягкий песчано-голубой оттенок горизонта для сухого климата
    fogDensity = 0.0022,        // Мягкий туман для естественного слияния земли, озера и неба
    enableSoftShadows = true,
    shadowMapSize = 2048,
  } = config;

  // 1. АТМОСФЕРА И ТУМАН (THREE.FogExp2)
  const fog = new THREE.FogExp2(fogColor, fogDensity);
  scene.fog = fog;
  scene.background = new THREE.Color(fogColor);

  // 2. НЕБО И СОЛНЦЕ (Sky.js)
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);

  // Расчет сферических координат положения солнца
  const sunPosition = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(90 - sunElevationDeg);
  const theta = THREE.MathUtils.degToRad(sunAzimuthDeg);
  sunPosition.setFromSphericalCoords(1, phi, theta);

  // Настройка параметров атмосферного шейдера Sky
  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = turbidity;
  skyUniforms['rayleigh'].value = rayleigh;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.84;
  skyUniforms['sunPosition'].value.copy(sunPosition);

  // 3. ОСВЕЩЕНИЕ: DirectionalLight (солнечный свет под углом 45°)
  const sunDistance = 140;
  const dirLight = new THREE.DirectionalLight(0xfffaed, 2.6);
  dirLight.position.copy(sunPosition).multiplyScalar(sunDistance);
  dirLight.target.position.set(0, 0, 0);
  scene.add(dirLight);
  scene.add(dirLight.target);

  // Настройка мягких теней для индустриальной площадки АЭС
  if (enableSoftShadows) {
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = shadowMapSize;
    dirLight.shadow.mapSize.height = shadowMapSize;

    // Оптимальный охват площадки (радиус 160м вокруг энергоблоков)
    const d = 160;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 400;
    dirLight.shadow.bias = -0.00015;
    dirLight.shadow.radius = 2.4; // Мягкие размытые края теней
  }

  // 4. ОСВЕЩЕНИЕ: HemisphereLight (небо / полупустынная песчаная земля)
  // Небесный тон (0x9CB0C3) и теплый сухой песчано-степной тон земли (0x8B7E66)
  const hemiLight = new THREE.HemisphereLight(0x9CB0C3, 0x8B7E66, 0.78);
  hemiLight.position.set(0, 80, 0);
  scene.add(hemiLight);

  // 5. ОПТИМИЗАЦИЯ ДЛЯ WEBXR / VR РЕНДЕРИНГА
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    if (enableSoftShadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Мягкая фильтрация теней
    }
  }

  const dispose = () => {
    scene.remove(sky);
    scene.remove(dirLight);
    scene.remove(dirLight.target);
    scene.remove(hemiLight);
    sky.geometry.dispose();
    sky.material.dispose();
    dirLight.dispose();
  };

  return {
    sky,
    sunPosition,
    dirLight,
    hemiLight,
    fog,
    dispose,
  };
}
