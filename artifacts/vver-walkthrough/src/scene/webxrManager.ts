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
  /** Отметка пола помещения в метрах (+13.20м для БЩУ ВВЭР-1000 в левом вспомогательном корпусе) */
  floorY?: number;
  /** Идентификатор текущего ракурса */
  activeViewId?: string;
}

export default function WebXRSceneManager({
  activeSpawnPos = [-32.0, 14.80, 1.8],
  floorY = 13.20,
  activeViewId,
}: WebXRSceneManagerProps) {
  const { gl, scene, camera } = useThree();
  const currentSpawnRef = useRef<[number, number, number]>(activeSpawnPos);
  const currentFloorYRef = useRef<number>(floorY);
  const xrRigGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    currentSpawnRef.current = activeSpawnPos;
    currentFloorYRef.current = floorY;
  }, [activeSpawnPos, floorY]);

  useEffect(() => {
    // ------------------------------------------------------------------------
    // 1. Флаги рендерера и камеры (XR Readiness)
    // ------------------------------------------------------------------------
    if (gl.xr) {
      gl.xr.enabled = true;
    }

    // Явный цвет фона сцены для предотвращения черного экрана WebXR (согласован с природным туманом степи)
    const bgColor = new THREE.Color('#d4c5a9');
    scene.background = bgColor;
    gl.setClearColor(bgColor, 1.0);

    // Плоскости отсечения камеры
    camera.near = 0.1;
    camera.far = 1000;
    camera.updateProjectionMatrix();

    // ------------------------------------------------------------------------
    // 2. Глобальное освещение для VR (добавляется напрямую в scene)
    // ------------------------------------------------------------------------
    const existingAmbient = scene.getObjectByName('VR_Global_AmbientLight');
    if (!existingAmbient) {
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
      ambientLight.name = 'VR_Global_AmbientLight';
      scene.add(ambientLight);
    }

    const existingDir = scene.getObjectByName('VR_Global_KeyLight');
    if (!existingDir) {
      const dirLight = new THREE.DirectionalLight(0xfffaee, 2.2);
      dirLight.name = 'VR_Global_KeyLight';
      dirLight.position.set(40, 80, 50);
      scene.add(dirLight);
    }

    // ------------------------------------------------------------------------
    // 3. Группа XR-камеры (XR Rig / Player Base)
    // ------------------------------------------------------------------------
    let xrRigGroup = scene.getObjectByName('xrRigGroup') as THREE.Group | null;
    if (!xrRigGroup) {
      xrRigGroup = new THREE.Group();
      xrRigGroup.name = 'xrRigGroup';
      scene.add(xrRigGroup);
    }
    xrRigGroupRef.current = xrRigGroup;

    // Помещаем камеру внутрь xrRigGroup
    if (camera.parent !== xrRigGroup) {
      xrRigGroup.add(camera);
    }

    // ------------------------------------------------------------------------
    // 4. Обработчики изменения размера окна (window.resize для Electron и Web)
    // ------------------------------------------------------------------------
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (width > 0 && height > 0) {
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
        gl.setSize(width, height);
        gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      }
    };
    window.addEventListener('resize', handleResize);
    // Принудительная инициализация размеров холста и камеры при старте в Electron
    handleResize();

    // ------------------------------------------------------------------------
    // 5. Обработчики сессии WebXR (sessionstart / sessionend)
    // ------------------------------------------------------------------------
    const onSessionStart = () => {
      // При запуске VR-сессии выставляем корректные плоскости отсечения (0.1м - 1000м)
      camera.near = 0.1;
      camera.far = 1000;
      camera.updateProjectionMatrix();

      // Также обновляем XR-камеру шлема для обоих глаз
      if (gl.xr) {
        const xrCamera = gl.xr.getCamera();
        if (xrCamera) {
          xrCamera.near = 0.1;
          xrCamera.far = 1000;
          xrCamera.updateProjectionMatrix();
          xrCamera.cameras?.forEach((eyeCam) => {
            eyeCam.near = 0.1;
            eyeCam.far = 1000;
            eyeCam.updateProjectionMatrix();
          });
        }
      }

      // Принудительно перемещаем корневую группу игрока в фиксированную стартовую точку:
      // внутрь Main Control Room / БЩУ ВВЭР-1000 в левом вспомогательном корпусе (отметка пола +13.20м, X=-32.0, Z=1.8)
      // или в активный walk-ракурс
      const isWalk = activeViewId && activeViewId.startsWith('walk');
      const spawnX = isWalk && currentSpawnRef.current ? currentSpawnRef.current[0] : -32.0;
      const spawnY = isWalk && currentFloorYRef.current !== undefined ? currentFloorYRef.current : 13.20;
      const spawnZ = isWalk && currentSpawnRef.current ? currentSpawnRef.current[2] : 1.8;

      if (xrRigGroupRef.current) {
        xrRigGroupRef.current.position.set(spawnX, spawnY, spawnZ);
        xrRigGroupRef.current.updateMatrixWorld(true);
      }

      // Оповещаем XROrigin / VRControllerManager о старте VR с фиксированными координатами
      try {
        window.dispatchEvent(new CustomEvent('webxr-session-start', {
          detail: { spawn: [spawnX, spawnY, spawnZ] }
        }));
      } catch {
        // Safe fallback
      }
    };

    const onSessionEnd = () => {
      if (xrRigGroupRef.current) {
        xrRigGroupRef.current.position.set(0, 0, 0);
        xrRigGroupRef.current.updateMatrixWorld(true);
      }

      // Оповещаем UI о завершении сессии VR для восстановления 2D-оверлеев
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

    // ------------------------------------------------------------------------
    // 6. Переключение на setAnimationLoop для WebXR и Electron
    // ------------------------------------------------------------------------
    // Главный цикл обновления кадров через renderer.setAnimationLoop
    const animate = (_timestamp: number, _frame?: XRFrame) => {
      // Вызов renderer.render(scene, camera) происходит на каждом кадре
      // вне зависимости от того, активна ли сессия VR
      gl.render(scene, camera);
    };

    gl.setAnimationLoop(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gl.xr) {
        gl.xr.removeEventListener('sessionstart', onSessionStart);
        gl.xr.removeEventListener('sessionend', onSessionEnd);
      }
      gl.setAnimationLoop(null);
    };
  }, [gl, scene, camera]);

  // Динамическое обновление позиции XR Rig при переключении ракурса
  useEffect(() => {
    if (gl.xr?.isPresenting && xrRigGroupRef.current) {
      const spawn = activeSpawnPos;
      const targetY = floorY !== undefined ? floorY : (spawn[1] <= 2 ? 0.0 : spawn[1] - 1.6);
      xrRigGroupRef.current.position.set(spawn[0], targetY, spawn[2]);
      xrRigGroupRef.current.updateMatrixWorld(true);
    }
  }, [activeSpawnPos, floorY, activeViewId, gl.xr?.isPresenting]);

  return null;
}
