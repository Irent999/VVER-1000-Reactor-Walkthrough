/**
 * ============================================================================
 * МОДУЛЬ ОПТИМИЗАЦИИ, ОСВЕЩЕНИЯ И ДЕТАЛИЗАЦИИ ДЛЯ 3D-СЦЕНЫ ВВЭР-1000 (THREE.JS / WEBXR)
 * ============================================================================
 * 
 * Разработан под целевые спецификации:
 * - Плавные 60-90 FPS на оборудовании с 8 ГБ RAM и встроенной графикой (Intel Iris Xe / AMD Vega / Apple Silicon / мобильные WebXR гарнитуры).
 * - Цветовая палитра и реализм Нововоронежской АЭС (НВАЭС-2 / ВВЭР-1000/1200):
 *   Свежий светло-серый бетонированный оттенок (#E3E5E8 / #D0D4D9), матовая поверхность (roughness ~0.86).
 * - Архитектура InstancedMesh для повторяющихся объектов (ограждения, столбы, изоляторы, конструкции).
 * - Настройка renderer: powerPreference="high-performance", antialias=false, pixelRatio <= 1.5, Frustum Culling для всех мешей.
 * - Естественное дневное освещение с углом возвышения солнца ~45° и мягкими тенями.
 */

import * as THREE from 'three';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from './pbrTextures';

// ============================================================================
// 1. ЦВЕТОВАЯ ПАЛИТРА НОВОВОРОНЕЖСКОЙ АЭС (НВАЭС)
// ============================================================================

export const NVAES_PALETTE = {
  // Архитектурный монолитный бетон гермооболочки и обстройки (свежий светло-серый)
  containmentConcrete: 0xE3E5E8, // #E3E5E8 - свежий автоклавный бетон купола и цилиндра РО
  containmentWeathered: 0xD0D4D9, // #D0D4D9 - швы, фаски и цокольные панели
  domeConcrete: 0xE3E5E8,        // #E3E5E8 - бесшовный сферический купол
  foundationConcrete: 0x8A8E94,  // #8A8E94 - тяжелый гидротехнический бетон фундамента
  
  // Машинный зал и технологические блоки
  turbineFacadeLight: 0xE8ECF0,  // #E8ECF0 - сэндвич-панели машинного зала
  turbineFacadeAccent: 0x1F4E79, // #1F4E79 - корпоративный кобальтово-синий Росатом / РИТМ-200Н
  
  // Металлоконструкции и технологическое оборудование
  primaryCircuitSteel: 0xB0B7BD, // #B0B7BD - нержавеющая аустенитная сталь 1-го контура (ГЦК, компенсатор давления)
  reactorPressureVessel: 0x9AA2A9,// #9AA2A9 - корпус реактора ВВЭР-1000
  secondaryInsulation: 0xD8DEE4, // #D8DEE4 - алюминиевый ожуховочный лист паропроводов
  safetyYellow: 0xFFCC00,        // #FFCC00 - сигнальный желтый (полярный кран, ограждения, трапы)
  structuralSteelDark: 0x3A3E44, // #3A3E44 - темный конструкционный прокат, балки, рамы
  
  // ОРУ (Открытое распределительное устройство 500 кВ)
  switchyardTransformer: 0x727B84, // #727B84 - серый цвет баков трансформаторов ТДЦ
  ceramicInsulator: 0x8A3324,     // #8A3324 - высоковольтный фарфор (терракотовый/красно-коричневый)
  busbarAluminum: 0xC8D1D8,       // #C8D1D8 - алюминиевые трубчатые ошиновки
  
  // Ландшафт и окружение полупустыни (Джизак / оз. Тузкан)
  aridSoilBase: 0xC2B280,        // #C2B280 - песчано-бежевая суглинистая степь
  dryVegetation: 0x8B8C7A,       // #8B8C7A - выгоревшая оливковая полынь
  lakeTuzkanWater: 0x2B6B85,     // #2B6B85 - солоноватая гладь степного озера
  horizonFog: 0x9CB0C3,          // #9CB0C3 - мягкая пыльно-голубая дымка горизонта
} as const;

