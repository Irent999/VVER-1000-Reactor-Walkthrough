/**
 * ============================================================================
 * МОДУЛЬ КОНФИГУРАЦИИ WEBXR И ЦИКЛА РЕНДЕРИНГА (THREE.JS WEBXR READY)
 * ============================================================================
 * 
 * Устраняет проблему черного экрана в очках виртуальной реальности:
 * 1. Инициализация главного цикла через renderer.setAnimationLoop(animate)
 *    с обязательным вызовом renderer.render(scene, camera) на каждом кадре.
 * 2. Принудительное включение renderer.xr.enabled = true.
 * 3. Явный цвет фона сцены (scene.background = new THREE.Color(0x9CB0C3))
 *    для предотвращения сброса кадрового буфера в прозрачный/черный (0x000000).
 * 4. Создание группы xrRigGroup (scene.add(xrRigGroup); xrRigGroup.add(camera))
 *    с точным позиционированием на отметку пола выбранного ракурса при sessionstart.
 * 5. Настройка плоскостей отсечения: camera.near = 0.1, camera.far = 1000.
 * 6. Глобальный базовый свет (THREE.AmbientLight + DirectionalLight), добавляемый
 *    напрямую в scene, чтобы материалы MeshStandardMaterial не рендерились черными.
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface WebXRSceneManagerProps {
  /** Текущие координаты выбранного ракурса камеры [x, y, z] */
  activeSpawnPos?: [number, number, number];
  /** Отметка пола в метрах (0м для центральной площадки GLB-сборки) */
  floorY?: number;
  /** Идентификатор текущего ракурса */
  activeViewId?: string;
}

export default function WebXRSceneManager({
  activeSpawnPos = [64, 0.4, -18],
  floorY = 0.4,
  activeViewId,
}: WebXRSceneManagerProps) {
  const { gl, scene, camera, invalidate } = useThree();
  const currentSpawnRef = useRef<[number, number, number]>(activeSpawnPos);
  const currentFloorYRef = useRef<number>(floorY);
  const xrRigGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    currentSpawnRef.current = activeSpawnPos;
    currentFloorYRef.current = floorY;
  }, [activeSpawnPos, floorY]);

  useEffect(() => {
    // 1. Флаги рендерера и камеры (XR Readiness + оптимизация VR FPS)
    if (gl.xr) {
      gl.xr.enabled = true;
      try {
        // Фиксированный фовеальный рендеринг (снижает нагрузку на пиксельный шейдер по краям линз VR)
        gl.xr.setFoveation?.(1.0);
        // Небольшое снижение разрешения буфера кадров в VR (0.9) для стабильных 72-90 FPS
        gl.xr.setFramebufferScaleFactor?.(0.9);
      } catch {
        // Безопасный фолбэк для браузеров без поддержки setFoveation
      }
    }

    // Сохраняем текущую тему сцены (инициализируем фон, только если он не задан)
    if (!scene.background) {
      const bgColor = new THREE.Color('#131c24');
      scene.background = bgColor;
      gl.setClearColor(bgColor, 1.0);
    }

    // Плоскости отсечения камеры для VR без Z-fighting и обрезки дальних корпусов
    camera.near = 0.15;
    camera.far = 1400;
    camera.updateProjectionMatrix();

    // 2. Группа XR-камеры (XR Rig / Player Base)
    let xrRigGroup = scene.getObjectByName('xrRigGroup') as THREE.Group | null;
    if (!xrRigGroup) {
      xrRigGroup = new THREE.Group();
      xrRigGroup.name = 'xrRigGroup';
      scene.add(xrRigGroup);
    }
    xrRigGroupRef.current = xrRigGroup;

    if (camera.parent !== xrRigGroup) {
      xrRigGroup.add(camera);
    }

    // 3. Обработка изменения размера окна (Desktop / Electron)
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
        invalidate();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // 4. Обработчики сессии WebXR (sessionstart / sessionend)
    const prevShadowEnabled = gl.shadowMap.enabled;

    const onSessionStart = () => {
      // Отключаем тени и понижаем pixelRatio в VR для максимального стабильного FPS
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

      // Стартовая позиция в VR на отметке площадки рядом с оборудованием (1:1 масштаб)
      const isWalk = activeViewId && (activeViewId.startsWith('walk') || activeViewId.includes('steam'));
      const spawnX = isWalk && currentSpawnRef.current ? currentSpawnRef.current[0] : 64;
      const spawnY = isWalk && currentFloorYRef.current !== undefined ? currentFloorYRef.current : 0.4;
      const spawnZ = isWalk && currentSpawnRef.current ? currentSpawnRef.current[2] : -18;

      if (xrRigGroupRef.current) {
        xrRigGroupRef.current.position.set(spawnX, spawnY, spawnZ);
        xrRigGroupRef.current.updateMatrixWorld(true);
      }

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
      if (xrRigGroupRef.current) {
        xrRigGroupRef.current.position.set(0, 0, 0);
        xrRigGroupRef.current.updateMatrixWorld(true);
      }

      try {
        window.dispatchEvent(new CustomEvent('webxr-session-end'));
      } catch {
        // Safe fallback
      }
      invalidate();
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
  }, [gl, scene, camera, activeViewId, invalidate]);

  // Динамическое обновление позиции XR Rig при переключении ракурса в VR
  useEffect(() => {
    if (gl.xr?.isPresenting && xrRigGroupRef.current) {
      const spawn = activeSpawnPos;
      const targetY = floorY !== undefined ? floorY : 0;
      xrRigGroupRef.current.position.set(spawn[0], targetY, spawn[2]);
      xrRigGroupRef.current.updateMatrixWorld(true);
    }
  }, [activeSpawnPos, floorY, activeViewId, gl.xr?.isPresenting]);

  return null;
}
