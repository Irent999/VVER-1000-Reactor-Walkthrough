import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import type { PointerLockControls as PLCImpl } from 'three-stdlib';
import * as THREE from 'three';
import { CORE_CATCHER, DECK, EYE_HEIGHT } from '@/scene/constants';
import { getFloorHeightAt, clampPlayerPosition } from '@/scene/floorDetection';

interface FirstPersonControllerProps {
  targetFloor: number | null;
  onArrived: () => void;
  onLockChange: (locked: boolean) => void;
  spawnPosition: [number, number, number];
}

export default function FirstPersonController({ targetFloor, onArrived, onLockChange, spawnPosition }: FirstPersonControllerProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<PLCImpl>(null);
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const currentFloorY = useRef(camera.position.y - EYE_HEIGHT);
  const transitioning = useRef(false);
  const transitionTarget = useRef<number | null>(null);
  const transitionStart = useRef(0);
  const transitionDuration = 1.5;
  const spawnKey = `${spawnPosition[0]}:${spawnPosition[1]}:${spawnPosition[2]}`;

  // Each walk mode starts inside the containment at a known safe location.
  // Camera Y is always the floor elevation plus the exact 1.6 m eye height.
  useEffect(() => {
    camera.position.set(spawnPosition[0], spawnPosition[1], spawnPosition[2]);
    currentFloorY.current = spawnPosition[1] - EYE_HEIGHT;
    velocity.current.set(0, 0, 0);
  // spawnKey intentionally represents the tuple and avoids unstable array deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, spawnKey]);

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

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const canvas = gl.domElement;
    const lockFromCanvas = () => controls.lock();
    const unlockFromEscape = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && controls.isLocked) {
        controls.unlock();
      }
    };
    const onLock = () => onLockChange(true);
    const onUnlock = () => onLockChange(false);

    canvas.addEventListener('click', lockFromCanvas);
    window.addEventListener('keydown', unlockFromEscape);
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);

    return () => {
      canvas.removeEventListener('click', lockFromCanvas);
      window.removeEventListener('keydown', unlockFromEscape);
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      if (controls.isLocked) controls.unlock();
      onLockChange(false);
    };
  }, [gl, onLockChange]);

  // Handle floor teleport requests
  useEffect(() => {
    if (targetFloor !== null) {
      transitionTarget.current = targetFloor;
      transitionStart.current = performance.now();
      transitioning.current = true;
    }
  }, [targetFloor]);

  useFrame((_, dt) => {
    // Smooth vertical transition (elevator)
    if (transitioning.current && transitionTarget.current !== null) {
      const elapsed = (performance.now() - transitionStart.current) / 1000;
      const t = Math.min(elapsed / transitionDuration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const startY = currentFloorY.current;
      const targetY = transitionTarget.current;
      const newY = startY + (targetY - startY) * eased;
      camera.position.y = newY + EYE_HEIGHT;

      if (t >= 1) {
        currentFloorY.current = targetY;
        transitioning.current = false;
        transitionTarget.current = null;
        onArrived();
      }
      return;
    }

    // WASD movement
    const k = keys.current;
    const speed = 4.2 * dt; // measured walking pace, in meters per second
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
      const newX = camera.position.x + velocity.current.x;
      const newZ = camera.position.z + velocity.current.z;
      let [clampedX, clampedZ] = clampPlayerPosition(newX, newZ);
      const level = currentFloorY.current;
      const holeRadius = level > 25
        ? DECK.upperHoleRadius
        : level > 5 && level < 25
          ? DECK.mainHoleRadius
          : level > -10 && level < 10
            ? CORE_CATCHER.openingRadius
            : 0;
      const radialDistance = Math.hypot(clampedX, clampedZ);
      if (holeRadius && radialDistance < holeRadius + 0.45) {
        const safeRadius = holeRadius + 0.45;
        const angle = radialDistance > 0.001 ? Math.atan2(clampedZ, clampedX) : Math.PI / 4;
        clampedX = Math.cos(angle) * safeRadius;
        clampedZ = Math.sin(angle) * safeRadius;
      }
      camera.position.x = clampedX;
      camera.position.z = clampedZ;
    }

    // Floor collision — snap eye to floor height + EYE_HEIGHT
    const floorSurface = getFloorHeightAt(camera.position.x, camera.position.z, currentFloorY.current + EYE_HEIGHT);
    const targetEyeY = floorSurface + EYE_HEIGHT;

    // Smooth vertical follow for stairs/ramps
    const dy = targetEyeY - camera.position.y;
    if (Math.abs(dy) > 0.01) {
      // Fast snap for small steps, smooth for larger transitions
      if (Math.abs(dy) < 0.3) {
        camera.position.y += dy * Math.min(dt * 10, 1);
      } else {
        camera.position.y += dy * Math.min(dt * 5, 1);
      }
    }
    camera.position.y = targetEyeY;
    currentFloorY.current = floorSurface;
  });

  return <PointerLockControls ref={controlsRef as never} selector="#lock-anchor" />;
}
