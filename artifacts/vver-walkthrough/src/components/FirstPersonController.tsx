import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EYE_HEIGHT } from '@/scene/constants';
import { getFloorHeightAt } from '@/scene/floorDetection';
import { globalPhysicsWorld } from '@/scene/physicsWorld';

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
const _origin = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

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

  // Reusable raycaster for floor height detection
  const raycaster = useRef(new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0.05, 12));
  const floorCandidates = useRef<THREE.Mesh[]>([]);
  const lastCandidateRefresh = useRef(0);

  // Sync camera spawn position & initialize target orientation
  const targetKey = lookAtTarget ? `${lookAtTarget[0]}:${lookAtTarget[1]}:${lookAtTarget[2]}` : '';
  const spawnKey = `${spawnPosition[0]}:${spawnPosition[1]}:${spawnPosition[2]}:${targetKey}`;
  useEffect(() => {
    camera.position.set(spawnPosition[0], spawnPosition[1], spawnPosition[2]);
    const eyeHeight = spawnPosition[1] >= 34.0 ? 1.8 : EYE_HEIGHT;
    currentFloorY.current = spawnPosition[1] - eyeHeight;
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

    targetYaw.current = lookAngle;
    currentYaw.current = lookAngle;
    targetPitch.current = pitchAngle;
    currentPitch.current = pitchAngle;

    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitchAngle, lookAngle, 0);
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

  // Collect candidate floor meshes periodically for raycast performance
  const refreshFloorCandidates = useCallback(() => {
    const list: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && (obj.visible || obj.name.includes('Floor') || obj.name.includes('Deck'))) {
        const mesh = obj as THREE.Mesh;
        if (
          mesh.userData?.isFloor ||
          mesh.name === 'PolarCraneDeck' ||
          mesh.name === 'Level33Floor' ||
          mesh.name === 'PolarCraneDeckCollider' ||
          mesh.name.includes('Floor') ||
          mesh.name.includes('Deck')
        ) {
          list.unshift(mesh);
        } else if (
          mesh.receiveShadow ||
          mesh.geometry?.type?.includes('Extrude') ||
          mesh.geometry?.type?.includes('Plane') ||
          mesh.geometry?.type?.includes('Ring')
        ) {
          const pName = (mesh.parent?.name ?? '').toLowerCase();
          const mName = mesh.name.toLowerCase();
          if (!pName.includes('crane') && !mName.includes('rail') && !mName.includes('post') && !mName.includes('stiff')) {
            list.push(mesh);
          }
        }
      }
    });
    floorCandidates.current = list;
  }, [scene]);

  useFrame((_, dt) => {
    const frameDt = Math.min(dt, 0.05);

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
    const baseSpeed = isSprinting ? 7.2 : 4.4; // Realistic walking (~4.4 m/s) and brisk walk (~7.2 m/s)

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

    if (Math.abs(stepX) > 0.0001 || Math.abs(stepZ) > 0.0001) {
      if (freeGroundY !== undefined) {
        const nextX = camera.position.x + stepX;
        const nextZ = camera.position.z + stepZ;
        const dist = Math.hypot(nextX, nextZ);
        if (dist <= 90) {
          camera.position.x = nextX;
          camera.position.z = nextZ;
        } else {
          const clampScale = 90 / dist;
          camera.position.x = nextX * clampScale;
          camera.position.z = nextZ * clampScale;
        }
      } else {
        // Step Cannon-es rigid physics simulation to resolve physical collisions against walls, steam generators, MCPs, and primary circuit pipes
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

    // 4. Floor Height Detection
    if (freeGroundY !== undefined) {
      const targetEyeY = freeGroundY + EYE_HEIGHT;
      const dy = targetEyeY - camera.position.y;
      if (Math.abs(dy) > 0.005) {
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetEyeY, 22, frameDt);
      } else {
        camera.position.y = targetEyeY;
      }
      currentFloorY.current = freeGroundY;
      return;
    }

    const now = performance.now();
    if (now - lastCandidateRefresh.current > 2000 || floorCandidates.current.length === 0) {
      refreshFloorCandidates();
      lastCandidateRefresh.current = now;
    }

    let detectedFloorY = getFloorHeightAt(camera.position.x, camera.position.z, camera.position.y);

    // Cast downward ray from player position
    _origin.set(camera.position.x, camera.position.y + 0.3, camera.position.z);
    raycaster.current.set(_origin, _down);

    if (floorCandidates.current.length > 0) {
      const hits = raycaster.current.intersectObjects(floorCandidates.current, false);
      for (const hit of hits) {
        // Find valid floor hit below player eyes with horizontal surface normal
        if (hit.point.y <= camera.position.y + 0.1 && hit.distance > 0.05) {
          if (hit.face && hit.face.normal && hit.face.normal.y > 0.55) {
            if (Math.abs(hit.point.y - currentFloorY.current) < 2.5) {
              detectedFloorY = hit.point.y;
              break;
            }
          }
        }
      }
    }

    // Dynamic eye altitude: 1.8m on Polar Crane Deck (+36m level), 1.6m on other floors
    const eyeHeight = detectedFloorY >= 34.0 ? 1.8 : EYE_HEIGHT;
    const targetEyeY = detectedFloorY + eyeHeight;
    const dy = targetEyeY - camera.position.y;

    if (Math.abs(dy) > 0.005) {
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetEyeY, 22, frameDt);
    } else {
      camera.position.y = targetEyeY;
    }
    currentFloorY.current = camera.position.y - eyeHeight;

    // 5. Ground Raycasting & Teleport Reset:
    // If player Y drops below -12.0m, automatically reset camera to active level spawn point
    if (camera.position.y < -12.0) {
      camera.position.set(spawnPosition[0], spawnPosition[1], spawnPosition[2]);
      currentFloorY.current = spawnPosition[1] - EYE_HEIGHT;
      velocity.current.set(0, 0, 0);
      globalPhysicsWorld.teleportPlayer(spawnPosition[0], currentFloorY.current, spawnPosition[2]);
    }
  });

  return null;
}
