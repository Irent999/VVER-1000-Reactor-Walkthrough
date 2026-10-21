import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reactorStateManager } from '@/scene/reactorStateManager';

/**
 * Синтезатор непрерывной аварийной сирены АЗ-5 (Web Audio API)
 */
class EmergencySirenSynth {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private isPlaying = false;
  private isMuted = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public start() {
    if (this.isPlaying) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();

      // Двухтональная сирена АЭС (850 Гц с модуляцией ±180 Гц при частоте 1.8 Гц)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(850, this.ctx.currentTime);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(1.8, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(this.isMuted ? 0 : 0.16, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      lfo.start();

      this.osc = osc;
      this.gain = gain;
      this.lfo = lfo;
      this.isPlaying = true;
    } catch {
      // Audio autoplay policy
    }
  }

  public stop() {
    if (!this.isPlaying) return;
    try {
      if (this.gain && this.ctx) {
        this.gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      }
      setTimeout(() => {
        try {
          this.osc?.stop();
          this.lfo?.stop();
          this.osc?.disconnect();
          this.lfo?.disconnect();
          this.gain?.disconnect();
        } catch {}
        this.osc = null;
        this.lfo = null;
        this.gain = null;
        this.isPlaying = false;
      }, 120);
    } catch {
      this.isPlaying = false;
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.gain && this.ctx) {
      this.gain.gain.setValueAtTime(muted ? 0 : 0.16, this.ctx.currentTime);
    }
  }

  public getIsPlaying() {
    return this.isPlaying;
  }
}

export const emergencySiren = new EmergencySirenSynth();

/**
 * 3D-компонент световой и звуковой аварийной сигнализации АЗ-5:
 * - Мигающие красные маяки / стробоскопы в Реакторном зале (+25м) и БЩУ (+13.2м)
 * - Звуковая предупредительная сирена тревоги через Web Audio API
 * - Синхронное импульсное тревожное освещение
 */
export default function EmergencyAlarmSystem() {
  const reactorHallStrobeRef = useRef<THREE.PointLight>(null);
  const mcrStrobeRef = useRef<THREE.PointLight>(null);
  const beaconMeshRef = useRef<THREE.Mesh>(null);
  const mcrBeaconRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const unsub = reactorStateManager.subscribeAll(() => {
      const isScram = reactorStateManager.vverState.scramActive;
      if (isScram) {
        emergencySiren.start();
      } else {
        emergencySiren.stop();
      }
    });

    return () => {
      unsub();
      emergencySiren.stop();
    };
  }, []);

  useFrame((state) => {
    const isScram = reactorStateManager.vverState.scramActive;
    const t = state.clock.elapsedTime;

    if (!isScram) {
      if (reactorHallStrobeRef.current) reactorHallStrobeRef.current.intensity = 0;
      if (mcrStrobeRef.current) mcrStrobeRef.current.intensity = 0;
      if (beaconMeshRef.current) (beaconMeshRef.current.material as THREE.MeshBasicMaterial).color.set('#330000');
      if (mcrBeaconRef.current) (mcrBeaconRef.current.material as THREE.MeshBasicMaterial).color.set('#330000');
      return;
    }

    // Резкий аварийный импульс стробоскопа (частота 2.4 Гц)
    const strobePhase = (t * 2.4) % 1.0;
    const isFlash = strobePhase < 0.35;
    const intensity = isFlash ? 18.0 * (1.0 - strobePhase / 0.35) : 0.5;

    if (reactorHallStrobeRef.current) {
      reactorHallStrobeRef.current.intensity = intensity;
    }
    if (mcrStrobeRef.current) {
      mcrStrobeRef.current.intensity = intensity * 0.75;
    }

    const flashColor = isFlash ? '#ff0022' : '#440008';
    if (beaconMeshRef.current) {
      (beaconMeshRef.current.material as THREE.MeshBasicMaterial).color.set(flashColor);
    }
    if (mcrBeaconRef.current) {
      (mcrBeaconRef.current.material as THREE.MeshBasicMaterial).color.set(flashColor);
    }
  });

  return (
    <group name="EmergencyAlarmSystem_AZ5">
      {/* 1. Аварийный строб в реакторном отделении (на балке под полярным краном Y = 26м) */}
      <group position={[0, 26.5, 12]}>
        <mesh ref={beaconMeshRef}>
          <cylinderGeometry args={[0.35, 0.45, 0.6, 16]} />
          <meshBasicMaterial color="#330000" />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.15, 16]} />
          <meshStandardMaterial color="#222" metalness={0.9} roughness={0.3} />
        </mesh>
        <pointLight
          ref={reactorHallStrobeRef}
          color="#ff0022"
          intensity={0}
          distance={48}
          decay={1.8}
        />
      </group>

      {/* 2. Аварийный строб в зале БЩУ-1 (+13.2м, position X=-32, Y=16.5, Z=0) */}
      <group position={[-32.0, 16.5, 0]}>
        <mesh ref={mcrBeaconRef}>
          <cylinderGeometry args={[0.2, 0.25, 0.35, 12]} />
          <meshBasicMaterial color="#330000" />
        </mesh>
        <pointLight
          ref={mcrStrobeRef}
          color="#ff0033"
          intensity={0}
          distance={18}
          decay={2}
        />
      </group>
    </group>
  );
}
