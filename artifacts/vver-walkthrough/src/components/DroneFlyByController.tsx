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

const _dronePos = new THREE.Vector3();
const _droneTgt = new THREE.Vector3();
const _droneTangent = new THREE.Vector3();

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
  const lastTelemetryTime = useRef(0);

  // Closed cinematic camera flight path around the centered GLB assembly
  const { cameraPath, targetPath } = useMemo(() => {
    const camPoints = [
      new THREE.Vector3(-26, 16, 26),
      new THREE.Vector3(0, 12, 32),
      new THREE.Vector3(28, 15, 20),
      new THREE.Vector3(28, 18, -22),
      new THREE.Vector3(0, 22, -32),
      new THREE.Vector3(-28, 15, -18),
    ];

    const tgtPoints = [
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(0, 4, 0),
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(0, 5, 0),
      new THREE.Vector3(0, 6, 0),
      new THREE.Vector3(0, 4, 0),
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
    cameraPath.getPointAt(t, _dronePos);
    // Sample camera look-at target along target spline
    targetPath.getPointAt(t, _droneTgt);

    // Smoothly interpolate camera position to eliminate micro-jitter
    camera.position.lerp(_dronePos, 0.12);

    // Smoothly interpolate lookAt target for organic cinematic panning
    smoothedTarget.current.lerp(_droneTgt, 0.08);
    camera.lookAt(smoothedTarget.current);

    // Compute heading angle and telemetry with throttling (~8 Hz) to eliminate 60 FPS React re-renders
    const now = performance.now();
    if (onTelemetryUpdate && (now - lastTelemetryTime.current > 120 || paused)) {
      lastTelemetryTime.current = now;
      cameraPath.getTangentAt(t, _droneTangent);
      const heading = (Math.atan2(_droneTangent.x, _droneTangent.z) * 180) / Math.PI;
      const normalizedHeading = (heading + 360) % 360;

      // Realistic drone telemetry numbers: altitude (m), ground speed ~36 km/h at 1x
      const altitude = Math.round(_dronePos.y);
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
