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

function LocomotionRig() {
  const playerRef = useRef<THREE.Group>(null);
  const { session } = useXR();
  const [teleportPos] = useState<[number, number, number]>([0, FLOOR_LEVELS.main, 10]);
  const [showRing, setShowRing] = useState(false);

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
      p.set(0, FLOOR_LEVELS.main, 10);
      return;
    }

    // Check collision safety
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
    } else {
      setShowRing(false);
    }
  }, [session]);

  return (
    <>
      <XROrigin
        ref={playerRef as RefObject<THREE.Group>}
        position={[0, FLOOR_LEVELS.main, 10]}
      />
      <VRTeleportRing position={teleportPos} visible={showRing} />
    </>
  );
}

export default function VRControllerManager() {
  return <LocomotionRig />;
}
