import * as THREE from 'three';

export interface CadWalkCollisionData {
  rootFound: boolean;
  floorMeshes: THREE.Mesh[];
  wallMeshes: THREE.Mesh[];
  heavyBoxes: THREE.Box3[];
}

const _raycaster = new THREE.Raycaster();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _downDir = new THREE.Vector3(0, -1, 0);
const _worldNormal = new THREE.Vector3();

const PLAYER_RADIUS = 0.48;
const CHEST_HEIGHT_OFFSET = 1.05;
const MAX_STEP_UP = 0.95;
const MAX_STEP_DOWN = 2.8;

/**
 * Собирает кэш поверхностей CAD-модели `MainGLBAssembly` для ходьбы 1:1 по платформам,
 * мостикам обслуживания и скольжения вдоль стен без рейкаста в 521k-треугольный меш турбины.
 */
export function collectCadWalkData(scene: THREE.Scene): CadWalkCollisionData {
  const floorMeshes: THREE.Mesh[] = [];
  const wallMeshes: THREE.Mesh[] = [];
  const heavyBoxes: THREE.Box3[] = [];

  const assemblyRoot = scene.getObjectByName('MainGLBAssembly');
  if (!assemblyRoot) {
    return { rootFound: false, floorMeshes, wallMeshes, heavyBoxes };
  }

  assemblyRoot.updateMatrixWorld(true);
  assemblyRoot.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.visible) return;

    if (obj.userData?.isHeavyEquipment) {
      const box = new THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        heavyBoxes.push(box);
      }
      return;
    }

    if (obj.userData?.isCadGlass) return;

    if (obj.userData?.isWalkableFloor) {
      floorMeshes.push(obj);
    }
    if (obj.userData?.isWallCollider) {
      wallMeshes.push(obj);
    }
  });

  return {
    rootFound: true,
    floorMeshes,
    wallMeshes,
    heavyBoxes,
  };
}

/**
 * Ограничивает горизонтальные координаты компактным основанием CAD-площадки 225×225 м
 * с учётом выреза юго-восточного двора.
 */
export function clampToSitePad(x: number, z: number): { x: number; z: number } {
  let nextX = THREE.MathUtils.clamp(x, -108, 108);
  let nextZ = THREE.MathUtils.clamp(z, -108, 108);

  if (nextX > 20 && nextZ > 12) {
    if (nextX - 20 < nextZ - 12) {
      nextX = 20;
    } else {
      nextZ = 12;
    }
  }

  return { x: nextX, z: nextZ };
}

/**
 * Разрешает горизонтальное перемещение (dx, dz) со скольжением вдоль стен CAD-сборки
 * и защитой от прохождения сквозь крупное оборудование.
 */
export function resolveCadHorizontalStep(
  posX: number,
  posZ: number,
  currentFloorY: number,
  dx: number,
  dz: number,
  data: CadWalkCollisionData
): { x: number; z: number } {
  let stepX = dx;
  let stepZ = dz;
  const stepLen = Math.hypot(stepX, stepZ);

  if (stepLen > 1e-5 && data.wallMeshes.length > 0) {
    _rayDir.set(stepX / stepLen, 0, stepZ / stepLen);
    _rayOrigin.set(posX, currentFloorY + CHEST_HEIGHT_OFFSET, posZ);

    _raycaster.set(_rayOrigin, _rayDir);
    _raycaster.near = 0.01;
    _raycaster.far = stepLen + PLAYER_RADIUS;

    const hits = _raycaster.intersectObjects(data.wallMeshes, false);
    for (const hit of hits) {
      if (!hit.face) continue;

      // КРИТИЧНО: переводим нормаль из локальной CAD-системы (повёрнутой на +90° X) в мировую
      _worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);

      // Игнорируем горизонтальные полы и пологие пандусы
      if (Math.abs(_worldNormal.y) >= 0.55) continue;

      let nx = _worldNormal.x;
      let nz = _worldNormal.z;
      const nLen = Math.hypot(nx, nz);
      if (nLen < 1e-4) continue;
      nx /= nLen;
      nz /= nLen;

      // DoubleSide CAD-меши: разворачиваем нормаль навстречу игроку
      if (nx * _rayDir.x + nz * _rayDir.z > 0) {
        nx = -nx;
        nz = -nz;
      }

      const intoWall = stepX * nx + stepZ * nz;
      if (intoWall < 0) {
        stepX -= nx * intoWall;
        stepZ -= nz * intoWall;
      }

      if (hit.distance < PLAYER_RADIUS - 0.04) {
        const pushOut = PLAYER_RADIUS - 0.04 - hit.distance;
        stepX += nx * pushOut;
        stepZ += nz * pushOut;
      }
      break;
    }
  }

  let nextX = posX + stepX;
  let nextZ = posZ + stepZ;

  // Отталкивание от габаритов тяжелого оборудования (например, турбоагрегата M7)
  for (const box of data.heavyBoxes) {
    if (currentFloorY + 0.35 >= box.max.y || currentFloorY + 1.65 <= box.min.y) {
      continue;
    }
    const minX = box.min.x - PLAYER_RADIUS;
    const maxX = box.max.x + PLAYER_RADIUS;
    const minZ = box.min.z - PLAYER_RADIUS;
    const maxZ = box.max.z + PLAYER_RADIUS;

    if (nextX > minX && nextX < maxX && nextZ > minZ && nextZ < maxZ) {
      const dl = Math.abs(nextX - minX);
      const dr = Math.abs(maxX - nextX);
      const dt = Math.abs(nextZ - minZ);
      const db = Math.abs(maxZ - nextZ);
      const m = Math.min(dl, dr, dt, db);
      if (m === dl) nextX = minX;
      else if (m === dr) nextX = maxX;
      else if (m === dt) nextZ = minZ;
      else nextZ = maxZ;
    }
  }

  return clampToSitePad(nextX, nextZ);
}

/**
 * Определяет точную отметку пола, мостика обслуживания или платформы под (x, z)
 * с учётом поворота CAD-сцены (+90° X) при расчёте мировых нормалей.
 */
export function sampleCadFloorHeight(
  x: number,
  z: number,
  currentFloorY: number,
  fallbackFloorY: number,
  data: CadWalkCollisionData
): number {
  if (!data.rootFound || data.floorMeshes.length === 0) {
    return fallbackFloorY;
  }

  _rayOrigin.set(x, currentFloorY + 1.35, z);
  _raycaster.set(_rayOrigin, _downDir);
  _raycaster.near = 0.02;
  _raycaster.far = 1.35 + MAX_STEP_DOWN + 0.5;

  const hits = _raycaster.intersectObjects(data.floorMeshes, false);
  let bestFloorY: number | null = null;

  for (const hit of hits) {
    if (!hit.face) continue;

    // КРИТИЧНО: переводим нормаль в мировые координаты
    _worldNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    if (_worldNormal.y <= 0.62) continue;

    const hitY = hit.point.y;
    if (hitY <= currentFloorY + MAX_STEP_UP && hitY >= currentFloorY - MAX_STEP_DOWN) {
      if (bestFloorY === null || hitY > bestFloorY) {
        bestFloorY = hitY;
      }
    }
  }

  return bestFloorY !== null ? bestFloorY : currentFloorY;
}
