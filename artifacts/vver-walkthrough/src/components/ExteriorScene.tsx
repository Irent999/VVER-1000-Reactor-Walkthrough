import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOOR_LEVELS } from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
  steppeTerrainMap, steppeRoughnessMap, steppeNormalMap, waterNormalMap,
} from '@/scene/pbrTextures';
import { simplex2D, fbm2D, ridgeNoise2D } from '@/scene/simplexNoise';
import { siteGrassLawnMaterial } from '@/scene/nppEnvironment';

// ============================================================================
// PBR MATERIALS - NOVOVORONEZH NPP UNIT 6 INDUSTRIAL PALETTE
// ============================================================================

const concreteDarkPBRMat = new THREE.MeshStandardMaterial({
  color: '#8A8E94',
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.88,
  metalness: 0.04,
});

// NVNPP Unit 6 Color Scheme: Warm beige/cream industrial wall panels
const wallBeigePanelMat = new THREE.MeshStandardMaterial({
  color: '#E8DCC4', // Warm beige industrial panels
  roughness: 0.76,
  metalness: 0.12,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.06, 0.06),
});

// NVNPP Unit 6 Base Trim: Red-brown protective skirt
const baseRedBrownSkirtMat = new THREE.MeshStandardMaterial({
  color: '#8B4513', // Red-brown protective foundation skirt
  roughness: 0.72,
  metalness: 0.14,
});

const industrialMetalDarkMat = new THREE.MeshStandardMaterial({
  color: '#34495e',
  roughness: 0.45,
  metalness: 0.65,
});

const steelTrussMat = new THREE.MeshStandardMaterial({
  color: '#e4e7eb',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.32,
  metalness: 0.88,
});

const glassWindowMat = new THREE.MeshStandardMaterial({
  color: '#1a3344',
  roughness: 0.1,
  metalness: 0.85,
});

// Asphalt Roadway (strictly position.y = gY + 0.05 to avoid Y-fighting)
const asphaltRoadMat = new THREE.MeshStandardMaterial({
  color: '#282a2d',
  roughness: 0.92,
  metalness: 0.04,
});

const roadMarkingMat = new THREE.MeshStandardMaterial({
  color: '#f6f6f0',
  roughness: 0.6,
  metalness: 0.0,
});

const concreteCurbMat = new THREE.MeshStandardMaterial({
  color: '#cfd1ca',
  roughness: 0.85,
  metalness: 0.05,
});

// Light grey paved concrete walkways
const concreteWalkwayMat = new THREE.MeshStandardMaterial({
  color: '#cfd2cd',
  roughness: 0.86,
  metalness: 0.04,
});

// Внутренняя промышленная площадка АЭС: серое/гравийное покрытие (0x808080)
const industrialGravelPlatformMat = new THREE.MeshStandardMaterial({
  color: '#808080', // Серое гравийное покрытие промплощадки по ТЗ
  roughness: 0.88,
  metalness: 0.04,
});

// 1. Реалистичный бесшовный степной грунт (песочно-глинистые оттенки + vertex colors)
const aridTerrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  map: steppeTerrainMap,
  normalMap: steppeNormalMap,
  roughnessMap: steppeRoughnessMap,
  normalScale: new THREE.Vector2(0.7, 0.7),
  roughness: 0.94,
  metalness: 0.02,
  flatShading: false,
});

// Холмы и возвышенности на среднем и дальнем планах (песчано-глинистый оттенок)
const distantHillsMat = new THREE.MeshStandardMaterial({
  color: '#BEA77B',
  map: steppeTerrainMap,
  normalMap: steppeNormalMap,
  roughnessMap: steppeRoughnessMap,
  normalScale: new THREE.Vector2(0.5, 0.5),
  roughness: 0.96,
  metalness: 0.01,
  flatShading: false,
});

// Скалистые выходы коренных пород вокруг площадки АЭС
const rockOutcropMat = new THREE.MeshStandardMaterial({
  color: '#766753', // Выветренный песчаник и скальные выходы
  map: steppeTerrainMap,
  normalMap: steppeNormalMap,
  roughnessMap: steppeRoughnessMap,
  normalScale: new THREE.Vector2(1.2, 1.2),
  roughness: 0.88,
  metalness: 0.06,
  flatShading: true,
});

// 2. Водоем (Водохранилище-охладитель / Озеро) - MeshPhysicalMaterial с сине-зеленым оттенком, шероховатостью 0.1 и прозрачностью
const riverWaterMat = new THREE.MeshPhysicalMaterial({
  color: '#1a687d', // Естественный сине-зеленый оттенок водоема
  roughness: 0.10,
  metalness: 0.08,
  transmission: 0.65,
  ior: 1.333,
  reflectivity: 0.88,
  normalMap: waterNormalMap,
  normalScale: new THREE.Vector2(0.4, 0.4),
  transparent: true,
  opacity: 0.88,
  depthWrite: false,
});

// Мягкая песчаная береговая линия
const sandyShoreMat = new THREE.MeshStandardMaterial({
  color: '#D4C097', // Песчано-галечный береговой грунт
  map: steppeTerrainMap,
  normalMap: steppeNormalMap,
  roughness: 0.92,
  metalness: 0.02,
});

