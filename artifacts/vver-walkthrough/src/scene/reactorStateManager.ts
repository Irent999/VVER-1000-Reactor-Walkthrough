/**
 * ============================================================================
 * ЕДИНЫЙ МЕНЕДЖЕР СОСТОЯНИЙ И ФИЗИЧЕСКИХ ПРОЦЕССОВ РЕАКТОРОВ АЭС
 * (REACTOR STATE MANAGER & DUAL MCR SYSTEM: VVER-1000 & RITM-200N)
 * ============================================================================
 * 
 * Предоставляет масштабируемую диспетчеризацию состояний для двух автономных энергоблоков:
 * 1. ВВЭР-1000 (Энергоблок №1):
 *    - Мощность: 3000 МВт(т) / 1000 МВт(э)
 *    - 4 петли теплоносителя 1-го контура (ГЦЭН-195М №1..№4, RPM 0..1500)
 *    - 4 горизонтальных парогенератора ПГВ-1000 (пар 6.27 МПа, расход до 5880 т/ч)
 *    - 61 группа шаговых приводов СУЗ (ШУОК) с эффектом Черенковского свечения
 *    - Турбоагрегат К-1000-60/1500 (ЦВД, 3 ЦНД, ТВВ-1000)
 *    - Полярный кран кругового действия
 *    - Система аварийной защиты АЗ-5 (гравитационный сброс за < 3.5 с)
 * 
 * 2. РИТМ-200Н (Энергоблок АСММ):
 *    - Мощность: 175-190 МВт(т) / 55-60 МВт(э)
 *    - Интегральный корпус: 4 бессальниковых ГЦЭН, 12 кассетных ПГ (пар 3.82 МПа)
 *    - 19 приводов СУЗ
 *    - Турбоагрегат К-55-3.0/3000 (3000 об/мин)
 *    - Аварийная защита АЗ РИТМ-200Н
 */

import * as THREE from 'three';

export type ReactorType = 'vver1000' | 'ritm200n';

export interface VVER1000PhysicsState {
  reactorId: 'vver1000';
  name: string;
  powerPercent: number;          // 0..100%
  targetPowerPercent: number;
  thermalPowerMWt: number;       // 0..3000 МВт(т)
  electricPowerMWe: number;      // 0..1000 МВт(э)
  crdmPositionPercent: number;   // 0..100% (61 группа ШУОК)
  primaryPressureMPa: number;    // ном. 15.70 МПа
  secondaryPressureMPa: number;  // ном. 6.27 МПа
  coolantInletTempC: number;     // 289.2 °C (холодные нитки)
  coolantOutletTempC: number;    // 320.4 °C (горячие нитки)
  pumps: [boolean, boolean, boolean, boolean]; // ГЦЭН-195М петли 1, 2, 3, 4
  pumpRPM: [number, number, number, number];   // 0..1500 об/мин
  steamGens: [boolean, boolean, boolean, boolean]; // ПГВ-1000 №1..№4
  steamFlowRateTh: number;       // 0..5880 т/ч
  turbineRPM: number;            // 0..1500 об/мин (К-1000-60/1500)
  generatorConnected: boolean;   // ТВВ-1000 подключен к сети
  polarCraneActive: boolean;     // Полярный кран в движении
  scramActive: boolean;          // АЗ-5 активирована
  soundEnabled: boolean;
}

export interface RITM200NPhysicsState {
  reactorId: 'ritm200n';
  name: string;
  powerPercent: number;          // 0..100%
  targetPowerPercent: number;
  thermalPowerMWt: number;       // 0..190 МВт(т)
  electricPowerMWe: number;      // 0..55 МВт(э)
  crdmPositionPercent: number;   // 0..100% (19 приводов)
  primaryPressureMPa: number;    // ном. 15.68 МПа
  secondaryPressureMPa: number;  // ном. 3.82 МПа
  coolantInletTempC: number;     // 285.0 °C
  coolantOutletTempC: number;    // 310.0 °C
  pumps: [boolean, boolean, boolean, boolean]; // 4 компактных насоса
  pumpRPM: [number, number, number, number];   // 0..3000 об/мин
  steamGenActive: boolean;       // 12 кассетных модулей
  steamFlowRateTh: number;       // 0..310 т/ч
  turbineRPM: number;            // 0..3000 об/мин (К-55)
  generatorConnected: boolean;
  scramActive: boolean;          // АЗ активирована
  soundEnabled: boolean;
}

