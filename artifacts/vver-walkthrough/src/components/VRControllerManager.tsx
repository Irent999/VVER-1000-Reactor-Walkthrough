import { useRef, useEffect, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { XROrigin, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { EYE_HEIGHT } from '@/scene/constants';

const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _poseQuat = new THREE.Quaternion();
const _ray = new THREE.Ray();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();
const _gripPos = new THREE.Vector3();
const _gripQuat = new THREE.Quaternion();
const _beamMid = new THREE.Vector3();
const _beamQuat = new THREE.Quaternion();
const _zNeg = new THREE.Vector3(0, 0, -1);

const MAX_CONTROLLERS = 2;

/** Кольцо целеуказания телепорта на активной плоскости пола (обновляется напрямую без setState) */
function VRTeleportRing({ ringRef }: { ringRef: RefObject<THREE.Group> }) {
  const innerRingRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current || !ringRef.current.visible) return;
    const t = state.clock.elapsedTime;
    if (innerRingRef.current) {
      innerRingRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 1.5;
    }
  });

  return (
    <group ref={ringRef} position={[-32, 0.44, -18]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <mesh ref={outerRingRef}>
        <ringGeometry args={[0.55, 0.65, 32]} />
        <meshBasicMaterial color="#62d1a2" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={innerRingRef}>
        <ringGeometry args={[0.3, 0.42, 32]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.18, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export interface VRControllerManagerProps {
  viewTarget?: [number, number, number];
  floorY?: number;
  activeViewId?: string;
  referenceSpaceType?: XRReferenceSpaceType;
}

/**
 * Автономный менеджер VR-контроллеров и перемещения (HTC Vive / OpenXR / Quest):
 * - Работает 100% оффлайн без загрузки моделей контроллеров с внешних CDN.
 * - Поддерживает как тачпад HTC Vive Wand (axes[0..1]), так и стики (axes[2..3]).
 * - Безопасно работает при 0, 1 или 2 контроллерах без падений при null pose.
 * - Сохраняет высоту уровня глаз 1.65 м (в т.ч. при фолбэке на local referenceSpace).
 */
export default function VRControllerManager({
  viewTarget,
  floorY = 0.4,
  activeViewId,
  referenceSpaceType = 'local-floor',
}: VRControllerManagerProps) {
  const playerRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);
  const controllerMeshRefs = useRef<(THREE.Group | null)[]>([null, null]);
  const rayMeshRefs = useRef<(THREE.Mesh | null)[]>([null, null]);

  const { gl } = useThree();
  const { session } = useXR();

  const rightSnapLatchRef = useRef(false);
  const prevTriggerPressedRef = useRef<Record<string, boolean>>({});
  const prevRayHitRef = useRef<boolean[]>([false, false]);
  const effectiveRefSpaceRef = useRef<XRReferenceSpaceType>(referenceSpaceType);
  const lastAimRef = useRef<{ valid: boolean; x: number; z: number }>({
    valid: false,
    x: -32,
    z: -18,
  });

  useEffect(() => {
    effectiveRefSpaceRef.current = referenceSpaceType;
  }, [referenceSpaceType]);

  // Вычисление базовой высоты XROrigin с учётом роста 1.65 м при работе в пространстве 'local'
  const resolveOriginY = (targetFloorY: number): number => {
    const safeFloor = Number.isFinite(targetFloorY) ? targetFloorY : 0.4;
    return effectiveRefSpaceRef.current === 'local' ? safeFloor + EYE_HEIGHT : safeFloor;
  };

  // Перенос VR Rig (<XROrigin>) при смене ракурса в UI без лишних срабатываний при перерисовке ссылок
  const targetX = viewTarget?.[0];
  const targetY = viewTarget?.[1];
  const targetZ = viewTarget?.[2];
  const lastTargetKey = useRef<string>('');
  useEffect(() => {
    if (targetX !== undefined && targetY !== undefined && targetZ !== undefined && playerRef.current) {
      const safeFloor = Number.isFinite(floorY) ? floorY : 0.4;
      const key = `${targetX}:${targetY}:${targetZ}:${safeFloor}:${referenceSpaceType}`;
      if (key !== lastTargetKey.current) {
        lastTargetKey.current = key;
        playerRef.current.position.set(targetX, resolveOriginY(safeFloor), targetZ);
        playerRef.current.updateMatrixWorld(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetX, targetY, targetZ, floorY, referenceSpaceType]);

  // Слушатели старта/завершения сессии WebXR
  useEffect(() => {
    const handleXRStart = (e: Event) => {
      const customEvent = e as CustomEvent<{
        spawn?: [number, number, number];
        referenceSpaceType?: XRReferenceSpaceType;
      }>;
      if (customEvent.detail?.referenceSpaceType) {
        effectiveRefSpaceRef.current = customEvent.detail.referenceSpaceType;
      }
      const spawn = customEvent.detail?.spawn;
      if (playerRef.current) {
        const sx = spawn ? spawn[0] : -32;
        const sy = spawn ? spawn[1] : floorY;
        const sz = spawn ? spawn[2] : -18;
        const safeFloor = Number.isFinite(sy) ? sy : Number.isFinite(floorY) ? floorY : 0.4;
        playerRef.current.position.set(sx, resolveOriginY(safeFloor), sz);
        playerRef.current.rotation.set(0, 0, 0);
        playerRef.current.updateMatrixWorld(true);
      }
    };

    const handleXREnd = () => {
      prevTriggerPressedRef.current = {};
      rightSnapLatchRef.current = false;
      prevRayHitRef.current[0] = false;
      prevRayHitRef.current[1] = false;
      if (ringRef.current) {
        ringRef.current.visible = false;
      }
      for (let i = 0; i < MAX_CONTROLLERS; i++) {
        const ctrl = controllerMeshRefs.current[i];
        const ray = rayMeshRefs.current[i];
        if (ctrl) ctrl.visible = false;
        if (ray) ray.visible = false;
      }
    };

    window.addEventListener('webxr-session-start', handleXRStart);
    window.addEventListener('webxr-session-end', handleXREnd);
    return () => {
      window.removeEventListener('webxr-session-start', handleXRStart);
      window.removeEventListener('webxr-session-end', handleXREnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorY]);

  // Начальная позиция при входе в сессию и сброс визуалов при выходе (ключуем по примитивам, чтобы не дёргать при ре-рендере)
  useEffect(() => {
    if (session) {
      if (playerRef.current) {
        const isWalkable =
          Boolean(activeViewId) &&
          (activeViewId!.startsWith('walk') || activeViewId!.includes('reactor'));
        const spawnX = isWalkable && targetX !== undefined ? targetX : -32;
        const safeFloor = isWalkable && Number.isFinite(floorY) ? floorY : 0.4;
        const spawnZ = isWalkable && targetZ !== undefined ? targetZ : -18;

        playerRef.current.position.set(spawnX, resolveOriginY(safeFloor), spawnZ);
        playerRef.current.updateMatrixWorld(true);
      }
    } else {
      if (ringRef.current) ringRef.current.visible = false;
      lastAimRef.current.valid = false;
      for (let i = 0; i < MAX_CONTROLLERS; i++) {
        const ctrl = controllerMeshRefs.current[i];
        const ray = rayMeshRefs.current[i];
        if (ctrl) ctrl.visible = false;
        if (ray) ray.visible = false;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, targetX, targetZ, floorY, activeViewId]);

  // Прямое чтение inputSources (HTC Vive тачпады/стики, курки, лучи) без исключений при отсутствии контроллеров
  useFrame((_, delta, frame) => {
    const xrManager = gl.xr;
    if (!xrManager || !xrManager.isPresenting || !playerRef.current) {
      return;
    }

    let xrSession: XRSession | null = null;
    try {
      xrSession = xrManager.getSession();
    } catch {
      return;
    }
    if (!xrSession) return;

    const dt = Math.min(delta, 0.05);
    const player = playerRef.current;
    const activeFloorY = Number.isFinite(floorY) ? floorY : 0.4;

    // Если шлем снят или открыт системный оверлей SteamVR (visible-blurred / hidden), не двигаем игрока
    const isInputVisible = xrSession.visibilityState === undefined || xrSession.visibilityState === 'visible';

    let xrCam: THREE.Camera | null = null;
    let refSpace: XRReferenceSpace | null = null;
    try {
      xrCam = xrManager.getCamera();
      refSpace = xrManager.getReferenceSpace();
    } catch {
      xrCam = null;
      refSpace = null;
    }

    let anyAimValid = false;
    let visualSlot = 0;

    for (let i = 0; i < MAX_CONTROLLERS; i++) {
      const ctrl = controllerMeshRefs.current[i];
      const ray = rayMeshRefs.current[i];
      if (ctrl) ctrl.visible = false;
      if (ray) ray.visible = false;
    }

    let playerMoved = false;
    const inputSources = xrSession.inputSources;
    for (let srcIdx = 0; srcIdx < inputSources.length; srcIdx++) {
      const source = inputSources[srcIdx];
      if (!source) continue;

      const gp = source.gamepad;
      const hand = source.handedness || 'none';
      const sourceKey = `${hand}:${srcIdx}`;

      // 1. Считывание тачпада (HTC Vive Wand axes[0..1]) или стика (OpenXR / Quest axes[2..3])
      if (isInputVisible && gp && gp.axes && gp.axes.length >= 2) {
        const primaryMag = Math.hypot(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
        const secondaryMag =
          gp.axes.length >= 4 ? Math.hypot(gp.axes[2] ?? 0, gp.axes[3] ?? 0) : 0;
        const useStickPair = gp.axes.length >= 4 && secondaryMag >= primaryMag;
        const sx = useStickPair ? (gp.axes[2] ?? 0) : (gp.axes[0] ?? 0);
        const sy = useStickPair ? (gp.axes[3] ?? 0) : (gp.axes[1] ?? 0);

        // На Vive Wand поворот и ходьба: левый (или единственный) контроллер — движение; правый — Snap Turn
        const canMoveWithThisHand = hand === 'left' || (hand === 'none' && srcIdx === 0);
        if (canMoveWithThisHand && Math.hypot(sx, sy) > 0.16 && xrCam) {
          xrCam.getWorldDirection(_camForward);
          _camForward.y = 0;
          if (_camForward.lengthSq() > 1e-6) {
            _camForward.normalize();
          } else {
            _camForward.set(0, 0, -1);
          }
          _camRight.crossVectors(_camForward, _up).normalize();

          const moveSpeed = 5.5;
          player.position.addScaledVector(_camForward, -sy * moveSpeed * dt);
          player.position.addScaledVector(_camRight, sx * moveSpeed * dt);
          playerMoved = true;
        }

        if (hand === 'right') {
          if (Math.abs(sx) > 0.62) {
            if (!rightSnapLatchRef.current) {
              player.rotation.y -= Math.sign(sx) * (Math.PI / 6);
              playerMoved = true;
              rightSnapLatchRef.current = true;
            }
          } else if (Math.abs(sx) < 0.25) {
            rightSnapLatchRef.current = false;
          }
        }
      }

      if (playerMoved) {
        player.updateMatrixWorld();
        playerMoved = false;
      }

      // 2. Позиционирование процедурной модели контроллера и луча телепортации
      if (frame && refSpace && source.targetRaySpace) {
        let pose: XRPose | undefined;
        try {
          pose = frame.getPose(source.targetRaySpace, refSpace);
        } catch {
          pose = undefined;
        }

        if (pose) {
          _rayOrigin
            .set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z)
            .applyMatrix4(player.matrixWorld);
          _poseQuat.set(
            pose.transform.orientation.x,
            pose.transform.orientation.y,
            pose.transform.orientation.z,
            pose.transform.orientation.w
          );
          _rayDir
            .set(0, 0, -1)
            .applyQuaternion(_poseQuat)
            .transformDirection(player.matrixWorld)
            .normalize();

          // Отображение процедурной рукоятки контроллера (без CDN)
          if (visualSlot < MAX_CONTROLLERS) {
            const ctrlGroup = controllerMeshRefs.current[visualSlot];
            const rayMesh = rayMeshRefs.current[visualSlot];

            if (ctrlGroup) {
              if (source.gripSpace) {
                try {
                  const gripPose = frame.getPose(source.gripSpace, refSpace);
                  if (gripPose) {
                    _gripPos
                      .set(
                        gripPose.transform.position.x,
                        gripPose.transform.position.y,
                        gripPose.transform.position.z
                      )
                      .applyMatrix4(player.matrixWorld);
                    _gripQuat.set(
                      gripPose.transform.orientation.x,
                      gripPose.transform.orientation.y,
                      gripPose.transform.orientation.z,
                      gripPose.transform.orientation.w
                    );
                    ctrlGroup.position.copy(_gripPos);
                    ctrlGroup.quaternion.copy(player.quaternion).multiply(_gripQuat);
                    ctrlGroup.visible = true;
                  }
                } catch {
                  // Безопасно пропускаем, если gripSpace временно недоступен
                }
              }
              if (!ctrlGroup.visible) {
                ctrlGroup.position.copy(_rayOrigin);
                ctrlGroup.quaternion.copy(player.quaternion).multiply(_poseQuat);
                ctrlGroup.visible = true;
              }
            }

            _groundPlane.set(_up, -activeFloorY);
            _ray.set(_rayOrigin, _rayDir);

            let rayLength = 10;
            let hitValidFloor = false;
            if (isInputVisible && _ray.intersectPlane(_groundPlane, _hitPoint)) {
              const dist = _hitPoint.distanceTo(_rayOrigin);
              if (dist > 0.5 && dist < 120) {
                rayLength = dist;
                hitValidFloor = true;
                const targetX = THREE.MathUtils.clamp(_hitPoint.x, -114, 114);
                const targetZ = THREE.MathUtils.clamp(_hitPoint.z, -114, 114);

                anyAimValid = true;
                lastAimRef.current = { valid: true, x: targetX, z: targetZ };

                if (ringRef.current) {
                  ringRef.current.position.set(targetX, activeFloorY + 0.04, targetZ);
                  ringRef.current.visible = true;
                }

                const triggerPressed = Boolean(gp?.buttons?.[0]?.pressed);
                const prevPressed = prevTriggerPressedRef.current[sourceKey] ?? false;
                if (triggerPressed && !prevPressed) {
                  player.position.set(targetX, resolveOriginY(activeFloorY), targetZ);
                  player.updateMatrixWorld(true);
                }
                prevTriggerPressedRef.current[sourceKey] = triggerPressed;
              }
            }

            if (rayMesh) {
              _beamMid.copy(_rayOrigin).addScaledVector(_rayDir, rayLength * 0.5);
              _beamQuat.setFromUnitVectors(_zNeg, _rayDir);
              rayMesh.position.copy(_beamMid);
              rayMesh.quaternion.copy(_beamQuat);
              rayMesh.scale.set(1, 1, rayLength);
              if (prevRayHitRef.current[visualSlot] !== hitValidFloor) {
                prevRayHitRef.current[visualSlot] = hitValidFloor;
                const mat = rayMesh.material;
                if (mat instanceof THREE.MeshBasicMaterial) {
                  mat.color.setHex(hitValidFloor ? 0x34d399 : 0x38bdf8);
                }
              }
              rayMesh.visible = true;
            }

            visualSlot++;
            continue;
          }
        }
      }

      if (gp) {
        prevTriggerPressedRef.current[sourceKey] = Boolean(gp.buttons?.[0]?.pressed);
      }
    }

    if (!anyAimValid && ringRef.current) {
      ringRef.current.visible = false;
      lastAimRef.current.valid = false;
    }

    // Фиксация уровня пола и безопасных границ площадки (уровень глаз 1.65 м сохраняется)
    player.position.x = THREE.MathUtils.clamp(player.position.x, -115, 115);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -115, 115);
    player.position.y = resolveOriginY(activeFloorY);
  });

  return (
    <>
      <XROrigin ref={playerRef as RefObject<THREE.Group>} position={[-32, 0.4, -18]} />
      <VRTeleportRing ringRef={ringRef} />

      {/* Процедурные автономные модели контроллеров и лазерные лучи (без загрузки с CDN) */}
      {[0, 1].map((slot) => (
        <group key={`vr-ctrl-slot-${slot}`}>
          <group
            ref={(el) => {
              controllerMeshRefs.current[slot] = el;
            }}
            visible={false}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.018, 0.022, 0.14, 12]} />
              <meshStandardMaterial color="#2a323d" roughness={0.45} metalness={0.55} />
            </mesh>
            <mesh position={[0, 0.012, -0.065]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.042, 0.008, 8, 20]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
          <mesh
            ref={(el) => {
              rayMeshRefs.current[slot] = el;
            }}
            visible={false}
          >
            <boxGeometry args={[0.004, 0.004, 1]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.72} />
          </mesh>
        </group>
      ))}
    </>
  );
}
