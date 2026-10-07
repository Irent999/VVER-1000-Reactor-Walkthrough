import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CORE_CATCHER, SAFETY_YELLOW, DARK_STEEL_COLOR } from '@/scene/constants';
import {
  brushedSteelNormalMap,
  brushedSteelRoughnessMap,
  concreteMap,
  concreteNormalMap,
  concreteRoughnessMap,
  diamondPlateMap,
  diamondPlateNormalMap,
  diamondPlateRoughnessMap,
} from '@/scene/pbrTextures';

// Concrete Biological Shielding Material
const concreteShieldMat = new THREE.MeshStandardMaterial({
  color: '#c2beb5',
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.35, 0.35),
  roughness: 0.86,
  metalness: 0.02,
  side: THREE.DoubleSide,
});

// Refractory steel shell for core catcher vessel & guide funnel
const refractorySteelMat = new THREE.MeshStandardMaterial({
  color: '#4e545c',
  roughness: 0.36,
  metalness: 0.88,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  side: THREE.DoubleSide,
});

const darkSteelMat = new THREE.MeshStandardMaterial({
  color: DARK_STEEL_COLOR,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughness: 0.42,
  metalness: 0.84,
});

const safetyYellowMat = new THREE.MeshStandardMaterial({
  color: SAFETY_YELLOW, // '#FFCC00'
  roughness: 0.35,
  metalness: 0.25,
  emissive: '#251d00',
  emissiveIntensity: 0.06,
});

const diamondPlateMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: diamondPlateMap,
  normalMap: diamondPlateNormalMap,
  roughnessMap: diamondPlateRoughnessMap,
  roughness: 0.4,
  metalness: 0.78,
});

// Annular water cooling channel jacket
const waterJacketMat = new THREE.MeshPhysicalMaterial({
  color: '#38b2c6',
  roughness: 0.15,
  metalness: 0.12,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const coolingPipeMat = new THREE.MeshStandardMaterial({
  color: '#5a6570',
  roughness: 0.32,
  metalness: 0.9,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
});

const coolantGlowMat = new THREE.MeshStandardMaterial({
  color: '#40c4dc',
  emissive: '#095568',
  emissiveIntensity: 0.4,
  roughness: 0.2,
  metalness: 0.15,
});

// Sacrificial ceramic material blocks (Fe₂O₃ / Al₂O₃ oxide matrix)
const ceramicColors = ['#c2945d', '#b3824c', '#d1ab75', '#a87744'];
const ceramicMaterials = ceramicColors.map(
  (col) =>
    new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.94,
      metalness: 0.02,
    })
);

function PipeSegment({
  from,
  to,
  radius,
  material,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
  material: THREE.Material;
}) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const dir = end.clone().sub(start);
  const pos = start.clone().add(end).multiplyScalar(0.5);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );

  return (
    <mesh position={pos} quaternion={quat} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, dir.length(), 14]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/** Sacrificial ceramic charge inside the core catcher vessel */
function SacrificialCeramicCharge() {
  const layers = [
    { y: -9.55, radius: 0, count: 1 },
    { y: -9.15, radius: 1.05, count: 8 },
    { y: -8.75, radius: 2.0, count: 10 },
    { y: -8.35, radius: 2.75, count: 12 },
    { y: -7.95, radius: 3.35, count: 14 },
    { y: -7.55, radius: 3.9, count: 16 },
    { y: -7.15, radius: 4.35, count: 18 },
    { y: -6.75, radius: 4.7, count: 20 },
  ];

  return (
    <group>
      {layers.flatMap((layer, layerIndex) =>
        Array.from({ length: layer.count }, (_, blockIndex) => {
          const angle =
            (blockIndex / layer.count) * Math.PI * 2 + (layerIndex % 2) * 0.12;
          const width = layer.count === 1 ? 1.5 : 0.88;
          return (
            <mesh
              key={`${layerIndex}-${blockIndex}`}
              position={[
                Math.cos(angle) * layer.radius,
                layer.y,
                Math.sin(angle) * layer.radius,
              ]}
              rotation={[0, angle, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width, 0.32, 0.72]} />
              <primitive
                object={
                  ceramicMaterials[
                    (layerIndex + blockIndex) % ceramicMaterials.length
                  ]
                }
                attach="material"
              />
            </mesh>
          );
        })
      )}
    </group>
  );
}