export type ReactorPhysicsState = VVER1000PhysicsState | RITM200NPhysicsState;

export type ReactorActionType =
  | 'TOGGLE_PUMP'
  | 'TOGGLE_ALL_PUMPS'
  | 'CRDM_STEP_UP'
  | 'CRDM_STEP_DOWN'
  | 'TOGGLE_STEAM_GEN'
  | 'TOGGLE_TURBINE'
  | 'TOGGLE_GENERATOR'
  | 'TOGGLE_POLAR_CRANE'
  | 'SCRAM_TRIP'
  | 'RESET_SCRAM'
  | 'TOGGLE_SOUND';

export interface ActionPayload {
  pumpIndex?: number;
  sgIndex?: number;
  amount?: number;
}

export type StateListener<T = ReactorPhysicsState> = (state: T) => void;

/**
 * Синтезатор звуковых эффектов (Web Audio API)
 */
class AudioFxSynthesizer {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public playClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch { /* Autoplay restriction */ }
  }

  public playHeavySwitch() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch { /* Autoplay restriction */ }
  }

  public playAlarm(isAZ5: boolean = false) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isAZ5 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(isAZ5 ? 1040 : 880, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(isAZ5 ? 640 : 700, this.ctx.currentTime + 0.15);
      osc.frequency.linearRampToValueAtTime(isAZ5 ? 1040 : 880, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch { /* Autoplay restriction */ }
  }
}

export const soundFx = new AudioFxSynthesizer();

/**
 * Единый класс менеджера состояний обоих реакторов
 */
export class ReactorStateManager {
  public vverState: VVER1000PhysicsState = {
    reactorId: 'vver1000',
    name: 'ВВЭР-1000 (В-320)',
    powerPercent: 100.0,
    targetPowerPercent: 100.0,
    thermalPowerMWt: 3000.0,
    electricPowerMWe: 1000.0,
    crdmPositionPercent: 88.0,
    primaryPressureMPa: 15.70,
    secondaryPressureMPa: 6.27,
    coolantInletTempC: 289.2,
    coolantOutletTempC: 320.4,
    pumps: [true, true, true, true],
    pumpRPM: [1485, 1490, 1488, 1485],
    steamGens: [true, true, true, true],
    steamFlowRateTh: 5880.0,
    turbineRPM: 1500,
    generatorConnected: true,
    polarCraneActive: true,
    scramActive: false,
    soundEnabled: true,
  };

  public ritmState: RITM200NPhysicsState = {
    reactorId: 'ritm200n',
    name: 'РИТМ-200Н',
    powerPercent: 88.5,
    targetPowerPercent: 88.5,
    thermalPowerMWt: 175.0,
    electricPowerMWe: 55.0,
    crdmPositionPercent: 78.0,
    primaryPressureMPa: 15.68,
    secondaryPressureMPa: 3.82,
    coolantInletTempC: 285.0,
    coolantOutletTempC: 310.0,
    pumps: [true, true, true, true],
    pumpRPM: [2950, 2960, 2940, 2955],
    steamGenActive: true,
    steamFlowRateTh: 295.0,
    turbineRPM: 3000,
    generatorConnected: true,
    scramActive: false,
    soundEnabled: true,
  };

  private vverHistory: number[] = new Array(40).fill(100.0);
  private ritmHistory: number[] = new Array(40).fill(88.5);
  private lastSampleTime: number = 0;

  private vverListeners: Set<StateListener<VVER1000PhysicsState>> = new Set();
  private ritmListeners: Set<StateListener<RITM200NPhysicsState>> = new Set();
  private globalListeners: Set<() => void> = new Set();

  /**
   * Подписка на изменение состояния ВВЭР-1000
   */
  public subscribeVVER(cb: StateListener<VVER1000PhysicsState>): () => void {
    this.vverListeners.add(cb);
    cb(this.vverState);
    return () => this.vverListeners.delete(cb);
  }

  /**
   * Подписка на изменение состояния РИТМ-200Н
   */
  public subscribeRITM(cb: StateListener<RITM200NPhysicsState>): () => void {
    this.ritmListeners.add(cb);
    cb(this.ritmState);
    return () => this.ritmListeners.delete(cb);
  }

  /**
   * Общая подписка на любые изменения
   */
  public subscribeAll(cb: () => void): () => void {
    this.globalListeners.add(cb);
    return () => this.globalListeners.delete(cb);
  }