// Прибрежный тростник и камыш
const reedGrassMat = new THREE.MeshStandardMaterial({
  color: '#707A54', // Серо-зеленый камыш
  roughness: 0.9,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

// 3. Защитные лесополосы вдоль периметра и забора АЭС (хвойные и лиственные)
const pineNeedlesMat = new THREE.MeshStandardMaterial({
  color: '#1e3820', // Темно-зеленая хвоя сосны/ели
  roughness: 0.82,
  metalness: 0.0,
  flatShading: true,
});

const deciduousFoliageMat = new THREE.MeshStandardMaterial({
  color: '#385522', // Плотная листва тополей/берез
  roughness: 0.84,
  metalness: 0.0,
  flatShading: true,
});

const treeTrunkMat = new THREE.MeshStandardMaterial({
  color: '#524032', // Древесный ствол
  roughness: 0.95,
  metalness: 0.02,
});

// Степные кустарники и низкорослые деревья (полынь, саксаул, тамариск)
const greenShrubMat = new THREE.MeshStandardMaterial({
  color: '#758058', // Оливково-полынный степной кустарник
  roughness: 0.9,
  metalness: 0.0,
  flatShading: true,
});

// Сухая песчано-соломенная степная трава (полынь, ковыль)
const dryGrassMat = new THREE.MeshStandardMaterial({
  color: '#C8B778', // Сухой степной ковыль
  roughness: 0.92,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

// Cooling Tower double-sided concrete shell & internal basin materials (НВАЭС)
const coolingTowerShellMat = new THREE.MeshStandardMaterial({
  color: '#E3E5E8', // Светло-серый монолитный бетон НВАЭС
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.24, 0.24),
  roughness: 0.86,
  metalness: 0.04,
  side: THREE.DoubleSide, // Double-sided so inner walls are opaque solid concrete
});

const coolingTowerBasinMat = new THREE.MeshStandardMaterial({
  color: '#2F3538', // Dark concrete floor basin
  roughness: 0.92,
  metalness: 0.05,
});

const coolingFillGrateMat = new THREE.MeshStandardMaterial({
  color: '#23282b', // Dark metallic cooling fill pack & nozzles
  roughness: 0.8,
  metalness: 0.38,
});

// Industrial Piping & Ventilation Stacks Materials
const insulationPipeMat = new THREE.MeshStandardMaterial({
  color: '#e2e6eb',
  roughness: 0.35,
  metalness: 0.78,
});

const pipeFeedwaterMat = new THREE.MeshStandardMaterial({
  color: '#2e6b9e',
  roughness: 0.45,
  metalness: 0.55,
});

const pipeGasMat = new THREE.MeshStandardMaterial({
  color: '#c99a2e',
  roughness: 0.45,
  metalness: 0.55,
});

const ventRedBandMat = new THREE.MeshStandardMaterial({
  color: '#b82a24', // Aviation red band
  roughness: 0.65,
  metalness: 0.15,
});

const ventWhiteBandMat = new THREE.MeshStandardMaterial({
  color: '#f2f2ec', // Aviation white band
  roughness: 0.65,
  metalness: 0.15,
});

// Transmission Line Pylon Materials
const transmissionCableMat = new THREE.MeshStandardMaterial({
  color: '#25282b',
  roughness: 0.35,
  metalness: 0.85,
});

const ceramicInsulatorMat = new THREE.MeshStandardMaterial({
  color: '#8A3324', // Терракотовый высоковольтный фарфор (ОРУ-500 кВ)
  roughness: 0.18,
  metalness: 0.12,
});

const fenceMeshMat = new THREE.MeshStandardMaterial({
  color: '#656860',
  roughness: 0.5,
  metalness: 0.45,
});

const floodlightMat = new THREE.MeshStandardMaterial({
  color: '#fffae8',
  emissive: '#ffeeaa',
  emissiveIntensity: 0.8,
});

// Materials for cooling tower vapor plumes, special building, and 500 kV equipment
const coolingVaporMat = new THREE.MeshBasicMaterial({
  color: '#ffffff',
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const specialBuildingConcreteMat = new THREE.MeshStandardMaterial({
  color: '#CBD1D6', // Монолитный тяжелый бетон спецкорпуса
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.28, 0.28),
  roughness: 0.88,
  metalness: 0.04,
});


const busbarAluMat = new THREE.MeshStandardMaterial({
  color: '#e8ecef',
  roughness: 0.22,
  metalness: 0.92,
});

const abkGlassCurtainMat = new THREE.MeshStandardMaterial({
  color: '#0f2b3c',
  roughness: 0.08,
  metalness: 0.9,
  transparent: true,
  opacity: 0.85,
});

const machinedSteelMat = new THREE.MeshStandardMaterial({
  color: '#dce1e6',
  roughness: 0.25,
  metalness: 0.85,
});

const turbineLimeOliveMat = new THREE.MeshStandardMaterial({
  color: '#3d7a68',
  roughness: 0.45,
  metalness: 0.3,
});

// ============================================================================
// 1. ELEVATION CALCULATOR & UNDULATING STEPPE TERRAIN WITH SIMPLEX NOISE & VERTEX COLORS
// ============================================================================

/**
 * Единый калькулятор высоты рельефа степи и водоема на основе 2D Simplex Noise и fBm:
 * 1. Строго плоская промплощадка станции (отметка gY = -5.5) со сглаженным переходом (smoothstep)
 * 2. Ровный коридор для южного подъездного шоссе и подъездов к водозабору
 * 3. Естественная чаша водохранилища-охладителя / озера на востоке (отметка зеркала воды gY - 0.45)
 * 4. Плавные, непрерывные холмы степи без угловатых уступов, стыков и искусственных сеток
 */
export function getSteppeGroundElevation(x: number, z: number): number {
  const gY = FLOOR_LEVELS.ground; // -5.5
  const waterLevelY = gY - 0.45;

  // Плавный изгиб русла водохранилища-охладителя на востоке от промплощадки
  const lakeCenterlineX = 265 + Math.sin(z * 0.008) * 32 + Math.cos(z * 0.016) * 14;
  // Чаша водохранилища плавно расширяется в центральной зоне
  const basinHalfWidth = 65 + Math.exp(-Math.pow((z - 10) / 180, 2)) * 42; // полуширина от 65 до 107м
  const distToLakeCenter = Math.abs(x - lakeCenterlineX);

  // Расстояние до плоской технологической платформы АЭС
  const padMinX = -215;
  const padMaxX = 215;
  const padMinZ = -105;
  const padMaxZ = 145;

  const dx = x < padMinX ? padMinX - x : x > padMaxX ? x - padMaxX : 0;
  const dz = z < padMinZ ? padMinZ - z : z > padMaxZ ? z - padMaxZ : 0;
  let distToPad = Math.hypot(dx, dz);

  // Коридор южного подъездного шоссе (ровный въезд без холмов на полотне)
  if (z > padMaxZ && z <= 460) {
    const roadDist = Math.max(0, Math.abs(x) - 12);
    distToPad = Math.min(distToPad, roadDist);
  }

  // Коридор подъезда к береговой насосной станции водохранилища
  if (Math.abs(z - 18) < 22 && x > 140 && x < 240) {
    const accessDist = Math.max(0, Math.abs(z - 18) - 9);
    distToPad = Math.min(distToPad, accessDist);
  }

  // Плавный эрмитов переход от горизонтальной площадки АЭС к естественным холмам (smoothstep 60м)
  const blendDist = 60.0;
  const padBlend = Math.min(1.0, Math.max(0.0, distToPad / blendDist));
  const smoothPadWeight = padBlend * padBlend * (3.0 - 2.0 * padBlend);

  // Плавные естественные холмы сухой полупустынной степи на основе 2D Simplex Noise & fBm
  const baseHills = fbm2D(x * 0.0035, z * 0.0035, 4, 2.0, 0.48) * 14.5;
  const swells = simplex2D(x * 0.0085 + 24.1, z * 0.0085 + 61.3) * 5.0;
  const microUndulation = simplex2D(x * 0.022 + 9.7, z * 0.022 + 15.2) * 1.5;
  const naturalHills = (baseHills + swells + microUndulation) * smoothPadWeight;

  // Чаша водохранилища-охладителя
  if (distToLakeCenter < basinHalfWidth + 40) {
    if (distToLakeCenter < basinHalfWidth) {
      // Под водой: плавный профиль дна чаши водохранилища (до 4.2 м глубины)
      const depthFactor = 1.0 - Math.pow(distToLakeCenter / basinHalfWidth, 2);
      return waterLevelY - depthFactor * 4.2;
    } else {
      // Пологий песчаный берег водоема
      const shoreT = (distToLakeCenter - basinHalfWidth) / 40.0;
      const smoothShore = shoreT * shoreT * (3.0 - 2.0 * shoreT);
      const shoreElev = waterLevelY + (distToLakeCenter - basinHalfWidth) * 0.08;
      const surroundingLand = gY + naturalHills;
      return THREE.MathUtils.lerp(shoreElev, surroundingLand, smoothShore);
    }
  }

  return gY + naturalHills;
}

function UndulatingSteppeTerrain() {
  const gY = FLOOR_LEVELS.ground;
  const waterLevelY = gY - 0.45;

  // 1. Оптимизированный степной рельеф 1200м x 1200м с легкой плавной сеткой 64x64
  // Обеспечивает стабильные 60 FPS без избыточных полигонов
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1200, 1200, 64, 64);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // In unrotated plane, Y maps to -Z in world
      const z = -y;
      pos.setZ(i, getSteppeGroundElevation(x, z) - gY);
    }
    geo.computeVertexNormals();

    // 2. Процедурное сглаживание цветов (vertex colors) и затенение (ambient occlusion) в низинах
    const count = pos.count;
    const colors = new Float32Array(count * 3);
    const normals = geo.attributes.normal;

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const z = -pos.getY(i);
      const elev = pos.getZ(i); // relative to gY
      const worldY = elev + gY;
      const ny = normals.getZ(i); // world up normal
      const slope = 1.0 - Math.max(0.0, ny);

      // Проверка близости к чаше водохранилища
      const lakeCenterlineX = 265 + Math.sin(z * 0.008) * 32 + Math.cos(z * 0.016) * 14;
      const basinHalfWidth = 65 + Math.exp(-Math.pow((z - 10) / 180, 2)) * 42;
      const distToLake = Math.abs(x - lakeCenterlineX);
      const isWaterBed = distToLake < basinHalfWidth && worldY <= waterLevelY + 0.05;
      const isShore = distToLake < basinHalfWidth + 28 && !isWaterBed;

      // Мягкое затенение в ложбинах и низинах (Ambient Occlusion)
      const aoNoise = simplex2D(x * 0.018, z * 0.018);
      const aoFactor = THREE.MathUtils.clamp(0.88 + aoNoise * 0.12 + (ny - 0.75) * 0.25, 0.78, 1.05);

      let r = 0.76;
      let g = 0.66;
      let b = 0.48; // Базовый теплый песочно-глинистый тон степи (#C2A878)

      if (isWaterBed) {
        // Темный влажный донный ил и мокрый песок чаши озера
        r = 0.34; g = 0.36; b = 0.29;
      } else if (isShore) {
        // Светло-золотистый песчаный берег водохранилища
        const shoreRatio = Math.min(1.0, Math.max(0.0, (worldY - waterLevelY) / 1.6));
        r = THREE.MathUtils.lerp(0.72, 0.83, shoreRatio);
        g = THREE.MathUtils.lerp(0.64, 0.75, shoreRatio);
        b = THREE.MathUtils.lerp(0.48, 0.56, shoreRatio);
      } else {
        // Естественные пятна сухой травы, полыни и микрорельефа
        const grassNoise = fbm2D(x * 0.012 + 45, z * 0.012 + 78, 3);
        if (grassNoise > 0.18 && slope < 0.25) {
          // Оливково-зеленоватая сухая степная растительность в ложбинах
          r = 0.58; g = 0.60; b = 0.41;
        } else if (slope > 0.35) {
          // Скалистые обнажения и известняковые выходы на крутых склонах
          r = 0.74; g = 0.69; b = 0.59;
        } else {
          // Песчано-суглинистая степная почва с вариациями тона
          const microVariation = simplex2D(x * 0.007, z * 0.007) * 0.05;
          r = 0.76 + microVariation;
          g = 0.66 + microVariation * 0.85;
          b = 0.48 + microVariation * 0.6;
        }
      }

      colors[i * 3] = r * aoFactor;
      colors[i * 3 + 1] = g * aoFactor;
      colors[i * 3 + 2] = b * aoFactor;
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [gY, waterLevelY]);

  // 2. Горные гряды и холмы на дальнем горизонте с процедурным шумом
  const hillsGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1600, 1600, 48, 48);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = -y;
      const dist = Math.hypot(x, z);

      if (dist <= 300) {
        pos.setZ(i, -15); // За пределами ближней зоны станции
      } else {
        const horizBlend = Math.min((dist - 300) / 180, 1.0);
        const smoothHoriz = horizBlend * horizBlend * (3.0 - 2.0 * horizBlend);
        const ridge = (fbm2D(x * 0.0022, z * 0.0022, 4) * 0.5 + 0.5) * 36.0 +
                      (ridgeNoise2D(x * 0.005, z * 0.005, 3)) * 14.0;
        pos.setZ(i, ridge * smoothHoriz);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group name="UndulatingSteppeTerrainGroup">
      {/* 1. Основной степной рельеф с бесшовной текстурой, vertex colors и 256x256 сеткой */}
      <mesh
        geometry={terrainGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, gY, 0]}
        receiveShadow
      >
        <primitive object={aridTerrainMat} attach="material" />
      </mesh>

      {/* 2. Серое гравийное основание технологической площадки энергоблоков АЭС */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, gY + 0.015, 5]}
        receiveShadow
      >
        <planeGeometry args={[450, 320]} />
        <primitive object={industrialGravelPlatformMat} attach="material" />
      </mesh>

      {/* 3. Холмы на горизонте, формирующие природную панораму степи */}
      <mesh
        geometry={hillsGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, gY, 0]}
        receiveShadow
      >
        <primitive object={distantHillsMat} attach="material" />
      </mesh>
    </group>
  );
}

// ============================================================================
// 2. СКАЛИСТЫЕ ВЫХОДЫ ПОРОД (ROCKY OUTCROPS AROUND NPP SITE)
// ============================================================================

