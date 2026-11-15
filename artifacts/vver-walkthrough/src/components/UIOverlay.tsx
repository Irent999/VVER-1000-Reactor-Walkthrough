import { useState, useEffect, memo, useCallback } from 'react';
import {
  Activity, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Cpu, Crosshair, Eye, EyeOff, Footprints, Gauge,
  Info, Layers, Minus, Monitor, Radio, Thermometer, X, Zap, Droplets, Menu, Play, Pause, Compass, Navigation, Video,
  Flame, ShieldAlert,
} from 'lucide-react';
import { FLOOR_VIEWS, POI_LIST, type POIInfo, type ViewMode } from '@/data/poiData';
import { useTelemetry, type TelemetrySnapshot } from '@/hooks/useTelemetry';
import type { DroneWaymark } from '@/components/DroneFlyByController';
import { reactorStateManager } from '@/scene/reactorStateManager';
import { emergencySiren } from '@/components/EmergencyAlarmSystem';
import type { RenderVisualizationMode } from '@/components/VisualizationModeManager';

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
  // Visual Mode Switcher props:
  renderMode?: RenderVisualizationMode;
  onRenderModeChange?: (mode: RenderVisualizationMode) => void;
  // Shadows & Performance:
  enableShadows?: boolean;
  onToggleShadows?: () => void;
  // Walk / Orbit toggle:
  onToggleWalkMode?: () => void;
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

interface ViewpointsListProps {
  floorViews: typeof FLOOR_VIEWS;
  activeView: string;
  onViewChange: (viewId: string) => void;
}

const GROUP_HEADERS: Array<{ key: 'overview' | 'vver'; label: string }> = [
  { key: 'overview', label: 'Обзор, разрез и обход' },
  { key: 'vver', label: 'Узлы сборки и БЩУ' },
];