  /**
   * Единая диспетчеризация команд управления
   */
  public dispatch(
    reactorId: ReactorType,
    action: ReactorActionType | string,
    payload: ActionPayload = {}
  ) {
    if (reactorId === 'vver1000') {
      this.dispatchVVER(action, payload);
    } else {
      this.dispatchRITM(action, payload);
    }
  }

  private dispatchVVER(action: string, payload: ActionPayload) {
    const s = this.vverState;
    if (s.soundEnabled) {
      if (action === 'SCRAM_TRIP') soundFx.playAlarm(true);
      else if (action.includes('TOGGLE')) soundFx.playHeavySwitch();
      else soundFx.playClick();
    }

    switch (action) {
      case 'TOGGLE_PUMP': {
        const idx = payload.pumpIndex ?? 0;
        if (idx >= 0 && idx < 4) {
          s.pumps[idx] = !s.pumps[idx];
        }
        break;
      }
      case 'TOGGLE_ALL_PUMPS': {
        const allOn = s.pumps.every(Boolean);
        s.pumps = [!allOn, !allOn, !allOn, !allOn];
        break;
      }
      case 'CRDM_STEP_UP': {
        if (!s.scramActive) {
          s.crdmPositionPercent = Math.min(100, s.crdmPositionPercent + (payload.amount ?? 5));
          s.targetPowerPercent = Math.min(100, (s.crdmPositionPercent / 88) * 100);
        }
        break;
      }
      case 'CRDM_STEP_DOWN': {
        if (!s.scramActive) {
          s.crdmPositionPercent = Math.max(0, s.crdmPositionPercent - (payload.amount ?? 5));
          s.targetPowerPercent = Math.max(0, (s.crdmPositionPercent / 88) * 100);
        }
        break;
      }
      case 'TOGGLE_STEAM_GEN': {
        const idx = payload.sgIndex;
        if (idx !== undefined && idx >= 0 && idx < 4) {
          s.steamGens[idx] = !s.steamGens[idx];
        } else {
          const allOn = s.steamGens.every(Boolean);
          s.steamGens = [!allOn, !allOn, !allOn, !allOn];
        }
        break;
      }
      case 'TOGGLE_TURBINE': {
        s.generatorConnected = !s.generatorConnected;
        break;
      }
      case 'TOGGLE_POLAR_CRANE': {
        s.polarCraneActive = !s.polarCraneActive;
        break;
      }
      case 'SCRAM_TRIP': {
        // Мгновенная Аварийная Защита АЗ-5
        s.scramActive = true;
        s.crdmPositionPercent = 0.0;
        s.targetPowerPercent = 0.0;
        s.generatorConnected = false;
        break;
      }
      case 'RESET_SCRAM': {
        s.scramActive = false;
        s.crdmPositionPercent = 40.0;
        s.targetPowerPercent = 45.0;
        s.pumps = [true, true, true, true];
        s.steamGens = [true, true, true, true];
        s.generatorConnected = true;
        break;
      }
      case 'TOGGLE_SOUND': {
        s.soundEnabled = !s.soundEnabled;
        break;
      }
    }

    this.notifyVVER();
  }

  private dispatchRITM(action: string, payload: ActionPayload) {
    const s = this.ritmState;
    if (s.soundEnabled) {
      if (action === 'SCRAM_TRIP') soundFx.playAlarm(false);
      else soundFx.playClick();
    }

    switch (action) {
      case 'TOGGLE_PUMPS':
      case 'TOGGLE_ALL_PUMPS': {
        const anyOn = s.pumps.some(Boolean);
        s.pumps = [!anyOn, !anyOn, !anyOn, !anyOn];
        break;
      }
      case 'TOGGLE_PUMP': {
        const idx = payload.pumpIndex ?? 0;
        if (idx >= 0 && idx < 4) {
          s.pumps[idx] = !s.pumps[idx];
        }
        break;
      }
      case 'CRDM_STEP_UP': {
        if (!s.scramActive) {
          s.crdmPositionPercent = Math.min(100, s.crdmPositionPercent + (payload.amount ?? 5));
          s.targetPowerPercent = Math.min(100, s.crdmPositionPercent * 1.15);
        }
        break;
      }
      case 'CRDM_STEP_DOWN': {
        if (!s.scramActive) {
          s.crdmPositionPercent = Math.max(0, s.crdmPositionPercent - (payload.amount ?? 5));
          s.targetPowerPercent = Math.max(0, s.crdmPositionPercent * 1.15);
        }
        break;
      }
      case 'TOGGLE_STEAM_GEN': {
        s.steamGenActive = !s.steamGenActive;
        break;
      }
      case 'TOGGLE_TURBINE': {
        s.generatorConnected = !s.generatorConnected;
        break;
      }
      case 'SCRAM_TRIP': {
        s.scramActive = true;
        s.crdmPositionPercent = 0.0;
        s.targetPowerPercent = 0.0;
        s.generatorConnected = false;
        break;
      }
      case 'RESET_SCRAM': {
        s.scramActive = false;
        s.crdmPositionPercent = 30.0;
        s.targetPowerPercent = 35.0;
        s.pumps = [true, true, true, true];
        s.steamGenActive = true;
        s.generatorConnected = true;
        break;
      }
      case 'TOGGLE_SOUND': {
        s.soundEnabled = !s.soundEnabled;
        break;
      }
    }

    this.notifyRITM();
  }

