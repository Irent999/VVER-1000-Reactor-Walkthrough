import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EYE_HEIGHT } from '@/scene/constants';
import { getFloorHeightAt } from '@/scene/floorDetection';
import { globalPhysicsWorld } from '@/scene/physicsWorld';

import {
  collectCadWalkData,
  resolveCadHorizontalStep,
  sampleCadFloorHeight,
  type CadWalkCollisionData,
} from '@/scene/cadWalkPhysics';

interface FirstPersonControllerProps {
  targetFloor: number | null;
  onArrived: () => void;
  onLockChange: (locked: boolean) => void;
  spawnPosition: [number, number, number];
  lookAtTarget?: [number, number, number];
  freeGroundY?: number;
}

const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _targetMove = new THREE.Vector3();

export default function FirstPersonController({
  targetFloor,
  onArrived,
  onLockChange,
  spawnPosition,
  lookAtTarget,
  freeGroundY,
}: FirstPersonControllerProps) {
  const { camera, gl, scene, invalidate } = useThree();

  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const currentFloorY = useRef(spawnPosition[1] - EYE_HEIGHT);

  // Smooth rotation & pointer lock state
  const isLocked = useRef(false);
  const isPointerDown = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const currentYaw = useRef(0);
  const currentPitch = useRef(0);
  const isFirstFrameAfterLock = useRef(true);

  // Elevator transition state
  const transitioning = useRef(false);
  const transitionTarget = useRef<number | null>(null);
  const transitionStart = useRef(0);
  const transitionDuration = 1.4;

  // Кэш поверхностей CAD-сборки для рейкаста полов, мостиков обслуживания и стен
  const cadDataRef = useRef<CadWalkCollisionData>({
    rootFound: false,
    floorMeshes: [],
    wallMeshes: [],
    heavyBoxes: [],
  });
  const lastCadRefresh = useRef(0);

  // Smooth transition glide when switching walk zones
  const walkGlideActive = useRef(false);
  const walkGlideStart = useRef(0);
  const walkGlideDuration = 0.85;
  const walkGlideStartPos = useRef(new THREE.Vector3());
  const walkGlideEndPos = useRef(new THREE.Vector3());
  const walkGlideStartYaw = useRef(0);
  const walkGlideStartPitch = useRef(0);
  const walkGlideEndYaw = useRef(0);
  const walkGlideEndPitch = useRef(0);

  // Sync camera spawn position & initialize target orientation with smooth glide
  const targetKey = lookAtTarget ? `${lookAtTarget[0]}:${lookAtTarget[1]}:${lookAtTarget[2]}` : '';
  const spawnKey = `${spawnPosition[0]}:${spawnPosition[1]}:${spawnPosition[2]}:${targetKey}`;
  useEffect(() => {
    currentFloorY.current = freeGroundY !== undefined ? freeGroundY : spawnPosition[1] - EYE_HEIGHT;
    velocity.current.set(0, 0, 0);
    globalPhysicsWorld.teleportPlayer(spawnPosition[0], currentFloorY.current, spawnPosition[2]);

    // Initial look direction: towards lookAtTarget if provided, otherwise towards scene center
    let lookAngle = 0;
    let pitchAngle = -0.05;
    if (lookAtTarget) {
      const dx = lookAtTarget[0] - spawnPosition[0];
      const dz = lookAtTarget[2] - spawnPosition[2];
      const dy = lookAtTarget[1] - spawnPosition[1];
      lookAngle = Math.atan2(-dx, -dz);
      const horizontalDist = Math.hypot(dx, dz);
      pitchAngle = Math.atan2(dy, horizontalDist);
    } else {
      lookAngle = Math.atan2(-spawnPosition[0], -spawnPosition[2]);
    }

    const startEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    walkGlideStartPos.current.copy(camera.position);
    walkGlideEndPos.current.set(spawnPosition[0], spawnPosition[1], spawnPosition[2]);
    walkGlideStartYaw.current = startEuler.y;
    walkGlideStartPitch.current = startEuler.x;
    walkGlideEndYaw.current = lookAngle;
    walkGlideEndPitch.current = pitchAngle;
    walkGlideStart.current = performance.now();
    walkGlideActive.current = true;
    invalidate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, spawnKey]);

  // Request pointer lock without camera jumping
  const requestLock = useCallback(() => {
    const canvas = gl.domElement;
    if (document.pointerLockElement !== canvas) {
      try {
        canvas.requestPointerLock();
      } catch {
        // Fallback for user gesture activation
      }
    }
  }, [gl]);

  // Keyboard inputs for WASD movement with auto focus safety
  useEffect(() => {
    const canvas = gl.domElement;

    const isInputFocused = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      keys.current[e.code] = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const onWindowBlur = () => {
      keys.current = {};
      isPointerDown.current = false;
    };

    const onRestoreFocus = () => {
      keys.current = {};
      isPointerDown.current = false;
      if (document.activeElement instanceof HTMLElement && document.activeElement !== canvas) {
        document.activeElement.blur();
      }
      canvas.tabIndex = 0;
      canvas.focus();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('restore-camera-focus', onRestoreFocus);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('restore-camera-focus', onRestoreFocus);
    };
  }, [gl]);

  // Pointer lock change and mouse movement handlers with smoothing and drag-to-look fallback
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      isLocked.current = locked;
      onLockChange(locked);

      if (locked) {
        // Initialize rotation to current camera orientation to eliminate jumping
        const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        targetYaw.current = euler.y;
        currentYaw.current = euler.y;
        targetPitch.current = euler.x;
        currentPitch.current = euler.x;
        isFirstFrameAfterLock.current = true;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      // 1. If Pointer Lock is active: use movementX/Y
      if (isLocked.current) {
        if (isFirstFrameAfterLock.current) {
          isFirstFrameAfterLock.current = false;
          return;
        }
        if (Math.abs(e.movementX) > 120 || Math.abs(e.movementY) > 120) {
          return;
        }

        const sensitivity = 0.0022;
        targetYaw.current -= e.movementX * sensitivity;
        targetPitch.current -= e.movementY * sensitivity;

        const maxPitch = Math.PI / 2 - 0.08;
        targetPitch.current = Math.max(-maxPitch, Math.min(maxPitch, targetPitch.current));
        return;
      }

      // 2. If Pointer Lock is NOT active, but mouse button is dragged on canvas: allow immediate look!
      if (isPointerDown.current) {
        const dx = e.clientX - lastPointerPos.current.x;
        const dy = e.clientY - lastPointerPos.current.y;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };

        if (Math.abs(dx) > 120 || Math.abs(dy) > 120) return;

        const sensitivity = 0.003;
        targetYaw.current -= dx * sensitivity;
        targetPitch.current -= dy * sensitivity;

        const maxPitch = Math.PI / 2 - 0.08;
        targetPitch.current = Math.max(-maxPitch, Math.min(maxPitch, targetPitch.current));
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 || e.button === 2) {
        isPointerDown.current = true;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        if (document.activeElement instanceof HTMLElement && document.activeElement !== canvas) {
          document.activeElement.blur();
        }
        canvas.focus();
      }
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
    };

    const onCanvasClick = () => {
      canvas.focus();
      requestLock();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && isLocked.current) {
        document.exitPointerLock();
      }
    };

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('request-pointer-lock', requestLock);

    // Bind any element marked with click-to-walk
    const lockAnchor = document.getElementById('lock-anchor');
    if (lockAnchor) {
      lockAnchor.addEventListener('click', requestLock);
    }

    return () => {
      canvas.removeEventListener('click', onCanvasClick);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('request-pointer-lock', requestLock);
      if (lockAnchor) {
        lockAnchor.removeEventListener('click', requestLock);
      }
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
      onLockChange(false);
    };
  }, [gl, camera, onLockChange, requestLock]);

  // Handle instant elevator transitions
  useEffect(() => {
    if (targetFloor !== null) {
      if (Math.abs(currentFloorY.current - targetFloor) > 0.5) {
        transitionTarget.current = targetFloor;
        transitionStart.current = performance.now();
        transitioning.current = true;
      }
    }
  }, [targetFloor]);

  // Сбор и кэширование мешей CAD-модели (выполняется однократно после загрузки GLB)
  const ensureCadWalkData = useCallback(() => {
    const now = performance.now();
    if (!cadDataRef.current.rootFound && now - lastCadRefresh.current > 800) {
      lastCadRefresh.current = now;
      cadDataRef.current = collectCadWalkData(scene);
    }
  }, [scene]);

  useFrame((_, dt) => {
    const frameDt = Math.min(dt, 0.05);

    // 0. Smooth glide when switching walk zones from navigation menu
    if (walkGlideActive.current) {
      const elapsed = (performance.now() - walkGlideStart.current) / 1000;
      const p = Math.min(1, elapsed / walkGlideDuration);
      const ease = p * p * (3 - 2 * p);

      camera.position.lerpVectors(walkGlideStartPos.current, walkGlideEndPos.current, ease);

      // Shortest-angle yaw interpolation
      let deltaYaw = walkGlideEndYaw.current - walkGlideStartYaw.current;
      while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
      while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
      const yaw = walkGlideStartYaw.current + deltaYaw * ease;
      const pitch = THREE.MathUtils.lerp(walkGlideStartPitch.current, walkGlideEndPitch.current, ease);

      targetYaw.current = yaw;
      currentYaw.current = yaw;
      targetPitch.current = pitch;
      currentPitch.current = pitch;
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitch, yaw, 0);
      invalidate();

      if (p >= 1) {
        walkGlideActive.current = false;
      }
      return;
    }

    // 1. Smooth camera rotation damping (eliminates mouse stutter & jerking)
    const dampFactor = 28;
    currentYaw.current = THREE.MathUtils.damp(currentYaw.current, targetYaw.current, dampFactor, frameDt);
    currentPitch.current = THREE.MathUtils.damp(currentPitch.current, targetPitch.current, dampFactor, frameDt);

    camera.rotation.order = 'YXZ';
    camera.rotation.set(currentPitch.current, currentYaw.current, 0);

    // 2. Elevator transition interpolation
    if (transitioning.current && transitionTarget.current !== null) {
      const elapsed = (performance.now() - transitionStart.current) / 1000;
      const t = Math.min(elapsed / transitionDuration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const startY = currentFloorY.current;
      const targetY = transitionTarget.current;
      const newFloorY = startY + (targetY - startY) * eased;
      const eyeH = targetY >= 34.0 ? 1.8 : EYE_HEIGHT;
      camera.position.y = newFloorY + eyeH;

      if (t >= 1) {
        currentFloorY.current = targetY;
        camera.position.y = targetY + eyeH;
        transitioning.current = false;
        transitionTarget.current = null;
        globalPhysicsWorld.teleportPlayer(camera.position.x, targetY, camera.position.z);
        onArrived();
      }
      return;
    }

    // 3. WASD Movement in the horizontal plane with smooth acceleration & sliding physics
    const k = keys.current;
    const isSprinting = k['ShiftLeft'] || k['ShiftRight'];
    const baseSpeed = isSprinting ? 11.0 : 4.8; // Масштаб 1:1 — естественный шаг и быстрый обход 225м площадки

    camera.getWorldDirection(_dir);
    _dir.y = 0;
    _dir.normalize();
    _right.crossVectors(_dir, _up).normalize();

    _targetMove.set(0, 0, 0);
    if (k['KeyW'] || k['ArrowUp']) _targetMove.add(_dir);
    if (k['KeyS'] || k['ArrowDown']) _targetMove.sub(_dir);
    if (k['KeyA'] || k['ArrowLeft']) _targetMove.sub(_right);
    if (k['KeyD'] || k['ArrowRight']) _targetMove.add(_right);

    if (_targetMove.lengthSq() > 0) {
      _targetMove.normalize().multiplyScalar(baseSpeed);
    }

    // Fluid velocity damping: smooth ramp up and gentle stop without abrupt jarring
    const accelDamp = _targetMove.lengthSq() > 0 ? 18 : 22;
    velocity.current.x = THREE.MathUtils.damp(velocity.current.x, _targetMove.x, accelDamp, frameDt);
    velocity.current.z = THREE.MathUtils.damp(velocity.current.z, _targetMove.z, accelDamp, frameDt);

    const stepX = velocity.current.x * frameDt;
    const stepZ = velocity.current.z * frameDt;

    if (freeGroundY !== undefined) {
      ensureCadWalkData();
    }

    if (Math.abs(stepX) > 0.0001 || Math.abs(stepZ) > 0.0001) {
      if (freeGroundY !== undefined) {
        const nextPos = resolveCadHorizontalStep(
          camera.position.x,
          camera.position.z,
          currentFloorY.current,
          stepX,
          stepZ,
          cadDataRef.current
        );
        camera.position.x = nextPos.x;
        camera.position.z = nextPos.z;
      } else {
        const resolved = globalPhysicsWorld.step(
          velocity.current.x,
          velocity.current.z,
          frameDt,
          currentFloorY.current
        );
        camera.position.x = resolved.x;
        camera.position.z = resolved.z;
      }
    }

    // Invalidate frame if moving, turning or damping
    const isMoving =
      Math.abs(velocity.current.x) > 0.0001 ||
      Math.abs(velocity.current.z) > 0.0001 ||
      _targetMove.lengthSq() > 0 ||
      transitioning.current;
    const isRotating =
      Math.abs(currentYaw.current - targetYaw.current) > 0.0001 ||
      Math.abs(currentPitch.current - targetPitch.current) > 0.0001;

    if (isMoving || isRotating || isPointerDown.current) {
      invalidate();
    }

    // 4. Определение отметки пола/платформы/мостика и фиксация глаз инженера (Y = +1.65 м от пола)
    let detectedFloorY: number;
    if (freeGroundY !== undefined) {
      detectedFloorY = sampleCadFloorHeight(
        camera.position.x,
        camera.position.z,
        currentFloorY.current,
        freeGroundY,
        cadDataRef.current
      );
    } else {
      detectedFloorY = getFloorHeightAt(camera.position.x, camera.position.z, camera.position.y);
    }

    const targetEyeY = detectedFloorY + EYE_HEIGHT;
    const dy = targetEyeY - camera.position.y;

    if (Math.abs(dy) > 0.005) {
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetEyeY, 18, frameDt);
      invalidate();
    } else {
      camera.position.y = targetEyeY;
    }
    currentFloorY.current = detectedFloorY;

    // 5. Защита от провала ниже базовой плиты
    if (camera.position.y < -12.0) {
      camera.position.set(spawnPosition[0], spawnPosition[1], spawnPosition[2]);
      currentFloorY.current = freeGroundY !== undefined ? freeGroundY : spawnPosition[1] - EYE_HEIGHT;
      velocity.current.set(0, 0, 0);
      globalPhysicsWorld.teleportPlayer(spawnPosition[0], currentFloorY.current, spawnPosition[2]);
    }
  });

  return null;
}
