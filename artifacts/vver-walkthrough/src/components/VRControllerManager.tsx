import { useRef, useEffect, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { XROrigin, useXR } from '@react-three/xr';
import * as THREE from 'three';

const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _poseQuat = new THREE.Quaternion();
const _ray = new THREE.Ray();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hitPoint = new THREE.Vector3();

/** Кольцо целеуказания телепорта на поверхности площадки Y = 0 (обновляется напрямую без setState) */
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
    <group ref={ringRef} position={[64, 0.04, -18]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
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
}

export default function VRControllerManager({
  viewTarget,
  floorY = 0,
  activeViewId,
}: VRControllerManagerProps) {
  const playerRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const { session } = useXR();

  const rightSnapLatchRef = useRef(false);
  const prevTriggerPressedRef = useRef<Record<string, boolean>>({});
  const lastAimRef = useRef<{ valid: boolean; x: number; z: number }>({
    valid: false,
    x: 64,
    z: -18,
  });

  // Перенос VR Rig (<XROrigin>) при смене ракурса в UI без сбивания трекинга шлема
  const lastTargetKey = useRef<string>('');
  useEffect(() => {
    if (viewTarget && playerRef.current) {
      const key = `${viewTarget[0]}:${viewTarget[1]}:${viewTarget[2]}:${floorY}`;
      if (key !== lastTargetKey.current) {
        lastTargetKey.current = key;
        const baseY = Number.isFinite(floorY) ? floorY : 0.4;
        playerRef.current.position.set(viewTarget[0], baseY, viewTarget[2]);
        playerRef.current.updateMatrixWorld(true);
      }
    }
  }, [viewTarget, floorY]);

  // Слушатели старта сессии WebXR и телепортации от TeleportTarget
  useEffect(() => {
    const handleXRStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ spawn?: [number, number, number] }>;
      const spawn = customEvent.detail?.spawn || [64, 0, -18];
      if (playerRef.current) {
        const spawnY = spawn[1] > 1 ? spawn[1] : 0;
        playerRef.current.position.set(spawn[0], spawnY, spawn[2]);
        playerRef.current.rotation.set(0, 0, 0);
        playerRef.current.updateMatrixWorld(true);
      }
    };

    const handleTeleportTo = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y?: number; z: number }>;
      if (!playerRef.current || !customEvent.detail) return;
      const nx = THREE.MathUtils.clamp(customEvent.detail.x, -114, 114);
      const nz = THREE.MathUtils.clamp(customEvent.detail.z, -114, 114);
      const ny = floorY > 1 ? floorY : 0;
      playerRef.current.position.set(nx, ny, nz);
      playerRef.current.updateMatrixWorld(true);
    };

    window.addEventListener('webxr-session-start', handleXRStart);
    window.addEventListener('vr-teleport-to', handleTeleportTo);
    return () => {
      window.removeEventListener('webxr-session-start', handleXRStart);
      window.removeEventListener('vr-teleport-to', handleTeleportTo);
    };
  }, [floorY]);

  // Начальная позиция при входе в сессию и сброс кольца при выходе
  useEffect(() => {
    if (session) {
      if (playerRef.current) {
        const isWalk = activeViewId && activeViewId.startsWith('walk');
        const defaultSpawn: [number, number, number] = [-32, 0.4, -18];
        const spawnX = isWalk && viewTarget ? viewTarget[0] : defaultSpawn[0];
        const spawnY = isWalk && Number.isFinite(floorY) ? floorY : 0.4;
        const spawnZ = isWalk && viewTarget ? viewTarget[2] : defaultSpawn[2];

        playerRef.current.position.set(spawnX, spawnY, spawnZ);
        playerRef.current.updateMatrixWorld(true);
      }
    } else if (ringRef.current) {
      ringRef.current.visible = false;
      lastAimRef.current.valid = false;
    }
  }, [session, viewTarget, floorY, activeViewId]);

  // Прямое чтение inputSource.gamepad.axes и триггер-телепортация на текущую отметку пола
  useFrame((_, delta, frame) => {
    const xrSession = gl.xr?.getSession();
    if (!xrSession || !gl.xr.isPresenting || !playerRef.current) {
      return;
    }

    const dt = Math.min(delta, 0.05);
    const player = playerRef.current;
    const xrCam = gl.xr.getCamera();
    const refSpace = gl.xr.getReferenceSpace();
    const activeFloorY = Number.isFinite(floorY) ? floorY : 0.4;

    let anyAimValid = false;

    for (const source of xrSession.inputSources) {
      const gp = source.gamepad;
      const hand = source.handedness || 'none';

      // 1. Считывание стиков контроллеров WebXR
      if (gp && gp.axes && gp.axes.length >= 2) {
        const useStickPair =
          gp.axes.length >= 4 &&
          (Math.abs(gp.axes[2] ?? 0) > 0.02 || Math.abs(gp.axes[3] ?? 0) > 0.02);
        const sx = useStickPair ? (gp.axes[2] ?? 0) : (gp.axes[0] ?? 0);
        const sy = useStickPair ? (gp.axes[3] ?? 0) : (gp.axes[1] ?? 0);

        // Левый стик: плавное горизонтальное перемещение (X, Z) относительно направления взгляда камеры
        if (hand === 'left' && Math.hypot(sx, sy) > 0.15) {
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
        }

        // Правый стик: дискретный поворот (Snap Turn на 30°) вокруг вертикальной оси Y
        if (hand === 'right') {
          if (Math.abs(sx) > 0.6) {
            if (!rightSnapLatchRef.current) {
              player.rotation.y -= Math.sign(sx) * (Math.PI / 6);
              player.updateMatrixWorld(true);
              rightSnapLatchRef.current = true;
            }
          } else if (Math.abs(sx) < 0.25) {
            rightSnapLatchRef.current = false;
          }
        }
      }

      // 2. Луч и кнопка курка (trigger) для телепортации на поверхность площадки (Y = 0)
      if (frame && refSpace && source.targetRaySpace) {
        const pose = frame.getPose(source.targetRaySpace, refSpace);
        if (pose) {
          player.updateMatrixWorld(true);
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

          _groundPlane.set(_up, -activeFloorY);
          _ray.set(_rayOrigin, _rayDir);

          if (_ray.intersectPlane(_groundPlane, _hitPoint)) {
            const dist = _hitPoint.distanceTo(_rayOrigin);
            if (dist > 0.5 && dist < 120) {
              const targetX = THREE.MathUtils.clamp(_hitPoint.x, -114, 114);
              const targetZ = THREE.MathUtils.clamp(_hitPoint.z, -114, 114);

              anyAimValid = true;
              lastAimRef.current = { valid: true, x: targetX, z: targetZ };

              if (ringRef.current) {
                ringRef.current.position.set(targetX, activeFloorY + 0.04, targetZ);
                ringRef.current.visible = true;
              }

              const triggerPressed = Boolean(gp?.buttons?.[0]?.pressed);
              const prevPressed = prevTriggerPressedRef.current[hand] ?? false;
              if (triggerPressed && !prevPressed) {
                player.position.set(targetX, activeFloorY, targetZ);
                player.updateMatrixWorld(true);
              }
              prevTriggerPressedRef.current[hand] = triggerPressed;
              continue;
            }
          }
        }
      }

      if (gp) {
        prevTriggerPressedRef.current[hand] = Boolean(gp.buttons?.[0]?.pressed);
      }
    }

    if (!anyAimValid && ringRef.current) {
      ringRef.current.visible = false;
      lastAimRef.current.valid = false;
    }

    // Фиксация высоты пола (Y = 0) и свободное перемещение без блокирующих коллизий со стенами
    player.position.x = THREE.MathUtils.clamp(player.position.x, -115, 115);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -115, 115);
    player.position.y = activeFloorY;
  });

  return (
    <>
      <XROrigin ref={playerRef as RefObject<THREE.Group>} position={[-32, 0.4, -18]} />
      <VRTeleportRing ringRef={ringRef} />
    </>
  );
}