  private notifyVVER() {
    this.vverListeners.forEach((cb) => cb(this.vverState));
    this.globalListeners.forEach((cb) => cb());
  }

  private notifyRITM() {
    this.ritmListeners.forEach((cb) => cb(this.ritmState));
    this.globalListeners.forEach((cb) => cb());
  }

  /**
   * Кадровый тик физической модели
   */
  public update(delta: number, now: number = performance.now()) {
    const dt = Math.min(0.1, delta);

    // ==================== 1. МОДЕЛЬ ВВЭР-1000 ====================
    const v = this.vverState;
    // Обороты 4-х ГЦЭН-195М
    v.pumps.forEach((on, i) => {
      const targetRPM = on ? 1490 : 0;
      v.pumpRPM[i] = THREE.MathUtils.lerp(v.pumpRPM[i], targetRPM, dt * 1.8);
    });

    const activePumpsCount = v.pumps.filter(Boolean).length;
    const avgFlowRatio = Math.max(0.1, activePumpsCount / 4);

    // Мощность ВВЭР-1000
    const targetVVERPower = v.scramActive ? 0.0 : (v.crdmPositionPercent / 88) * 100;
    v.targetPowerPercent = targetVVERPower;
    const vverInertia = v.scramActive ? 4.2 : 1.1;
    v.powerPercent = THREE.MathUtils.lerp(v.powerPercent, v.targetPowerPercent, dt * vverInertia);

    v.thermalPowerMWt = (v.powerPercent / 100) * 3000.0;
    const turbineSpinning = v.generatorConnected && v.powerPercent > 5;
    v.electricPowerMWe = turbineSpinning ? (v.powerPercent / 100) * 1000.0 : 0.0;

    // Обороты турбины К-1000-60/1500
    const targetTurbineRPM = turbineSpinning ? 1500 : 0;
    v.turbineRPM = THREE.MathUtils.lerp(v.turbineRPM, targetTurbineRPM, dt * 1.4);

    // Теплофизика 1-го контура ВВЭР-1000
    const normPv = v.powerPercent / 100;
    v.coolantInletTempC = THREE.MathUtils.lerp(v.coolantInletTempC, 285.0 + normPv * 5.2, dt * 1.2);
    const deltaTv = (normPv * 31.2) / avgFlowRatio;
    v.coolantOutletTempC = THREE.MathUtils.lerp(v.coolantOutletTempC, v.coolantInletTempC + deltaTv, dt * 1.5);
    v.primaryPressureMPa = THREE.MathUtils.lerp(v.primaryPressureMPa, 15.70 + normPv * 0.15, dt * 0.6);

    // 4 ПГВ-1000
    const activeSGs = v.steamGens.filter(Boolean).length;
    const targetSteamVVER = (activeSGs / 4) * normPv * 5880.0;
    v.steamFlowRateTh = THREE.MathUtils.lerp(v.steamFlowRateTh, targetSteamVVER, dt * 1.8);
    v.secondaryPressureMPa = THREE.MathUtils.lerp(v.secondaryPressureMPa, activeSGs > 0 ? (5.0 + normPv * 1.27) : 1.2, dt * 1.0);

    // ==================== 2. МОДЕЛЬ РИТМ-200Н ====================
    const r = this.ritmState;
    r.pumps.forEach((on, i) => {
      const targetRPM = on ? 2950 : 0;
      r.pumpRPM[i] = THREE.MathUtils.lerp(r.pumpRPM[i], targetRPM, dt * 2.2);
    });

    const targetRITMPower = r.scramActive ? 0.0 : Math.min(100, r.crdmPositionPercent * 1.15);
    r.targetPowerPercent = targetRITMPower;
    const ritmInertia = r.scramActive ? 4.5 : 1.2;
    r.powerPercent = THREE.MathUtils.lerp(r.powerPercent, r.targetPowerPercent, dt * ritmInertia);
    r.thermalPowerMWt = (r.powerPercent / 100) * 190.0;
    r.electricPowerMWe = r.generatorConnected && r.powerPercent > 5 ? (r.powerPercent / 100) * 55.0 : 0.0;

    const targetSMRTurbineRPM = r.generatorConnected && r.powerPercent > 5 ? 3000 : 0;
    r.turbineRPM = THREE.MathUtils.lerp(r.turbineRPM, targetSMRTurbineRPM, dt * 1.6);

    const normPr = r.powerPercent / 100;
    r.coolantInletTempC = THREE.MathUtils.lerp(r.coolantInletTempC, 280.0 + normPr * 5.0, dt * 1.5);
    r.coolantOutletTempC = THREE.MathUtils.lerp(r.coolantOutletTempC, 280.0 + normPr * 30.0, dt * 1.8);
    r.primaryPressureMPa = THREE.MathUtils.lerp(r.primaryPressureMPa, 15.0 + normPr * 0.68, dt * 0.8);
    r.steamFlowRateTh = THREE.MathUtils.lerp(r.steamFlowRateTh, r.steamGenActive ? normPr * 310.0 : 0, dt * 2.0);
    r.secondaryPressureMPa = THREE.MathUtils.lerp(r.secondaryPressureMPa, r.steamGenActive ? (2.0 + normPr * 1.82) : 0.5, dt * 1.2);

    // Запись истории мощности для экранов раз в 200мс
    if (now - this.lastSampleTime > 200) {
      this.lastSampleTime = now;
      this.vverHistory.push(v.powerPercent);
      if (this.vverHistory.length > 40) this.vverHistory.shift();

      this.ritmHistory.push(r.powerPercent);
      if (this.ritmHistory.length > 40) this.ritmHistory.shift();
    }
  }

