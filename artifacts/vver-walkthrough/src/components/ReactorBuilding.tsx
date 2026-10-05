import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CONTAINMENT, DECK, POLAR_CRANE, YELLOW,
  DARK_STEEL_COLOR, GREEN_METAL_COLOR, FLOOR_LEVELS,
} from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

const concreteMat = new THREE.MeshStandardMaterial({
  color: '#ffffff', map: concreteMap, roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap, normalScale: new THREE.Vector2(0.22, 0.22),
  roughness: 0.92, metalness: 0.02,
});
const concreteMatDark = new THREE.MeshStandardMaterial({
  color: '#a0a098', roughness: 0.93, metalness: 0.02,
});
const yellowMat = new THREE.MeshStandardMaterial({
  color: YELLOW, roughness: 0.42, metalness: 0.5, emissive: '#332b00', emissiveIntensity: 0.08,
});
const steelMat = new THREE.MeshStandardMaterial({
  color: '#ffffff', map: brushedSteelMap, roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap, normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.32, metalness: 0.88,
});
const darkSteelMat = new THREE.MeshStandardMaterial({
  color: DARK_STEEL_COLOR, normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08), roughness: 0.45, metalness: 0.82,
});
const greenMetalMat = new THREE.MeshStandardMaterial({
  color: GREEN_METAL_COLOR, normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.1, 0.1), roughness: 0.38, metalness: 0.72,
});

