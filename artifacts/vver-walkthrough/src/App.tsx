import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OCImpl } from 'three-stdlib';

import GlbAssemblyModel, { type GlbLoadState, type SiteBox3Anchors } from '@/components/GlbAssemblyModel';
import CadSiteAddons from '@/components/CadSiteAddons';
import NppProcessVisualizer from '@/components/NppProcessVisualizer';
import EvacuationRoutesVisualizer from '@/components/EvacuationRoutesVisualizer';
import VRControllerManager from '@/components/VRControllerManager';
import DroneFlyByController, { type DroneWaymark } from '@/components/DroneFlyByController';
import FirstPersonController from '@/components/FirstPersonController';
import UIOverlay, {
  type ThemeMode,
  type VRAvailabilityInfo,
  type VRErrorState,
} from '@/components/UIOverlay';
import { ErrorBoundary, type ErrorFallbackProps } from '@/components/error-boundary';
import WebXRSceneManager, {
  isXRPresentingOrActive,
  safeSetReferenceSpaceType,
} from '@/scene/webxrManager';
import { FLOOR_VIEWS, type ViewMode } from '@/data/poiData';
import { validateAndAdjustCameraLineOfSight } from '@/scene/cameraLineOfSightModule';
import { resolveAssetBaseUrl } from '@/utils/resolveAssetUrl';

const _orbitForwardDir = new THREE.Vector3();

// Конфигурация WebXR без внешнего эмулятора, CDN-моделей и жёстких requiredFeatures:
// оставляем только безопасный optionalFeatures: ['local-floor'] (без 'bounded-floor' и requiredFeatures),
// чтобы OpenXR / SteamVR / HTC Vive не отклоняли сессию с NotSupportedError.
// frameBufferScaling: 0.72 снижает нагрузку стерео-рендеринга на GPU без зависания при старте VR.
// baseAssetPath формируется через resolveAssetBaseUrl('./'), чтобы new URL(...) в @pmndrs/xr никогда не падал с Invalid base URL.
const xrStore = createXRStore({
  emulate: false,
  offerSession: false,
  enterGrantedSession: false,
  baseAssetPath: resolveAssetBaseUrl('./'),
  foveation: 1.0,
  frameBufferScaling: 0.72,
  frameRate: false,
  bounded: false,
  hand: false,
  controller: false,
  gaze: false,
  screenInput: false,
  transientPointer: false,
  customSessionInit: {
    optionalFeatures: ['local-floor'],
  },
});

interface SmoothCameraControllerProps {
  cameraPos: [number, number, number];
  lookAt: [number, number, number];
  mode: ViewMode;
  viewId?: string;
  isVRPresenting?: boolean;
  onTransitionEnd?: () => void;
}

function SceneAtmosphere({ theme }: { theme: ThemeMode }) {
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    const colorHex = theme === 'dark' ? '#1a2430' : '#dce8f2';
    const bgColor = new THREE.Color(colorHex);
    scene.background = bgColor;
    scene.fog = new THREE.Fog(colorHex, 240, 780);
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
  isVRPresenting = false,
  onTransitionEnd,
}: SmoothCameraControllerProps) {
  const { camera, scene } = useThree();
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
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
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
      camera.getWorldDirection(_orbitForwardDir);
      startTarget.current.copy(camera.position).add(_orbitForwardDir.multiplyScalar(20));
    }

    targetLook.current.set(...los.adjustedTarget);
    transitionStart.current = performance.now();
    isTransitioning.current = true;

    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
  }, [camera, cameraPos, lookAt, mode, scene, viewId, currentKey]);

  useFrame(() => {
    if (isVRPresenting || mode !== 'orbit') {
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      return;
    }

    if (isTransitioning.current) {
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
        camera.position.copy(targetPos.current);
        camera.lookAt(targetLook.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(targetLook.current);
          controlsRef.current.enabled = mode === 'orbit';
          controlsRef.current.update();
        }
        onTransitionEnd?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('restore-camera-focus'));
        }
      }
      return;
    }

    if (controlsRef.current && controlsRef.current.enabled) {
      controlsRef.current.update();
    }
  });

  if (mode !== 'orbit' || isVRPresenting) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={mode === 'orbit' && !isVRPresenting}
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={2}
      maxDistance={420}
      maxPolarAngle={Math.PI * 0.495}
      makeDefault
    />
  );
}

