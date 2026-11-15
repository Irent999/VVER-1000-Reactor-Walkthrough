/**
 * ============================================================================
 * МОДУЛЬ ПРОВЕРКИ ПРЯМОЙ ВИДИМОСТИ И КОРРЕКЦИИ КАМЕРЫ (LINE-OF-SIGHT VALIDATION)
 * ============================================================================
 * 
 * Предотвращает уткнувшиеся в стены кадры и геометрический клиппинг камеры:
 * 1. Анализирует вектор взгляда THREE.Raycaster(cameraPosition, lookAtTarget).
 * 2. Если луч пересекает стену, перегородку или плиту ближе чем на 1.5м от камеры,
 *    автоматически смещает точку спавна камеры назад и вверх/в сторону.
 * 3. Для внутренних помещений (БЩУ ВВЭР-1000, БЩУ РИТМ-200Н, Серверная АСУ ТП)
 *    гарантирует спавн строго в открытом объеме помещения с направлением взгляда
 *    на интерактивные пульты оператора и стойки оборудования, а не в бетонные стены.
 */

import * as THREE from 'three';
import type { FloorTarget } from '@/data/poiData';

export interface LineOfSightCheckResult {
  adjustedPosition: [number, number, number];
  adjustedTarget: [number, number, number];
  hasObstacle: boolean;
  distanceToObstacle: number | null;
  obstacleName?: string;
  adjustmentApplied: boolean;
}

export interface LineOfSightOptions {
  /** Минимальное допустимое расстояние до препятствия (по ТЗ: 1.5 м) */
  minObstacleDistance?: number;
  /** Запас отката назад от препятствия */
  clearanceMargin?: number;
  /** Подъем камеры при обнаружении преграды */
  elevationStep?: number;
  /** Максимальное число итераций корректировки */
  maxIterations?: number;
}

/**
 * Границы внутренних помещений для строгой фиксации камеры в свободном пространстве
 */
export const INDOOR_ROOM_CONSTRAINTS: Record<string, {
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  safeSpawn: [number, number, number];
  preferredTarget: [number, number, number];
}> = {
  // Внутренний зал БЩУ и серверных стоек внутри корпуса CAD-сборки assembly.glb
  'walk-bshu-interior': {
    bounds: { minX: -24.2, maxX: -11.8, minY: 0.2, maxY: 4.2, minZ: 9.5, maxZ: 15.0 },
    safeSpawn: [-18.0, 1.74, 14.3],
    preferredTarget: [-18.0, 1.45, 10.8],
  },
};

/**
 * Проверяет, является ли объект физической преградой (стена, контайнмент, перекрытие),
 * игнорируя служебные коллайдеры, свет, спрайты, сетки земли и маркеры.
 */
function isPhysicalOccluder(obj: THREE.Object3D): boolean {
  if (!obj.visible) return false;
  if (obj.name.includes('Helper') || obj.name.includes('Light') || obj.name.includes('Marker')) return false;
  if (obj.name.includes('Glass') || obj.name.includes('CutawayGlazing') || obj.name.includes('Window')) return false;

  const mesh = obj as THREE.Mesh;
  if (!mesh.isMesh) return false;

  // Игнорируем прозрачные материалы
  if (mesh.material) {
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (mat && 'transparent' in mat && mat.transparent && 'opacity' in mat && (mat.opacity ?? 1) < 0.45) {
      return false;
    }
  }

  // Физические бетонные стены, перегородки, гермооболочки
  const name = (obj.name || '').toLowerCase();
  if (
    name.includes('wall') ||
    name.includes('containment') ||
    name.includes('column') ||
    name.includes('shield') ||
    name.includes('deck') ||
    name.includes('stair') ||
    name.includes('flank')
  ) {
    return true;
  }

  return true;
}

/**
 * Главный алгоритм проверки прямой видимости THREE.Raycaster и коррекции ракурса
 */
