import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useXRControllerLocomotion, XROrigin, useXR } from '@react-three/xr';
import * as THREE from 'three';
import { EYE_HEIGHT, FLOOR_LEVELS } from '@/scene/constants';

function LocomotionRig() {
  const playerRef = useRef<THREE.Group>(null);
  const { session } = useXR();

  useXRControllerLocomotion(
    playerRef as RefObject<THREE.Object3D | null>,
    { speed: 3 },
    { type: 'snap', degrees: 30 },
  );

  useFrame(() => {
    if (!session || !playerRef.current) return;
    const p = playerRef.current.position;
    // Clamp to containment interior bounds
    const r = Math.sqrt(p.x * p.x + p.z * p.z);
    if (r > 20) {
      const s = 20 / r;
      p.x *= s;
      p.z *= s;
    }
    p.y = Math.max(FLOOR_LEVELS.basement, Math.min(FLOOR_LEVELS.upper + 2, p.y));
  });

  return <XROrigin ref={playerRef as RefObject<THREE.Group>} position={[0, FLOOR_LEVELS.main + EYE_HEIGHT, 10]} />;
}

export default function VRControllerManager() {
  return <LocomotionRig />;
}
