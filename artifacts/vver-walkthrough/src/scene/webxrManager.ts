/**
 * ============================================================================
 * МОДУЛЬ КОНФИГУРАЦИИ WEBXR И ЖИЗНЕННОГО ЦИКЛА РЕНДЕРА
 * ============================================================================
 *
 * - Поддерживает gl.xr.enabled = true до старта, во время и после sessionend
 *   (компенсирует сброс флага внутри @react-three/fiber).
 * - Настраивает referenceSpaceType ('local-floor' с безопасным фолбэком 'local').
 * - Сохраняет и восстанавливает позу десктопной камеры на sessionstart / sessionend.
 * - Обрабатывает visibilitychange (внутри XR-сессии и на уровне документа),
 *   а также webglcontextlost / webglcontextrestored без падений.
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface WebXRSceneManagerProps {
  /** Текущие координаты выбранного ракурса/спавна [x, y, z] */
  activeSpawnPos?: [number, number, number];
  /** Отметка пола в метрах */
  floorY?: number;
  /** Идентификатор текущего ракурса */
  activeViewId?: string;
  /** Предпочтительный тип пространства отсчёта WebXR */
  referenceSpaceType?: XRReferenceSpaceType;
}

export default function WebXRSceneManager({
  activeSpawnPos = [-32, 0.4, -18],
  floorY = 0.4,
  activeViewId,
  referenceSpaceType = 'local-floor',
}: WebXRSceneManagerProps) {
  const { gl, scene, camera, invalidate } = useThree();

  const currentSpawnRef = useRef<[number, number, number]>(activeSpawnPos);
  const currentFloorYRef = useRef<number>(floorY);
  const currentViewIdRef = useRef<string | undefined>(activeViewId);
  const currentRefSpaceRef = useRef<XRReferenceSpaceType>(referenceSpaceType);

  // Снимок десктопной камеры до входа в VR для аккуратного возврата на sessionend
  const savedCameraPoseRef = useRef<{
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    near: number;
    far: number;
    captured: boolean;
  }>({
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    near: 0.15,
    far: 1400,
    captured: false,
  });

  useEffect(() => {
    currentSpawnRef.current = activeSpawnPos;
    currentFloorYRef.current = Number.isFinite(floorY) ? floorY : 0.4;
    currentViewIdRef.current = activeViewId;
    currentRefSpaceRef.current = referenceSpaceType;
    if (gl.xr && !gl.xr.isPresenting) {
      try {
        gl.xr.setReferenceSpaceType(referenceSpaceType);
      } catch {
        // Игнорируем ошибку установки неподдерживаемого referenceSpaceType до старта сессии
      }
    }
  }, [gl, activeSpawnPos, floorY, activeViewId, referenceSpaceType]);

  useEffect(() => {
    const desktopShadowsRef = { enabled: gl.shadowMap.enabled };
    let activeSessionRef: XRSession | null = null;

    if (gl.xr) {
      gl.xr.enabled = true;
      try {
        gl.xr.setReferenceSpaceType(currentRefSpaceRef.current);
        gl.xr.setFoveation?.(1.0);
      } catch {
        // Безопасный фолбэк при отсутствии поддержки foveation
      }
    }

    if (!scene.background) {
      const bgColor = new THREE.Color('#dce8f2');
      scene.background = bgColor;
      gl.setClearColor(bgColor, 1.0);
    }

    camera.near = 0.15;
    camera.far = 1400;
    camera.updateProjectionMatrix();

    const handleResize = () => {
      if (gl.xr?.isPresenting) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width > 0 && height > 0) {
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
        gl.setSize(width, height, false);
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Обработчик смены видимости внутри активной WebXR-сессии (снятие шлема / оверлей SteamVR)
    const onXRVisibilityChange = () => {
      const state = activeSessionRef?.visibilityState ?? 'visible';
      window.dispatchEvent(
        new CustomEvent('webxr-visibility-change', { detail: { visibilityState: state } })
      );
    };

    const onDocumentVisibilityChange = () => {
      if (!document.hidden && !gl.xr?.isPresenting) {
        handleResize();
        invalidate();
      }
    };
    document.addEventListener('visibilitychange', onDocumentVisibilityChange);

    // Обработчики потери и восстановления WebGL-контекста с безопасным возвратом в Desktop-режим
    const canvasEl = gl.domElement;
    const onWebGLContextLost = (e: Event) => {
      e.preventDefault();
      if (activeSessionRef) {
        try {
          void activeSessionRef.end().catch(() => undefined);
        } catch {
          // Игнорируем ошибку закрытия при потере контекста
        }
      }
      window.dispatchEvent(new CustomEvent('webxr-context-lost'));
    };

    const onWebGLContextRestored = () => {
      gl.localClippingEnabled = true;
      if (gl.xr) {
        gl.xr.enabled = true;
        try {
          gl.xr.setReferenceSpaceType(currentRefSpaceRef.current);
        } catch {
          // Игнорируем ошибку referenceSpaceType
        }
      }
      handleResize();
      invalidate();
      window.dispatchEvent(new CustomEvent('webxr-context-restored'));
    };

    canvasEl.addEventListener('webglcontextlost', onWebGLContextLost);
    canvasEl.addEventListener('webglcontextrestored', onWebGLContextRestored);

    const onSessionStart = () => {
      // Сохраняем текущую позу десктопной камеры до переключения в стерео-режим
      savedCameraPoseRef.current.position.copy(camera.position);
      savedCameraPoseRef.current.quaternion.copy(camera.quaternion);
      savedCameraPoseRef.current.near = camera.near;
      savedCameraPoseRef.current.far = camera.far;
      savedCameraPoseRef.current.captured = true;

      desktopShadowsRef.enabled = gl.shadowMap.enabled;
      gl.shadowMap.enabled = false;

      if (gl.xr) {
        gl.xr.enabled = true;
        try {
          activeSessionRef = gl.xr.getSession();
          activeSessionRef?.addEventListener('visibilitychange', onXRVisibilityChange);
          gl.xr.setFoveation?.(1.0);
          const xrCamera = gl.xr.getCamera();
          if (xrCamera) {
            xrCamera.near = 0.15;
            xrCamera.far = 1400;
            xrCamera.updateProjectionMatrix();
            xrCamera.cameras?.forEach((eyeCam) => {
              eyeCam.near = 0.15;
              eyeCam.far = 1400;
              eyeCam.updateProjectionMatrix();
            });
          }
        } catch {
          // Безопасный фолбэк при нестандартной XR-камере
        }
      }

      const viewId = currentViewIdRef.current;
      const isWalkable =
        Boolean(viewId) &&
        (viewId!.startsWith('walk') || viewId!.includes('steam') || viewId!.includes('reactor'));
      const spawnCandidate = currentSpawnRef.current;
      const safeFloorY = Number.isFinite(currentFloorYRef.current) ? currentFloorYRef.current : 0.4;
      const spawnX = isWalkable && spawnCandidate ? spawnCandidate[0] : -32;
      const spawnY = isWalkable ? safeFloorY : 0.4;
      const spawnZ = isWalkable && spawnCandidate ? spawnCandidate[2] : -18;

      let activeRefSpaceType: XRReferenceSpaceType = currentRefSpaceRef.current;
      try {
        const refSpace = gl.xr?.getReferenceSpace();
        if (!refSpace && activeRefSpaceType !== 'local') {
          activeRefSpaceType = 'local';
        }
      } catch {
        activeRefSpaceType = 'local';
      }

      try {
        window.dispatchEvent(
          new CustomEvent('webxr-session-start', {
            detail: {
              spawn: [spawnX, spawnY, spawnZ] as [number, number, number],
              referenceSpaceType: activeRefSpaceType,
            },
          })
        );
      } catch {
        // Безопасный фолбэк
      }
    };

    const onSessionEnd = () => {
      if (activeSessionRef) {
        activeSessionRef.removeEventListener('visibilitychange', onXRVisibilityChange);
        activeSessionRef = null;
      }

      gl.shadowMap.enabled = desktopShadowsRef.enabled;

      // Возвращаем gl.xr.enabled = true после внутреннего обработчика @react-three/fiber
      const keepXrEnabled = () => {
        if (gl.xr) {
          gl.xr.enabled = true;
        }
      };
      keepXrEnabled();
      queueMicrotask(keepXrEnabled);

      // Восстанавливаем исходную десктопную камеру и её плоскости отсечения
      if (savedCameraPoseRef.current.captured) {
        camera.position.copy(savedCameraPoseRef.current.position);
        camera.quaternion.copy(savedCameraPoseRef.current.quaternion);
        camera.near = savedCameraPoseRef.current.near;
        camera.far = savedCameraPoseRef.current.far;
        camera.updateProjectionMatrix();
        savedCameraPoseRef.current.captured = false;
      }

      handleResize();
      invalidate();

      try {
        window.dispatchEvent(new CustomEvent('webxr-session-end'));
      } catch {
        // Безопасный фолбэк
      }
    };

    if (gl.xr) {
      gl.xr.addEventListener('sessionstart', onSessionStart);
      gl.xr.addEventListener('sessionend', onSessionEnd);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', onDocumentVisibilityChange);
      canvasEl.removeEventListener('webglcontextlost', onWebGLContextLost);
      canvasEl.removeEventListener('webglcontextrestored', onWebGLContextRestored);
      if (activeSessionRef) {
        activeSessionRef.removeEventListener('visibilitychange', onXRVisibilityChange);
        activeSessionRef = null;
      }
      if (gl.xr) {
        gl.xr.removeEventListener('sessionstart', onSessionStart);
        gl.xr.removeEventListener('sessionend', onSessionEnd);
      }
    };
  }, [gl, scene, camera, invalidate]);

  return null;
}
