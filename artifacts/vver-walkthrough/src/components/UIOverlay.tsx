import { useState, useEffect } from 'react';
import {
  Activity, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Cpu, Crosshair, Eye, EyeOff, Footprints, Gauge,
  Info, Layers, Minus, Monitor, Radio, Thermometer, X, Zap, Droplets, Menu, Play, Pause, Compass, Navigation, Video,
} from 'lucide-react';
import { FLOOR_VIEWS, POI_LIST, type POIInfo, type ViewMode } from '@/data/poiData';
import { useTelemetry, type TelemetrySnapshot } from '@/hooks/useTelemetry';
import type { DroneWaymark } from '@/components/DroneFlyByController';

interface UIOverlayProps {
  activeView: string;
  onViewChange: (viewId: string) => void;
  sceneAvailable: boolean;
  pointerLocked: boolean;
  containmentOpacity: number;
  onContainmentOpacityChange: (v: number) => void;
  controlMode: ViewMode;
  onVRClick: () => void;
  vrSupported: boolean | null;
  telemetry?: TelemetrySnapshot;
  // Drone Fly-by props:
  droneSpeed?: number;
  onDroneSpeedChange?: (speed: number) => void;
  dronePaused?: boolean;
  onDroneTogglePause?: () => void;
  droneTelemetry?: {
    t: number;
    altitude: number;
    speedKmh: number;
    headingDeg: number;
    waymark: DroneWaymark;
  } | null;
  onDroneScrub?: (t: number) => void;
}

const panelStyle = 'border border-[#c9d1c6]/15 bg-[#172226]/95 shadow-[0_18px_60px_rgba(4,14,17,.34)] backdrop-blur-xl';

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        background: active ? '#65d6a4' : '#e2a34f',
        boxShadow: `0 0 9px ${active ? '#65d6a4' : '#e2a34f'}`,
        animation: 'signal-pulse 2s ease-in-out infinite',
      }}
    />
  );
}