function RockyOutcrops() {
  const rockMeshRef = useRef<THREE.InstancedMesh>(null);

  // Координаты скалистых гряд на гребнях холмов вокруг АЭС
  const rockPositions: Array<[number, number, number, number]> = useMemo(
    () => [
      // [x, z, scale, rotationY]
      [-240, -60, 4.2, 0.4],
      [-265, 40, 5.0, 1.2],
      [-230, 180, 3.8, 2.1],
      [-275, -130, 5.5, 0.8],
      [-190, -210, 4.6, 2.9],
      [-80, -230, 4.0, 1.7],
      [60, -250, 4.8, 0.3],
      [150, -220, 3.6, 1.9],
      [-170, 250, 4.4, 0.6],
      [-230, 320, 5.2, 2.4],
      [170, 270, 4.1, 1.1],
      [210, 330, 4.7, 0.9],
      [-310, 0, 6.2, 1.5],
      [-320, -160, 5.8, 2.7],
      [-290, 110, 5.0, 0.2],
      [40, 290, 3.9, 1.8],
      [215, -170, 4.3, 2.2],
      [180, -240, 4.9, 0.5],
      [-120, 280, 4.0, 2.0],
      [-60, 310, 4.5, 1.3],
      // Береговые скальные выступы вдоль водохранилища
      [330, 70, 4.8, 0.7],
      [345, -110, 5.2, 1.9],
      [360, 210, 5.6, 2.5],
      [320, -40, 3.8, 0.4],
      [-200, 70, 3.5, 1.6],
      [-215, -30, 3.7, 2.8],
      [-195, 120, 3.4, 0.9],
      [-210, -90, 3.6, 1.4],
    ],
    []
  );

  const rockMatrices = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    rockPositions.forEach(([x, z, scale, rotY]) => {
      const y = getSteppeGroundElevation(x, z);
      dummy.position.set(x, y + scale * 0.25, z);
      dummy.rotation.set(0.1, rotY, -0.08);
      dummy.scale.set(scale * 1.3, scale * 0.75, scale * 1.1);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    });

    return matrices;
  }, [rockPositions]);

  useEffect(() => {
    if (rockMeshRef.current && rockMatrices.length > 0) {
      rockMatrices.forEach((m, i) => rockMeshRef.current?.setMatrixAt(i, m));
      rockMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [rockMatrices]);

  const rockGeo = useMemo(() => new THREE.DodecahedronGeometry(1.0, 0), []);

  return (
    <group name="RockyOutcropsGroup">
      <instancedMesh
        ref={rockMeshRef}
        args={[rockGeo, rockOutcropMat, rockMatrices.length]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

// ============================================================================
// 3. ИЗВИЛИСТОЕ ВОДОХРАНИЛИЩЕ-ОХЛАДИТЕЛЬ / РЕКА (WINDING RIVER RESERVOIR)
// ============================================================================

function WindingRiverReservoir() {
  const gY = FLOOR_LEVELS.ground;
  const waterY = gY - 0.45;
  const waterMeshRef = useRef<THREE.Mesh>(null);
  const pebblesRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state, delta) => {
    if (waterNormalMap) {
      waterNormalMap.offset.x = (waterNormalMap.offset.x + delta * 0.016) % 1;
      waterNormalMap.offset.y = (waterNormalMap.offset.y + delta * 0.012) % 1;
    }
    if (waterMeshRef.current) {
      const t = state.clock.elapsedTime;
      // Мягкая естественная рябь водной глади
      waterMeshRef.current.position.y = waterY + Math.sin(t * 0.75) * 0.02;
    }
  });

  // Извилистая геометрия водной поверхности водохранилища и береговой линии
  const { riverWaterGeo, westShoreGeo, eastShoreGeo, pebbleMatrices } = useMemo(() => {
    const steps = 80;
    const zStart = -420;
    const zEnd = 420;
    const shoreWidth = 24;

    const wGeo = new THREE.BufferGeometry();
    const wVertices: number[] = [];
    const wIndices: number[] = [];

    const wsGeo = new THREE.BufferGeometry();
    const wsVertices: number[] = [];
    const wsIndices: number[] = [];

    const esGeo = new THREE.BufferGeometry();
    const esVertices: number[] = [];
    const esIndices: number[] = [];

    const pebbleMats: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    let seed = 38192;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i <= steps; i++) {
      const z = zStart + (i / steps) * (zEnd - zStart);
      const centerX = 265 + Math.sin(z * 0.008) * 32 + Math.cos(z * 0.016) * 14;
      const basinHalfWidth = 65 + Math.exp(-Math.pow((z - 10) / 180, 2)) * 42;

      const leftX = centerX - basinHalfWidth;
      const rightX = centerX + basinHalfWidth;

      // Water plane quad strip
      wVertices.push(leftX, 0, z);
      wVertices.push(rightX, 0, z);

      // West sandy shoreline quad strip (плавный подъем от кромки воды)
      wsVertices.push(leftX - shoreWidth, gY + 0.1, z);
      wsVertices.push(leftX + 2, waterY - 0.2, z);

      // East sandy shoreline quad strip
      esVertices.push(rightX - 2, waterY - 0.2, z);
      esVertices.push(rightX + shoreWidth, gY + 0.1, z);

      // Прибрежные речные валуны и камни у кромки воды
      if (i % 2 === 0) {
        // Западный берег
        const sW = 0.6 + rnd() * 0.9;
        dummy.position.set(leftX - 1.5 + (rnd() - 0.5) * 3, waterY + 0.1, z + (rnd() - 0.5) * 3);
        dummy.rotation.set(rnd() * 0.4, rnd() * Math.PI * 2, rnd() * 0.4);
        dummy.scale.set(sW * 1.3, sW * 0.7, sW);
        dummy.updateMatrix();
        pebbleMats.push(dummy.matrix.clone());

        // Восточный берег
        const sE = 0.5 + rnd() * 0.8;
        dummy.position.set(rightX + 1.5 + (rnd() - 0.5) * 3, waterY + 0.1, z + (rnd() - 0.5) * 3);
        dummy.rotation.set(rnd() * 0.4, rnd() * Math.PI * 2, rnd() * 0.4);
        dummy.scale.set(sE * 1.2, sE * 0.65, sE);
        dummy.updateMatrix();
        pebbleMats.push(dummy.matrix.clone());
      }

      if (i < steps) {
        const base = i * 2;
        wIndices.push(base, base + 1, base + 2);
        wIndices.push(base + 1, base + 3, base + 2);

        wsIndices.push(base, base + 1, base + 2);
        wsIndices.push(base + 1, base + 3, base + 2);

        esIndices.push(base, base + 1, base + 2);
        esIndices.push(base + 1, base + 3, base + 2);
      }
    }

    wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wVertices, 3));
    wGeo.setIndex(wIndices);
    wGeo.computeVertexNormals();

    wsGeo.setAttribute('position', new THREE.Float32BufferAttribute(wsVertices, 3));
    wsGeo.setIndex(wsIndices);
    wsGeo.computeVertexNormals();

    esGeo.setAttribute('position', new THREE.Float32BufferAttribute(esVertices, 3));
    esGeo.setIndex(esIndices);
    esGeo.computeVertexNormals();

    return { riverWaterGeo: wGeo, westShoreGeo: wsGeo, eastShoreGeo: esGeo, pebbleMatrices: pebbleMats };
  }, [gY, waterY]);

  // Прибрежный тростник вдоль кромки воды
  const reedClusters = useMemo(() => {
    const list: Array<[number, number]> = [];
    for (let i = 0; i < 68; i++) {
      const z = -380 + i * 11.5 + ((i * 7) % 5) * 1.2;
      const centerX = 265 + Math.sin(z * 0.008) * 32 + Math.cos(z * 0.016) * 14;
      const basinHalfWidth = 65 + Math.exp(-Math.pow((z - 10) / 180, 2)) * 42;
      const x = centerX - basinHalfWidth + 1.2 + ((i * 3) % 4) * 0.8;
      list.push([x, z]);
    }
    return list;
  }, []);

  const pebbleGeo = useMemo(() => new THREE.DodecahedronGeometry(1.0, 1), []);

  useEffect(() => {
    if (pebblesRef.current && pebbleMatrices.length > 0) {
      pebbleMatrices.forEach((m, idx) => pebblesRef.current?.setMatrixAt(idx, m));
      pebblesRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [pebbleMatrices]);

  return (
    <group name="WindingRiverReservoirGroup">
      {/* 1. Поверхность воды водохранилища (MeshPhysicalMaterial с сине-зеленым оттенком и отражениями) */}
      <mesh
        ref={waterMeshRef}
        geometry={riverWaterGeo}
        position={[0, waterY, 0]}
        receiveShadow
      >
        <primitive object={riverWaterMat} attach="material" />
      </mesh>

      {/* 2. Западная песчаная береговая линия (к стороне станции) */}
      <mesh geometry={westShoreGeo} position={[0, 0, 0]} receiveShadow>
        <primitive object={sandyShoreMat} attach="material" />
      </mesh>

      {/* 3. Восточная песчаная береговая линия (к дальней степи) */}
      <mesh geometry={eastShoreGeo} position={[0, 0, 0]} receiveShadow>
        <primitive object={sandyShoreMat} attach="material" />
      </mesh>

      {/* 4. Береговые речные камни и валуны у кромки воды */}
      {pebbleMatrices.length > 0 && (
        <instancedMesh
          ref={pebblesRef}
          args={[pebbleGeo, rockOutcropMat, pebbleMatrices.length]}
          receiveShadow
          castShadow
        />
      )}

      {/* 5. Заросли прибрежного камыша и тростника */}
      {reedClusters.map(([rx, rz], idx) => (
        <group key={`river-reed-${idx}`} position={[rx, waterY - 0.1, rz]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.08, 0.25, 1.8, 4]} />
            <primitive object={reedGrassMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 6. Водозаборные железобетонные оголовки гидросооружений охлаждения */}
      <group position={[230, gY + 0.6, 15]}>
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[12, 3.2, 28]} />
          <primitive object={concreteDarkPBRMat} attach="material" />
        </mesh>
        <mesh position={[4, 1.8, 0]}>
          <boxGeometry args={[1.5, 1.2, 26]} />
          <primitive object={steelTrussMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// 4. ЗАЩИТНЫЕ ЛЕСОПОЛОСЫ АЭС (PERIMETER SHELTERBELTS - INSTANCEDMESH)
// ============================================================================

function PerimeterShelterbelts() {
  const pineTrunkRef = useRef<THREE.InstancedMesh>(null);
  const pineFoliageRef = useRef<THREE.InstancedMesh>(null);
  const decTrunkRef = useRef<THREE.InstancedMesh>(null);
  const decFoliageRef = useRef<THREE.InstancedMesh>(null);

  const { pineTrunkMats, pineFoliageMats, decTrunkMats, decFoliageMats } = useMemo(() => {
    const ptMats: THREE.Matrix4[] = [];
    const pfMats: THREE.Matrix4[] = [];
    const dtMats: THREE.Matrix4[] = [];
    const dfMats: THREE.Matrix4[] = [];

    const dummyT = new THREE.Object3D();
    const dummyF = new THREE.Object3D();

    let seed = 45671;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const treePositions: Array<{ x: number; z: number; isPine: boolean; scale: number }> = [];

    // 1. Северная защитная лесополоса вдоль северного забора (Z = -98 до -110, X = -65 до 215)
    for (let x = -65; x <= 215; x += 6.5) {
      const zOffset = -100 + (rnd() - 0.5) * 8;
      treePositions.push({
        x: x + (rnd() - 0.5) * 2,
        z: zOffset,
        isPine: rnd() > 0.45,
        scale: 0.85 + rnd() * 0.4,
      });
      // Второй эшелон лесополосы
      treePositions.push({
        x: x + 3.2,
        z: zOffset - 7,
        isPine: rnd() > 0.4,
        scale: 0.9 + rnd() * 0.35,
      });
    }

    // 2. Восточная лесополоса между ОРУ-500 кВ и рекой (X = 224 до 236, Z = -90 до 115)
    for (let z = -90; z <= 115; z += 7.0) {
      const xOffset = 228 + (rnd() - 0.5) * 6;
      treePositions.push({
        x: xOffset,
        z: z + (rnd() - 0.5) * 2,
        isPine: rnd() > 0.5,
        scale: 0.85 + rnd() * 0.4,
      });
    }

    // 3. Южная лесополоса вдоль южного ограждения (Z = 126 до 138, кроме проезда шоссе X [-16, 16])
    for (let x = -65; x <= 215; x += 7.0) {
      if (x >= -20 && x <= 20) continue; // Пропуск для парадной въездной магистрали
      const zOffset = 130 + (rnd() - 0.5) * 6;
      treePositions.push({
        x: x + (rnd() - 0.5) * 2,
        z: zOffset,
        isPine: rnd() > 0.55,
        scale: 0.85 + rnd() * 0.35,
      });
    }

    // 4. Западная лесополоса за кластером градирен (X = -205 до -220, Z = -80 до 110)
    for (let z = -80; z <= 110; z += 7.5) {
      const xOffset = -212 + (rnd() - 0.5) * 7;
      treePositions.push({
        x: xOffset,
        z: z + (rnd() - 0.5) * 2,
        isPine: true, // Хвойный ветрозащитный барьер
        scale: 0.9 + rnd() * 0.4,
      });
    }

    // 5. Аллея вдоль южного подъездного шоссе (X = -15 и X = +15, Z = 165 до 390)
    for (let z = 165; z <= 390; z += 14.0) {
      [-14.5, 14.5].forEach((ax) => {
        treePositions.push({
          x: ax,
          z: z,
          isPine: false, // Стройные тополя вдоль трассы
          scale: 1.1 + rnd() * 0.25,
        });
      });
    }

    // Преобразование в матрицы InstancedMesh
    treePositions.forEach(({ x, z, isPine, scale }) => {
      const y = getSteppeGroundElevation(x, z);
      const rotY = rnd() * Math.PI * 2;

      if (isPine) {
        // Хвойное дерево: конусовидная сосна
        dummyT.position.set(x, y + 1.8 * scale, z);
        dummyT.rotation.set(0, rotY, 0);
        dummyT.scale.set(scale, scale, scale);
        dummyT.updateMatrix();
        ptMats.push(dummyT.matrix.clone());

        dummyF.position.set(x, y + 5.5 * scale, z);
        dummyF.rotation.set(0, rotY, 0);
        dummyF.scale.set(scale, scale, scale);
        dummyF.updateMatrix();
        pfMats.push(dummyF.matrix.clone());
      } else {
        // Лиственное дерево: тополь / береза
        dummyT.position.set(x, y + 2.1 * scale, z);
        dummyT.rotation.set(0, rotY, 0);
        dummyT.scale.set(scale, scale, scale);
        dummyT.updateMatrix();
        dtMats.push(dummyT.matrix.clone());

        dummyF.position.set(x, y + 5.8 * scale, z);
        dummyF.rotation.set(0, rotY, 0);
        dummyF.scale.set(scale * 1.1, scale * 1.3, scale * 1.1);
        dummyF.updateMatrix();
        dfMats.push(dummyF.matrix.clone());
      }
    });

    return {
      pineTrunkMats: ptMats,
      pineFoliageMats: pfMats,
      decTrunkMats: dtMats,
      decFoliageMats: dfMats,
    };
  }, []);

  useEffect(() => {
    if (pineTrunkRef.current && pineTrunkMats.length > 0) {
      pineTrunkMats.forEach((m, i) => pineTrunkRef.current?.setMatrixAt(i, m));
      pineTrunkRef.current.instanceMatrix.needsUpdate = true;
    }
    if (pineFoliageRef.current && pineFoliageMats.length > 0) {
      pineFoliageMats.forEach((m, i) => pineFoliageRef.current?.setMatrixAt(i, m));
      pineFoliageRef.current.instanceMatrix.needsUpdate = true;
    }
    if (decTrunkRef.current && decTrunkMats.length > 0) {
      decTrunkMats.forEach((m, i) => decTrunkRef.current?.setMatrixAt(i, m));
      decTrunkRef.current.instanceMatrix.needsUpdate = true;
    }
    if (decFoliageRef.current && decFoliageMats.length > 0) {
      decFoliageMats.forEach((m, i) => decFoliageRef.current?.setMatrixAt(i, m));
      decFoliageRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [pineTrunkMats, pineFoliageMats, decTrunkMats, decFoliageMats]);

  const pineTrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.32, 3.8, 6), []);
  const pineFoliageGeo = useMemo(() => new THREE.ConeGeometry(2.1, 8.2, 7), []);
  const decTrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.35, 4.4, 6), []);
  const decFoliageGeo = useMemo(() => new THREE.SphereGeometry(2.5, 7, 6), []);

  return (
    <group name="PerimeterShelterbeltsGroup">
      {pineTrunkMats.length > 0 && (
        <instancedMesh
          ref={pineTrunkRef}
          args={[pineTrunkGeo, treeTrunkMat, pineTrunkMats.length]}
          receiveShadow
        />
      )}
      {pineFoliageMats.length > 0 && (
        <instancedMesh
          ref={pineFoliageRef}
          args={[pineFoliageGeo, pineNeedlesMat, pineFoliageMats.length]}
          receiveShadow
        />
      )}
      {decTrunkMats.length > 0 && (
        <instancedMesh
          ref={decTrunkRef}
          args={[decTrunkGeo, treeTrunkMat, decTrunkMats.length]}
          receiveShadow
        />
      )}
      {decFoliageMats.length > 0 && (
        <instancedMesh
          ref={decFoliageRef}
          args={[decFoliageGeo, deciduousFoliageMat, decFoliageMats.length]}
          receiveShadow
        />
      )}
    </group>
  );
}

// ============================================================================
// 5. РЕДКИЕ КУСТАРНИКИ И СТЕПНЫЕ ТРАВЫ НА ХОЛМАХ (InstancedMesh)
// ============================================================================

function SteppeVegetationDensity() {
  const gY = FLOOR_LEVELS.ground;
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const shrubRef = useRef<THREE.InstancedMesh>(null);

  const { grassMatrices, shrubMatrices } = useMemo(() => {
    const gMats: THREE.Matrix4[] = [];
    const sMats: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    let seed = 98765;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // 1. Сухая степная трава и ковыль на холмах
    for (let i = 0; i < 340; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 75 + rnd() * 280;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Исключаем промплощадку станции и южное шоссе
      if (x >= -220 && x <= 220 && z >= -120 && z <= 150) continue;
      if (Math.abs(x) <= 20 && z > 140) continue;

      // Исключаем чашу водоема и кромку воды
      const lakeCenterlineX = 265 + Math.sin(z * 0.008) * 32 + Math.cos(z * 0.016) * 14;
      const basinHalfWidth = 65 + Math.exp(-Math.pow((z - 10) / 180, 2)) * 42;
      if (Math.abs(x - lakeCenterlineX) < basinHalfWidth + 4) continue;

      const y = getSteppeGroundElevation(x, z);
      if (y < gY - 0.25) continue; // Защита от спавна в воде

      const s = 0.6 + rnd() * 0.9;
      dummy.position.set(x, y + 0.05, z);
      dummy.rotation.y = rnd() * Math.PI * 2;
      dummy.scale.set(s, s * (0.8 + rnd() * 0.4), s);
      dummy.updateMatrix();
      gMats.push(dummy.matrix.clone());
    }

    // 2. Степные кустарники (полынь, саксаул, тамариск)
    for (let i = 0; i < 220; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 80 + rnd() * 270;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      if (x >= -220 && x <= 220 && z >= -120 && z <= 150) continue;
      if (Math.abs(x) <= 20 && z > 140) continue;

      const lakeCenterlineX = 265 + Math.sin(z * 0.008) * 32 + Math.cos(z * 0.016) * 14;
      const basinHalfWidth = 65 + Math.exp(-Math.pow((z - 10) / 180, 2)) * 42;
      if (Math.abs(x - lakeCenterlineX) < basinHalfWidth + 6) continue;

      const y = getSteppeGroundElevation(x, z);
      if (y < gY - 0.25) continue;

      const s = 0.75 + rnd() * 1.05;
      dummy.position.set(x, y + s * 0.35, z);
      dummy.rotation.y = rnd() * Math.PI * 2;
      dummy.scale.set(s, s * 0.65, s);
      dummy.updateMatrix();
      sMats.push(dummy.matrix.clone());
    }

    return { grassMatrices: gMats, shrubMatrices: sMats };
  }, [gY]);

  useEffect(() => {
    if (grassRef.current && grassMatrices.length > 0) {
      grassMatrices.forEach((m, i) => grassRef.current?.setMatrixAt(i, m));
      grassRef.current.instanceMatrix.needsUpdate = true;
    }
    if (shrubRef.current && shrubMatrices.length > 0) {
      shrubMatrices.forEach((m, i) => shrubRef.current?.setMatrixAt(i, m));
      shrubRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [grassMatrices, shrubMatrices]);

  const coneGeo = useMemo(() => new THREE.ConeGeometry(0.5, 0.95, 4), []);
  const dodecaGeo = useMemo(() => new THREE.DodecahedronGeometry(0.7, 0), []);

  return (
    <group name="SteppeVegetationDensityGroup">
      {grassMatrices.length > 0 && (
        <instancedMesh
          ref={grassRef}
          args={[coneGeo, dryGrassMat, grassMatrices.length]}
          receiveShadow
        />
      )}
      {shrubMatrices.length > 0 && (
        <instancedMesh
          ref={shrubRef}
          args={[dodecaGeo, greenShrubMat, shrubMatrices.length]}
          receiveShadow
        />
      )}
    </group>
  );
}

// ============================================================================
// 4. SOLID HYPERBOLOID COOLING TOWER & INTERNAL WATER BASIN (NVNPP REFERENCE)
// ============================================================================

interface CoolingTowerProps {
  position: [number, number, number];
  name?: string;
  scale?: [number, number, number] | number;
}

function CoolingTower({ position, name = 'CoolingTower', scale = 1 }: CoolingTowerProps) {
  const height = 94;
  const segments = 18;

  // Hyperbolic profile points
  const lathePoints = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = t * height;
      const normY = (y - 62) / 45;
      const r = 21 * Math.sqrt(1 + normY * normY * 0.95);
      pts.push(new THREE.Vector2(r, y));
    }
    return pts;
  }, [height]);

  return (
    <group position={position} name={name} scale={scale}>
      {/* 1. Double-Sided Solid Hyperboloid Concrete Shell */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[lathePoints, segments]} />
        <primitive object={coolingTowerShellMat} attach="material" />
      </mesh>

      {/* 2. Base Air Intake V-Columns around perimeter */}
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i / 28) * Math.PI * 2;
        const br = 33.5;
        return (
          <group
            key={`vcol-${i}`}
            position={[Math.cos(a) * br, 3.2, Math.sin(a) * br]}
            rotation={[0, -a, 0]}
          >
            <mesh position={[-0.45, 0, 0]} rotation={[0, 0, 0.16]} castShadow>
              <boxGeometry args={[0.75, 6.8, 0.75]} />
              <primitive object={concreteDarkPBRMat} attach="material" />
            </mesh>
            <mesh position={[0.45, 0, 0]} rotation={[0, 0, -0.16]} castShadow>
              <boxGeometry args={[0.75, 6.8, 0.75]} />
              <primitive object={concreteDarkPBRMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 3. Internal Water Cooling Basin Foundation (Dark Concrete #2F3538) */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <cylinderGeometry args={[34.8, 35.2, 0.8, segments]} />
        <primitive object={coolingTowerBasinMat} attach="material" />
      </mesh>

      {/* Basin Rim Retaining Wall */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[34.8, 34.8, 1.6, segments, 1, true]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* Internal Water Surface Pool inside Basin */}
      <mesh position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[34.2, 32]} />
        <primitive object={riverWaterMat} attach="material" />
      </mesh>

      {/* 4. Realistic Internal Concrete Support Columns inside Lower Ring */}
      {/* Central Heavy Pillar */}
      <mesh position={[0, 4.4, 0]} castShadow>
        <cylinderGeometry args={[2.0, 2.4, 7.8, 16]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* Concentric Internal Support Columns (holding distribution deck) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const cr = 11.5;
        return (
          <mesh key={`incol-1-${i}`} position={[Math.cos(a) * cr, 4.2, Math.sin(a) * cr]} castShadow>
            <cylinderGeometry args={[0.65, 0.75, 7.5, 12]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
        );
      })}

      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const cr = 22.5;
        return (
          <mesh key={`incol-2-${i}`} position={[Math.cos(a) * cr, 4.2, Math.sin(a) * cr]} castShadow>
            <cylinderGeometry args={[0.65, 0.75, 7.5, 12]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
        );
      })}

      {/* 5. Circular Internal Grid: Cooling Fill Pack & Sprinkler Distribution Deck */}
      <group position={[0, 8.2, 0]}>
        {/* Dark Metallic Grid Structure */}
        <mesh receiveShadow>
          <cylinderGeometry args={[30.5, 30.5, 0.45, 32]} />
          <primitive object={coolingFillGrateMat} attach="material" />
        </mesh>

        {/* Radial Header Water Supply Pipes */}
        {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((ang, ai) => (
          <mesh key={`rad-pipe-${ai}`} rotation={[0, ang, 0]} position={[0, 0.6, 0]}>
            <boxGeometry args={[58, 0.6, 0.6]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
        ))}

        {/* Inspection Catwalk across center with yellow handrails */}
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[60, 0.15, 1.4]} />
          <primitive object={steelTrussMat} attach="material" />
        </mesh>
      </group>

      {/* 6. Subtle Rising Cooling Steam / Vapor Plumes from top exhaust rim */}
      <mesh position={[0, height + 8, 0]}>
        <cylinderGeometry args={[26.0, 21.0, 18, 24, 1, true]} />
        <primitive object={coolingVaporMat} attach="material" />
      </mesh>
      <mesh position={[0, height + 20, 0]}>
        <cylinderGeometry args={[32.0, 26.0, 16, 24, 1, true]} />
        <primitive object={coolingVaporMat} attach="material" />
      </mesh>
    </group>
  );
}

