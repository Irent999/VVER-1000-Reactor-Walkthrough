import * as THREE from 'three';
import { CORE_CATCHER } from '@/scene/constants';
import {
  brushedSteelNormalMap,
  brushedSteelRoughnessMap,
  concreteMap,
  concreteNormalMap,
  concreteRoughnessMap,
} from '@/scene/pbrTextures';

const shellMat = new THREE.MeshStandardMaterial({
  color: '#62696e',
  roughness: 0.38,
  metalness: 0.9,
  map: undefined,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.14, 0.14),
  side: THREE.DoubleSide,
});

const concreteShieldMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.24, 0.24),
  roughness: 0.94,
  metalness: 0.02,
  side: THREE.DoubleSide,
});

const waterJacketMat = new THREE.MeshPhysicalMaterial({
  color: '#43b7ca',
  roughness: 0.16,
  metalness: 0.12,
  transparent: true,
  opacity: 0.28,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const coolingPipeMat = new THREE.MeshStandardMaterial({
  color: '#555f69',
  roughness: 0.34,
  metalness: 0.9,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
});

const coolantMat = new THREE.MeshStandardMaterial({
  color: '#4dc3d7',
  emissive: '#0c5264',
  emissiveIntensity: 0.3,
  roughness: 0.22,
  metalness: 0.18,
});

const tankMat = new THREE.MeshStandardMaterial({
  color: '#64727a',
  roughness: 0.42,
  metalness: 0.82,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
});

const ceramicMaterials = [
  '#b58a57',
  '#c29a64',
  '#a7794e',
  '#c7ad7c',
].map((color) => new THREE.MeshStandardMaterial({
  color,
  roughness: 0.96,
  metalness: 0.02,
}));

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
  const direction = end.clone().sub(start);
  const position = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, direction.length(), 12]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

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
          const angle = (blockIndex / layer.count) * Math.PI * 2 + (layerIndex % 2) * 0.12;
          const width = layer.count === 1 ? 1.5 : 0.9;
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
              <primitive object={ceramicMaterials[(layerIndex + blockIndex) % ceramicMaterials.length]} attach="material" />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

function EmergencyCoolingSources() {
  const directions = Array.from({ length: 4 }, (_, index) => (index * Math.PI) / 2 + Math.PI / 4);
  const innerRadius = 5.9;
  const sourceY = -4.25;
  const pipeY = -4.45;

  return (
    <group>
      {directions.map((angle, index) => {
        const x = Math.cos(angle);
        const z = Math.sin(angle);
        const riserBottom: [number, number, number] = [x * innerRadius, -8.5, z * innerRadius];
        const riserTop: [number, number, number] = [x * innerRadius, pipeY, z * innerRadius];
        const source: [number, number, number] = [x * CORE_CATCHER.sourceRadius, pipeY, z * CORE_CATCHER.sourceRadius];
        const tankPosition: [number, number, number] = [x * CORE_CATCHER.sourceRadius, sourceY, z * CORE_CATCHER.sourceRadius];

        return (
          <group key={index}>
            <PipeSegment from={riserBottom} to={riserTop} radius={0.17} material={coolingPipeMat} />
            <PipeSegment from={riserBottom} to={riserTop} radius={0.07} material={coolantMat} />
            <PipeSegment from={riserTop} to={source} radius={0.17} material={coolingPipeMat} />
            <PipeSegment from={riserTop} to={source} radius={0.07} material={coolantMat} />
            <mesh position={tankPosition} castShadow receiveShadow>
              <cylinderGeometry args={[0.62, 0.62, 1.5, 20]} />
              <primitive object={tankMat} attach="material" />
            </mesh>
            <mesh position={[tankPosition[0], sourceY + 0.8, tankPosition[2]]}>
              <cylinderGeometry args={[0.5, 0.5, 0.12, 20]} />
              <primitive object={coolingPipeMat} attach="material" />
            </mesh>
            <mesh position={[tankPosition[0], sourceY - 0.76, tankPosition[2]]}>
              <cylinderGeometry args={[0.7, 0.7, 0.12, 20]} />
              <primitive object={coolingPipeMat} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export default function CoreCatcher() {
  const centerY = (CORE_CATCHER.topY + CORE_CATCHER.bottomY) / 2;
  const height = CORE_CATCHER.topY - CORE_CATCHER.bottomY;

  return (
    <group>
      {/* Shielded reactor-pit shaft around the melt-localization device. */}
      <mesh position={[0, CORE_CATCHER.bottomY + 2.5, 0]} receiveShadow>
        <cylinderGeometry args={[CORE_CATCHER.shieldRadius, CORE_CATCHER.shieldRadius, 5, 64, 1, true]} />
        <primitive object={concreteShieldMat} attach="material" />
      </mesh>

      {/* Open truncated steel funnel: wide at the vessel-facing opening, narrow at its base. */}
      <mesh position={[0, centerY, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[CORE_CATCHER.topRadius, CORE_CATCHER.bottomRadius, height, 48, 1, true]} />
        <primitive object={shellMat} attach="material" />
      </mesh>
      <mesh position={[0, CORE_CATCHER.bottomY + 0.12, 0]} castShadow>
        <cylinderGeometry args={[CORE_CATCHER.bottomRadius * 0.95, CORE_CATCHER.bottomRadius, 0.24, 40]} />
        <primitive object={shellMat} attach="material" />
      </mesh>
      <mesh position={[0, CORE_CATCHER.topY - 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[CORE_CATCHER.topRadius - 0.12, 0.16, 12, 48]} />
        <primitive object={shellMat} attach="material" />
      </mesh>

      <SacrificialCeramicCharge />

      {/* Translucent annular cooling-water jacket wrapped around the funnel wall. */}
      <mesh position={[0, centerY, 0]}>
        <cylinderGeometry args={[6.05, 3.0, height + 0.15, 48, 1, true]} />
        <primitive object={waterJacketMat} attach="material" />
      </mesh>
      <mesh position={[0, CORE_CATCHER.topY - 0.2, 0]}>
        <torusGeometry args={[5.85, 0.12, 10, 48]} />
        <primitive object={coolantMat} attach="material" />
      </mesh>

      <EmergencyCoolingSources />
    </group>
  );
}