  public getHistory(reactorId: ReactorType): number[] {
    return reactorId === 'vver1000' ? this.vverHistory : this.ritmHistory;
  }
}

export const reactorStateManager = new ReactorStateManager();

/**
 * Прокси-объект для обратной совместимости с существующим ritmSimulation
 */
export const ritmSimulation = {
  get state() {
    return {
      powerPercent: reactorStateManager.ritmState.powerPercent,
      targetPowerPercent: reactorStateManager.ritmState.targetPowerPercent,
      crdmPositionPercent: reactorStateManager.ritmState.crdmPositionPercent,
      primaryPressureMPa: reactorStateManager.ritmState.primaryPressureMPa,
      secondaryPressureMPa: reactorStateManager.ritmState.secondaryPressureMPa,
      coolantInletTempC: reactorStateManager.ritmState.coolantInletTempC,
      coolantOutletTempC: reactorStateManager.ritmState.coolantOutletTempC,
      pumpRPM: reactorStateManager.ritmState.pumpRPM[0],
      targetPumpRPM: reactorStateManager.ritmState.pumps[0] ? 3000 : 0,
      pumpsRunning: reactorStateManager.ritmState.pumps.some(Boolean),
      steamGenActive: reactorStateManager.ritmState.steamGenActive,
      steamFlowRateTh: reactorStateManager.ritmState.steamFlowRateTh,
      scramActive: reactorStateManager.ritmState.scramActive,
      soundEnabled: reactorStateManager.ritmState.soundEnabled,
    };
  },
  subscribe(cb: (state: any) => void) {
    return reactorStateManager.subscribeRITM(() => cb(this.state));
  },
  dispatch(action: string) {
    reactorStateManager.dispatch('ritm200n', action);
  },
  update(delta: number, now?: number) {
    reactorStateManager.update(delta, now);
  },
  getPowerHistory() {
    return reactorStateManager.getHistory('ritm200n');
  },
};

/**
 * Отрисовщик текстур мониторов БЩУ с поддержкой ВВЭР-1000 и РИТМ-200Н
 */
