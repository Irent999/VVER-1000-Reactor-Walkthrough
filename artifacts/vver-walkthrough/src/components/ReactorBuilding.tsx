import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CONTAINMENT, DECK, POLAR_CRANE, SAFETY_YELLOW,
  DARK_STEEL_COLOR, FLOOR_LEVELS, HIGH_BAY_LIGHTS, RAIL_TRACKS,
} from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  floorTileMap, floorTileNormalMap, floorTileRoughnessMap,
  diamondPlateMap, diamondPlateNormalMap, diamondPlateRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

// 1. Concrete PBR: Seamless concrete with industrial paneling lines & roughness 0.85
const interiorConcreteMat = new THREE.MeshStandardMaterial({
  color: '#f4f2eb',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.35, 0.35),
  roughness: 0.85, // Realistic 0.85 roughness as requested
  metalness: 0.02,
  side: THREE.BackSide,
});

const exteriorConcreteMat = new THREE.MeshStandardMaterial({
  color: '#e8e5dc',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.3, 0.3),
  roughness: 0.85,
  metalness: 0.02,
});

const structuralConcreteDark = new THREE.MeshStandardMaterial({
  color: '#8e8e86',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.2, 0.2),
  roughness: 0.88,
  metalness: 0.02,
});

// 2. Main Deck (+15m) Anti-Slip Dark Grey Floor Tiles
const mainDeckTileMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: floorTileMap,
  normalMap: floorTileNormalMap,
  roughnessMap: floorTileRoughnessMap,
  normalScale: new THREE.Vector2(0.45, 0.45),
  roughness: 0.74,
  metalness: 0.05,
});

// 3. Diamond-Plate Metal Pattern for Walkways & Service Catwalks
const diamondPlateMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: diamondPlateMap,
  normalMap: diamondPlateNormalMap,
  roughnessMap: diamondPlateRoughnessMap,
  normalScale: new THREE.Vector2(0.5, 0.5),
  roughness: 0.38,
  metalness: 0.82,
});

// 4. Equipment & Structural Steel
const safetyYellowMat = new THREE.MeshStandardMaterial({
  color: SAFETY_YELLOW, // '#FFCC00'
  roughness: 0.32,
  metalness: 0.28,
  emissive: '#332600',
  emissiveIntensity: 0.06,
});

const steelMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.3,
  metalness: 0.88,
});

const darkSteelMat = new THREE.MeshStandardMaterial({
  color: DARK_STEEL_COLOR,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughness: 0.42,
  metalness: 0.85,
});

const railSteelMat = new THREE.MeshStandardMaterial({
  color: '#525a63',
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.1, 0.1),
  roughness: 0.26,
  metalness: 0.92,
});

