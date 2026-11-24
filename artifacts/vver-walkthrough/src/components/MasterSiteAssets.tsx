import * as THREE from 'three';
import { FLOOR_LEVELS, CONTAINMENT_GEOMETRY } from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';
import RITM200NFullComplex from './RITM200NModel';

// ============================================================================
// PBR MATERIALS FOR VVER UNIT 2 EXTERIOR & MASTER SITE ASSETS
// ============================================================================

const exteriorConcreteMat = new THREE.MeshStandardMaterial({
  color: '#E3E5E8', // Свежий автоклавный светло-серый монолитный бетон НВАЭС
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.86,
  metalness: 0.03,
});

const concreteDarkMat = new THREE.MeshStandardMaterial({
  color: '#8A8E94',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.88,
  metalness: 0.03,
});

const wallBeigePanelMat = new THREE.MeshStandardMaterial({
  color: '#E8DCC4',
  roughness: 0.76,
  metalness: 0.12,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.06, 0.06),
});

const baseRedBrownSkirtMat = new THREE.MeshStandardMaterial({
  color: '#8B4513',
  roughness: 0.72,
  metalness: 0.14,
});

const industrialMetalDarkMat = new THREE.MeshStandardMaterial({
  color: '#34495e',
  roughness: 0.45,
  metalness: 0.65,
});

const steelTrussMat = new THREE.MeshStandardMaterial({
  color: '#e4e7eb',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.32,
  metalness: 0.88,
});

const glassWindowMat = new THREE.MeshStandardMaterial({
  color: '#1a3344',
  roughness: 0.1,
  metalness: 0.85,
});

const pipeInsulatedMat = new THREE.MeshStandardMaterial({
  color: '#e2e6eb',
  roughness: 0.35,
  metalness: 0.78,
});

const ventRedBandMat = new THREE.MeshStandardMaterial({
  color: '#b82a24',
  roughness: 0.65,
  metalness: 0.15,
});

const ventWhiteBandMat = new THREE.MeshStandardMaterial({
  color: '#f2f2ec',
  roughness: 0.65,
  metalness: 0.15,
});

const waterTankDarkMat = new THREE.MeshStandardMaterial({
  color: '#2b3035',
  roughness: 0.55,
  metalness: 0.68,
});

// ============================================================================
// 1. VVER-1000 UNIT 2 (PARALLEL POWER UNIT WITH CONTAINMENT & TURBINE HALL)
// Parallel offset: ΔZ = +70m (Unit 2 reactor at [0, gY, 58], Turbine hall at [77, gY, 46])
// ============================================================================