export class MCRCanvasMonitorRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  private lastRenderTime: number = 0;
  public reactorId: ReactorType;

  constructor(width: number = 1024, height: number = 512, reactorId: ReactorType = 'ritm200n') {
    this.reactorId = reactorId;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create 2d context for MCR monitor');
    this.ctx = ctx;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
  }

  public update(now: number = performance.now()) {
    if (now - this.lastRenderTime < 100) return; // 10 FPS monitor refresh rate (optimal for SCADA screens)
    this.lastRenderTime = now;

    if (this.reactorId === 'vver1000') {
      this.renderVVER1000(now);
    } else {
      this.renderRITM200N(now);
    }

    this.texture.needsUpdate = true;
  }

  private renderVVER1000(now: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const state = reactorStateManager.vverState;
    const history = reactorStateManager.getHistory('vver1000');

    // Фон
    ctx.fillStyle = '#080d12';
    ctx.fillRect(0, 0, w, h);

    // Сетка мнемосхемы
    ctx.strokeStyle = 'rgba(0, 180, 240, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Верхняя статусная панель
    const isAZ = state.scramActive;
    ctx.fillStyle = isAZ ? (Math.sin(now * 0.012) > 0 ? '#990000' : '#440000') : '#0f2230';
    ctx.fillRect(0, 0, w, 46);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('АСУ ТП ВВЭР-1000 (В-320) · ЭНЕРГОБЛОК №1', 20, 31);

    if (isAZ) {
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('ВНИМАНИЕ: СРАБОТАЛА АЗ-5 · СБРОС 61 ГРУППЫ СУЗ · ОТКЛЮЧЕНИЕ ТВВ-1000', w - 660, 31);
    } else {
      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('НОРМАЛЬНЫЙ РЕЖИМ · 3000 МВт(т) / 1000 МВт(э) · 4 ПЕТЛИ', w - 580, 31);
    }

    // Левый блок: График мощности N(t)
    const gx = 20, gy = 60, gw = 480, gh = 230;
    ctx.fillStyle = '#0b1620';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = '#1d3648';
    ctx.strokeRect(gx, gy, gw, gh);

    ctx.fillStyle = '#78a2ba';
    ctx.font = '13px monospace';
    ctx.fillText('ТЕПЛОВАЯ МОЩНОСТЬ РЕАКТОРА N(t) [0..3000 МВт(т)]', gx + 12, gy + 22);

    // График
    ctx.strokeStyle = isAZ ? '#ff3333' : '#00d2ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    history.forEach((val, i) => {
      const px = gx + (i / (history.length - 1)) * gw;
      const py = gy + gh - (val / 100) * (gh - 40) - 15;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    ctx.fillStyle = isAZ ? '#ff4444' : '#00f0ff';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(`${state.thermalPowerMWt.toFixed(0)} МВт(т)`, gx + gw - 185, gy + 45);

    // Правый блок параметров 4-петлевой схемы
    const tx = 520, ty = 60, tw = 480;
    const params = [
      { label: 'ДАВЛЕНИЕ 1-ГО КОНТУРА', val: `${state.primaryPressureMPa.toFixed(2)} МПа`, color: '#00d2ff' },
      { label: 'ТЕМПЕРАТУРА ГОРЯЧИХ НИТОК (Тгор)', val: `${state.coolantOutletTempC.toFixed(1)} °C`, color: '#ff6b6b' },
      { label: 'ТЕМПЕРАТУРА ХОЛОДНЫХ НИТОК (Тхол)', val: `${state.coolantInletTempC.toFixed(1)} °C`, color: '#ffd166' },
      { label: 'ДАВЛЕНИЕ ПАРА В 4-х ПГВ-1000', val: `${state.secondaryPressureMPa.toFixed(2)} МПа`, color: '#64dfdf' },
      { label: 'СУММАРНЫЙ РАСХОД ПАРА', val: `${state.steamFlowRateTh.toFixed(0)} т/ч`, color: '#48cae4' },
      { label: 'ПОЛОЖЕНИЕ 61 ГРУППЫ ШУОК СУЗ', val: `${state.crdmPositionPercent.toFixed(0)}%`, color: '#ffd166' },
      { label: 'ТУРБОАГРЕГАТ К-1000-60/1500', val: `${Math.round(state.turbineRPM)} об/мин · ${state.electricPowerMWe.toFixed(0)} МВт`, color: state.generatorConnected ? '#06d6a0' : '#888888' },
    ];

    params.forEach((p, idx) => {
      const iy = ty + idx * 34;
      ctx.fillStyle = '#0f2230';
      ctx.fillRect(tx, iy, tw, 30);
      ctx.fillStyle = '#8da8b8';
      ctx.font = '13px monospace';
      ctx.fillText(p.label, tx + 10, iy + 20);

      ctx.fillStyle = p.color;
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(p.val, tx + tw - 12, iy + 21);
      ctx.textAlign = 'left';
    });

    // Нижняя мнемосхема 4-х петель ГЦЭН и ПГВ-1000
    const by = 310, bw = 980, bh = 185;
    ctx.fillStyle = '#0c1720';
    ctx.fillRect(gx, by, bw, bh);
    ctx.strokeStyle = '#1a3040';
    ctx.strokeRect(gx, by, bw, bh);

    ctx.fillStyle = '#8da8b8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('СОСТОЯНИЕ 4-Х ТЕХНОЛОГИЧЕСКИХ ПЕТЕЛЬ 1-ГО КОНТУРА (ГЦЭН-195М И ПГВ-1000)', gx + 15, by + 22);

    // 4 секции петель
    for (let i = 0; i < 4; i++) {
      const ix = gx + 12 + i * 242;
      const iy = by + 36;
      const pumpOn = state.pumps[i];
      const sgOn = state.steamGens[i];

      ctx.fillStyle = pumpOn ? 'rgba(0, 210, 255, 0.08)' : 'rgba(255, 50, 50, 0.08)';
      ctx.fillRect(ix, iy, 230, 136);
      ctx.strokeStyle = pumpOn ? '#00b4d8' : '#cc3333';
      ctx.strokeRect(ix, iy, 230, 136);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`ПЕТЛЯ №${i + 1}`, ix + 10, iy + 22);

      ctx.fillStyle = pumpOn ? '#00ffcc' : '#ff4444';
      ctx.font = '12px monospace';
      ctx.fillText(`ГЦЭН: ${pumpOn ? `${Math.round(state.pumpRPM[i])} об/мин` : 'ОСТАНОВЛЕН'}`, ix + 10, iy + 48);

      ctx.fillStyle = sgOn ? '#64dfdf' : '#ff9999';
      ctx.fillText(`ПГВ-1000: ${sgOn ? 'ГЕНЕРАЦИЯ' : 'ОТКЛЮЧЕН'}`, ix + 10, iy + 74);

      ctx.fillStyle = '#d0d8e0';
      ctx.fillText(`Тхол: ${state.coolantInletTempC.toFixed(1)}°C | Тгор: ${state.coolantOutletTempC.toFixed(1)}°C`, ix + 10, iy + 100);

      ctx.fillStyle = '#8da8b8';
      ctx.fillText(`Расход: ${(state.steamFlowRateTh / 4).toFixed(0)} т/ч`, ix + 10, iy + 124);
    }
  }

  private renderRITM200N(now: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const state = reactorStateManager.ritmState;
    const history = reactorStateManager.getHistory('ritm200n');

    ctx.fillStyle = '#0a1014';
    ctx.fillRect(0, 0, w, h);

    // Сетка
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Верхняя шапка
    ctx.fillStyle = state.scramActive ? '#8b0000' : '#142530';
    ctx.fillRect(0, 0, w, 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('АСУ ТП РИТМ-200Н · ЭНЕРГОБЛОК АСММ · 175 МВт(т) / 55 МВт(э)', 20, 30);

    if (state.scramActive) {
      ctx.fillStyle = Math.sin(now * 0.01) > 0 ? '#ff2222' : '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('ВНИМАНИЕ: СРАБОТАЛА АВАРИЙНАЯ ЗАЩИТА (АЗ)', w - 540, 30);
    } else {
      ctx.fillStyle = '#00ffaa';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('НОРМАЛЬНАЯ ЭКСПЛУАТАЦИЯ · ИНТЕГРАЛЬНАЯ АСММ', w - 480, 30);
    }

    // График
    const gx = 25, gy = 65, gw = 480, gh = 230;
    ctx.fillStyle = '#0d1820';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = '#1e3848';
    ctx.strokeRect(gx, gy, gw, gh);

    ctx.fillStyle = '#78a2ba';
    ctx.font = '14px monospace';
    ctx.fillText('ТЕПЛОВАЯ МОЩНОСТЬ АСММ [0..190 МВт(т)]', gx + 12, gy + 24);

    ctx.strokeStyle = state.scramActive ? '#ff4444' : '#00d2ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    history.forEach((val, i) => {
      const px = gx + (i / (history.length - 1)) * gw;
      const py = gy + gh - (val / 100) * (gh - 40) - 15;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    ctx.fillStyle = state.scramActive ? '#ff3333' : '#00f0ff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${state.thermalPowerMWt.toFixed(0)} МВт`, gx + gw - 150, gy + 45);

    // Правый блок
    const tx = 530, ty = 65, tw = 470;
    const params = [
      { label: 'ДАВЛЕНИЕ 1-ГО КОНТУРА', val: `${state.primaryPressureMPa.toFixed(2)} МПа`, color: '#00d2ff' },
      { label: 'ДАВЛЕНИЕ ВТОРОГО КОНТУРА', val: `${state.secondaryPressureMPa.toFixed(2)} МПа`, color: '#64dfdf' },
      { label: 'ТЕМП. НА ВХОДЕ В РК (Tвх)', val: `${state.coolantInletTempC.toFixed(1)} °C`, color: '#ffd166' },
      { label: 'ТЕМП. НА ВЫХОДЕ (Tвых)', val: `${state.coolantOutletTempC.toFixed(1)} °C`, color: '#ff6b6b' },
      { label: 'ОБОРОТЫ ГЦЭН (4 НАСОСА)', val: `${Math.round(state.pumpRPM[0])} об/мин`, color: state.pumps[0] ? '#06d6a0' : '#888888' },
      { label: 'ПОЛОЖЕНИЕ СТЕРЖНЕЙ СУЗ (19 шт)', val: `${state.crdmPositionPercent.toFixed(0)}%`, color: '#ffd166' },
      { label: 'ТУРБИНА К-55 (55 МВт)', val: `${Math.round(state.turbineRPM)} об/мин · ${state.electricPowerMWe.toFixed(0)} МВт`, color: '#48cae4' },
    ];

    params.forEach((p, idx) => {
      const iy = ty + idx * 34;
      ctx.fillStyle = '#10222e';
      ctx.fillRect(tx, iy, tw, 30);
      ctx.fillStyle = '#8da8b8';
      ctx.font = '13px monospace';
      ctx.fillText(p.label, tx + 12, iy + 20);

      ctx.fillStyle = p.color;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(p.val, tx + tw - 15, iy + 21);
      ctx.textAlign = 'left';
    });

    // Нижняя мнемосхема
    const by = 320, bw = 975, bh = 170;
    ctx.fillStyle = '#0c161d';
    ctx.fillRect(gx, by, bw, bh);
    ctx.strokeStyle = '#1c3240';
    ctx.strokeRect(gx, by, bw, bh);

    ctx.fillStyle = '#8da8b8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('ИНТЕГРАЛЬНОЕ ОБОРУДОВАНИЕ И КОНТУРЫ РИТМ-200Н', gx + 15, by + 26);

    const anyPump = state.pumps.some(Boolean);
    const items = [
      { name: '4 ГЕРМЕТИЧНЫХ ГЦЭН', status: anyPump ? 'В РАБОТЕ' : 'ОСТАНОВЛЕНЫ', active: anyPump },
      { name: 'АКТИВНАЯ ЗОНА (69 ТВС)', status: state.scramActive ? 'АЗ СБРОШЕНА' : 'КРИТИЧЕСКАЯ', active: !state.scramActive },
      { name: '12 КАССЕТ ПГ', status: state.steamGenActive ? 'ГЕНЕРАЦИЯ ПАРА' : 'ОТКЛЮЧЕНЫ', active: state.steamGenActive },
      { name: 'ТУРБОАГРЕГАТ К-55', status: state.generatorConnected ? 'СЕТЬ 55 МВт' : 'ОТКЛЮЧЕН', active: state.generatorConnected },
    ];

    items.forEach((it, i) => {
      const ix = gx + 15 + i * 240;
      const iy = by + 45;
      ctx.fillStyle = it.active ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 60, 60, 0.12)';
      ctx.fillRect(ix, iy, 225, 95);
      ctx.strokeStyle = it.active ? '#00d2ff' : '#ff4444';
      ctx.strokeRect(ix, iy, 225, 95);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(it.name, ix + 10, iy + 30);

      ctx.fillStyle = it.active ? '#00ffaa' : '#ff5555';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(it.status, ix + 10, iy + 65);
    });
  }

  public dispose() {
    this.texture.dispose();
  }
}