export function validateAndAdjustCameraLineOfSight(
  cameraPosition: [number, number, number] | THREE.Vector3,
  lookAtTarget: [number, number, number] | THREE.Vector3,
  scene?: THREE.Scene | THREE.Object3D | null,
  options: LineOfSightOptions = {},
  viewpointId?: string
): LineOfSightCheckResult {
  const minObstacleDistance = options.minObstacleDistance ?? 1.5; // По ТЗ: 1.5 метра
  const clearanceMargin = options.clearanceMargin ?? 1.8;
  const elevationStep = options.elevationStep ?? 0.8;
  const maxIterations = options.maxIterations ?? 3;

  const camPos = cameraPosition instanceof THREE.Vector3
    ? cameraPosition.clone()
    : new THREE.Vector3(...cameraPosition);

  const tgtPos = lookAtTarget instanceof THREE.Vector3
    ? lookAtTarget.clone()
    : new THREE.Vector3(...lookAtTarget);

  let adjustmentApplied = false;
  let hasObstacle = false;
  let detectedDistance: number | null = null;
  let obstacleName: string | undefined = undefined;

  // 1. Проверка предустановленных ограничений для внутренних помещений
  if (viewpointId && INDOOR_ROOM_CONSTRAINTS[viewpointId]) {
    const room = INDOOR_ROOM_CONSTRAINTS[viewpointId];
    const b = room.bounds;

    // Если координаты камеры выходят за пределы свободного объема помещения
    const isOutsideRoom =
      camPos.x < b.minX || camPos.x > b.maxX ||
      camPos.y < b.minY || camPos.y > b.maxY ||
      camPos.z < b.minZ || camPos.z > b.maxZ;

    if (isOutsideRoom) {
      camPos.set(...room.safeSpawn);
      tgtPos.set(...room.preferredTarget);
      adjustmentApplied = true;
    }
  }

  // 2. Если сцена не передана, возвращаем скорректированную позицию по комнатным ограничениям
  if (!scene) {
    return {
      adjustedPosition: [camPos.x, camPos.y, camPos.z],
      adjustedTarget: [tgtPos.x, tgtPos.y, tgtPos.z],
      hasObstacle,
      distanceToObstacle: detectedDistance,
      obstacleName,
      adjustmentApplied,
    };
  }

  // 3. Анализ луча прямой видимости через THREE.Raycaster
  const raycaster = new THREE.Raycaster();
  raycaster.near = 0.05;

  for (let iter = 0; iter < maxIterations; iter++) {
    const dir = new THREE.Vector3().subVectors(tgtPos, camPos);
    const targetDist = dir.length();
    if (targetDist < 0.1) break;

    dir.normalize();
    raycaster.set(camPos, dir);
    raycaster.far = Math.max(minObstacleDistance + 0.5, targetDist);

    // Сбор кандидатов пересечения
    const candidates: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (isPhysicalOccluder(obj)) {
        candidates.push(obj as THREE.Mesh);
      }
    });

    const intersects = raycaster.intersectObjects(candidates, false);
    const firstHit = intersects.find((hit) => hit.distance > 0.05);

    if (firstHit && firstHit.distance < minObstacleDistance) {
      hasObstacle = true;
      detectedDistance = firstHit.distance;
      obstacleName = firstHit.object.name || 'Structural_Wall';

      // Автоматическое смещение назад вдоль вектора взгляда и подъем вверх
      const shiftBack = minObstacleDistance - firstHit.distance + clearanceMargin;
      camPos.addScaledVector(dir, -shiftBack);
      camPos.y += elevationStep;

      // Также слегка смещаем в сторону, если луч уперся в перпендикулярную стену
      if (firstHit.point) {
        const lateral = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        camPos.addScaledVector(lateral, 0.4);
      }

      adjustmentApplied = true;
    } else {
      // Препятствий ближе 1.5м нет — луч чист
      break;
    }
  }

  return {
    adjustedPosition: [camPos.x, camPos.y, camPos.z],
    adjustedTarget: [tgtPos.x, tgtPos.y, tgtPos.z],
    hasObstacle,
    distanceToObstacle: detectedDistance,
    obstacleName,
    adjustmentApplied,
  };
}

/**
 * Проверяет и корректирует список всех ракурсов (Viewpoints) перед использованием в UI
 */
export function auditAndCleanAllFloorViews(
  views: FloorTarget[],
  scene?: THREE.Scene | THREE.Object3D | null
): FloorTarget[] {
  return views.map((v) => {
    // Для известных внутренних помещений используем проверенные безопасные координаты
    if (INDOOR_ROOM_CONSTRAINTS[v.id]) {
      const room = INDOOR_ROOM_CONSTRAINTS[v.id];
      const validated = validateAndAdjustCameraLineOfSight(
        room.safeSpawn,
        room.preferredTarget,
        scene,
        { minObstacleDistance: 1.5 },
        v.id
      );

      return {
        ...v,
        cameraPos: validated.adjustedPosition,
        target: validated.adjustedTarget,
      };
    }

    if (v.target) {
      const validated = validateAndAdjustCameraLineOfSight(
        v.cameraPos,
        v.target,
        scene,
        { minObstacleDistance: 1.5 },
        v.id
      );
      if (validated.adjustmentApplied) {
        return {
          ...v,
          cameraPos: validated.adjustedPosition,
          target: validated.adjustedTarget,
        };
      }
    }

    return v;
  });
}
