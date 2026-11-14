import { useMemo } from 'react';
import * as THREE from 'three';
import { FLOOR_LEVELS } from '@/scene/constants';
import {
  diamondPlateMap,
  diamondPlateNormalMap,
  diamondPlateRoughnessMap,
  brushedSteelMap,
  brushedSteelNormalMap,
  brushedSteelRoughnessMap,
  concreteMap,
  concreteNormalMap,
  concreteRoughnessMap,
} from '@/scene/pbrTextures';

// ============================================================================
// PBR MATERIALS - VVER-1000 TURBINE HALL SECONDARY CIRCUIT
// ============================================================================

// Steel-checkered floor plates (#5C636B metallic roughness)
const steelCheckeredDeckMat = new THREE.MeshStandardMaterial({
  color: '#5C636B',
  map: diamondPlateMap,
  roughnessMap: diamondPlateRoughnessMap,
  normalMap: diamondPlateNormalMap,
  normalScale: new THREE.Vector2(0.4, 0.4),
  roughness: 0.46,
  metalness: 0.82,
});

// Yellow safety handrails (#F5B041)
const safetyHandrailMat = new THREE.MeshStandardMaterial({
  color: '#F5B041',
  roughness: 0.38,
  metalness: 0.45,
});

// Lime-olive industrial equipment finish (#70933C) for K-1000 turbine set
const turbineLimeOliveMat = new THREE.MeshStandardMaterial({
  color: '#70933C',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.1, 0.1),
  roughness: 0.42,
  metalness: 0.65,
});

const turbineDarkMetalMat = new THREE.MeshStandardMaterial({
  color: '#3d444d',
  roughness: 0.5,
  metalness: 0.7,
});

// Silver/grey insulated steam supply lines (#C0C0C0 / #e4e7eb)
const steamPipeInsulatedMat = new THREE.MeshStandardMaterial({
  color: '#C0C0C0',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughness: 0.32,
  metalness: 0.82,
});

// Flange rings and machined steel shafts
const machinedSteelMat = new THREE.MeshStandardMaterial({
  color: '#e8ecf0',
  roughness: 0.22,
  metalness: 0.92,
});

// Generator output busbars (enclosed phase ducts)
const busbarHousingMat = new THREE.MeshStandardMaterial({
  color: '#8c949e',
  roughness: 0.4,
  metalness: 0.65,
});

// Heavy-duty overhead crane bright yellow
const craneYellowMat = new THREE.MeshStandardMaterial({
  color: '#F5B041',
  roughness: 0.35,
  metalness: 0.4,
});

// Structural steel framing (exposed grey steel trusses)
const structuralSteelMat = new THREE.MeshStandardMaterial({
  color: '#6c737d',
  roughness: 0.5,
  metalness: 0.75,
});

// Concrete foundation blocks & piers
const foundationConcreteMat = new THREE.MeshStandardMaterial({
  color: '#8b8e91',
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.88,
  metalness: 0.05,
});

// Wall beige industrial panels & red-brown foundation skirt
const wallBeigePanelMat = new THREE.MeshStandardMaterial({
  color: '#E8DCC4',
  roughness: 0.78,
  metalness: 0.1,
  side: THREE.DoubleSide,
});

const baseRedBrownSkirtMat = new THREE.MeshStandardMaterial({
  color: '#8B4513',
  roughness: 0.75,
  metalness: 0.12,
  side: THREE.DoubleSide,
});

const glassWindowMat = new THREE.MeshStandardMaterial({
  color: '#1a3344',
  roughness: 0.1,
  metalness: 0.85,
  transparent: true,
  opacity: 0.65,
});

const highBayLampEmissiveMat = new THREE.MeshStandardMaterial({
  color: '#fff8e7',
  emissive: '#fffae8',
  emissiveIntensity: 1.2,
  roughness: 0.2,
});

// ============================================================================
// HANDRAIL COMPONENT (YELLOW SAFETY RAILS #F5B041)
// ============================================================================

