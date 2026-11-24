/**
 * ============================================================================
 * МОДУЛЬ ДИНАМИЧЕСКОЙ ПРИВЯЗКИ ТОЧЕК ОБЗОРА И СВОБОДНОГО VR-ПЕРЕМЕЩЕНИЯ ДЛЯ THREE.JS
 * ============================================================================
 * 
 * Включает:
 * 1. Динамический сдвиг ракурсов (Viewpoints / POI) вслед за моделью:
 *    - Связывает координаты ракурсов (№05–№10) комплекса РИТМ-200Н с глобальной
 *      матрицей трансформации группы ritm200Group.
 *    - При изменении ritm200Group.position автоматически пересчитывает позиции всех
 *      сфер/маркеров POI и точек назначения камеры (cameraTarget), добавляя дельту смещения.
 * 2. Динамическая камера (без жесткой блокировки):
 *    - Плавный перенос камеры (через плавную интерполяцию/lerp за ~1.5 сек) к целевой точке.
 *    - По завершении перелета управление мгновенно передается контроллеру
 *      (PointerLockControls на ПК или XRRig в VR) без блокировок.
 * 3. Свободная ходьба в VR (WebXR Smooth Locomotion & Teleport):
 *    - Использование структуры dolly / cameraRig (контейнер XROrigin / Dolly).
 *    - Перемещение dolly при выборе ракурса без сбивания трекинга VR-шлема.
 *    - Непрерывное перемещение левым стиком (Smooth Locomotion) и поворот правым стиком (Snap Turn).
 */

import * as THREE from 'three';
import { POI_LIST, FLOOR_VIEWS, type POIInfo, type FloorTarget } from '@/data/poiData';

// Базовые локальные координаты POI комплекса РИТМ-200Н относительно точки привязки здания
export const RITM_LOCAL_POI_OFFSETS: Record<string, [number, number, number]> = {
  ritmCore: [-14.0, 2.3, 0.0],
  ritmSG: [-14.0, 5.1, 0.0],
  ritmCRD: [-14.0, 11.5, 0.0],
  ritmPump: [-16.5, 3.5, 2.5],
  ritmTurbine: [18.0, -0.5, 0.0],
  ritmBubbler: [-24.5, 2.0, -4.0],
  ritmMCR: [-14.0, 0.5, -11.0],
};

// Базовые локальные смещения ракурсов камеры и целей (target) относительно точки привязки РИТМ-200Н
export const RITM_LOCAL_VIEW_OFFSETS: Record<string, {
  cameraOffset: [number, number, number];
  targetOffset: [number, number, number];
}> = {
  'view-smr': {
    cameraOffset: [37.0, 48.0, 50.0],
    targetOffset: [0.0, 16.0, 0.0],
  },
  'view-smr-cutaway': {
    cameraOffset: [-14.0, 18.0, 37.0],
    targetOffset: [-14.0, 8.0, 0.0],
  },
  'view-smr-core': {
    cameraOffset: [-14.0, 6.5, 14.0],
    targetOffset: [-14.0, 4.5, 0.0],
  },
  'view-smr-crdm': {
    cameraOffset: [-14.0, 15.5, 11.0],
    targetOffset: [-14.0, 11.5, 0.0],
  },
  'view-smr-turbine': {
    cameraOffset: [18.0, 7.5, 19.0],
    targetOffset: [18.0, 1.5, 0.0],
  },
  'walk-smr-mcr': {
    cameraOffset: [-14.0, 3.4, -16.0],
    targetOffset: [-14.0, 2.0, -11.0],
  },
};

/**
 * 1. Функция динамической синхронизации координат POI и ракурсов с трансформацией РИТМ-200Н.
 * Извлекает мировую позицию ritm200Group и пересчитывает мировые координаты точек.
 */
export function syncRITMViewpoints(
  ritmGroup: THREE.Object3D,
  poiList: POIInfo[] = POI_LIST,
  floorViews: FloorTarget[] = FLOOR_VIEWS
): {
  updatedPOIs: POIInfo[];
  updatedViews: FloorTarget[];
  worldOrigin: THREE.Vector3;
} {
  ritmGroup.updateMatrixWorld(true);
  const worldOrigin = new THREE.Vector3();
  ritmGroup.getWorldPosition(worldOrigin);

  // 1.1 Пересчет маркеров POI
  const updatedPOIs = poiList.map((poi) => {
    const localOffset = RITM_LOCAL_POI_OFFSETS[poi.id];
    if (!localOffset) return poi;

    const newWorldPos: [number, number, number] = [
      worldOrigin.x + localOffset[0],
      worldOrigin.y + localOffset[1],
      worldOrigin.z + localOffset[2],
    ];

    // Мутируем или возвращаем обновленный объект
    poi.position = newWorldPos;
    return { ...poi, position: newWorldPos };
  });

  // 1.2 Пересчет ракурсов камеры
  const updatedViews = floorViews.map((view) => {
    const offsets = RITM_LOCAL_VIEW_OFFSETS[view.id];
    if (!offsets) return view;

    const newCamPos: [number, number, number] = [
      worldOrigin.x + offsets.cameraOffset[0],
      worldOrigin.y + offsets.cameraOffset[1],
      worldOrigin.z + offsets.cameraOffset[2],
    ];

    const newTarget: [number, number, number] = [
      worldOrigin.x + offsets.targetOffset[0],
      worldOrigin.y + offsets.targetOffset[1],
      worldOrigin.z + offsets.targetOffset[2],
    ];

    view.cameraPos = newCamPos;
    view.target = newTarget;

    return {
      ...view,
      cameraPos: newCamPos,
      target: newTarget,
    };
  });

  return {
    updatedPOIs,
    updatedViews,
    worldOrigin,
  };
}

