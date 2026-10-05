import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOOR_LEVELS } from '@/scene/constants';
import { concreteMap, concreteNormalMap, concreteRoughnessMap } from '@/scene/pbrTextures';

const rackMat = new THREE.MeshStandardMaterial({ color: '#2b2d33', roughness: 0.45, metalness: 0.7 });
const rackFrontMat = new THREE.MeshStandardMaterial({ color: '#1a1c22', roughness: 0.4, metalness: 0.6 });
const raisedFloorMat = new THREE.MeshStandardMaterial({ color: '#1e1e26', roughness: 0.25, metalness: 0.15 });
const wallMat = new THREE.MeshStandardMaterial({
  color: '#33333d', map: concreteMap, roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap, normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.75, metalness: 0.1,
});
const ceilingMat = new THREE.MeshStandardMaterial({ color: '#2a2a32', roughness: 0.8 });
const cableTrayMat = new THREE.MeshStandardMaterial({ color: '#4a4a52', roughness: 0.55, metalness: 0.5 });

interface LEDProps { position: [number, number, number]; color: string; delay: number }
function LED({ position, color, delay }: LEDProps) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (ref.current) {
      const t = (state.clock.elapsedTime + delay) * 2.5;
      ref.current.emissiveIntensity = (Math.sin(t) > 0.2 ? 1.2 : 0.08);
    }
  });
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={1} />
    </mesh>
  );
}

function TelemetryScreen({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const screenRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (screenRef.current) {
      const t = state.clock.elapsedTime;
      screenRef.current.opacity = 0.7 + Math.sin(t * 1.5) * 0.08;
    }
  });
  return (
    <group position={position} rotation={rotation}>
      {/* Monitor frame */}
      <mesh castShadow>
        <boxGeometry args={[1.8, 1.1, 0.08]} />
        <meshStandardMaterial color="#1a1a20" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Screen surface */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.6, 0.9]} />
        <meshBasicMaterial ref={screenRef} color="#00cc66" transparent opacity={0.7} />
      </mesh>
      {/* Scanlines / data overlay */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[1.6, 0.9]} />
        <meshBasicMaterial color="#003322" transparent opacity={0.3} wireframe />
      </mesh>
      {/* Stand */}
      <mesh position={[0, -0.8, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, -1.05, 0]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.3]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

function ServerRack({ position, rotation = [0, 0, 0], train }: { position: [number, number, number]; rotation?: [number, number, number]; train: number }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Rack chassis */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.9, 2.4, 1.0]} />
        <primitive object={rackMat} attach="material" />
      </mesh>
      {/* Front panel */}
      <mesh position={[0, 0, 0.51]}>
        <boxGeometry args={[0.85, 2.35, 0.02]} />
        <primitive object={rackFrontMat} attach="material" />
      </mesh>
      {/* 1U server units with LEDs */}
      {Array.from({ length: 14 }).map((_, i) => {
        const y = -1.05 + i * 0.15;
        const isGreen = (i + train * 3) % 4 !== 0;
        return (
          <group key={i} position={[0, y, 0.53]}>
            <mesh>
              <boxGeometry args={[0.7, 0.1, 0.02]} />
              <meshStandardMaterial color="#2e3038" roughness={0.4} metalness={0.5} />
            </mesh>
            {/* Status LEDs */}
            <LED position={[-0.28, 0, 0.015]} color={isGreen ? '#00ff66' : '#ff3333'} delay={i * 0.15 + train * 0.5} />
            <LED position={[-0.2, 0, 0.015]} color="#00aaff" delay={i * 0.22 + train * 0.3 + 0.5} />
            {/* Vent slots */}
            <mesh position={[0.15, 0, 0.012]}>
              <boxGeometry args={[0.3, 0.06, 0.01]} />
              <meshStandardMaterial color="#1a1c22" roughness={0.5} />
            </mesh>
          </group>
        );
      })}
      {/* Rack top exhaust */}
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.85, 0.15, 0.98]} />
        <meshStandardMaterial color="#1a1a20" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Train label glow strip */}
      <mesh position={[0, -1.25, 0.53]}>
        <boxGeometry args={[0.7, 0.04, 0.01]} />
        <meshBasicMaterial color={['#ff6b35', '#4cc9f0', '#06d6a0', '#fcbf49'][train % 4]} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function CableTray({ position, rotation = [0, 0, 0], length = 6 }: { position: [number, number, number]; rotation?: [number, number, number]; length?: number }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Tray body */}
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.12, length]} />
        <primitive object={cableTrayMat} attach="material" />
      </mesh>
      {/* Cable bundles (colored) */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.25, 0.08, length - 0.2]} />
        <meshStandardMaterial color="#1a3a5a" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[-0.08, 0.08, 0]}>
        <boxGeometry args={[0.08, 0.08, length - 0.2]} />
        <meshStandardMaterial color="#5a2a1a" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0.08, 0.08, 0]}>
        <boxGeometry args={[0.08, 0.08, length - 0.2]} />
        <meshStandardMaterial color="#1a5a2a" roughness={0.6} metalness={0.3} />
      </mesh>
    </group>
  );
}

