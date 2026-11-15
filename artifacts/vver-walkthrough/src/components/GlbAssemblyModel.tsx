import { useEffect, useMemo, useState } from 'react';
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
  /** Коэффициент послойного среза (1.0 = монолит, 0.5 = полусрез, 0.0 = всё внутри) */
  containmentOpacity?: number;
  /** Коллбэк состояния загрузки для отображения прогресса в HUD */
  onStatusChange?: (state: GlbLoadState) => void;
}

const MODEL_URL = '/assembly.glb';

function computeCutawayHeight(opacity: number): number {
  if (opacity >= 0.98) return 30;
  if (opacity <= 0.5) {
    return 1.4 + (Math.max(0, opacity) / 0.5) * 3.1;
  }
  return 4.5 + ((opacity - 0.5) / 0.48) * 7.5;
}

export default function GlbAssemblyModel({
  targetMaxSize = 75,
  groundY = 0,
  containmentOpacity = 1.0,
  onStatusChange,
}: GlbAssemblyModelProps) {
  const { invalidate } = useThree();
  const [loadedScene, setLoadedScene] = useState<THREE.Object3D | null>(null);
  const cutawayPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 30), []);

  useEffect(() => {
    cutawayPlane.constant = computeCutawayHeight(containmentOpacity);
    invalidate();
  }, [containmentOpacity, cutawayPlane, invalidate]);

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

        // 5. Назначение реалистичной PBR-палитры современной АЭС (полный уход от зелёного цвета)
        // Плита основания не режется плоскостью разреза (cutaway)
        const baseConcreteMat = new THREE.MeshStandardMaterial({
          color: 0x9aa3ad, // Архитектурный светло-серый матовый бетон (плита площадки)
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.FrontSide,
        });

        // Строительные конструкции и защитная оболочка режутся плоскостью cutaway для осмотра интерьера
        const buildingConcreteMat = new THREE.MeshStandardMaterial({
          color: 0x9aa3ad, // Матовый светло-серый бетон (защитная оболочка и корпуса)
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        const structuralConcreteLightMat = new THREE.MeshStandardMaterial({
          color: 0xb2bac2, // Светлый архитектурный бетон верхних конструкций и купола
          roughness: 0.84,
          metalness: 0.06,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        const structuralConcreteDarkMat = new THREE.MeshStandardMaterial({
          color: 0x7c858f, // Конструкционный железобетон цоколей и опорных стен
          roughness: 0.86,
          metalness: 0.06,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
          clipShadows: true,
        });

        const stainlessSteelMat = new THREE.MeshStandardMaterial({
          color: 0xc4ccd4, // Сатинированная нержавеющая сталь (корпуса оборудования, ПГ, турбоагрегат)
          roughness: 0.35,
          metalness: 0.75,
          side: THREE.DoubleSide,
        });

        const craneYellowMat = new THREE.MeshStandardMaterial({
          color: 0xf0a500, // Промышленный жёлтый (полярный кран, подкрановые эстакады)
          roughness: 0.38,
          metalness: 0.45,
          side: THREE.DoubleSide,
        });

        const darkGraphiteMat = new THREE.MeshStandardMaterial({
          color: 0x3b424c, // Тёмно-графитовый металл (трубопроводы, арматура, рамы)
          roughness: 0.42,
          metalness: 0.72,
          side: THREE.DoubleSide,
        });

        const techBlueMat = new THREE.MeshStandardMaterial({
          color: 0x2b5b84, // Технический синий (трубопроводы охлаждения, кожухи, приводы)
          roughness: 0.38,
          metalness: 0.55,
          side: THREE.DoubleSide,
        });

        const accentOchreMat = new THREE.MeshStandardMaterial({
          color: 0x8b95a1, // Стальной конструкционный оттенок для мелкой обвязки
          roughness: 0.42,
          metalness: 0.65,
          side: THREE.DoubleSide,
        });

        const glazingCutawayMat = new THREE.MeshStandardMaterial({
          color: 0xcfdbe6, // Полупрозрачное витражное остекление / срез оболочки
          roughness: 0.2,
          metalness: 0.12,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          side: THREE.DoubleSide,
          clippingPlanes: [cutawayPlane],
        });

        let meshCount = 0;
        let triangleCount = 0;
        let concreteIndex = 0;
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

          trackOriginalMaterial(mesh);

          // 1. Полупрозрачные витражи / разрезы стен
          if (isOriginalTransparent) {
            mesh.material = glazingCutawayMat;
            mesh.castShadow = false;
            continue;
          }

          // 2. Фундаментная плита основания (без самозатенения)
          if (mesh === largestBaseMesh) {
            mesh.material = baseConcreteMat;
            mesh.castShadow = false;
            mesh.receiveShadow = true;
            continue;
          }

          const mSize = meshBoxes.get(mesh) ?? new THREE.Vector3(1, 1, 1);
          const maxMeshDim = Math.max(mSize.x, mSize.y, mSize.z);

          // 3. Мостовой/полярный кран и подкрановые эстакады (в исходном CAD жёлтые FF00FFFF / FF33FFFF / FF00CCCC / FF009999)
          if (
            origName.includes('FFFF') ||
            origName.includes('CCCC') ||
            origName.includes('009999')
          ) {
            mesh.material = craneYellowMat;
            continue;
          }

          // 4. Корпуса оборудования, парогенераторы, турбоагрегат и реакторный блок -> сатинированная нержавеющая сталь
          // Включает бывшие зелёные корпуса M0, M1, M10 (FF006633) и плотную геометрию машзала M7 (>150k вершин)
          if (origName.includes('006633') || vertCount >= 180000) {
            mesh.material = stainlessSteelMat;
            continue;
          }

          // 5. Синие технологические узлы / кожухи из CAD (FF994C00 / FF663300 / FFFF7F00)
          if (origName.includes('994C00') || origName.includes('663300') || origName.includes('FF7F00')) {
            mesh.material = techBlueMat;
            continue;
          }

          // 6. Крупные строительные конструкции и защитная оболочка (контайнмент, стены, перекрытия)
          const isLargeConcreteStructure = maxMeshDim >= targetMaxSize * 0.16 && vertCount < 180000;
          if (isLargeConcreteStructure) {
            const concretePalette = [buildingConcreteMat, structuralConcreteLightMat, structuralConcreteDarkMat];
            mesh.material = concretePalette[concreteIndex % concretePalette.length];
            concreteIndex++;
            continue;
          }

          // 7. Мелкие детали, трубопроводы, арматура и элементы обвязки (графит, синий и стальной оттенки)
          const pipingPalette = [darkGraphiteMat, techBlueMat, accentOchreMat];
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
          `[GLB Loader] ✅ Модель выровнена и окрашена (мешей: ${meshCount}, треугольников: ${Math.round(triangleCount).toLocaleString()}).`
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
