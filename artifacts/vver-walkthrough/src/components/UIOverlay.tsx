import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  EyeOff,
  Footprints,
  Glasses,
  Layers,
  Moon,
  Pause,
  Play,
  Scissors,
  Siren,
  Sun,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { FLOOR_VIEWS, type ViewMode } from '@/data/poiData';
import { useTelemetry, type TelemetrySnapshot } from '@/hooks/useTelemetry';
import type { DroneWaymark } from '@/components/DroneFlyByController';

export type ThemeMode = 'dark' | 'light';

interface UIOverlayProps {
  activeView: string;
  onViewChange: (viewId: string) => void;
  pointerLocked: boolean;
  containmentOpacity: number;
  onContainmentOpacityChange: (v: number) => void;
  shellTransparent: boolean;
  onToggleShellTransparent: () => void;
  energyFlowActive: boolean;
  onToggleEnergyFlow: () => void;
  evacuationRoutesActive: boolean;
  onToggleEvacuationRoutes: () => void;
  controlMode: ViewMode;
  onVRClick: () => void;
  vrSupported: boolean | null;
  telemetry?: TelemetrySnapshot;
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
  onToggleWalkMode?: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const glassSurface =
  'border border-slate-900/12 dark:border-white/12 bg-white/92 dark:bg-slate-950/88 text-slate-900 dark:text-slate-100 shadow-[0_10px_30px_rgba(15,23,42,0.10)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.45)] transition-colors duration-200';

export default function UIOverlay({
  activeView,
  onViewChange,
  pointerLocked,
  containmentOpacity,
  onContainmentOpacityChange,
  shellTransparent,
  onToggleShellTransparent,
  energyFlowActive,
  onToggleEnergyFlow,
  evacuationRoutesActive,
  onToggleEvacuationRoutes,
  controlMode,
  onVRClick,
  telemetry: propTelemetry,
  droneSpeed = 1.0,
  onDroneSpeedChange,
  dronePaused = false,
  onDroneTogglePause,
  droneTelemetry,
  onDroneScrub,
  theme,
  onToggleTheme,
}: UIOverlayProps) {
  const fallbackTelemetry = useTelemetry();
  const telemetry = propTelemetry ?? fallbackTelemetry;

  const [allUIHidden, setAllUIHidden] = useState(false);
  const [informerOpen, setInformerOpen] = useState(true);
  const [zonesOpen, setZonesOpen] = useState(false);
  const [isVRPresenting, setIsVRPresenting] = useState(false);
  const [vrModal, setVrModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  });

