import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ARID_SOIL_COLOR, YELLOW, FLOOR_LEVELS } from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

const soilMat = new THREE.MeshStandardMaterial({ color: ARID_SOIL_COLOR, roughness: 1, metalness: 0 });
const concreteMat = new THREE.MeshStandardMaterial({
  color: '#ffffff', map: concreteMap, roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap, normalScale: new THREE.Vector2(0.22, 0.22),
  roughness: 0.92, metalness: 0.02,
});
const steelMat = new THREE.MeshStandardMaterial({
  color: '#ffffff', map: brushedSteelMap, roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap, normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.35, metalness: 0.85,
});
const fenceMat = new THREE.MeshStandardMaterial({ color: '#6a6a62', roughness: 0.6, metalness: 0.4 });

function LowHills({ position, scale, color }: { position: [number, number, number]; scale: number; color: string }) {
  return (
    <mesh position={position} scale={[scale, scale * 0.4, scale]}>
      <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

function TowerCrane({ position, height = 40 }: { position: [number, number, number]; height?: number }) {
  const jibRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (jibRef.current) jibRef.current.rotation.y += dt * 0.04; });

  const cabY = height;
  return (
    <group position={position}>
      {/* Mast - lattice structure */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[1.2, height, 1.2]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Lattice cross-bracing on mast */}
      {Array.from({ length: Math.floor(height / 3) }).map((_, i) => (
        <group key={i} position={[0, 2 + i * 3, 0]}>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[1.7, 0.12, 0.12]} />
            <primitive object={steelMat} attach="material" />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[1.7, 0.12, 0.12]} />
            <primitive object={steelMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Operator cab + rotating jib */}
      <group ref={jibRef} position={[0, cabY, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 1.8, 1.8]} />
          <meshStandardMaterial color={YELLOW} roughness={0.45} metalness={0.4} />
        </mesh>
        {/* Long jib arm */}
        <mesh position={[12, 0.4, 0]} castShadow>
          <boxGeometry args={[24, 0.7, 0.9]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
        {/* Counter-jib */}
        <mesh position={[-6, 0.4, 0]} castShadow>
          <boxGeometry args={[10, 0.7, 0.9]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
        {/* Counterweight */}
        <mesh position={[-10, 0.4, 0]} castShadow>
          <boxGeometry args={[3, 2, 1.5]} />
          <meshStandardMaterial color="#2a2a30" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Trolley + hook cable */}
        <mesh position={[8, -0.3, 0]}>
          <boxGeometry args={[1, 0.5, 0.8]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
        <mesh position={[8, -4, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 8, 6]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
        <mesh position={[8, -8.5, 0]} castShadow>
          <boxGeometry args={[2, 1, 1.5]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
        {/* Jib lattice truss details */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[2 + i * 3, 0.4, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[1.5, 0.08, 0.08]} />
            <primitive object={steelMat} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function RebarCage({ position, w = 3, d = 3, h = 3 }: { position: [number, number, number]; w?: number; d?: number; h?: number }) {
  const bars: React.ReactNode[] = [];
  const cols = Math.ceil(w / 0.6);
  const rows = Math.ceil(d / 0.6);
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      bars.push(
        <mesh key={`v-${i}-${j}`} position={[position[0] - w / 2 + i * (w / cols), position[1] + h / 2, position[2] - d / 2 + j * (d / rows)]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, h, 5]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.85} metalness={0.3} />
        </mesh>
      );
    }
  }
  for (let level = 0; level <= Math.ceil(h / 0.6); level++) {
    const y = position[1] + level * (h / Math.ceil(h / 0.6));
    bars.push(
      <mesh key={`rim-${level}`} position={[position[0], y, position[2]]} renderOrder={1}>
        <boxGeometry args={[w, 0.03, d]} />
        <meshStandardMaterial color="#4a3a2a" roughness={0.85} metalness={0.3} wireframe transparent opacity={0.6} />
      </mesh>
    );
  }
  return <group>{bars}</group>;
}

function ConcreteMixer({ position }: { position: [number, number, number] }) {
  const drumRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (drumRef.current) drumRef.current.rotation.x += dt * 0.5; });
  return (
    <group position={position}>
      {/* Chassis */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[4, 2, 2.5]} />
        <meshStandardMaterial color="#3a4a5a" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Cab */}
      <mesh position={[1.6, 2.8, 0]} castShadow>
        <boxGeometry args={[1.5, 1.5, 2.3]} />
        <meshStandardMaterial color="#fcbf49" roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Drum */}
      <mesh ref={drumRef} position={[-1.5, 3, 0]} rotation={[0, 0, Math.PI / 2.5]} castShadow>
        <cylinderGeometry args={[1.4, 1.4, 4, 16]} />
        <meshStandardMaterial color="#e0e0d8" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Chute */}
      <mesh position={[-3.5, 2, 0]} rotation={[0, 0, -Math.PI / 5]} castShadow>
        <cylinderGeometry args={[0.3, 0.2, 2, 8]} />
        <meshStandardMaterial color="#e0e0d8" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Wheels */}
      {[-1.2, 0.8, 1.6].map((wx) => [-1, 1].map((wz) => (
        <mesh key={`w-${wx}-${wz}`} position={[wx, 0.7, wz * 1.3]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.7, 0.7, 0.5, 12]} />
          <meshStandardMaterial color="#1a1a20" roughness={0.8} metalness={0.2} />
        </mesh>
      )))}
    </group>
  );
}

