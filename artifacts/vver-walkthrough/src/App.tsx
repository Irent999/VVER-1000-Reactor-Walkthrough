import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import { XR, createXRStore, VRButton, TeleportTarget } from '@react-three/xr';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OCImpl } from 'three-stdlib';

import GlbAssemblyModel, { type GlbLoadState } from '@/components/GlbAssemblyModel';
import VRControllerManager from '@/components/VRControllerManager';
import DroneFlyByController, { type DroneWaymark } from '@/components/DroneFlyByController';
import FirstPersonController from '@/components/FirstPersonController';
import UIOverlay, { type ThemeMode } from '@/components/UIOverlay';
import WebXRSceneManager from '@/scene/webxrManager';
import { FLOOR_VIEWS, type ViewMode } from '@/data/poiData';
import { validateAndAdjustCameraLineOfSight } from '@/scene/cameraLineOfSightModule';

const xrStore = createXRStore({
  controller: { teleportPointer: true, rayPointer: true },
  offerSession: true,
});

interface SmoothCameraControllerProps {
  cameraPos: [number, number, number];
  lookAt: [number, number, number];
  mode: ViewMode;
  viewId?: string;
  onTransitionEnd?: () => void;
  onMovingChange?: (moving: boolean) => void;
}

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

function SceneAtmosphere({ theme }: { theme: ThemeMode }) {
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    const colorHex = theme === 'dark' ? '#131c24' : '#d6e2ec';
    const bgColor = new THREE.Color(colorHex);
    scene.background = bgColor;
    scene.fog = new THREE.Fog(colorHex, 280, 920);
    gl.setClearColor(bgColor, 1.0);
    invalidate();
  }, [theme, gl, scene, invalidate]);

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
  const transitionDuration = 1.15;

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

    if (mode !== 'orbit') {
      isTransitioning.current = false;
      onMovingChange?.(false);
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
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
    if (mode !== 'orbit') return;

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
      maxDistance={420}
      maxPolarAngle={Math.PI * 0.495}
      makeDefault
      onChange={() => invalidate()}
    />
  );
}

interface SceneContentProps {
  reloadKey: number;
  containmentOpacity: number;
  shellTransparent: boolean;
  onStatusChange: (state: GlbLoadState) => void;
}