  const zonesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyH' || e.key.toLowerCase() === 'h' || e.key.toLowerCase() === 'р') {
        e.preventDefault();
        setAllUIHidden((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    if (!zonesOpen) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (zonesMenuRef.current && !zonesMenuRef.current.contains(e.target as Node)) {
        setZonesOpen(false);
      }
    };
    window.addEventListener('mousedown', onOutsideClick);
    return () => window.removeEventListener('mousedown', onOutsideClick);
  }, [zonesOpen]);

  const handleEnterVR = async () => {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      setVrModal({
        open: true,
        title: 'WebXR недоступен',
        message: 'Используйте совместимый браузер (Chrome / Edge / Oculus Browser) для запуска VR-сессии.',
      });
      return;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      if (supported) {
        onVRClick();
        return;
      }
      setVrModal({
        open: true,
        title: 'VR-гарнитура не обнаружена',
        message: 'Подключите VR-шлем (Meta Quest, SteamVR, Pico) или откройте приложение в браузере шлема.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setVrModal({
        open: true,
        title: 'Ошибка инициализации VR',
        message: msg,
      });
    }
  };

  if (isVRPresenting) {
    return null;
  }

  if (allUIHidden) {
    return (
      <div className="pointer-events-auto fixed bottom-5 left-5 z-50 panel-enter">
        <button
          type="button"
          data-testid="button-unhide-ui"
          onClick={() => setAllUIHidden(false)}
          className={`${glassSurface} flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium hover:bg-white dark:hover:bg-slate-900`}
        >
          <Eye size={15} />
          <span className="whitespace-nowrap">Показать интерфейс</span>
        </button>
      </div>
    );
  }

  const activeZone = FLOOR_VIEWS.find((v) => v.id === activeView) ?? FLOOR_VIEWS[0];
  const walkLocations = FLOOR_VIEWS.filter((v) => v.group === 'walk');
  const zonePresets = FLOOR_VIEWS.filter((v) => v.group === 'zones');
  const cutawayPercent = Math.round((1 - containmentOpacity) * 100);
  const thermalMW = Math.round(telemetry.neutronFlux * 30);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* 1. Верхний левый минималистичный заголовок и переключатель темы */}
      <header className="pointer-events-auto fixed left-5 top-5 z-40">
        <div className={`${glassSurface} flex items-center gap-3 rounded-2xl px-4 py-2`}>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm font-semibold tracking-tight">ВВЭР-1000</span>
            <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400">Масштаб 1:1</span>
          </div>

          <span className="h-4 w-px bg-slate-900/10 dark:bg-white/10" aria-hidden="true" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="button-toggle-theme"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
              aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              data-testid="button-hide-all-ui"
              onClick={() => setAllUIHidden(true)}
              title="Скрыть интерфейс (H)"
              aria-label="Скрыть интерфейс"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition"
            >
              <EyeOff size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Верхний правый минималистичный информер параметров энергоблока */}
      <aside
        aria-label="Параметры энергоблока"
        className="pointer-events-auto fixed right-5 top-5 z-40 w-64"
      >
        <div className={`${glassSurface} rounded-2xl px-4 py-3`}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold tracking-tight">Параметры энергоблока</p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {activeZone.label}
              </p>
            </div>
            <button
              type="button"
              data-testid="button-toggle-navigation"
              onClick={() => setInformerOpen((v) => !v)}
              aria-label={informerOpen ? 'Свернуть информер' : 'Развернуть информер'}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition"
            >
              {informerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {informerOpen && (
            <dl className="mt-2.5 divide-y divide-slate-900/8 dark:divide-white/8 text-xs">
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-slate-600 dark:text-slate-400">Тепловая мощн.</dt>
                <dd data-testid="status-neutron-flux" className="mono font-medium">
                  {thermalMW} МВт
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-slate-600 dark:text-slate-400">Электр. мощн.</dt>
                <dd data-testid="status-grid-output" className="mono font-medium">
                  {telemetry.gridPower.toFixed(0)} МВт
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-slate-600 dark:text-slate-400">Давление 1 к.</dt>
                <dd data-testid="status-primary-pressure" className="mono font-medium">
                  {telemetry.primaryPressure.toFixed(2)} МПа
                </dd>
              </div>
              <div className="flex items-center justify-between pt-1.5">
                <dt className="text-slate-600 dark:text-slate-400">Температура</dt>
                <dd data-testid="status-primary-temp" className="mono font-medium">
                  {telemetry.primaryTemp.toFixed(1)} °C
                </dd>
              </div>
            </dl>
          )}
        </div>
      </aside>

      {/* Компактный переключатель ключевых локаций для «Прогулки 1:1» и VR (Y = 1.65 м от пола) */}
      {controlMode === 'walk' && (
        <div className="pointer-events-auto fixed bottom-20 left-1/2 z-30 flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-col items-center gap-1.5">
          <div
            data-testid="walk-location-switcher"
            className={`${glassSurface} flex flex-wrap sm:flex-nowrap items-center justify-center gap-1 rounded-2xl p-1`}
          >
            {walkLocations.map((loc) => {
              const isSelected = activeView === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  data-testid={`button-walk-${loc.id}`}
                  onClick={() => onViewChange(loc.id)}
                  className={`whitespace-nowrap rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition ${
                    isSelected
                      ? 'bg-sky-600 text-white dark:bg-sky-400 dark:text-slate-950 shadow-sm'
                      : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  {loc.shortLabel || loc.label}
                </button>
              );
            })}
          </div>
          {!pointerLocked && (
            <p className={`${glassSurface} whitespace-nowrap rounded-xl px-3 py-1 text-[11px] text-slate-600 dark:text-slate-300`}>
              WASD / стрелки — ходьба · Клик / мышь — обзор · Esc — курсор
            </p>
          )}
        </div>
      )}

      {controlMode === 'drone' && (
        <div className="pointer-events-auto fixed bottom-20 left-1/2 z-40 -translate-x-1/2 panel-enter">
          <div className={`${glassSurface} flex items-center gap-3 rounded-2xl px-3.5 py-2`}>
            <button
              type="button"
              data-testid="button-drone-play-pause"
              onClick={onDroneTogglePause}
              aria-label={dronePaused ? 'Возобновить облёт' : 'Пауза'}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900/5 hover:bg-slate-900/10 dark:bg-white/10 dark:hover:bg-white/15 transition"
            >
              {dronePaused ? <Play size={14} /> : <Pause size={14} />}
            </button>

            <div className="flex items-center gap-1">
              {[0.5, 1.0, 2.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onDroneSpeedChange?.(spd)}
                  className={`mono rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                    droneSpeed === spd
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={droneTelemetry?.t ?? 0}
              onChange={(e) => onDroneScrub?.(parseFloat(e.target.value))}
              aria-label="Позиция дрон-облёта"
              className="h-1 w-28 sm:w-40 cursor-pointer accent-sky-500"
            />

            <span className="mono text-[11px] text-slate-600 dark:text-slate-300">
              {Math.round((droneTelemetry?.t ?? 0) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* 3. Нижняя компактная стеклянная панель управления */}
      <nav
        aria-label="Управление обзором и разрезом"
        className="pointer-events-auto fixed bottom-5 left-1/2 z-40 max-w-[calc(100vw-24px)] -translate-x-1/2"
      >
        <div
          className={`${glassSurface} flex flex-wrap lg:flex-nowrap items-center justify-center gap-1.5 rounded-2xl p-1.5`}
        >
          {/* Основные режимы обзора */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="button-view-walk-tour"
              onClick={() => onViewChange('walk-tour')}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition ${
                controlMode === 'walk'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <Footprints size={14} />
              <span>Прогулка 1:1</span>
            </button>

            <button
              type="button"
              data-testid="button-view-aerial"
              onClick={() => onViewChange('view-aerial')}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition ${
                controlMode === 'orbit' && activeView !== 'view-cutaway'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <Compass size={14} />
              <span>Обзор сборки</span>
            </button>

            <button
              type="button"
              data-testid="button-drone-flyby"
              onClick={() =>
                onViewChange(activeView === 'view-drone' ? 'view-aerial' : 'view-drone')
              }
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition ${
                controlMode === 'drone'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                  : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <Video size={14} />
              <span>Дрон-облёт</span>
            </button>
          </div>

          {/* Выпадающий список фокусировки по зонам сборки */}
          <div ref={zonesMenuRef} className="relative">
            <button
              type="button"
              data-testid="button-zones-menu"
              onClick={() => setZonesOpen((v) => !v)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition ${
                zonesOpen || zonePresets.some((z) => z.id === activeView)
                  ? 'bg-slate-900/10 text-slate-950 dark:bg-white/15 dark:text-white'
                  : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <span>Зоны</span>
              <ChevronUp
                size={14}
                className={`transition-transform duration-150 ${zonesOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {zonesOpen && (
              <div
                className={`${glassSurface} panel-enter absolute bottom-12 left-0 w-64 rounded-2xl p-1.5`}
              >
                <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Локации прогулки (1:1)
                </p>
                {walkLocations.map((zone) => {
                  const selected = activeView === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      data-testid={`button-view-${zone.id}`}
                      onClick={() => {
                        onViewChange(zone.id);
                        setZonesOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-xs font-medium transition ${
                        selected
                          ? 'bg-sky-600 text-white dark:bg-sky-400 dark:text-slate-950'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate">{zone.shortLabel || zone.label}</span>
                      <span className="mono text-[10px] opacity-70">1:1</span>
                    </button>
                  );
                })}
                <div className="my-1 h-px bg-slate-900/10 dark:bg-white/10" />
                <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  3D-ракурсы и разрез
                </p>
                {zonePresets.map((zone) => {
                  const selected = activeView === zone.id;
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      data-testid={`button-view-${zone.id}`}
                      onClick={() => {
                        onViewChange(zone.id);
                        setZonesOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left text-xs font-medium transition ${
                        selected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                          : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate">{zone.label}</span>
                      <span className="mono text-[10px] opacity-60">3D</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="hidden sm:block h-5 w-px bg-slate-900/10 dark:bg-white/10" aria-hidden="true" />

          {/* Слайдер сечения и кнопка прозрачности оболочки */}
          <div className="flex items-center gap-2 px-2">
            <Scissors size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={1 - containmentOpacity}
              onChange={(e) => onContainmentOpacityChange(1 - Number(e.target.value))}
              aria-label="Сечение оболочки"
              title="Сечение оболочки по высоте"
              className="h-1 w-20 sm:w-24 cursor-pointer accent-sky-500"
            />
            <span className="mono w-8 text-right text-[11px] text-slate-600 dark:text-slate-300">
              {cutawayPercent}%
            </span>

            <button
              type="button"
              data-testid="button-toggle-shell-xray"
              onClick={onToggleShellTransparent}
              title="Прозрачные стены (X-Ray)"
              aria-pressed={shellTransparent}
              className={`flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                shellTransparent
                  ? 'bg-sky-500/20 text-sky-700 dark:bg-sky-400/20 dark:text-sky-300'
                  : 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <Layers size={14} />
              <span className="hidden md:inline">X-Ray</span>
            </button>
          </div>

          <span className="hidden sm:block h-5 w-px bg-slate-900/10 dark:bg-white/10" aria-hidden="true" />

          {/* Кнопка запуска визуализации технологического цикла АЭС */}
          <button
            type="button"
            data-testid="button-toggle-energy-flow"
            onClick={onToggleEnergyFlow}
            aria-pressed={energyFlowActive}
            title="Анимация процессов АЭС: реактор, контуры, турбины, градирни и ОРУ"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
              energyFlowActive
                ? 'bg-sky-500 text-white shadow-[0_0_18px_rgba(14,165,233,0.45)] hover:bg-sky-400 dark:bg-sky-400 dark:text-slate-950'
                : 'bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:bg-amber-400/15 dark:text-amber-300 dark:hover:bg-amber-400/25'
            }`}
          >
            <Zap size={14} />
            <span>{energyFlowActive ? 'Цикл АЭС активен' : 'Визуализация процессов'}</span>
          </button>

          {/* Кнопка подсветки путей эвакуации и точек безопасного сбора */}
          <button
            type="button"
            data-testid="button-toggle-evacuation"
            onClick={onToggleEvacuationRoutes}
            aria-pressed={evacuationRoutesActive}
            title="Подсветка маршрутов эвакуации из энергоблоков и залов к точкам сбора"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
              evacuationRoutesActive
                ? 'bg-emerald-500 text-white shadow-[0_0_18px_rgba(16,185,129,0.5)] hover:bg-emerald-400 dark:text-slate-950'
                : 'border border-emerald-500/30 bg-emerald-500/12 text-emerald-800 hover:bg-emerald-500/20 dark:border-emerald-400/25 dark:bg-emerald-400/15 dark:text-emerald-300 dark:hover:bg-emerald-400/25'
            }`}
          >
            <Siren size={14} />
            <span>{evacuationRoutesActive ? 'Эвакуация активна' : 'Пути эвакуации'}</span>
          </button>

          <span className="hidden sm:block h-5 w-px bg-slate-900/10 dark:bg-white/10" aria-hidden="true" />

          {/* Кнопка входа в VR */}
          <button
            type="button"
            data-testid="button-enter-vr-prominent"
            onClick={handleEnterVR}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
          >
            <Glasses size={15} />
            <span>Войти в VR</span>
          </button>
        </div>
      </nav>

      {/* Модальное окно статуса WebXR VR */}
      {vrModal.open && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setVrModal((prev) => ({ ...prev, open: false }))}
        >
          <div
            className={`${glassSurface} panel-enter relative w-full max-w-sm rounded-2xl p-6 text-center`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVrModal((prev) => ({ ...prev, open: false }))}
              aria-label="Закрыть"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Glasses size={22} />
            </div>
            <h3 className="text-base font-semibold">{vrModal.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {vrModal.message}
            </p>
            <button
              type="button"
              onClick={() => setVrModal((prev) => ({ ...prev, open: false }))}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white transition hover:opacity-90 dark:bg-white dark:text-slate-950"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