// ============================================================================
// 5. VENTILATION CHIMNEYS (ВЕНТТРУБЫ) - RED/WHITE STRIPED WITH RING PLATFORMS
// ============================================================================

function VentilationChimneys({ position }: { position: [number, number, number] }) {
  const stackHeight = 58;
  const radius = 1.7;
  const bandCount = 7;
  const bandHeight = stackHeight / bandCount;

  return (
    <group position={position}>
      {/* Heavy Concrete Foundation Base */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.8, 3.2, 3, 16]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* Alternating Red and White Cylindrical Aviation Bands */}
      {Array.from({ length: bandCount }).map((_, i) => {
        const y = 3 + i * bandHeight + bandHeight / 2;
        const isRed = i % 2 === 0;
        return (
          <mesh key={`vent-band-${i}`} position={[0, y, 0]} castShadow>
            <cylinderGeometry args={[radius, radius, bandHeight, 24]} />
            <primitive object={isRed ? ventRedBandMat : ventWhiteBandMat} attach="material" />
          </mesh>
        );
      })}

      {/* Realistic Metallic Ring Maintenance Platforms with handrails */}
      {[18, 34, 49].map((py) => (
        <group key={`platform-${py}`} position={[0, py, 0]}>
          {/* Deck disc */}
          <mesh receiveShadow>
            <cylinderGeometry args={[radius + 1.2, radius + 1.2, 0.2, 24]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
          {/* Vertical railing posts */}
          {Array.from({ length: 8 }).map((_, pi) => {
            const pa = (pi / 8) * Math.PI * 2;
            return (
              <mesh
                key={`rpost-${pi}`}
                position={[Math.cos(pa) * (radius + 1.15), 0.35, Math.sin(pa) * (radius + 1.15)]}
              >
                <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
                <primitive object={steelTrussMat} attach="material" />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Vertical caged maintenance ladder along side */}
      <mesh position={[radius + 0.25, stackHeight / 2 + 1.5, 0]}>
        <boxGeometry args={[0.3, stackHeight - 3, 0.6]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>

      {/* Top exhaust crown with lightning arrester spire */}
      <mesh position={[0, stackHeight + 3.1, 0]}>
        <cylinderGeometry args={[radius + 0.15, radius, 0.4, 24]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>
      <mesh position={[0, stackHeight + 4.5, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 2.5, 8]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>
      {/* Obstruction Warning Beacon Light at top */}
      <mesh position={[0, stackHeight + 3.4, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#ff2211" emissive="#ff1100" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

// ============================================================================
// 7. ELEVATED PIPE RACKS (ТРУБОПРОВОДНЫЕ ЭСТАКАДЫ)
// ============================================================================

function ElevatedPipeRacks() {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group position={[0, gY, 0]}>
      {/* Main East-West Utility Pipe Gantry connecting Reactor Building & Turbine Hall area */}
      <group position={[38, 0, -36]}>
        {/* Steel Truss Supporting Bents every 14m */}
        {[-32, -18, -4, 10, 24, 38].map((bx) => (
          <group key={`bent-${bx}`} position={[bx, 0, 0]}>
            {/* Concrete Footing Pads */}
            {[-2.2, 2.2].map((fz) => (
              <mesh key={`fpad-${fz}`} position={[0, 0.3, fz]}>
                <boxGeometry args={[0.9, 0.6, 0.9]} />
                <primitive object={concreteDarkPBRMat} attach="material" />
              </mesh>
            ))}
            {/* Vertical H-beams */}
            {[-2.2, 2.2].map((fz) => (
              <mesh key={`hcol-${fz}`} position={[0, 4.2, fz]}>
                <boxGeometry args={[0.35, 7.8, 0.35]} />
                <primitive object={steelTrussMat} attach="material" />
              </mesh>
            ))}
            {/* Horizontal crossbeams */}
            <mesh position={[0, 4.5, 0]}>
              <boxGeometry args={[0.35, 0.35, 4.8]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
            <mesh position={[0, 8.1, 0]}>
              <boxGeometry args={[0.35, 0.35, 4.8]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Longitudinal Truss Span Beams */}
        {[-2.2, 2.2].map((sz) => (
          <group key={`long-truss-${sz}`} position={[3, 0, sz]}>
            <mesh position={[0, 8.1, 0]}>
              <boxGeometry args={[74, 0.3, 0.3]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
            <mesh position={[0, 4.5, 0]}>
              <boxGeometry args={[74, 0.3, 0.3]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Insulated Steam Pipes on Upper Tier */}
        {[-1.2, 1.2].map((pz) => (
          <mesh key={`st-pipe-${pz}`} rotation={[0, 0, Math.PI / 2]} position={[3, 8.8, pz]}>
            <cylinderGeometry args={[0.42, 0.42, 74, 16]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
        ))}

        {/* Feedwater Pipes on Lower Tier with Blue Identifying Bands */}
        {[-1.4, 0, 1.4].map((pz, pi) => (
          <mesh key={`fw-pipe-${pz}`} rotation={[0, 0, Math.PI / 2]} position={[3, 5.2, pz]}>
            <cylinderGeometry args={[0.28, 0.28, 74, 16]} />
            <primitive object={pi === 1 ? pipeGasMat : pipeFeedwaterMat} attach="material" />
          </mesh>
        ))}

        {/* Thermal Expansion U-Loop (П-образный компенсатор) in the center */}
        <group position={[3, 8.8, 0]}>
          <mesh position={[0, 2.2, -1.2]}>
            <boxGeometry args={[0.8, 4.2, 0.8]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <boxGeometry args={[0.8, 0.8, 2.8]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
          <mesh position={[0, 2.2, 1.2]}>
            <boxGeometry args={[0.8, 4.2, 0.8]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ============================================================================
// 8. HIGH-VOLTAGE TRANSMISSION PYLONS (ЛЭП) & 500 kV OUTDOOR SWITCHYARD (ОРУ-500 кВ)
// ============================================================================

function TransmissionPylon({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} name="HV_TransmissionPylon">
      {/* 4 Concrete Foundation Pillars */}
      {[
        [-2.5, -2.5],
        [2.5, -2.5],
        [-2.5, 2.5],
        [2.5, 2.5],
      ].map(([fx, fz], fi) => (
        <mesh key={`pylon-pad-${fi}`} position={[fx, 0.5, fz]}>
          <boxGeometry args={[1.2, 1.0, 1.2]} />
          <primitive object={concreteDarkPBRMat} attach="material" />
        </mesh>
      ))}

      {/* Main Tapered 4-Legged Lattice Steel Body */}
      <mesh position={[0, 14, 0]} castShadow>
        <cylinderGeometry args={[1.1, 3.6, 28, 4]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>

      {/* Upper Waist to Peak */}
      <mesh position={[0, 31, 0]} castShadow>
        <cylinderGeometry args={[0.4, 1.1, 8, 4]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>

      {/* Lower Crossarm (26m height, 18m span) */}
      <group position={[0, 24, 0]}>
        <mesh castShadow>
          <boxGeometry args={[18, 0.8, 1.4]} />
          <primitive object={steelTrussMat} attach="material" />
        </mesh>
        {/* Ceramic Insulator String Assemblies hanging down */}
        {[-8, -4, 4, 8].map((ix) => (
          <group key={`ins-lo-${ix}`} position={[ix, -1.8, 0]}>
            <mesh>
              <cylinderGeometry args={[0.18, 0.22, 2.8, 8]} />
              <primitive object={ceramicInsulatorMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Middle/Upper Crossarm (30m height, 13m span) */}
      <group position={[0, 29, 0]}>
        <mesh castShadow>
          <boxGeometry args={[13, 0.7, 1.2]} />
          <primitive object={steelTrussMat} attach="material" />
        </mesh>
        {[-5.5, 5.5].map((ix) => (
          <group key={`ins-hi-${ix}`} position={[ix, -1.6, 0]}>
            <mesh>
              <cylinderGeometry args={[0.18, 0.22, 2.5, 8]} />
              <primitive object={ceramicInsulatorMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Top Ground Wire Spire Peak */}
      <mesh position={[0, 36, 0]}>
        <cylinderGeometry args={[0.08, 0.35, 4, 4]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>
    </group>
  );
}

// 500 kV Gantry Portal Towers for Switchyard busbars
function SwitchyardPortal({ position, length = 32 }: { position: [number, number, number]; length?: number }) {
  return (
    <group position={position}>
      {/* Concrete Foundation pads */}
      {[-length / 2, length / 2].map((px, pi) => (
        <group key={`portal-leg-${pi}`} position={[px, 0, 0]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.6, 1.0, 1.6]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
          {/* Lattice steel column leg (height 20m) */}
          <mesh position={[0, 10.5, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.9, 20, 4]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
        </group>
      ))}
      {/* Horizontal Steel Truss Crossbeam at 20m */}
      <mesh position={[0, 20.5, 0]} castShadow>
        <boxGeometry args={[length + 2, 0.8, 0.8]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>
      {/* Suspended Insulator Strings */}
      {[-length / 3, 0, length / 3].map((ix) => (
        <mesh key={`p-ins-${ix}`} position={[ix, 18.8, 0]}>
          <cylinderGeometry args={[0.15, 0.18, 2.4, 8]} />
          <primitive object={ceramicInsulatorMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function OutdoorSwitchyard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="OutdoorSwitchyard_500kV">
      {/* Gravel Substation Foundation Pad (115m x 95m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.05, 0]}>
        <planeGeometry args={[115, 95]} />
        <meshStandardMaterial color="#686c72" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* 4 Steel Lattice Portal Gantry Towers spanning the switchyard field */}
      <SwitchyardPortal position={[0, 0, -32]} length={96} />
      <SwitchyardPortal position={[0, 0, -10]} length={96} />
      <SwitchyardPortal position={[0, 0, 12]} length={96} />
      <SwitchyardPortal position={[0, 0, 34]} length={96} />

      {/* SF6 Gas Circuit Breakers (Элегазовые выключатели ВГТ-500) */}
      {[-38, -20, -2, 16, 34].map((bx) => (
        <group key={`cb-bay-${bx}`} position={[bx, 0, -20]}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[2.4, 0.8, 3.2]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 4.2, 12]} />
            <primitive object={industrialMetalDarkMat} attach="material" />
          </mesh>
          {/* Hydraulic operating mechanism cubicle */}
          <mesh position={[0, 1.2, 1.4]} castShadow>
            <boxGeometry args={[1.2, 1.6, 1.0]} />
            <primitive object={wallBeigePanelMat} attach="material" />
          </mesh>
          {/* Triple High-Voltage Porcelain Bushings */}
          {[-0.9, 0, 0.9].map((pz, pi) => (
            <mesh key={`cb-bush-${pi}`} position={[0, 5.4, pz]}>
              <cylinderGeometry args={[0.16, 0.22, 2.4, 8]} />
              <primitive object={ceramicInsulatorMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Disconnectors & Earthing Switches (Разъединители РГП-500) */}
      {[-38, -20, -2, 16, 34].map((bx) => (
        <group key={`disc-bay-${bx}`} position={[bx, 0, 2]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[2.0, 0.6, 2.4]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
          {/* Support lattice steel pedestal */}
          <mesh position={[0, 2.2, 0]} castShadow>
            <boxGeometry args={[0.8, 3.2, 0.8]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
          {/* Pantograph / horizontal contact blades */}
          <mesh position={[0, 4.2, 0]}>
            <boxGeometry args={[2.8, 0.2, 0.4]} />
            <primitive object={busbarAluMat} attach="material" />
          </mesh>
          {[-1.2, 1.2].map((ix) => (
            <mesh key={`disc-ins-${ix}`} position={[ix, 5.2, 0]}>
              <cylinderGeometry args={[0.14, 0.18, 1.8, 8]} />
              <primitive object={ceramicInsulatorMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Instrument Current & Voltage Transformers (ТТ и ТН 500 кВ) */}
      {[-38, -20, -2, 16, 34].map((bx) => (
        <group key={`trans-bay-${bx}`} position={[bx, 0, 24]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[1.4, 0.6, 1.4]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
          <mesh position={[0, 2.0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 2.8, 12]} />
            <primitive object={industrialMetalDarkMat} attach="material" />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <cylinderGeometry args={[0.22, 0.28, 2.2, 8]} />
            <primitive object={ceramicInsulatorMat} attach="material" />
          </mesh>
          {/* Surge Arrester (ОПН-500) */}
          <mesh position={[1.4, 3.6, 0]}>
            <cylinderGeometry args={[0.15, 0.18, 3.4, 8]} />
            <primitive object={ceramicInsulatorMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Rigid Aluminum Busbars (Ошиновка 500 кВ) running longitudinally */}
      {[-30, -12, 8, 26].map((by) => (
        <mesh key={`busbar-long-${by}`} position={[by, 16.5, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.15, 0.15, 86]} />
          <primitive object={busbarAluMat} attach="material" />
        </mesh>
      ))}

      {/* Transmission Pylons leading power out of Switchyard to regional grid */}
      <TransmissionPylon position={[42, 0, 18]} rotation={-0.1} />
      <TransmissionPylon position={[-42, 0, 18]} rotation={0.1} />

      {/* High-Voltage Transmission Line Conductor Spans */}
      {[-8, -4, 4, 8].map((cx) => (
        <mesh key={`cable-span-${cx}`} position={[cx, 23.5, 20]}>
          <boxGeometry args={[0.08, 0.08, 32]} />
          <primitive object={transmissionCableMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// 10. CIRCULATING WATER PUMPHOUSE STATIONS (БЛОЧНЫЕ НАСОСНЫЕ СТАНЦИИ - БНС)
// ============================================================================

function CirculatingWaterPumphouse({
  position,
  name = 'CirculatingWaterPumphouse',
}: {
  position: [number, number, number];
  name?: string;
}) {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group position={position} name={name}>
      {/* Substructure Intake Water Basin */}
      <mesh position={[0, gY + 1.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[26, 2.4, 22]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* Machinery Hall Superstructure */}
      <mesh position={[0, gY + 2.4 + 4.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 8.4, 20]} />
        <primitive object={wallBeigePanelMat} attach="material" />
      </mesh>
      {/* Protective base skirt */}
      <mesh position={[0, gY + 3.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[24.2, 2.2, 20.2]} />
        <primitive object={baseRedBrownSkirtMat} attach="material" />
      </mesh>

      {/* 4 Vertical Mixed-Flow Circulating Water Pump Motors on Deck */}
      {[-8, -2.6, 2.6, 8].map((px) => (
        <group key={`pump-motor-${px}`} position={[px, gY + 11.2, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.1, 1.2, 2.8, 16]} />
            <primitive object={turbineLimeOliveMat} attach="material" />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <cylinderGeometry args={[0.6, 0.8, 0.8, 16]} />
            <primitive object={industrialMetalDarkMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Twin Massive Circulating Water Conduit Mains (Ду 2200мм) running towards plant */}
      {[-4, 4].map((pz, pi) => (
        <group key={`circ-pipe-${pi}`} position={[16, gY + 2.2, pz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[1.1, 1.1, 14, 24]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
          {[-4, 4].map((ox) => (
            <mesh key={`saddle-${ox}`} position={[ox, -1.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.2, 2.0, 2.8]} />
              <primitive object={concreteDarkPBRMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// 11. SPECIAL NUCLEAR AUXILIARY & WATER TREATMENT BUILDING (СПЕЦКОРПУС)
// ============================================================================

function SpecialAuxiliaryBuilding({ position }: { position: [number, number, number] }) {
  const gY = FLOOR_LEVELS.ground;
  const bldgW = 42;
  const bldgD = 28;
  const bldgH = 22;

  return (
    <group position={position} name="SpecialAuxiliaryBuilding">
      {/* 1. Monolithic Foundation & Red-Brown Protective Skirt */}
      <mesh position={[0, gY + 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[bldgW, 3.5, bldgD]} />
        <primitive object={baseRedBrownSkirtMat} attach="material" />
      </mesh>

      {/* 2. Main Reinforced Concrete Monolithic Body */}
      <mesh position={[0, gY + 3.5 + (bldgH - 3.5) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bldgW - 0.2, bldgH - 3.5, bldgD - 0.2]} />
        <primitive object={specialBuildingConcreteMat} attach="material" />
      </mesh>

      {/* 3. Rooftop Ventilation Center & Parapet */}
      <mesh position={[0, gY + bldgH + 0.6, 0]}>
        <boxGeometry args={[bldgW, 1.2, bldgD]} />
        <primitive object={wallBeigePanelMat} attach="material" />
      </mesh>
      <mesh position={[0, gY + bldgH + 2.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[24, 3.2, 16]} />
        <primitive object={wallBeigePanelMat} attach="material" />
      </mesh>

      {/* 4. Heavy Transport Rail/Truck Access Portal (Западный торец) */}
      <group position={[-bldgW / 2 - 0.2, gY, 0]}>
        <mesh position={[0.2, 4.0, 0]}>
          <boxGeometry args={[0.3, 7.5, 9.0]} />
          <primitive object={industrialMetalDarkMat} attach="material" />
        </mesh>
        <mesh position={[-4.0, 0.4, 0]} receiveShadow>
          <boxGeometry args={[8.0, 0.8, 12.0]} />
          <primitive object={concreteDarkPBRMat} attach="material" />
        </mesh>
      </group>

      {/* 5. Dedicated Filtered Special Building Ventilation Chimney (Венттруба спецкорпуса) */}
      <group position={[-bldgW / 2 + 6, gY, -bldgD / 2 - 4]}>
        <mesh position={[0, 2.0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.4, 2.8, 4, 16]} />
          <primitive object={concreteDarkPBRMat} attach="material" />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => {
          const y = 4 + i * 7 + 3.5;
          const isRed = i % 2 === 0;
          return (
            <mesh key={`sb-vent-${i}`} position={[0, y, 0]} castShadow>
              <cylinderGeometry args={[1.5, 1.5, 7, 24]} />
              <primitive object={isRed ? ventRedBandMat : ventWhiteBandMat} attach="material" />
            </mesh>
          );
        })}
        {[20, 36, 48].map((py) => (
          <mesh key={`sb-plat-${py}`} position={[0, py, 0]}>
            <cylinderGeometry args={[2.5, 2.5, 0.25, 20]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* 6. Overhead Technological Pipe & Cable Gallery connecting South to Reactor Island */}
      <group position={[0, gY + 13.5, bldgD / 2 + 18]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4.2, 3.4, 36]} />
          <primitive object={wallBeigePanelMat} attach="material" />
        </mesh>
        {[-9, 9].map((pz) => (
          <mesh key={`sb-pier-${pz}`} position={[0, -6.5, pz]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 13.0, 1.2]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
        ))}
        {[-1.2, 0, 1.2].map((px, pi) => (
          <mesh key={`sb-pipe-${pi}`} position={[px, 2.0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 36, 16]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// 9. STANDBY DIESEL GENERATOR STATION & ADMINISTRATIVE BUILDING
// ============================================================================

function DieselGeneratorStation({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {Array.from({ length: 4 }).map((_, i) => {
        const x = -21 + i * 14;
        return (
          <group key={`d-block-${i}`} position={[x, 0, 0]}>
            {/* Red-brown protective skirt base trim */}
            <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
              <boxGeometry args={[11, 3.5, 16]} />
              <primitive object={baseRedBrownSkirtMat} attach="material" />
            </mesh>
            {/* Upper warm beige industrial panels */}
            <mesh position={[0, 6.75, 0]} castShadow receiveShadow>
              <boxGeometry args={[10.8, 6.5, 15.8]} />
              <primitive object={wallBeigePanelMat} attach="material" />
            </mesh>
            {/* Louver air intake & roll-up equipment door */}
            <mesh position={[0, 5, 8.1]}>
              <boxGeometry args={[7, 4.5, 0.2]} />
              <primitive object={industrialMetalDarkMat} attach="material" />
            </mesh>
            {/* Rooftop diesel exhaust silencer & stack */}
            <mesh position={[3, 13, -5]} castShadow>
              <cylinderGeometry args={[0.55, 0.55, 7.5, 16]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function AdministrativeBuilding({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} name="AdministrativeBuilding_Complex">
      {/* 1. Main 4-Story Administrative Headquarters */}
      <group position={[0, 0, 0]}>
        {/* Lower red-brown protective skirt base */}
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[48, 4, 22]} />
          <primitive object={baseRedBrownSkirtMat} attach="material" />
        </mesh>
        {/* Upper warm beige wall panels */}
        <mesh position={[0, 9.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[47.8, 11, 21.8]} />
          <primitive object={wallBeigePanelMat} attach="material" />
        </mesh>
        {/* Central Glazed Curtain Wall Atrium */}
        <mesh position={[0, 9.5, 11.0]}>
          <boxGeometry args={[20, 10.5, 0.4]} />
          <primitive object={abkGlassCurtainMat} attach="material" />
        </mesh>
        {/* Window ribbon strips on lateral wings */}
        {[-18, 18].map((wx, wi) => (
          <group key={`abk-win-wing-${wi}`} position={[wx, 0, 11.0]}>
            {[4.8, 8.8, 12.8].map((wy, wj) => (
              <mesh key={`abk-win-${wi}-${wj}`} position={[0, wy, 0]}>
                <boxGeometry args={[10, 2.2, 0.2]} />
                <primitive object={glassWindowMat} attach="material" />
              </mesh>
            ))}
          </group>
        ))}
        {/* Executive Entrance Canopy with Rosatom corporate accent */}
        <mesh position={[0, 3.8, 13.5]} castShadow>
          <boxGeometry args={[16, 0.4, 6]} />
          <primitive object={wallBeigePanelMat} attach="material" />
        </mesh>
        {/* Stainless steel entrance pillars */}
        {[-7, 7].map((px) => (
          <mesh key={`abk-col-${px}`} position={[px, 1.9, 15.5]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 3.8, 12]} />
            <primitive object={machinedSteelMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* 2. Entrance Plaza with Paved Walkways and Flagpoles */}
      <group position={[0, 0, 25]}>
        {/* Concrete paved plaza apron */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
          <planeGeometry args={[56, 26]} />
          <primitive object={concreteWalkwayMat} attach="material" />
        </mesh>
        {/* Ornamental green lawn strips */}
        {[-22, 22].map((lx) => (
          <mesh key={`lawn-${lx}`} rotation={[-Math.PI / 2, 0, 0]} position={[lx, 0.06, 0]} receiveShadow>
            <planeGeometry args={[8, 22]} />
            <primitive object={siteGrassLawnMaterial} attach="material" />
          </mesh>
        ))}
        {/* 3 Stainless Steel Flagpoles */}
        {[-3, 0, 3].map((fx) => (
          <group key={`flag-${fx}`} position={[fx, 0, 4]}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.3, 0.4, 0.6, 12]} />
              <primitive object={concreteDarkPBRMat} attach="material" />
            </mesh>
            <mesh position={[0, 7.5, 0]} castShadow>
              <cylinderGeometry args={[0.06, 0.1, 14.5, 12]} />
              <primitive object={machinedSteelMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. Central Security Checkpoint Pavilion (КПП / Проходная) */}
      <group position={[0, 0, 44]}>
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[18, 4.4, 8]} />
          <primitive object={wallBeigePanelMat} attach="material" />
        </mesh>
        <mesh position={[0, 2.2, 4.1]}>
          <boxGeometry args={[14, 2.0, 0.2]} />
          <primitive object={glassWindowMat} attach="material" />
        </mesh>
        {/* Vehicle inspection canopy over barrier lanes */}
        <mesh position={[14, 4.6, 0]} castShadow>
          <boxGeometry args={[10, 0.4, 12]} />
          <primitive object={wallBeigePanelMat} attach="material" />
        </mesh>
        {/* Vehicle Boom Barriers (Шлагбаумы) */}
        <mesh position={[14, 1.0, 0]}>
          <boxGeometry args={[8, 0.12, 0.12]} />
          <primitive object={ventRedBandMat} attach="material" />
        </mesh>
      </group>

      {/* 4. Staff & Visitor Asphalt Parking Lot with white stall markings */}
      <group position={[-42, 0, 24]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
          <planeGeometry args={[26, 38]} />
          <primitive object={asphaltRoadMat} attach="material" />
        </mesh>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={`park-bay-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, -15 + i * 6]}>
            <planeGeometry args={[22, 0.2]} />
            <primitive object={roadMarkingMat} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// 10. STRUCTURED ASPHALT ROAD NETWORK & LANDSCAPING (PERIMETER & ACCESS ROADS)
// ============================================================================

function RoadSegment({
  position,
  rotation = 0,
  length,
  width = 12,
}: {
  position: [number, number, number];
  rotation?: number;
  length: number;
  width?: number;
}) {
  const gY = FLOOR_LEVELS.ground;
  const halfW = width / 2;

  return (
    <group position={[position[0], gY + 0.05, position[2]]} rotation={[0, rotation, 0]}>
      {/* Asphalt Surface strictly at Y = gY + 0.05 to eliminate Y/Z-fighting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <primitive object={asphaltRoadMat} attach="material" />
      </mesh>

      {/* Solid White Border Lines on both road edges */}
      {[-halfW + 0.45, halfW - 0.45].map((ez) => (
        <mesh key={`edge-line-${ez}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, ez]}>
          <planeGeometry args={[length, 0.25]} />
          <primitive object={roadMarkingMat} attach="material" />
        </mesh>
      ))}

      {/* Dashed White Center Divider Line */}
      {Array.from({ length: Math.max(1, Math.floor(length / 10)) }).map((_, i) => {
        const dx = -length / 2 + 5 + i * 10;
        return (
          <mesh key={`dash-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[dx, 0.01, 0]}>
            <planeGeometry args={[5, 0.3]} />
            <primitive object={roadMarkingMat} attach="material" />
          </mesh>
        );
      })}

      {/* Raised Concrete Curbs flanking both edges */}
      {[-halfW - 0.2, halfW + 0.2].map((cz) => (
        <mesh key={`curb-${cz}`} position={[0, 0.08, cz]}>
          <boxGeometry args={[length, 0.22, 0.4]} />
          <primitive object={concreteCurbMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function RoadwaysAndLandscaping() {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group name="RoadwaysAndLandscaping">
      {/* 1. Reactor Island Heavy Concrete Paved Apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, gY + 0.02, 0]} receiveShadow>
        <ringGeometry args={[20.5, 52, 48]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* 2. Main Plant Perimeter Loop Road around Reactor Island & Turbine Hall */}
      {/* South segment: Z = 42, X from -52 to 136 (Length = 188m) */}
      <RoadSegment position={[42, 0, 42]} length={188} width={12} />
      {/* North segment: Z = -48, X from -52 to 136 (Length = 188m) */}
      <RoadSegment position={[42, 0, -48]} length={188} width={12} />
      {/* East segment: X = 136, Z from -48 to 42 (Length = 90m) */}
      <RoadSegment position={[136, 0, -3]} rotation={Math.PI / 2} length={90} width={12} />
      {/* West segment: X = -52, Z from -48 to 42 (Length = 90m) */}
      <RoadSegment position={[-52, 0, -3]} rotation={Math.PI / 2} length={90} width={12} />

      {/* 3. Western Arterial Road Network to 4 Cooling Towers & Pumphouses */}
      <RoadSegment position={[-115, 0, -3]} rotation={Math.PI / 2} length={90} width={12} />
      <RoadSegment position={[-147.5, 0, 15]} rotation={0} length={85} width={10} />
      <RoadSegment position={[-180, 0, -3]} rotation={Math.PI / 2} length={90} width={10} />
      <RoadSegment position={[-147.5, 0, -48]} rotation={0} length={75} width={10} />
      <RoadSegment position={[-147.5, 0, 42]} rotation={0} length={75} width={10} />

      {/* 4. Northern Branch to Special Auxiliary Building (Спецкорпус) */}
      <RoadSegment position={[-28, 0, -62]} rotation={Math.PI / 2} length={32} width={10} />
      <RoadSegment position={[-28, 0, -88]} rotation={0} length={36} width={10} />

      {/* 5. Eastern Branch to Step-Up Transformers & Switchyard */}
      <RoadSegment position={[160, 0, 10]} rotation={Math.PI / 2} length={68} width={10} />

      {/* 6. Southern Avenue & External Access Highway through the Steppe */}
      <RoadSegment position={[0, 0, 90]} rotation={Math.PI / 2} length={96} width={12} />
      <RoadSegment position={[0, 0, 155]} rotation={Math.PI / 2} length={36} width={12} />
      {/* Внешнее асфальтированное шоссе с разметкой, идущее через холмистую степь к КПП и АБК */}
      <RoadSegment position={[0, 0, 310]} rotation={Math.PI / 2} length={280} width={14} />

      {/* 7. Подъездная дорога к береговой насосной станции и водозабору водохранилища */}
      <RoadSegment position={[188, 0, 15]} rotation={0} length={56} width={10} />
      <RoadSegment position={[226, 0, 20]} rotation={Math.PI / 3} length={36} width={10} />

      {/* Light Grey Paved Concrete Pedestrian Walkways */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, gY + 0.03, 24]} receiveShadow>
        <planeGeometry args={[8, 36]} />
        <primitive object={concreteWalkwayMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[55, gY + 0.03, 17]} receiveShadow>
        <planeGeometry args={[12, 50]} />
        <primitive object={concreteWalkwayMat} attach="material" />
      </mesh>

      {/* 7. Внутренние благоустроенные зоны промышленной площадки */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-25, gY + 0.03, 62]} receiveShadow>
        <planeGeometry args={[44, 26]} />
        <primitive object={industrialGravelPlatformMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[45, gY + 0.03, 62]} receiveShadow>
        <planeGeometry args={[60, 26]} />
        <primitive object={industrialGravelPlatformMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[40, gY + 0.03, -68]} receiveShadow>
        <planeGeometry args={[110, 28]} />
        <primitive object={industrialGravelPlatformMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, gY + 0.03, 115]} receiveShadow>
        <planeGeometry args={[95, 24]} />
        <primitive object={industrialGravelPlatformMat} attach="material" />
      </mesh>
    </group>
  );
}

// ============================================================================
// 11. SITE PERIMETER SECURITY FENCING & FLOODLIGHT POSTS (HIGH-PERFORMANCE INSTANCEDMESH)
// ============================================================================

function SiteFencingAndLighting() {
  const gY = FLOOR_LEVELS.ground;

  const floodlightPositions: Array<[number, number, number]> = useMemo(
    () => [
      [-64, gY, 68],
      [0, gY, 68],
      [64, gY, 68],
      [145, gY, 115],
      [-64, gY, -85],
      [0, gY, -85],
      [64, gY, -85],
      [212, gY, 0],
      [-66, gY, 0],
    ],
    [gY]
  );

  const fences = useMemo(
    () => [
      { pos: [73, gY, 118] as [number, number, number], rot: 0, len: 282 },
      { pos: [73, gY, -88] as [number, number, number], rot: 0, len: 282 },
      { pos: [214, gY, 15] as [number, number, number], rot: Math.PI / 2, len: 206 },
      { pos: [-68, gY, 15] as [number, number, number], rot: Math.PI / 2, len: 206 },
    ],
    [gY]
  );

  // Instanced Meshes for Fences (Curbs, Mesh Panels, Steel Posts)
  const { curbsMesh, panelsMesh, postsMesh } = useMemo(() => {
    const curbGeom = new THREE.BoxGeometry(1, 0.3, 0.4);
    const panelGeom = new THREE.BoxGeometry(1, 2.2, 0.02);
    const postGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8);

    const cMesh = new THREE.InstancedMesh(curbGeom, concreteCurbMat, fences.length);
    const pMesh = new THREE.InstancedMesh(panelGeom, fenceMeshMat, fences.length);
    cMesh.receiveShadow = true;
    cMesh.frustumCulled = true;
    pMesh.castShadow = true;
    pMesh.receiveShadow = true;
    pMesh.frustumCulled = true;

    // Posts placed every 8 meters along all perimeter segments
    const postMatrices: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    fences.forEach((f, idx) => {
      // Concrete Curb Foundation
      dummy.position.set(f.pos[0], f.pos[1] + 0.15, f.pos[2]);
      dummy.rotation.set(0, f.rot, 0);
      dummy.scale.set(f.len, 1, 1);
      dummy.updateMatrix();
      cMesh.setMatrixAt(idx, dummy.matrix);

      // Wire Mesh Protective Panel
      dummy.position.set(f.pos[0], f.pos[1] + 1.4, f.pos[2]);
      dummy.rotation.set(0, f.rot, 0);
      dummy.scale.set(f.len, 1, 1);
      dummy.updateMatrix();
      pMesh.setMatrixAt(idx, dummy.matrix);

      // Periodic vertical steel posts
      const numPosts = Math.floor(f.len / 8);
      const halfLen = f.len / 2;
      for (let pi = 0; pi <= numPosts; pi++) {
        const offset = -halfLen + (pi / numPosts) * f.len;
        dummy.position.set(
          f.pos[0] + (f.rot === 0 ? offset : 0),
          f.pos[1] + 1.2,
          f.pos[2] + (f.rot === 0 ? 0 : offset)
        );
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postMatrices.push(dummy.matrix.clone());
      }
    });

    cMesh.instanceMatrix.needsUpdate = true;
    pMesh.instanceMatrix.needsUpdate = true;

    const ptMesh = new THREE.InstancedMesh(postGeom, steelTrussMat, postMatrices.length);
    ptMesh.castShadow = true;
    ptMesh.frustumCulled = true;
    postMatrices.forEach((mat, idx) => {
      ptMesh.setMatrixAt(idx, mat);
    });
    ptMesh.instanceMatrix.needsUpdate = true;

    return { curbsMesh: cMesh, panelsMesh: pMesh, postsMesh: ptMesh };
  }, [fences]);

  // Instanced Meshes for High-Mast Perimeter Floodlights
  const { lightBasesMesh, lightMastsMesh, lightArmsMesh, lightHeadsMesh } = useMemo(() => {
    const count = floodlightPositions.length;
    const baseGeom = new THREE.CylinderGeometry(0.5, 0.6, 0.5, 8);
    const mastGeom = new THREE.CylinderGeometry(0.1, 0.18, 12, 8);
    const armGeom = new THREE.BoxGeometry(1.8, 0.12, 0.12);
    const headGeom = new THREE.BoxGeometry(0.5, 0.35, 0.25);

    const bMesh = new THREE.InstancedMesh(baseGeom, concreteDarkPBRMat, count);
    const mMesh = new THREE.InstancedMesh(mastGeom, steelTrussMat, count);
    const aMesh = new THREE.InstancedMesh(armGeom, steelTrussMat, count);
    const hMesh = new THREE.InstancedMesh(headGeom, floodlightMat, count * 2);

    bMesh.frustumCulled = true;
    mMesh.frustumCulled = true;
    aMesh.frustumCulled = true;
    hMesh.frustumCulled = true;

    const dummy = new THREE.Object3D();
    let headIdx = 0;

    floodlightPositions.forEach((pos, idx) => {
      // Concrete Plinth
      dummy.position.set(pos[0], pos[1] + 0.25, pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bMesh.setMatrixAt(idx, dummy.matrix);

      // Steel Mast
      dummy.position.set(pos[0], pos[1] + 6, pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mMesh.setMatrixAt(idx, dummy.matrix);

      // Top Crossarm
      dummy.position.set(pos[0], pos[1] + 12, pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      aMesh.setMatrixAt(idx, dummy.matrix);

      // Twin floodlight luminaires
      for (const lx of [-0.7, 0.7]) {
        dummy.position.set(pos[0] + lx, pos[1] + 12.1, pos[2] + 0.2);
        dummy.rotation.set(Math.PI / 4, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        hMesh.setMatrixAt(headIdx++, dummy.matrix);
      }
    });

    bMesh.instanceMatrix.needsUpdate = true;
    mMesh.instanceMatrix.needsUpdate = true;
    aMesh.instanceMatrix.needsUpdate = true;
    hMesh.instanceMatrix.needsUpdate = true;

    return {
      lightBasesMesh: bMesh,
      lightMastsMesh: mMesh,
      lightArmsMesh: aMesh,
      lightHeadsMesh: hMesh,
    };
  }, [floodlightPositions]);

  return (
    <group name="InstancedSiteFencingAndLighting">
      {/* 1. Instanced Fences (Curb, Wire Mesh, Posts) */}
      <primitive object={curbsMesh} />
      <primitive object={panelsMesh} />
      <primitive object={postsMesh} />

      {/* 2. Instanced High-Mast Floodlights */}
      <primitive object={lightBasesMesh} />
      <primitive object={lightMastsMesh} />
      <primitive object={lightArmsMesh} />
      <primitive object={lightHeadsMesh} />
    </group>
  );
}

// ============================================================================
// MAIN EXTERIOR SCENE EXPORT
// ============================================================================

export default function ExteriorScene() {
  const gY = FLOOR_LEVELS.ground;

  // Dense, recognizable cluster of 4 hyperbolic cooling towers (2 per VVER unit):
  // - CoolingTower_1: Unit 1 primary tower [-115, gY, -25]
  // - CoolingTower_2: Unit 2 primary tower [-115, gY, 55]
  // - CoolingTower_3: Unit 1 secondary tower [-180, gY, -25]
  // - CoolingTower_4: Unit 2 secondary tower [-180, gY, 55]
  const coolingTowerPositions = [
    { name: 'CoolingTower_1', x: -115, y: gY, z: -25, scale: 1 },
    { name: 'CoolingTower_2', x: -115, y: gY, z: 55, scale: 1 },
    { name: 'CoolingTower_3', x: -180, y: gY, z: -25, scale: 1 },
    { name: 'CoolingTower_4', x: -180, y: gY, z: 55, scale: 1 },
  ];

  return (
    <group name="ExteriorSiteMasterPlan">
      {/* 1. Холмистый степной рельеф и скалистые выходы пород */}
      <UndulatingSteppeTerrain />
      <RockyOutcrops />

      {/* 2. Асфальтированная сеть дорог (внутренние проезды и южное шоссе через степь) */}
      <RoadwaysAndLandscaping />

      {/* 3. Периметральное защитное ограждение и осветительные мачты */}
      <SiteFencingAndLighting />

      {/* 4. Плотные защитные лесополосы вдоль периметра и южной подъездной аллеи */}
      <PerimeterShelterbelts />

      {/* 5. Кластер из 4 гиперболоидных градирен по ТЗ */}
      <group name="coolingTowersCluster">
        {coolingTowerPositions.map((cfg) => (
          <CoolingTower
            key={cfg.name}
            name={cfg.name}
            position={[cfg.x, cfg.y, cfg.z]}
            scale={cfg.scale}
          />
        ))}

        {/* Блочные насосные станции (БНС) технического водоснабжения */}
        <CirculatingWaterPumphouse position={[-147.5, 0, -25]} name="Pumphouse_Unit1" />
        <CirculatingWaterPumphouse position={[-147.5, 0, 55]} name="Pumphouse_Unit2" />
      </group>

      {/* 6. Спецкорпус водоочистки и дезактивации */}
      <SpecialAuxiliaryBuilding position={[-28, gY, -75]} />

      {/* 7. Блочные трансформаторы ТЦ-1000000/500 вынесены к торцевой стене машзала в SiteEngineeringInfrastructure */}

      {/* 8. Вентиляционные трубы РО */}
      <VentilationChimneys position={[-22, gY, -28]} />

      {/* 9. Трубопроводные технологические эстакады */}
      <ElevatedPipeRacks />

      {/* 10. Открытое распределительное устройство ОРУ-500 кВ и опоры ЛЭП */}
      <OutdoorSwitchyard position={[172, gY, 10]} />
      <TransmissionPylon position={[215, gY, -22]} rotation={-0.2} />

      {/* 11. Резервная дизель-генераторная станция (РДЭС) */}
      <DieselGeneratorStation position={[-65, gY, 15]} />

      {/* 12. Административно-бытовой комплекс (АБК) с площадью и КПП */}
      <AdministrativeBuilding position={[0, gY, 138]} />

      {/* 13. Извилистое русло реки / водохранилища-охладителя с песчаной береговой линией */}
      <WindingRiverReservoir />

      {/* 14. Степные кустарники и сухой ковыль на холмах */}
      <SteppeVegetationDensity />
    </group>
  );
}
