import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOOR_LEVELS, SAFETY_YELLOW, DARK_STEEL_COLOR } from '@/scene/constants';
import {
  concreteMap,
  concreteNormalMap,
  concreteRoughnessMap,
  diamondPlateMap,
  diamondPlateNormalMap,
  diamondPlateRoughnessMap,
} from '@/scene/pbrTextures';

// Materials
const rackChassisMat = new THREE.MeshStandardMaterial({
  color: '#282b30',
  roughness: 0.42,
  metalness: 0.75,
});

const rackFrontMeshMat = new THREE.MeshStandardMaterial({
  color: '#16181c',
  roughness: 0.35,
  metalness: 0.65,
});

const serverUnitMat = new THREE.MeshStandardMaterial({
  color: '#2b2e35',
  roughness: 0.38,
  metalness: 0.6,
});

const raisedFloorMat = new THREE.MeshStandardMaterial({
  color: '#22252c',
  roughness: 0.3,
  metalness: 0.2,
});

const concreteWallMat = new THREE.MeshStandardMaterial({
  color: '#c2beb5',
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.85,
  metalness: 0.02,
});

const ceilingMat = new THREE.MeshStandardMaterial({
  color: '#2b2c34',
  roughness: 0.75,
  metalness: 0.1,
});

const cableTrayMat = new THREE.MeshStandardMaterial({
  color: '#555862',
  roughness: 0.45,
  metalness: 0.6,
});

// Bundled blue network and orange fiber-optic conduit materials
const blueConduitMat = new THREE.MeshStandardMaterial({
  color: '#1d63b8',
  roughness: 0.35,
  metalness: 0.25,
});

const orangeFiberMat = new THREE.MeshStandardMaterial({
  color: '#ff6a00',
  roughness: 0.35,
  metalness: 0.25,
});

const diamondWalkwayMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: diamondPlateMap,
  normalMap: diamondPlateNormalMap,
  roughnessMap: diamondPlateRoughnessMap,
  roughness: 0.4,
  metalness: 0.78,
});

const safetyYellowMat = new THREE.MeshStandardMaterial({
  color: SAFETY_YELLOW,
  roughness: 0.35,
  metalness: 0.25,
});

/** Animated status LED flashing green or red */
function StatusLED({
  position,
  color,
  flashRate = 2.0,
  phase = 0,
}: {
  position: [number, number, number];
  color: 'green' | 'red' | 'blue' | 'amber';
  flashRate?: number;
  phase?: number;
}) {
  const hex =
    color === 'green'
      ? '#00ff66'
      : color === 'red'
      ? '#ff2222'
      : color === 'blue'
      ? '#00b4ff'
      : '#ffaa00';

  const ref = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime * flashRate + phase;
      const isLit = Math.sin(t) > -0.2;
      ref.current.emissiveIntensity = isLit ? 1.6 : 0.08;
    }
  });

  return (
    <mesh position={position}>
      <sphereGeometry args={[0.028, 8, 8]} />
      <meshStandardMaterial
        ref={ref}
        color={hex}
        emissive={hex}
        emissiveIntensity={1.2}
      />
    </mesh>
  );
}

