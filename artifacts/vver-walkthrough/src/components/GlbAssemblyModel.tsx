import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
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

interface GlbAssemblyModelProps {
  /** Целевой максимальный габарит модели в метрах после масштабирования по центру сцены */
  targetMaxSize?: number;
  /** Отметка уровня земли по оси Y (по умолчанию 0) */
  groundY?: number;
  /** Коэффициент послойного среза (1.0 = монолит, 0.5 = полусрез, 0.0 = глубокий срез) */
  containmentOpacity?: number;
  /** Полупрозрачный режим наружных стен и крыши оболочки (X-Ray стены) */
  shellTransparent?: boolean;
  /** Коллбэк состояния загрузки для отображения прогресса в HUD */
  onStatusChange?: (state: GlbLoadState) => void;
}

const MODEL_URL = '/assembly.glb';

function computeCutawayHeight(opacity: number): number {
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
  onStatusChange,
}: GlbAssemblyModelProps) {
  const { invalidate } = useThree();
  const [loadedScene, setLoadedScene] = useState<THREE.Object3D | null>(null);
  const cutawayPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 60), []);
  const shellMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const shellTransparentRef = useRef(shellTransparent);
  shellTransparentRef.current = shellTransparent;

  useEffect(() => {
    cutawayPlane.constant = computeCutawayHeight(containmentOpacity);
    invalidate();
  }, [containmentOpacity, cutawayPlane, invalidate]);

  useEffect(() => {
    for (const mat of shellMaterialsRef.current) {
      if (shellTransparent) {
        mat.transparent = true;
        mat.opacity = 0.16;
        mat.depthWrite = false;
      } else {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
      }
      mat.needsUpdate = true;
    }
    invalidate();
  }, [shellTransparent, invalidate]);

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

        // 5. Назначение PBR-материалов строго по эталонному физическому макету (полный уход от зелёного цвета)
        // Основание площадки — нейтральный архитектурный бетон (не режется cutaway)
        const baseConcreteMat = new THREE.MeshStandardMaterial({
          color: 0x7a828b,
          roughness: 0.88,
          metalness: 0.04,
          side: THREE.FrontSide,
        });

        const isXray = shellTransparentRef.current;

        // Энергоблоки ВВЭР-1000 и основные контайнменты: благородный тёмно-серый / графитовый бетон (#4a5056)
        const vverGraphiteConcreteMat = new THREE.MeshStandardMaterial({
          color: 0x4a5056,
          roughness: 0.8,
          metalness: 0.08,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.16 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Глубокий графитовый бетон для рам, откосов и контуров ВВЭР-1000
        const vverDeepGraphiteMat = new THREE.MeshStandardMaterial({
          color: 0x3e444a,
          roughness: 0.82,
          metalness: 0.08,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.16 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Вспомогательные корпуса, РИТМ-200Н и градирни: светло-серые стены
        const auxLightConcreteMat = new THREE.MeshStandardMaterial({
          color: 0xc8cfd6,
          roughness: 0.78,
          metalness: 0.05,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.16 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Белые / серебристые раструбы, венцы и верхние архитектурные элементы
        const silverWhiteRimMat = new THREE.MeshStandardMaterial({
          color: 0xe4e9ee,
          roughness: 0.52,
          metalness: 0.18,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.2 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Контрастные синие кровли и элементы корпусов РИТМ-200Н / вспомогательных зданий (#2a4b7c)
        const ritmCobaltRoofMat = new THREE.MeshStandardMaterial({
          color: 0x2a4b7c,
          roughness: 0.48,
          metalness: 0.24,
          side: THREE.DoubleSide,
          transparent: isXray,
          opacity: isXray ? 0.22 : 1.0,
          depthWrite: !isXray,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        // Перекрытия и платформы обслуживания (остаются плотными в X-Ray для наглядности ходьбы)
        const structuralPlinthMat = new THREE.MeshStandardMaterial({
          color: 0x5c636b,
          roughness: 0.84,
          metalness: 0.06,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        shellMaterialsRef.current = [
          vverGraphiteConcreteMat,
          vverDeepGraphiteMat,
          auxLightConcreteMat,
          silverWhiteRimMat,
          ritmCobaltRoofMat,
        ];

        // Корпуса оборудования ВВЭР, парогенераторы, турбоагрегат — сатинированная нержавеющая сталь
        const stainlessSteelMat = new THREE.MeshStandardMaterial({
          color: 0xc4ccd4,
          roughness: 0.34,
          metalness: 0.76,
          side: THREE.DoubleSide,
        });

        // Мостовой / полярный кран внутри зала — традиционный ярко-жёлтый индустриальный цвет (#f0a500)
        const craneYellowMat = new THREE.MeshStandardMaterial({
          color: 0xf0a500,
          roughness: 0.36,
          metalness: 0.48,
          side: THREE.DoubleSide,
        });

        // Металлические фермы, опоры ОРУ / эстакады — технический серый металл
        const technicalMetalMat = new THREE.MeshStandardMaterial({
          color: 0x7e8791,
          roughness: 0.38,
          metalness: 0.78,
          side: THREE.DoubleSide,
        });

        // Тёмно-графитовый металл трубопроводов и арматуры
        const darkGraphiteMetalMat = new THREE.MeshStandardMaterial({
          color: 0x3b424c,
          roughness: 0.42,
          metalness: 0.72,
          side: THREE.DoubleSide,
        });

        // Контрастный синий для технологических узлов и крышек
        const techBlueMetalMat = new THREE.MeshStandardMaterial({
          color: 0x2a4b7c,
          roughness: 0.4,
          metalness: 0.45,
          side: THREE.DoubleSide,
        });

        // Полупрозрачное витражное остекление
        const glazingCutawayMat = new THREE.MeshStandardMaterial({
          color: 0xc2d4e4,
          roughness: 0.18,
          metalness: 0.15,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
        });

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

        for (let idx = 0; idx < meshes.length; idx++) {
          const mesh = meshes[idx];
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

          const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          const origName = (origMat?.name ?? '').toUpperCase();
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

          // 1. Полупрозрачное остекление и витражи
          if (isOriginalTransparent) {
            mesh.material = glazingCutawayMat;
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

          const mSize = meshBoxes.get(mesh) ?? new THREE.Vector3(1, 1, 1);
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

          // 4. Реакторный корпус, парогенераторы и турбоагрегат -> сатинированная сталь
          if (origName.includes('006633') || vertCount >= 180000) {
            mesh.material = stainlessSteelMat;
            mesh.userData.isHeavyEquipment = vertCount >= 180000;
            continue;
          }

          // 5. Металлические фермы, опоры и обвязка верхнего блока (бывшие оливковые 00C39E / 01BC99 и тёмный металл 232323)
          if (
            origName.includes('00C39E') ||
            origName.includes('01BC99') ||
            origName.includes('232323')
          ) {
            mesh.material = technicalMetalMat;
            mesh.userData.isWalkableFloor = true;
            continue;
          }

          // 6. Синие кровли и элементы вспомогательных корпусов / РИТМ-200Н (#2a4b7c)
          // В исходном CAD это ABGR-синие материалы: FF663300, FF994C00, FFFF7F00, а также кровельные панели FF000066 / FF000099
          if (
            origName.includes('663300') ||
            origName.includes('994C00') ||
            origName.includes('FF7F00') ||
            origName.includes('000066') ||
            origName.includes('000099')
          ) {
            mesh.material = maxMeshDim >= 8.0 ? ritmCobaltRoofMat : techBlueMetalMat;
            continue;
          }

          // 7. Перекрытия и полы цехов / мостиков обслуживания (FF484848)
          if (origName.includes('484848')) {
            mesh.material = structuralPlinthMat;
            mesh.userData.isWalkableFloor = true;
            continue;
          }

          // 8. Белые / серебристые раструбы, верхние венцы и парапеты (FFFFFFFF)
          if (origName.includes('FFFFFF') && maxMeshDim >= 8.0) {
            mesh.material = silverWhiteRimMat;
            continue;
          }

          // 9. Энергоблоки ВВЭР-1000 и основные контайнменты (#4a5056 тёмно-серый графитовый бетон)
          if (origName.includes('8F8F8F')) {
            mesh.material = vverGraphiteConcreteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }
          if (origName.includes('6C6C6C')) {
            mesh.material = vverDeepGraphiteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 10. Вспомогательные корпуса и южное/восточное крыло (РИТМ-200Н, АБК): светло-серый бетон (#c8cfd6)
          if (origName.includes('D8D8D8') || origName.includes('B3B3B3')) {
            mesh.material = auxLightConcreteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 11. Крупные бетонные узлы без явного имени
          if (maxMeshDim >= targetMaxSize * 0.16 && vertCount < 180000) {
            mesh.material = vverGraphiteConcreteMat;
            mesh.userData.isWalkableFloor = true;
            mesh.userData.isWallCollider = true;
            continue;
          }

          // 12. Мелкие металлические опоры, трубопроводы и элементы ОРУ
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

        console.info(
          `[GLB Loader] ✅ Модель выровнена и окрашена по эталонному макету (мешей: ${meshCount}, треугольников: ${Math.round(triangleCount).toLocaleString()}).`
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
