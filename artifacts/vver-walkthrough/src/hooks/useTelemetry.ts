import { useEffect, useRef, useState } from 'react';

export interface TelemetrySnapshot {
  neutronFlux: number; // % of nominal
  primaryTemp: number; // °C, hot leg
  primaryPressure: number; // MPa
  flowRate: number; // % nominal
  steamPressure: number; // MPa
  feedwaterTemp: number; // °C
  gridPower: number; // MWe
  dcsBusA: boolean;
  dcsBusB: boolean;
  dcsBusC: boolean;
  dcsBusD: boolean;
  safetyMode: string;
  timestamp: number;
}

const BASE: TelemetrySnapshot = {
  neutronFlux: 100,
  primaryTemp: 320,
  primaryPressure: 15.7,
  flowRate: 100,
  steamPressure: 6.3,
  feedwaterTemp: 220,
  gridPower: 1000,
  dcsBusA: true,
  dcsBusB: true,
  dcsBusC: true,
  dcsBusD: true,
  safetyMode: 'NORMAL',
  timestamp: Date.now(),
};

export function useTelemetry(): TelemetrySnapshot {
  const [snap, setSnap] = useState<TelemetrySnapshot>(BASE);
  const drift = useRef<Record<string, number>>({});

  useEffect(() => {
    const id = setInterval(() => {
      drift.current.n = (drift.current.n ?? 0) + (Math.random() - 0.5) * 0.6;
      drift.current.n = Math.max(-3, Math.min(3, drift.current.n));
      const noise = (amp: number) => (Math.random() - 0.5) * amp;

      const busFlicker = Math.random() < 0.04;
      setSnap((s) => ({
        ...s,
        neutronFlux: Math.max(0, Math.min(120, 100 + drift.current.n! + noise(0.8))),
        primaryTemp: 320 + drift.current.n! * 0.4 + noise(1.2),
        primaryPressure: 15.7 + noise(0.06) + drift.current.n! * 0.01,
        flowRate: 100 + noise(0.5),
        steamPressure: 6.3 + noise(0.05),
        feedwaterTemp: 220 + noise(1.5),
        gridPower: 1000 + drift.current.n! * 3 + noise(4),
        dcsBusA: busFlicker ? !s.dcsBusA : s.dcsBusA,
        dcsBusB: s.dcsBusB,
        dcsBusC: s.dcsBusC,
        dcsBusD: busFlicker && Math.random() < 0.5 ? !s.dcsBusD : s.dcsBusD,
        safetyMode: drift.current.n! < -1.5 ? 'LOAD REDUCTION' : 'NORMAL',
        timestamp: Date.now(),
      }));
    }, 800);
    return () => clearInterval(id);
  }, []);

  return snap;
}