/** High-visibility Industrial Polar Crane Structure (#FFCC00) with beams and trolley winch detail */
function PolarCrane() {
  const bridgeRef = useRef<THREE.Group>(null);
  const trolleyRef = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    if (bridgeRef.current) {
      bridgeRef.current.rotation.y += dt * 0.035;
    }
    if (trolleyRef.current) {
      // Gentle realistic trolley travel along the girder
      trolleyRef.current.position.x = 4 + Math.sin(state.clock.elapsedTime * 0.15) * 3.5;
    }
  });

  const railR = POLAR_CRANE.railRadius;
  const girderLength = railR * 2 + 1.2;
  const girderSpacing = 2.4;

  return (
    <group position={[0, POLAR_CRANE.y, 0]}>
      {/* Structural wall brackets supporting crane travel wheels */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * railR, -0.8, Math.sin(a) * railR]} rotation={[0, -a, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.6, 1.4, 0.8]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            {/* Diagonal knee brace */}
            <mesh position={[0, -0.6, 0.3]} rotation={[Math.PI / 4, 0, 0]} castShadow>
              <boxGeometry args={[0.35, 1.0, 0.35]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* Rotating Crane Bridge in High-Visibility Safety Yellow (#FFCC00) */}
      <group ref={bridgeRef}>
        {/* Twin main box girders */}
        <mesh position={[0, 0.7, girderSpacing / 2]} castShadow>
          <boxGeometry args={[girderLength, 1.4, 0.55]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.7, -girderSpacing / 2]} castShadow>
          <boxGeometry args={[girderLength, 1.4, 0.55]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>

        {/* Structural vertical stiffener plates along box girders */}
        {Array.from({ length: 12 }).map((_, i) => {
          const gx = -railR + 3 + i * 2.8;
          return (
            <group key={`stiff-${i}`}>
              <mesh position={[gx, 0.7, girderSpacing / 2 + 0.3]}>
                <boxGeometry args={[0.08, 1.2, 0.15]} />
                <primitive object={safetyYellowMat} attach="material" />
              </mesh>
              <mesh position={[gx, 0.7, -girderSpacing / 2 - 0.3]}>
                <boxGeometry args={[0.08, 1.2, 0.15]} />
                <primitive object={safetyYellowMat} attach="material" />
              </mesh>
            </group>
          );
        })}

        {/* Maintenance Walkway between and alongside girders (Diamond-Plate) */}
        <mesh position={[0, 1.42, 0]}>
          <boxGeometry args={[girderLength * 0.9, 0.06, girderSpacing + 1.2]} />
          <primitive object={diamondPlateMat} attach="material" />
        </mesh>
        {/* Safety yellow handrails along crane walkway */}
        {[-girderSpacing / 2 - 0.55, girderSpacing / 2 + 0.55].map((zPos, zIdx) => (
          <group key={`walk-rail-${zIdx}`}>
            <mesh position={[0, 2.45, zPos]}>
              <boxGeometry args={[girderLength * 0.88, 0.05, 0.05]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
            <mesh position={[0, 1.95, zPos]}>
              <boxGeometry args={[girderLength * 0.88, 0.04, 0.04]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
            {Array.from({ length: 14 }).map((_, sIdx) => (
              <mesh key={sIdx} position={[-railR + 2.5 + sIdx * 2.4, 1.95, zPos]}>
                <cylinderGeometry args={[0.025, 0.025, 1.0, 6]} />
                <primitive object={safetyYellowMat} attach="material" />
              </mesh>
            ))}
          </group>
        ))}

        {/* End Carriages with twin-wheel bogies resting on the ring rail */}
        {[-railR, railR].map((ex, eIdx) => (
          <group key={`end-${eIdx}`} position={[ex, 0.5, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.5, 1.3, girderSpacing + 2.2]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
            {/* Flanged steel crane travel wheels */}
            {[-1.2, 1.2].map((wz, wIdx) => (
              <mesh key={wIdx} position={[0, -0.3, wz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.4, 0.4, 0.35, 16]} />
                <primitive object={darkSteelMat} attach="material" />
              </mesh>
            ))}
            {/* Travel drive electric motors */}
            <mesh position={[eIdx === 0 ? 0.8 : -0.8, 0.6, 0]}>
              <cylinderGeometry args={[0.3, 0.3, 1.0, 12]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Traveling Trolley with 320-ton Main Winch & 32-ton Aux Winch Detail */}
        <group ref={trolleyRef} position={[4, 1.6, 0]}>
          {/* Heavy trolley frame */}
          <mesh castShadow position={[0, 0.2, 0]}>
            <boxGeometry args={[3.2, 0.4, girderSpacing + 0.6]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          {/* Trolley steel traverse wheels */}
          {[-1.2, 1.2].map((tx) => [-girderSpacing / 2, girderSpacing / 2].map((tz, ti) => (
            <mesh key={`${tx}-${ti}`} position={[tx, -0.05, tz]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.15, 12]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
          )))}

          {/* Main 320t Hoist Grooved Wire Rope Winch Drum */}
          <mesh position={[-0.5, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.55, 0.55, 1.8, 24]} />
            <primitive object={darkSteelMat} attach="material" />
          </mesh>
          {/* Main hoist drive electric motor + reduction gearbox */}
          <mesh position={[-0.5, 0.85, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.9, 16]} />
            <primitive object={darkSteelMat} attach="material" />
          </mesh>
          <mesh position={[-0.5, 0.85, 0.7]}>
            <boxGeometry args={[0.7, 0.8, 0.6]} />
            <primitive object={darkSteelMat} attach="material" />
          </mesh>

          {/* Auxiliary 32t Hoist Winch Drum */}
          <mesh position={[0.9, 0.6, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 1.4, 20]} />
            <primitive object={darkSteelMat} attach="material" />
          </mesh>

          {/* Steel Wire Ropes descending from the sheave blocks */}
          {[-0.3, 0.3].map((rx, rIdx) => (
            <mesh key={rIdx} position={[rx, -2.5, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 5.0, 6]} />
              <primitive object={steelMat} attach="material" />
            </mesh>
          ))}

          {/* 320t Heavy Duty Hook Block with Sheaves in Safety Yellow */}
          <group position={[0, -5.2, 0]}>
            {/* Sheave casing block */}
            <mesh castShadow>
              <boxGeometry args={[1.2, 1.3, 0.8]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
            {/* Warning hazard stripes bar */}
            <mesh position={[0, 0.7, 0]}>
              <boxGeometry args={[1.25, 0.15, 0.85]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            {/* Heavy forged steel crane hook */}
            <mesh position={[0, -1.0, 0]}>
              <torusGeometry args={[0.35, 0.12, 12, 24, Math.PI * 1.5]} />
              <primitive object={steelMat} attach="material" />
            </mesh>
            <mesh position={[0.3, -0.6, 0]}>
              <sphereGeometry args={[0.16, 12, 12]} />
              <primitive object={steelMat} attach="material" />
            </mesh>
          </group>

          {/* Crane Operator Control Cab hanging under girder */}
          <group position={[-1.2, -1.6, 1.4]}>
            <mesh castShadow>
              <boxGeometry args={[1.5, 1.8, 1.2]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
            {/* Cab viewing windows */}
            <mesh position={[0.76, 0.1, 0]}>
              <planeGeometry args={[1.0, 1.0]} />
              <meshPhysicalMaterial color="#88ccee" transmission={0.7} roughness={0.1} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * High-Bay Industrial Floodlights with 4500K warm-white LED tones
 * Mounted in a ring under the polar crane circular rail beam.
 */
function HighBayLightingRing() {
  const count = HIGH_BAY_LIGHTS.count;
  const radius = HIGH_BAY_LIGHTS.ringRadius;
  const y = HIGH_BAY_LIGHTS.y;

  return (
    <group position={[0, y, 0]}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;

        return (
          <group key={`high-bay-${i}`} position={[x, 0, z]}>
            {/* Industrial high-bay bell reflector luminaire housing */}
            <mesh position={[0, 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.3, 0.7, 0.6, 16]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            {/* Die-cast cooling fin cylinder */}
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.35, 12]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            {/* High-output 4500K LED emitter lens (glowing warm-white) */}
            <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.65, 16]} />
              <meshBasicMaterial color={HIGH_BAY_LIGHTS.color} />
            </mesh>

            {/* Direct warm-white spotlight pointing down into reactor compartment - optimized without shadow map overhead */}
            <spotLight
              position={[0, -0.2, 0]}
              target-position={[x * 0.4, -26, z * 0.4]}
              color={HIGH_BAY_LIGHTS.color}
              intensity={HIGH_BAY_LIGHTS.intensity}
              distance={HIGH_BAY_LIGHTS.distance}
              angle={Math.PI / 4.2}
              penumbra={0.6}
            />
          </group>
        );
      })}
    </group>
  );
}

/** Invisible physical collision walls enclosing floor boundaries, pits, and handrails */
function InvisibleCollisionWalls() {
  return (
    <group>
      {/* 1. +15m Main Deck central reactor pit barrier (cylinder r=5.45, h=3.2m) */}
      <mesh position={[0, DECK.mainY + 1.6, 0]} visible={false}>
        <cylinderGeometry args={[5.45, 5.45, 3.2, 32, 1, true]} />
        <meshBasicMaterial transparent opacity={0} wireframe />
      </mesh>

      {/* 2. +36m Upper Deck central void barrier (cylinder guarding central opening at r = 8.35m) */}
      <mesh position={[0, DECK.upperY + 2.0, 0]} visible={false}>
        <cylinderGeometry args={[DECK.upperHoleRadius + 0.35, DECK.upperHoleRadius + 0.35, 4.0, 32, 1, true]} />
        <meshBasicMaterial transparent opacity={0} wireframe />
      </mesh>

      {/* 3. Outer containment boundary barrier (cylinder r=21.6, h=60m) */}
      <mesh position={[0, 20, 0]} visible={false}>
        <cylinderGeometry args={[CONTAINMENT.innerRadius - 0.4, CONTAINMENT.innerRadius - 0.4, 60, 32, 1, true]} />
        <meshBasicMaterial transparent opacity={0} wireframe />
      </mesh>

      {/* 4. -5m Basement DCS bio-shield vault cylinder barrier (cylinder r=7.25, h=6m) */}
      <mesh position={[0, FLOOR_LEVELS.basement + 3.0, 0]} visible={false}>
        <cylinderGeometry args={[7.25, 7.25, 6.0, 32, 1, true]} />
        <meshBasicMaterial transparent opacity={0} wireframe />
      </mesh>
    </group>
  );
}

/**
 * Floor rail tracks embedded into the +15m concrete deck for equipment transport dollies,
 * including a heavy transport dolly cart.
 */
function EmbeddedTransportRails() {
  const { gauge, railWidth, railHeight, startX, endX, z, deckY } = RAIL_TRACKS;
  const length = endX - startX;
  const centerX = (startX + endX) / 2;

  return (
    <group position={[0, deckY, z]}>
      {/* Recessed track channels in the tile floor */}
      {[-gauge / 2, gauge / 2].map((zOffset, rIdx) => (
        <group key={`rail-${rIdx}`} position={[centerX, 0, zOffset]}>
          {/* Concrete recess channel */}
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[length + 0.4, 0.08, railWidth * 2.2]} />
            <primitive object={structuralConcreteDark} attach="material" />
          </mesh>
          {/* Heavy steel crane/dolly rail head embedded flush */}
          <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
            <boxGeometry args={[length, railHeight, railWidth]} />
            <primitive object={railSteelMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Embedded steel cross ties / track fasteners flush with deck */}
      {Array.from({ length: Math.floor(length / 1.5) }).map((_, i) => {
        const tx = startX + 0.8 + i * 1.5;
        return (
          <mesh key={`tie-${i}`} position={[tx, 0.005, 0]}>
            <boxGeometry args={[0.2, 0.015, gauge + 0.7]} />
            <primitive object={darkSteelMat} attach="material" />
          </mesh>
        );
      })}

      {/* Equipment Transport Dolly Cart sitting on the rails */}
      <group position={[-6.5, 0.12, 0]}>
        {/* Heavy welded steel bed */}
        <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
          <boxGeometry args={[4.2, 0.35, gauge + 0.8]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
        {/* Diamond-plate top load deck */}
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[4.0, 0.04, gauge + 0.7]} />
          <primitive object={diamondPlateMat} attach="material" />
        </mesh>
        {/* Flanged steel wheels resting on rails */}
        {[-1.4, 1.4].map((wx) => [-gauge / 2, gauge / 2].map((wz, wi) => (
          <mesh key={`${wx}-${wi}`} position={[wx, 0.05, wz]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.14, 16]} />
            <primitive object={darkSteelMat} attach="material" />
          </mesh>
        )))}
        {/* Wheel journal axle boxes */}
        {[-1.4, 1.4].map((wx) => (
          <mesh key={`axle-${wx}`} position={[wx, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, gauge + 0.4, 12]} />
            <primitive object={steelMat} attach="material" />
          </mesh>
        ))}
        {/* Transport cradle supports for reactor components */}
        {[-1.2, 1.2].map((cx) => (
          <mesh key={`cradle-${cx}`} position={[cx, 0.65, 0]} castShadow>
            <boxGeometry args={[0.4, 0.4, gauge + 0.5]} />
            <primitive object={darkSteelMat} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Reactor Pit Detailing (+15m Level):
 * Circular biological shielding opening with circular protective yellow guardrail (#FFCC00),
 * segmented inspection floor hatches with lift rings, and steel hatch layout.
 */
function ReactorPitDetailing() {
  const pitRadius = DECK.mainHoleRadius;
  const guardrailRadius = pitRadius + 0.45;
  const deckY = DECK.mainY;

  return (
    <group position={[0, deckY, 0]}>
      {/* Biological shielding well concrete rim */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[pitRadius - 0.2, pitRadius + 0.35, 48]} />
        <primitive object={structuralConcreteDark} attach="material" />
      </mesh>
      {/* Heavy steel perimeter curbing around pit */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[pitRadius + 0.3, 0.06, 8, 48]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>

      {/* Circular Protective Safety Yellow Guardrail (#FFCC00) around central reactor pit */}
      {/* Stanchion vertical posts */}
      {Array.from({ length: 32 }).map((_, i) => {
        const a = (i / 32) * Math.PI * 2;
        // Leave a small gap for entry gate at the rail track side (a ≈ 0)
        if (Math.abs(a) < 0.22) return null;
        return (
          <group key={`rp-post-${i}`} position={[Math.cos(a) * guardrailRadius, 0, Math.sin(a) * guardrailRadius]}>
            {/* Base mounting flange */}
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.04, 8]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            {/* Post */}
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 1.2, 8]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* Top handrail at 1.15m height */}
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[guardrailRadius, 0.035, 8, 48, Math.PI * 1.85]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      {/* Mid-rail at 0.6m height */}
      <mesh position={[0, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[guardrailRadius, 0.025, 8, 48, Math.PI * 1.85]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      {/* Safety kickplate / toe-board (0.12m tall) */}
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[guardrailRadius, 0.05, 4, 48, Math.PI * 1.85]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>

      {/* Safety chain / gate across the opening */}
      <mesh position={[guardrailRadius, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 1.2, 6]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>

      {/* Floor Inspection Hatch Layout around the deck */}
      {/* Segmented heavy concrete/steel shielding slabs with flush lifting eyes */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const hRadius = pitRadius + 2.4;
        const hx = Math.cos(a) * hRadius;
        const hz = Math.sin(a) * hRadius;

        return (
          <group key={`hatch-${i}`} position={[hx, 0.02, hz]} rotation={[0, -a, 0]}>
            {/* Hatch perimeter steel frame */}
            <mesh receiveShadow>
              <boxGeometry args={[1.6, 0.03, 1.2]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            {/* Diamond-plate or textured steel hatch lid */}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[1.45, 0.02, 1.05]} />
              <primitive object={diamondPlateMat} attach="material" />
            </mesh>
            {/* Recessed flush lifting eye rings */}
            {[-0.5, 0.5].map((lx) => (
              <mesh key={lx} position={[lx, 0.035, 0]}>
                <torusGeometry args={[0.08, 0.02, 6, 12]} />
                <primitive object={steelMat} attach="material" />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Circular Stainless Steel Inspection Manholes */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const mhRadius = pitRadius + 4.8;
        return (
          <group key={`manhole-${i}`} position={[Math.cos(a) * mhRadius, 0.015, Math.sin(a) * mhRadius]}>
            <mesh>
              <cylinderGeometry args={[0.55, 0.55, 0.03, 20]} />
              <primitive object={steelMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 0.02, 20]} />
              <primitive object={diamondPlateMat} attach="material" />
            </mesh>
            {/* Flange bolts around manhole perimeter */}
            {Array.from({ length: 8 }).map((_, bIdx) => {
              const ba = (bIdx / 8) * Math.PI * 2;
              return (
                <mesh key={bIdx} position={[Math.cos(ba) * 0.5, 0.03, Math.sin(ba) * 0.5]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.03, 6]} />
                  <primitive object={safetyYellowMat} attach="material" />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/**
 * Main Deck (+15m) & Upper Deck (+36m) Slabs
 * Top surface of +15m deck uses the dark grey anti-slip floor tiles,
 * while catwalk platforms use diamond-plate metal.
 */
function DeckPlates() {
  const shapeMain = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, DECK.outerRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, DECK.mainHoleRadius, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return s;
  }, []);

  const shapeUpper = useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, DECK.outerRadius, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, DECK.upperHoleRadius, 0, Math.PI * 2, true);
    s.holes.push(hole);
    return s;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: DECK.slabThickness,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 1,
    steps: 1,
  }), []);

  return (
    <group>
      {/* Main Deck (+15.0m elevation) with Dark Grey Anti-Slip Tiles */}
      <mesh
        position={[0, DECK.mainY - DECK.slabThickness, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry args={[shapeMain, extrudeSettings]} />
        <primitive object={mainDeckTileMat} attach="material" />
      </mesh>

      {/* Embedded transport rails and cart */}
      <EmbeddedTransportRails />

      {/* Reactor pit circular detailing, yellow guardrails, and inspection hatches */}
      <ReactorPitDetailing />

      {/* Perimeter Catwalk along the inner containment wall at +15m with Diamond Plate */}
      <mesh
        position={[0, DECK.mainY + 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry args={[DECK.outerRadius - 1.8, DECK.outerRadius, 64]} />
        <primitive object={diamondPlateMat} attach="material" side={THREE.DoubleSide} />
      </mesh>

      {/* Perimeter Yellow Safety Railing at +15m */}
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const pr = DECK.outerRadius - 1.8;
        return (
          <mesh key={`p-rail-${i}`} position={[Math.cos(a) * pr, DECK.mainY + 0.6, Math.sin(a) * pr]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        );
      })}
      <mesh position={[0, DECK.mainY + 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[DECK.outerRadius - 1.8, 0.03, 6, 48]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>

      {/* Upper Deck (+36.0m elevation) Floor Slab & Walkway Physical Geometry */}
      <group name="PolarCraneDeckGroup">
        {/* Extruded structural slab at +36m */}
        <mesh
          name="PolarCraneDeck"
          position={[0, DECK.upperY - DECK.slabThickness, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
          userData={{ isFloor: true, isWalkableFloor: true, floorLevel: 36, floorY: 36.0, levelName: 'PolarCraneDeck' }}
        >
          <extrudeGeometry args={[shapeUpper, extrudeSettings]} />
          <primitive object={diamondPlateMat} attach="material" />
        </mesh>

        {/* Level33Floor: Double-sided diamond-plate walking plane for Raycasting & WebXR */}
        <mesh
          name="Level33Floor"
          position={[0, DECK.upperY + 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          userData={{ isFloor: true, isWalkableFloor: true, floorLevel: 36, floorY: 36.0, levelName: 'Level33Floor' }}
        >
          <ringGeometry args={[DECK.upperHoleRadius, DECK.outerRadius, 64]} />
          <meshStandardMaterial
            map={diamondPlateMap}
            normalMap={diamondPlateNormalMap}
            roughnessMap={diamondPlateRoughnessMap}
            roughness={0.38}
            metalness={0.82}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Dedicated static collision body target plane for Teleportation ray */}
        <mesh
          name="PolarCraneDeckCollider"
          position={[0, DECK.upperY, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          userData={{ isFloor: true, isWalkableFloor: true, floorLevel: 36, floorY: 36.0, levelName: 'PolarCraneDeck' }}
        >
          <ringGeometry args={[DECK.upperHoleRadius, DECK.outerRadius, 64]} />
          <meshBasicMaterial side={THREE.DoubleSide} />
        </mesh>

        {/* Inner Polar Crane Rail Track bounded strictly inside +36m floor platform */}
        <mesh
          name="PolarCraneInnerRailTrack"
          position={[0, DECK.upperY + 0.015, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <ringGeometry args={[18.0 - 0.08, 18.0 + 0.08, 64]} />
          <primitive object={railSteelMat} attach="material" />
        </mesh>
      </group>

      {/* Upper Deck Yellow Safety Railings around the central hole */}
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i / 48) * Math.PI * 2;
        const r = DECK.upperHoleRadius + 0.35;
        return (
          <mesh key={`ur-${i}`} position={[Math.cos(a) * r, DECK.upperY + 0.6, Math.sin(a) * r]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        );
      })}
      <mesh position={[0, DECK.upperY + 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[DECK.upperHoleRadius + 0.35, 0.035, 6, 48]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      <mesh position={[0, DECK.upperY + 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[DECK.upperHoleRadius + 0.35, 0.025, 6, 48]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
    </group>
  );
}

/** Containment Cylinder & Upper Dome Surface */
function ContainmentStructure({ opacity }: { opacity: number }) {
  const outerMatRef = useRef<THREE.MeshPhysicalMaterial>(
    new THREE.MeshPhysicalMaterial({
      color: '#f0ede6',
      map: concreteMap,
      normalMap: concreteNormalMap,
      roughnessMap: concreteRoughnessMap,
      normalScale: new THREE.Vector2(0.25, 0.25),
      roughness: 0.85,
      metalness: 0.02,
      transparent: true,
      opacity: 0.15,
      side: THREE.FrontSide,
    })
  ).current;

  useFrame(() => {
    const target = opacity * 0.55;
    if (Math.abs(outerMatRef.opacity - target) > 0.001) {
      outerMatRef.opacity = target;
    }
  });

  const R = CONTAINMENT.outerRadius;
  const innerR = CONTAINMENT.innerRadius;
  const wallH = CONTAINMENT.wallTopY - CONTAINMENT.baseY;
  const wallCenterY = (CONTAINMENT.baseY + CONTAINMENT.wallTopY) / 2;

  return (
    <group>
      {/* 1. Interior Containment Cylinder Wall (Seamless concrete PBR, roughness 0.85) */}
      <mesh
        material={interiorConcreteMat}
        position={[0, wallCenterY, 0]}
        receiveShadow
      >
        <cylinderGeometry args={[innerR, innerR, wallH, 64, 1, true]} />
      </mesh>

      {/* 2. Interior Upper Dome Surface (Seamless concrete PBR, roughness 0.85) */}
      <mesh
        material={interiorConcreteMat}
        position={[0, CONTAINMENT.wallTopY, 0]}
        receiveShadow
      >
        <sphereGeometry args={[innerR, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* 3. Exterior Cutaway Containment Shell (transparency controlled by slider) */}
      <mesh material={outerMatRef} position={[0, wallCenterY, 0]}>
        <cylinderGeometry args={[R, R, wallH, 64, 1, true]} />
      </mesh>
      <mesh material={outerMatRef} position={[0, CONTAINMENT.wallTopY, 0]}>
        <sphereGeometry args={[R, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* Solid Foundation Ring Base Slab */}
      <mesh position={[0, CONTAINMENT.baseY - 0.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[R + 1.2, R + 1.2, 0.5, 64]} />
        <primitive object={exteriorConcreteMat} attach="material" />
      </mesh>

      {/* Outer Vertical Concrete Buttresses / Stiffener Ribs */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * R, wallCenterY, Math.sin(a) * R]}
            castShadow
          >
            <boxGeometry args={[0.9, wallH, 0.7]} />
            <primitive object={structuralConcreteDark} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Realistic Metal Staircase with Diamond-Plate Treads and Safety Yellow Handrails (#FFCC00)
 * Connecting -5.0m DCS Server Room to +15.0m Main Steam Generator Deck.
 */
function Stairwell1() {
  const steps = 30;
  const { xMin, xMax, zMin, zMax, yStart, yEnd } = {
    xMin: 17, xMax: 21, zMin: -8, zMax: 8,
    yStart: FLOOR_LEVELS.basement, yEnd: DECK.mainY,
  };
  const stepDepth = (zMax - zMin) / steps;
  const stepHeight = (yEnd - yStart) / steps;
  const stairLength = Math.hypot(zMax - zMin, yEnd - yStart);
  const inclineAngle = Math.atan2(yEnd - yStart, zMax - zMin);
  const midZ = (zMin + zMax) / 2;
  const midY = (yStart + yEnd) / 2;

  return (
    <group>
      {/* Heavy Concrete Enclosure Flank Walls */}
      <mesh position={[xMin - 0.25, midY, midZ]}>
        <boxGeometry args={[0.3, yEnd - yStart + 1.2, zMax - zMin + 1.2]} />
        <primitive object={structuralConcreteDark} attach="material" />
      </mesh>
      <mesh position={[xMax + 0.25, midY, midZ]}>
        <boxGeometry args={[0.3, yEnd - yStart + 1.2, zMax - zMin + 1.2]} />
        <primitive object={structuralConcreteDark} attach="material" />
      </mesh>

      {/* Structural Steel Channel Stringers along the incline on both sides */}
      {[xMin + 0.1, xMax - 0.1].map((sx, si) => (
        <mesh
          key={`stringer-1-${si}`}
          position={[sx, midY, midZ]}
          rotation={[-inclineAngle, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.12, 0.35, stairLength + 0.5]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      ))}

      {/* Diamond-Plate Metal Steps */}
      {Array.from({ length: steps }).map((_, i) => {
        const z = zMin + i * stepDepth + stepDepth / 2;
        const y = yStart + i * stepHeight;
        return (
          <group key={`step-1-${i}`} position={[(xMin + xMax) / 2, y + stepHeight / 2, z]}>
            {/* Step tread with Diamond-Plate pattern */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[xMax - xMin - 0.25, 0.05, stepDepth + 0.04]} />
              <primitive object={diamondPlateMat} attach="material" />
            </mesh>
            {/* Steel riser plate */}
            <mesh position={[0, -stepHeight / 2 + 0.025, stepDepth / 2]}>
              <boxGeometry args={[xMax - xMin - 0.25, stepHeight, 0.02]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* Continuous Inclined Safety Yellow Handrails (#FFCC00) on both sides */}
      {[xMin + 0.2, xMax - 0.2].map((hx, hi) => (
        <group key={`handrail-1-${hi}`}>
          {/* Top Handrail Pipe at 1.1m above steps */}
          <mesh
            position={[hx, midY + 1.1, midZ]}
            rotation={[-inclineAngle, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.025, 0.025, stairLength + 0.4, 8]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          {/* Mid-Rail at 0.55m above steps */}
          <mesh
            position={[hx, midY + 0.58, midZ]}
            rotation={[-inclineAngle, 0, 0]}
          >
            <cylinderGeometry args={[0.018, 0.018, stairLength + 0.4, 8]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          {/* Toe Kickplate Bar along bottom */}
          <mesh
            position={[hx, midY + 0.08, midZ]}
            rotation={[-inclineAngle, 0, 0]}
          >
            <boxGeometry args={[0.02, 0.12, stairLength + 0.4]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>

          {/* Vertical Stanchion Posts every 3 steps along the incline */}
          {Array.from({ length: 10 }).map((_, pIdx) => {
            const t = pIdx / 9;
            const pz = zMin + 0.6 + t * (zMax - zMin - 1.2);
            const py = yStart + t * (yEnd - yStart);
            return (
              <mesh key={`post-1-${hi}-${pIdx}`} position={[hx, py + 0.55, pz]} castShadow>
                <cylinderGeometry args={[0.022, 0.022, 1.1, 6]} />
                <primitive object={safetyYellowMat} attach="material" />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Landing Platform at Top (+15.0m deck exit) */}
      <mesh position={[(xMin + xMax) / 2, yEnd - 0.02, zMax + 0.8]} receiveShadow>
        <boxGeometry args={[xMax - xMin, 0.06, 1.6]} />
        <primitive object={diamondPlateMat} attach="material" />
      </mesh>
      {/* Landing Safety Railings */}
      {[xMin + 0.2, xMax - 0.2].map((lx, li) => (
        <group key={`land-rail-${li}`} position={[lx, yEnd + 0.55, zMax + 0.8]}>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[0.04, 0.04, 1.6]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.03, 0.03, 1.6]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Realistic Metal Staircase with Diamond-Plate Treads and Safety Yellow Handrails (#FFCC00)
 * Connecting +15.0m Main Steam Generator Deck to +36.0m Polar Crane Platform.
 */
function Stairwell2() {
  const steps = 32;
  const { xMin, xMax, zMin, zMax, yStart, yEnd } = {
    xMin: -8, xMax: 8, zMin: 17, zMax: 21,
    yStart: DECK.mainY, yEnd: DECK.upperY,
  };
  const stepDepth = (xMax - xMin) / steps;
  const stepHeight = (yEnd - yStart) / steps;
  const stairLength = Math.hypot(xMax - xMin, yEnd - yStart);
  const inclineAngle = Math.atan2(yEnd - yStart, xMax - xMin);
  const midX = (xMin + xMax) / 2;
  const midY = (yStart + yEnd) / 2;
  const midZ = (zMin + zMax) / 2;

  return (
    <group>
      {/* Heavy Concrete Enclosure Flank Walls */}
      <mesh position={[midX, midY, zMin - 0.25]}>
        <boxGeometry args={[xMax - xMin + 1.2, yEnd - yStart + 1.2, 0.3]} />
        <primitive object={structuralConcreteDark} attach="material" />
      </mesh>
      <mesh position={[midX, midY, zMax + 0.25]}>
        <boxGeometry args={[xMax - xMin + 1.2, yEnd - yStart + 1.2, 0.3]} />
        <primitive object={structuralConcreteDark} attach="material" />
      </mesh>

      {/* Structural Steel Channel Stringers along the incline on both sides */}
      {[zMin + 0.1, zMax - 0.1].map((sz, si) => (
        <mesh
          key={`stringer-2-${si}`}
          position={[midX, midY, sz]}
          rotation={[0, 0, inclineAngle]}
          castShadow
        >
          <boxGeometry args={[stairLength + 0.5, 0.35, 0.12]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      ))}

      {/* Diamond-Plate Metal Steps */}
      {Array.from({ length: steps }).map((_, i) => {
        const x = xMin + i * stepDepth + stepDepth / 2;
        const y = yStart + i * stepHeight;
        return (
          <group key={`step-2-${i}`} position={[x, y + stepHeight / 2, midZ]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[stepDepth + 0.04, 0.05, zMax - zMin - 0.25]} />
              <primitive object={diamondPlateMat} attach="material" />
            </mesh>
            <mesh position={[stepDepth / 2, -stepHeight / 2 + 0.025, 0]}>
              <boxGeometry args={[0.02, stepHeight, zMax - zMin - 0.25]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* Continuous Inclined Safety Yellow Handrails (#FFCC00) on both sides */}
      {[zMin + 0.2, zMax - 0.2].map((hz, hi) => (
        <group key={`handrail-2-${hi}`}>
          {/* Top Handrail Pipe at 1.1m above steps */}
          <mesh
            position={[midX, midY + 1.1, hz]}
            rotation={[0, 0, inclineAngle]}
            castShadow
          >
            <cylinderGeometry args={[0.025, 0.025, stairLength + 0.4, 8]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          {/* Mid-Rail at 0.58m above steps */}
          <mesh
            position={[midX, midY + 0.58, hz]}
            rotation={[0, 0, inclineAngle]}
          >
            <cylinderGeometry args={[0.018, 0.018, stairLength + 0.4, 8]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          {/* Toe Kickplate Bar along bottom */}
          <mesh
            position={[midX, midY + 0.08, hz]}
            rotation={[0, 0, inclineAngle]}
          >
            <boxGeometry args={[stairLength + 0.4, 0.12, 0.02]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>

          {/* Vertical Stanchion Posts every 3 steps along the incline */}
          {Array.from({ length: 11 }).map((_, pIdx) => {
            const t = pIdx / 10;
            const px = xMin + 0.6 + t * (xMax - xMin - 1.2);
            const py = yStart + t * (yEnd - yStart);
            return (
              <mesh key={`post-2-${hi}-${pIdx}`} position={[px, py + 0.55, hz]} castShadow>
                <cylinderGeometry args={[0.022, 0.022, 1.1, 6]} />
                <primitive object={safetyYellowMat} attach="material" />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Landing Platform at Top (+36.0m Polar Crane deck exit) */}
      <mesh position={[xMax + 0.8, yEnd - 0.02, midZ]} receiveShadow>
        <boxGeometry args={[1.6, 0.06, zMax - zMin]} />
        <primitive object={diamondPlateMat} attach="material" />
      </mesh>
      {/* Landing Safety Railings */}
      {[zMin + 0.2, zMax - 0.2].map((lz, li) => (
        <group key={`land-rail-2-${li}`} position={[xMax + 0.8, yEnd + 0.55, lz]}>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[1.6, 0.04, 0.04]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.6, 0.03, 0.03]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Subterranean Metal Staircase connecting -5.0m DCS Server Room level
 * down to -10.0m Core Catcher vault chamber entrance.
 */
function SubterraneanCoreCatcherStair() {
  const steps = 14;
  const xPos = 0;
  const zStart = -11.5;
  const zEnd = -7.5;
  const yStart = FLOOR_LEVELS.coreCatcher; // -10.0m
  const yEnd = FLOOR_LEVELS.basement;     // -5.0m
  const width = 1.8;
  const stepDepth = (zEnd - zStart) / steps;
  const stepHeight = (yEnd - yStart) / steps;
  const stairLength = Math.hypot(zEnd - zStart, yEnd - yStart);
  const inclineAngle = Math.atan2(yEnd - yStart, zEnd - zStart);
  const midZ = (zStart + zEnd) / 2;
  const midY = (yStart + yEnd) / 2;

  return (
    <group position={[xPos, 0, 0]}>
      {/* Structural Steel Channel Stringers */}
      {[-width / 2, width / 2].map((sx, si) => (
        <mesh
          key={`sub-str-${si}`}
          position={[sx, midY, midZ]}
          rotation={[-inclineAngle, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.08, 0.25, stairLength + 0.2]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      ))}

      {/* Diamond-Plate Metal Steps */}
      {Array.from({ length: steps }).map((_, i) => {
        const z = zStart + i * stepDepth + stepDepth / 2;
        const y = yStart + i * stepHeight;
        return (
          <mesh key={`sub-step-${i}`} position={[0, y + stepHeight / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[width - 0.1, 0.04, stepDepth + 0.02]} />
            <primitive object={diamondPlateMat} attach="material" />
          </mesh>
        );
      })}

      {/* Safety Yellow Handrails (#FFCC00) on both sides */}
      {[-width / 2, width / 2].map((hx, hi) => (
        <group key={`sub-hr-${hi}`}>
          <mesh
            position={[hx, midY + 1.0, midZ]}
            rotation={[-inclineAngle, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.022, 0.022, stairLength + 0.2, 8]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          <mesh
            position={[hx, midY + 0.5, midZ]}
            rotation={[-inclineAngle, 0, 0]}
          >
            <cylinderGeometry args={[0.016, 0.016, stairLength + 0.2, 8]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          {Array.from({ length: 5 }).map((_, pIdx) => {
            const t = pIdx / 4;
            const pz = zStart + 0.4 + t * (zEnd - zStart - 0.8);
            const py = yStart + t * (yEnd - yStart);
            return (
              <mesh key={`sub-post-${hi}-${pIdx}`} position={[hx, py + 0.5, pz]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 1.0, 6]} />
                <primitive object={safetyYellowMat} attach="material" />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

export default function ReactorBuilding({ containmentOpacity }: { containmentOpacity: number }) {
  return (
    <group>
      {/* Containment Inner Wall, Dome, and Cutaway Shell */}
      <ContainmentStructure opacity={containmentOpacity} />

      {/* Main Deck (+15m) with anti-slip tiles, upper deck, rail tracks, and reactor pit */}
      <DeckPlates />

      {/* Stairwells with diamond-plate treads and safety yellow handrails */}
      <SubterraneanCoreCatcherStair />
      <Stairwell1 />
      <Stairwell2 />

      {/* Polar Crane Structure in High-Visibility Safety Yellow (#FFCC00) */}
      <PolarCrane />

      {/* High-Bay Industrial Floodlights with 4500K warm-white LED tones */}
      <HighBayLightingRing />

      {/* Invisible physical collision walls enclosing floor boundaries & handrails */}
      <InvisibleCollisionWalls />
    </group>
  );
}