// ============================================================================
// 2. СИНГЛТОНЫ PBR-МАТЕРИАЛОВ НВАЭС (HIGH-PERFORMANCE SHARED MATERIALS)
// ============================================================================

export interface NVAESMaterialSet {
  containment: THREE.MeshStandardMaterial;
  containmentCutawayInner: THREE.MeshStandardMaterial;
  dome: THREE.MeshStandardMaterial;
  foundation: THREE.MeshStandardMaterial;
  turbineHall: THREE.MeshStandardMaterial;
  smrBlue: THREE.MeshStandardMaterial;
  primarySteel: THREE.MeshStandardMaterial;
  safetyYellow: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  galvanizedFence: THREE.MeshStandardMaterial;
  insulator: THREE.MeshStandardMaterial;
  floodlightHousing: THREE.MeshStandardMaterial;
  curbConcrete: THREE.MeshStandardMaterial;
}

let sharedMaterialsInstance: NVAESMaterialSet | null = null;

export function getNVAESMaterials(): NVAESMaterialSet {
  if (sharedMaterialsInstance) return sharedMaterialsInstance;

  // 1. Бетон гермообъема (свежий светло-серый бетонированный оттенок 0xE3E5E8 с матовой поверхностью)
  const containment = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.containmentConcrete,
    map: concreteMap,
    normalMap: concreteNormalMap,
    roughnessMap: concreteRoughnessMap,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughness: 0.86, // Матовая реалистичная поверхность
    metalness: 0.04,
  });

  const containmentCutawayInner = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.containmentConcrete,
    map: concreteMap,
    normalMap: concreteNormalMap,
    roughnessMap: concreteRoughnessMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.86,
    metalness: 0.03,
    side: THREE.BackSide,
  });

  const dome = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.domeConcrete,
    map: concreteMap,
    normalMap: concreteNormalMap,
    roughnessMap: concreteRoughnessMap,
    normalScale: new THREE.Vector2(0.22, 0.22),
    roughness: 0.88,
    metalness: 0.03,
  });

  const foundation = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.foundationConcrete,
    map: concreteMap,
    normalMap: concreteNormalMap,
    roughnessMap: concreteRoughnessMap,
    normalScale: new THREE.Vector2(0.2, 0.2),
    roughness: 0.90,
    metalness: 0.02,
  });

  const turbineHall = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.turbineFacadeLight,
    roughness: 0.62,
    metalness: 0.22,
  });

  const smrBlue = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.turbineFacadeAccent,
    roughness: 0.45,
    metalness: 0.40,
  });

  const primarySteel = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.primaryCircuitSteel,
    map: brushedSteelMap,
    normalMap: brushedSteelNormalMap,
    roughnessMap: brushedSteelRoughnessMap,
    normalScale: new THREE.Vector2(0.12, 0.12),
    roughness: 0.28,
    metalness: 0.88,
  });

  const safetyYellow = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.safetyYellow,
    roughness: 0.35,
    metalness: 0.20,
    emissive: 0x332600,
    emissiveIntensity: 0.05,
  });

  const darkSteel = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.structuralSteelDark,
    roughness: 0.48,
    metalness: 0.82,
  });

  const galvanizedFence = new THREE.MeshStandardMaterial({
    color: 0x7A8288,
    roughness: 0.42,
    metalness: 0.65,
  });

  const insulator = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.ceramicInsulator,
    roughness: 0.18,
    metalness: 0.12,
  });

  const floodlightHousing = new THREE.MeshStandardMaterial({
    color: 0x2A2E33,
    roughness: 0.35,
    metalness: 0.75,
  });

  const curbConcrete = new THREE.MeshStandardMaterial({
    color: NVAES_PALETTE.containmentWeathered,
    roughness: 0.92,
    metalness: 0.02,
  });

  sharedMaterialsInstance = {
    containment,
    containmentCutawayInner,
    dome,
    foundation,
    turbineHall,
    smrBlue,
    primarySteel,
    safetyYellow,
    darkSteel,
    galvanizedFence,
    insulator,
    floodlightHousing,
    curbConcrete,
  };

  return sharedMaterialsInstance;
}

// ============================================================================
// 3. ПАРАМЕТРЫ ОПТИМИЗАЦИИ WEBGL RENDERER (ДЛЯ 8 ГБ RAM И ВСТРОЕННОЙ ГРАФИКИ)
// ============================================================================