function SceneContent({
  reloadKey,
  containmentOpacity,
  shellTransparent,
  onStatusChange,
}: SceneContentProps) {
  return (
    <group>
      {/* Исключительно чистая CAD-модель assembly.glb в масштабе 1:1 (225 м) на компактном основании */}
      <GlbAssemblyModel
        key={reloadKey}
        targetMaxSize={225}
        groundY={0}
        containmentOpacity={containmentOpacity}
        shellTransparent={shellTransparent}
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
      className="absolute inset-0 grid place-items-center overflow-hidden bg-slate-100 dark:bg-slate-950 px-6 text-center transition-colors duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="relative max-w-md rounded-2xl border border-slate-900/10 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 p-7 shadow-xl backdrop-blur-xl">
        <p className="mono text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400">
          Graphics unavailable
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Не удалось инициализировать WebGL 2
        </h1>
        <p className="mt-2.5 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Включите аппаратное ускорение в настройках браузера или обновите окно для просмотра 3D-модели.
        </p>
        <button
          type="button"
          data-testid="button-retry-webgl"
          onClick={onRetry}
          className="mt-5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 transition hover:opacity-90"
        >
          Повторить запуск
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [webglAvailable, setWebglAvailable] = useState(canCreateWebGL2);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [activeView, setActiveView] = useState('walk-tour');
  const [containmentOpacity, setContainmentOpacity] = useState(1.0);
  const [shellTransparent, setShellTransparent] = useState(false);
  const [vrSupported, setVrSupported] = useState<boolean | null>(null);
  const [floorTarget, setFloorTarget] = useState<number | null>(null);
  const [isVRPresenting, setIsVRPresenting] = useState(false);
  const [cameraMoving, setCameraMoving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const [glbStatus, setGlbStatus] = useState<GlbLoadState>({
    status: 'loading',
    progressPercent: 0,
    loadedMB: 0,
    totalMB: 55.05,
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
  const [walkOverride, setWalkOverride] = useState<boolean | null>(null);
  const controlMode: ViewMode =
    activeViewData.mode === 'drone'
      ? 'drone'
      : walkOverride !== null
      ? walkOverride
        ? 'walk'
        : 'orbit'
      : activeViewData.mode;

  const isContinuousRendering = cameraMoving || controlMode === 'drone' || isVRPresenting;

  // Синхронизация класса .dark на корневом элементе <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

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

  useEffect(() => {
    if (glbStatus.status === 'loading') {
      setHudDismissed(false);
    } else if (glbStatus.status === 'loaded') {
      const timer = window.setTimeout(() => setHudDismissed(true), 4500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [glbStatus.status]);

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
    setWalkOverride(null);
    setActiveView(viewId);
    if (viewId === 'view-cutaway' || viewId === 'view-core-catcher') {
      setContainmentOpacity((prev) => (prev > 0.65 ? 0.48 : prev));
    } else if (viewId === 'view-reactor-hall' || viewId === 'view-polar-crane') {
      setContainmentOpacity((prev) => (prev > 0.8 ? 0.72 : prev));
    }
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

  const handleToggleWalkMode = useCallback(() => {
    setWalkOverride((prev) => {
      const currentlyWalk = prev !== null ? prev : activeViewData.mode === 'walk';
      return !currentlyWalk;
    });
  }, [activeViewData.mode]);

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
    activeViewData.mode === 'walk'
      ? activeViewData.cameraPos
      : activeViewData.cameraPos[1] <= 18
      ? [activeViewData.cameraPos[0], activeViewData.floorY, activeViewData.cameraPos[2]]
      : [64, 0.4, -18];

  const safeWalkFallbackPos: [number, number, number] = (() => {
    const cx = THREE.MathUtils.clamp(activeViewData.cameraPos[0], -106, 106);
    const cz = THREE.MathUtils.clamp(activeViewData.cameraPos[2], -106, 106);
    if (cx > 18 && cz > 12) {
      return [64, activeViewData.floorY + 1.65, -18];
    }
    return [cx, activeViewData.floorY + 1.65, cz];
  })();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#d6e2ec] dark:bg-[#131c24] transition-colors duration-200">
      <div className="pointer-events-none absolute right-0 top-0 opacity-0">
        <VRButton store={xrStore} id="vr-btn" />
      </div>

      {webglAvailable ? (
        <Canvas
          frameloop="demand"
          shadows={!isVRPresenting}
          camera={{ position: [64, 2.05, -18], fov: 55, near: 0.15, far: 1400 }}
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
            const bgColor = new THREE.Color(theme === 'dark' ? '#131c24' : '#d6e2ec');
            scene.background = bgColor;
            gl.setClearColor(bgColor, 1.0);
            gl.localClippingEnabled = true;
            gl.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.25));
            gl.domElement.tabIndex = 0;
            gl.domElement.style.outline = 'none';
            camera.near = 0.15;
            camera.far = 1400;
            camera.updateProjectionMatrix();

            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
            });
            gl.domElement.addEventListener('webglcontextrestored', () => {
              setWebglAvailable(true);
            });

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
          <SceneAtmosphere theme={theme} />
          <WebXRSceneManager
            activeSpawnPos={vrSpawnTarget}
            floorY={activeViewData.floorY}
            activeViewId={activeViewData.id}
          />

          {!isVRPresenting && <AdaptiveDpr pixelated />}

          <ambientLight intensity={theme === 'dark' ? 0.56 : 0.65} color="#ffffff" />
          <hemisphereLight args={['#eef6ff', '#8f99a3', theme === 'dark' ? 0.95 : 1.15]} />
          <directionalLight
            position={[110, 145, 95]}
            intensity={theme === 'dark' ? 1.95 : 2.15}
            color="#fff7eb"
            castShadow={!isVRPresenting}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-125}
            shadow-camera-right={125}
            shadow-camera-top={125}
            shadow-camera-bottom={-125}
            shadow-camera-far={420}
            shadow-bias={-0.0005}
            shadow-normalBias={0.04}
          />
          <directionalLight position={[-125, 105, -135]} intensity={0.62} color="#b7d2ff" />

          <XR store={xrStore}>
            <TeleportTarget>
              <SceneContent
                reloadKey={reloadKey}
                containmentOpacity={containmentOpacity}
                shellTransparent={shellTransparent}
                onStatusChange={handleGlbStatusChange}
              />
            </TeleportTarget>
            <VRControllerManager
              viewTarget={vrSpawnTarget}
              floorY={activeViewData.floorY}
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
              spawnPosition={
                activeViewData.mode === 'walk'
                  ? activeViewData.cameraPos
                  : safeWalkFallbackPos
              }
              lookAtTarget={activeViewData.target}
              freeGroundY={activeViewData.floorY}
            />
          ) : null}
        </Canvas>
      ) : (
        <SceneUnavailable onRetry={() => setWebglAvailable(canCreateWebGL2())} />
      )}

      {/* Компактный стеклянный индикатор загрузки assembly.glb */}
      {!isVRPresenting && !hudDismissed && (
        <div
          data-testid="glb-load-status"
          className="pointer-events-auto fixed bottom-24 left-1/2 z-40 w-[min(400px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-slate-900/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/75 px-4 py-3 text-xs text-slate-900 dark:text-slate-100 shadow-lg backdrop-blur-xl transition-colors duration-200"
        >
          {glbStatus.status === 'loading' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">Загрузка CAD-сборки</span>
                <span className="mono text-[11px] text-slate-600 dark:text-slate-400">
                  {glbStatus.progressPercent}% · {glbStatus.loadedMB.toFixed(1)} МБ
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                <div
                  className="h-full bg-sky-500 transition-[width] duration-150"
                  style={{ width: `${Math.max(4, glbStatus.progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {glbStatus.status === 'loaded' && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">Модель assembly.glb готова</p>
                <p className="mono mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {glbStatus.meshCount} узлов · {glbStatus.triangleCount.toLocaleString()} полигонов
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHudDismissed(true)}
                className="shrink-0 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Скрыть уведомление"
              >
                ✕
              </button>
            </div>
          )}

          {glbStatus.status === 'error' && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Ошибка загрузки assembly.glb
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-400">
                  {glbStatus.errorMessage || 'Проверьте файл public/assembly.glb'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetryModelLoad}
                className="shrink-0 rounded-lg bg-slate-900 dark:bg-white px-3 py-1.5 text-[11px] font-medium text-white dark:text-slate-950"
              >
                Повтор
              </button>
            </div>
          )}
        </div>
      )}

      <UIOverlay
        activeView={activeView}
        onViewChange={handleViewChange}
        pointerLocked={pointerLocked}
        containmentOpacity={containmentOpacity}
        onContainmentOpacityChange={setContainmentOpacity}
        shellTransparent={shellTransparent}
        onToggleShellTransparent={() => setShellTransparent((v) => !v)}
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
        onToggleWalkMode={handleToggleWalkMode}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />
    </div>
  );
}
