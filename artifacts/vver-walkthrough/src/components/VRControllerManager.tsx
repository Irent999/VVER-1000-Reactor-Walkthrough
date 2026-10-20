import { useRef, useState, useEffect, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXRControllerLocomotion, XROrigin, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { EYE_HEIGHT, FLOOR_LEVELS, CONTAINMENT } from '@/scene/constants';
import { getFloorHeightAt, isPositionSafe } from '@/scene/floorDetection';

/** Animated glowing teleportation ring indicator for WebXR controller targeting */
function VRTeleportRing({ position, visible }: { position: [number, number, number]; visible: boolean }) {
  const innerRingRef = useRef<THREE.Mesh>(null);
  const outerRingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!visible) return;
    const t = state.clock.elapsedTime;
    if (innerRingRef.current) {
      innerRingRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = t * 1.5;
    }
  });

  if (!visible) return null;

  return (
    <group position={[position[0], position[1] + 0.04, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer segmented ring */}
      <mesh ref={outerRingRef}>
        <ringGeometry args={[0.55, 0.65, 32]} />
        <meshBasicMaterial color="#62d1a2" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner pulsing ring */}
      <mesh ref={innerRingRef}>
        <ringGeometry args={[0.3, 0.42, 32]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Center glowing beacon disc */}
      <mesh>
        <circleGeometry args={[0.18, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export interface VRControllerManagerProps {
  viewTarget?: [number, number, number];
  floorY?: number;
  activeViewId?: string;
}

function LocomotionRig({ viewTarget, floorY, activeViewId }: VRControllerManagerProps) {
  const playerRef = useRef<THREE.Group>(null);
  const { session } = useXR();
  const [teleportPos, setTeleportPos] = useState<[number, number, number]>([-32.0, 13.20, 1.8]);
  const [showRing, setShowRing] = useState(false);

  // Динамический перенос VR Dolly при смене ракурса в UI без сбивания трекинга головы
  const lastTargetKey = useRef<string>('');
  useEffect(() => {
    if (viewTarget && playerRef.current) {
      const key = `${viewTarget[0]}:${viewTarget[1]}:${viewTarget[2]}:${floorY ?? ''}`;
      if (key !== lastTargetKey.current) {
        lastTargetKey.current = key;
        const targetY = floorY !== undefined ? floorY : (viewTarget[1] <= 2 ? 0.5 : viewTarget[1]);
        playerRef.current.position.set(viewTarget[0], targetY, viewTarget[2]);
        playerRef.current.updateMatrixWorld(true);
        setTeleportPos([viewTarget[0], targetY, viewTarget[2]]);
      }
    }
  }, [viewTarget, floorY]);

  // Слушатель старта сессии WebXR: мгновенно переносит игрока внутрь БЩУ ВВЭР-1000
  useEffect(() => {
    const handleXRStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ spawn?: [number, number, number] }>;
      const spawn = customEvent.detail?.spawn || [-32.0, 13.20, 1.8];
      if (playerRef.current) {
        playerRef.current.position.set(spawn[0], spawn[1], spawn[2]);
        playerRef.current.updateMatrixWorld(true);
        setTeleportPos([spawn[0], spawn[1], spawn[2]]);
      }
    };
    window.addEventListener('webxr-session-start', handleXRStart);
    return () => window.removeEventListener('webxr-session-start', handleXRStart);
  }, []);

  // 1. Controller Thumbstick locomotion:
  // - Smooth horizontal translation (3.5 m/s)
  // - 45° Snap Turn for comfortable VR locomotion without motion sickness (Meta Quest / HTC Vive standard)
  useXRControllerLocomotion(
    playerRef as RefObject<THREE.Object3D | null>,
    { speed: 3.5 },
    { type: 'snap', degrees: 45 },
    'left',
  );

  // Secondary hand right controller snap turn support
  useXRControllerLocomotion(
    playerRef as RefObject<THREE.Object3D | null>,
    false,
    { type: 'snap', degrees: 45 },
    'right',
  );

  // 2. VR player boundary clamping, floor detection, and teleport fall reset
  useFrame(() => {
    if (!session || !playerRef.current) return;
    const p = playerRef.current.position;

    // Grounding in VR: dynamically match floor level height
    const currentFloor = getFloorHeightAt(p.x, p.z, p.y);
    const targetY = currentFloor;

    if (Math.abs(p.y - targetY) > 0.05) {
      p.y = THREE.MathUtils.lerp(p.y, targetY, 0.2);
    }

    // Safety boundary: prevent infinite falling below -12.0m in VR
    if (p.y < -12.0) {
      p.set(-32.0, 13.20, 1.8);
      return;
    }

    // Check collision safety against containment wall and technological equipment
    if (!isPositionSafe(p.x, p.z, targetY)) {
      const r = Math.hypot(p.x, p.z);
      // Guard central opening on upper deck (+36m)
      if (targetY >= 32.0 && r < 8.35) {
        const s = 8.4 / (r || 1);
        p.x *= s;
        p.z *= s;
      } else {
        const maxR = CONTAINMENT.innerRadius - 0.5;
        if (r > maxR) {
          const s = maxR / r;
          p.x *= s;
          p.z *= s;
        }
      }
    }
  });

  useEffect(() => {
    if (session) {
      setShowRing(true);
      if (playerRef.current) {
        const isWalk = activeViewId && activeViewId.startsWith('walk');
        const defaultSpawn: [number, number, number] = [-32.0, 13.20, 1.8];
        const spawnX = isWalk && viewTarget ? viewTarget[0] : defaultSpawn[0];
        const spawnY = isWalk && floorY !== undefined ? floorY : defaultSpawn[1];
        const spawnZ = isWalk && viewTarget ? viewTarget[2] : defaultSpawn[2];

        playerRef.current.position.set(spawnX, spawnY, spawnZ);
        playerRef.current.updateMatrixWorld(true);
        setTeleportPos([spawnX, spawnY, spawnZ]);
      }
    } else {
      setShowRing(false);
    }
  }, [session, viewTarget, floorY, activeViewId]);

  return (
    <>
      <XROrigin
        ref={playerRef as RefObject<THREE.Group>}
        position={[-32.0, 13.20, 1.8]}
      />
      <VRTeleportRing position={teleportPos} visible={showRing} />
    </>
  );
}

export default function VRControllerManager(props: VRControllerManagerProps) {
  return <LocomotionRig {...props} />;
}
