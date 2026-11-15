import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { XR, createXRStore, VRButton, TeleportTarget } from '@react-three/xr';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OCImpl } from 'three-stdlib';

import GlbAssemblyModel, { type GlbLoadState } from '@/components/GlbAssemblyModel';
import LowPolyEnvironment from '@/components/LowPolyEnvironment';
import VRControllerManager from '@/components/VRControllerManager';
import DroneFlyByController, { type DroneWaymark } from '@/components/DroneFlyByController';
import FirstPersonController from '@/components/FirstPersonController';
import UIOverlay from '@/components/UIOverlay';
import VisualizationModeManager, { type RenderVisualizationMode } from '@/components/VisualizationModeManager';
import WebXRSceneManager from '@/scene/webxrManager';
import { FLOOR_VIEWS, type ViewMode } from '@/data/poiData';
import { validateAndAdjustCameraLineOfSight } from '@/scene/cameraLineOfSightModule';

const xrStore = createXRStore({
  controller: { teleportPointer: true, rayPointer: true },
  offerSession: true,
});

/**
 * Высокопроизводительный контроллер камеры:
 * 1. Интеграция в анимационный цикл useFrame (исключает лаги от ре-рендеров React)
 * 2. Плавное сглаживание движений OrbitControls (enableDamping = true, dampingFactor = 0.05)
 * 3. Бесшовные кинематографические перелеты между ракурсами
 */
interface SmoothCameraControllerProps {
  cameraPos: [number, number, number];
  lookAt: [number, number, number];
  mode: ViewMode;
  viewId?: string;
  onTransitionEnd?: () => void;
  onMovingChange?: (moving: boolean) => void;
}

/** Менеджер рендеринга по требованию (frameloop="demand"): рендер только при действиях пользователя/дрона/VR */
function DemandRenderBridge({ active }: { active: boolean }) {
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
  }, [active, invalidate]);

  useFrame(() => {
    if (active) {
      invalidate();
    }
  });

  return null;
}

function SmoothCameraController({
  cameraPos,
  lookAt,
  mode,
  viewId,
  onTransitionEnd,
  onMovingChange,
}: SmoothCameraControllerProps) {
  const { camera, scene, invalidate } = useThree();
  const controlsRef = useRef<OCImpl | null>(null);

  const isTransitioning = useRef(false);
  const transitionStart = useRef(0);
  const transitionDuration = 1.25;

  const startPos = useRef(new THREE.Vector3());
  const targetPos = useRef(new THREE.Vector3(...cameraPos));
  const startTarget = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3(...lookAt));
  const currentLook = useRef(new THREE.Vector3(...lookAt));

  const prevKey = useRef('');
  const currentKey = `${viewId}:${cameraPos.join(',')}:${lookAt.join(',')}:${mode}`;

  useEffect(() => {
    if (prevKey.current === currentKey) return;
    prevKey.current = currentKey;

    if (mode === 'drone') {
      isTransitioning.current = false;
      onMovingChange?.(false);
      invalidate();
      return;
    }

    const los = validateAndAdjustCameraLineOfSight(
      cameraPos,
      lookAt,
      scene,
      { minObstacleDistance: 1.5 },
      viewId
    );

    startPos.current.copy(camera.position);
    targetPos.current.set(...los.adjustedPosition);

    if (controlsRef.current) {
      startTarget.current.copy(controlsRef.current.target);
    } else {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      startTarget.current.copy(camera.position).add(dir.multiplyScalar(20));
    }

    targetLook.current.set(...los.adjustedTarget);
    transitionStart.current = performance.now();
    isTransitioning.current = true;
    onMovingChange?.(true);
    invalidate();

    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  }, [camera, cameraPos, lookAt, mode, scene, viewId, currentKey, invalidate, onMovingChange]);

  useFrame(() => {
    if (mode === 'drone') return;

    if (isTransitioning.current) {
      invalidate();
      const elapsed = (performance.now() - transitionStart.current) / 1000;
      const progress = Math.min(1.0, elapsed / transitionDuration);
      const t = progress * progress * (3 - 2 * progress);

      camera.position.lerpVectors(startPos.current, targetPos.current, t);
      currentLook.current.lerpVectors(startTarget.current, targetLook.current, t);

      if (controlsRef.current) {
        controlsRef.current.target.copy(currentLook.current);
      }
      camera.lookAt(currentLook.current);

      if (progress >= 1.0) {
        isTransitioning.current = false;
        onMovingChange?.(false);
        camera.position.copy(targetPos.current);
        camera.lookAt(targetLook.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(targetLook.current);
          controlsRef.current.enabled = mode === 'orbit';
          controlsRef.current.update();
        }
        invalidate();
        onTransitionEnd?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('restore-camera-focus'));
        }
      }
      return;
    }

    if (mode === 'orbit' && controlsRef.current && controlsRef.current.enabled) {
      controlsRef.current.update();
    }
  });

  if (mode !== 'orbit') return null;

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={220}
      maxPolarAngle={Math.PI * 0.495}
      makeDefault
      onChange={() => invalidate()}
    />
  );
}

