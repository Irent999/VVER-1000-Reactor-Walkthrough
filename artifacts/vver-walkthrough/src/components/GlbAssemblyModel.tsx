import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export interface GlbLoadState {
  status: 'loading' | 'loaded' | 'error';
  progressPercent: number;
  loadedMB: number;
  totalMB: number;
  meshCount: number;
  triangleCount: number;
  parseTimeMs: number;
  errorMessage?: string;
}

export interface BoxBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  center: [number, number, number];
}

export interface VentStackAnchor {
  id: string;
  x: number;
  y: number;
  z: number;
  h: number;
  r: number;
}

export interface SiteBox3Anchors {
  westHall: BoxBounds;
  midHall: BoxBounds;
  ritmHall: BoxBounds;
  reactorDome: BoxBounds;
  ventStacks: VentStackAnchor[];
}

interface GlbAssemblyModelProps {
  /** Целевой максимальный габарит модели в метрах после масштабирования по центру сцены */
  targetMaxSize?: number;
  /** Отметка уровня земли по оси Y (по умолчанию 0) */
  groundY?: number;
  /** Коэффициент послойного среза (1.0 = монолит, 0.5 = полусрез, 0.0 = глубокий срез) */
  containmentOpacity?: number;
  /** Полупрозрачный режим наружных стен и крыши оболочки (X-Ray стены) */
  shellTransparent?: boolean;
  /** Включена ли визуализация технологических процессов АЭС */
  energyFlowActive?: boolean;
  /** Коллбэк состояния загрузки для отображения прогресса в HUD */
  onStatusChange?: (state: GlbLoadState) => void;
  /** Коллбэк расчёта точных мировых границ Box3 и высот крыш для привязки оборудования */
  onAnchorsReady?: (anchors: SiteBox3Anchors) => void;
}

const BASE_URL = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const MODEL_URL = `${BASE_URL}assembly.glb`;
const DRACO_DECODER_PATH = `${BASE_URL}draco/`;

export function computeCutawayHeight(opacity: number): number {
  if (opacity >= 0.98) return 60;
  if (opacity <= 0.5) {
    return 3.8 + (Math.max(0, opacity) / 0.5) * 6.2;
  }
  return 10.0 + ((opacity - 0.5) / 0.48) * 26.0;
}