export function VVERUnit2({
  position = [0, 0, 70],
  scale = [1, 1, 1],
}: {
  position?: [number, number, number];
  scale?: [number, number, number] | number;
}) {
  const gY = FLOOR_LEVELS.ground;
  const R = CONTAINMENT_GEOMETRY.outerRadius;
  const wallH = CONTAINMENT_GEOMETRY.wallHeight;
  const wallCenterY = CONTAINMENT_GEOMETRY.wallCenterY;
  const domeCenterY = CONTAINMENT_GEOMETRY.domeCenterY;
  const fRadius = CONTAINMENT_GEOMETRY.foundationRadius;
  const fThick = CONTAINMENT_GEOMETRY.foundationThickness;
  const fCenterY = CONTAINMENT_GEOMETRY.foundationCenterY;

  return (
    <group
      position={position}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
      name="VVERUnit2_Group"
    >
      {/* Reactor Containment Building Unit 2 (Полная идентичность габаритов и высот энергоблоку №1) */}
      <group position={[0, 0, 0]} name="VVERUnit2_Containment">
        {/* Concrete Foundation Base Ring (Строго на одной горизонтальной плоскости с энергоблоком №1: Y = -5.25м) */}
        <mesh position={[0, fCenterY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[fRadius, fRadius, fThick, 32]} />
          <primitive object={concreteDarkMat} attach="material" />
        </mesh>

        {/* Cylindrical Containment Shell (Строго одинаковая высота 37.5м, центр Y = 13.75м) */}
        <mesh position={[0, wallCenterY, 0]} receiveShadow>
          <cylinderGeometry args={[R, R, wallH, 20]} />
          <primitive object={exteriorConcreteMat} attach="material" />
        </mesh>

        {/* Spherical Containment Dome (Центр сферы на отметке верха цилиндра Y = 32.5м, радиус 23.2м, верхняя точка купола = +55.7м) */}
        <mesh position={[0, domeCenterY, 0]} receiveShadow>
          <sphereGeometry args={[R, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={exteriorConcreteMat} attach="material" />
        </mesh>

        {/* Vertical Structural Buttress Ribs (12 ребер жесткости равной высоты 37.5м) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <mesh
              key={`u2-rib-${i}`}
              position={[Math.cos(a) * R, wallCenterY, Math.sin(a) * R]}
              castShadow
            >
              <boxGeometry args={[0.9, wallH, 0.7]} />
              <primitive object={concreteDarkMat} attach="material" />
            </mesh>
          );
        })}

        {/* Ventilation Stack Unit 2 */}
        <group position={[-22, gY, -16]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[2.6, 3.0, 3, 12]} />
            <primitive object={concreteDarkMat} attach="material" />
          </mesh>
          {Array.from({ length: 7 }).map((_, i) => {
            const y = 3 + i * (58 / 7) + 58 / 14;
            const isRed = i % 2 === 0;
            return (
              <mesh key={`u2-vent-${i}`} position={[0, y, 0]} castShadow>
                <cylinderGeometry args={[1.6, 1.6, 58 / 7, 12]} />
                <primitive object={isRed ? ventRedBandMat : ventWhiteBandMat} attach="material" />
              </mesh>
            );
          })}
          {/* External Access Ladder & Platforms */}
          {[20, 36, 52].map((py, pi) => (
            <mesh key={`u2-vplat-${pi}`} position={[0, py, 0]}>
              <cylinderGeometry args={[2.4, 2.4, 0.4, 12]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          ))}
        </group>

        {/* Left Auxiliary Building Unit 2 (Обстройка РО энергоблока №2) */}
        <group position={[-33.5, gY, 0]}>
          <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
            <boxGeometry args={[22, 3.5, 32]} />
            <primitive object={baseRedBrownSkirtMat} attach="material" />
          </mesh>
          <mesh position={[0, 3.5 + 27.5 / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[21.8, 27.5, 31.8]} />
            <primitive object={exteriorConcreteMat} attach="material" />
          </mesh>
        </group>
      </group>

      {/* Transition Pipe Bridge between Unit 2 Containment & Unit 2 Turbine Hall */}
      <group position={[23.5, gY + 15.5, -12]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[7.0, 8.5, 12.0]} />
          <primitive object={wallBeigePanelMat} attach="material" />
        </mesh>
        {/* Support piers beneath */}
        {[-4.5, 4.5].map((pz) => (
          <mesh key={`u2-pier-${pz}`} position={[0, -9.0, pz]} castShadow receiveShadow>
            <boxGeometry args={[1.6, 9.5, 1.6]} />
            <primitive object={concreteDarkMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Turbine Hall Building Unit 2 (Parallel to Unit 1, X = 77m, Z = -12m relative to Unit 2 center) */}
      <group position={[77.0, gY, -12.0]} name="VVERUnit2_TurbineHall">
        {/* Lower Red-Brown Skirt */}
        <mesh position={[0, 2.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[100, 4.5, 36]} />
          <primitive object={baseRedBrownSkirtMat} attach="material" />
        </mesh>

        {/* Upper Wall Panels */}
        <mesh position={[0, 4.5 + (32 - 4.5) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[99.8, 32 - 4.5, 35.8]} />
          <primitive object={wallBeigePanelMat} attach="material" />
        </mesh>

        {/* Ribbon Windows North and South */}
        {[-18.1, 18.1].map((wz, wi) => (
          <group key={`u2-win-band-${wi}`}>
            <mesh position={[0, 16.5, wz]}>
              <boxGeometry args={[92, 3.5, 0.2]} />
              <primitive object={glassWindowMat} attach="material" />
            </mesh>
            <mesh position={[0, 24.5, wz]}>
              <boxGeometry args={[92, 2.8, 0.2]} />
              <primitive object={glassWindowMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Step-Up Transformers along the outer wall */}
        {[-26, 0, 26].map((tx, ti) => (
          <group key={`u2-trans-${ti}`} position={[tx, 0, 21.5]}>
            <mesh position={[0, 3.2, 0]} castShadow>
              <boxGeometry args={[6.5, 6.2, 5.5]} />
              <primitive object={industrialMetalDarkMat} attach="material" />
            </mesh>
            <mesh position={[4.2, 4.0, 0]} castShadow>
              <boxGeometry args={[0.6, 8.0, 7.0]} />
              <primitive object={concreteDarkMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// 2. OVERHEAD INTER-UNIT PIPE BRIDGE / PIPE GALLERY (НАДЗЕМНАЯ ЭСТАКАДА)
// Connects VVER Unit 1 and VVER Unit 2 across Z from Z = -12 to Z = 58
// ============================================================================

export function InterUnitOverheadPipeBridge() {
  const gY = FLOOR_LEVELS.ground;
  const bridgeX = 54.0; // Between containment and turbine halls
  const zStart = -12.0;
  const zEnd = 58.0;
  const lenZ = zEnd - zStart;
  const midZ = (zStart + zEnd) / 2;
  const elevY = gY + 14.0;

  return (
    <group position={[bridgeX, elevY, midZ]}>
      {/* Heavy Steel Truss Walkway / Enclosed Gallery */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4.8, 3.8, lenZ]} />
        <primitive object={wallBeigePanelMat} attach="material" />
      </mesh>

      {/* Structural Steel Support Bent Towers resting on the ground */}
      {Array.from({ length: 5 }).map((_, i) => {
        const pz = -lenZ / 2 + 5 + i * ((lenZ - 10) / 4);
        return (
          <group key={`bent-${i}`} position={[0, -7.0, pz]}>
            {/* Concrete footing pad */}
            <mesh position={[0, -6.5, 0]}>
              <boxGeometry args={[4.0, 1.0, 3.0]} />
              <primitive object={concreteDarkMat} attach="material" />
            </mesh>
            {/* 4 steel tower legs */}
            {[-1.6, 1.6].map((lx) => [-1.0, 1.0].map((lz) => (
              <mesh key={`leg-${lx}-${lz}`} position={[lx, 0, lz]}>
                <cylinderGeometry args={[0.18, 0.18, 14.0, 8]} />
                <primitive object={steelTrussMat} attach="material" />
              </mesh>
            )))}
            {/* Horizontal bracing */}
            <mesh position={[0, -2, 0]}>
              <boxGeometry args={[3.4, 0.2, 2.2]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
            <mesh position={[0, 3, 0]}>
              <boxGeometry args={[3.4, 0.2, 2.2]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* Running Insulated Inter-Unit Steam & Feedwater Pipe Bundle on top */}
      {[-1.4, -0.5, 0.5, 1.4].map((px, pi) => (
        <mesh key={`bundle-p-${pi}`} position={[px, 2.4, 0]}>
          <cylinderGeometry args={[0.32, 0.32, lenZ + 2, 10]} />
          <primitive object={pipeInsulatedMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// 3. RITM-200N SMR (SMALL MODULAR REACTOR) COMPLEX (МАЭС РИТМ-200Н)
// Интерактивная 3D-модель малой атомной станции с детальным разрезом оборудования
// ============================================================================

export function RITM200NComplex({ position = [168, 0, 80] }: { position?: [number, number, number] }) {
  return <RITM200NFullComplex position={position} />;
}

// ============================================================================
// 4. DUAL CYLINDRICAL WATER / CONDENSATE STORAGE TANKS
// Positioned between VVER units and RITM-200N SMR complex (X = 64, Z = 86)
// ============================================================================

export function CylindricalWaterStorageTanks({ position = [64, 0, 86] }: { position?: [number, number, number] }) {
  const gY = FLOOR_LEVELS.ground;
  const tankRadius = 8.5;
  const tankHeight = 16.0;

  return (
    <group position={position}>
      {/* Concrete Bund Wall Containment Basin */}
      <mesh position={[0, gY + 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[44, 1.2, 24]} />
        <primitive object={concreteDarkMat} attach="material" />
      </mesh>
      {/* Interior Basin Floor */}
      <mesh position={[0, gY + 0.1, 0]}>
        <boxGeometry args={[42, 0.2, 22]} />
        <primitive object={concreteDarkMat} attach="material" />
      </mesh>

      {/* Twin Cylindrical Tanks */}
      {[-12, 12].map((tx, ti) => (
        <group key={`tank-${ti}`} position={[tx, gY + 1.2, 0]}>
          {/* Main Tank Cylindrical Shell */}
          <mesh position={[0, tankHeight / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[tankRadius, tankRadius, tankHeight, 18]} />
            <primitive object={waterTankDarkMat} attach="material" />
          </mesh>
          {/* Conical Tank Roof */}
          <mesh position={[0, tankHeight + 1.6, 0]} castShadow>
            <coneGeometry args={[tankRadius + 0.3, 3.2, 18]} />
            <primitive object={waterTankDarkMat} attach="material" />
          </mesh>
          {/* Spiral / Vertical Access Ladder & Cage */}
          <mesh position={[0, tankHeight / 2, tankRadius + 0.3]}>
            <boxGeometry args={[1.2, tankHeight, 0.3]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Interconnecting Process Piping */}
      <mesh position={[0, gY + 3.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.4, 0.4, 24, 10]} />
        <primitive object={pipeInsulatedMat} attach="material" />
      </mesh>
    </group>
  );
}