/** 19-inch I&C Server Rack populated with blade servers, vent grilles, and status LEDs */
function ServerRack19Inch({
  position,
  rotation = [0, 0, 0],
  trainNumber,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  trainNumber: number;
}) {
  const trainColors = ['#ff6b35', '#4cc9f0', '#06d6a0', '#fcbf49'];
  const trainColor = trainColors[trainNumber % 4];

  return (
    <group position={position} rotation={rotation}>
      {/* 19-inch 42U rack cabinet frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.85, 2.3, 0.95]} />
        <primitive object={rackChassisMat} attach="material" />
      </mesh>
      {/* Front tinted/mesh door */}
      <mesh position={[0, 0, 0.485]}>
        <boxGeometry args={[0.8, 2.22, 0.02]} />
        <primitive object={rackFrontMeshMat} attach="material" />
      </mesh>

      {/* 14 individual rack-mounted 1U/2U server modules */}
      {Array.from({ length: 12 }).map((_, i) => {
        const yPos = -0.95 + i * 0.16;
        const isHealthy = (i + trainNumber * 2) % 5 !== 0;

        return (
          <group key={`unit-${i}`} position={[0, yPos, 0.5]}>
            {/* Server unit chassis */}
            <mesh>
              <boxGeometry args={[0.74, 0.12, 0.02]} />
              <primitive object={serverUnitMat} attach="material" />
            </mesh>
            {/* Ventilation perforations */}
            <mesh position={[0.16, 0, 0.012]}>
              <boxGeometry args={[0.32, 0.07, 0.005]} />
              <primitive object={rackFrontMeshMat} attach="material" />
            </mesh>
            {/* Status LEDs (flashing green and red) */}
            <StatusLED
              position={[-0.28, 0, 0.015]}
              color={isHealthy ? 'green' : 'red'}
              flashRate={2.5 + (i % 3) * 0.6}
              phase={i * 0.4 + trainNumber}
            />
            <StatusLED
              position={[-0.21, 0, 0.015]}
              color="blue"
              flashRate={4.0}
              phase={i * 0.2}
            />
            {/* Drive activity LED */}
            <StatusLED
              position={[-0.14, 0, 0.015]}
              color="amber"
              flashRate={5.5}
              phase={i * 0.7}
            />
          </group>
        );
      })}

      {/* Rack top exhaust ventilation fan cowl */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.9]} />
        <primitive object={rackFrontMeshMat} attach="material" />
      </mesh>

      {/* Safety Train Identification Header Tag (Train A, B, C, D) */}
      <mesh position={[0, -1.18, 0.51]}>
        <boxGeometry args={[0.65, 0.05, 0.01]} />
        <meshBasicMaterial color={trainColor} />
      </mesh>
    </group>
  );
}

/**
 * Overhead Cable Trays carrying bundled blue (network/DCS bus)
 * and orange (fiber-optic / emergency instrumentation) conduits.
 */
