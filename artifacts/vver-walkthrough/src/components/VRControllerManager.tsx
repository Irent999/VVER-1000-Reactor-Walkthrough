import { useRef, useState, useEffect, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useXRControllerLocomotion, XROrigin, useXR } from '@react-three/xr';
import * as THREE from 'three';
import {
  collectCadWalkData,
  resolveCadHorizontalStep,
  sampleCadFloorHeight,
  type CadWalkCollisionData,
} from '@/scene/cadWalkPhysics';

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
  const { scene } = useThree();
  const { session } = useXR();
  const [teleportPos, setTeleportPos] = useState<[number, number, number]>([64, 0.4, -18]);
  const [showRing, setShowRing] = useState(false);

  const cadDataRef = useRef<CadWalkCollisionData>({
    rootFound: false,
    floorMeshes: [],
    wallMeshes: [],
    heavyBoxes: [],
  });
  const lastCadRefresh = useRef(0);
  const prevVrPos = useRef(new THREE.Vector3(64, 0.4, -18));
  const currentVrFloorY = useRef(floorY !== undefined ? floorY : 0.4);

  // Динамический перенос VR Dolly при смене ракурса в UI без сбивания трекинга головы
  const lastTargetKey = useRef<string>('');
  useEffect(() => {
    if (viewTarget && playerRef.current) {
      const key = `${viewTarget[0]}:${viewTarget[1]}:${viewTarget[2]}:${floorY ?? ''}`;
      if (key !== lastTargetKey.current) {
        lastTargetKey.current = key;
        const targetY = floorY !== undefined ? floorY : 0.4;
        currentVrFloorY.current = targetY;
        playerRef.current.position.set(viewTarget[0], targetY, viewTarget[2]);
        prevVrPos.current.set(viewTarget[0], targetY, viewTarget[2]);
        playerRef.current.updateMatrixWorld(true);
        setTeleportPos([viewTarget[0], targetY, viewTarget[2]]);
      }
    }
  }, [viewTarget, floorY]);

  // Слушатель старта сессии WebXR: переносит игрока на отметку площадки выбранной зоны
  useEffect(() => {
    const handleXRStart = (e: Event) => {
      const customEvent = e as CustomEvent<{ spawn?: [number, number, number] }>;
      const spawn = customEvent.detail?.spawn || [64, 0.4, -18];
      if (playerRef.current) {
        currentVrFloorY.current = spawn[1];
        playerRef.current.position.set(spawn[0], spawn[1], spawn[2]);
        prevVrPos.current.set(spawn[0], spawn[1], spawn[2]);
        playerRef.current.updateMatrixWorld(true);
        setTeleportPos([spawn[0], spawn[1], spawn[2]]);
      }
    };
    window.addEventListener('webxr-session-start', handleXRStart);
    return () => window.removeEventListener('webxr-session-start', handleXRStart);
  }, []);

  // 1. Controller Thumbstick locomotion + 45° Snap Turn
  useXRControllerLocomotion(
    playerRef as RefObject<THREE.Object3D | null>,
    { speed: 4.8 },
    { type: 'snap', degrees: 45 },
    'left',
  );

  useXRControllerLocomotion(
    playerRef as RefObject<THREE.Object3D | null>,
    false,
    { type: 'snap', degrees: 45 },
    'right',
  );

  // 2. Реальное перемещение по платформам/мостикам CAD и скольжение вдоль стен в масштабе 1:1
  useFrame((_, dt) => {
    if (!session || !playerRef.current) return;

    const now = performance.now();
    if (!cadDataRef.current.rootFound && now - lastCadRefresh.current > 800) {
      lastCadRefresh.current = now;
      cadDataRef.current = collectCadWalkData(scene);
    }

    const p = playerRef.current.position;
    const dx = p.x - prevVrPos.current.x;
    const dz = p.z - prevVrPos.current.z;

    const resolved = resolveCadHorizontalStep(
      prevVrPos.current.x,
      prevVrPos.current.z,
      currentVrFloorY.current,
      dx,
      dz,
      cadDataRef.current
    );
    p.x = resolved.x;
    p.z = resolved.z;

    const fallbackY = floorY !== undefined ? floorY : 0.4;
    const detectedFloorY = sampleCadFloorHeight(
      p.x,
      p.z,
      currentVrFloorY.current,
      fallbackY,
      cadDataRef.current
    );
    currentVrFloorY.current = detectedFloorY;

    const frameDt = Math.min(dt, 0.05);
    if (Math.abs(p.y - detectedFloorY) > 0.01) {
      p.y = THREE.MathUtils.damp(p.y, detectedFloorY, 16, frameDt);
    } else {
      p.y = detectedFloorY;
    }

    prevVrPos.current.copy(p);
  });

  useEffect(() => {
    if (session) {
      setShowRing(true);
      if (playerRef.current) {
        const isWalk = activeViewId && (activeViewId.startsWith('walk') || activeViewId.includes('steam'));
        const defaultSpawn: [number, number, number] = [64, 0.4, -18];
        const spawnX = isWalk && viewTarget ? viewTarget[0] : defaultSpawn[0];
        const spawnY = isWalk && floorY !== undefined ? floorY : defaultSpawn[1];
        const spawnZ = isWalk && viewTarget ? viewTarget[2] : defaultSpawn[2];

        currentVrFloorY.current = spawnY;
        playerRef.current.position.set(spawnX, spawnY, spawnZ);
        prevVrPos.current.set(spawnX, spawnY, spawnZ);
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
        position={[64, 0.4, -18]}
      />
      <VRTeleportRing position={teleportPos} visible={showRing} />
    </>
  );
}

export default function VRControllerManager(props: VRControllerManagerProps) {
  return <LocomotionRig {...props} />;
}
