import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { EYE_HEIGHT } from '@/scene/constants';
import { getFloorHeightAt, resolvePlayerMovement } from '@/scene/floorDetection';

interface FirstPersonControllerProps {
  targetFloor: number | null;
  onArrived: () => void;
  onLockChange: (locked: boolean) => void;
  spawnPosition: [number, number, number];
}

export default function FirstPersonController({
  targetFloor,
  onArrived,
  onLockChange,
  spawnPosition,
}: FirstPersonControllerProps) {
  const { camera, gl, scene } = useThree();

  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const currentFloorY = useRef(spawnPosition[1] - EYE_HEIGHT);

  // Smooth rotation & pointer lock state
  const isLocked = useRef(false);
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

  // Reusable raycaster for floor detection
  const raycaster = useRef(new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0.05, 12));
  const floorCandidates = useRef<THREE.Mesh[]>([]);
  const lastCandidateRefresh = useRef(0);

  // Sync camera spawn position & initialize target orientation
  const spawnKey = `${spawnPosition[0]}:${spawnPosition[1]}:${spawnPosition[2]}`;
  useEffect(() => {
    camera.position.set(spawnPosition[0], spawnPosition[1], spawnPosition[2]);
    const eyeHeight = spawnPosition[1] >= 34.0 ? 1.8 : EYE_HEIGHT;
    currentFloorY.current = spawnPosition[1] - eyeHeight;
    velocity.current.set(0, 0, 0);

    // Initial look direction towards center
    const lookAngle = Math.atan2(-spawnPosition[0], -spawnPosition[2]);
    targetYaw.current = lookAngle;
    currentYaw.current = lookAngle;
    targetPitch.current = -0.05;
    currentPitch.current = -0.05;

    camera.rotation.order = 'YXZ';
    camera.rotation.set(-0.05, lookAngle, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, spawnKey]);

  // Keyboard inputs for WASD movement
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

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

  // Pointer lock change and mouse movement handlers with smoothing
  useEffect(() => {
    const canvas = gl.domElement;

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
      if (!isLocked.current) return;

      // Ignore synthetic warp deltas or anomalous spikes
      if (isFirstFrameAfterLock.current) {
        isFirstFrameAfterLock.current = false;
        return;
      }
      if (Math.abs(e.movementX) > 120 || Math.abs(e.movementY) > 120) {
        return;
      }

      // Smooth mouse sensitivity (0.002 rad per pixel)
      const sensitivity = 0.0022;
      targetYaw.current -= e.movementX * sensitivity;
      targetPitch.current -= e.movementY * sensitivity;

      // Vertical look pitch clamp (-85° to +85°)
      const maxPitch = Math.PI / 2 - 0.08;
      targetPitch.current = Math.max(-maxPitch, Math.min(maxPitch, targetPitch.current));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && isLocked.current) {
        document.exitPointerLock();
      }
    };

    canvas.addEventListener('click', requestLock);
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
      canvas.removeEventListener('click', requestLock);
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
        // 1. Explicitly prioritize tagged floor decks, slabs, and walkable colliders
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
          // Exclude moving polar crane girders, hook blocks, and handrail components from floor detection
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
    // 1. Smooth camera rotation damping (eliminates mouse stutter)
    if (isLocked.current) {
      const dampFactor = 26; // High responsiveness with smooth interpolation
      currentYaw.current = THREE.MathUtils.damp(currentYaw.current, targetYaw.current, dampFactor, dt);
      currentPitch.current = THREE.MathUtils.damp(currentPitch.current, targetPitch.current, dampFactor, dt);

      camera.rotation.order = 'YXZ';
      camera.rotation.set(currentPitch.current, currentYaw.current, 0);
    }

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
        onArrived();
      }
      return;
    }

    // 3. WASD Movement in the horizontal plane
    const k = keys.current;
    const speed = 4.4 * dt; // Realistic walking pace: ~4.4 m/s
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    velocity.current.set(0, 0, 0);
    if (k['KeyW'] || k['ArrowUp']) velocity.current.add(dir);
    if (k['KeyS'] || k['ArrowDown']) velocity.current.sub(dir);
    if (k['KeyA'] || k['ArrowLeft']) velocity.current.sub(right);
    if (k['KeyD'] || k['ArrowRight']) velocity.current.add(right);

    if (velocity.current.lengthSq() > 0) {
      velocity.current.normalize().multiplyScalar(speed);
      const [nextX, nextZ] = resolvePlayerMovement(
        camera.position.x,
        camera.position.z,
        velocity.current.x,
        velocity.current.z,
        currentFloorY.current
      );
      camera.position.x = nextX;
      camera.position.z = nextZ;
    }

    // 4. Raycasting Floor Detection: Support 1.8m eye level on Polar Crane Deck (+36m)
    const now = performance.now();
    if (now - lastCandidateRefresh.current > 2000 || floorCandidates.current.length === 0) {
      refreshFloorCandidates();
      lastCandidateRefresh.current = now;
    }

    let detectedFloorY = getFloorHeightAt(camera.position.x, camera.position.z, camera.position.y);

    // Cast downward ray from player position
    const origin = new THREE.Vector3(camera.position.x, camera.position.y + 0.3, camera.position.z);
    raycaster.current.set(origin, new THREE.Vector3(0, -1, 0));

    if (floorCandidates.current.length > 0) {
      const hits = raycaster.current.intersectObjects(floorCandidates.current, false);
      for (const hit of hits) {
        // Find valid floor hit below player eyes
        if (hit.point.y <= camera.position.y + 0.1 && hit.distance > 0.05) {
          // If within reasonable stair/floor step range of current level
          if (Math.abs(hit.point.y - currentFloorY.current) < 2.5) {
            detectedFloorY = hit.point.y;
            break;
          }
        }
      }
    }

    // Dynamic eye altitude: 1.8m on Polar Crane Deck (+36m level), 1.6m on other floors
    const eyeHeight = detectedFloorY >= 34.0 ? 1.8 : EYE_HEIGHT;
    const targetEyeY = detectedFloorY + eyeHeight;
    const dy = targetEyeY - camera.position.y;

    if (Math.abs(dy) > 0.005) {
      // Rapid follow for stairs and steps, smooth damping for terrain
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetEyeY, 20, dt);
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
    }
  });

  return null;
}
