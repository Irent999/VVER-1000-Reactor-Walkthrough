import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, Environment, AdaptiveDpr, ContactShadows } from '@react-three/drei';
import { XR, createXRStore, VRButton, TeleportTarget } from '@react-three/xr';
import * as THREE from 'three';
import type { OrbitControls as OCImpl } from 'three-stdlib';

import ReactorBuilding from '@/components/ReactorBuilding';
import SteamGeneratorDeck from '@/components/SteamGeneratorDeck';
import ServerRoom from '@/components/ServerRoom';
import CoreCatcher from '@/components/CoreCatcher';
import TurbineHall from '@/components/TurbineHall';
import ExteriorScene from '@/components/ExteriorScene';
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
import { POI_LIST, FLOOR_VIEWS, type POIInfo, type ViewMode } from '@/data/poiData';
import { useTelemetry } from '@/hooks/useTelemetry';
import {
  configureNPPRenderer,
  applySceneOptimizations,
  fixBuildingOverlap,
} from '@/scene/nppOptimizationModule';

const xrStore = createXRStore({
  controller: { teleportPointer: true, rayPointer: true },
  offerSession: true,
});

/** Автоматический оптимизатор сцены: включает Frustum Culling, предрасчет BoundingBox/Sphere, настраивает WebXR */
function ScenePerformanceOptimizer() {
  const { scene, gl } = useThree();

  useEffect(() => {
    configureNPPRenderer(gl, {
      maxPixelRatio: 1.5,
      enableSoftShadows: true,
    });
    applySceneOptimizations(scene, {
      disableSmallShadowCasters: true,
    });
    // Автоматическая проверка пересечений, разнесение зданий и устранение Z-fighting
    fixBuildingOverlap(scene, {
      requiredClearance: 8.0,
      removeDuplicateRoofs: true,
    });
  }, [scene, gl]);

  return null;
}