function PolarCrane() {
  const bridgeRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (bridgeRef.current) bridgeRef.current.rotation.y += dt * 0.05; });

  const railR = POLAR_CRANE.railRadius;
  return (
    <group position={[0, POLAR_CRANE.y, 0]}>
      {/* Circular rail */}
      <mesh castShadow receiveShadow>
        <torusGeometry args={[railR, 0.3, 12, 64]} />
        <primitive object={yellowMat} attach="material" />
      </mesh>
      {/* Rail supports */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * railR, -0.5, Math.sin(a) * railR]} castShadow>
            <boxGeometry args={[0.5, 1, 0.5]} />
            <primitive object={steelMat} attach="material" />
          </mesh>
        );
      })}
      {/* Rotating bridge */}
      <group ref={bridgeRef}>
        {/* Bridge beam */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[railR * 2 + 1, 0.7, 0.9]} />
          <primitive object={yellowMat} attach="material" />
        </mesh>
        {/* End trucks */}
        <mesh position={[railR, 0.5, 0]} castShadow>
          <boxGeometry args={[1.2, 1.2, 2.5]} />
          <primitive object={yellowMat} attach="material" />
        </mesh>
        <mesh position={[-railR, 0.5, 0]} castShadow>
          <boxGeometry args={[1.2, 1.2, 2.5]} />
          <primitive object={yellowMat} attach="material" />
        </mesh>
        {/* Trolley + hoist */}
        <mesh position={[4, 0, 0]} castShadow>
          <boxGeometry args={[2, 1, 1.8]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
        <mesh position={[4, -2, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 3, 8]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
        <mesh position={[4, -4, 0]} castShadow>
          <boxGeometry args={[1.5, 1, 1.5]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

function RefuelingMachine() {
  const armRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (armRef.current) {
      armRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.35;
    }
  });
  return (
    <group position={[0, DECK.upperY + 0.3, 0]}>
      {/* Circular platform */}
      <mesh castShadow receiveShadow>
        <ringGeometry args={[2, 7, 32]} />
        <primitive object={yellowMat} attach="material" side={THREE.DoubleSide} />
      </mesh>
      {/* Central column */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 2, 12]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>
      {/* Rotating arm */}
      <group ref={armRef} position={[0, 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[8, 0.6, 1.2]} />
          <primitive object={yellowMat} attach="material" />
        </mesh>
        <mesh position={[3, -1, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 2, 10]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
        <mesh position={[3, -2.5, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.5, 10]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      </group>
      {/* Spent fuel pool (blue water) */}
      <mesh position={[8, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 4]} />
        <meshStandardMaterial color="#0044aa" transparent opacity={0.7} emissive="#002288" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[8, -0.5, 0]}>
        <boxGeometry args={[6, 1, 5]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

function ShieldingCask({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[1.1, 1.1, 3, 20]} />
        <primitive object={greenMetalMat} attach="material" />
      </mesh>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.2, 0.4, 20]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Lifting trunnions */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x * 1.8, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.5, 8]} />
          <primitive object={steelMat} attach="material" />
        </mesh>
      ))}
      {/* Cooling fins */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[0, -1 + i * 0.5, 0]}>
          <torusGeometry args={[1.15, 0.06, 6, 20]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/** Floor slab with a central circular hole — built from a ring geometry extruded as a thick disc */
function FloorSlab({ y, outerRadius, holeRadius, thickness = DECK.slabThickness }: {
  y: number; outerRadius: number; holeRadius: number; thickness?: number;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return s;
  }, [outerRadius, holeRadius]);

  const extrudeSettings = useMemo(() => ({
    depth: thickness, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, steps: 1,
  }), [thickness]);

  return (
    <mesh position={[0, y - thickness, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <primitive object={concreteMat} attach="material" />
    </mesh>
  );
}

function Stairwell1() {
  // From basement (-5) to main deck (+15) — along Z at x≈19
  const steps = 30;
  const { xMin, xMax, zMin, zMax, yStart, yEnd } = { xMin: 17, xMax: 21, zMin: -8, zMax: 8, yStart: FLOOR_LEVELS.basement, yEnd: DECK.mainY };
  const stepDepth = (zMax - zMin) / steps;
  const stepHeight = (yEnd - yStart) / steps;

  return (
    <group>
      {/* Stair stringer walls */}
      <mesh position={[(xMin + xMax) / 2, (yStart + yEnd) / 2, zMin - 0.3]}>
        <boxGeometry args={[xMax - xMin + 0.6, yEnd - yStart + 1, 0.3]} />
        <primitive object={concreteMatDark} attach="material" />
      </mesh>
      <mesh position={[(xMin + xMax) / 2, (yStart + yEnd) / 2, zMax + 0.3]}>
        <boxGeometry args={[xMax - xMin + 0.6, yEnd - yStart + 1, 0.3]} />
        <primitive object={concreteMatDark} attach="material" />
      </mesh>
      {/* Steps */}
      {Array.from({ length: steps }).map((_, i) => {
        const z = zMin + i * stepDepth + stepDepth / 2;
        const y = yStart + i * stepHeight;
        return (
          <mesh key={i} position={[(xMin + xMax) / 2, y + stepHeight / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[xMax - xMin, stepHeight, stepDepth + 0.02]} />
            <meshStandardMaterial color="#909088" roughness={0.88} metalness={0.05} />
          </mesh>
        );
      })}
      {/* Handrails */}
      {[zMin - 0.2, zMax + 0.2].map((z) => (
        <mesh key={z} position={[(xMin + xMax) / 2, yEnd + 1, z]}>
          <boxGeometry args={[xMax - xMin, 0.08, 0.08]} />
          <primitive object={yellowMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Stairwell2() {
  // From main deck (+15) to upper (+36) — along X at z≈19
  const steps = 32;
  const { xMin, xMax, zMin, zMax, yStart, yEnd } = { xMin: -8, xMax: 8, zMin: 17, zMax: 21, yStart: DECK.mainY, yEnd: DECK.upperY };
  const stepDepth = (xMax - xMin) / steps;
  const stepHeight = (yEnd - yStart) / steps;

  return (
    <group>
      <mesh position={[xMin - 0.3, (yStart + yEnd) / 2, (zMin + zMax) / 2]}>
        <boxGeometry args={[0.3, yEnd - yStart + 1, zMax - zMin + 0.6]} />
        <primitive object={concreteMatDark} attach="material" />
      </mesh>
      <mesh position={[xMax + 0.3, (yStart + yEnd) / 2, (zMin + zMax) / 2]}>
        <boxGeometry args={[0.3, yEnd - yStart + 1, zMax - zMin + 0.6]} />
        <primitive object={concreteMatDark} attach="material" />
      </mesh>
      {Array.from({ length: steps }).map((_, i) => {
        const x = xMin + i * stepDepth + stepDepth / 2;
        const y = yStart + i * stepHeight;
        return (
          <mesh key={i} position={[x, y + stepHeight / 2, (zMin + zMax) / 2]} castShadow receiveShadow>
            <boxGeometry args={[stepDepth + 0.02, stepHeight, zMax - zMin]} />
            <meshStandardMaterial color="#909088" roughness={0.88} metalness={0.05} />
          </mesh>
        );
      })}
      {[xMin - 0.2, xMax + 0.2].map((x) => (
        <mesh key={x} position={[x, yEnd + 1, (zMin + zMax) / 2]}>
          <boxGeometry args={[0.08, 0.08, zMax - zMin]} />
          <primitive object={yellowMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

interface ReactorBuildingProps {
  containmentOpacity: number;
}

function ContainmentShell({ opacity }: { opacity: number }) {
  const matRef = useRef<THREE.MeshPhysicalMaterial>(
    new THREE.MeshPhysicalMaterial({
      color: '#ffffff', map: concreteMap, roughnessMap: concreteRoughnessMap,
      normalMap: concreteNormalMap, normalScale: new THREE.Vector2(0.22, 0.22),
      roughness: 0.88, metalness: 0.03,
      transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, clearcoat: 0.08,
    })
  ).current;

  useFrame(() => {
    const target = opacity * 0.5;
    if (Math.abs(matRef.opacity - target) > 0.001) matRef.opacity = target;
  });

  const R = CONTAINMENT.outerRadius;
  const wallH = CONTAINMENT.wallTopY - CONTAINMENT.baseY;
  const domeR = R;

  return (
    <group>
      {/* Cylindrical containment wall */}
      <mesh material={matRef} position={[0, (CONTAINMENT.baseY + CONTAINMENT.wallTopY) / 2, 0]}>
        <cylinderGeometry args={[R, R, wallH, 64, 1, true]} />
      </mesh>
      <mesh material={matRef} position={[0, (CONTAINMENT.baseY + CONTAINMENT.wallTopY) / 2, 0]}>
        <cylinderGeometry args={[CONTAINMENT.innerRadius, CONTAINMENT.innerRadius, wallH, 64, 1, true]} />
      </mesh>
      {/* Dome roof */}
      <mesh material={matRef} position={[0, CONTAINMENT.wallTopY, 0]}>
        <sphereGeometry args={[domeR, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Base foundation ring (solid) */}
      <mesh position={[0, CONTAINMENT.baseY - 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[R + 1, R + 1, 0.5, 64]} />
        <primitive object={concreteMat} attach="material" />
      </mesh>
      {/* Vertical reinforcing ribs */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * R, (CONTAINMENT.baseY + CONTAINMENT.wallTopY) / 2, Math.sin(a) * R]} castShadow>
          <boxGeometry args={[0.8, wallH, 0.6]} />
            <primitive object={concreteMatDark} attach="material" />
          </mesh>
        );
      })}
      {/* Equator band */}
      <mesh position={[0, (CONTAINMENT.baseY + CONTAINMENT.wallTopY) / 2, 0]}>
        <torusGeometry args={[R, 0.4, 8, 64]} />
        <primitive object={concreteMatDark} attach="material" />
      </mesh>
    </group>
  );
}

export default function ReactorBuilding({ containmentOpacity }: ReactorBuildingProps) {
  return (
    <group>
      <ContainmentShell opacity={containmentOpacity} />

      {/* Floor slabs with holes for the RPV cavity */}
      <FloorSlab y={DECK.mainY} outerRadius={DECK.outerRadius} holeRadius={DECK.mainHoleRadius} />
      <FloorSlab y={DECK.upperY} outerRadius={DECK.outerRadius} holeRadius={DECK.upperHoleRadius} />

      {/* Stairwells */}
      <Stairwell1 />
      <Stairwell2 />

      {/* Polar crane at upper dome level */}
      <PolarCrane />

      {/* Refueling machine on upper deck */}
      <RefuelingMachine />

      {/* Shielding casks on upper deck */}
      <ShieldingCask position={[14, DECK.upperY + 1.5, 6]} />
      <ShieldingCask position={[-14, DECK.upperY + 1.5, 6]} />
      <ShieldingCask position={[14, DECK.upperY + 1.5, -8]} />
      <ShieldingCask position={[-14, DECK.upperY + 1.5, -8]} />

      {/* Upper deck safety railings around the central hole */}
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const r = DECK.upperHoleRadius + 0.3;
        return (
          <mesh key={`r-${i}`} position={[Math.cos(a) * r, DECK.upperY + 1, Math.sin(a) * r]}>
            <cylinderGeometry args={[0.04, 0.04, 1.5, 5]} />
            <primitive object={yellowMat} attach="material" />
          </mesh>
        );
      })}
      <mesh position={[0, DECK.upperY + 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[DECK.upperHoleRadius + 0.3, 0.04, 4, 48]} />
        <primitive object={yellowMat} attach="material" />
      </mesh>

      {/* Main deck safety railings around RPV cavity */}
      {Array.from({ length: 40 }).map((_, i) => {
        const a = (i / 40) * Math.PI * 2;
        const r = DECK.mainHoleRadius + 0.3;
        return (
          <mesh key={`mr-${i}`} position={[Math.cos(a) * r, DECK.mainY + 1, Math.sin(a) * r]}>
            <cylinderGeometry args={[0.04, 0.04, 1.5, 5]} />
            <primitive object={yellowMat} attach="material" />
          </mesh>
        );
      })}
      <mesh position={[0, DECK.mainY + 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[DECK.mainHoleRadius + 0.3, 0.04, 4, 40]} />
        <primitive object={yellowMat} attach="material" />
      </mesh>

      {/* Interior lighting */}
      <pointLight position={[0, 40, 0]} intensity={25} color="#ffeacc" distance={35} castShadow />
      <pointLight position={[12, 20, 0]} intensity={12} color="#aaccff" distance={20} />
      <pointLight position={[-12, 20, 0]} intensity={12} color="#aaccff" distance={20} />
    </group>
  );
}
