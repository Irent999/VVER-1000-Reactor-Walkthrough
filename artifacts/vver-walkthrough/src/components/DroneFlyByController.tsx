import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface DroneWaymark {
  t: number;
  titleRu: string;
  titleEn: string;
  subRu: string;
  subEn: string;
}

export const DRONE_WAYMARKS: DroneWaymark[] = [
  {
    t: 0.0,
    titleRu: 'Юго-Западный ракурс: Главный энергоблок',
    titleEn: 'South-West Overview: Main Reactor & Turbine Island',
    subRu: 'Купол оболочки ВВЭР-1000 и машинный зал',
    subEn: 'VVER-1000 containment dome and turbine building',
  },
  {
    t: 0.18,
    titleRu: 'Южный фасад Машинного зала',
    titleEn: 'Turbine Hall South Facade',
    subRu: 'Пролёт турбоагрегата К-1000-60/1500',
    subEn: 'K-1000 turbo-generator set (1000 MWe)',
  },
  {
    t: 0.36,
    titleRu: 'Восточный торец и открытое распредустройство',
    titleEn: 'East End & Electrical Switchyard',
    subRu: 'ТВВ-1000 генератор и блочные трансформаторы 500 кВ',
    subEn: 'TVV-1000 generator and 500 kV main transformers',
  },
  {
    t: 0.54,
    titleRu: 'Северная эстакада свежего пара',
    titleEn: 'North Secondary Steam Pipe Bridge',
    subRu: '4 паропровода 6.0 МПа от парогенераторов к турбине',
    subEn: '4x main steam pipes (6.0 MPa) to high-pressure cylinder',
  },
  {
    t: 0.72,
    titleRu: 'Примыкание к оболочке и вид на озеро Тузкан',
    titleEn: 'Reactor-Turbine Interface & Lake Tuzkan Horizon',
    subRu: 'Штабной контур безопасности и береговая насосная',
    subEn: 'Safety containment boundary and water intake horizon',
  },
  {
    t: 0.88,
    titleRu: 'Западный обход: Защитная оболочка и Градирня',
    titleEn: 'West Flank: Containment Dome & Cooling Tower',
    subRu: 'Железобетонный монолит 2-го контура защиты',
    subEn: 'Pre-stressed concrete double containment structure',
  },
];

interface DroneFlyByControllerProps {
  active: boolean;
  speedMultiplier: number;
  paused: boolean;
  onTelemetryUpdate?: (telemetry: {
    t: number;
    altitude: number;
    speedKmh: number;
    headingDeg: number;
    waymark: DroneWaymark;
  }) => void;
  scrubProgress?: number | null;
}

export default function DroneFlyByController({
  active,
  speedMultiplier = 1.0,
  paused = false,
  onTelemetryUpdate,
  scrubProgress = null,
}: DroneFlyByControllerProps) {
  const { camera } = useThree();

  // Progress parameter along the closed spline [0, 1)
  const progress = useRef(0);
  const lookTarget = useRef(new THREE.Vector3());
  const smoothedTarget = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

  // Closed cinematic camera flight path around Containment Building & Turbine Hall
  const { cameraPath, targetPath } = useMemo(() => {
    // 6 strategic flight waypoints framing the reactor dome (X=0, Z=0) and turbine hall (X=77, Z=-12)
    const camPoints = [
      new THREE.Vector3(-60, 56, 78),   // SW elevated approach
      new THREE.Vector3(22, 34, 66),    // S low sweep along turbine hall
      new THREE.Vector3(138, 44, 32),   // SE switchyard & generator bay
      new THREE.Vector3(136, 68, -65),  // NE overview of steam pipe bridge
      new THREE.Vector3(42, 74, -92),   // N high diagonal looking down at dome
      new THREE.Vector3(-72, 54, -36),  // W sweep framing cooling tower & dome
    ];

    // Look-at focal points following the industrial complex center of mass
    const tgtPoints = [
      new THREE.Vector3(38, 22, -8),    // Center between dome and turbine
      new THREE.Vector3(68, 18, -10),   // Turbine shaft center
      new THREE.Vector3(88, 20, -12),   // Generator end
      new THREE.Vector3(55, 24, -14),   // Steam piping bridge
      new THREE.Vector3(12, 28, -4),    // Reactor dome apex
      new THREE.Vector3(18, 24, 0),     // Containment entrance
    ];

    const cPath = new THREE.CatmullRomCurve3(camPoints, true, 'centripetal');
    const tPath = new THREE.CatmullRomCurve3(tgtPoints, true, 'centripetal');

    return { cameraPath: cPath, targetPath: tPath };
  }, []);

  // Update progress if scrubbed from UI
  useEffect(() => {
    if (scrubProgress !== null && scrubProgress !== undefined) {
      progress.current = Math.max(0, Math.min(1, scrubProgress));
    }
  }, [scrubProgress]);

  // When drone mode becomes active, align smoothly to the current spline point
  useEffect(() => {
    if (active) {
      const pos = cameraPath.getPointAt(progress.current % 1);
      const tgt = targetPath.getPointAt(progress.current % 1);
      lookTarget.current.copy(tgt);
      smoothedTarget.current.copy(tgt);
      isInitialized.current = true;
    }
  }, [active, cameraPath, targetPath]);

  useFrame((_, dt) => {
    if (!active) return;

    // Slow cinematic flight speed: ~65 seconds for full 360° tour at 1x
    const baseLoopDuration = 65; // seconds
    if (!paused && scrubProgress === null) {
      const advance = (dt / baseLoopDuration) * speedMultiplier;
      progress.current = (progress.current + advance) % 1;
    }

    const t = (progress.current % 1 + 1) % 1;

    // Sample camera position along spline
    const pos = cameraPath.getPointAt(t);
    // Sample camera look-at target along target spline
    const tgt = targetPath.getPointAt(t);

    // Smoothly interpolate camera position to eliminate micro-jitter
    camera.position.lerp(pos, 0.12);

    // Smoothly interpolate lookAt target for organic cinematic panning
    smoothedTarget.current.lerp(tgt, 0.08);
    camera.lookAt(smoothedTarget.current);

    // Compute heading angle and telemetry
    if (onTelemetryUpdate) {
      const tangent = cameraPath.getTangentAt(t);
      const heading = (Math.atan2(tangent.x, tangent.z) * 180) / Math.PI;
      const normalizedHeading = (heading + 360) % 360;

      // Realistic drone telemetry numbers: altitude (m), ground speed ~36 km/h at 1x
      const altitude = Math.round(pos.y);
      const speedKmh = Math.round(36 * speedMultiplier * (paused ? 0 : 1));

      // Find closest landmark based on t
      let bestWaymark = DRONE_WAYMARKS[0];
      let minDiff = 999;
      for (const wm of DRONE_WAYMARKS) {
        let diff = Math.abs(wm.t - t);
        if (diff > 0.5) diff = 1 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          bestWaymark = wm;
        }
      }

      onTelemetryUpdate({
        t,
        altitude,
        speedKmh,
        headingDeg: Math.round(normalizedHeading),
        waymark: bestWaymark,
      });
    }
  });

  return null;
}
