import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, Environment, AdaptiveDpr, ContactShadows } from '@react-three/drei';
import { XR, createXRStore, VRButton, TeleportTarget } from '@react-three/xr';
import * as THREE from 'three';
import type { OrbitControls as OCImpl } from 'three-stdlib';

import ReactorBuilding from '@/components/ReactorBuilding';
import SteamGeneratorDeck from '@/components/SteamGeneratorDeck';
import ServerRoom from '@/components/ServerRoom';
import CoreCatcher from '@/components/CoreCatcher';
import TurbineHall from '@/components/TurbineHall';
import DeaeratorBuilding from '@/components/DeaeratorBuilding';
import ExteriorScene from '@/components/ExteriorScene';
import AssemblyComponent from '@/components/AssemblyComponent';
import {
  VVERUnit2,
  InterUnitOverheadPipeBridge,
  RITM200NComplex,
  CylindricalWaterStorageTanks,
} from '@/components/MasterSiteAssets';
import POIMarkers from '@/components/POIMarkers';
import VRControllerManager from '@/components/VRControllerManager';
import DroneFlyByController, { type DroneWaymark } from '@/components/DroneFlyByController';
import FirstPersonController from '@/components/FirstPersonController';
import UIOverlay from '@/components/UIOverlay';
import VVER1000AuxiliaryBuilding from '@/components/VVER1000AuxiliaryBuilding';
import VVER1000MainControlRoom from '@/components/VVER1000MainControlRoom';
import SiteEngineeringInfrastructure from '@/components/SiteEngineeringInfrastructure';
import VisualizationModeManager, { type RenderVisualizationMode } from '@/components/VisualizationModeManager';
import WebXRSceneManager from '@/scene/webxrManager';
import { POI_LIST, FLOOR_VIEWS, type POIInfo, type ViewMode } from '@/data/poiData';
import {
  configureNPPRenderer,
  applySceneOptimizations,
  fixBuildingOverlap,
} from '@/scene/nppOptimizationModule';
import { syncRITMViewpoints } from '@/scene/dynamicViewpointManager';
import { validateAndAdjustCameraLineOfSight, auditAndCleanAllFloorViews } from '@/scene/cameraLineOfSightModule';

const xrStore = createXRStore({
  controller: { teleportPointer: true, rayPointer: true },
  offerSession: true,
});

interface ScenePerformanceOptimizerProps {
  onSyncRITM?: (pois: POIInfo[], views: typeof FLOOR_VIEWS) => void;
}

/** Автоматический оптимизатор сцены: включает Frustum Culling, предрасчет BoundingBox/Sphere, устраняет наложения и динамически связывает точки обзора */
function ScenePerformanceOptimizer({ onSyncRITM }: ScenePerformanceOptimizerProps) {
  const { scene, gl } = useThree();

  useEffect(() => {
    configureNPPRenderer(gl, {
      maxPixelRatio: 1.5,
      enableSoftShadows: false,
    });
    applySceneOptimizations(scene, {
      disableSmallShadowCasters: true,
    });
    // Автоматическая проверка пересечений, разнесение зданий и устранение Z-fighting
    fixBuildingOverlap(scene, {
      requiredClearance: 8.0,
      removeDuplicateRoofs: true,
    });

    // Динамический сдвиг ракурсов (Viewpoints / POI) вслед за моделью РИТМ-200Н
    const ritmGroup = scene.getObjectByName('RITM200N_SMR_FullComplex') ||
      scene.getObjectByName('RITM200N_Complex');
    if (ritmGroup && onSyncRITM) {
      const { updatedPOIs, updatedViews } = syncRITMViewpoints(ritmGroup, POI_LIST, FLOOR_VIEWS);
      const cleanedViews = auditAndCleanAllFloorViews(updatedViews, scene);
      onSyncRITM(updatedPOIs, cleanedViews);
    }
  }, [scene, gl, onSyncRITM]);

  return null;
}

/**
 * Высокопроизводительный контроллер камеры:
 * 1. Интеграция в анимационный цикл useFrame (исключает лаги от ре-рендеров React)
 * 2. Плавное сглаживание движений OrbitControls (enableDamping = true, dampingFactor = 0.05)
 * 3. Бесшовные кинематографические перелеты между ракурсами с контролем препятствий
 */
interface SmoothCameraControllerProps {
  cameraPos: [number, number, number];
  lookAt: [number, number, number];
  mode: ViewMode;
  viewId?: string;
  onTransitionEnd?: () => void;
  onMovingChange?: (moving: boolean) => void;
}