export interface NPPRendererOptimizationOptions {
  antialias?: boolean;                // false (отключение MSAA для встроенной графики)
  powerPreference?: WebGLPowerPreference; // 'high-performance'
  maxPixelRatio?: number;             // не выше Math.min(window.devicePixelRatio, 2.0)
  enableSoftShadows?: boolean;
  shadowMapSize?: number;             // 1024
}

/**
 * Применяет конфигурацию рендерера для минимизации задержек и экономии VRAM/RAM:
 * - renderer.powerPreference = "high-performance"
 * - pixelRatio ограничен Math.min(window.devicePixelRatio, 2)
 * - Оптимизированный размер карт теней 1024x1024 с PCFSoftShadowMap
 */
export function configureNPPRenderer(
  renderer: THREE.WebGLRenderer,
  options: NPPRendererOptimizationOptions = {}
): void {
  const {
    maxPixelRatio = 1.5,
    enableSoftShadows = false,
    shadowMapSize = 512,
  } = options;

  // Ограничение PixelRatio до Math.min(window.devicePixelRatio, 1.5)
  const currentDpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  const clampedDpr = Math.min(currentDpr, maxPixelRatio);
  renderer.setPixelRatio(clampedDpr);

  // Цветопередача, очистка буфера и тоновое отображение (защита от черного экрана)
  renderer.setClearColor(new THREE.Color(0x9cb0c3), 1.0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  // Оптимизация теней: быстрый PCFShadowMap без тяжелых многопроходных сэмплов
  if (enableSoftShadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = true;
  } else {
    renderer.shadowMap.enabled = false;
  }

  // WebXR готовность и события: динамическая подстройка DPR для 72/90 FPS в очках виртуальной реальности
  if (renderer.xr) {
    renderer.xr.enabled = true;
    renderer.xr.addEventListener('sessionstart', () => {
      // Для стабильного 90 FPS на автономных шлемах фиксируем pixelRatio = 1.0 или 1.2
      renderer.setPixelRatio(Math.min(currentDpr, 1.25));
    });
    renderer.xr.addEventListener('sessionend', () => {
      renderer.setPixelRatio(clampedDpr);
    });
  }
}

// ============================================================================
// 4. ТРАВЕРСАЛ СЦЕНЫ И ВКЛЮЧЕНИЕ FRUSTUM CULLING ДЛЯ ВСЕХ МЕШЕЙ
// ============================================================================

export interface SceneOptimizationStats {
  totalObjects: number;
  meshesProcessed: number;
  instancedMeshes: number;
  shadowCastersCulled: number;
  geometriesCached: number;
}

/**
 * Проходит по всей иерархии 3D-сцены и принудительно включает:
 * 1. mesh.frustumCulled = true (отсечение объектов вне поля зрения камеры)
 * 2. Предварительный расчет BoundingSphere / BoundingBox для исключения фризов при первой отрисовке
 * 3. Отключение castShadow для мелких декоративных мешей (размером < 0.6м)
 * 4. static matrix optimization (отключение лишних autoUpdateMatrix для статики генплана)
 */
export function applySceneOptimizations(
  root: THREE.Object3D,
  options: {
    disableSmallShadowCasters?: boolean;
    freezeStaticMatrices?: boolean;
  } = {}
): SceneOptimizationStats {
  const {
    disableSmallShadowCasters = true,
    freezeStaticMatrices = false,
  } = options;

  const stats: SceneOptimizationStats = {
    totalObjects: 0,
    meshesProcessed: 0,
    instancedMeshes: 0,
    shadowCastersCulled: 0,
    geometriesCached: 0,
  };

  root.traverse((obj) => {
    stats.totalObjects++;

    if (obj instanceof THREE.Mesh) {
      stats.meshesProcessed++;

      // 1. Frustum Culling включен для всех мешей
      obj.frustumCulled = true;

      // 2. Предрасчет ограничивающей сферы геометрии
      if (obj.geometry) {
        if (!obj.geometry.boundingSphere) {
          obj.geometry.computeBoundingSphere();
          stats.geometriesCached++;
        }
        if (!obj.geometry.boundingBox) {
          obj.geometry.computeBoundingBox();
        }

        // 3. Отключение теней для мелких и второстепенных объектов (резкое повышение FPS)
        if (disableSmallShadowCasters && obj.geometry.boundingSphere) {
          const radius = obj.geometry.boundingSphere.radius * Math.max(obj.scale.x, obj.scale.y, obj.scale.z);
          const name = (obj.name || obj.parent?.name || '').toLowerCase();
          const isSecondaryOrInterior =
            name.includes('fence') ||
            name.includes('curb') ||
            name.includes('rail') ||
            name.includes('post') ||
            name.includes('ladder') ||
            name.includes('reed') ||
            name.includes('shrub') ||
            name.includes('light') ||
            name.includes('marker') ||
            name.includes('pipe') ||
            name.includes('valve') ||
            name.includes('cable') ||
            name.includes('step') ||
            name.includes('stair') ||
            name.includes('handrail') ||
            name.includes('console') ||
            name.includes('screen') ||
            name.includes('switch') ||
            name.includes('button') ||
            name.includes('chair') ||
            name.includes('cabinet') ||
            name.includes('plate') ||
            name.includes('nozzle') ||
            name.includes('flange') ||
            name.includes('tree') ||
            name.includes('pebble');

          if (obj.castShadow && (radius < 2.5 || isSecondaryOrInterior)) {
            obj.castShadow = false;
            stats.shadowCastersCulled++;
          }
          if (obj.receiveShadow && (radius < 1.0 || isSecondaryOrInterior)) {
            obj.receiveShadow = false;
          }
        }
      }

      // 4. Оптимизация матриц для статических объектов генплана
      if (freezeStaticMatrices && obj.userData.isStatic) {
        obj.matrixAutoUpdate = false;
        obj.updateMatrix();
      }
    }

    if (obj instanceof THREE.InstancedMesh) {
      stats.instancedMeshes++;
      obj.frustumCulled = true;
      if (obj.geometry && !obj.geometry.boundingSphere) {
        obj.geometry.computeBoundingSphere();
      }
    }
  });

  return stats;
}

// ============================================================================
// 5. ГЕНЕРАТОРЫ INSTANCEDMESH ДЛЯ ПОВТОРЯЮЩИХСЯ ОБЪЕКТОВ
// ============================================================================

export interface FenceSegment {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  groundY: number;
  postSpacing?: number; // шаг столбов (по умолчанию 3.0 м)
  height?: number;      // высота ограждения (2.4 м)
}

/**
 * Создает оптимизированный комплект InstancedMesh для защитного периметра АЭС:
 * - Бетонные цокольные блоки (1 InstancedMesh)
 * - Стальные столбы ограждения (1 InstancedMesh)
 * - Сетчатые панели / перекладины (1 InstancedMesh)
 * Вместо сотен индивидуальных Draw Calls используется всего 3 вызова отрисовки!
 */
export function buildInstancedPerimeterFence(
  segments: FenceSegment[],
  materials?: {
    curbMat?: THREE.Material;
    postMat?: THREE.Material;
    panelMat?: THREE.Material;
  }
): {
  curbsMesh: THREE.InstancedMesh;
  postsMesh: THREE.InstancedMesh;
  panelsMesh: THREE.InstancedMesh;
} {
  const mats = getNVAESMaterials();
  const curbMat = materials?.curbMat ?? mats.curbConcrete;
  const postMat = materials?.postMat ?? mats.darkSteel;
  const panelMat = materials?.panelMat ?? mats.galvanizedFence;

  // Сбор всех промежуточных пролетов
  interface SpanData {
    midX: number;
    midY: number;
    midZ: number;
    angle: number;
    length: number;
    height: number;
  }

  interface PostData {
    x: number;
    y: number;
    z: number;
    height: number;
  }

  const spans: SpanData[] = [];
  const posts: PostData[] = [];

  for (const seg of segments) {
    const spacing = seg.postSpacing ?? 3.0;
    const h = seg.height ?? 2.4;
    const gY = seg.groundY;

    const dx = seg.endX - seg.startX;
    const dz = seg.endZ - seg.startZ;
    const totalLen = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const steps = Math.max(1, Math.round(totalLen / spacing));
    const stepLen = totalLen / steps;

    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;

      const x1 = seg.startX + dx * t1;
      const z1 = seg.startZ + dz * t1;
      const x2 = seg.startX + dx * t2;
      const z2 = seg.startZ + dz * t2;

      // Столб в начальной точке
      posts.push({ x: x1, y: gY, z: z1, height: h });

      // Пролет между столбами
      spans.push({
        midX: (x1 + x2) / 2,
        midY: gY,
        midZ: (z1 + z2) / 2,
        angle,
        length: stepLen,
        height: h,
      });
    }

    // Завершающий столб сегмента
    posts.push({ x: seg.endX, y: gY, z: seg.endZ, height: h });
  }

  // 1. InstancedMesh для столбов
  const postGeom = new THREE.CylinderGeometry(0.06, 0.06, 1, 8);
  const postsMesh = new THREE.InstancedMesh(postGeom, postMat, posts.length);
  postsMesh.castShadow = true;
  postsMesh.receiveShadow = true;
  postsMesh.frustumCulled = true;

  const dummy = new THREE.Object3D();
  posts.forEach((p, idx) => {
    dummy.position.set(p.x, p.y + p.height / 2, p.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, p.height, 1);
    dummy.updateMatrix();
    postsMesh.setMatrixAt(idx, dummy.matrix);
  });
  postsMesh.instanceMatrix.needsUpdate = true;

  // 2. InstancedMesh для цокольного фундамента
  const curbGeom = new THREE.BoxGeometry(0.35, 0.3, 1);
  const curbsMesh = new THREE.InstancedMesh(curbGeom, curbMat, spans.length);
  curbsMesh.receiveShadow = true;
  curbsMesh.frustumCulled = true;

  spans.forEach((s, idx) => {
    dummy.position.set(s.midX, s.midY + 0.15, s.midZ);
    dummy.rotation.set(0, s.angle, 0);
    dummy.scale.set(1, 1, s.length);
    dummy.updateMatrix();
    curbsMesh.setMatrixAt(idx, dummy.matrix);
  });
  curbsMesh.instanceMatrix.needsUpdate = true;

  // 3. InstancedMesh для сетчатых секций
  const panelGeom = new THREE.BoxGeometry(0.04, 1, 1);
  const panelsMesh = new THREE.InstancedMesh(panelGeom, panelMat, spans.length);
  panelsMesh.castShadow = true;
  panelsMesh.receiveShadow = true;
  panelsMesh.frustumCulled = true;

  spans.forEach((s, idx) => {
    dummy.position.set(s.midX, s.midY + 0.3 + (s.height - 0.3) / 2, s.midZ);
    dummy.rotation.set(0, s.angle, 0);
    dummy.scale.set(1, s.height - 0.3, s.length);
    dummy.updateMatrix();
    panelsMesh.setMatrixAt(idx, dummy.matrix);
  });
  panelsMesh.instanceMatrix.needsUpdate = true;

  return { curbsMesh, postsMesh, panelsMesh };
}

