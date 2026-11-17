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

const MODEL_URL = '/assembly.glb';

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
      glazingMaterialRef.current.opacity = transparentMode ? 0.14 : 0.72;
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

  // Критично для frameloop="demand": вызываем invalidate() ПОСЛЕ монтирования <primitive /> в сцену
  useEffect(() => {
    if (!loadedScene) return;
    invalidate();
    const rafId = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(rafId);
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
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

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

        // Процедурная текстура рёбер жёсткости для градирен и лёгкой бетонной фактуры
        const coolingRibCanvas = document.createElement('canvas');
        coolingRibCanvas.width = 256;
        coolingRibCanvas.height = 256;
        const ribCtx = coolingRibCanvas.getContext('2d');
        if (ribCtx) {
          ribCtx.fillStyle = '#d8dee5';
          ribCtx.fillRect(0, 0, 256, 256);
          ribCtx.fillStyle = 'rgba(130, 140, 152, 0.28)';
          for (let x = 0; x < 256; x += 16) {
            ribCtx.fillRect(x, 0, 2, 256);
          }
          ribCtx.fillStyle = 'rgba(140, 150, 162, 0.20)';
          for (let y = 0; y < 256; y += 32) {
            ribCtx.fillRect(0, y, 256, 2);
          }
        }
        const coolingRibTexture = new THREE.CanvasTexture(coolingRibCanvas);
        coolingRibTexture.colorSpace = THREE.SRGBColorSpace;
        coolingRibTexture.wrapS = THREE.RepeatWrapping;
        coolingRibTexture.wrapT = THREE.RepeatWrapping;
        coolingRibTexture.repeat.set(8, 6);

        // 5. Дневные реалистичные PBR-материалы зданий, градирен и оборудования АЭС
        // Основание площадки — светло-серый бетон, совпадающий с круглой вставкой
        const baseConcreteMat = new THREE.MeshStandardMaterial({
          color: 0xcfd5dc,
          roughness: 0.88,
          metalness: 0.03,
          side: THREE.FrontSide,
        });

        const isXray = shellTransparentRef.current;

        // Светло-белые архитектурные фасады энергоблоков и машинного зала (поддерживают Cutaway и X-Ray)
        const facadeLightWhiteMat = new THREE.MeshStandardMaterial({
          color: 0xeef1f4,
          roughness: 0.72,
          metalness: 0.05,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.16 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Светло-серые бетонные стены и корпуса (#c6cdd5)
        const vverLightConcreteMat = new THREE.MeshStandardMaterial({
          color: 0xc6cdd5,
          roughness: 0.78,
          metalness: 0.06,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.16 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Тёмные архитектурные пояса, цоколи и откосы (#555e68)
        const darkBeltConcreteMat = new THREE.MeshStandardMaterial({
          color: 0x555e68,
          roughness: 0.8,
          metalness: 0.08,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.18 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Градирни: светло-серый бетон с тонкими рёбрами жёсткости
        const coolingTowerConcreteMat = new THREE.MeshStandardMaterial({
          map: coolingRibTexture,
          color: 0xdbe0e6,
          roughness: 0.84,
          metalness: 0.04,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.2 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Белые парапеты, карнизы и верхние ободки градирен (#f4f6f8)
        const silverWhiteRimMat = new THREE.MeshStandardMaterial({
          color: 0xf4f6f8,
          roughness: 0.65,
          metalness: 0.1,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.2 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Кровли энергоблоков и машинного зала — стальной графитовый лист (с Cutaway / X-Ray для просмотра турбоагрегата)
        const industrialRoofMat = new THREE.MeshStandardMaterial({
          color: 0x76818e,
          roughness: 0.7,
          metalness: 0.18,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.14 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Перекрытия и платформы обслуживания (остаются плотными в X-Ray)
        const structuralPlinthMat = new THREE.MeshStandardMaterial({
          color: 0x9aa2ab,
          roughness: 0.82,
          metalness: 0.06,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Металлические рамы витражей и фасадных поясов (поддерживают Cutaway и X-Ray)
        const shellMetalFrameMat = new THREE.MeshStandardMaterial({
          color: 0x454e58,
          roughness: 0.48,
          metalness: 0.58,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.16 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        shellMaterialsRef.current = [
          facadeLightWhiteMat,
          vverLightConcreteMat,
          darkBeltConcreteMat,
          coolingTowerConcreteMat,
          silverWhiteRimMat,
          industrialRoofMat,
          shellMetalFrameMat,
        ];

        // Корпуса оборудования ВВЭР, парогенераторы и трубопроводы — сатинированная нержавеющая сталь
        const stainlessSteelMat = new THREE.MeshStandardMaterial({
          color: 0xc4ccd4,
          roughness: 0.32,
          metalness: 0.78,
          side: THREE.DoubleSide,
          transparent: energyFlowActiveRef.current,
          opacity: energyFlowActiveRef.current ? 0.44 : 1.0,
          depthWrite: !energyFlowActiveRef.current,
        });
        reactorVesselMaterialRef.current = stainlessSteelMat;

        // Мостовой / полярный кран внутри зала — контрастный индустриальный жёлтый (#f0a500)
        const craneYellowMat = new THREE.MeshStandardMaterial({
          color: 0xf0a500,
          roughness: 0.36,
          metalness: 0.48,
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

        // Индустриальный стальной синий для крышек и элементов технологических узлов
        const techBlueMetalMat = new THREE.MeshStandardMaterial({
          color: 0x355887,
          roughness: 0.42,
          metalness: 0.46,
          side: THREE.DoubleSide,
        });

        // Тёмные тонированные окна фасадов зданий (поддерживают X-Ray и Cutaway)
        const darkWindowGlazingMat = new THREE.MeshStandardMaterial({
          color: 0x1d2a38,
          roughness: 0.14,
          metalness: 0.42,
          transparent: true,
          opacity: isXray ? 0.14 : 0.72,
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

        const meshesToKeep: THREE.Mesh[] = [];
        for (let idx = 0; idx < meshes.length; idx++) {
          const mesh = meshes[idx];

          const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const origName = (origMat?.name ?? '').toUpperCase();
          const mBox = new THREE.Box3().setFromObject(mesh);
          const mSize = meshBoxes.get(mesh) ?? new THREE.Vector3(1, 1, 1);

          // Удаление лишних висящих плоских планок/мостиков (M31 75FFFFFF с нулевой толщиной, M37 32FFFFFF,
          // а также любых посторонних плоских прямоугольных артефактов у основания градирен)
          const isZeroThicknessFloatingPlank =
            origName.includes('75FFFFFF') ||
            (mSize.y < 0.03 && mBox.min.y > 1.2 && !origName.includes('006633'));
          const isDetachedExteriorGlass =
            origName.includes('32FFFFFF') && mBox.min.x > 18 && mBox.max.x < 23;
          const isStrayCoolingTowerPlank =
            mesh !== largestBaseMesh &&
            mBox.max.z > -4 &&
            mBox.min.x < -8 &&
            mBox.max.y < 14 &&
            mSize.y < 1.2 &&
            !origName.includes('B3B3B3') &&
            !origName.includes('D8D8D8') &&
            !origName.includes('484848') &&
            !origName.includes('663300') &&
            !origName.includes('6C6C6C');

          if (isZeroThicknessFloatingPlank || isDetachedExteriorGlass || isStrayCoolingTowerPlank) {
            trackOriginalMaterial(mesh);
            mesh.removeFromParent();
            mesh.geometry?.dispose();
            continue;
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

          // 1. Полупрозрачные окна и витражи (исключая нижние пояса градирен 29D8D8D8/32D8D8D8)
          if (isOriginalTransparent && !origName.includes('D8D8D8')) {
            mesh.material = darkWindowGlazingMat;
            mesh.castShadow = false;
            mesh.userData.isCadGlass = true;
            continue;
          }

          // 2. Плита основания площадки (без самозатенения)
          if (mesh === largestBaseMesh) {
            mesh.material = baseConcreteMat;
            mesh.castShadow = false;
            mesh.receiveShadow = true;
            mesh.userData.isWalkableFloor = true;
            continue;
          }

          const maxMeshDim = Math.max(mSize.x, mSize.y, mSize.z);

          // 3. Мостовой и полярный кран (ярко-жёлтый #f0a500)
          if (
            origName.includes('FFFF') ||
            origName.includes('CCCC') ||
            origName.includes('009999')
          ) {
            mesh.material = craneYellowMat;
            continue;
          }

          // 4. Реакторный корпус, парогенераторы и трубопроводы -> сатинированная сталь
          if (origName.includes('006633') || vertCount >= 180000) {
            mesh.material = stainlessSteelMat;
            mesh.userData.isHeavyEquipment = vertCount >= 180000;
            continue;
          }

          // 5. Металлические рамы фасадов (232323) -> участвуют в Cutaway / X-Ray; опоры реактора -> technicalMetalMat
          if (origName.includes('232323')) {
            mesh.material = shellMetalFrameMat;
            continue;
          }
          if (origName.includes('00C39E') || origName.includes('01BC99')) {
            mesh.material = technicalMetalMat;
            mesh.userData.isWalkableFloor = true;
            continue;
          }

          // 6. Кровли и верхние технологические пояса (поддерживают Cutaway и X-Ray)
          if (
            origName.includes('663300') ||
            origName.includes('994C00') ||
            origName.includes('FF7F00') ||
            origName.includes('000066') ||
            origName.includes('000099')
          ) {
            mesh.material = maxMeshDim >= 8.0 ? industrialRoofMat : techBlueMetalMat;
            continue;
          }

          // 7. Перекрытия и полы цехов / мостиков обслуживания (FF484848)
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

          // 9. Градирни (FFB3B3B3) — светло-серый бетон с тонкими рёбрами жёсткости
          if (origName.includes('B3B3B3')) {
            mesh.material = coolingTowerConcreteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 10. Светло-белые фасады энергоблоков и машинного зала (FFD8D8D8, 29D8D8D8, 32D8D8D8)
          if (origName.includes('D8D8D8')) {
            mesh.material = facadeLightWhiteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 11. Светло-серые корпуса энергоблоков (FF8F8F8F) и тёмные пояса (FF6C6C6C)
          if (origName.includes('8F8F8F')) {
            mesh.material = vverLightConcreteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }
          if (origName.includes('6C6C6C')) {
            mesh.material = darkBeltConcreteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 12. Крупные бетонные узлы без явного имени
          if (maxMeshDim >= targetMaxSize * 0.16 && vertCount < 180000) {
            mesh.material = vverLightConcreteMat;
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