/** Smoothly moves the camera to a target position and lookAt target */
function CameraRig({ cameraPos, lookAt, mode }: { cameraPos: [number, number, number]; lookAt: [number, number, number]; mode: ViewMode }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...cameraPos));
  const targetLook = useRef(new THREE.Vector3(...lookAt));
  const animating = useRef(false);

  useEffect(() => {
    if (mode === 'drone') {
      animating.current = false;
      return;
    }
    targetPos.current.set(...cameraPos);
    targetLook.current.set(...lookAt);
    animating.current = true;
  }, [cameraPos, lookAt, mode]);

  // We use a simple lerp via requestAnimationFrame since OrbitControls handles its own updates
  useEffect(() => {
    if (mode !== 'orbit') return;
    let raf = 0;
    const animate = () => {
      if (animating.current) {
        camera.position.lerp(targetPos.current, 0.06);
        if (camera.position.distanceTo(targetPos.current) < 0.5) {
          animating.current = false;
          camera.position.copy(targetPos.current);
        }
        camera.lookAt(targetLook.current);
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [camera, mode]);

  return null;
}

interface SceneContentProps {
  containmentOpacity: number;
  onPOISelect: (poi: POIInfo) => void;
}

function SceneContent({ containmentOpacity, onPOISelect }: SceneContentProps) {
  return (
    <group>
      {/* Unit 1 Full Interactive Interior & Exterior (Строго position.y = 0, scale = [1, 1, 1]) */}
      <group name="VVERUnit1_MasterGroup" position={[0, 0, 0]} scale={[1, 1, 1]}>
        <ReactorBuilding
          containmentOpacity={containmentOpacity}
          position={[0, 0, 0]}
          scale={[1, 1, 1]}
        />
        <CoreCatcher />
        <SteamGeneratorDeck />
        <ServerRoom />
        <TurbineHall />
      </group>

      {/* Full Combined NPP Site Master Plan Infrastructure */}
      {/* Unit 2: Строго на одной горизонтальной оси (position.y = 0), масштаб [1, 1, 1], смещение ΔZ = +70 */}
      <VVERUnit2 position={[0, 0, 70]} scale={[1, 1, 1]} />
      <InterUnitOverheadPipeBridge />
      {/* Комплекс МАЭС РИТМ-200Н: четкий технологический проход/разрыв от стен машзала (X=142, Z=80) */}
      <RITM200NComplex position={[142, 0, 80]} />
      <CylindricalWaterStorageTanks position={[64, 0, 86]} />

      {/* Exterior Site, Cooling Towers (x2), Switchyard, ABK, Roads & Steppe Landscape */}
      <ExteriorScene />
      <POIMarkers pois={POI_LIST} onSelect={onPOISelect} />
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
  const [vrSupported, setVrSupported] = useState<boolean | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POIInfo | null>(null);
  const [floorTarget, setFloorTarget] = useState<number | null>(null);
  const telemetry = useTelemetry();

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
  }, []);

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
          shadows
          camera={{ position: [50, 30, 60], fov: 60, near: 0.1, far: 1000 }}
          gl={{
            antialias: false, // Отключение тяжелого MSAA сглаживания для встроенной графики по ТЗ
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
            powerPreference: 'high-performance',
          }}
          dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)]}
        >
        <ScenePerformanceOptimizer />
        <color attach="background" args={['#9CB0C3']} />
        <fogExp2 attach="fog" args={['#9CB0C3', 0.0022]} />

        <Suspense fallback={null}>
          <Sky sunPosition={[80, 113, 80]} turbidity={2.8} rayleigh={1.15} mieCoefficient={0.005} mieDirectionalG={0.84} />
          <Stars radius={450} depth={80} count={1200} factor={4} fade />
          <Environment preset="warehouse" environmentIntensity={0.28} />
        </Suspense>
        <AdaptiveDpr pixelated />

        {/* Realistic natural lighting: Sky/Ground HemisphereLight + 45° Directional Sunlight */}
        <hemisphereLight args={['#9CB0C3', '#8B7E66', 0.82]} />
        <directionalLight
          position={[80, 113, 80]}
          intensity={2.6}
          color="#fffaf0"
          castShadow
          shadow-mapSize-width={[2048]}
          shadow-mapSize-height={[2048]}
          shadow-camera-left={[-150]}
          shadow-camera-right={[150]}
          shadow-camera-top={[150]}
          shadow-camera-bottom={[-150]}
          shadow-camera-far={[380]}
          shadow-bias={-0.00015}
        />
        <directionalLight position={[-55, 35, -65]} intensity={0.45} color="#88aaff" />

        {/* Smooth ambient occlusion contact shadows on +15m deck */}
        <ContactShadows
          position={[0, 15.01, 0]}
          opacity={0.5}
          scale={44}
          blur={1.8}
          far={8}
          resolution={512}
          color="#0c1417"
        />

        <XR store={xrStore}>
          <TeleportTarget>
            <SceneContent containmentOpacity={containmentOpacity} onPOISelect={handlePOISelect} />
          </TeleportTarget>
          <VRControllerManager />
        </XR>

        {/* Camera rig for orbit transitions */}
        <CameraRig
          cameraPos={activeViewData.cameraPos}
          lookAt={activeViewData.target ?? [0, activeViewData.floorY, 0]}
          mode={controlMode}
        />

        {controlMode === 'orbit' ? (
          <OrbitControls
            target={activeViewData.target ?? [0, activeViewData.floorY, 0]}
            enableDamping
            dampingFactor={0.08}
            minDistance={8}
            maxDistance={380}
            maxPolarAngle={Math.PI * 0.88}
            makeDefault
          />
        ) : controlMode === 'drone' ? (
          <DroneFlyByController
            active={activeView === 'view-drone'}
            speedMultiplier={droneSpeed}
            paused={dronePaused}
            scrubProgress={scrubProgress}
            onTelemetryUpdate={setDroneTelemetry}
          />
        ) : (
          <FirstPersonController
            targetFloor={floorTarget}
            onArrived={handleFloorArrived}
            onLockChange={handlePointerLockChange}
            spawnPosition={activeViewData.cameraPos}
          />
        )}
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
        telemetry={telemetry}
        droneSpeed={droneSpeed}
        onDroneSpeedChange={setDroneSpeed}
        dronePaused={dronePaused}
        onDroneTogglePause={() => setDronePaused((p) => !p)}
        droneTelemetry={droneTelemetry}
        onDroneScrub={(t) => {
          setScrubProgress(t);
        }}
      />

      {selectedPOI && (
        <div className="fixed inset-0 z-50" onClick={() => setSelectedPOI(null)}>
          <POIModal poi={selectedPOI} onClose={() => setSelectedPOI(null)} />
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