export default function GlbAssemblyModel({
  targetMaxSize = 225,
  groundY = 0,
  containmentOpacity = 1.0,
  shellTransparent = false,
  energyFlowActive = false,
  onStatusChange,
  onAnchorsReady,
}: GlbAssemblyModelProps) {
  const { invalidate } = useThree();
  const [loadedScene, setLoadedScene] = useState<THREE.Object3D | null>(null);
  const cutawayPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 60), []);
  const shellMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const glazingMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const reactorVesselMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const shellTransparentRef = useRef(shellTransparent);
  shellTransparentRef.current = shellTransparent;
  const energyFlowActiveRef = useRef(energyFlowActive);
  energyFlowActiveRef.current = energyFlowActive;
  const onAnchorsReadyRef = useRef(onAnchorsReady);
  onAnchorsReadyRef.current = onAnchorsReady;
  const ritmHallBoxRef = useRef(
    new THREE.Box3(new THREE.Vector3(23.05, 0.5, -94.33), new THREE.Vector3(48.31, 18.0, -47.48))
  );
  const proximityXrayRef = useRef(false);

  const applyShellOpacityState = (transparentMode: boolean, opacityValue = 0.16) => {
    for (const mat of shellMaterialsRef.current) {
      if (transparentMode) {
        mat.transparent = true;
        mat.opacity = opacityValue;
        mat.depthWrite = false;
      } else {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
      }
      mat.needsUpdate = true;
    }
    if (glazingMaterialRef.current) {
      glazingMaterialRef.current.opacity = transparentMode ? 0.14 : 0.86;
      glazingMaterialRef.current.needsUpdate = true;
    }
  };

  useEffect(() => {
    cutawayPlane.constant = computeCutawayHeight(containmentOpacity);
    invalidate();
  }, [containmentOpacity, cutawayPlane, invalidate]);

  useEffect(() => {
    const active = shellTransparent || proximityXrayRef.current;
    applyShellOpacityState(active, shellTransparent ? 0.16 : 0.24);
    invalidate();
  }, [shellTransparent, invalidate]);

  useEffect(() => {
    const mat = reactorVesselMaterialRef.current;
    if (mat) {
      mat.transparent = energyFlowActive;
      mat.opacity = energyFlowActive ? 0.44 : 1.0;
      mat.depthWrite = !energyFlowActive;
      mat.needsUpdate = true;
      invalidate();
    }
  }, [energyFlowActive, invalidate]);

  // Автоматическая полупрозрачность наружных стен при близком приближении к корпусу РИТМ-200Н
  useFrame(({ camera }) => {
    if (shellTransparentRef.current || shellMaterialsRef.current.length === 0) return;
    const dist = ritmHallBoxRef.current.distanceToPoint(camera.position);
    const shouldApproachXray = dist > 0.25 && dist <= 9.5 && camera.position.y < 24.0;
    if (shouldApproachXray !== proximityXrayRef.current) {
      proximityXrayRef.current = shouldApproachXray;
      applyShellOpacityState(shouldApproachXray, 0.24);
      invalidate();
    }
  });

  // Принудительное обновление кадра сразу после монтирования <primitive /> без ручного requestAnimationFrame
  useEffect(() => {
    if (!loadedScene) return;
    invalidate();
  }, [loadedScene, invalidate]);

  useEffect(() => {
    let isDisposed = false;
    let loadedRoot: THREE.Object3D | null = null;
    setLoadedScene(null);

    const loadStartTime = performance.now();
    let lastLoggedPercent = -10;
    let downloadDoneTime = 0;

    console.info(`[GLB Loader] 🚀 Старт прямой загрузки модели: ${MODEL_URL}`);

    onStatusChange?.({
      status: 'loading',
      progressPercent: 0,
      loadedMB: 0,
      totalMB: 55.05,
      meshCount: 0,
      triangleCount: 0,
      parseTimeMs: 0,
    });

    const manager = new THREE.LoadingManager();
    manager.onStart = (itemUrl, itemsLoaded, itemsTotal) => {
      console.info(
        `[GLB Loader] LoadingManager: старт (${itemsLoaded}/${itemsTotal}) -> ${itemUrl}`
      );
    };
    manager.onError = (itemUrl) => {
      console.warn(`[GLB Loader] LoadingManager: ошибка ресурса -> ${itemUrl}`);
    };

    const dracoLoader = new DRACOLoader(manager);
    // Локальный оффлайн-декодер из public/draco/ вместо внешнего CDN gstatic.com
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);

    const gltfLoader = new GLTFLoader(manager);
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
      MODEL_URL,
      (gltf) => {
        if (isDisposed) {
          disposeModelTree(gltf.scene);
          return;
        }

        const parseEndTime = performance.now();
        const parseTimeMs =
          downloadDoneTime > 0 ? parseEndTime - downloadDoneTime : parseEndTime - loadStartTime;

        const model = gltf.scene;
        model.name = 'MainGLBAssembly';

        // 1. Сброс корневых трансформаций и исправление ориентации (Z-up CAD -> Y-up Three.js)
        // В assembly.glb узел Node0 содержит матрицу -90° по X, из-за чего плита основания стоит вертикально.
        // Поворот контейнера на +Math.PI / 2 по X кладёт плиту горизонтально вниз, а оборудование направляет строго вверх (+Y).
        model.position.set(0, 0, 0);
        model.rotation.set(Math.PI / 2, 0, 0);
        model.scale.set(1, 1, 1);
        model.updateMatrixWorld(true);

        // 2. Расчёт Bounding Box ПОСЛЕ поворота и нормализация масштаба под площадку
        const rotatedBox = new THREE.Box3().setFromObject(model);
        const rotatedSize = new THREE.Vector3();
        rotatedBox.getSize(rotatedSize);

        const maxDim = Math.max(rotatedSize.x, rotatedSize.y, rotatedSize.z);
        const scale = Number.isFinite(maxDim) && maxDim > 0.0001 ? targetMaxSize / maxDim : 1;

        model.scale.setScalar(scale);
        model.updateMatrixWorld(true);

        // 3. Центрирование в X = 0, Z = 0 и точная привязка основания min.y = groundY (0) ПОСЛЕ поворота и масштабирования
        const scaledBox = new THREE.Box3().setFromObject(model);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        model.position.set(
          -scaledCenter.x,
          groundY - scaledBox.min.y,
          -scaledCenter.z
        );
        model.updateMatrixWorld(true);

        const finalBox = new THREE.Box3().setFromObject(model);
        const finalSize = new THREE.Vector3();
        const finalCenter = new THREE.Vector3();
        finalBox.getSize(finalSize);
        finalBox.getCenter(finalCenter);

        console.info(
          `[GLB Loader] 📐 Ориентация (+90° X), масштаб и посадка: size=[${finalSize.x.toFixed(2)}, ${finalSize.y.toFixed(2)}, ${finalSize.z.toFixed(2)}], min.y=${finalBox.min.y.toFixed(3)}, center=[${finalCenter.x.toFixed(2)}, ${finalCenter.y.toFixed(2)}, ${finalCenter.z.toFixed(2)}]`
        );

        // 4. Сбор мешей и анализ их мировых габаритов для точного назначения индустриальных материалов АЭС
        const meshes: THREE.Mesh[] = [];
        const meshBoxes = new Map<THREE.Mesh, THREE.Vector3>();
        let largestBaseMesh: THREE.Mesh | null = null;
        let maxFootprintArea = 0;

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshes.push(child);
          }
        });

        for (const mesh of meshes) {
          const geo = mesh.geometry;
          if (geo) {
            if (!geo.attributes.normal) {
              geo.computeVertexNormals();
            }
            geo.computeBoundingBox();
            geo.computeBoundingSphere();
          }

          const mBox = new THREE.Box3().setFromObject(mesh);
          const mSize = new THREE.Vector3();
          mBox.getSize(mSize);
          meshBoxes.set(mesh, mSize);

          const footprint = mSize.x * mSize.z;
          const isFlatSlab = mSize.y < Math.max(mSize.x, mSize.z) * 0.08;
          if (isFlatSlab && footprint > maxFootprintArea) {
            maxFootprintArea = footprint;
            largestBaseMesh = mesh;
          }
        }

        // Лёгкая фактура бетона для белоснежных градирен (едва заметные вертикальные швы)
        const coolingRibCanvas = document.createElement('canvas');
        coolingRibCanvas.width = 256;
        coolingRibCanvas.height = 256;
        const ribCtx = coolingRibCanvas.getContext('2d');
        if (ribCtx) {
          ribCtx.fillStyle = '#f8fafc';
          ribCtx.fillRect(0, 0, 256, 256);
          ribCtx.fillStyle = 'rgba(176, 186, 198, 0.14)';
          for (let x = 0; x < 256; x += 16) {
            ribCtx.fillRect(x, 0, 1, 256);
          }
          ribCtx.fillStyle = 'rgba(180, 190, 202, 0.10)';
          for (let y = 0; y < 256; y += 32) {
            ribCtx.fillRect(0, y, 256, 1);
          }
        }
        const coolingRibTexture = new THREE.CanvasTexture(coolingRibCanvas);
        coolingRibTexture.colorSpace = THREE.SRGBColorSpace;
        coolingRibTexture.wrapS = THREE.RepeatWrapping;
        coolingRibTexture.wrapT = THREE.RepeatWrapping;
        coolingRibTexture.repeat.set(8, 6);

        // 5. Насыщенные контрастные PBR-материалы по эталонной CAD-схеме сборки АЭС
        // Основание площадки — светло-серый бетон, совпадающий с круглой заглушкой
        const baseConcreteMat = new THREE.MeshStandardMaterial({
          color: 0xd2d8df,
          roughness: 0.86,
          metalness: 0.03,
          side: THREE.FrontSide,
        });

        const isXray = shellTransparentRef.current;

        // Белоснежные и чистые светлые фасады вспомогательных зданий, обстройки ВВЭР и крыльев РИТМ-200Н
        const facadeCrispWhiteMat = new THREE.MeshStandardMaterial({
          color: 0xf1f4f8,
          roughness: 0.68,
          metalness: 0.04,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.16 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Главные корпуса энергоблоков (машзалы и реакторные здания): насыщенный антрацит (#464e59)
        const vverAnthraciteMat = new THREE.MeshStandardMaterial({
          color: 0x464e59,
          roughness: 0.72,
          metalness: 0.12,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.18 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Тёмно-графитовые кровли, парапеты и пояса главных корпусов (#3b424c)
        const darkAnthraciteMat = new THREE.MeshStandardMaterial({
          color: 0x3b424c,
          roughness: 0.7,
          metalness: 0.16,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.18 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Градирни: белоснежный бетон (#f5f7fa)
        const coolingTowerWhiteMat = new THREE.MeshStandardMaterial({
          map: coolingRibTexture,
          color: 0xf5f7fa,
          roughness: 0.76,
          metalness: 0.03,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.2 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Глубокий индустриальный синий (#1d4580) для РИТМ-200Н, вспомогательных кровель и колец градирен
        const industrialBlueMat = new THREE.MeshStandardMaterial({
          color: 0x1d4580,
          roughness: 0.52,
          metalness: 0.18,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.22 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Белые парапеты, карнизы и верхние ободки градирен (#f6f8fa)
        const silverWhiteRimMat = new THREE.MeshStandardMaterial({
          color: 0xf6f8fa,
          roughness: 0.64,
          metalness: 0.06,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.2 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Отмостки, цоколи и контуры проездов/площадок (#8c95a0, плотные в X-Ray)
        const structuralPlinthMat = new THREE.MeshStandardMaterial({
          color: 0x8c95a0,
          roughness: 0.84,
          metalness: 0.06,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Металлические рамы витражей и оконные переплёты (#28303a)
        const shellMetalFrameMat = new THREE.MeshStandardMaterial({
          color: 0x28303a,
          roughness: 0.46,
          metalness: 0.56,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.18 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        shellMaterialsRef.current = [
          facadeCrispWhiteMat,
          vverAnthraciteMat,
          darkAnthraciteMat,
          coolingTowerWhiteMat,
          industrialBlueMat,
          silverWhiteRimMat,
          shellMetalFrameMat,
        ];

        // Оборудование реакторного зала ВВЭР-1000 (детальное функциональное разделение узлов)
        // 1. Корпус реактора и верхний блок (приводы СУЗ / БЗТ) — индустриальный сине-графитовый (#264d73)
        const rpvSteelBlueMat = new THREE.MeshStandardMaterial({
          color: 0x264d73,
          roughness: 0.35,
          metalness: 0.65,
          side: THREE.DoubleSide,
          transparent: energyFlowActiveRef.current,
          opacity: energyFlowActiveRef.current ? 0.44 : 1.0,
          depthWrite: !energyFlowActiveRef.current,
        });
        reactorVesselMaterialRef.current = rpvSteelBlueMat;

        // Контрастный светло-стальной для фланцев, крышки реактора и обвязки (#d0d7df)
        const flangeLightSteelMat = new THREE.MeshStandardMaterial({
          color: 0xd0d7df,
          roughness: 0.28,
          metalness: 0.74,
          side: THREE.DoubleSide,
        });

        // 2. Парогенераторы (ПГВ-1000) — тёплый медно-бронзовый металлик (#c88a36)
        const pgvBronzeMat = new THREE.MeshStandardMaterial({
          color: 0xc88a36,
          roughness: 0.4,
          metalness: 0.55,
          side: THREE.DoubleSide,
        });

        // Верхние пароотводящие трубы / коллекторы над ПГ — светло-серебристый (#d8dee6)
        const steamHeaderSilverMat = new THREE.MeshStandardMaterial({
          color: 0xd8dee6,
          roughness: 0.26,
          metalness: 0.78,
          side: THREE.DoubleSide,
        });

        // 3. Главные циркуляционные насосы (ГЦН) — насыщенный бирюзово-стальной (#1f616b)
        const mcpTealMat = new THREE.MeshStandardMaterial({
          color: 0x1f616b,
          roughness: 0.36,
          metalness: 0.58,
          side: THREE.DoubleSide,
        });

        // Главные циркуляционные трубопроводы (ГЦТ) — тёмно-графитовый металл (#363d45)
        const gctGraphiteMat = new THREE.MeshStandardMaterial({
          color: 0x363d45,
          roughness: 0.38,
          metalness: 0.72,
          side: THREE.DoubleSide,
        });

        // 4. Гидроёмкости САОЗ на верхнем перекрытии — сине-голубой (#3b6e9c) и светлый бежево-серый (#b8bcc2)
        const eccsSteelBlueMat = new THREE.MeshStandardMaterial({
          color: 0x3b6e9c,
          roughness: 0.42,
          metalness: 0.45,
          side: THREE.DoubleSide,
        });

        const eccsBeigeGrayMat = new THREE.MeshStandardMaterial({
          color: 0xb8bcc2,
          roughness: 0.48,
          metalness: 0.32,
          side: THREE.DoubleSide,
        });

        // Фирменный ярко-жёлтый (#f0a500) для перегрузочной машины, полярного крана и ограждений верхнего зала
        const refuelingYellowMat = new THREE.MeshStandardMaterial({
          color: 0xf0a500,
          roughness: 0.34,
          metalness: 0.42,
          side: THREE.DoubleSide,
        });

        // Наружные технологические акценты (верхние обвязки куполов, наружные баки) — охристо-золотой (#e5a922)
        const craneYellowMat = new THREE.MeshStandardMaterial({
          color: 0xe5a922,
          roughness: 0.34,
          metalness: 0.36,
          side: THREE.DoubleSide,
        });

        // Сатинированная сталь для прочих тяжёлых металлоконструкций
        const stainlessSteelMat = new THREE.MeshStandardMaterial({
          color: 0xc2cbd4,
          roughness: 0.32,
          metalness: 0.78,
          side: THREE.DoubleSide,
        });

        // Металлические фермы, опоры и обвязка верхнего блока — технический серый металл
        const technicalMetalMat = new THREE.MeshStandardMaterial({
          color: 0x7e8791,
          roughness: 0.38,
          metalness: 0.76,
          side: THREE.DoubleSide,
        });

        // Тёмно-графитовый металл трубопроводов и арматуры
        const darkGraphiteMetalMat = new THREE.MeshStandardMaterial({
          color: 0x3b424c,
          roughness: 0.42,
          metalness: 0.72,
          side: THREE.DoubleSide,
        });

        // Индустриальный стальной синий для технологических узлов
        const techBlueMetalMat = new THREE.MeshStandardMaterial({
          color: 0x1d4580,
          roughness: 0.42,
          metalness: 0.42,
          side: THREE.DoubleSide,
        });

        // Контрастные тёмные тонированные окна фасадов зданий
        const darkWindowGlazingMat = new THREE.MeshStandardMaterial({
          color: 0x141d27,
          roughness: 0.14,
          metalness: 0.45,
          transparent: true,
          opacity: isXray ? 0.14 : 0.86,
          depthWrite: false,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
        });
        glazingMaterialRef.current = darkWindowGlazingMat;

        let meshCount = 0;
        let triangleCount = 0;
        let pipingIndex = 0;
        const replacedOriginalMaterials = new Set<THREE.Material>();

        const trackOriginalMaterial = (mesh: THREE.Mesh) => {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const mat of mats) {
            if (mat) replacedOriginalMaterials.add(mat);
          }
        };

        const splitTmpV0 = new THREE.Vector3();
        const splitTmpV1 = new THREE.Vector3();
        const splitTmpV2 = new THREE.Vector3();
        const splitGeometryByMaterial = (
          targetMesh: THREE.Mesh,
          matList: THREE.MeshStandardMaterial[],
          classifyCentroid: (cx: number, cy: number, cz: number) => number
        ) => {
          const geo = targetMesh.geometry;
          if (!geo || !geo.attributes.position) return;
          const posAttr = geo.attributes.position;
          const indexAttr = geo.index;
          const matWorld = targetMesh.matrixWorld;
          const triTotal = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;
          const buckets: number[][] = matList.map(() => []);

          for (let t = 0; t < triTotal; t++) {
            const i0 = indexAttr ? indexAttr.getX(t * 3) : t * 3;
            const i1 = indexAttr ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
            const i2 = indexAttr ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

            splitTmpV0.fromBufferAttribute(posAttr, i0).applyMatrix4(matWorld);
            splitTmpV1.fromBufferAttribute(posAttr, i1).applyMatrix4(matWorld);
            splitTmpV2.fromBufferAttribute(posAttr, i2).applyMatrix4(matWorld);

            const cx = (splitTmpV0.x + splitTmpV1.x + splitTmpV2.x) / 3;
            const cy = (splitTmpV0.y + splitTmpV1.y + splitTmpV2.y) / 3;
            const cz = (splitTmpV0.z + splitTmpV1.z + splitTmpV2.z) / 3;

            const bucketIdx = Math.max(0, Math.min(matList.length - 1, classifyCentroid(cx, cy, cz)));
            buckets[bucketIdx].push(i0, i1, i2);
          }

          const totalIndices = triTotal * 3;
          const useUint32 = posAttr.count > 65535;
          const merged = useUint32 ? new Uint32Array(totalIndices) : new Uint16Array(totalIndices);
          geo.clearGroups();
          let cursor = 0;
          for (let m = 0; m < buckets.length; m++) {
            const arr = buckets[m];
            if (arr.length === 0) continue;
            merged.set(arr, cursor);
            geo.addGroup(cursor, arr.length, m);
            cursor += arr.length;
          }
          geo.setIndex(new THREE.BufferAttribute(merged, 1));
          targetMesh.material = matList;
        };

        const mcpCenters: [number, number][] = [
          [-85.7, -35.43],
          [-81.1, -36.62],
          [-87.28, -44.18],
          [-82.66, -45.33],
        ];
        const rpvAxisX = -84.11;
        const rpvAxisZ = -40.22;

        const coolingTowerCenters: [number, number][] = [
          [-83.855, 13.415],
          [-26.035, 13.415],
          [-83.855, 59.645],
          [-26.035, 59.645],
        ];
        const tmpTriV0 = new THREE.Vector3();
        const tmpTriV1 = new THREE.Vector3();
        const tmpTriV2 = new THREE.Vector3();

        const isPointInsideCoolingTowerZone = (px: number, py: number, pz: number): boolean => {
          if (py <= 0.85 || pz < -2.4 || px > -10.5) return false;
          for (let t = 0; t < coolingTowerCenters.length; t++) {
            const dx = px - coolingTowerCenters[t][0];
            const dz = pz - coolingTowerCenters[t][1];
            if (dx * dx + dz * dz < 15.8 * 15.8) {
              return true;
            }
          }
          return false;
        };

        const stripStrayCoolingTowerTriangles = (targetMesh: THREE.Mesh): boolean => {
          const geo = targetMesh.geometry;
          if (!geo || !geo.attributes.position) return true;
          const posAttr = geo.attributes.position;
          const indexAttr = geo.index;
          const matWorld = targetMesh.matrixWorld;
          const triTotal = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;
          const keptIndices: number[] = [];
          let strippedCount = 0;

          for (let t = 0; t < triTotal; t++) {
            const i0 = indexAttr ? indexAttr.getX(t * 3) : t * 3;
            const i1 = indexAttr ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
            const i2 = indexAttr ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

            tmpTriV0.fromBufferAttribute(posAttr, i0).applyMatrix4(matWorld);
            tmpTriV1.fromBufferAttribute(posAttr, i1).applyMatrix4(matWorld);
            tmpTriV2.fromBufferAttribute(posAttr, i2).applyMatrix4(matWorld);

            const cx = (tmpTriV0.x + tmpTriV1.x + tmpTriV2.x) / 3;
            const cy = (tmpTriV0.y + tmpTriV1.y + tmpTriV2.y) / 3;
            const cz = (tmpTriV0.z + tmpTriV1.z + tmpTriV2.z) / 3;

            if (isPointInsideCoolingTowerZone(cx, cy, cz)) {
              strippedCount++;
              continue;
            }
            keptIndices.push(i0, i1, i2);
          }

          if (strippedCount > 0) {
            if (keptIndices.length === 0) {
              return false;
            }
            const useUint32 = posAttr.count > 65535;
            const nextIdx = useUint32 ? new Uint32Array(keptIndices) : new Uint16Array(keptIndices);
            geo.setIndex(new THREE.BufferAttribute(nextIdx, 1));
            geo.clearGroups();
            geo.computeBoundingBox();
            geo.computeBoundingSphere();
          }
          return true;
        };

        const meshesToKeep: THREE.Mesh[] = [];
        for (let idx = 0; idx < meshes.length; idx++) {
          const mesh = meshes[idx];

          const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const origName = (origMat?.name ?? '').toUpperCase();
          const mBox = new THREE.Box3().setFromObject(mesh);
          const mSize = meshBoxes.get(mesh) ?? new THREE.Vector3(1, 1, 1);

          // Удаление лишних висящих плоских планок/мостиков (M31 75FFFFFF с нулевой толщиной, M37 32FFFFFF,
          // а также любых посторонних плоских прямоугольных артефактов или жёлтых поручней в зоне градирен на любой высоте > 0.5 м)
          const isZeroThicknessFloatingPlank =
            origName.includes('75FFFFFF') ||
            (mSize.y < 0.03 && mBox.min.y > 1.2 && !origName.includes('006633'));
          const isDetachedExteriorGlass =
            origName.includes('32FFFFFF') && mBox.min.x > 18 && mBox.max.x < 23;
          const isCoolingTowerNativePart =
            origName.includes('B3B3B3') ||
            origName.includes('29D8D8D8') ||
            origName.includes('32D8D8D8') ||
            origName.includes('663300');
          const isStrayCoolingTowerPlank =
            mesh !== largestBaseMesh &&
            !isCoolingTowerNativePart &&
            mBox.min.y > 0.5 &&
            mBox.max.z > -2.4 &&
            mBox.min.x < -10.5 &&
            (mSize.y < 2.2 ||
              origName.includes('00FFFF') ||
              origName.includes('00CCCC') ||
              origName.includes('009999') ||
              origName.includes('33FFFF') ||
              origName.includes('FF7F00') ||
              origName.includes('FFFF7F00'));

          if (isZeroThicknessFloatingPlank || isDetachedExteriorGlass || isStrayCoolingTowerPlank) {
            trackOriginalMaterial(mesh);
            mesh.removeFromParent();
            mesh.geometry?.dispose();
            continue;
          }

          // Для составных мешей сборки проверяем пересечение треугольников с зоной градирен (Y > 0.85 м)
          if (
            mesh !== largestBaseMesh &&
            !isCoolingTowerNativePart &&
            mBox.max.z > -2.4 &&
            mBox.min.x < -10.5 &&
            mBox.max.y > 0.85
          ) {
            const hasRemaining = stripStrayCoolingTowerTriangles(mesh);
            if (!hasRemaining) {
              trackOriginalMaterial(mesh);
              mesh.removeFromParent();
              mesh.geometry?.dispose();
              continue;
            }
          }

          meshesToKeep.push(mesh);
          meshCount++;
          mesh.visible = true;
          mesh.frustumCulled = true;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const geo = mesh.geometry;
          let vertCount = 0;
          if (geo) {
            if (geo.index) {
              triangleCount += geo.index.count / 3;
            } else if (geo.attributes.position) {
              triangleCount += geo.attributes.position.count / 3;
            }
            vertCount = geo.attributes.position ? geo.attributes.position.count : 0;
          }

          const origOpacity =
            origMat && 'opacity' in origMat && typeof origMat.opacity === 'number'
              ? origMat.opacity
              : 1.0;
          const isOriginalTransparent = Boolean(
            origMat && 'transparent' in origMat && origMat.transparent && origOpacity < 0.98
          );

          mesh.userData.cadVertCount = vertCount;
          mesh.userData.cadMatName = origName;
          mesh.userData.isCadBase = mesh === largestBaseMesh;

          trackOriginalMaterial(mesh);

          // 1. Полупрозрачные окна и витражи (исключая нижние белые пояса градирен 29D8D8D8/32D8D8D8)
          if (isOriginalTransparent && !origName.includes('D8D8D8')) {
            mesh.material = darkWindowGlazingMat;
            mesh.castShadow = false;
            mesh.userData.isCadGlass = true;
            continue;
          }

          // 2. Плита основания площадки — светло-серый бетон (без самозатенения)
          if (mesh === largestBaseMesh) {
            mesh.material = baseConcreteMat;
            mesh.castShadow = false;
            mesh.receiveShadow = true;
            mesh.userData.isWalkableFloor = true;
            continue;
          }

          const maxMeshDim = Math.max(mSize.x, mSize.y, mSize.z);

          // 3А. Внутренние узлы верхнего яруса реакторного зала:
          // перегрузочная машина, полярный кран и жёлтые ограждения (#f0a500)
          if (
            origName.includes('00FFFF') ||
            origName.includes('00CCCC') ||
            origName.includes('009999')
          ) {
            mesh.material = refuelingYellowMat;
            continue;
          }
          if (origName.includes('33FFFF')) {
            // Ограждения вокруг левых баков (y >= 14.70) — ярко-жёлтые (#f0a500), настил (y < 14.70) — бежево-серый (#b8bcc2)
            splitGeometryByMaterial(mesh, [refuelingYellowMat, eccsBeigeGrayMat], (_cx, cy) =>
              cy >= 14.7 ? 0 : 1
            );
            mesh.userData.isWalkableFloor = true;
            continue;
          }

          // 3Б. Наружные технологические акценты: верхние обвязки куполов, наружные баки (#e5a922)
          if (
            origName.includes('FF7F00') ||
            origName.includes('000099') ||
            origName.includes('994C00')
          ) {
            mesh.material = craneYellowMat;
            continue;
          }

          // 4. Детальное цветовое разделение оборудования 1-го контура ВВЭР-1000:
          if (origName.includes('006633')) {
            if (idx === 0) {
              // M0: центральный корпус реактора + верхний блок СУЗ (#264d73), фланцы/крышка (#d0d7df), патрубки (#363d45)
              splitGeometryByMaterial(
                mesh,
                [rpvSteelBlueMat, flangeLightSteelMat, gctGraphiteMat],
                (cx, cy, cz) => {
                  const rRpv = Math.hypot(cx - rpvAxisX, cz - rpvAxisZ);
                  if (rRpv >= 2.2) return 1;
                  if (rRpv >= 0.76) return 2;
                  if (cy >= 14.08 || (cy >= 12.16 && cy <= 12.5) || (cy >= 10.12 && cy <= 10.26)) {
                    return 1;
                  }
                  return 0;
                }
              );
              continue;
            }
            if (idx === 1) {
              // M1: опорный фланец корпуса реактора -> светло-стальной (#d0d7df)
              mesh.material = flangeLightSteelMat;
              continue;
            }
            // M10: 4x ПГВ-1000 (#c88a36), верхние паровые коллекторы (#d8dee6), 4x ГЦН (#1f616b), ГЦТ (#363d45)
            splitGeometryByMaterial(
              mesh,
              [pgvBronzeMat, steamHeaderSilverMat, mcpTealMat, gctGraphiteMat, flangeLightSteelMat, rpvSteelBlueMat],
              (cx, cy, cz) => {
                if (cy >= 16.5) return 4;
                const rRpv = Math.hypot(cx - rpvAxisX, cz - rpvAxisZ);
                if (cy < 10.22 && rRpv < 1.2) return 5;
                for (let m = 0; m < mcpCenters.length; m++) {
                  const dx = cx - mcpCenters[m][0];
                  const dz = cz - mcpCenters[m][1];
                  if (dx * dx + dz * dz < 0.88 && cy >= 10.15 && cy <= 13.35) {
                    return 2;
                  }
                }
                if (cy >= 13.12 && cy < 15.0) return 1;
                if (cy < 11.55 || rRpv < 1.4) return 3;
                return 0;
              }
            );
            mesh.userData.isHeavyEquipment = true;
            continue;
          }

          if (vertCount >= 180000) {
            mesh.material = stainlessSteelMat;
            mesh.userData.isHeavyEquipment = true;
            continue;
          }

          // 5. Металлические рамы витражей (232323) и гидроёмкости САОЗ на верхнем перекрытии (00C39E / 01BC99)
          if (origName.includes('232323')) {
            mesh.material = shellMetalFrameMat;
            continue;
          }
          if (origName.includes('00C39E')) {
            // Правые гидроёмкости САОЗ (M3) -> сине-голубой (#3b6e9c); нижнее кольцо (M15) -> светлый бежево-серый (#b8bcc2)
            mesh.material = mSize.y > 0.8 ? eccsSteelBlueMat : eccsBeigeGrayMat;
            mesh.userData.isWalkableFloor = true;
            continue;
          }
          if (origName.includes('01BC99')) {
            // Левые гидроёмкости САОЗ (M14) -> светлый технический бежево-серый (#b8bcc2)
            mesh.material = eccsBeigeGrayMat;
            mesh.userData.isWalkableFloor = true;
            continue;
          }

          // 6. Глубокий индустриальный синий (#1d4580 / #1e4b8f):
          // кольца градирен, фасады блока РИТМ-200Н, синие кровли вспомогательных зданий
          if (origName.includes('663300')) {
            mesh.material = industrialBlueMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // Верхняя тёмная крыша высокого пролёта РИТМ-200Н (FF000066) -> тёмный антрацит (#3b424c)
          if (origName.includes('000066')) {
            mesh.material = darkAnthraciteMat;
            continue;
          }

          // 7. Отмостки, цоколи и контуры проездов (FF484848)
          if (origName.includes('484848')) {
            mesh.material = structuralPlinthMat;
            mesh.userData.isWalkableFloor = true;
            continue;
          }

          // 8. Белые парапеты, карнизы и верхние ободки градирен (FFFFFFFF)
          if (origName.includes('FFFFFF') && maxMeshDim >= 8.0) {
            mesh.material = silverWhiteRimMat;
            continue;
          }

          // 9. Градирни (FFB3B3B3) — белоснежные гиперболические башни (#f5f7fa)
          if (origName.includes('B3B3B3')) {
            mesh.material = coolingTowerWhiteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 10. Белоснежные фасады вспомогательных корпусов и крыльев РИТМ-200Н (FFD8D8D8, 29D8D8D8, 32D8D8D8)
          if (origName.includes('D8D8D8')) {
            mesh.material = facadeCrispWhiteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 11. Главные корпуса энергоблоков (машзалы и обстройка реакторов): антрацит (#464e59) и графит (#3b424c)
          if (origName.includes('8F8F8F')) {
            mesh.material = vverAnthraciteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }
          if (origName.includes('6C6C6C')) {
            mesh.material = darkAnthraciteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 12. Кровли и крупные строительные узлы без явного имени
          if (maxMeshDim >= targetMaxSize * 0.16 && vertCount < 180000) {
            mesh.material = darkAnthraciteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 13. Мелкие металлические опоры и арматура
          const pipingPalette = [technicalMetalMat, darkGraphiteMetalMat, techBlueMetalMat];
          mesh.material = pipingPalette[pipingIndex % pipingPalette.length];
          pipingIndex++;
        }

        for (const oldMat of replacedOriginalMaterials) {
          for (const val of Object.values(oldMat)) {
            if (val && typeof val === 'object' && 'isTexture' in val) {
              (val as THREE.Texture).dispose();
            }
          }
          oldMat.dispose();
        }

        // 6. Точный расчёт Box3 корпусов и raycast высот крыш (без летающих объектов)
        const roofCandidates = meshesToKeep.filter((m) => {
          const name = String(m.userData.cadMatName || '');
          const verts = Number(m.userData.cadVertCount || 0);
          return !m.userData.isCadBase && verts < 200000 && !name.includes('006633');
        });
        const downRaycaster = new THREE.Raycaster();
        const downDir = new THREE.Vector3(0, -1, 0);
        const rayOrigin = new THREE.Vector3();

        const measureRoofAt = (x: number, z: number, fallbackY: number): number => {
          rayOrigin.set(x, 60, z);
          downRaycaster.set(rayOrigin, downDir);
          const hits = downRaycaster.intersectObjects(roofCandidates, false);
          for (const h of hits) {
            if (h.point.y >= 2.0 && h.point.y <= 40.0) {
              return h.point.y;
            }
          }
          return fallbackY;
        };

        const rpvMesh = meshes[0];
        const rpvBox = rpvMesh ? new THREE.Box3().setFromObject(rpvMesh) : new THREE.Box3(
          new THREE.Vector3(-91.42, 7.12, -47.53),
          new THREE.Vector3(-76.81, 20.96, -32.92)
        );
        const rpvCenter = new THREE.Vector3();
        rpvBox.getCenter(rpvCenter);

        const westMinX = Math.max(-93.48, finalBox.min.x + 19.0);
        const westHallBounds: BoxBounds = {
          minX: westMinX,
          maxX: -74.74,
          minY: 0.62,
          maxY: measureRoofAt(-82.0, -72.0, 17.1),
          minZ: -93.25,
          maxZ: -52.26,
          center: [(-93.48 + -74.74) / 2, 0.62, (-93.25 + -52.26) / 2],
        };

        const midHallBounds: BoxBounds = {
          minX: -34.76,
          maxX: -16.02,
          minY: 0.62,
          maxY: measureRoofAt(-22.5, -72.0, 17.1),
          minZ: -93.25,
          maxZ: -52.26,
          center: [(-34.76 + -16.02) / 2, 0.62, (-93.25 + -52.26) / 2],
        };

        const ritmHallBounds: BoxBounds = {
          minX: 23.05,
          maxX: Math.min(48.31, finalBox.max.x - 60.0),
          minY: 0.62,
          maxY: measureRoofAt(35.68, -70.9, 17.57),
          minZ: -94.33,
          maxZ: -47.48,
          center: [(23.05 + 48.31) / 2, 0.62, (-94.33 + -47.48) / 2],
        };
        ritmHallBoxRef.current.set(
          new THREE.Vector3(ritmHallBounds.minX, 0.5, ritmHallBounds.minZ),
          new THREE.Vector3(ritmHallBounds.maxX, ritmHallBounds.maxY + 0.5, ritmHallBounds.maxZ)
        );

        const reactorDomeBounds: BoxBounds = {
          minX: Math.min(-88.0, rpvBox.min.x),
          maxX: Math.max(-75.0, rpvBox.max.x),
          minY: 0.62,
          maxY: measureRoofAt(rpvCenter.x, rpvCenter.z, 23.49),
          minZ: Math.min(-47.0, rpvBox.min.z),
          maxZ: Math.max(-33.0, rpvBox.max.z),
          center: [rpvCenter.x, rpvCenter.y, rpvCenter.z],
        };

        const stackTargets = [
          { id: 'vent-west-vver', x: -81.5, z: -50.0, fallbackY: 17.1, h: 15.5, r: 0.95 },
          { id: 'vent-mid-vver', x: -22.5, z: -50.0, fallbackY: 17.1, h: 15.5, r: 0.95 },
          { id: 'vent-east-ritm-main', x: 36.0, z: -70.4, fallbackY: 17.57, h: 14.5, r: 0.85 },
          { id: 'vent-east-ritm-wing', x: 36.0, z: -54.0, fallbackY: 12.95, h: 13.5, r: 0.8 },
        ];

        const ventStacks: VentStackAnchor[] = stackTargets.map((st) => {
          const exactRoofY = measureRoofAt(st.x, st.z, st.fallbackY);
          return {
            id: st.id,
            x: st.x,
            y: exactRoofY - 0.15,
            z: st.z,
            h: st.h,
            r: st.r,
          };
        });

        onAnchorsReadyRef.current?.({
          westHall: westHallBounds,
          midHall: midHallBounds,
          ritmHall: ritmHallBounds,
          reactorDome: reactorDomeBounds,
          ventStacks,
        });

        console.info(
          `[GLB Loader] ✅ Модель выровнена и окрашена по эталонному макету (мешей: ${meshCount}, треугольников: ${Math.round(triangleCount).toLocaleString()}). Венттрубы: ${ventStacks.map((v) => `${v.id}@Y=${v.y.toFixed(2)}`).join(', ')}`
        );

        loadedRoot = model;
        setLoadedScene(model);
        invalidate();

        onStatusChange?.({
          status: 'loaded',
          progressPercent: 100,
          loadedMB: 55.05,
          totalMB: 55.05,
          meshCount,
          triangleCount: Math.round(triangleCount),
          parseTimeMs: Math.round(parseTimeMs),
        });
      },
      (xhr) => {
        if (isDisposed) return;

        const loadedMB = xhr.loaded / (1024 * 1024);
        const hasTotal = xhr.lengthComputable && xhr.total > 0;
        const totalMB = hasTotal ? xhr.total / (1024 * 1024) : 55.05;
        const percent = hasTotal
          ? Math.min(100, (xhr.loaded / xhr.total) * 100)
          : Math.min(99, (loadedMB / 55.05) * 100);

        if (percent - lastLoggedPercent >= 10 || percent >= 100) {
          lastLoggedPercent = percent;
          console.info(
            `[GLB Loader] ⏳ Загрузка: ${percent.toFixed(1)}% (${loadedMB.toFixed(2)} МБ / ${totalMB.toFixed(2)} МБ)`
          );
        }

        if (percent >= 100 && downloadDoneTime === 0) {
          downloadDoneTime = performance.now();
          console.info(
            `[GLB Loader] 📥 Файл загружен (${loadedMB.toFixed(2)} МБ) за ${((downloadDoneTime - loadStartTime) / 1000).toFixed(2)} с. Декодирование...`
          );
        }

        onStatusChange?.({
          status: 'loading',
          progressPercent: Math.round(percent),
          loadedMB: Number(loadedMB.toFixed(2)),
          totalMB: Number(totalMB.toFixed(2)),
          meshCount: 0,
          triangleCount: 0,
          parseTimeMs: 0,
        });
      },
      (err) => {
        if (isDisposed) return;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[GLB Loader] ⚠️ Не удалось загрузить "${MODEL_URL}": ${message}`
        );
        onStatusChange?.({
          status: 'error',
          progressPercent: 0,
          loadedMB: 0,
          totalMB: 55.05,
          meshCount: 0,
          triangleCount: 0,
          parseTimeMs: 0,
          errorMessage: `Не удалось загрузить ${MODEL_URL}: ${message}`,
        });
        invalidate();
      }
    );

    return () => {
      isDisposed = true;
      dracoLoader.dispose();
      if (loadedRoot) {
        disposeModelTree(loadedRoot);
        loadedRoot = null;
      }
      setLoadedScene(null);
    };
  }, [targetMaxSize, groundY, cutawayPlane, invalidate, onStatusChange]);

  if (!loadedScene) return null;

  return <primitive object={loadedScene} />;
}

function disposeModelTree(root: THREE.Object3D) {
  const disposedMaterials = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat || disposedMaterials.has(mat)) continue;
        disposedMaterials.add(mat);
        for (const val of Object.values(mat)) {
          if (val && typeof val === 'object' && 'isTexture' in val) {
            (val as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      }
    }
  });
}
