import { useState } from 'react';
import {
  Activity, ChevronDown, ChevronUp, Cpu, Crosshair, Eye, Footprints, Gauge,
  Info, Layers, Monitor, Radio, Thermometer, X, Zap, Droplets,
} from 'lucide-react';
import { FLOOR_VIEWS, POI_LIST, type POIInfo, type ViewMode } from '@/data/poiData';
import type { TelemetrySnapshot } from '@/hooks/useTelemetry';

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
  telemetry: TelemetrySnapshot;
}

const panelStyle = 'border border-[#c9d1c6]/15 bg-[#172226]/95 shadow-[0_18px_60px_rgba(4,14,17,.34)] backdrop-blur-xl';

function StatusDot({ active }: { active: boolean }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: active ? '#65d6a4' : '#e2a34f', boxShadow: `0 0 9px ${active ? '#65d6a4' : '#e2a34f'}`, animation: 'signal-pulse 2s ease-in-out infinite' }} />;
}

function TelemetryReadout({ icon: Icon, label, value, unit, color, testId }: {
  icon: typeof Activity; label: string; value: string; unit: string; color: string; testId: string;
}) {
  return (
    <div data-testid={testId} className="flex min-w-0 items-center gap-2.5 border-b border-[#c9d1c6]/10 py-2 last:border-0">
      <Icon size={14} className="shrink-0" style={{ color }} />
      <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[.12em] text-[#9caeaa]">{label}</span>
      <span className="mono whitespace-nowrap text-xs font-medium text-[#f0f0e4]">{value}<span className="ml-1 text-[9px] text-[#91a19e]">{unit}</span></span>
    </div>
  );
}

function InfoModal({ poi, onClose }: { poi: POIInfo; onClose: () => void }) {
  const [lang, setLang] = useState<'en' | 'ru'>('en');
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#091214]/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <article className={`${panelStyle} panel-enter max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-2xl`} onClick={(e) => e.stopPropagation()} style={{ borderColor: `${poi.color}70` }}>
        <header className="relative border-b border-[#c9d1c6]/10 px-6 py-5">
          <button data-testid="button-close-poi" onClick={onClose} aria-label="Close point of interest" className="absolute right-4 top-4 rounded-lg p-2 text-[#9caeaa] hover:bg-white/10 hover:text-white"><X size={17} /></button>
          <p className="mono mb-2 text-[10px] uppercase tracking-[.22em]" style={{ color: poi.color }}>{lang === 'en' ? poi.categoryEn : poi.categoryRu}</p>
          <h2 className="pr-8 text-xl font-bold tracking-tight text-[#f1f0e5]">{lang === 'en' ? poi.titleEn : poi.titleRu}</h2>
        </header>
        <div className="flex gap-2 px-6 pt-4">
          {(['en', 'ru'] as const).map((option) => <button key={option} data-testid={`button-language-${option}`} onClick={() => setLang(option)} className={`rounded-md px-3 py-1.5 text-xs ${lang === option ? 'bg-[#d79b42]/20 text-[#f3bd69]' : 'text-[#92a19f] hover:bg-white/5'}`}>{option === 'en' ? 'English' : 'Русский'}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2 px-6 py-4">
          {poi.specs.map((spec) => <div key={spec.labelEn} className="rounded-lg border border-[#c9d1c6]/10 bg-[#0d181b]/65 px-3 py-2.5"><p className="text-[9px] uppercase tracking-wider text-[#90a19c]">{lang === 'en' ? spec.labelEn : spec.labelRu}</p><p className="mono mt-1 text-sm font-medium" style={{ color: poi.color }}>{spec.value}</p></div>)}
        </div>
        <p className="px-6 pb-6 text-sm leading-6 text-[#c5d0ca]">{lang === 'en' ? poi.descriptionEn : poi.descriptionRu}</p>
      </article>
    </div>
  );
}

export default function UIOverlay({
  activeView, onViewChange, sceneAvailable, pointerLocked, containmentOpacity, onContainmentOpacityChange,
  controlMode, onVRClick, vrSupported, telemetry,
}: UIOverlayProps) {
  const [sidebarOpen, setSidebarOpen] = useState(sceneAvailable);
  const [selectedPOI, setSelectedPOI] = useState<POIInfo | null>(null);
  const active = FLOOR_VIEWS.find((item) => item.id === activeView) ?? FLOOR_VIEWS[0];
  const fmt = (value: number, digits = 1) => value.toFixed(digits);

  const choosePOI = (poi: POIInfo) => setSelectedPOI(poi);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between px-3 pt-3 sm:px-5 sm:pt-5">
        <div className={`${panelStyle} pointer-events-auto flex items-center gap-3 rounded-xl px-3 py-2.5 sm:px-4`}>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#d79b42]/15 text-[#e5aa52]"><Activity size={17} /></div>
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-[#edf0e8]">VVER-1000 <span className="font-medium text-[#aebbb4]">/ Digital Twin</span></p>
            <p className="mono mt-0.5 text-[9px] uppercase tracking-[.15em] text-[#81918d]">Uzbekistan · V-392M · 1 unit = 1 m</p>
          </div>
        </div>
        <div className={`${panelStyle} pointer-events-auto flex items-center gap-2 rounded-xl px-3 py-2.5`}>
          <StatusDot active={telemetry.safetyMode === 'NORMAL'} />
          <div className="hidden sm:block">
            <p data-testid="status-active-view" className="text-[10px] font-bold text-[#e9eee7]">{active.label}</p>
            <p data-testid="status-safety-mode" className="mono mt-0.5 text-[9px] uppercase tracking-[.12em] text-[#9cacaa]">SYSTEM {telemetry.safetyMode}</p>
          </div>
          <button data-testid="button-toggle-navigation" onClick={() => setSidebarOpen((open) => !open)} aria-label={sidebarOpen ? 'Collapse tour panel' : 'Expand tour panel'} className="ml-1 rounded-md p-1.5 text-[#c4d0c9] hover:bg-white/10">
            {sidebarOpen ? <ChevronUp size={16} /> : <Layers size={16} />}
          </button>
        </div>
      </header>

      {controlMode === 'walk' && (
        <>
          <div data-testid="walk-crosshair" aria-hidden="true" className="pointer-events-none fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 font-mono text-2xl leading-none text-[#f6c36b]">+</div>
          {!pointerLocked && (
            <button
              id="lock-anchor"
              type="button"
              data-testid="button-click-to-walk"
              aria-label="Click on screen to lock pointer and look around with mouse"
              className="panel-enter fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[#e2a34f]/35 bg-[#172226]/95 px-4 py-3 text-left shadow-xl backdrop-blur-xl transition hover:border-[#e2a34f]/70 hover:bg-[#243238] sm:bottom-7 sm:px-5"
            >
              <Crosshair size={16} className="shrink-0 text-[#e2a34f]" />
              <span className="text-xs font-bold tracking-wide text-[#f1efe4]">Click on screen to lock pointer and look around with mouse</span>
            </button>
          )}
        </>
      )}

      <aside className={`fixed bottom-4 left-0 top-[76px] z-30 w-[min(340px,calc(100vw-24px))] overflow-hidden transition-transform duration-300 sm:bottom-5 sm:top-[82px] ${sidebarOpen ? 'translate-x-0' : '-translate-x-[105%]'}`}>
        <div className={`${panelStyle} panel-enter ml-3 flex h-full flex-col overflow-y-auto rounded-2xl sm:ml-5`}>
          <section className="border-b border-[#c9d1c6]/10 px-4 pb-4 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div><p className="mono text-[9px] uppercase tracking-[.2em] text-[#dca452]">Guided access</p><h2 className="mt-1 text-sm font-bold text-[#edf0e8]">Choose a viewpoint</h2></div>
              <Footprints size={16} className="text-[#b8c0b7]" />
            </div>
            <div className="space-y-1.5">
              {FLOOR_VIEWS.map((view, index) => {
                const selected = activeView === view.id;
                return <button key={view.id} data-testid={`button-view-${view.id}`} aria-pressed={selected} onClick={() => onViewChange(view.id)} className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${selected ? 'border-[#d69a43]/45 bg-[#d69a43]/10' : 'border-transparent bg-[#0d181b]/35 hover:border-white/10 hover:bg-white/[.04]'}`}>
                  <span className={`mono grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] ${selected ? 'bg-[#d69a43]/20 text-[#edb65f]' : 'bg-white/[.05] text-[#81908b]'}`}>{String(index + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1"><span className={`block text-[11px] font-bold leading-4 ${selected ? 'text-[#f5c26f]' : 'text-[#d5ded6]'}`}>{view.label}</span><span className="mono mt-0.5 block text-[9px] uppercase tracking-[.12em] text-[#83918c]">{view.mode === 'orbit' ? 'Exterior · orbit controls' : `Interior · eye height 1.6 m · deck ${view.floorY > 0 ? '+' : ''}${view.floorY} m`}</span></span>
                  {view.mode === 'orbit' ? <Eye size={14} className={selected ? 'text-[#e3ab55]' : 'text-[#778782]'} /> : <Footprints size={14} className={selected ? 'text-[#e3ab55]' : 'text-[#778782]'} />}
                </button>;
              })}
            </div>
          </section>

          <section className="border-b border-[#c9d1c6]/10 px-4 py-3">
            <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#a9b6af]">Containment shell</p><span data-testid="status-shell-opacity" className="mono text-[10px] text-[#e4ad5a]">{Math.round(containmentOpacity * 100)}%</span></div>
            <input data-testid="input-shell-opacity" aria-label="Containment shell opacity" type="range" min="0" max="1" step="0.05" value={containmentOpacity} onChange={(event) => onContainmentOpacityChange(Number(event.target.value))} className="h-1 w-full cursor-pointer accent-[#d69a43]" />
            <div className="mt-1 flex justify-between text-[8px] uppercase tracking-wider text-[#778782]"><span>Open cutaway</span><span>Solid shell</span></div>
          </section>

          <section className="border-b border-[#c9d1c6]/10 px-4 py-3">
            <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><Monitor size={13} className="text-[#62d1a2]" /><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#a9b6af]">Plant telemetry</p></div><span className="mono text-[9px] text-[#71d1a6]">LIVE / 0.8 s</span></div>
            <TelemetryReadout testId="status-neutron-flux" icon={Zap} label="Neutron flux" value={fmt(telemetry.neutronFlux)} unit="% nom" color="#e2b25c" />
            <TelemetryReadout testId="status-primary-temp" icon={Thermometer} label="Primary temperature" value={fmt(telemetry.primaryTemp)} unit="°C" color="#df8761" />
            <TelemetryReadout testId="status-primary-pressure" icon={Gauge} label="Primary pressure" value={fmt(telemetry.primaryPressure, 2)} unit="MPa" color="#dca452" />
            <TelemetryReadout testId="status-flow-rate" icon={Droplets} label="Coolant flow" value={fmt(telemetry.flowRate)} unit="% nom" color="#73bfc1" />
            <TelemetryReadout testId="status-steam-pressure" icon={Activity} label="Steam pressure" value={fmt(telemetry.steamPressure, 2)} unit="MPa" color="#7bd09f" />
            <TelemetryReadout testId="status-grid-output" icon={Zap} label="Grid output" value={fmt(telemetry.gridPower, 0)} unit="MWe" color="#aac6a7" />
          </section>

          <section className="border-b border-[#c9d1c6]/10 px-4 py-3">
            <div className="mb-2 flex items-center gap-2"><Cpu size={13} className="text-[#d8a556]" /><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#a9b6af]">Safety train availability</p></div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['A', 'B', 'C', 'D'] as const).map((train, index) => {
                const available = [telemetry.dcsBusA, telemetry.dcsBusB, telemetry.dcsBusC, telemetry.dcsBusD][index];
                return <div key={train} data-testid={`status-train-${train.toLowerCase()}`} className="flex items-center justify-center gap-1.5 rounded-md border border-white/[.07] bg-[#0b1518]/60 py-2"><StatusDot active={available} /><span className="mono text-[9px] text-[#b5c1b9]">TR-{train}</span></div>;
              })}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-[#0b1518]/60 px-2.5 py-2"><span className="text-[9px] uppercase tracking-wider text-[#81908b]">Plant state</span><span data-testid="status-safety-summary" className={`mono text-[10px] font-medium ${telemetry.safetyMode === 'NORMAL' ? 'text-[#71d1a6]' : 'text-[#edbd63]'}`}>{telemetry.safetyMode}</span></div>
          </section>

          <section className="border-b border-[#c9d1c6]/10 px-4 py-3">
            <div className="mb-2 flex items-center gap-2"><Info size={13} className="text-[#a8b6b2]" /><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#a9b6af]">Equipment index</p></div>
            <div className="space-y-0.5">
              {POI_LIST.map((poi) => <button key={poi.id} data-testid={`button-poi-${poi.id}`} onClick={() => choosePOI(poi)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[10px] text-[#c5d0c9] transition hover:bg-white/[.05] hover:text-white"><span className="h-1.5 w-1.5 rounded-full" style={{ background: poi.color }} />{poi.titleEn}<span className="ml-auto text-[#72817c]">›</span></button>)}
            </div>
          </section>

          <section className="px-4 py-3">
            <button data-testid="button-enter-vr" onClick={onVRClick} disabled={!vrSupported} className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold transition ${vrSupported ? 'border-[#62d1a2]/30 bg-[#62d1a2]/10 text-[#78d6ac] hover:bg-[#62d1a2]/15' : 'cursor-not-allowed border-white/10 bg-white/[.025] text-[#72817c]'}`}><Radio size={13} />{vrSupported === null ? 'Checking WebXR' : vrSupported ? 'Enter immersive VR' : 'WebXR device unavailable'}</button>
          </section>
          <footer className="mt-auto border-t border-[#c9d1c6]/10 px-4 py-3"><p className="mono text-[8px] uppercase tracking-[.12em] text-[#72817c]">VVER-1000 · Four-loop PWR · Educational simulation</p></footer>
        </div>
      </aside>
      {selectedPOI && <InfoModal poi={selectedPOI} onClose={() => setSelectedPOI(null)} />}
    </>
  );
}