interface SceneContentProps {
  reloadKey: number;
  onStatusChange: (state: GlbLoadState) => void;
}

function SceneContent({ reloadKey, onStatusChange }: SceneContentProps) {
  return (
    <group>
      {/* Облегченное Low-Poly окружение (< 1,500 полигонов, InstancedMesh) */}
      <LowPolyEnvironment groundY={0} />
      {/* Реальная CAD-модель строго по пути /assembly.glb через GLTFLoader + <primitive /> */}
      <GlbAssemblyModel
        key={reloadKey}
        targetMaxSize={75}
        groundY={0}
        onStatusChange={onStatusChange}
      />
    </group>
  );
}

function canCreateWebGL2() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (!context) return false;
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function SceneUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-testid="status-webgl-unavailable"
      className="absolute inset-0 grid place-items-center overflow-hidden bg-[#182327] px-6 pb-24 pt-24 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(205,180,130,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(205,180,130,.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="relative max-w-md rounded-2xl border border-white/10 bg-[#0d181b]/90 p-7 shadow-2xl backdrop-blur-xl">
        <p className="mono text-[10px] uppercase tracking-[.2em] text-[#e2a34f]">Graphics unavailable</p>
        <h1 className="mt-3 text-xl font-bold text-[#f1f0e5]">This browser could not start the 3D view</h1>
        <p className="mt-3 text-sm leading-6 text-[#aab8b1]">
          The walkthrough needs WebGL 2. Turn on hardware acceleration or open it in a browser that supports WebGL to explore the plant.
        </p>
        <button
          type="button"
          data-testid="button-retry-webgl"
          onClick={onRetry}
          className="mt-5 rounded-lg border border-[#d69a43]/45 bg-[#d69a43]/10 px-4 py-2 text-xs font-bold text-[#f3bd69] transition hover:bg-[#d69a43]/20"
        >
          Retry 3D view
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [webglAvailable, setWebglAvailable] = useState(canCreateWebGL2);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [activeView, setActiveView] = useState('view-aerial');
  const [containmentOpacity, setContainmentOpacity] = useState(0.3);
  const [renderMode, setRenderMode] = useState<RenderVisualizationMode>('standard');
  const [vrSupported, setVrSupported] = useState<boolean | null>(null);
  const [floorTarget, setFloorTarget] = useState<number | null>(null);
  const [isVRPresenting, setIsVRPresenting] = useState(false);

  // Тени включены на десктопе и автоматически отключаются в VR-гарнитуре для 72-90 FPS
  const [enableShadows, setEnableShadows] = useState(true);
  const [cameraMoving, setCameraMoving] = useState(false);

  // Состояние загрузки основной CAD-модели /assembly.glb
  const [reloadKey, setReloadKey] = useState(0);
  const [glbStatus, setGlbStatus] = useState<GlbLoadState>({
    status: 'loading',
    progressPercent: 0,
    loadedMB: 0,
    totalMB: 56,
    meshCount: 0,
    triangleCount: 0,
    parseTimeMs: 0,
  });
  const [hudDismissed, setHudDismissed] = useState(false);
  const envRenderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);

  // Drone Fly-By state
  const [droneSpeed, setDroneSpeed] = useState(1.0);
  const [dronePaused, setDronePaused] = useState(false);
  const [droneTelemetry, setDroneTelemetry] = useState<{
    t: number;
    altitude: number;
    speedKmh: number;
    headingDeg: number;
    waymark: DroneWaymark;
  } | null>(null);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);

  const activeViewData = FLOOR_VIEWS.find((v) => v.id === activeView) ?? FLOOR_VIEWS[0];
  const controlMode: ViewMode = activeViewData.mode;

  const isContinuousRendering =
    cameraMoving ||
    controlMode === 'drone' ||
    isVRPresenting;

  useEffect(() => {
    const check = async () => {
      if (typeof navigator !== 'undefined' && navigator.xr) {
        try {
          const ok = await navigator.xr.isSessionSupported('immersive-vr');
          setVrSupported(ok);
        } catch {
          setVrSupported(false);
        }
      } else {
        setVrSupported(false);
      }
    };
    check();
  }, []);

  useEffect(() => {
    const onStart = () => setIsVRPresenting(true);
    const onEnd = () => setIsVRPresenting(false);
    window.addEventListener('webxr-session-start', onStart);
    window.addEventListener('webxr-session-end', onEnd);
    return () => {
      window.removeEventListener('webxr-session-start', onStart);
      window.removeEventListener('webxr-session-end', onEnd);
    };
  }, []);

  // Автоматическое скрытие баннера успешной загрузки через 6 секунд
  useEffect(() => {
    if (glbStatus.status === 'loading') {
      setHudDismissed(false);
    } else if (glbStatus.status === 'loaded') {
      const timer = window.setTimeout(() => setHudDismissed(true), 6000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [glbStatus.status]);

  // Освобождение PMREM текстуры при размонтировании
  useEffect(() => {
    return () => {
      if (envRenderTargetRef.current) {
        envRenderTargetRef.current.dispose();
      }
    };
  }, []);

  const handleGlbStatusChange = useCallback((next: GlbLoadState) => {
    setGlbStatus(next);
  }, []);

  const handleRetryModelLoad = useCallback(() => {
    setHudDismissed(false);
    setReloadKey((k) => k + 1);
  }, []);

  const handleViewChange = useCallback((viewId: string) => {
    const view = FLOOR_VIEWS.find((v) => v.id === viewId);
    if (!view) return;
    setActiveView(viewId);
    if (view.mode === 'walk') {
      setFloorTarget(view.floorY);
    } else if (view.mode === 'drone') {
      setDronePaused(false);
      setScrubProgress(null);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restore-camera-focus'));
    }
  }, []);

  const handleVRClick = useCallback(() => {
    const btn = document.getElementById('vr-btn');
    if (btn) btn.click();
  }, []);

  const handleFloorArrived = useCallback(() => {
    setFloorTarget(null);
  }, []);

  const handlePointerLockChange = useCallback((locked: boolean) => {
    setPointerLocked(locked);
  }, []);

  const vrSpawnTarget: [number, number, number] =
    activeViewData.mode === 'walk' ? activeViewData.cameraPos : [0, 0, 36];

  return (
    <div className="scene-grain w-full h-[100dvh] relative bg-[#182327] overflow-hidden">
      {/* WebXR VR Button trigger */}
      <div className="absolute top-0 right-0 pointer-events-none opacity-0">
        <VRButton store={xrStore} id="vr-btn" />
      </div>

      {webglAvailable ? (
        <Canvas
          frameloop="demand"
          shadows={enableShadows && !isVRPresenting}
          camera={{ position: [42, 22, 46], fov: 50, near: 0.1, far: 900 }}
          gl={{
            antialias: false,
            alpha: false,
            stencil: false,
            depth: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
            powerPreference: 'high-performance',
          }}
          dpr={isVRPresenting ? 1 : [1, 1.25]}
          onCreated={({ gl, scene, camera }) => {
            const bgColor = new THREE.Color('#bdd0e0');
            scene.background = bgColor;
            gl.setClearColor(bgColor, 1.0);
            gl.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.25));
            gl.domElement.tabIndex = 0;
            gl.domElement.style.outline = 'none';
            camera.near = 0.15;
            camera.far = 900;
            camera.updateProjectionMatrix();

            // Однократный процедурный IBL (Environment) чтобы PBR-материалы не выглядели чёрными
            try {
              const pmrem = new THREE.PMREMGenerator(gl);
              pmrem.compileEquirectangularShader();
              const roomEnv = new RoomEnvironment();
              const envRT = pmrem.fromScene(roomEnv, 0.04);
              if (envRenderTargetRef.current) {
                envRenderTargetRef.current.dispose();
              }
              envRenderTargetRef.current = envRT;
              scene.environment = envRT.texture;
              roomEnv.dispose();
              pmrem.dispose();
            } catch (err) {
              console.warn('[VR Lighting] RoomEnvironment IBL skipped:', err);
            }
          }}
        >
          <DemandRenderBridge active={isContinuousRendering} />
          <WebXRSceneManager
            activeSpawnPos={vrSpawnTarget}
            floorY={0}
            activeViewId={activeViewData.id}
          />
          <VisualizationModeManager mode={renderMode} />

          {/* Согласованный фон неба и линейный туман горизонта */}
          <color attach="background" args={['#bdd0e0']} />
          <fog attach="fog" args={['#bdd0e0', 160, 520]} />

          {!isVRPresenting && <AdaptiveDpr pixelated />}

          {/* Мягкое освещение + 3-источниковая схема для читаемости CAD-материалов и высокого FPS в VR */}
          <ambientLight intensity={0.55} color="#ffffff" />
          <hemisphereLight args={['#eef6ff', '#8b7e68', 1.15]} />
          <directionalLight
            position={[45, 65, 40]}
            intensity={2.2}
            color="#fff7eb"
            castShadow={enableShadows && !isVRPresenting}
            shadow-mapSize={[512, 512]}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
            shadow-camera-far={200}
            shadow-bias={-0.0002}
          />
          <directionalLight position={[-55, 45, -60]} intensity={0.55} color="#b7d2ff" />

          <XR store={xrStore}>
            <TeleportTarget>
              <SceneContent
                reloadKey={reloadKey}
                onStatusChange={handleGlbStatusChange}
              />
            </TeleportTarget>
            <VRControllerManager
              viewTarget={vrSpawnTarget}
              floorY={0}
              activeViewId={activeViewData.id}
            />
          </XR>

          <SmoothCameraController
            cameraPos={activeViewData.cameraPos}
            lookAt={activeViewData.target ?? [0, activeViewData.floorY, 0]}
            mode={controlMode}
            viewId={activeViewData.id}
            onMovingChange={setCameraMoving}
          />

          {controlMode === 'drone' ? (
            <DroneFlyByController
              active={activeView === 'view-drone'}
              speedMultiplier={droneSpeed}
              paused={dronePaused}
              scrubProgress={scrubProgress}
              onTelemetryUpdate={setDroneTelemetry}
            />
          ) : controlMode === 'walk' ? (
            <FirstPersonController
              targetFloor={floorTarget}
              onArrived={handleFloorArrived}
              onLockChange={handlePointerLockChange}
              spawnPosition={activeViewData.cameraPos}
              lookAtTarget={activeViewData.target}
              freeGroundY={0}
            />
          ) : null}
        </Canvas>
      ) : (
        <SceneUnavailable onRetry={() => setWebglAvailable(canCreateWebGL2())} />
      )}

      {/* Компактный HUD статуса загрузки assembly.glb */}
      {!isVRPresenting && !hudDismissed && (
        <div
          data-testid="glb-load-status"
          className="pointer-events-auto fixed bottom-4 left-1/2 z-40 w-[min(480px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-[#c9d1c6]/20 bg-[#121c20]/95 px-4 py-3 text-xs text-[#e6ece7] shadow-2xl"
        >
          {glbStatus.status === 'loading' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-[#f5c26f]">
                  Загрузка 3D-модели: assembly.glb
                </span>
                <span className="font-mono text-[11px] text-[#b4c5be]">
                  {glbStatus.progressPercent}% ({glbStatus.loadedMB.toFixed(1)} / {glbStatus.totalMB.toFixed(1)} МБ)
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-[#f5c26f] transition-[width] duration-150"
                  style={{ width: `${Math.max(4, glbStatus.progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {glbStatus.status === 'loaded' && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#65d6a4]">
                  Модель assembly.glb загружена и выровнена (Y = 0)
                </p>
                <p className="font-mono text-[10px] text-[#9caeaa]">
                  Мешей: {glbStatus.meshCount} · Полигонов: {glbStatus.triangleCount.toLocaleString()} · Парсинг: {(glbStatus.parseTimeMs / 1000).toFixed(2)} с
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHudDismissed(true)}
                className="shrink-0 rounded-md px-2 py-1 text-[11px] text-[#9caeaa] hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Скрыть уведомление"
              >
                ✕
              </button>
            </div>
          )}

          {glbStatus.status === 'error' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[#f5c26f]">
                    Ошибка загрузки /assembly.glb
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#9caeaa]">
                    {glbStatus.errorMessage || 'Проверьте наличие public/assembly.glb и повторите попытку.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHudDismissed(true)}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-[#9caeaa] hover:bg-white/10 hover:text-white cursor-pointer"
                  aria-label="Закрыть предупреждение"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetryModelLoad}
                  className="rounded-lg border border-[#f5c26f]/45 bg-[#f5c26f]/15 px-3 py-1 text-[11px] font-semibold text-[#f5c26f] hover:bg-[#f5c26f]/25 cursor-pointer"
                >
                  Повторить загрузку
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <UIOverlay
        activeView={activeView}
        onViewChange={handleViewChange}
        sceneAvailable={webglAvailable}
        pointerLocked={pointerLocked}
        containmentOpacity={containmentOpacity}
        onContainmentOpacityChange={setContainmentOpacity}
        controlMode={controlMode}
        onVRClick={handleVRClick}
        vrSupported={vrSupported}
        droneSpeed={droneSpeed}
        onDroneSpeedChange={setDroneSpeed}
        dronePaused={dronePaused}
        onDroneTogglePause={() => setDronePaused((p) => !p)}
        droneTelemetry={droneTelemetry}
        onDroneScrub={(t) => {
          setScrubProgress(t);
        }}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
        enableShadows={enableShadows}
        onToggleShadows={() => setEnableShadows((s) => !s)}
      />
    </div>
  );
}