interface SceneContentProps {
  reloadKey: number;
  containmentOpacity: number;
  shellTransparent: boolean;
  energyFlowActive: boolean;
  evacuationRoutesActive: boolean;
  onStatusChange: (state: GlbLoadState) => void;
}

const SceneContent = memo(function SceneContent({
  reloadKey,
  containmentOpacity,
  shellTransparent,
  energyFlowActive,
  evacuationRoutesActive,
  onStatusChange,
}: SceneContentProps) {
  const [siteAnchors, setSiteAnchors] = useState<SiteBox3Anchors | null>(null);
  const rootRef = useRef<THREE.Group | null>(null);

  // Отключаем ежекадровый обход всей геометрии сцены системой @pmndrs/pointer-events внутри VR
  useEffect(() => {
    if (rootRef.current) {
      (rootRef.current as unknown as { intersectChildren?: boolean }).intersectChildren = false;
    }
  }, []);

  return (
    <group ref={rootRef}>
      {/* CAD-сборка assembly.glb (225 м) + привязанные по Box3 венттрубы, ОРУ, К-1000, комплекс РИТМ-200Н и 3D-энергопоток */}
      <GlbAssemblyModel
        key={reloadKey}
        targetMaxSize={225}
        groundY={0}
        containmentOpacity={containmentOpacity}
        shellTransparent={shellTransparent}
        energyFlowActive={energyFlowActive}
        onStatusChange={onStatusChange}
        onAnchorsReady={setSiteAnchors}
      />
      <CadSiteAddons
        anchors={siteAnchors}
        containmentOpacity={containmentOpacity}
        energyFlowActive={energyFlowActive}
      />
      <NppProcessVisualizer active={energyFlowActive} anchors={siteAnchors} />
      <EvacuationRoutesVisualizer active={evacuationRoutesActive} anchors={siteAnchors} />
    </group>
  );
});

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

function CanvasErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div
      data-testid="status-scene-error"
      className="absolute inset-0 grid place-items-center bg-slate-100 dark:bg-slate-950 px-6 text-center"
      role="alert"
    >
      <div className="max-w-md rounded-2xl border border-slate-900/10 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-7 shadow-xl">
        <p className="mono text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400">
          WebGL / WebXR fallback
        </p>
        <h1 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Сбой 3D-рендера или VR-сессии
        </h1>
        <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
          {error.message || 'Произошла ошибка графической подсистемы.'}
        </p>
        <button
          type="button"
          onClick={resetError}
          className="mt-5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-slate-950 transition hover:opacity-90"
        >
          Вернуться в Desktop-режим
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [webglAvailable, setWebglAvailable] = useState(canCreateWebGL2);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [activeView, setActiveView] = useState('walk-tour');
  const [containmentOpacity, setContainmentOpacity] = useState(1.0);
  const [shellTransparent, setShellTransparent] = useState(false);
  const [energyFlowActive, setEnergyFlowActive] = useState(false);
  const [evacuationRoutesActive, setEvacuationRoutesActive] = useState(false);
  const [vrSupported, setVrSupported] = useState<boolean | null>(null);
  const vrSupportedRef = useRef<boolean | null>(null);
  vrSupportedRef.current = vrSupported;
  const [vrAvailability, setVrAvailability] = useState<VRAvailabilityInfo>({
    status: 'checking',
    reason: 'Проверка доступности WebXR...',
  });
  const [isVRPresenting, setIsVRPresenting] = useState(false);
  const [xrRefSpaceType, setXrRefSpaceType] = useState<XRReferenceSpaceType>('local-floor');
  const [vrError, setVrError] = useState<VRErrorState | null>(null);

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
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

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

  // Синхронизация класса .dark на корневом элементе <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Полная диагностика доступности WebXR при старте (HTTPS/localhost, navigator.xr, immersive-vr)
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        if (!cancelled) {
          setVrSupported(false);
          setVrAvailability({
            status: 'insecure-context',
            reason: 'Требуется HTTPS или localhost',
          });
        }
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.xr) {
        if (!cancelled) {
          setVrSupported(false);
          setVrAvailability({
            status: 'no-webxr',
            reason: 'navigator.xr недоступен',
          });
        }
        return;
      }

      try {
        const ok = await navigator.xr.isSessionSupported('immersive-vr');
        if (!cancelled) {
          setVrSupported(ok);
          setVrAvailability(
            ok
              ? { status: 'ready', reason: 'Шлем готов к запуску VR' }
              : {
                  status: 'unsupported',
                  reason: 'isSessionSupported: false (можно попробовать запуск)',
                }
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setVrSupported(false);
          setVrAvailability({
            status: 'error',
            reason: `Ошибка WebXR: ${msg}`,
          });
        }
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  // Подписки на события XR-сессии, потерю WebGL-контекста и асинхронные unhandledrejection
  useEffect(() => {
    const onStart = () => setIsVRPresenting((prev) => (prev ? prev : true));
    const onEnd = () => setIsVRPresenting((prev) => (prev ? false : prev));
    const onContextLost = () => {
      setIsVRPresenting(false);
      setVrError({
        title: 'Контекст WebGL приостановлен',
        message: 'Графический драйвер временно сбросил WebGL-контекст. Идёт восстановление Desktop-режима.',
      });
    };
    const onContextRestored = () => {
      setWebglAvailable(true);
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const errName = reason instanceof Error ? reason.name : 'UnhandledRejection';
      const msg = reason instanceof Error ? reason.message : String(reason ?? '');
      if (/xr|webxr|vr|immersive|referenceSpace|session/i.test(`${errName} ${msg}`)) {
        event.preventDefault();
        setIsVRPresenting(false);
        const staleSession = xrStore.getState().session;
        if (staleSession) {
          void staleSession.end().catch(() => undefined);
        }
        setVrError({
          title: 'Асинхронная ошибка WebXR',
          message: `${msg || 'Сбой драйвера VR'}. Продолжена работа в Desktop-режиме.`,
          diagnostics: {
            isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
            hasNavigatorXr: typeof navigator !== 'undefined' && Boolean(navigator.xr),
            isSessionSupported:
              vrSupportedRef.current === null ? 'не проверялось' : String(vrSupportedRef.current),
            errorName: errName,
            errorMessage: msg || 'Неизвестная асинхронная ошибка WebXR',
          },
        });
      }
    };

    window.addEventListener('webxr-session-start', onStart);
    window.addEventListener('webxr-session-end', onEnd);
    window.addEventListener('webxr-context-lost', onContextLost);
    window.addEventListener('webxr-context-restored', onContextRestored);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    const unsubscribeStore = xrStore.subscribe((state, prevState) => {
      if (state.session && !prevState.session) {
        setIsVRPresenting((prev) => (prev ? prev : true));
      } else if (!state.session && prevState.session) {
        setIsVRPresenting((prev) => (prev ? false : prev));
      }
    });

    return () => {
      window.removeEventListener('webxr-session-start', onStart);
      window.removeEventListener('webxr-session-end', onEnd);
      window.removeEventListener('webxr-context-lost', onContextLost);
      window.removeEventListener('webxr-context-restored', onContextRestored);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      unsubscribeStore();
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
    } else if (viewId === 'view-ritm-200n') {
      setContainmentOpacity((prev) => (prev > 0.65 ? 0.52 : prev));
    } else if (viewId === 'view-reactor-hall') {
      setContainmentOpacity((prev) => (prev > 0.8 ? 0.72 : prev));
    }
    if (view.mode === 'drone') {
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

  // Безопасный запуск/завершение WebXR-сессии строго по клику пользователя.
  // Не блокируем попытку запуска requestSession('immersive-vr') из-за isSessionSupported === false.
  const handleVRClick = useCallback(async () => {
    const secureCtx = typeof window !== 'undefined' ? window.isSecureContext : false;
    const hasXr = typeof navigator !== 'undefined' && Boolean(navigator.xr);

    if (!secureCtx) {
      setVrAvailability({
        status: 'insecure-context',
        reason: 'Требуется HTTPS или localhost',
      });
      setVrError({
        title: 'WebXR заблокирован небезопасным адресом',
        message:
          'Откройте приложение по HTTPS или через http://localhost / http://127.0.0.1. Работа продолжена в Desktop-режиме.',
        diagnostics: {
          isSecureContext: false,
          hasNavigatorXr: hasXr,
          isSessionSupported: 'не проверялось (небезопасный контекст)',
          requestedConfig: 'запрос не выполнялся (требуется HTTPS / localhost)',
          errorName: 'SecurityError',
          errorMessage: 'WebXR API требует защищённый контекст (HTTPS или localhost).',
        },
      });
      return;
    }

    if (!hasXr || !navigator.xr) {
      setVrAvailability({
        status: 'no-webxr',
        reason: 'navigator.xr недоступен',
      });
      setVrError({
        title: 'WebXR не поддерживается браузером',
        message:
          'В текущем браузере отсутствует navigator.xr. Используйте Chrome / Edge (SteamVR OpenXR) или оставайтесь в Desktop-режиме.',
        diagnostics: {
          isSecureContext: secureCtx,
          hasNavigatorXr: false,
          isSessionSupported: 'недоступно (navigator.xr отсутствует)',
          requestedConfig: 'запрос не выполнялся (navigator.xr отсутствует)',
          errorName: 'NotSupportedError',
          errorMessage: 'navigator.xr не определён в текущем браузере или контексте iframe.',
        },
      });
      return;
    }

    // Вспомогательная очистка незавершённой XR-сессии (как в xrStore, так и в Three.js WebXRManager)
    const cleanupDanglingSession = async () => {
      const storeSession = xrStore.getState().session ?? null;
      const mgrSession = glRef.current?.xr?.getSession?.() ?? null;
      const seen = new Set<XRSession>();
      for (const s of [storeSession, mgrSession]) {
        if (s && !seen.has(s)) {
          seen.add(s);
          try {
            await s.end();
          } catch {
            // Игнорируем ошибку закрытия уже остановленной сессии
          }
        }
      }
    };

    const activeSession = xrStore.getState().session ?? glRef.current?.xr?.getSession?.() ?? null;
    if (activeSession) {
      try {
        await activeSession.end();
      } catch {
        setIsVRPresenting(false);
      }
      return;
    }

    const primaryConfigDesc =
      "1) requestSession('immersive-vr', { optionalFeatures: ['local-floor'] }), requiredFeatures: [], refSpace: 'local-floor'";
    const attemptLogs: string[] = [];

    // Попытка 1: облегчённый профиль без requiredFeatures и без bounded-floor
    try {
      if (!isXRPresentingOrActive(glRef.current?.xr)) {
        setXrRefSpaceType('local-floor');
        if (glRef.current?.xr) {
          glRef.current.xr.enabled = true;
          safeSetReferenceSpaceType(glRef.current.xr, 'local-floor');
        }
      }

      await xrStore.enterVR();
      setVrSupported(true);
      setVrAvailability({
        status: 'ready',
        reason: 'VR-сессия активна',
      });
      return;
    } catch (primaryErr: unknown) {
      await cleanupDanglingSession();

      const primaryName = primaryErr instanceof Error ? primaryErr.name : 'Error';
      const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      attemptLogs.push(`${primaryConfigDesc} -> ${primaryName}: ${primaryMsg}`);

      let finalName = primaryName;
      let finalMsg = primaryMsg;

      // Попытка 2: базовый вызов navigator.xr.requestSession('immersive-vr') БЕЗ опций
      // и без необязательных фич, с привязкой к Three.js gl.xr и пространству 'local' (рост 1.65 м сохраняется).
      const shouldTryBareSession =
        primaryName === 'NotSupportedError' ||
        /not supported|configuration|feature|reference|local-floor|bounded-floor|session/i.test(
          `${primaryName} ${primaryMsg}`
        );

      if (shouldTryBareSession && !isXRPresentingOrActive(glRef.current?.xr)) {
        const bareConfigDesc =
          "2) requestSession('immersive-vr') без опций, refSpace: 'local'";
        let fallbackSession: XRSession | null = null;
        try {
          fallbackSession = await navigator.xr.requestSession('immersive-vr');
          const xrManager = glRef.current?.xr;
          if (!xrManager) {
            throw new Error('WebXRManager рендерера не инициализирован');
          }
          setXrRefSpaceType('local');
          xrManager.enabled = true;
          safeSetReferenceSpaceType(xrManager, 'local');
          try {
            xrManager.setFramebufferScaleFactor?.(0.72);
          } catch {
            // Игнорируем, если драйвер не поддерживает масштабирование буфера
          }
          // Привязываем полученную сессию напрямую к Three.js gl.xr; xrStore подхватит её через событие sessionstart
          await xrManager.setSession(fallbackSession);
          setVrSupported(true);
          setVrAvailability({
            status: 'ready',
            reason: 'VR-сессия активна (базовый профиль local)',
          });
          return;
        } catch (fallbackErr: unknown) {
          if (fallbackSession) {
            try {
              await fallbackSession.end();
            } catch {
              // Игнорируем ошибку очистки неудавшейся фолбэк-сессии
            }
          }
          await cleanupDanglingSession();
          finalName = fallbackErr instanceof Error ? fallbackErr.name : 'Error';
          finalMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          attemptLogs.push(`${bareConfigDesc} -> ${finalName}: ${finalMsg}`);
        }
      }

      // Запрашиваем актуальный статус isSessionSupported для точной диагностики в модальном окне
      let supportedNow: boolean | null = null;
      let supportedText = 'неизвестно';
      try {
        supportedNow = await navigator.xr.isSessionSupported('immersive-vr');
        supportedText = String(supportedNow);
        setVrSupported(supportedNow);
        setVrAvailability(
          supportedNow
            ? { status: 'ready', reason: 'Шлем обнаружен, ошибка запуска сессии' }
            : {
                status: 'unsupported',
                reason: 'isSessionSupported: false (можно попробовать запуск)',
              }
        );
      } catch (supErr: unknown) {
        const supMsg = supErr instanceof Error ? supErr.message : String(supErr);
        supportedText = `ошибка (${supMsg})`;
      }

      setIsVRPresenting(false);
      setVrError({
        title:
          supportedNow === false || /NotFoundError|NotSupportedError/i.test(finalName)
            ? 'VR-гарнитура не обнаружена или профиль не поддерживается'
            : 'Не удалось войти в VR',
        message:
          'Запрос immersive-vr сессии отклонён текущим рантаймом даже в базовой конфигурации без опций. Проверьте активный OpenXR-рантайм в SteamVR и браузер (Chrome/Edge), либо продолжайте в Desktop-режиме.',
        diagnostics: {
          isSecureContext: secureCtx,
          hasNavigatorXr: hasXr,
          isSessionSupported: supportedText,
          requestedConfig: attemptLogs.join('\n'),
          errorName: finalName,
          errorMessage: finalMsg,
        },
      });
    }
  }, []);

  const handlePointerLockChange = useCallback((locked: boolean) => {
    setPointerLocked(locked);
  }, []);

  // Стабилизируем ссылки координат, чтобы вход в VR не перезапускал эффекты сцены и контроллеров
  const vrSpawnTarget = useMemo<[number, number, number]>(
    () =>
      activeViewData.mode === 'walk'
        ? [activeViewData.cameraPos[0], activeViewData.floorY, activeViewData.cameraPos[2]]
        : activeViewData.cameraPos[1] <= 18
        ? [activeViewData.cameraPos[0], activeViewData.floorY, activeViewData.cameraPos[2]]
        : [-32, 0.4, -18],
    [activeViewData.mode, activeViewData.cameraPos, activeViewData.floorY]
  );

  const orbitLookAt = useMemo<[number, number, number]>(
    () => activeViewData.target ?? [0, activeViewData.floorY, 0],
    [activeViewData.target, activeViewData.floorY]
  );

  const safeWalkFallbackPos = useMemo<[number, number, number]>(() => {
    const cx = THREE.MathUtils.clamp(activeViewData.cameraPos[0], -106, 106);
    const cz = THREE.MathUtils.clamp(activeViewData.cameraPos[2], -106, 106);
    return [cx, activeViewData.floorY + 1.65, cz];
  }, [activeViewData.cameraPos, activeViewData.floorY]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#dce8f2] dark:bg-[#1a2430] transition-colors duration-200">
      {webglAvailable ? (
        <ErrorBoundary FallbackComponent={CanvasErrorFallback} resetKey={reloadKey}>
          <div id="vver-canvas-wrapper" className="h-full w-full">
            <Canvas
              frameloop="always"
              shadows
              camera={{ position: [-32, 2.05, -18], fov: 55, near: 0.15, far: 1400 }}
              gl={{
                antialias: false,
                alpha: false,
                stencil: false,
                depth: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.05,
                powerPreference: 'high-performance',
              }}
              dpr={[1, 1.25]}
              onCreated={({ gl, scene, camera }) => {
                glRef.current = gl;
                if (gl.xr) {
                  gl.xr.enabled = true;
                }
                const bgColor = new THREE.Color(theme === 'dark' ? '#1a2430' : '#dce8f2');
                scene.background = bgColor;
            gl.setClearColor(bgColor, 1.0);
            gl.localClippingEnabled = true;
            if (!isXRPresentingOrActive(gl.xr)) {
              gl.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.25));
            }
            gl.domElement.tabIndex = 0;
            gl.domElement.style.outline = 'none';
            camera.near = 0.15;
            camera.far = 1400;
            camera.updateProjectionMatrix();

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
            <SceneAtmosphere theme={theme} />
            <WebXRSceneManager
              activeSpawnPos={vrSpawnTarget}
              floorY={activeViewData.floorY}
              activeViewId={activeViewData.id}
              referenceSpaceType={xrRefSpaceType}
            />

            <ambientLight intensity={theme === 'dark' ? 0.42 : 0.34} color="#ffffff" />
            <hemisphereLight args={['#eef6ff', '#8d96a2', theme === 'dark' ? 0.82 : 0.94]} />
            {/* castShadow остаётся стабильным: в VR рендер теней отключается напрямую через gl.shadowMap без перекомпиляции шейдеров */}
            <directionalLight
              position={[125, 165, 105]}
              intensity={theme === 'dark' ? 1.85 : 2.15}
              color="#fff9ed"
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-camera-left={-125}
              shadow-camera-right={125}
              shadow-camera-top={125}
              shadow-camera-bottom={-125}
              shadow-camera-far={420}
              shadow-bias={-0.0005}
              shadow-normalBias={0.04}
            />
            <directionalLight position={[-120, 95, -110]} intensity={0.62} color="#cfe4ff" />

            <XR store={xrStore}>
              <SceneContent
                reloadKey={reloadKey}
                containmentOpacity={containmentOpacity}
                shellTransparent={shellTransparent}
                energyFlowActive={energyFlowActive}
                evacuationRoutesActive={evacuationRoutesActive}
                onStatusChange={handleGlbStatusChange}
              />
              <VRControllerManager
                viewTarget={vrSpawnTarget}
                floorY={activeViewData.floorY}
                activeViewId={activeViewData.id}
                referenceSpaceType={xrRefSpaceType}
              />
            </XR>

            <SmoothCameraController
              cameraPos={activeViewData.cameraPos}
              lookAt={orbitLookAt}
              mode={controlMode}
              viewId={activeViewData.id}
              isVRPresenting={isVRPresenting}
            />

            {controlMode === 'drone' ? (
              <DroneFlyByController
                active={activeView === 'view-drone' && !isVRPresenting}
                speedMultiplier={droneSpeed}
                paused={dronePaused}
                scrubProgress={scrubProgress}
                onTelemetryUpdate={setDroneTelemetry}
              />
            ) : controlMode === 'walk' && !isVRPresenting ? (
              <FirstPersonController
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
          </div>
        </ErrorBoundary>
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
        energyFlowActive={energyFlowActive}
        onToggleEnergyFlow={() => setEnergyFlowActive((v) => !v)}
        evacuationRoutesActive={evacuationRoutesActive}
        onToggleEvacuationRoutes={() => setEvacuationRoutesActive((v) => !v)}
        controlMode={controlMode}
        onVRClick={handleVRClick}
        vrSupported={vrSupported}
        vrAvailability={vrAvailability}
        vrError={vrError}
        onClearVrError={() => setVrError(null)}
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
