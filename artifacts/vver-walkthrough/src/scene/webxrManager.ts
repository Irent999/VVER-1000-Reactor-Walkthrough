/**
 * ============================================================================
 * МОДУЛЬ КОНФИГУРАЦИИ WEBXR И РЕНДЕРИНГА (HTC VIVE / STEAMVR / OPENXR)
 * ============================================================================
 *
 * - Гарантирует gl.xr.enabled = true до старта, во время и после завершения
 *   VR-сессии (компенсирует сброс флага в @react-three/fiber на sessionend).
 * - Настраивает referenceSpaceType ('local-floor' с безопасным фолбэком 'local').
 * - Синхронизирует ближнюю/дальнюю плоскости отсечения XR-камеры и стереопары.
 * - Корректно восстанавливает размер, pixelRatio, тени и Desktop-режим при
 *   выходе из шлема или ошибке WebXR.
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface WebXRSceneManagerProps {
  /** Текущие координаты выбранного ракурса/спавна [x, y, z] */
  activeSpawnPos?: [number, number, number];
  /** Отметка пола в метрах (0.40 м для площадки, 0.62 м / 14.41 м / 19.71 м для залов) */
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
  const { gl, scene, camera } = useThree();

  const currentSpawnRef = useRef<[number, number, number]>(activeSpawnPos);
  const currentFloorYRef = useRef<number>(floorY);
  const currentViewIdRef = useRef<string | undefined>(activeViewId);
  const currentRefSpaceRef = useRef<XRReferenceSpaceType>(referenceSpaceType);

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

    if (gl.xr) {
      gl.xr.enabled = true;
      try {
        gl.xr.setReferenceSpaceType(currentRefSpaceRef.current);
        gl.xr.setFoveation?.(1.0);
      } catch {
        // Безопасный фолбэк для браузеров/драйверов без поддержки setFoveation
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

    const onSessionStart = () => {
      desktopShadowsRef.enabled = gl.shadowMap.enabled;
      gl.shadowMap.enabled = false;

      if (gl.xr) {
        gl.xr.enabled = true;
        try {
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

      // Проверяем фактически полученное пространство отсчёта (local-floor или фолбэк local)
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
        // Игнорируем ошибку диспатча в изолированных окружениях
      }
    };

    const onSessionEnd = () => {
      gl.shadowMap.enabled = desktopShadowsRef.enabled;

      // Восстанавливаем gl.xr.enabled = true после внутреннего обработчика @react-three/fiber
      const keepXrEnabled = () => {
        if (gl.xr) {
          gl.xr.enabled = true;
        }
      };
      keepXrEnabled();
      queueMicrotask(keepXrEnabled);

      handleResize();

      try {
        window.dispatchEvent(new CustomEvent('webxr-session-end'));
      } catch {
        // Игнорируем ошибку диспатча
      }
    };

    if (gl.xr) {
      gl.xr.addEventListener('sessionstart', onSessionStart);
      gl.xr.addEventListener('sessionend', onSessionEnd);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gl.xr) {
        gl.xr.removeEventListener('sessionstart', onSessionStart);
        gl.xr.removeEventListener('sessionend', onSessionEnd);
      }
    };
  }, [gl, scene, camera]);

  return null;
}