function TelemetryReadout({
  icon: Icon,
  label,
  value,
  unit,
  color,
  testId,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  unit: string;
  color: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex min-w-0 items-center gap-2.5 border-b border-[#c9d1c6]/10 py-2 last:border-0"
    >
      <Icon size={14} className="shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[.12em] text-[#9caeaa]">
        {label}
      </span>
      <span className="mono whitespace-nowrap text-xs font-medium text-[#f0f0e4]">
        {value}
        <span className="ml-1 text-[9px] text-[#91a19e]">{unit}</span>
      </span>
    </div>
  );
}

function InfoModal({ poi, onClose }: { poi: POIInfo; onClose: () => void }) {
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  const handleClose = () => {
    onClose();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('restore-camera-focus'));
    }
  };
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#091214]/75 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <article
        className={`${panelStyle} panel-enter max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor: `${poi.color}70` }}
      >
        <header className="relative border-b border-[#c9d1c6]/10 px-6 py-5">
          <button
            data-testid="button-close-poi"
            onClick={handleClose}
            aria-label="Close point of interest"
            className="absolute right-4 top-4 rounded-lg p-2 text-[#9caeaa] hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X size={17} />
          </button>
          <p className="mono mb-2 text-[10px] uppercase tracking-[.22em]" style={{ color: poi.color }}>
            {lang === 'en' ? poi.categoryEn : poi.categoryRu}
          </p>
          <h2 className="pr-8 text-xl font-bold tracking-tight text-[#f1f0e5]">
            {lang === 'en' ? poi.titleEn : poi.titleRu}
          </h2>
        </header>
        <div className="flex gap-2 px-6 pt-4">
          {(['en', 'ru'] as const).map((option) => (
            <button
              key={option}
              data-testid={`button-language-${option}`}
              onClick={() => setLang(option)}
              className={`rounded-md px-3 py-1.5 text-xs ${
                lang === option ? 'bg-[#d79b42]/20 text-[#f3bd69]' : 'text-[#92a19f] hover:bg-white/5'
              } cursor-pointer`}
            >
              {option === 'en' ? 'English' : 'Русский'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 px-6 py-4">
          {poi.specs.map((spec) => (
            <div
              key={spec.labelEn}
              className="rounded-lg border border-[#c9d1c6]/10 bg-[#0d181b]/65 px-3 py-2.5"
            >
              <p className="text-[9px] uppercase tracking-wider text-[#90a19c]">
                {lang === 'en' ? spec.labelEn : spec.labelRu}
              </p>
              <p className="mono mt-1 text-sm font-medium" style={{ color: poi.color }}>
                {spec.value}
              </p>
            </div>
          ))}
        </div>
        <p className="px-6 pb-6 text-sm leading-6 text-[#c5d0ca]">
          {lang === 'en' ? poi.descriptionEn : poi.descriptionRu}
        </p>
      </article>
    </div>
  );
}

export default function UIOverlay({
  activeView,
  onViewChange,
  sceneAvailable,
  pointerLocked,
  containmentOpacity,
  onContainmentOpacityChange,
  controlMode,
  onVRClick,
  vrSupported,
  telemetry: propTelemetry,
  droneSpeed = 1.0,
  onDroneSpeedChange,
  dronePaused = false,
  onDroneTogglePause,
  droneTelemetry,
  onDroneScrub,
}: UIOverlayProps) {
  const fallbackTelemetry = useTelemetry();
  const telemetry = propTelemetry ?? fallbackTelemetry;
  // Left HUD panel collapsible state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Right drawer panel for live telemetry & equipment list (starts open, collapsible via button or compact pill)
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  // Global 2D UI visibility toggle (hotkey 'H')
  const [allUIHidden, setAllUIHidden] = useState(false);
  // WebXR VR active session detection for auto-hiding 2D UI
  const [isVRPresenting, setIsVRPresenting] = useState(false);
  const [vrModal, setVrModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });
  const [selectedPOI, setSelectedPOI] = useState<POIInfo | null>(null);

  // 1. Горячая клавиша 'H' (Hide UI) для мгновенного скрытия/показа всех 2D-оверлеев
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем нажатия при вводе в текстовые поля
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'KeyH' || e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'р') {
        e.preventDefault();
        setAllUIHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Автоматическое скрытие 2D UI при старте VR-сессии (WebXR Session) и восстановление при выходе
  useEffect(() => {
    const handleXRStart = () => setIsVRPresenting(true);
    const handleXREnd = () => setIsVRPresenting(false);

    window.addEventListener('webxr-session-start', handleXRStart);
    window.addEventListener('webxr-session-end', handleXREnd);

    return () => {
      window.removeEventListener('webxr-session-start', handleXRStart);
      window.removeEventListener('webxr-session-end', handleXREnd);
    };
  }, []);

  const active = FLOOR_VIEWS.find((item) => item.id === activeView) ?? FLOOR_VIEWS[0];
  const fmt = (value: number, digits = 1) => value.toFixed(digits);

  const choosePOI = (poi: POIInfo) => setSelectedPOI(poi);

  const safeAlert = (msg: string) => {
    try {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(msg);
      }
    } catch {
      // In sandbox iframes, window.alert can be prohibited; caught cleanly
    }
  };

  /**
   * Robust WebXR / OpenXR Initialization & Error Handling:
   * Checks navigator.xr and isSessionSupported('immersive-vr') before launching.
   * Catches runtime errors gracefully without crashing the app.
   */
  const handleEnterVR = async () => {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      const msg = 'WebXR API не поддерживается данным браузером. Используйте Chrome/Edge или браузер VR-шлема.';
      safeAlert(msg);
      setVrModal({
        open: true,
        title: 'WebXR не поддерживается',
        message: msg,
      });
      return;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (supported) {
        // Init WebXR Session safely
        const btn = document.getElementById('vr-btn');
        if (btn) {
          btn.click();
          return;
        }
        await navigator.xr.requestSession('immersive-vr');
      } else {
        const msg = 'VR-оборудование (OpenXR Runtime) не обнаружено. Подключите шлем (Meta Quest / SteamVR).';
        safeAlert(msg);
        setVrModal({
          open: true,
          title: 'VR-оборудование не обнаружено',
          message: msg,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('WebXR Error:', err);
      const msg = 'Ошибка инициализации VR: ' + errMsg;
      safeAlert(msg);
      setVrModal({
        open: true,
        title: 'Ошибка инициализации VR',
        message: msg,
      });
    }
  };

  // 3. Полное скрытие 2D UI при входе в VR-сессию WebXR (display: none / opacity: 0)
  if (isVRPresenting) {
    return <div style={{ display: 'none' }} aria-hidden="true" />;
  }

  // 4. Режим скрытого интерфейса по горячей клавише 'H'
  if (allUIHidden) {
    return (
      <div
        style={{ position: 'fixed', bottom: '24px', left: '20px', zIndex: 100000 }}
        className="pointer-events-auto panel-enter"
      >
        <button
          data-testid="button-unhide-ui"
          onClick={() => setAllUIHidden(false)}
          title="Показать весь интерфейс (Горячая клавиша: H)"
          aria-label="Показать UI"
          className="flex items-center gap-2 rounded-full border border-[#f5c26f]/70 bg-[#101b1e]/95 px-4 py-2.5 text-xs font-bold text-[#f5c26f] shadow-[0_8px_32px_rgba(0,0,0,0.85),0_0_20px_rgba(245,194,111,0.25)] backdrop-blur-2xl transition hover:scale-105 hover:bg-[#1a2b30] cursor-pointer"
        >
          <Eye size={15} />
          <span>Показать UI [H]</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* 1. Small Floating Circular Button on Top-Left Edge: [ ☰ ] / [ ◀ ] */}
      <div
        style={{ position: 'fixed', top: '16px', left: '16px', zIndex: 10000 }}
        className="pointer-events-auto"
      >
        <button
          data-testid="button-toggle-left-panel"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          title={isSidebarOpen ? 'Свернуть панель / Hide Panel' : 'Развернуть панель / Show Panel'}
          aria-label={isSidebarOpen ? 'Свернуть панель / Hide Panel' : 'Развернуть панель / Show Panel'}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f5c26f]/60 bg-[#142024]/95 text-[#f5c26f] shadow-[0_0_22px_rgba(0,0,0,0.65)] backdrop-blur-xl transition hover:scale-110 hover:border-[#f5c26f] hover:bg-[#1f3036] cursor-pointer"
        >
          {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={18} />}
        </button>
      </div>

      {/* 2. Pinned Top-Right Toolbar: Drone Fly-by Mode, Dedicated VR Mode Button & Status */}
      <div
        style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999 }}
        className="pointer-events-auto flex items-center gap-2.5"
      >
        {/* Dedicated Cinematic Drone Fly-by Launcher Button */}
        <button
          data-testid="button-drone-flyby"
          onClick={() => {
            if (activeView === 'view-drone') {
              onViewChange('view-aerial');
            } else {
              onViewChange('view-drone');
            }
          }}
          title="Автоматический дрон-облёт АЭС вокруг реактора и турбинного цеха"
          className={`flex items-center gap-2 rounded-xl border-2 px-3.5 py-2 text-xs font-black tracking-wide shadow-2xl backdrop-blur-2xl transition hover:scale-105 cursor-pointer ${
            activeView === 'view-drone'
              ? 'border-[#f5c26f] bg-[#291f0f]/95 text-[#f5c26f] shadow-[0_0_28px_rgba(245,194,111,0.55)]'
              : 'border-[#58a6ff]/70 bg-[#0c1c2b]/95 text-[#8ec8ff] hover:bg-[#132c45] hover:text-white shadow-[0_0_20px_rgba(88,166,255,0.3)]'
          }`}
        >
          <span className="text-base leading-none">🛸</span>
          <span>{activeView === 'view-drone' ? 'Остановить облёт / Stop Tour' : 'Дрон-облёт / Drone Fly-By'}</span>
        </button>

        {/* Dedicated prominent VR Launcher Button */}
        <button
          data-testid="button-enter-vr-prominent"
          onClick={handleEnterVR}
          title="Войти в режим виртуальной реальности"
          className="flex items-center gap-2 rounded-xl border-2 border-[#62d1a2] bg-[#0d221c]/95 px-3.5 py-2 text-xs font-black tracking-wide text-[#55e4a8] shadow-[0_0_30px_rgba(98,209,162,0.45)] backdrop-blur-2xl transition hover:scale-105 hover:bg-[#16362d] hover:text-white cursor-pointer"
        >
          <span className="text-base leading-none">🥽</span>
          <span>Войти в VR / Enter VR Mode</span>
        </button>

        {/* Hide All UI Toggle Button (HotKey H) */}
        <button
          data-testid="button-hide-all-ui"
          onClick={() => setAllUIHidden(true)}
          title="Скрыть все элементы интерфейса (Горячая клавиша: H)"
          aria-label="Скрыть интерфейс"
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#142024]/95 px-3 py-2 text-xs font-semibold text-[#a9bbae] shadow-lg backdrop-blur-xl transition hover:scale-105 hover:bg-[#1e3036] hover:text-[#f5c26f] cursor-pointer"
        >
          <EyeOff size={14} />
          <span className="hidden sm:inline text-[10px] font-mono">Скрыть [H]</span>
        </button>

        {/* Right Telemetry Drawer Toggle Button */}
        <div className={`${panelStyle} flex items-center gap-2 rounded-xl px-3 py-2`}>
          <StatusDot active={telemetry.safetyMode === 'NORMAL'} />
          <div className="hidden md:block">
            <p data-testid="status-active-view" className="text-[10px] font-bold text-[#e9eee7] truncate max-w-[140px]">
              {active.label.split('/')[0]}
            </p>
          </div>
          <button
            data-testid="button-toggle-navigation"
            onClick={() => setRightPanelOpen((open) => !open)}
            aria-label={rightPanelOpen ? 'Collapse telemetry panel' : 'Expand telemetry panel'}
            title="Телеметрия и оборудование"
            className="ml-1 rounded-md p-1.5 text-[#c4d0c9] hover:bg-white/10 cursor-pointer"
          >
            {rightPanelOpen ? <ChevronUp size={16} /> : <Layers size={16} />}
          </button>
        </div>
      </div>

      {/* 3. Left HUD Panel: Slides entirely off-screen via transform: translateX(-100%) with 0.3s ease */}
      <nav
        aria-label="Навигация и ракурсы"
        style={{
          position: 'fixed',
          top: '68px',
          left: '16px',
          zIndex: 9999,
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-120%)',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          pointerEvents: isSidebarOpen ? 'auto' : 'none',
          opacity: isSidebarOpen ? 1 : 0,
        }}
        className="w-[min(320px,calc(100vw-32px))] flex flex-col gap-2"
      >
        <div className={`${panelStyle} p-3.5 rounded-2xl flex flex-col gap-2 max-h-[calc(100dvh-90px)] overflow-y-auto`}>
          {/* Header Title inside panel */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-[#d79b42]/15 text-[#e5aa52]">
                <Activity size={14} />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#edf0e8]">
                  Ракурсы / Viewpoints
                </p>
                <p className="mono text-[8px] uppercase tracking-[.12em] text-[#81918d]">
                  VVER-1000 · Genplan Twin
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-[#81918d] hover:text-[#f5c26f] text-xs px-1.5 py-0.5 rounded cursor-pointer"
              title="Свернуть"
            >
              ✕
            </button>
          </div>

          {/* Expanded Cinematic Viewpoints List */}
          <div className="flex flex-col gap-1.5 pt-1">
            {FLOOR_VIEWS.map((view, idx) => {
              const selected = activeView === view.id;
              return (
                <button
                  key={view.id}
                  data-testid={`button-view-${view.id}`}
                  aria-pressed={selected}
                  onClick={(e) => {
                    (e.currentTarget as HTMLElement)?.blur();
                    onViewChange(view.id);
                    window.dispatchEvent(new CustomEvent('restore-camera-focus'));
                  }}
                  className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left shadow-lg backdrop-blur-xl transition cursor-pointer ${
                    selected
                      ? 'border-[#f5c26f] bg-[#1d2b30]/95 shadow-[0_0_20px_rgba(245,194,111,0.25)] text-[#f5c26f]'
                      : 'border-[#c9d1c6]/15 bg-[#141f23]/90 text-[#d4ded7] hover:border-[#f5c26f]/40 hover:bg-[#1a272c]'
                  }`}
                >
                  <span
                    className={`mono grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[9px] font-bold ${
                      selected
                        ? 'bg-[#d69a43]/25 text-[#f5c26f]'
                        : 'bg-white/[.06] text-[#869692] group-hover:text-white'
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-tight">
                    {view.label}
                  </span>
                  {view.mode === 'orbit' ? (
                    <Eye size={13} className={selected ? 'text-[#f5c26f]' : 'text-[#6f7e7a]'} />
                  ) : view.mode === 'drone' ? (
                    <Video size={13} className={selected ? 'text-[#f5c26f]' : 'text-[#8ec8ff]'} />
                  ) : (
                    <Footprints size={13} className={selected ? 'text-[#f5c26f]' : 'text-[#6f7e7a]'} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Containment Shell Opacity Slider */}
          <div className="mt-2 pt-2.5 border-t border-white/10 px-1">
            <div className="mb-1.5 flex items-center justify-between text-[10px]">
              <span className="text-[#9caeaa] uppercase tracking-wider text-[9px] font-semibold">
                Купол оболочки (Cutaway)
              </span>
              <span className="mono text-[#f5c26f] font-bold">{Math.round(containmentOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={containmentOpacity}
              onChange={(e) => onContainmentOpacityChange(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#d69a43]"
            />
          </div>
        </div>
      </nav>

      {/* 4. First-Person Walk Mode Crosshair & Click-to-Start Modal */}
      {controlMode === 'walk' && (
        <>
          <div
            data-testid="walk-crosshair"
            aria-hidden="true"
            className="pointer-events-none fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 font-mono text-2xl leading-none text-[#f6c36b]"
          >
            +
          </div>
          {!pointerLocked && (
            <div
              id="lock-anchor"
              data-testid="button-click-to-walk"
              role="button"
              tabIndex={0}
              aria-label="Кликните по экрану для включения обзора мышью (WASD — перемещение, Esc — выход)"
              onClick={() => {
                window.dispatchEvent(new Event('request-pointer-lock'));
                const canvas = document.querySelector('canvas');
                if (canvas && document.pointerLockElement !== canvas) {
                  try {
                    canvas.requestPointerLock();
                  } catch {
                    // handled
                  }
                }
              }}
              className="panel-enter fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
            >
              <div
                className="relative mx-4 max-w-lg rounded-2xl border-2 border-[#e2a34f]/80 bg-[#142024]/95 p-6 text-center shadow-[0_0_60px_rgba(226,163,79,0.35)] backdrop-blur-2xl"
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new Event('request-pointer-lock'));
                  const canvas = document.querySelector('canvas');
                  if (canvas) canvas.requestPointerLock();
                }}
              >
                <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e2a34f]/20 text-[#f5c26f] shadow-inner ring-1 ring-[#e2a34f]/50 animate-pulse">
                  <Crosshair size={28} />
                </div>
                <h3 className="text-base font-extrabold tracking-tight text-[#f5f4ed] sm:text-lg">
                  Кликните по экрану для включения обзора мышью (WASD — перемещение, Esc — выход)
                </h3>
                <p className="mt-2 text-xs text-[#a3b3ae]">
                  Плавный обзор от первого лица (высота глаз 1.6 м). Для выхода из режима управления нажмите{' '}
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-[#f5c26f]">
                    Esc
                  </kbd>
                  .
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#f5c26f]">
                  <span className="rounded-lg border border-[#e2a34f]/40 bg-[#e2a34f]/15 px-3 py-1 font-mono">
                    W A S D
                  </span>
                  <span className="text-[#81908b]">движение</span>
                  <span className="mx-1 text-[#4a5855]">·</span>
                  <span className="rounded-lg border border-[#e2a34f]/40 bg-[#e2a34f]/15 px-3 py-1 font-mono">
                    Мышь
                  </span>
                  <span className="text-[#81908b]">обзор</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 5. Fallback Alert Modal for Non-VR Browser / OpenXR Runtime Status */}
      {vrModal.open && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
          onClick={() => setVrModal((prev) => ({ ...prev, open: false }))}
        >
          <div
            className={`${panelStyle} max-w-md w-full rounded-2xl p-6 border-2 border-[#62d1a2]/60 text-center shadow-[0_0_50px_rgba(98,209,162,0.35)]`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#62d1a2]/20 text-[#6ce4b3]">
              <span className="text-2xl">🥽</span>
            </div>
            <h3 className="text-lg font-bold text-white">
              {vrModal.title || 'Подключите VR-шлем для погружения'}
            </h3>
            <p className="mt-2.5 text-xs leading-relaxed text-[#b4c5be]">
              {vrModal.message ||
                'WebXR гарнитура (Meta Quest 2/3/Pro, HTC Vive, Pico 4) не обнаружена в текущем браузере. Для входа в виртуальную реальность откройте проект в браузере шлема (Oculus Browser).'}
            </p>
            <p className="mt-2 text-xs font-semibold text-[#6ce4b3]">
              Вы можете продолжить исследование реактора прямо сейчас в 3D (WASD + мышь).
            </p>
            <button
              onClick={() => setVrModal((prev) => ({ ...prev, open: false }))}
              className="mt-5 w-full rounded-xl bg-[#62d1a2] py-2.5 text-xs font-bold text-[#0c1815] shadow-lg transition hover:bg-[#78e8b9] cursor-pointer"
            >
              Понятно / Продолжить в 3D
            </button>
          </div>
        </div>
      )}

      {/* 6. Right Drawer Panel with Live Plant Telemetry & Equipment Index */}
      <aside
        className={`fixed bottom-4 right-0 top-[76px] z-30 w-[min(340px,calc(100vw-24px))] overflow-hidden transition-transform duration-300 sm:bottom-5 sm:top-[82px] ${
          rightPanelOpen ? 'translate-x-0' : 'translate-x-[105%]'
        }`}
      >
        <div className={`${panelStyle} panel-enter mr-3 flex h-full flex-col overflow-y-auto rounded-2xl sm:mr-5`}>
          <section className="border-b border-[#c9d1c6]/10 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor size={14} className="text-[#62d1a2]" />
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#a9b6af]">
                  Параметры энергоблока
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="mono text-[9px] text-[#71d1a6] mr-1 hidden sm:inline">LIVE / 0.8 s</span>
                {/* Кнопка сворачивания окна в плашку [ — ] */}
                <button
                  data-testid="button-collapse-telemetry"
                  onClick={() => setRightPanelOpen(false)}
                  title="Свернуть окно в компактную плашку [ — ] (Горячая клавиша: H)"
                  aria-label="Свернуть окно в компактную плашку"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[#a3b6ae] hover:bg-white/15 hover:text-[#f5c26f] transition cursor-pointer"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                {/* Кнопка скрыть [ 👁 ] */}
                <button
                  data-testid="button-hide-telemetry"
                  onClick={() => setRightPanelOpen(false)}
                  title="Скрыть окно параметров [ 👁 ]"
                  aria-label="Скрыть окно параметров"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[#a3b6ae] hover:bg-white/15 hover:text-[#62d1a2] transition cursor-pointer"
                >
                  <EyeOff size={13} />
                </button>
                {/* Кнопка закрыть [ X ] */}
                <button
                  data-testid="button-close-telemetry"
                  onClick={() => setRightPanelOpen(false)}
                  title="Закрыть окно телеметрии [ X ]"
                  aria-label="Закрыть окно"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[#a3b6ae] hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            <TelemetryReadout
              testId="status-neutron-flux"
              icon={Zap}
              label="Нейтронный поток"
              value={fmt(telemetry.neutronFlux)}
              unit="% ном"
              color="#e2b25c"
            />
            <TelemetryReadout
              testId="status-primary-temp"
              icon={Thermometer}
              label="Температура 1-го контура"
              value={fmt(telemetry.primaryTemp)}
              unit="°C"
              color="#df8761"
            />
            <TelemetryReadout
              testId="status-primary-pressure"
              icon={Gauge}
              label="Давление 1-го контура"
              value={fmt(telemetry.primaryPressure, 2)}
              unit="МПа"
              color="#dca452"
            />
            <TelemetryReadout
              testId="status-flow-rate"
              icon={Droplets}
              label="Расход теплоносителя"
              value={fmt(telemetry.flowRate)}
              unit="% ном"
              color="#73bfc1"
            />
            <TelemetryReadout
              testId="status-steam-pressure"
              icon={Activity}
              label="Давление пара (2 контур)"
              value={fmt(telemetry.steamPressure, 2)}
              unit="МПа"
              color="#7bd09f"
            />
            <TelemetryReadout
              testId="status-grid-output"
              icon={Zap}
              label="Мощность генератора"
              value={fmt(telemetry.gridPower, 0)}
              unit="МВт"
              color="#aac6a7"
            />
          </section>

          <section className="border-b border-[#c9d1c6]/10 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <Cpu size={13} className="text-[#d8a556]" />
              <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#a9b6af]">
                Каналы безопасности (СУ ТБ)
              </p>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['A', 'B', 'C', 'D'] as const).map((train, index) => {
                const available = [
                  telemetry.dcsBusA,
                  telemetry.dcsBusB,
                  telemetry.dcsBusC,
                  telemetry.dcsBusD,
                ][index];
                return (
                  <div
                    key={train}
                    data-testid={`status-train-${train.toLowerCase()}`}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-white/[.07] bg-[#0b1518]/60 py-2"
                  >
                    <StatusDot active={available} />
                    <span className="mono text-[9px] text-[#b5c1b9]">TR-{train}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-[#0b1518]/60 px-2.5 py-2">
              <span className="text-[9px] uppercase tracking-wider text-[#81908b]">Состояние системы</span>
              <span
                data-testid="status-safety-summary"
                className={`mono text-[10px] font-medium ${
                  telemetry.safetyMode === 'NORMAL' ? 'text-[#71d1a6]' : 'text-[#edbd63]'
                }`}
              >
                {telemetry.safetyMode}
              </span>
            </div>
          </section>

          <section className="border-b border-[#c9d1c6]/10 px-4 py-3">
            <div className="mb-2 flex items-center gap-2">
              <Info size={13} className="text-[#a8b6b2]" />
              <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#a9b6af]">
                Узлы энергоблока (POI)
              </p>
            </div>
            <div className="space-y-0.5">
              {POI_LIST.map((poi) => (
                <button
                  key={poi.id}
                  data-testid={`button-poi-${poi.id}`}
                  onClick={() => choosePOI(poi)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[10px] text-[#c5d0c9] transition hover:bg-white/[.05] hover:text-white cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: poi.color }} />
                  {poi.titleRu}
                  <span className="ml-auto text-[#72817c]">›</span>
                </button>
              ))}
            </div>
          </section>

          <footer className="mt-auto border-t border-[#c9d1c6]/10 px-4 py-3">
            <p className="mono text-[8px] uppercase tracking-[.12em] text-[#72817c]">
              VVER-1000/1200 · Genplan Digital Twin
            </p>
          </footer>
        </div>
      </aside>

      {/* 7. Компактная плашка / иконка в правом нижнем углу экрана при свернутом окне */}
      {!rightPanelOpen && !allUIHidden && !isVRPresenting && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '20px',
            zIndex: 9990,
          }}
          className="pointer-events-auto panel-enter"
        >
          <button
            data-testid="button-expand-telemetry-pill"
            onClick={() => setRightPanelOpen(true)}
            title="Развернуть окно параметров энергоблока ВВЭР-1000 и узлов POI"
            aria-label="Телеметрия ВВЭР-1000 — развернуть"
            className="group flex items-center gap-2.5 rounded-full border border-[#62d1a2]/60 bg-[#0c1a17]/95 px-4 py-2.5 text-xs font-bold text-[#e1eee7] shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(98,209,162,0.25)] backdrop-blur-2xl transition-all duration-200 hover:scale-105 hover:border-[#62d1a2] hover:bg-[#142e26] hover:shadow-[0_0_28px_rgba(98,209,162,0.45)] cursor-pointer"
          >
            <StatusDot active={telemetry.safetyMode === 'NORMAL'} />
            <div className="flex items-center gap-1.5">
              <span className="mono font-bold tracking-tight text-[#62d1a2]">
                Телеметрия ВВЭР-1000
              </span>
              <span className="mono text-[10px] text-[#9bb3ab] hidden sm:inline">
                {telemetry.gridPower.toFixed(0)} МВт
              </span>
            </div>
            <span
              className="mono flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[9px] text-[#86e2b6] group-hover:bg-[#62d1a2]/25 group-hover:text-white transition"
            >
              ▼
            </span>
          </button>
        </div>
      )}

      {/* 4. Cinematic Drone Tour Overhead Telemetry Display */}
      {controlMode === 'drone' && (
        <div
          style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 9998 }}
          className="pointer-events-auto flex flex-col items-center gap-2 max-w-[92vw]"
        >
          {/* Top Banner with Recording indicator and Altitude/Speed/Heading */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-full border border-white/15 bg-[#091519]/90 px-4 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
            <span className="flex items-center gap-1.5 mono text-[10px] font-extrabold uppercase tracking-widest text-[#ff5a5a]">
              <span className="h-2 w-2 rounded-full bg-[#ff4d4d] animate-pulse shadow-[0_0_8px_#ff4d4d]" />
              REC · DRONE CAM
            </span>
            <span className="h-3 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-3 mono text-[11px] font-bold text-[#e1ece6]">
              <span className="text-[#62d1a2]">
                ALT <span className="text-white">{droneTelemetry?.altitude ?? 56}m</span>
              </span>
              <span className="text-[#58a6ff]">
                SPD <span className="text-white">{droneTelemetry?.speedKmh ?? 36} km/h</span>
              </span>
              <span className="text-[#f5c26f]">
                HDG <span className="text-white">{droneTelemetry?.headingDeg ?? 180}°</span>
              </span>
            </div>
          </div>

          {/* Current Landmark Sector Badge */}
          {droneTelemetry?.waymark && (
            <div className="flex flex-col items-center rounded-xl border border-[#f5c26f]/30 bg-[#121c20]/90 px-4 py-1 shadow-lg backdrop-blur-xl text-center">
              <span className="text-xs font-black tracking-wide text-[#f5c26f]">
                {droneTelemetry.waymark.titleRu}
              </span>
              <span className="mono text-[9px] text-[#9bb0a8]">
                {droneTelemetry.waymark.subRu}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 5. Bottom Cinema Flight Control Dock (Play, Speed, Scrub, Exit) */}
      {controlMode === 'drone' && (
        <div
          style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 9998 }}
          className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0d181b]/95 p-2 px-3.5 shadow-[0_18px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl max-w-[95vw]"
        >
          {/* Play/Pause Button */}
          <button
            data-testid="button-drone-play-pause"
            onClick={onDroneTogglePause}
            title={dronePaused ? 'Возобновить облёт / Resume Tour' : 'Приостановить облёт / Pause Tour'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f5c26f]/40 bg-[#f5c26f]/15 text-[#f5c26f] transition hover:scale-105 hover:bg-[#f5c26f]/25 cursor-pointer"
          >
            {dronePaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
          </button>

          {/* Speed Multiplier Toggles */}
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
            {[0.5, 1.0, 1.5, 2.0].map((s) => (
              <button
                key={s}
                data-testid={`button-drone-speed-${s}`}
                onClick={() => onDroneSpeedChange?.(s)}
                className={`rounded px-2 py-0.5 mono text-[10px] font-bold transition cursor-pointer ${
                  droneSpeed === s
                    ? 'bg-[#f5c26f] text-black shadow-[0_0_10px_rgba(245,194,111,0.5)]'
                    : 'text-[#8fa39b] hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Timeline Scrubber */}
          <div className="flex items-center gap-2 px-1 w-36 sm:w-56 md:w-72">
            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={droneTelemetry?.t ?? 0}
              onChange={(e) => onDroneScrub?.(parseFloat(e.target.value))}
              aria-label="Временная шкала облёта"
              className="w-full accent-[#f5c26f] cursor-pointer h-1.5 bg-white/15 rounded-lg"
            />
            <span className="mono text-[10px] font-bold text-[#c2d0c8] shrink-0">
              {Math.round((droneTelemetry?.t ?? 0) * 100)}%
            </span>
          </div>

          {/* Exit Drone Mode Button */}
          <button
            data-testid="button-drone-exit"
            onClick={() => onViewChange('view-aerial')}
            title="Выйти в свободный обзор"
            className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[.06] px-3 py-1.5 text-[11px] font-bold text-[#e1ece6] transition hover:bg-white/15 hover:text-white cursor-pointer"
          >
            <X size={14} />
            <span className="hidden sm:inline">Выйти / Exit</span>
          </button>
        </div>
      )}

      {selectedPOI && <InfoModal poi={selectedPOI} onClose={() => setSelectedPOI(null)} />}
    </>
  );
}
