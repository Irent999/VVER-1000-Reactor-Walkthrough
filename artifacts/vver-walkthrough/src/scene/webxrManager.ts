/**
 * ============================================================================
 * МОДУЛЬ КОНФИГУРАЦИИ WEBXR И РЕНДЕРИНГА
 * ============================================================================
 *
 * Настраивает gl.xr.enabled = true, фовеальный рендеринг, плоскости отсечения
 * камеры (near/far) и события жизненного цикла сессии WebXR без перехвата
 * родительского узла камеры у <XROrigin>.
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface WebXRSceneManagerProps {
  /** Текущие координаты выбранного ракурса камеры [x, y, z] */
  activeSpawnPos?: [number, number, number];
  /** Отметка пола в метрах (0м для площадки) */
  floorY?: number;
  /** Идентификатор текущего ракурса */
  activeViewId?: string;
}

export default function WebXRSceneManager({
  activeSpawnPos = [64, 0, -18],
  floorY = 0,
  activeViewId,
}: WebXRSceneManagerProps) {
  const { gl, scene, camera } = useThree();
  const currentSpawnRef = useRef<[number, number, number]>(activeSpawnPos);
  const currentFloorYRef = useRef<number>(floorY);

  useEffect(() => {
    currentSpawnRef.current = activeSpawnPos;
    currentFloorYRef.current = floorY;
  }, [activeSpawnPos, floorY]);

  useEffect(() => {
    if (gl.xr) {
      gl.xr.enabled = true;
      try {
        gl.xr.setFoveation?.(1.0);
        gl.xr.setFramebufferScaleFactor?.(0.9);
      } catch {
        // Безопасный фолбэк для браузеров без поддержки setFoveation
      }
    }

    if (!scene.background) {
      const bgColor = new THREE.Color('#131c24');
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
        gl.setSize(width, height);
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const prevShadowEnabled = gl.shadowMap.enabled;

    const onSessionStart = () => {
      gl.shadowMap.enabled = false;
      gl.setPixelRatio(1);

      camera.near = 0.15;
      camera.far = 1400;
      camera.updateProjectionMatrix();

      if (gl.xr) {
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
          // Safe fallback
        }
      }

      const isWalk =
        activeViewId && (activeViewId.startsWith('walk') || activeViewId.includes('steam'));
      const spawnX = isWalk && currentSpawnRef.current ? currentSpawnRef.current[0] : 64;
      const spawnY = isWalk && currentFloorYRef.current !== undefined ? currentFloorYRef.current : 0;
      const spawnZ = isWalk && currentSpawnRef.current ? currentSpawnRef.current[2] : -18;

      try {
        window.dispatchEvent(
          new CustomEvent('webxr-session-start', {
            detail: { spawn: [spawnX, spawnY, spawnZ] },
          })
        );
      } catch {
        // Safe fallback
      }
    };

    const onSessionEnd = () => {
      gl.shadowMap.enabled = prevShadowEnabled;
      gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

      try {
        window.dispatchEvent(new CustomEvent('webxr-session-end'));
      } catch {
        // Safe fallback
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
  }, [gl, scene, camera, activeViewId]);

  return null;
}