function SafetyFence({ position, rotation = [0, 0, 0], length = 20 }: { position: [number, number, number]; rotation?: [number, number, number]; length?: number }) {
  const posts = Math.ceil(length / 2);
  return (
    <group position={position} rotation={rotation}>
      {/* Posts */}
      {Array.from({ length: posts + 1 }).map((_, i) => (
        <mesh key={`p-${i}`} position={[-length / 2 + i * 2, 1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 2, 6]} />
          <primitive object={fenceMat} attach="material" />
        </mesh>
      ))}
      {/* Mesh panels */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[length, 1.5, 0.02]} />
        <meshStandardMaterial color="#a0a098" roughness={0.5} metalness={0.3} wireframe transparent opacity={0.4} />
      </mesh>
      {/* Top rail */}
      <mesh position={[0, 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, length, 6]} />
        <primitive object={fenceMat} attach="material" />
      </mesh>
    </group>
  );
}

function ConcreteBatchPlant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Silos */}
      {[0, 4.5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 6, 0]} castShadow>
            <cylinderGeometry args={[2, 2, 12, 16]} />
            <meshStandardMaterial color="#d0d0c8" roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, 12.5, 0]} castShadow>
            <coneGeometry args={[2, 1.5, 16]} />
            <meshStandardMaterial color="#c0c0b8" roughness={0.6} metalness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Support structure */}
      {[-2, 2, 6.5].map((x) => [-2, 2].map((z) => (
        <mesh key={`s-${x}-${z}`} position={[x, 3, z]} castShadow>
          <boxGeometry args={[0.4, 12, 0.4]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
      )))}
      {/* Conveyor */}
      <mesh position={[9, 4, 0]} rotation={[0, 0, -Math.PI / 8]} castShadow>
        <boxGeometry args={[10, 0.4, 1.5]} />
        <meshStandardMaterial color="#3a4a5a" roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

export default function ExteriorScene() {
  const groundY = FLOOR_LEVELS.ground;
  return (
    <group>
      {/* Ground plane - flat arid terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, groundY, 0]}>
        <planeGeometry args={[500, 500]} />
        <primitive object={soilMat} attach="material" />
      </mesh>

      {/* Distant low hills (not pyramids) */}
      <LowHills position={[-200, groundY, -250]} scale={60} color="#9a8a70" />
      <LowHills position={[180, groundY, -280]} scale={70} color="#8a7a60" />
      <LowHills position={[-300, groundY, 100]} scale={55} color="#9a8a70" />
      <LowHills position={[250, groundY, 150]} scale={50} color="#8a7a60" />
      <LowHills position={[-280, groundY, -80]} scale={45} color="#a09a80" />

      {/* Tower cranes around the site */}
      <TowerCrane position={[40, groundY, 35]} height={45} />
      <TowerCrane position={[-45, groundY, -30]} height={50} />
      <TowerCrane position={[50, groundY, -40]} height={38} />

      {/* Concrete batching plant */}
      <ConcreteBatchPlant position={[-55, groundY, 25]} />

      {/* Concrete mixer truck */}
      <ConcreteMixer position={[-35, groundY, 40]} />

      {/* Rebar cages */}
      <RebarCage position={[28, groundY, 18]} w={4} d={4} h={3} />
      <RebarCage position={[-30, groundY, 22]} w={3} d={5} h={3} />
      <RebarCage position={[33, groundY, -22]} w={4} d={3} h={2.5} />
      <RebarCage position={[-25, groundY, -15]} w={3} d={3} h={2} />

      {/* Concrete foundation blocks / outdoor structures */}
      <mesh position={[22, groundY + 1.5, 28]} castShadow receiveShadow>
        <boxGeometry args={[7, 3, 5]} />
        <primitive object={concreteMat} attach="material" />
      </mesh>
      <mesh position={[-27, groundY + 1, -18]} castShadow receiveShadow>
        <boxGeometry args={[6, 2, 6]} />
        <primitive object={concreteMat} attach="material" />
      </mesh>
      <mesh position={[40, groundY + 2.5, 8]} castShadow receiveShadow>
        <boxGeometry args={[5, 5, 5]} />
        <primitive object={concreteMat} attach="material" />
      </mesh>
      <mesh position={[-38, groundY + 3.5, 38]} castShadow receiveShadow>
        <boxGeometry args={[9, 7, 4]} />
        <primitive object={concreteMat} attach="material" />
      </mesh>

      {/* Safety fences around the site perimeter */}
      <SafetyFence position={[0, groundY, 65]} length={120} />
      <SafetyFence position={[0, groundY, -65]} length={120} />
      <SafetyFence position={[65, groundY, 0]} rotation={[0, Math.PI / 2, 0]} length={120} />
      <SafetyFence position={[-65, groundY, 0]} rotation={[0, Math.PI / 2, 0]} length={120} />

      {/* Access road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY + 0.05, 80]} receiveShadow>
        <planeGeometry args={[10, 40]} />
        <meshStandardMaterial color="#5a5a52" roughness={0.95} />
      </mesh>

      {/* Construction materials stacks */}
      <mesh position={[-15, groundY + 0.5, 45]} castShadow>
        <boxGeometry args={[8, 1, 3]} />
        <meshStandardMaterial color="#8a7a5a" roughness={0.9} />
      </mesh>
      <mesh position={[-15, groundY + 1.5, 45]} castShadow>
        <boxGeometry args={[7, 1, 2.5]} />
        <meshStandardMaterial color="#7a6a4a" roughness={0.9} />
      </mesh>
    </group>
  );
}