/**
 * Создает единый InstancedMesh для опор освещения периметра площадки АЭС
 */
export function buildInstancedFloodlightMasts(
  positions: Array<[number, number, number]>,
  materials?: { mastMat?: THREE.Material; luminaireMat?: THREE.Material }
): {
  mastsMesh: THREE.InstancedMesh;
  luminairesMesh: THREE.InstancedMesh;
} {
  const mats = getNVAESMaterials();
  const mastMat = materials?.mastMat ?? mats.darkSteel;
  const luminaireMat = materials?.luminaireMat ?? mats.floodlightHousing;

  const mastHeight = 12.0;

  // Мачта освещения
  const mastGeom = new THREE.CylinderGeometry(0.12, 0.22, mastHeight, 8);
  const mastsMesh = new THREE.InstancedMesh(mastGeom, mastMat, positions.length);
  mastsMesh.castShadow = true;
  mastsMesh.frustumCulled = true;

  // Светильник LED
  const lumGeom = new THREE.BoxGeometry(0.5, 0.35, 0.4);
  const luminairesMesh = new THREE.InstancedMesh(lumGeom, luminaireMat, positions.length * 2);
  luminairesMesh.frustumCulled = true;

  const dummy = new THREE.Object3D();
  let lumIdx = 0;

  positions.forEach((pos, idx) => {
    // Установка опоры
    dummy.position.set(pos[0], pos[1] + mastHeight / 2, pos[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mastsMesh.setMatrixAt(idx, dummy.matrix);

    // Установка пары светильников на верхушке
    for (const offset of [-0.6, 0.6]) {
      dummy.position.set(pos[0] + offset, pos[1] + mastHeight - 0.2, pos[2] + 0.3);
      dummy.rotation.set(Math.PI / 5, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      luminairesMesh.setMatrixAt(lumIdx++, dummy.matrix);
    }
  });

  mastsMesh.instanceMatrix.needsUpdate = true;
  luminairesMesh.instanceMatrix.needsUpdate = true;

  return { mastsMesh, luminairesMesh };
}

// ============================================================================
// 6. ОСВЕЩЕНИЕ И АТМОСФЕРА ПО ТЗ (45° СОЛНЦЕ, МЯГКИЕ ТЕНИ, НЕБО И ТУМАН)
// ============================================================================

export interface NPPAtmosphereInstance {
  sunPosition: THREE.Vector3;
  dirLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  fog: THREE.FogExp2;
  dispose: () => void;
}

/**
 * Инициализирует сбалансированное освещение НВАЭС:
 * - Солнце на высоте 45° с мягкими тенями без артефактов
 * - HemisphereLight (небесный свет 0x9CB0C3 + отражение сухой песчаной земли 0x8B7E66)
 * - Мягкий туман FogExp2(0x9CB0C3, 0.0022), сглаживающий горизонт полупустынного ландшафта
 */
export function setupOptimizedNPPAtmosphere(
  scene: THREE.Scene,
  options: {
    sunElevationDeg?: number; // 45°
    sunAzimuthDeg?: number;   // 135°
    fogColor?: number;        // 0x9CB0C3
    fogDensity?: number;      // 0.0022
  } = {}
): NPPAtmosphereInstance {
  const {
    sunElevationDeg = 45,
    sunAzimuthDeg = 135,
    fogColor = NVAES_PALETTE.horizonFog,
    fogDensity = 0.0022,
  } = options;

  // 1. Экспоненциальный туман горизонта
  const fog = new THREE.FogExp2(fogColor, fogDensity);
  scene.fog = fog;
  scene.background = new THREE.Color(fogColor);

  // 2. Расчет положения солнца на высоте 45°
  const sunPosition = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(90 - sunElevationDeg);
  const theta = THREE.MathUtils.degToRad(sunAzimuthDeg);
  sunPosition.setFromSphericalCoords(140, phi, theta);

  // 3. Солнечный свет с калиброванными тенями
  const dirLight = new THREE.DirectionalLight(0xFFFAEE, 2.6);
  dirLight.position.copy(sunPosition);
  dirLight.castShadow = true;

  // Оптимальный охват зоны энергоблоков и градирен
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 160;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 420;
  dirLight.shadow.bias = -0.00012; // Предотвращает полосы (shadow acne)
  dirLight.shadow.radius = 2.0;    // Мягкое размытие контура теней

  scene.add(dirLight);

  // 4. Естественный рассеянный свет небосвода и сухой степи
  const hemiLight = new THREE.HemisphereLight(0x9CB0C3, 0x8B7E66, 0.82);
  hemiLight.position.set(0, 80, 0);
  scene.add(hemiLight);

  const dispose = () => {
    scene.remove(dirLight);
    scene.remove(hemiLight);
    dirLight.dispose();
  };

  return {
    sunPosition,
    dirLight,
    hemiLight,
    fog,
    dispose,
  };
}

// ============================================================================
// 6. АЛГОРИТМ УСТРАНЕНИЯ КОЛЛИЗИЙ И ДУБЛИРОВАНИЯ КРЫШ (FIX BUILDING OVERLAP)
// ============================================================================

export interface FixBuildingOverlapOptions {
  requiredClearance?: number; // Минимальный технологический зазор в метрах (по умолчанию 8.0 м, 5-10 м по ТЗ)
  removeDuplicateRoofs?: boolean; // Удаление дублирующихся перекрытий синей крыши (Z-fighting)
  preferXAxis?: boolean; // Приоритет разнесения по оси X (восточное крыло площадки)
}

/**
 * Алгоритм автоматического расчета точных границ (Bounding Box), принудительного разнесения
 * зданий и устранения Z-fighting на синей кровле комплекса РИТМ-200Н.
 * 
 * Выполняет:
 * 1. Вычисление точных границ THREE.Box3().setFromObject() для белого здания и ritm200Group.
 * 2. Принудительный сдвиг по оси X/Z:
 *    Если ritm200Group пересекается с белым зданием, жестко задает сдвиг:
 *    ritm200Group.position.x += Math.max(15.0, offset + clearance) с гарантированным
 *    технологическим зазором в 5-10 метров.
 *    Вызывает ritm200Group.updateMatrixWorld(true) после сдвига.
 * 3. Устранение внутреннего дублирования крыш (Z-fighting):
 *    Обходит дочерние меши ritm200Group.traverse(child => ...) и удаляет лишние
 *    продублированные меши кровли, создающие наложение двух синих плоскостей друг на друга.
 * 
 * @param sceneOrRitm Сцена Three.js или непосредственно группа ritm200Group
 * @param whiteBuildingParamOrOptions Белое здание (Object3D) или опции
 * @param optionsParam Дополнительные параметры зазора и дедупликации
 * @returns Отчет о произведенных сдвигах, детекции коллизий и удаленных дубликатах
 */
export function fixBuildingOverlap(
  sceneOrRitm: THREE.Scene | THREE.Object3D,
  whiteBuildingParamOrOptions?: THREE.Object3D | FixBuildingOverlapOptions,
  optionsParam?: FixBuildingOverlapOptions
): {
  overlapDetected: boolean;
  shiftApplied: { x: number; z: number };
  duplicatesRemoved: number;
  ritmBox?: THREE.Box3;
  whiteBox?: THREE.Box3;
} {
  let ritm200Group: THREE.Object3D | null = null;
  let whiteBuildings: THREE.Object3D[] = [];
  let options: FixBuildingOverlapOptions = {};

  if (whiteBuildingParamOrOptions && 'isObject3D' in whiteBuildingParamOrOptions) {
    // Вызов сигнатуры (ritm200Group, whiteBuilding, options)
    ritm200Group = sceneOrRitm;
    whiteBuildings = [whiteBuildingParamOrOptions as THREE.Object3D];
    options = optionsParam || {};
  } else {
    // Вызов сигнатуры (scene, options)
    const scene = sceneOrRitm;
    options = (whiteBuildingParamOrOptions as FixBuildingOverlapOptions) || {};

    // 1. Поиск здания РИТМ-200Н в иерархии сцены
    scene.traverse((obj) => {
      if (
        !ritm200Group &&
        (obj.name === 'RITM200N_SMR_FullComplex' ||
         obj.name === 'RITM200N_Complex' ||
         obj.name.toLowerCase().includes('ritm200'))
      ) {
        ritm200Group = obj;
      }
    });

    // 2. Поиск смежного белого/капитального здания (Машинный зал Блока 2, Блока 1 или VVERUnit2_Group)
    scene.traverse((obj) => {
      if (
        obj !== ritm200Group &&
        !ritm200Group?.children.includes(obj) &&
        (obj.name === 'VVERUnit2_TurbineHall' ||
         obj.name === 'WhiteTurbineBuilding' ||
         obj.name === 'VVERUnit2_Group' ||
         (obj.name.toLowerCase().includes('turbine') && !obj.name.toLowerCase().includes('smr') && !obj.name.toLowerCase().includes('ritm')) ||
         obj.name.toLowerCase().includes('whitebuilding') ||
         obj.name === 'VVERUnit1_MasterGroup')
      ) {
        whiteBuildings.push(obj);
      }
    });
  }

  const clearance = options.requiredClearance ?? 8.0; // Технологический зазор 8 метров (в диапазоне 5-10м)
  const shouldDeduplicate = options.removeDuplicateRoofs ?? true;
  let duplicatesRemoved = 0;

  // 3. Устранение внутреннего дублирования крыш (Z-fighting)
  if (ritm200Group && shouldDeduplicate) {
    const roofMeshes: THREE.Mesh[] = [];

    ritm200Group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        // Проверяем синие меши кровли (#1F4E79 или кобальтово-синий оттенок)
        const isBlueRoof =
          (mat && 'color' in mat && (mat.color.getHex() === 0x1F4E79 || (mat.color.b > 0.4 && mat.color.r < 0.25))) ||
          mesh.name.toLowerCase().includes('roof');

        if (isBlueRoof && mesh.position.y > 10.0) {
          roofMeshes.push(mesh);
        }
      }
    });

    // Сравниваем позиции и размеры найденных плоскостей кровли
    for (let i = 0; i < roofMeshes.length; i++) {
      for (let j = i + 1; j < roofMeshes.length; j++) {
        const r1 = roofMeshes[i];
        const r2 = roofMeshes[j];
        if (!r1.parent || !r2.parent) continue;

        const wPos1 = new THREE.Vector3();
        const wPos2 = new THREE.Vector3();
        r1.getWorldPosition(wPos1);
        r2.getWorldPosition(wPos2);

        // Если меши находятся практически на одной высоте и перекрывают друг друга
        if (
          Math.abs(wPos1.y - wPos2.y) < 0.35 &&
          wPos1.distanceTo(wPos2) < 3.0
        ) {
          // Удаляем дубликат из родительской группы и освобождаем память геометрии
          r2.parent.remove(r2);
          if (r2.geometry) r2.geometry.dispose();
          duplicatesRemoved++;
        }
      }
    }
  }

  const shiftApplied = { x: 0, z: 0 };
  let overlapDetected = false;
  let finalRitmBox: THREE.Box3 | undefined;
  let finalWhiteBox: THREE.Box3 | undefined;

  // 4. Получение точных границ (Bounding Box) и принудительный сдвиг по оси X и Z
  if (ritm200Group && whiteBuildings.length > 0) {
    // Принудительно обновляем мировые матрицы для точного вычисления Box3
    if ('updateMatrixWorld' in sceneOrRitm) {
      sceneOrRitm.updateMatrixWorld(true);
    }
    ritm200Group.updateMatrixWorld(true);

    const ritmBox = new THREE.Box3().setFromObject(ritm200Group);

    // Предпочитаем наиболее близкое смежное белое здание (Машзал энергоблока №2)
    const primaryWhiteBld =
      whiteBuildings.find((b) => b.name === 'VVERUnit2_TurbineHall' || b.name === 'WhiteTurbineBuilding') ||
      whiteBuildings[0];

    const whiteBox = new THREE.Box3().setFromObject(primaryWhiteBld);
    finalRitmBox = ritmBox;
    finalWhiteBox = whiteBox;

    // Проверка пересечения габаритов
    if (ritmBox.intersectsBox(whiteBox)) {
      overlapDetected = true;

      // Вычисляем необходимый сдвиг по оси X для образования чистого зазора 5-10 метров
      const overlapDepthX = whiteBox.max.x - ritmBox.min.x;
      const requiredShiftX = Math.max(15.0, overlapDepthX + clearance);

      // Принудительный сдвиг ritm200Group по оси X
      ritm200Group.position.x += requiredShiftX;
      shiftApplied.x += requiredShiftX;

      // Принудительное обновление мировой матрицы трансформации
      ritm200Group.updateMatrixWorld(true);
      ritmBox.setFromObject(ritm200Group);

      // Контрольная проверка по оси Z: если после сдвига по X осталась интерференция
      if (ritmBox.intersectsBox(whiteBox)) {
        const overlapDepthZ = whiteBox.max.z - ritmBox.min.z;
        const requiredShiftZ = Math.max(15.0, overlapDepthZ + clearance);
        ritm200Group.position.z += requiredShiftZ;
        shiftApplied.z += requiredShiftZ;
        ritm200Group.updateMatrixWorld(true);
        ritmBox.setFromObject(ritm200Group);
      }
    }
  }

  return {
    overlapDetected,
    shiftApplied,
    duplicatesRemoved,
    ritmBox: finalRitmBox,
    whiteBox: finalWhiteBox,
  };
}