function OverheadCableTrays({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      {/* 3 Main Longitudinal Trays */}
      {[-8, 0, 8].map((zPos, idx) => (
        <group key={`long-tray-${idx}`} position={[0, 0, zPos]}>
          {/* Steel perforated cable tray body */}
          <mesh castShadow>
            <boxGeometry args={[26, 0.12, 0.45]} />
            <primitive object={cableTrayMat} attach="material" />
          </mesh>
          {/* Bundled Blue Network / Ethernet Cables */}
          <mesh position={[0, 0.07, -0.09]}>
            <boxGeometry args={[25.8, 0.07, 0.14]} />
            <primitive object={blueConduitMat} attach="material" />
          </mesh>
          {/* Bundled Orange Fiber-Optic Safety Conduits */}
          <mesh position={[0, 0.07, 0.09]}>
            <boxGeometry args={[25.8, 0.07, 0.14]} />
            <primitive object={orangeFiberMat} attach="material" />
          </mesh>
          {/* Hanging support rods to ceiling */}
          {[-10, -5, 0, 5, 10].map((rx) => (
            <mesh key={`rod-${rx}`} position={[rx, 0.5, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 1.0, 6]} />
              <primitive object={cableTrayMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* 2 Cross Transverse Trays */}
      {[-6, 6].map((xPos, idx) => (
        <group key={`cross-tray-${idx}`} position={[xPos, 0.15, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.12, 20]} />
            <primitive object={cableTrayMat} attach="material" />
          </mesh>
          <mesh position={[-0.08, 0.07, 0]}>
            <boxGeometry args={[0.13, 0.07, 19.8]} />
            <primitive object={blueConduitMat} attach="material" />
          </mesh>
          <mesh position={[0.08, 0.07, 0]}>
            <boxGeometry args={[0.13, 0.07, 19.8]} />
            <primitive object={orangeFiberMat} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Operator Monitoring Workstation with telemetry screens */
function OperatorMonitoringStation({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const screenRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (screenRef.current) {
      screenRef.current.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 2.0) * 0.08;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Curved operator console desk */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[4.8, 0.08, 1.4]} />
        <meshStandardMaterial color="#22242a" roughness={0.45} metalness={0.5} />
      </mesh>
      {/* Console pedestal legs */}
      {[-2.0, 0, 2.0].map((px) => (
        <mesh key={`leg-${px}`} position={[px, 0.36, 0]} castShadow>
          <boxGeometry args={[0.4, 0.72, 1.2]} />
          <meshStandardMaterial color="#1a1c22" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}

      {/* 3 Telemetry Display Screens */}
      {[-1.4, 0, 1.4].map((sx, idx) => (
        <group key={`mon-${idx}`} position={[sx, 1.35, -0.2]}>
          {/* Bezel frame */}
          <mesh castShadow>
            <boxGeometry args={[1.2, 0.75, 0.06]} />
            <meshStandardMaterial color="#14161a" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Glowing display surface */}
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[1.1, 0.65]} />
            <meshBasicMaterial
              ref={idx === 1 ? screenRef : undefined}
              color={idx === 0 ? '#00e575' : idx === 1 ? '#00b4d8' : '#e09f3e'}
              transparent
              opacity={0.88}
            />
          </mesh>
          {/* Stand arm */}
          <mesh position={[0, -0.45, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
            <meshStandardMaterial color="#2d3139" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Operator Chairs */}
      {[-1.0, 1.0].map((cx) => (
        <group key={`chair-${cx}`} position={[cx, 0.5, 1.0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.08, 12]} />
            <meshStandardMaterial color="#1e2026" roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
            <meshStandardMaterial color="#333740" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.32, 0.26]} rotation={[-0.15, 0, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.06]} />
            <meshStandardMaterial color="#1e2026" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Elevation -5.0m: I&C / DCS Server Room (Серверная АСУ ТП)
 * Situated in the perimeter annular space directly ABOVE the subterranean Core Catcher vault ceiling.
 */
export default function ServerRoom() {
  const floorY = FLOOR_LEVELS.basement; // -5.0m
  const roomW = 32;
  const roomD = 32;
  const roomH = 5.2;
  const centerPitShieldRadius = 7.6; // Central cylindrical biological shield around reactor pit base

  return (
    <group>
      {/* 1. Raised Access Computer Flooring at -5.0m */}
      <mesh position={[0, floorY - 0.04, 0]} receiveShadow castShadow>
        <boxGeometry args={[roomW, 0.08, roomD]} />
        <primitive object={raisedFloorMat} attach="material" />
      </mesh>

      {/* Raised Floor 600x600mm Tile Seam Grid */}
      {Array.from({ length: 16 }).map((_, i) => (
        <group key={`grid-${i}`}>
          <mesh position={[-roomW / 2 + i * 2 + 1, floorY + 0.005, 0]}>
            <boxGeometry args={[0.02, 0.01, roomD]} />
            <meshStandardMaterial color="#121418" roughness={0.3} />
          </mesh>
          <mesh position={[0, floorY + 0.005, -roomD / 2 + i * 2 + 1]}>
            <boxGeometry args={[roomW, 0.01, 0.02]} />
            <meshStandardMaterial color="#121418" roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* 2. Central Reactor Pit Biological Shielding Base Cylinder */}
      {/* The central structural pillar that houses the Core Catcher throat directly underneath */}
      <mesh position={[0, floorY + roomH / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[centerPitShieldRadius, centerPitShieldRadius, roomH, 48, 1, true]} />
        <primitive object={concreteWallMat} attach="material" />
      </mesh>
      {/* Walkway ring with Diamond-Plate around central reactor pit cylinder */}
      <mesh position={[0, floorY + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[centerPitShieldRadius, centerPitShieldRadius + 1.6, 48]} />
        <primitive object={diamondWalkwayMat} attach="material" side={THREE.DoubleSide} />
      </mesh>
      {/* Safety yellow railing around center core base */}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const r = centerPitShieldRadius + 1.6;
        return (
          <mesh key={`inner-r-${i}`} position={[Math.cos(a) * r, floorY + 0.6, Math.sin(a) * r]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 1.2, 6]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        );
      })}
      <mesh position={[0, floorY + 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[centerPitShieldRadius + 1.6, 0.025, 6, 48]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>

      {/* 3. Ceiling Slab */}
      <mesh position={[0, floorY + roomH, 0]} receiveShadow>
        <boxGeometry args={[roomW, 0.35, roomD]} />
        <primitive object={ceilingMat} attach="material" />
      </mesh>

      {/* 4. Perimeter Walls (Enclosed Subterranean Room) */}
      <mesh position={[0, floorY + roomH / 2, -roomD / 2]} receiveShadow castShadow>
        <boxGeometry args={[roomW, roomH, 0.6]} />
        <primitive object={concreteWallMat} attach="material" />
      </mesh>
      <mesh position={[0, floorY + roomH / 2, roomD / 2]} receiveShadow castShadow>
        <boxGeometry args={[roomW, roomH, 0.6]} />
        <primitive object={concreteWallMat} attach="material" />
      </mesh>
      <mesh position={[-roomW / 2, floorY + roomH / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.6, roomH, roomD]} />
        <primitive object={concreteWallMat} attach="material" />
      </mesh>
      <mesh position={[roomW / 2, floorY + roomH / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.6, roomH, roomD]} />
        <primitive object={concreteWallMat} attach="material" />
      </mesh>

      {/* 5. Rows of 19-inch I&C Server Racks organized into 4 Safety Trains */}
      {/* North Aisle: Safety Trains A & B */}
      {Array.from({ length: 4 }).map((_, trainIdx) => {
        const tx = -11 + trainIdx * 6.5;
        return (
          <group key={`north-train-${trainIdx}`}>
            <ServerRack19Inch position={[tx, floorY + 1.15, -10.5]} rotation={[0, Math.PI, 0]} trainNumber={trainIdx} />
            <ServerRack19Inch position={[tx + 1.0, floorY + 1.15, -10.5]} rotation={[0, Math.PI, 0]} trainNumber={trainIdx} />
            <ServerRack19Inch position={[tx + 2.0, floorY + 1.15, -10.5]} rotation={[0, Math.PI, 0]} trainNumber={trainIdx} />
          </group>
        );
      })}

      {/* South Aisle: Safety Trains C & D */}
      {Array.from({ length: 4 }).map((_, trainIdx) => {
        const tx = -11 + trainIdx * 6.5;
        return (
          <group key={`south-train-${trainIdx}`}>
            <ServerRack19Inch position={[tx, floorY + 1.15, 10.5]} rotation={[0, 0, 0]} trainNumber={trainIdx + 2} />
            <ServerRack19Inch position={[tx + 1.0, floorY + 1.15, 10.5]} rotation={[0, 0, 0]} trainNumber={trainIdx + 2} />
            <ServerRack19Inch position={[tx + 2.0, floorY + 1.15, 10.5]} rotation={[0, 0, 0]} trainNumber={trainIdx + 2} />
          </group>
        );
      })}

      {/* East & West Auxiliary I&C Division Cabinets */}
      {[-9, 9].map((zPos, zi) => (
        <group key={`west-racks-${zi}`}>
          <ServerRack19Inch position={[-11.5, floorY + 1.15, zPos]} rotation={[0, Math.PI / 2, 0]} trainNumber={zi} />
          <ServerRack19Inch position={[-11.5, floorY + 1.15, zPos + 1.1]} rotation={[0, Math.PI / 2, 0]} trainNumber={zi} />
        </group>
      ))}

      {/* 6. Overhead Cable Trays carrying bundled blue and orange network/fiber conduits */}
      <OverheadCableTrays y={floorY + 4.1} />

      {/* 7. Operator Monitoring Stations with Live Telemetry Screens */}
      <OperatorMonitoringStation position={[0, floorY, -5.2]} rotation={[0, Math.PI, 0]} />
      <OperatorMonitoringStation position={[0, floorY, 5.2]} rotation={[0, 0, 0]} />

      {/* 8. Subterranean DCS Room Localized Industrial Illumination */}
      <pointLight position={[0, floorY + 4.2, -6]} intensity={25} color="#e0f2fe" distance={20} />
      <pointLight position={[0, floorY + 4.2, 6]} intensity={25} color="#e0f2fe" distance={20} />
      <pointLight position={[-8, floorY + 4.2, 0]} intensity={18} color="#ffffff" distance={18} />
      <pointLight position={[8, floorY + 4.2, 0]} intensity={18} color="#ffffff" distance={18} />
    </group>
  );
}