const MemoizedViewpointsList = memo(function ViewpointsList({
  floorViews,
  activeView,
  onViewChange,
}: ViewpointsListProps) {
  let globalIndex = 0;

  return (
    <div className="flex flex-col gap-2 pt-1">
      {GROUP_HEADERS.map((group) => {
        const items = floorViews.filter((v) => v.group === group.key);
        if (items.length === 0) return null;

        return (
          <div key={group.key} className="flex flex-col gap-1">
            <p className="px-1 pt-1 text-[9px] font-extrabold uppercase tracking-[.14em] text-[#7e918d]">
              {group.label}
            </p>
            {items.map((view) => {
              globalIndex += 1;
              const numLabel = globalIndex < 10 ? `0${globalIndex}` : `${globalIndex}`;
              const selected = activeView === view.id;

              return (
                <button
                  key={view.id}
                  data-testid={`button-view-${view.id}`}
                  aria-pressed={selected}
                  onClick={(e) => {
                    (e.currentTarget as HTMLElement)?.blur();
                    onViewChange(view.id);
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('restore-camera-focus'));
                    }
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
                    {numLabel}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-tight">
                    {view.label}
                  </span>
                  {view.mode === 'orbit' ? (
                    <Eye size={13} className={selected ? 'text-[#f5c26f]' : 'text-[#6f7e7a]'} />
                  ) : view.mode === 'drone' ? (
                    <Video size={13} className={selected ? 'text-[#f5c26f]' : 'text-[#8ec8ff]'} />
                  ) : (
                    <Footprints size={13} className={selected ? 'text-[#f5c26f]' : 'text-[#62d1a2]'} />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
});

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
  renderMode = 'standard',
  onRenderModeChange,
  enableShadows = true,
  onToggleShadows,
  onToggleWalkMode,
}: UIOverlayProps) {
  const fallbackTelemetry = useTelemetry();
  const telemetry = propTelemetry ?? fallbackTelemetry;
  // Left HUD panel collapsible state (isCollapsed provides zero re-renders & display: none when collapsed)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isSidebarOpen = !isCollapsed;
  const toggleSidebar = useCallback(() => setIsCollapsed((prev) => !prev), []);
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

  // Состояние аварийной защиты АЗ-5
  const [scramActive, setScramActive] = useState(reactorStateManager.vverState.scramActive);
  const [sirenMuted, setSirenMuted] = useState(false);
  const [safetyFlapOpen, setSafetyFlapOpen] = useState(false);

  useEffect(() => {
    const unsub = reactorStateManager.subscribeAll(() => {
      setScramActive(reactorStateManager.vverState.scramActive);
    });
    return unsub;
  }, []);

  const handleTriggerAZ5 = () => {
    reactorStateManager.dispatch('vver1000', 'SCRAM_TRIP');
    reactorStateManager.dispatch('ritm200n', 'SCRAM_TRIP');
  };

  const handleResetAZ5 = () => {
    reactorStateManager.dispatch('vver1000', 'RESET_SCRAM');
    reactorStateManager.dispatch('ritm200n', 'RESET_SCRAM');
  };

  const handleToggleSirenMute = () => {
    const next = !sirenMuted;
    setSirenMuted(next);
    emergencySiren.setMute(next);
  };

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
      if (e.code === 'KeyV' || e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'м') {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
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

  /**
   * Robust WebXR / OpenXR Initialization & Error Handling:
   * Checks navigator.xr and isSessionSupported('immersive-vr') before launching.
   * Catches runtime errors gracefully without crashing the app.
   */
  const handleEnterVR = async () => {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      const msg = 'WebXR API не поддерживается данным браузером. Используйте Chrome/Edge или браузер VR-шлема.';
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
        const btn = document.getElementById('vr-btn');
        if (btn) {
          btn.click();
          return;
        }
        await navigator.xr.requestSession('immersive-vr');
      } else {
        const msg = 'VR-оборудование (OpenXR Runtime) не обнаружено. Подключите шлем (Meta Quest / SteamVR).';
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
      {/* Emergency AZ-5 Top Banner when scramActive */}
      {scramActive && (
        <aside
          aria-label="Система аварийной защиты"
          style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 100000 }}
          className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl border-2 border-red-500 bg-red-950/95 text-white shadow-[0_0_35px_rgba(239,68,68,0.7)] backdrop-blur-2xl animate-pulse"
        >
          <div className="flex items-center gap-2 font-black text-xs tracking-wider uppercase">
            <ShieldAlert size={18} className="text-red-400" />
            <span>АВАРИЙНАЯ ЗАЩИТА АЗ-5 АКТИВИРОВАНА — СБРОС СТЕРЖНЕЙ СУЗ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetAZ5}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition shadow cursor-pointer"
              title="Сбросить статус тревоги и взвести стержни СУЗ"
            >
              Взвести СУЗ
            </button>
            <button
              onClick={handleToggleSirenMute}
              className="px-2 py-1 rounded-lg bg-black/50 hover:bg-black/70 text-xs font-medium text-slate-200 transition cursor-pointer"
              title="Отключить/включить звук сирены"
            >
              {sirenMuted ? '🔇 Сирена: Выкл' : '🔊 Сирена: Вкл'}
            </button>
          </div>
        </aside>
      )}

      {/* 1. Small Floating Circular Button on Top-Left Edge: [ ☰ ] / [ ◀ ] */}
      <div
        style={{ position: 'fixed', top: '16px', left: '16px', zIndex: 10000 }}
        className="pointer-events-auto"
      >
        <button
          data-testid="button-toggle-left-panel"
          onClick={toggleSidebar}
          title={isCollapsed ? 'Развернуть панель / Show Panel (V)' : 'Свернуть панель / Hide Panel (V)'}
          aria-label={isCollapsed ? 'Развернуть панель / Show Panel' : 'Свернуть панель / Hide Panel'}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f5c26f]/60 bg-[#142024]/95 text-[#f5c26f] shadow-[0_0_22px_rgba(0,0,0,0.65)] backdrop-blur-xl transition hover:scale-110 hover:border-[#f5c26f] hover:bg-[#1f3036] cursor-pointer"
        >
          {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Floating edge tab when collapsed to easily expand without aiming at top button */}
      {isCollapsed && !allUIHidden && (
        <button
          data-testid="button-expand-viewpoints"
          onClick={() => setIsCollapsed(false)}
          title="Развернуть ракурсы (горячая клавиша V)"
          aria-label="Развернуть меню ракурсов"
          className="pointer-events-auto fixed top-[68px] left-0 z-[9999] flex items-center gap-1.5 rounded-r-xl border-y border-r border-[#f5c26f]/40 bg-[#142024]/95 px-2.5 py-2 text-[#f5c26f] shadow-[0_4px_22px_rgba(0,0,0,0.65)] backdrop-blur-xl transition hover:border-[#f5c26f] hover:bg-[#1f3036] hover:translate-x-1 cursor-pointer group"
        >
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition" />
          <span className="text-[11px] font-bold tracking-tight">Ракурсы</span>
          <span className="mono text-[9px] rounded bg-white/10 px-1 py-0.5 text-[#a8b8b3]">V</span>
        </button>
      )}

      {/* 2. Pinned Top-Right Toolbar: Mode Selector, Drone Fly-by, VR, and Status */}
      <div
        style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999 }}
        className="pointer-events-auto flex items-center gap-2"
      >
        {/* Visualization Mode Selector */}
        <div className={`${panelStyle} flex items-center gap-1 rounded-xl p-1 shadow-lg`}>
          <button
            onClick={() => onRenderModeChange?.('standard')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              (renderMode ?? 'standard') === 'standard'
                ? 'bg-[#d69a43]/25 text-[#f5c26f] shadow'
                : 'text-[#8da09c] hover:text-white'
            }`}
            title="Стандартный режим (PBR-текстуры, естественное освещение)"
          >
            ☀️ Стандарт
          </button>
          <button
            onClick={() => onRenderModeChange?.('thermal')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              renderMode === 'thermal'
                ? 'bg-rose-500/25 text-rose-300 shadow ring-1 ring-rose-500/50'
                : 'text-[#8da09c] hover:text-white'
            }`}
            title="Тепловизор (FLIR Ironbow спектр температур оборудования)"
          >
            <Flame size={13} />
            <span>Тепловизор</span>
          </button>
          <button
            onClick={() => onRenderModeChange?.('wireframe')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
              renderMode === 'wireframe'
                ? 'bg-cyan-500/25 text-cyan-300 shadow ring-1 ring-cyan-500/50'
                : 'text-[#8da09c] hover:text-white'
            }`}
            title="Рентген / Каркас (CAD Blueprint каркасный анализ конструкций)"
          >
            <Layers size={13} />
            <span>Рентген</span>
          </button>
        </div>

        {/* Shadows Quality / Performance Toggle */}
        {onToggleShadows && (
          <button
            onClick={onToggleShadows}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 cursor-pointer shadow-lg ${
              enableShadows
                ? 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50'
                : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
            }`}
            title={enableShadows ? 'Тени активны (512px). Нажмите для отключения теней (максимальный FPS)' : 'Тени отключены. Нажмите для включения теней (512px)'}
          >
            <span>{enableShadows ? '🌤️ Тени 512px' : '⚡ Без теней (Max FPS)'}</span>
          </button>
        )}

        {/* Quick Emergency AZ-5 Header Button */}
        <button
          onClick={scramActive ? handleResetAZ5 : handleTriggerAZ5}
          className={`px-3 py-2 rounded-xl text-xs font-black tracking-wider transition shadow-lg flex items-center gap-1.5 cursor-pointer ${
            scramActive
              ? 'bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.7)]'
              : 'border border-red-500/40 bg-red-950/80 hover:bg-red-900 text-red-300'
          }`}
          title={scramActive ? 'АЗ-5 сработала! Нажмите для взведения СУЗ' : 'Аварийная защита АЗ-5 (сброс стержней СУЗ)'}
        >
          <span>🛑</span>
          <span>{scramActive ? 'АЗ-5 АКТИВНА' : 'АЗ-5'}</span>
        </button>
        {/* Walk / Orbit Mode Toggle */}
        {onToggleWalkMode && controlMode !== 'drone' && (
          <button
            data-testid="button-toggle-walk-mode"
            onClick={onToggleWalkMode}
            title={controlMode === 'walk' ? 'Переключиться на свободный обзор камеры (Орбита)' : 'Включить режим ходьбы от первого лица (WASD)'}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-lg cursor-pointer ${
              controlMode === 'walk'
                ? 'border-[#62d1a2] bg-[#102922]/95 text-[#62d1a2] shadow-[0_0_18px_rgba(98,209,162,0.3)]'
                : 'border-white/15 bg-[#142024]/95 text-[#c5d4cd] hover:border-[#f5c26f]/50 hover:text-[#f5c26f]'
            }`}
          >
            <Footprints size={14} />
            <span className="hidden lg:inline">
              {controlMode === 'walk' ? 'Прогулка (WASD)' : 'Орбита'}
            </span>
          </button>
        )}

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

      {/* 3. Left HUD Panel: Slides entirely off-screen via transform: translateX(-120%) or display: none when collapsed */}
      <nav
        aria-label="Навигация и ракурсы"
        style={{
          position: 'fixed',
          top: '68px',
          left: '16px',
          zIndex: 9999,
          display: isCollapsed ? 'none' : 'flex',
          transform: isCollapsed ? 'translateX(-120%)' : 'translateX(0)',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          pointerEvents: isCollapsed ? 'none' : 'auto',
          opacity: isCollapsed ? 0 : 1,
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
                  Навигация по модели
                </p>
                <p className="mono text-[8px] uppercase tracking-[.12em] text-[#81918d]">
                  CAD Сборка · БЩУ · VR
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex items-center gap-1 text-[#81918d] hover:text-[#f5c26f] text-xs px-2 py-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
              title="Свернуть меню ракурсов (V)"
              aria-label="Свернуть меню ракурсов"
            >
              <ChevronLeft size={14} />
              <span className="text-[10px] font-semibold">Свернуть (V)</span>
            </button>
          </div>

          {/* Expanded Cinematic Viewpoints List (rendered only when visible to prevent React re-renders) */}
          {!isCollapsed && (
            <MemoizedViewpointsList
              floorViews={FLOOR_VIEWS}
              activeView={activeView}
              onViewChange={onViewChange}
            />
          )}

          {/* 1. Послойный срез (X-Ray Cutaway) */}
          <div className="mt-2 pt-2.5 border-t border-white/10 px-1">
            <div className="mb-1.5 flex items-center justify-between text-[10px]">
              <span className="text-[#9caeaa] uppercase tracking-wider text-[9px] font-bold">
                Послойный срез (Cutaway)
              </span>
              <span className="mono text-[#f5c26f] font-bold">{Math.round((1 - containmentOpacity) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={1 - containmentOpacity}
              onChange={(e) => onContainmentOpacityChange(1 - Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#d69a43]"
              title="Плавное прорезание наружных стен контейнмента и зданий"
            />
            <div className="mt-1.5 flex justify-between gap-1">
              <button
                onClick={() => onContainmentOpacityChange(1.0)}
                className={`flex-1 py-1 px-1 rounded text-[9px] font-semibold transition cursor-pointer ${
                  containmentOpacity >= 0.95 ? 'bg-[#d69a43]/30 text-[#f5c26f] font-bold' : 'bg-white/5 text-[#81918d] hover:text-white'
                }`}
              >
                Монолит
              </button>
              <button
                onClick={() => onContainmentOpacityChange(0.5)}
                className={`flex-1 py-1 px-1 rounded text-[9px] font-semibold transition cursor-pointer ${
                  containmentOpacity < 0.95 && containmentOpacity > 0.1 ? 'bg-[#d69a43]/30 text-[#f5c26f] font-bold' : 'bg-white/5 text-[#81918d] hover:text-white'
                }`}
              >
                Полусрез
              </button>
              <button
                onClick={() => onContainmentOpacityChange(0.0)}
                className={`flex-1 py-1 px-1 rounded text-[9px] font-semibold transition cursor-pointer ${
                  containmentOpacity <= 0.1 ? 'bg-[#d69a43]/30 text-[#f5c26f] font-bold' : 'bg-white/5 text-[#81918d] hover:text-white'
                }`}
              >
                Все внутри
              </button>
            </div>
          </div>

          {/* 2. Интерактивная аварийная защита (Кнопка АЗ-5) */}
          <div className="mt-2.5 pt-2.5 border-t border-white/10 px-1">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">☢️</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#edf0e8]">
                  Защита АЗ-5
                </span>
              </div>
              <span
                className={`text-[8px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  scramActive ? 'bg-red-500/30 text-red-400 border border-red-500/50 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {scramActive ? 'АЗ-5 АКТИВНА' : 'НОРМА'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#91a19e] mb-1.5">
              <span>Защитная крышка:</span>
              <button
                onClick={() => setSafetyFlapOpen((v) => !v)}
                className={`text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition ${
                  safetyFlapOpen ? 'bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/40' : 'bg-white/10 text-slate-300'
                }`}
              >
                {safetyFlapOpen ? 'ОТКИНУТА' : 'ЗАКРЫТА'}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                onClick={handleTriggerAZ5}
                disabled={!safetyFlapOpen && !scramActive}
                className={`w-full py-2 px-3 rounded-xl font-black text-xs tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
                  scramActive
                    ? 'bg-red-600/30 border border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                    : safetyFlapOpen
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:scale-[1.02]'
                    : 'bg-red-950/40 text-red-400/40 border border-red-900/30 cursor-not-allowed'
                }`}
              >
                <span>🛑</span>
                <span>КНОПКА АЗ-5 (СБРОС СУЗ)</span>
              </button>

              {scramActive && (
                <div className="flex gap-1.5 mt-0.5">
                  <button
                    onClick={handleResetAZ5}
                    className="flex-1 py-1.5 px-2 rounded-lg font-bold text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>Взвести СУЗ</span>
                  </button>
                  <button
                    onClick={handleToggleSirenMute}
                    className="py-1.5 px-2.5 rounded-lg text-[10px] font-medium bg-black/40 hover:bg-black/60 text-slate-300 transition cursor-pointer"
                    title="Включить / отключить звук аварийной сирены"
                  >
                    {sirenMuted ? '🔇' : '🔊'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* FLIR Thermal Cam HUD Overlay */}
      {renderMode === 'thermal' && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {/* Central Target Spot Temp Reticle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-12 h-12 border border-rose-500/60 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping" />
            </div>
            <div className="mt-2 px-2.5 py-1 rounded bg-black/85 border border-rose-500/50 text-rose-300 font-mono text-[11px] font-bold shadow-lg">
              SP01: {scramActive ? '142.6' : '320.4'} °C [1-Й КОНТУР / ТВС]
            </div>
          </div>

          {/* Right-Side Vertical Ironbow Spectrum Gradient Bar */}
          <div className="absolute right-4 top-24 bottom-24 w-12 flex flex-col items-center justify-between py-2 px-1 rounded-xl bg-black/80 border border-white/20 backdrop-blur-md text-[9px] font-mono font-bold text-white shadow-2xl">
            <span className="text-pink-300">350°C</span>
            <div className="w-4 h-full my-2 rounded-full overflow-hidden shadow-inner bg-gradient-to-b from-white via-red-500 via-orange-400 via-yellow-300 via-cyan-400 via-blue-600 to-indigo-950" />
            <span className="text-indigo-400">18°C</span>
          </div>

          {/* Top FLIR Status Badge */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/80 border border-rose-500/40 text-[10px] font-mono text-rose-400 tracking-wider font-bold">
            FLIR THERMAL IR · 7.5-14 µm · ε 0.95 · IRONBOW PALETTE
          </div>
        </div>
      )}

      {/* Wireframe Blueprint CAD HUD Overlay */}
      {renderMode === 'wireframe' && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {/* Corner CAD coordinate brackets */}
          <div className="absolute top-20 left-4 font-mono text-[9px] text-cyan-400 bg-black/70 px-2 py-1 rounded border border-cyan-500/30">
            CAD WIREFRAME / X-RAY SCHEMATIC VIEW · VVER-1000 STRUCTURAL MESH
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-cyan-300 bg-black/75 px-3 py-1 rounded-full border border-cyan-500/40 tracking-wider">
            GRID: 10.0m · REBAR & PIPING PENETRATION VISIBLE
          </div>
        </div>
      )}

      {/* 4. First-Person Walk Mode Crosshair & Non-Blocking Interactive Prompt */}
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
              aria-label="Кликните по сцене для захвата курсора (WASD — ходьба, зажатая ЛКМ — обзор)"
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
              className="pointer-events-auto fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 cursor-pointer items-center gap-3 rounded-2xl border border-[#e2a34f]/60 bg-[#142024]/92 px-4 py-2.5 text-xs text-[#e9eee7] shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-xl transition hover:border-[#f5c26f] hover:bg-[#1a2b30] max-w-[92vw]"
            >
              <Crosshair size={16} className="shrink-0 text-[#f5c26f]" />
              <span className="font-semibold">
                <span className="text-[#f5c26f]">WASD</span> — ходьба ·{' '}
                <span className="text-[#f5c26f]">Мышь / клик</span> — свободный осмотр ·{' '}
                <span className="text-[#9caeaa]">Esc — курсор</span>
              </span>
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
