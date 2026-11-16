import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import type { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { EYE_HEIGHT } from '@/scene/constants';

interface FirstPersonControllerProps {
  onLockChange: (locked: boolean) => void;
  spawnPosition: [number, number, number];
  lookAtTarget?: [number, number, number];
  freeGroundY?: number;
}

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _moveDir = new THREE.Vector3();
const _dragEuler = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * Контроллер режима «Прогулка 1:1» на десктопе:
 * - Поворот головы мышью через PointerLockControls (клик по 3D-холсту) + фолбэк перетаскиванием.
 * - Свободная ходьба на клавиши WASD / стрелки (+ Shift ускорение) на уровне глаз Y = floorY + 1.65 м.
 * - Без блокирующих коллизий со стенами/Box3 assembly.glb — можно свободно входить в здания и обходить реактор.
 */
export default function FirstPersonController({
  onLockChange,
  spawnPosition,
  lookAtTarget,
  freeGroundY = 0,
}: FirstPersonControllerProps) {
  const { camera, gl } = useThree();

  const plcRef = useRef<PointerLockControlsImpl | null>(null);
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const isPointerDown = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const floorHeightRef = useRef<number>(freeGroundY);

  const targetKey = lookAtTarget ? `${lookAtTarget[0]}:${lookAtTarget[1]}:${lookAtTarget[2]}` : '';
  const spawnKey = `${spawnPosition[0]}:${spawnPosition[1]}:${spawnPosition[2]}:${freeGroundY}:${targetKey}`;

  // Мгновенная установка камеры на стартовую точку уровня глаз Y = floorY + 1.65 м
  useEffect(() => {
    const baseFloor = Number.isFinite(freeGroundY) ? freeGroundY : 0;
    floorHeightRef.current = baseFloor;

    const eyeY = baseFloor + EYE_HEIGHT;
    camera.position.set(spawnPosition[0], eyeY, spawnPosition[2]);
    velocity.current.set(0, 0, 0);

    if (lookAtTarget) {
      camera.lookAt(lookAtTarget[0], lookAtTarget[1], lookAtTarget[2]);
    } else {
      camera.lookAt(0, eyeY, 0);
    }

    // Нормализуем порядок углов YXZ для корректной работы PointerLockControls без наклона горизонта
    _dragEuler.setFromQuaternion(camera.quaternion, 'YXZ');
    _dragEuler.z = 0;
    camera.quaternion.setFromEuler(_dragEuler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, spawnKey]);

  // Клавиатура WASD / Стрелки / Shift
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';

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

    const onBlur = () => {
      keys.current = {};
      isPointerDown.current = false;
    };

    const onRestoreFocus = () => {
      keys.current = {};
      isPointerDown.current = false;
      canvas.focus();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('restore-camera-focus', onRestoreFocus);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('restore-camera-focus', onRestoreFocus);
    };
  }, [gl]);

  // Фолбэк обзора перетаскиванием мыши, если PointerLock не активен (например, внутри песочницы/iframe)
  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 || e.button === 2) {
        isPointerDown.current = true;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        canvas.focus();
      }
    };

    const onPointerUp = () => {
      isPointerDown.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas || plcRef.current?.isLocked) {
        return;
      }
      if (!isPointerDown.current) return;

      const dx = e.clientX - lastPointerPos.current.x;
      const dy = e.clientY - lastPointerPos.current.y;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };

      if (Math.abs(dx) > 120 || Math.abs(dy) > 120) return;

      _dragEuler.setFromQuaternion(camera.quaternion, 'YXZ');
      _dragEuler.y -= dx * 0.0028;
      _dragEuler.x = THREE.MathUtils.clamp(_dragEuler.x - dy * 0.0028, -Math.PI / 2 + 0.06, Math.PI / 2 - 0.06);
      _dragEuler.z = 0;
      camera.quaternion.setFromEuler(_dragEuler);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('mousemove', onMouseMove);
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
      onLockChange(false);
    };
  }, [gl, camera, onLockChange]);

  // Свободное перемещение WASD + стрелки по горизонтальной плоскости с фиксацией Y = floorY + 1.65 м
  useFrame((_, delta) => {
    if (gl.xr?.isPresenting) return;

    const frameDt = Math.min(delta, 0.05);
    const k = keys.current;
    const isSprinting = k['ShiftLeft'] || k['ShiftRight'];
    const moveSpeed = isSprinting ? 12.0 : 5.2;

    camera.getWorldDirection(_forward);
    _forward.y = 0;
    if (_forward.lengthSq() > 1e-6) {
      _forward.normalize();
    } else {
      _forward.set(0, 0, -1);
    }
    _right.crossVectors(_forward, _up).normalize();

    _moveDir.set(0, 0, 0);
    if (k['KeyW'] || k['ArrowUp']) _moveDir.add(_forward);
    if (k['KeyS'] || k['ArrowDown']) _moveDir.sub(_forward);
    if (k['KeyA'] || k['ArrowLeft']) _moveDir.sub(_right);
    if (k['KeyD'] || k['ArrowRight']) _moveDir.add(_right);

    if (_moveDir.lengthSq() > 0) {
      _moveDir.normalize().multiplyScalar(moveSpeed);
    }

    const damping = _moveDir.lengthSq() > 0 ? 18 : 22;
    velocity.current.x = THREE.MathUtils.damp(velocity.current.x, _moveDir.x, damping, frameDt);
    velocity.current.z = THREE.MathUtils.damp(velocity.current.z, _moveDir.z, damping, frameDt);

    const nextX = THREE.MathUtils.clamp(camera.position.x + velocity.current.x * frameDt, -115, 115);
    const nextZ = THREE.MathUtils.clamp(camera.position.z + velocity.current.z * frameDt, -115, 115);

    camera.position.x = nextX;
    camera.position.z = nextZ;
    camera.position.y = floorHeightRef.current + EYE_HEIGHT;
  });

  return (
    <PointerLockControls
      ref={plcRef}
      makeDefault
      selector="#vver-canvas-wrapper canvas"
      onLock={() => onLockChange(true)}
      onUnlock={() => onLockChange(false)}
    />
  );
}