function SafetyHandrail({
  start,
  end,
  height = 1.1,
}: {
  start: [number, number];
  end: [number, number];
  height?: number;
}) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[1] + end[1]) / 2;
  const postSpacing = 4.5;
  const postCount = Math.max(2, Math.floor(length / postSpacing) + 1);

  return (
    <group position={[midX, FLOOR_LEVELS.turbineDeck, midZ]} rotation={[0, -angle, 0]}>
      {/* Top handrail pipe */}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[length, 0.05, 0.05]} />
        <primitive object={safetyHandrailMat} attach="material" />
      </mesh>
      {/* Mid rail pipe */}
      <mesh position={[0, height * 0.55, 0]}>
        <boxGeometry args={[length, 0.04, 0.04]} />
        <primitive object={safetyHandrailMat} attach="material" />
      </mesh>
      {/* Bottom kick-plate / toe-board */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[length, 0.15, 0.03]} />
        <primitive object={safetyHandrailMat} attach="material" />
      </mesh>
      {/* Vertical posts */}
      {Array.from({ length: postCount }).map((_, i) => {
        const px = -length / 2 + (i / (postCount - 1)) * length;
        return (
          <mesh key={`hpost-${i}`} position={[px, height / 2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, height, 5]} />
            <primitive object={safetyHandrailMat} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}

// ============================================================================
// 1. DEDICATED CONNECTING PASSAGE & STEAM PIPE BRIDGE (ТРУБОПРОВОДНАЯ ЭСТАКАДА)
// Connects flush to the containment outer wall (R=23.2m) without penetrating the dome interior
// ============================================================================

function TransitionBridge() {
  // Spans from X = 20.0m (outer shell wall) to X = 27.0m (Turbine Hall west wall)
  const startX = 20.0;
  const endX = 27.0;
  const midX = (startX + endX) / 2; // 23.5m
  const spanLen = endX - startX; // 7.0m
  const bridgeZ = -12.0;

  const bridgeGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(spanLen, 8.5, 12.0);
    geo.computeBoundingBox();
    return geo;
  }, [spanLen]);

  return (
    <group position={[midX, 15.5, bridgeZ]}>
      {/* Enclosed Overpass Gallery Body */}
      <mesh geometry={bridgeGeo} castShadow receiveShadow>
        <primitive object={wallBeigePanelMat} attach="material" />
      </mesh>

      {/* Sealed Penetration Sleeves (Гермопроходки) on Containment Shell Interface */}
      {[-3.6, -1.2, 1.2, 3.6].map((pz) => (
        <group key={`pen-sleeve-${pz}`} position={[-spanLen / 2 - 0.15, 0, pz]}>
          {/* Circular bolting flange collar */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.85, 0.85, 0.4, 24]} />
            <primitive object={machinedSteelMat} attach="material" />
          </mesh>
          {/* Main steam pipe traversing sleeve */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.55, 0.55, 1.2, 16]} />
            <primitive object={steamPipeInsulatedMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 4 Main Insulated Steam Pipes passing through bridge (6.0 MPa) */}
      {[-3.6, -1.2, 1.2, 3.6].map((pz) => (
        <mesh key={`br-pipe-${pz}`} position={[0, 1.2, pz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.5, 0.5, spanLen + 0.2, 16]} />
          <primitive object={steamPipeInsulatedMat} attach="material" />
        </mesh>
      ))}

      {/* Observation / Inspection Gallery Windows along bridge sides */}
      {[-6.05, 6.05].map((wz, wi) => (
        <mesh key={`br-win-${wi}`} position={[0, -0.5, wz]}>
          <boxGeometry args={[spanLen - 1.2, 2.2, 0.15]} />
          <primitive object={glassWindowMat} attach="material" />
        </mesh>
      ))}

      {/* Structural Support Piers beneath bridge resting on ground */}
      {[-4.5, 4.5].map((pz) => (
        <mesh key={`pier-${pz}`} position={[0, -9.0, pz]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 9.5, 1.6]} />
          <primitive object={foundationConcreteMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// 2. HEAVY-DUTY OVERHEAD BRIDGE CRANE (МОСТОВОЙ КРАН 160/32 т)
// ============================================================================

function OverheadBridgeCrane({ hallSpan = 33, positionX = 77 }: { hallSpan?: number; positionX?: number }) {
  const railY = 22.0;

  return (
    <group position={[positionX, railY, -12]}>
      {/* Twin Box-Girder Crane Bridge Beams */}
      {[-1.8, 1.8].map((offsetZ) => (
        <group key={`girder-${offsetZ}`} position={[0, 1.4, offsetZ]}>
          <mesh castShadow>
            <boxGeometry args={[1.4, 2.4, hallSpan]} />
            <primitive object={craneYellowMat} attach="material" />
          </mesh>
          {/* Stiffener ribs along girder */}
          {[-12, -6, 0, 6, 12].map((rz) => (
            <mesh key={`rib-${rz}`} position={[0, 0, rz]}>
              <boxGeometry args={[1.5, 2.45, 0.08]} />
              <primitive object={structuralSteelMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* End Trucks (Wheel assemblies on rails) */}
      {[-hallSpan / 2 + 0.6, hallSpan / 2 - 0.6].map((truckZ) => (
        <group key={`truck-${truckZ}`} position={[0, 0.4, truckZ]}>
          <mesh castShadow>
            <boxGeometry args={[5.2, 0.8, 1.2]} />
            <primitive object={craneYellowMat} attach="material" />
          </mesh>
          {[-2.0, 2.0].map((wx) => (
            <mesh key={`wheel-${wx}`} position={[wx, -0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.42, 0.42, 0.35, 12]} />
              <primitive object={machinedSteelMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Crane Trolley with Main Hoist 160t & Aux Hoist 32t */}
      <group position={[0, 2.9, -2]}>
        <mesh castShadow>
          <boxGeometry args={[4.2, 0.6, 4.8]} />
          <primitive object={craneYellowMat} attach="material" />
        </mesh>
        <mesh position={[-0.8, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.7, 0.7, 2.6, 12]} />
          <primitive object={machinedSteelMat} attach="material" />
        </mesh>
        <mesh position={[1.1, 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 2.2, 12]} />
          <primitive object={machinedSteelMat} attach="material" />
        </mesh>
        <mesh position={[-0.8, 0.8, -1.8]}>
          <boxGeometry args={[1.2, 1.2, 1.4]} />
          <primitive object={turbineDarkMetalMat} attach="material" />
        </mesh>
        <mesh position={[-0.8, -4.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 8, 6]} />
          <primitive object={structuralSteelMat} attach="material" />
        </mesh>
        <mesh position={[-0.8, -8.6, 0]} castShadow>
          <boxGeometry args={[1.2, 1.4, 0.9]} />
          <primitive object={craneYellowMat} attach="material" />
        </mesh>
        <mesh position={[-0.8, -9.8, 0]}>
          <torusGeometry args={[0.45, 0.16, 6, 12, Math.PI * 1.5]} />
          <primitive object={machinedSteelMat} attach="material" />
        </mesh>
      </group>

      {/* Suspended Operator Control Cabin */}
      <group position={[0, -1.8, hallSpan / 2 - 3.5]}>
        <mesh castShadow>
          <boxGeometry args={[2.8, 2.8, 2.2]} />
          <primitive object={craneYellowMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.2, -1.15]}>
          <boxGeometry args={[2.4, 1.6, 0.1]} />
          <primitive object={glassWindowMat} attach="material" />
        </mesh>
        <mesh position={[1.45, 0.2, 0]}>
          <boxGeometry args={[0.1, 1.6, 1.8]} />
          <primitive object={glassWindowMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// 3. VVER-1000 STEAM TURBINE GENERATOR SET (К-1000-60/1500 & ТВВ-1000)
// Shifted safely east of containment: Shaft runs from X = 33m to X = 118m
// ============================================================================

function TurboGeneratorSet() {
  const shaftY = 14.6; // Centerline of turbine-generator shaft (2.6m above +12m deck)
  const shaftZ = -12.0;

  const foundationGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(86, 12.0 - FLOOR_LEVELS.ground, 10.5);
    geo.computeBoundingBox();
    return geo;
  }, []);

  return (
    <group position={[0, 0, shaftZ]}>
      {/* Heavy Reinforced Concrete Foundation Island (X from 34m to 120m) */}
      <mesh geometry={foundationGeo} position={[77, (12.0 + FLOOR_LEVELS.ground) / 2, 0]} receiveShadow>
        <primitive object={foundationConcreteMat} attach="material" />
      </mesh>

      {/* Foundation Pedestals rising to shaft level */}
      {[36, 48, 56, 70, 84, 98, 112].map((px) => (
        <mesh key={`pedestal-${px}`} position={[px, 13.0, 0]} receiveShadow>
          <boxGeometry args={[3.2, 2.0, 8.5]} />
          <primitive object={foundationConcreteMat} attach="material" />
        </mesh>
      ))}

      {/* Continuous Polished Steel Rotor Shaft Line */}
      <mesh position={[77, shaftY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.65, 0.65, 80, 14]} />
        <primitive object={machinedSteelMat} attach="material" />
      </mesh>

      {/* ----------------------------------------------------------------------
          A. HIGH-PRESSURE CYLINDER (ЦВД - Цилиндр высокого давления)
          Positioned at X = 38m (close to west wall for steam intake from overpass bridge)
          ---------------------------------------------------------------------- */}
      <group position={[38, shaftY, 0]}>
        {/* Main HP Turbine Outer Casing */}
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[2.4, 2.6, 8.5, 16]} />
          <primitive object={turbineLimeOliveMat} attach="material" />
        </mesh>
        {/* Horizontal split-flange bolted joint ring */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[8.8, 0.45, 5.8]} />
          <primitive object={turbineDarkMetalMat} attach="material" />
        </mesh>
        {/* Stiffening annular rings */}
        {[-3.2, -1.1, 1.1, 3.2].map((rx) => (
          <mesh key={`hp-ring-${rx}`} position={[rx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[2.7, 2.7, 0.4, 16]} />
            <primitive object={turbineDarkMetalMat} attach="material" />
          </mesh>
        ))}

        {/* 4 Main Steam Inlets & Valve Chests (receiving steam from transition bridge) */}
        {[
          { pos: [-1.8, 2.7, -1.8] as [number, number, number] },
          { pos: [-1.8, 2.7, 1.8] as [number, number, number] },
          { pos: [1.8, 2.7, -1.8] as [number, number, number] },
          { pos: [1.8, 2.7, 1.8] as [number, number, number] },
        ].map((v, vi) => (
          <group key={`hp-valve-${vi}`} position={v.pos}>
            <mesh castShadow>
              <cylinderGeometry args={[0.65, 0.65, 1.8, 12]} />
              <primitive object={turbineDarkMetalMat} attach="material" />
            </mesh>
            <mesh position={[0, 1.3, 0]}>
              <cylinderGeometry args={[0.42, 0.52, 0.9, 10]} />
              <primitive object={safetyHandrailMat} attach="material" />
            </mesh>
            <mesh position={[0, 1.85, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.12, 12]} />
              <primitive object={safetyHandrailMat} attach="material" />
            </mesh>
            {/* Steam feed pipe connecting from west wall interface */}
            <mesh position={[-4.5, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.45, 0.45, 7.5, 12]} />
              <primitive object={steamPipeInsulatedMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* HP Exhaust extraction lines to SPP Moisture Separator Reheaters */}
        {[-8, 8].map((ez) => (
          <group key={`hp-exh-${ez}`} position={[3.2, -0.6, ez / 2]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.7, 0.7, 4.5, 12]} />
              <primitive object={steamPipeInsulatedMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ----------------------------------------------------------------------
          B. MOISTURE SEPARATOR REHEATERS (СПП-1000 - Сепараторы-пароперегреватели)
          ---------------------------------------------------------------------- */}
      {[
        { x: 47, z: -9.5 },
        { x: 59, z: -9.5 },
        { x: 47, z: 9.5 },
        { x: 59, z: 9.5 },
      ].map((spp, si) => (
        <group key={`spp-${si}`} position={[spp.x, 14.5, spp.z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[1.8, 1.8, 8.5, 16]} />
            <primitive object={turbineLimeOliveMat} attach="material" />
          </mesh>
          <mesh position={[0, 4.25, 0]}>
            <sphereGeometry args={[1.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <primitive object={turbineLimeOliveMat} attach="material" />
          </mesh>
          <mesh position={[0, -3.2, 0]}>
            <cylinderGeometry args={[1.85, 1.95, 2.5, 16]} />
            <primitive object={turbineDarkMetalMat} attach="material" />
          </mesh>
          <mesh position={[0, 2.2, spp.z > 0 ? -4.0 : 4.0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 7.0, 12]} />
            <primitive object={steamPipeInsulatedMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ----------------------------------------------------------------------
          C. LOW-PRESSURE CYLINDERS (ЦНД-1, ЦНД-2, ЦНД-3 - Цилиндры низкого давления)
          3 massive inline dual-flow LP turbine casings aligned sequentially
          ---------------------------------------------------------------------- */}
      {[
        { id: 'cnd-1', x: 57 },
        { id: 'cnd-2', x: 71 },
        { id: 'cnd-3', x: 85 },
      ].map((cnd) => (
        <group key={cnd.id} position={[cnd.x, shaftY, 0]}>
          {/* Massive LP Exhaust Hood */}
          <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
            <boxGeometry args={[10.5, 5.2, 8.2]} />
            <primitive object={turbineLimeOliveMat} attach="material" />
          </mesh>
          {/* Upper cylindrical curved roof */}
          <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[4.1, 4.1, 10.4, 14, 1, false, 0, Math.PI]} />
            <primitive object={turbineLimeOliveMat} attach="material" />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[11.2, 0.5, 8.8]} />
            <primitive object={turbineDarkMetalMat} attach="material" />
          </mesh>
          {[-4.2, -2.1, 0, 2.1, 4.2].map((rx) => (
            <mesh key={`lp-rib-${rx}`} position={[rx, 1.8, 0]}>
              <boxGeometry args={[0.15, 4.5, 8.4]} />
              <primitive object={turbineDarkMetalMat} attach="material" />
            </mesh>
          ))}
          {/* Overhead steam crossover receiver nozzles from SPP */}
          {[-2.2, 2.2].map((nz) => (
            <group key={`lp-inlet-${nz}`} position={[0, 5.2, nz]}>
              <mesh>
                <cylinderGeometry args={[0.75, 0.75, 1.6, 12]} />
                <primitive object={steamPipeInsulatedMat} attach="material" />
              </mesh>
            </group>
          ))}
          {[-2.8, 2.8].map((mx) => (
            <mesh key={`manhole-${mx}`} position={[mx, 2.8, 4.15]}>
              <circleGeometry args={[0.42, 10]} />
              <primitive object={turbineDarkMetalMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Intermediate Bearing Pedestals */}
      {[50, 64, 78, 92].map((bx) => (
        <group key={`bearing-${bx}`} position={[bx, shaftY, 0]}>
          <mesh castShadow>
            <boxGeometry args={[2.6, 3.2, 4.2]} />
            <primitive object={turbineDarkMetalMat} attach="material" />
          </mesh>
          <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.1, 1.1, 2.65, 12]} />
            <primitive object={machinedSteelMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ----------------------------------------------------------------------
          D. ELECTRIC GENERATOR (ТВВ-1000 - 1000 MWe, 1500 rpm)
          Positioned at X = 101m
          ---------------------------------------------------------------------- */}
      <group position={[101, shaftY, 0]}>
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[2.75, 2.75, 13.5, 16]} />
          <primitive object={turbineLimeOliveMat} attach="material" />
        </mesh>
        {[-6.8, 6.8].map((ex) => (
          <mesh key={`gen-shield-${ex}`} position={[ex, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[2.85, 2.85, 0.8, 16]} />
            <primitive object={turbineDarkMetalMat} attach="material" />
          </mesh>
        ))}
        {/* Output Terminal Enclosure beneath generator */}
        <mesh position={[0, -2.4, 0]}>
          <boxGeometry args={[6.5, 2.2, 4.5]} />
          <primitive object={turbineDarkMetalMat} attach="material" />
        </mesh>
        {/* Output Isolated-Phase Busbars (24 kV) heading east toward outdoor switchyard */}
        {[-1.6, 0, 1.6].map((bz) => (
          <group key={`busbar-${bz}`} position={[0, -3.2, bz]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 14, 12]} />
              <primitive object={busbarHousingMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ----------------------------------------------------------------------
          E. BRUSHLESS EXCITER & TURNING GEAR (ВОЗБУДИТЕЛЬ И ВПУ)
          ---------------------------------------------------------------------- */}
      <group position={[112, shaftY, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.5, 1.5, 5.2, 14]} />
          <primitive object={turbineDarkMetalMat} attach="material" />
        </mesh>
        <mesh position={[0, 1.8, 1.4]}>
          <boxGeometry args={[1.8, 1.6, 1.6]} />
          <primitive object={turbineLimeOliveMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// 4. OPERATING DECK (+12m) & MAINTENANCE WALKWAYS WITH HANDRAILS
// Shifted to X = 27.5m to 126.5m (100% outside containment shell)
// ============================================================================

function OperatingDeckAndWalkways() {
  const deckY = FLOOR_LEVELS.turbineDeck; // +12.0m

  return (
    <group>
      {/* North Maintenance Walkway Deck (Z from -29 to -18, X from 28 to 126) */}
      <mesh position={[77, deckY, -23.5]} receiveShadow>
        <boxGeometry args={[98, 0.35, 11]} />
        <primitive object={steelCheckeredDeckMat} attach="material" />
      </mesh>

      {/* South Maintenance Walkway Deck (Z from -6 to 5, X from 28 to 126) */}
      <mesh position={[77, deckY, -0.5]} receiveShadow>
        <boxGeometry args={[98, 0.35, 11]} />
        <primitive object={steelCheckeredDeckMat} attach="material" />
      </mesh>

      {/* West Apron Floor connecting from Transition Bridge (X from 27.5 to 35, Z from -29 to 5) */}
      <mesh position={[31.2, deckY, -12]} receiveShadow>
        <boxGeometry args={[7.4, 0.35, 34]} />
        <primitive object={steelCheckeredDeckMat} attach="material" />
      </mesh>

      {/* East Apron Floor behind Exciter (X from 118 to 126.5, Z from -29 to 5) */}
      <mesh position={[122.2, deckY, -12]} receiveShadow>
        <boxGeometry args={[8.5, 0.35, 34]} />
        <primitive object={steelCheckeredDeckMat} attach="material" />
      </mesh>

      {/* Crosswalk Bridges spanning between North and South around machinery */}
      {[
        { x: 47, w: 2.8 },
        { x: 89, w: 3.2 },
      ].map((cw, cwi) => (
        <mesh key={`crosswalk-${cwi}`} position={[cw.x, deckY, -12]} receiveShadow>
          <boxGeometry args={[cw.w, 0.35, 14]} />
          <primitive object={steelCheckeredDeckMat} attach="material" />
        </mesh>
      ))}

      {/* Yellow Safety Handrails (#F5B041) along Deck Boundaries */}
      {/* North outer wall boundary */}
      <SafetyHandrail start={[27.8, -28.8]} end={[126.2, -28.8]} />
      {/* South outer wall boundary */}
      <SafetyHandrail start={[27.8, 4.8]} end={[126.2, 4.8]} />
      {/* West boundary */}
      <SafetyHandrail start={[27.8, -28.8]} end={[27.8, 4.8]} />
      {/* East boundary */}
      <SafetyHandrail start={[126.2, -28.8]} end={[126.2, 4.8]} />

      {/* Inner Guardrails around the central turbine machinery foundation pit */}
      {/* North inner railing */}
      <SafetyHandrail start={[34.5, -18.0]} end={[45.5, -18.0]} />
      <SafetyHandrail start={[48.5, -18.0]} end={[87.5, -18.0]} />
      <SafetyHandrail start={[90.5, -18.0]} end={[117.5, -18.0]} />

      {/* South inner railing */}
      <SafetyHandrail start={[34.5, -6.0]} end={[45.5, -6.0]} />
      <SafetyHandrail start={[48.5, -6.0]} end={[87.5, -6.0]} />
      <SafetyHandrail start={[90.5, -6.0]} end={[117.5, -6.0]} />

      {/* Stairs leading down to ground floor (+0m) at West and East ends */}
      {[
        { x: 29.5, z: -24, rot: 0 },
        { x: 124.5, z: 0, rot: Math.PI },
      ].map((stair, si) => (
        <group key={`stair-${si}`} position={[stair.x, deckY, stair.z]} rotation={[0, stair.rot, 0]}>
          <mesh position={[0, -6.0, 0]}>
            <boxGeometry args={[3.2, 12.0, 6.4]} />
            <primitive object={foundationConcreteMat} attach="material" />
          </mesh>
          {Array.from({ length: 16 }).map((_, stepI) => {
            const t = stepI / 16;
            const sy = -t * 12.0;
            const sz = -2.8 + t * 5.6;
            return (
              <mesh key={`step-${stepI}`} position={[0, sy, sz]}>
                <boxGeometry args={[2.4, 0.18, 0.45]} />
                <primitive object={steelCheckeredDeckMat} attach="material" />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// 5. ARCHITECTURAL STRUCTURE & EXPOSED STEEL ROOF TRUSSES
// Positioned at X = 77.0m, Length = 100m, West wall at X = 27.0m
// ============================================================================

function ArchitecturalFraming({
  position,
  cutaway = 0,
}: {
  position: [number, number, number];
  cutaway?: number;
}) {
  const len = 100;
  const wid = 36;
  const hgt = 32;

  const bents = useMemo(() => {
    const list: number[] = [];
    for (let x = -44; x <= 44; x += 12.5) {
      list.push(x);
    }
    return list;
  }, []);

  const hallGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(len, 4.5, wid);
    geo.computeBoundingBox();
    return geo;
  }, [len, wid]);

  const upperGeo = useMemo(() => {
    const geo = new THREE.BoxGeometry(len - 0.2, hgt - 4.5, wid - 0.2);
    geo.computeBoundingBox();
    return geo;
  }, [len, wid, hgt]);

  // При послойном срезе (cutaway > 0.4) верхние стены скрываются, открывая вид на турбоагрегат и кран
  const isCutaway = cutaway > 0.4;

  return (
    <group position={position}>
      {/* 1. Outer Building Walls: Red-brown skirt (0 to 4.5m) + Warm beige panels */}
      <mesh geometry={hallGeo} position={[0, 2.25, 0]} castShadow receiveShadow>
        <primitive object={baseRedBrownSkirtMat} attach="material" />
      </mesh>

      <mesh
        geometry={upperGeo}
        position={[0, 4.5 + (hgt - 4.5) / 2, 0]}
        castShadow
        receiveShadow
        visible={!isCutaway}
      >
        <primitive object={wallBeigePanelMat} attach="material" />
      </mesh>

      {/* North & South Ribbon Windows */}
      {[-wid / 2 - 0.1, wid / 2 + 0.1].map((wz, wi) => (
        <group key={`win-band-${wi}`}>
          <mesh position={[0, 16.5, wz]}>
            <boxGeometry args={[len - 8, 3.5, 0.2]} />
            <primitive object={glassWindowMat} attach="material" />
          </mesh>
          <mesh position={[0, 24.5, wz]}>
            <boxGeometry args={[len - 8, 2.8, 0.2]} />
            <primitive object={glassWindowMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 2. Exposed Steel H-Columns & Roof Trusses */}
      {bents.map((bx) => (
        <group key={`bent-${bx}`} position={[bx, 0, 0]}>
          {/* North and South vertical steel columns */}
          {[-wid / 2 + 0.8, wid / 2 - 0.8].map((cz) => (
            <mesh key={`col-${cz}`} position={[0, hgt / 2, cz]} castShadow>
              <boxGeometry args={[0.7, hgt, 0.7]} />
              <primitive object={structuralSteelMat} attach="material" />
            </mesh>
          ))}

          {/* Crane Runway Rail Beams at Y = 22m */}
          {[-wid / 2 + 1.2, wid / 2 - 1.2].map((cz) => (
            <mesh key={`crane-beam-${cz}`} position={[0, 22.0, cz]}>
              <boxGeometry args={[13.0, 0.8, 0.5]} />
              <primitive object={machinedSteelMat} attach="material" />
            </mesh>
          ))}

          {/* Triangular Steel Roof Truss Girder across ceiling */}
          <group position={[0, hgt - 3.5, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.4, 0.4, wid - 2]} />
              <primitive object={structuralSteelMat} attach="material" />
            </mesh>
            {[-wid / 4, wid / 4].map((tx) => (
              <mesh key={`top-chord-${tx}`} position={[0, 1.4, tx]}>
                <boxGeometry args={[0.4, 0.4, wid / 2 + 0.5]} />
                <primitive object={structuralSteelMat} attach="material" />
              </mesh>
            ))}
            {[-12, -6, 0, 6, 12].map((wz) => (
              <mesh key={`web-${wz}`} position={[0, 1.2, wz]}>
                <boxGeometry args={[0.25, 2.4, 0.25]} />
                <primitive object={structuralSteelMat} attach="material" />
              </mesh>
            ))}
          </group>
        </group>
      ))}

      {/* 3. High-Bay Industrial Lighting Luminaires */}
      {bents.map((bx) => (
        <group key={`light-${bx}`} position={[bx, hgt - 4.2, 0]}>
          {[-9, 0, 9].map((lz) => (
            <group key={`lamp-${lz}`} position={[0, 0, lz]}>
              <mesh>
                <cylinderGeometry args={[0.55, 0.75, 0.5, 12]} />
                <primitive object={structuralSteelMat} attach="material" />
              </mesh>
              <mesh position={[0, -0.26, 0]}>
                <circleGeometry args={[0.65, 16]} />
                <primitive object={highBayLampEmissiveMat} attach="material" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// MAIN TURBINE HALL COMPONENT EXPORT
// ============================================================================

export default function TurbineHall({ cutaway = 0 }: { cutaway?: number }) {
  const gY = FLOOR_LEVELS.ground;
  // Positioned at X = 77.0m, Length = 100m, West wall at X = 27.0m (outside containment R=23.2m)
  const hallCenterX = 77.0;
  const hallCenterZ = -12.0;

  return (
    <group>
      {/* 1. Dedicated Connecting Transition Passage & Steam Pipe Bridge (X from 20m to 27m) */}
      <TransitionBridge />

      {/* 2. Architectural Hall Structure (X = 77m, strictly outside containment dome) */}
      <ArchitecturalFraming position={[hallCenterX, gY, hallCenterZ]} cutaway={cutaway} />

      {/* 3. Steel-Checkered Operating Deck (+12m) & Maintenance Walkways */}
      <OperatingDeckAndWalkways />

      {/* 4. VVER-1000 Steam Turbine Generator Set (К-1000-60/1500 & ТВВ-1000) */}
      <TurboGeneratorSet />

      {/* 5. Heavy-Duty Overhead Bridge Crane (Мостовой кран 160/32 т) */}
      <OverheadBridgeCrane hallSpan={33} positionX={hallCenterX} />
    </group>
  );
}