/**
 * 2. Класс плавного перемещения камеры (Dynamic Camera Transition Controller)
 * Выполняет гладкий переход в течение 1.5 сек с последующей передачей управления
 * контроллерам свободного передвижения (PointerLockControls / VR Locomotion).
 */
export class DynamicCameraController {
  private camera: THREE.Camera;
  private orbitControls?: { target: THREE.Vector3; update: () => void };
  private isTransitioning: boolean = false;
  private startTime: number = 0;
  private duration: number = 1.5; // 1.5 секунды по ТЗ

  private startPos = new THREE.Vector3();
  private endPos = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private currentTarget = new THREE.Vector3();

  private onCompleteCallback?: () => void;

  constructor(
    camera: THREE.Camera,
    orbitControls?: { target: THREE.Vector3; update: () => void }
  ) {
    this.camera = camera;
    this.orbitControls = orbitControls;
  }

  public setOrbitControls(controls: { target: THREE.Vector3; update: () => void }) {
    this.orbitControls = controls;
  }

  /**
   * Запуск плавного перелета к ракурсу
   */
  public flyTo(
    targetPosition: [number, number, number] | THREE.Vector3,
    lookAtTarget: [number, number, number] | THREE.Vector3,
    duration: number = 1.5,
    onComplete?: () => void
  ) {
    this.startPos.copy(this.camera.position);
    if (Array.isArray(targetPosition)) {
      this.endPos.set(...targetPosition);
    } else {
      this.endPos.copy(targetPosition);
    }

    if (this.orbitControls) {
      this.startTarget.copy(this.orbitControls.target);
    } else {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.startTarget.copy(this.camera.position).add(dir.multiplyScalar(20));
    }

    if (Array.isArray(lookAtTarget)) {
      this.endTarget.set(...lookAtTarget);
    } else {
      this.endTarget.copy(lookAtTarget);
    }

    this.duration = Math.max(0.2, duration);
    this.startTime = performance.now();
    this.isTransitioning = true;
    this.onCompleteCallback = onComplete;
  }

  /**
   * Вызов на каждом кадре рендера (например, в useFrame)
   */
  public update(now: number = performance.now()): boolean {
    if (!this.isTransitioning) return false;

    const elapsed = (now - this.startTime) / 1000;
    const rawProgress = Math.min(1.0, elapsed / this.duration);

    // Плавная кубическая кривая (smoothstep easing)
    const t = rawProgress * rawProgress * (3 - 2 * rawProgress);

    // Интерполяция положения камеры
    this.camera.position.lerpVectors(this.startPos, this.endPos, t);

    // Интерполяция точки взгляда
    this.currentTarget.lerpVectors(this.startTarget, this.endTarget, t);

    if (this.orbitControls) {
      this.orbitControls.target.copy(this.currentTarget);
      this.orbitControls.update();
    } else {
      this.camera.lookAt(this.currentTarget);
    }

    if (rawProgress >= 1.0) {
      this.isTransitioning = false;
      this.camera.position.copy(this.endPos);
      if (this.orbitControls) {
        this.orbitControls.target.copy(this.endTarget);
        this.orbitControls.update();
      }

      // Немедленное освобождение управления контроллерам
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
        this.onCompleteCallback = undefined;
      }
      return false;
    }

    return true;
  }

  public get transitioning(): boolean {
    return this.isTransitioning;
  }

  public cancel() {
    this.isTransitioning = false;
  }
}

/**
 * 3. Логика позиционирования VR Dolly (CameraRig)
 * Перемещает базовую опору шлема (XROrigin/Dolly), сохраняя свободу трекинга головы и контроллеров.
 */
export function moveVRDolly(
  dollyGroup: THREE.Object3D,
  targetPos: [number, number, number] | THREE.Vector3,
  floorY?: number
) {
  if (Array.isArray(targetPos)) {
    dollyGroup.position.x = targetPos[0];
    dollyGroup.position.z = targetPos[2];
    dollyGroup.position.y = floorY !== undefined ? floorY : targetPos[1];
  } else {
    dollyGroup.position.x = targetPos.x;
    dollyGroup.position.z = targetPos.z;
    dollyGroup.position.y = floorY !== undefined ? floorY : targetPos.y;
  }
  dollyGroup.updateMatrixWorld(true);
}