function ECCSPump({ position }: { position: [number, number, number] }) {
  const rotorRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (rotorRef.current) rotorRef.current.rotation.y += dt * 1.5; });
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.5, 0.6, 1.2, 16]} />
        <meshStandardMaterial color="#1a4a3a" roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 1.5, 14]} />
        <meshStandardMaterial color="#3a5a4a" roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh ref={rotorRef} position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
        <meshStandardMaterial color="#8d99ae" roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1.5, 12]} />
        <meshStandardMaterial color="#5a6c7d" roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh position={[0, -0.8, 0]} castShadow>
        <boxGeometry args={[1.2, 0.4, 1.2]} />
        <meshStandardMaterial color="#2b2d33" roughness={0.45} metalness={0.7} />
      </mesh>
    </group>
  );
}

export default function ServerRoom() {
  const roomW = 28;
  const roomD = 28;
  const roomH = 6;
  const floorY = FLOOR_LEVELS.basement;
  const roomCenterY = floorY + roomH / 2;

  return (
    <group>
      {/* Raised access tiles sit directly on the -5m walking datum. */}
      <mesh position={[0, floorY - 0.03, 0]} receiveShadow castShadow>
        <boxGeometry args={[roomW, 0.06, roomD]} />
        <primitive object={raisedFloorMat} attach="material" />
      </mesh>
      {/* Floor tile grid lines */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={`fx-${i}`} position={[-roomW / 2 + i * 2 + 1, floorY + 0.005, 0]}>
          <boxGeometry args={[0.02, 0.01, roomD]} />
          <meshStandardMaterial color="#111118" roughness={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={`fz-${i}`} position={[0, floorY + 0.005, -roomD / 2 + i * 2 + 1]}>
          <boxGeometry args={[roomW, 0.01, 0.02]} />
          <meshStandardMaterial color="#111118" roughness={0.3} />
        </mesh>
      ))}

      {/* Ceiling */}
      <mesh position={[0, floorY + roomH, 0]} receiveShadow>
        <boxGeometry args={[roomW, 0.3, roomD]} />
        <primitive object={ceilingMat} attach="material" />
      </mesh>

      {/* 4 walls (enclosed room) */}
      <mesh position={[0, roomCenterY, -roomD / 2]} receiveShadow castShadow>
        <boxGeometry args={[roomW, roomH, 0.4]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      <mesh position={[0, roomCenterY, roomD / 2]} receiveShadow castShadow>
        <boxGeometry args={[roomW, roomH, 0.4]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      <mesh position={[-roomW / 2, roomCenterY, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.4, roomH, roomD]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      <mesh position={[roomW / 2, roomCenterY, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.4, roomH, roomD]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Server racks — 4 trains, 3 racks per train in rows */}
      {Array.from({ length: 4 }).map((_, train) => {
        const tx = -9 + train * 6;
        const colors = ['#ff6b35', '#4cc9f0', '#06d6a0', '#fcbf49'];
        return (
          <group key={train}>
            {/* Row of 3 racks facing the center aisle */}
            <ServerRack position={[tx, floorY + 1.2, -8]} rotation={[0, Math.PI, 0]} train={train} />
            <ServerRack position={[tx + 1.2, floorY + 1.2, -8]} rotation={[0, Math.PI, 0]} train={train} />
            <ServerRack position={[tx + 2.4, floorY + 1.2, -8]} rotation={[0, Math.PI, 0]} train={train} />
            {/* Train label on floor */}
            <mesh position={[tx + 1.2, floorY + 0.42, -7]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[3, 0.4]} />
              <meshBasicMaterial color={colors[train]} transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}

      {/* Second row of racks on the opposite side */}
      {Array.from({ length: 4 }).map((_, train) => {
        const tx = -9 + train * 6;
        return (
          <group key={`r2-${train}`}>
            <ServerRack position={[tx, floorY + 1.2, 8]} train={train} />
            <ServerRack position={[tx + 1.2, floorY + 1.2, 8]} train={train} />
            <ServerRack position={[tx + 2.4, floorY + 1.2, 8]} train={train} />
          </group>
        );
      })}

      {/* Overhead cable trays */}
      <CableTray position={[-6, floorY + 5, 0]} length={24} />
      <CableTray position={[0, floorY + 5, 0]} length={24} />
      <CableTray position={[6, floorY + 5, 0]} length={24} />
      <CableTray position={[0, floorY + 5, -6]} rotation={[0, Math.PI / 2, 0]} length={24} />
      <CableTray position={[0, floorY + 5, 6]} rotation={[0, Math.PI / 2, 0]} length={24} />

      {/* Monitoring workstation with telemetry screens */}
      <mesh position={[0, floorY + 0.5, -10]} castShadow>
        <boxGeometry args={[5, 0.1, 2]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, floorY + 0.2, -10]} castShadow>
        <boxGeometry args={[5, 0.6, 2]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.45} metalness={0.5} />
      </mesh>
      <TelemetryScreen position={[-1.5, floorY + 1.6, -10]} rotation={[0, Math.PI, 0]} />
      <TelemetryScreen position={[0, floorY + 1.6, -10]} rotation={[0, Math.PI, 0]} />
      <TelemetryScreen position={[1.5, floorY + 1.6, -10]} rotation={[0, Math.PI, 0]} />

      {/* Operator chair */}
      <mesh position={[0, floorY + 0.6, -7.5]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.1, 12]} />
        <meshStandardMaterial color="#1a1a20" roughness={0.6} />
      </mesh>
      <mesh position={[0, floorY + 0.3, -7.5]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* ECCS pumps in corner */}
      <ECCSPump position={[11, floorY + 1, 10]} />
      <ECCSPump position={[11, floorY + 1, 7]} />
      <ECCSPump position={[-11, floorY + 1, 10]} />

      {/* Localized lighting */}
      <spotLight position={[0, floorY + 5.5, 0]} angle={0.9} penumbra={0.6} intensity={40} color="#aaccff" distance={25} castShadow />
      <spotLight position={[-6, floorY + 5.5, -3]} angle={0.7} penumbra={0.5} intensity={25} color="#ffffff" distance={18} />
      <spotLight position={[6, floorY + 5.5, -3]} angle={0.7} penumbra={0.5} intensity={25} color="#ffffff" distance={18} />
      <spotLight position={[-6, floorY + 5.5, 3]} angle={0.7} penumbra={0.5} intensity={25} color="#ffffff" distance={18} />
      <spotLight position={[6, floorY + 5.5, 3]} angle={0.7} penumbra={0.5} intensity={25} color="#ffffff" distance={18} />
      <pointLight position={[0, floorY + 5, -9]} intensity={5} color="#00ff88" distance={10} />
    </group>
  );
}