/** Emergency cooling supply piping and tanks surrounding core catcher */
function EmergencyCoolingSystem() {
  const angles = [
    Math.PI / 4,
    (3 * Math.PI) / 4,
    (5 * Math.PI) / 4,
    (7 * Math.PI) / 4,
  ];
  const innerR = 5.8;
  const outerR = 7.4;
  const bottomY = -9.6;
  const midY = -6.2;

  return (
    <group>
      {angles.map((angle, i) => {
        const x = Math.cos(angle);
        const z = Math.sin(angle);
        const riserStart: [number, number, number] = [x * innerR, bottomY, z * innerR];
        const riserEnd: [number, number, number] = [x * innerR, midY, z * innerR];
        const tankPos: [number, number, number] = [x * outerR, -6.8, z * outerR];

        return (
          <group key={`eccs-${i}`}>
            <PipeSegment from={riserStart} to={riserEnd} radius={0.18} material={coolingPipeMat} />
            <PipeSegment from={riserStart} to={riserEnd} radius={0.08} material={coolantGlowMat} />
            <PipeSegment from={riserEnd} to={tankPos} radius={0.18} material={coolingPipeMat} />
            <mesh position={tankPos} castShadow receiveShadow>
              <cylinderGeometry args={[0.65, 0.65, 1.8, 16]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            <mesh position={[tankPos[0], -5.85, tankPos[2]]}>
              <cylinderGeometry args={[0.55, 0.55, 0.15, 16]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Heavy Radiation Shielding Access Airlock Doors with handwheels,
 * yellow hazard borders, and hydraulic locking pins.
 */
function HeavyShieldAccessDoor({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const wheelRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Heavy reinforced concrete door portal frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.2, 3.4, 0.6]} />
        <primitive object={concreteShieldMat} attach="material" />
      </mesh>
      {/* Door aperture opening cutout */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[2.0, 2.5, 0.62]} />
        <meshStandardMaterial color="#1a1d20" roughness={0.7} />
      </mesh>

      {/* Heavy Motorized Steel Radiation Shield Door Leaf */}
      <mesh position={[0, 0, 0.18]} castShadow>
        <boxGeometry args={[1.9, 2.4, 0.28]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>

      {/* High-Vis Safety Yellow Hazard Frame Border (#FFCC00) */}
      {/* Top frame */}
      <mesh position={[0, 1.15, 0.33]}>
        <boxGeometry args={[1.9, 0.12, 0.04]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      {/* Bottom frame */}
      <mesh position={[0, -1.15, 0.33]}>
        <boxGeometry args={[1.9, 0.12, 0.04]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      {/* Left frame */}
      <mesh position={[-0.9, 0, 0.33]}>
        <boxGeometry args={[0.12, 2.4, 0.04]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      {/* Right frame */}
      <mesh position={[0.9, 0, 0.33]}>
        <boxGeometry args={[0.12, 2.4, 0.04]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>

      {/* Mechanical Central Locking Handwheel */}
      <group position={[0, 0, 0.38]}>
        <mesh ref={wheelRef}>
          <torusGeometry args={[0.32, 0.035, 12, 24]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.15, 12]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
        {/* Wheel 4 spokes */}
        {[0, Math.PI / 2].map((spokeAngle, si) => (
          <mesh key={si} rotation={[0, 0, spokeAngle]}>
            <boxGeometry args={[0.64, 0.04, 0.03]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Hydraulic Locking Actuator Cylinders on Sides */}
      {[-0.82, 0.82].map((lx, li) => (
        <group key={`act-${li}`} position={[lx, 0.5, 0.32]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.6, 12]} />
            <primitive object={darkSteelMat} attach="material" />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.25, 12]} />
            <primitive object={refractorySteelMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Radiation Hazard Sign / Indicator Plate */}
      <mesh position={[0, 0.75, 0.33]}>
        <boxGeometry args={[0.5, 0.25, 0.02]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Elevation -10.0m: Core Catcher (Ловушка расплава / Core Melt Localization Device)
 * Strictly aligned under the RPV pit axis with conical guide funnel,
 * sacrificial material vessel, water jacket, and thick biological shielding vault.
 */
export default function CoreCatcher() {
  const centerY = (CORE_CATCHER.topY + CORE_CATCHER.bottomY) / 2; // -8.0m
  const height = CORE_CATCHER.topY - CORE_CATCHER.bottomY; // 4.0m
  const vaultRadius = 8.8; // Thick biological concrete shielding vault
  const vaultHeight = 5.2; // From -10.2m up to -5.0m ceiling

  return (
    <group>
      {/* 1. Subterranean Heavy Foundation Slab at -10.0m / -10.2m */}
      <mesh position={[0, -10.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[vaultRadius + 1.2, vaultRadius + 1.2, 0.5, 48]} />
        <primitive object={concreteShieldMat} attach="material" />
      </mesh>
      {/* Foundation diamond-plate inspection floor ring */}
      <mesh position={[0, -9.98, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[CORE_CATCHER.bottomRadius + 0.5, vaultRadius - 0.2, 48]} />
        <primitive object={diamondPlateMat} attach="material" side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Thick Concrete Biological Shielding Walls enclosing Core Catcher Vault */}
      {/* Outer reinforced concrete biological shielding cylinder (1.2m thick) */}
      <mesh position={[0, -7.5, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[vaultRadius, vaultRadius, vaultHeight, 64, 1, true]} />
        <primitive object={concreteShieldMat} attach="material" />
      </mesh>

      {/* Vault Ceiling Slab at -5.0m (acts as DCS Server Room floor support) */}
      <mesh position={[0, -5.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[vaultRadius + 0.2, vaultRadius + 0.2, 0.35, 48]} />
        <primitive object={concreteShieldMat} attach="material" />
      </mesh>

      {/* Inner biological shielding pit wall directly around the core catcher funnel */}
      <mesh position={[0, -7.5, 0]} receiveShadow>
        <cylinderGeometry args={[CORE_CATCHER.shieldRadius, CORE_CATCHER.shieldRadius, vaultHeight, 48, 1, true]} />
        <primitive object={concreteShieldMat} attach="material" />
      </mesh>

      {/* 3. Conical Core Catcher Guide Funnel (направляющая воронка) directly under RPV */}
      {/* Upper guide funnel widening towards RPV cavity base */}
      <mesh position={[0, -5.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[CORE_CATCHER.openingRadius, CORE_CATCHER.topRadius, 1.6, 48, 1, true]} />
        <primitive object={refractorySteelMat} attach="material" />
      </mesh>
      <mesh position={[0, -4.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[CORE_CATCHER.openingRadius - 0.08, 0.18, 12, 48]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>

      {/* Main Core Catcher Truncated Conical Vessel (корпус ловушки расплава) */}
      <mesh position={[0, centerY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[CORE_CATCHER.topRadius, CORE_CATCHER.bottomRadius, height, 48, 1, true]} />
        <primitive object={refractorySteelMat} attach="material" />
      </mesh>
      {/* Heavy bottom dished plate of containment vessel */}
      <mesh position={[0, CORE_CATCHER.bottomY + 0.15, 0]} castShadow>
        <cylinderGeometry args={[CORE_CATCHER.bottomRadius * 0.95, CORE_CATCHER.bottomRadius, 0.3, 40]} />
        <primitive object={refractorySteelMat} attach="material" />
      </mesh>
      {/* Top vessel flange ring */}
      <mesh position={[0, CORE_CATCHER.topY - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[CORE_CATCHER.topRadius - 0.1, 0.18, 12, 48]} />
        <primitive object={refractorySteelMat} attach="material" />
      </mesh>

      {/* 4. Sacrificial Ceramic Material Blocks inside vessel */}
      <SacrificialCeramicCharge />

      {/* 5. Translucent Annular Water Cooling Jacket surrounding vessel */}
      <mesh position={[0, centerY, 0]}>
        <cylinderGeometry args={[CORE_CATCHER.topRadius + 0.45, CORE_CATCHER.bottomRadius + 0.45, height + 0.2, 48, 1, true]} />
        <primitive object={waterJacketMat} attach="material" />
      </mesh>
      <mesh position={[0, CORE_CATCHER.topY - 0.2, 0]}>
        <torusGeometry args={[CORE_CATCHER.topRadius + 0.35, 0.12, 10, 48]} />
        <primitive object={coolantGlowMat} attach="material" />
      </mesh>

      {/* 6. Emergency Cooling Piping System */}
      <EmergencyCoolingSystem />

      {/* 7. Heavy Radiation Shielding Access Doors in vault wall */}
      {/* Primary heavy access door on North side (z = -vaultRadius) */}
      <HeavyShieldAccessDoor
        position={[0, -8.2, -vaultRadius + 0.1]}
        rotation={[0, 0, 0]}
      />
      {/* Secondary inspection airlock door on East side (x = vaultRadius) */}
      <HeavyShieldAccessDoor
        position={[vaultRadius - 0.1, -8.2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* 8. Vault Chamber Industrial Inspection Floodlights */}
      <pointLight position={[0, -6.5, 0]} intensity={18} color="#e6f0ff" distance={15} />
      <pointLight position={[4, -7.8, -4]} intensity={12} color="#fff2db" distance={12} castShadow />
      <pointLight position={[-4, -7.8, 4]} intensity={12} color="#fff2db" distance={12} />
    </group>
  );
}