/** Менеджер рендеринга по требованию (frameloop="demand"): гарантирует рендеринг при движениях камеры/дрона/ходьбе и 0% нагрузки в покое */
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

  // Параметры перехода хранятся в refs и обрабатываются строго в цикле useFrame
  const isTransitioning = useRef(false);
  const transitionStart = useRef(0);
  const transitionDuration = 1.35; // секунды

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

    // Проверка прямой видимости THREE.Raycaster и автоматическая коррекция спавна
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

    // Временно отключаем ручное вращение OrbitControls во время плавного перелета камеры
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
      // Плавная кубическая кривая smoothstep: t * t * (3 - 2 * t)
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

    // В обычном режиме орбиты - непрерывное плавное сглаживание в цикле анимации useFrame
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
      minDistance={6}
      maxDistance={420}
      maxPolarAngle={Math.PI * 0.88}
      makeDefault
      onChange={() => invalidate()}
    />
  );
}

interface SceneContentProps {
  containmentOpacity: number;
  onPOISelect: (poi: POIInfo) => void;
  pois?: POIInfo[];
}

function SceneContent({ containmentOpacity, onPOISelect, pois = POI_LIST }: SceneContentProps) {
  return (
    <group>
      {/* Оставляем исключительно вашу новую детальную модель */}
      <AssemblyComponent position={[0, 0, 0]} scale={[1, 1, 1]} />

      {/* Внешняя инфраструктура, второй блок и окружение */}
      <VVERUnit2 position={[0, 0, 70]} scale={[1, 1, 1]} />
      <InterUnitOverheadPipeBridge />
      <RITM200NComplex position={[168, 0, 80]} />
      <CylindricalWaterStorageTanks position={[64, 0, 86]} />
      <ExteriorScene />
      <SiteEngineeringInfrastructure />
      <POIMarkers pois={pois} onSelect={onPOISelect} />
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
  const [selectedPOI, setSelectedPOI] = useState<POIInfo | null>(null);
  const [floorTarget, setFloorTarget] = useState<number | null>(null);
  const [isVRPresenting, setIsVRPresenting] = useState(false);

  const [enableShadows, setEnableShadows] = useState(true);
  const [cameraMoving, setCameraMoving] = useState(false);

  // Динамические POI и Viewpoints (синхронизируются с глобальной матрицей РИТМ-200Н)
  const [dynamicPOIs, setDynamicPOIs] = useState<POIInfo[]>(POI_LIST);
  const [dynamicViews, setDynamicViews] = useState(FLOOR_VIEWS);

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

  const activeViewData = dynamicViews.find((v) => v.id === activeView) ?? dynamicViews[0];
  const controlMode: ViewMode = activeViewData.mode;

  // Непрерывный рендеринг активируется только при активных движениях (дрон, перелет камеры, VR)
  const isContinuousRendering =
    cameraMoving ||
    controlMode === 'drone' ||
    isVRPresenting;

  const handleSyncRITM = useCallback((pois: POIInfo[], views: typeof FLOOR_VIEWS) => {
    setDynamicPOIs([...pois]);
    setDynamicViews([...views]);
  }, []);

  useEffect(() => {
    const check = async () => {
      if (typeof navigator !== 'undefined' && navigator.xr) {
        try {
          const ok = await navigator.xr.isSessionSupported('immersive-vr');
          setVrSupported(ok);
        } catch { setVrSupported(false); }
      } else { setVrSupported(false); }
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

  const handleViewChange = useCallback((viewId: string) => {
    const view = dynamicViews.find((v) => v.id === viewId) ?? FLOOR_VIEWS.find((v) => v.id === viewId);
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
  }, [dynamicViews]);

  const handlePOISelect = useCallback((poi: POIInfo) => {
    setSelectedPOI(poi);
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

  return (
      <div className="scene-grain w-full h-[100dvh] relative bg-[#182327] overflow-hidden">
      {/* WebXR VR Button trigger */}
      <div className="absolute top-0 right-0 pointer-events-none opacity-0">
        <VRButton store={xrStore} id="vr-btn" />
      </div>

      {webglAvailable ? (
        <Canvas
          frameloop="demand"
          shadows={enableShadows}
          camera={{ position: [50, 30, 60], fov: 60, near: 0.1, far: 1000 }}
          gl={{
            antialias: false,
            alpha: false,
            stencil: false,
            depth: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
            powerPreference: 'high-performance',
          }}
          dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)]}
          onCreated={({ gl, scene, camera }) => {
            const bgColor = new THREE.Color('#d4c5a9');
            scene.background = bgColor;
            gl.setClearColor(bgColor, 1.0);
            gl.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5));
            gl.domElement.tabIndex = 0;
            gl.domElement.style.outline = 'none';
            camera.near = 0.1;
            camera.far = 1000;
            camera.updateProjectionMatrix();
          }}
        >
        <DemandRenderBridge active={isContinuousRendering} />
        <WebXRSceneManager
          activeSpawnPos={activeViewData.cameraPos}
          floorY={activeViewData.floorY}
          activeViewId={activeViewData.id}
        />
        <ScenePerformanceOptimizer onSyncRITM={handleSyncRITM} />
        {/* Менеджер режимов отображения: Стандарт, Тепловизор, Рентген / Каркас */}
        <VisualizationModeManager mode={renderMode} />
        {/* Реалистичный природный фон и легкий естественный степной туман по ТЗ */}
        <color attach="background" args={['#d4c5a9']} />
        <fogExp2 attach="fog" args={['#d4c5a9', 0.001]} />

        {/* Глобальное базовое освещение для предотвращения темноты/черного экрана в VR */}
        <ambientLight intensity={1.4} color="#fffcf5" />

        <Suspense fallback={null}>
          <Sky
            sunPosition={[95, 110, 85]}
            turbidity={2.4}
            rayleigh={0.95}
            mieCoefficient={0.004}
            mieDirectionalG={0.82}
          />
          <Stars radius={450} depth={80} count={1200} factor={4} fade />
          <Environment preset="warehouse" environmentIntensity={0.25} />
        </Suspense>
        <AdaptiveDpr pixelated />

        {/* Теплое солнечное дневное освещение степи */}
        <hemisphereLight args={['#f5ebd8', '#998363', 0.88]} />
        <directionalLight
          position={[95, 110, 85]}
          intensity={2.8}
          color="#fff3dc"
          castShadow={enableShadows}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-left={-130}
          shadow-camera-right={130}
          shadow-camera-top={130}
          shadow-camera-bottom={-130}
          shadow-camera-far={320}
          shadow-bias={-0.00015}
        />
        <directionalLight position={[-55, 35, -65]} intensity={0.45} color="#88aaff" />

        {/* Smooth ambient occlusion contact shadows on +15m deck - baked once */}
        {enableShadows && (
          <ContactShadows
            position={[0, 15.01, 0]}
            opacity={0.35}
            scale={40}
            blur={1.5}
            far={6}
            resolution={256}
            color="#0c1417"
            frames={1}
          />
        )}

        <XR store={xrStore}>
          <TeleportTarget>
            <SceneContent
              containmentOpacity={containmentOpacity}
              onPOISelect={handlePOISelect}
              pois={dynamicPOIs}
            />
          </TeleportTarget>
          <VRControllerManager
            viewTarget={activeViewData.target ?? activeViewData.cameraPos}
            floorY={activeViewData.floorY}
            activeViewId={activeViewData.id}
          />
        </XR>

        {/* Unified camera controller with damping = 0.05 & useFrame animation loop */}
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
          />
        ) : null}
        </Canvas>
      ) : (
        <SceneUnavailable onRetry={() => setWebglAvailable(canCreateWebGL2())} />
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

      {selectedPOI && !isVRPresenting && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => {
            setSelectedPOI(null);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('restore-camera-focus'));
            }
          }}
        >
          <POIModal
            poi={selectedPOI}
            onClose={() => {
              setSelectedPOI(null);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('restore-camera-focus'));
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Inline POI modal — avoids prop drilling into UIOverlay */
function POIModal({ poi, onClose }: { poi: POIInfo; onClose: () => void }) {
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  return (
    <div className="flex items-center justify-center p-4 h-full" onClick={(e) => e.stopPropagation()}>
      <div
        className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ borderColor: poi.color + '80', boxShadow: `0 0 40px ${poi.color}30` }}
      >
        <div className="relative px-6 py-4 border-b border-slate-700" style={{ background: `linear-gradient(135deg, ${poi.color}25, transparent)` }}>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">✕</button>
          <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide inline-block mb-1" style={{ background: poi.color + '30', color: poi.color }}>
            {lang === 'en' ? poi.categoryEn : poi.categoryRu}
          </span>
          <h2 className="text-xl font-bold text-white">{lang === 'en' ? poi.titleEn : poi.titleRu}</h2>
        </div>
        <div className="flex gap-1 px-6 pt-3">
          {(['en', 'ru'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 text-xs rounded-md font-medium transition ${lang === l ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              {l === 'en' ? 'English' : 'Русский'}
            </button>
          ))}
        </div>
        <div className="px-6 py-3 grid grid-cols-2 gap-2">
          {poi.specs.map((spec, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{lang === 'en' ? spec.labelEn : spec.labelRu}</div>
              <div className="text-sm font-mono font-semibold" style={{ color: poi.color }}>{spec.value}</div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6">
          <p className="text-sm text-slate-300 leading-relaxed">{lang === 'en' ? poi.descriptionEn : poi.descriptionRu}</p>
        </div>
      </div>
    </div>
  );
}
