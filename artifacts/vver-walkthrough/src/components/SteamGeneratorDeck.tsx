import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reactorStateManager } from '@/scene/reactorStateManager';
import {
  RPV, STEAM_GEN, MCP, DECK, DARK_STEEL_COLOR, ROSATOM_LIME_GREEN, SAFETY_YELLOW, ECCS_TANKS,
} from '@/scene/constants';
import {
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
  diamondPlateMap, diamondPlateNormalMap, diamondPlateRoughnessMap,
} from '@/scene/pbrTextures';

// Distinct Rosatom safety lime-green / yellow-green glossy finish (Novovoronezh NPP reference standard)
const rosatomLimeGreenMat = new THREE.MeshStandardMaterial({
  color: ROSATOM_LIME_GREEN, // '#8DB600'
  roughness: 0.3,
  metalness: 0.3,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.04, 0.04),
});

const steelMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.28,
  metalness: 0.9,
});

const darkSteelMat = new THREE.MeshStandardMaterial({
  color: DARK_STEEL_COLOR,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughness: 0.4,
  metalness: 0.85,
});

const safetyYellowMat = new THREE.MeshStandardMaterial({
  color: SAFETY_YELLOW, // '#FFCC00'
  roughness: 0.35,
  metalness: 0.25,
  emissive: '#261e00',
  emissiveIntensity: 0.05,
});

const diamondWalkwayMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: diamondPlateMap,
  normalMap: diamondPlateNormalMap,
  roughnessMap: diamondPlateRoughnessMap,
  roughness: 0.4,
  metalness: 0.75,
});

const pipeMat = new THREE.MeshStandardMaterial({
  color: '#657382',
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughnessMap: brushedSteelRoughnessMap,
  roughness: 0.3,
  metalness: 0.88,
});

/** Blue Cherenkov-like glow inside the reactor vessel top aperture */
function CherenkovGlow() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (matRef.current) {
      const v = reactorStateManager.vverState;
      const t = state.clock.elapsedTime;
      const normP = v.powerPercent / 100;
      if (v.scramActive || normP < 0.05) {
        // Затухающее остаточное тепловыделение после сброса АЗ-5
        matRef.current.color.set('#441111');
        matRef.current.opacity = 0.2;
      } else {
        // Яркое васильковое Черенковское свечение
        matRef.current.color.set('#00b4ff');
        matRef.current.opacity = (0.4 + Math.sin(t * 2.5) * 0.15) * (0.3 + normP * 0.7);
      }
    }
  });
  return (
    <mesh position={[0, RPV.headTopY + 0.5, 0]}>
      <cylinderGeometry args={[1.2, 1.2, 0.3, 20]} />
      <meshBasicMaterial ref={matRef} color="#00aaff" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Reactor Pressure Vessel (12m high, 4.5m diameter) */
function ReactorVessel() {
  const studRotRef = useRef<THREE.Group>(null);
  const crdGroupRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    if (studRotRef.current) studRotRef.current.rotation.y += dt * 0.015;
    if (crdGroupRef.current) {
      const v = reactorStateManager.vverState;
      // Вертикальное перемещение 61 группы приводов СУЗ над активной зоной
      const targetY = RPV.flangeY + 2.2 + (v.crdmPositionPercent / 100) * 0.85;
      crdGroupRef.current.position.y = THREE.MathUtils.lerp(crdGroupRef.current.position.y, targetY, dt * 6.0);
    }
  });

  const r = RPV.radius;

  // 61 группа ШУОК СУЗ (Шаговые электромагнитные приводы в гексагональном порядке 1 + 6 + 12 + 18 + 24 = 61)
  const crdPositions = useMemo(() => {
    const coords: [number, number][] = [[0, 0]];
    const rings = [6, 12, 18, 24];
    const ringRadii = [0.45, 0.85, 1.25, 1.65];
    rings.forEach((count, rIdx) => {
      const radius = ringRadii[rIdx];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + (rIdx % 2 ? Math.PI / count : 0);
        coords.push([Math.cos(a) * radius, Math.sin(a) * radius]);
      }
    });
    return coords.slice(0, 61);
  }, []);

  return (
    <group>
      {/* RPV cylindrical body — 12m tall, 4.5m diameter, sitting on the main deck */}
      <mesh position={[0, (RPV.bodyBottomY + RPV.bodyTopY) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r + 0.1, RPV.bodyHeight, 36]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* RPV bottom hemispherical head */}
      <mesh position={[0, RPV.bodyBottomY, 0]} castShadow>
        <sphereGeometry args={[r + 0.1, 36, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Top flange ring */}
      <mesh position={[0, RPV.flangeY, 0]} castShadow>
        <cylinderGeometry args={[r + 0.25, r + 0.25, 1.0, 36]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>
      {/* Top hemispherical head */}
      <mesh position={[0, RPV.flangeY, 0]} castShadow>
        <sphereGeometry args={[r, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Closure studs around flange */}
      <group ref={studRotRef} position={[0, RPV.flangeY, 0]}>
        {Array.from({ length: 32 }).map((_, i) => {
          const a = (i / 32) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * (r + 0.25), 0.5, Math.sin(a) * (r + 0.25)]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 1.5, 8]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          );
        })}
      </group>

      {/* 61 группа приводов СУЗ ШУОК с динамическим вертикальным перемещением */}
      <group ref={crdGroupRef} position={[0, RPV.flangeY + 2.2, 0]}>
        {crdPositions.map(([cx, cz], i) => (
          <mesh key={`crd-shuok-${i}`} position={[cx, 0, cz]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 2.2, 8]} />
            <primitive object={i === 0 ? safetyYellowMat : darkSteelMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Central inspection aperture with Cherenkov glow */}
      <mesh position={[0, RPV.headTopY, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.4, 16]} />
        <meshStandardMaterial color="#0a0a12" roughness={0.2} metalness={0.1} />
      </mesh>
      <CherenkovGlow />
      {/* 4 inlet/outlet main coolant nozzles */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const nx = Math.cos(a) * (r + 0.2);
        const nz = Math.sin(a) * (r + 0.2);
        return (
          <group key={i} position={[nx, RPV.bodyTopY - 1, nz]} rotation={[0, -a, 0]}>
            <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.65, 0.65, 2.2, 16]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
          </group>
        );
      })}
      {/* RPV support skirt */}
      <mesh position={[0, RPV.bodyBottomY - 0.5, 0]} castShadow>
        <cylinderGeometry args={[r + 0.3, r + 0.5, 1, 36, 1, true]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>
    </group>
  );
}

/** Horizontal Steam Generator (PGV-1000) — in distinct Rosatom lime-green glossy finish (#8DB600) */
function SteamGenerator({ index }: { index: number }) {
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  const cx = Math.cos(angle) * STEAM_GEN.centerRadius;
  const cz = Math.sin(angle) * STEAM_GEN.centerRadius;
  const len = STEAM_GEN.length;
  const rad = STEAM_GEN.radius;

  return (
    <group position={[cx, STEAM_GEN.centerY, cz]} rotation={[0, -angle + Math.PI / 2, Math.PI / 2]}>
      {/* Horizontal cylindrical shell in Rosatom safety lime-green (#8DB600) */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[rad, rad, len, 32]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      {/* Dished ends in Rosatom safety lime-green */}
      <mesh position={[0, len / 2, 0]} castShadow>
        <sphereGeometry args={[rad, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      <mesh position={[0, -len / 2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[rad, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      {/* Steel reinforcement girth rings */}
      {[-3, 0, 3].map((yOffset) => (
        <mesh key={yOffset} position={[0, yOffset, 0]}>
          <torusGeometry args={[rad + 0.04, 0.08, 8, 32]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      ))}
      {/* Heavy support saddles */}
      <mesh position={[0, -len / 3, -rad - 0.5]} castShadow>
        <boxGeometry args={[rad * 2.2, 1.5, 1.5]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      <mesh position={[0, len / 3, -rad - 0.5]} castShadow>
        <boxGeometry args={[rad * 2.2, 1.5, 1.5]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Steam collector manifold on top */}
      <mesh position={[rad - 0.2, len / 4, 0]} rotation={[0, 0, Math.PI / 2.5]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 2.5, 16]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Steam relief safety valve cluster */}
      <mesh position={[rad + 1.2, len / 4, 0]} rotation={[0, 0, Math.PI / 2.5]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 12]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      {/* Feedwater inlet nozzle on bottom */}
      <mesh position={[-rad + 0.2, -len / 4, 0]} rotation={[0, 0, -Math.PI / 2.5]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 2, 14]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Service inspection catwalk alongside steam generator */}
      <mesh position={[0, 0, rad + 0.6]} rotation={[0, 0, -Math.PI / 2]}>
        <boxGeometry args={[len * 0.85, 0.08, 0.9]} />
        <primitive object={diamondWalkwayMat} attach="material" />
      </mesh>
      {/* Catwalk yellow safety railing */}
      <mesh position={[0, 0, rad + 1.1]} rotation={[0, 0, -Math.PI / 2]}>
        <boxGeometry args={[len * 0.85, 0.04, 0.04]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Emergency Core Cooling Tanks (ЕО САОЗ - Емкости САОЗ / ECCS Hydroaccumulators)
 * 4 high-pressure vertical tanks situated in compartments on the main deck,
 * finished in distinct Rosatom safety lime-green (#8DB600) with metallic reflections (0.3) and roughness (0.3).
 */
// Калиброванные радиальные углы размещения 4 гидроемкостей САОЗ
// с гарантированным технологическим зазором > 1.0м от лестничных маршей и перегородок
const ECCS_SAFE_ANGLES = [
  -Math.PI * 0.18, // Емкость САОЗ №1: вынесена к наружной стене контайнмента южнее шахты лестницы №1
  Math.PI * 0.68,  // Емкость САОЗ №2: вынесена к стене западнее шахты лестницы №2
  Math.PI * 1.08,  // Емкость САОЗ №3: западный технологический отсек
  Math.PI * 1.58,  // Емкость САОЗ №4: южный технологический отсек
];

function ECCSTank({ index }: { index: number }) {
  const angle = ECCS_SAFE_ANGLES[index % 4];
  const tx = Math.cos(angle) * ECCS_TANKS.centerRadius;
  const tz = Math.sin(angle) * ECCS_TANKS.centerRadius;
  const rad = ECCS_TANKS.radius;
  const h = ECCS_TANKS.height;
  const y = ECCS_TANKS.y;

  return (
    <group position={[tx, y, tz]}>
      {/* Main vertical cylindrical pressure vessel in Rosatom lime-green (#8DB600) */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[rad, rad, h, 28]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      {/* Top hemispherical dome in Rosatom lime-green */}
      <mesh position={[0, h / 2, 0]} castShadow>
        <sphereGeometry args={[rad, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      {/* Bottom hemispherical head in Rosatom lime-green */}
      <mesh position={[0, -h / 2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[rad, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      {/* Structural support skirt anchoring to +15m deck */}
      <mesh position={[0, -h / 2 - 1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[rad + 0.15, rad + 0.35, 2.4, 28, 1, true]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>
      {/* Top nitrogen pressurization nozzle & safety valve */}
      <mesh position={[0, h / 2 + rad + 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.8, 12]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      <mesh position={[0, h / 2 + rad + 0.9, 0]} castShadow>
        <boxGeometry args={[0.35, 0.45, 0.35]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      {/* Bottom emergency injection discharge pipe leading to RPV downcomer */}
      <mesh position={[0, -h / 2 - rad - 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 1.2, 16]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Level measurement sight glass / instrumentation column */}
      <mesh position={[rad + 0.25, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, h * 0.75, 8]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Tank inspection ladder with safety cage */}
      <group position={[-rad - 0.25, 0, 0]}>
        <mesh position={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.03, 0.03, h, 6]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
        <mesh position={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.03, 0.03, h, 6]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
        {Array.from({ length: 16 }).map((_, rIdx) => (
          <mesh key={rIdx} position={[0, -h / 2 + 0.4 + rIdx * 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        ))}
      </group>
      {/* Access platform around tank top */}
      <mesh position={[0, h / 2 - 0.2, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[rad + 0.1, rad + 0.9, 24]} />
        <primitive object={diamondWalkwayMat} attach="material" side={THREE.DoubleSide} />
      </mesh>
      {/* Platform yellow guardrail */}
      {Array.from({ length: 16 }).map((_, pIdx) => {
        const pa = (pIdx / 16) * Math.PI * 2;
        const pr = rad + 0.9;
        return (
          <mesh key={`post-${pIdx}`} position={[Math.cos(pa) * pr, h / 2 + 0.4, Math.sin(pa) * pr]}>
            <cylinderGeometry args={[0.025, 0.025, 1.1, 6]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        );
      })}
      <mesh position={[0, h / 2 + 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[rad + 0.9, 0.03, 6, 24]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
    </group>
  );
}

function MainCoolantPump({ index }: { index: number }) {
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  const px = Math.cos(angle) * MCP.centerRadius;
  const pz = Math.sin(angle) * MCP.centerRadius;

  const rotRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const v = reactorStateManager.vverState;
    const rpm = v.pumpRPM[index];
    if (rotRef.current && rpm > 10) {
      rotRef.current.rotation.y += dt * (rpm / 1500) * 3.5;
    }
  });

  return (
    <group position={[px, MCP.centerY, pz]} rotation={[0, -angle, 0]}>
      {/* Pump casing */}
      <mesh position={[0, -1, 0]} castShadow>
        <cylinderGeometry args={[MCP.radius, MCP.radius + 0.2, 2, 20]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>
      {/* Motor housing */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.7, 2.5, 16]} />
        <meshStandardMaterial color="#3a4855" roughness={0.35} metalness={0.85} />
      </mesh>
      {/* Motor cooling fins */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, 1, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
          <boxGeometry args={[1.6, 1.8, 0.08]} />
          <meshStandardMaterial color="#2d3844" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
      {/* Safety yellow coupling shroud */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.82, 0.82, 0.4, 16]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>
      {/* Rotating indicator */}
      <mesh ref={rotRef} position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Support base */}
      <mesh position={[0, -2.3, 0]} castShadow>
        <boxGeometry args={[2, 0.6, 2]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>
    </group>
  );
}

function LoopPipe({ index }: { index: number }) {
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  const rVesselX = Math.cos(angle) * (RPV.radius + 0.5);
  const rVesselZ = Math.sin(angle) * (RPV.radius + 0.5);
  const sgX = Math.cos(angle) * STEAM_GEN.centerRadius;
  const sgZ = Math.sin(angle) * STEAM_GEN.centerRadius;
  const pumpX = Math.cos(angle) * MCP.centerRadius;
  const pumpZ = Math.sin(angle) * MCP.centerRadius;
  const nozzleY = RPV.bodyTopY - 1;

  const hotLeg = useMemo(() => {
    const pts = [
      new THREE.Vector3(rVesselX, nozzleY, rVesselZ),
      new THREE.Vector3((rVesselX + sgX) / 2, nozzleY + 2, (rVesselZ + sgZ) / 2),
      new THREE.Vector3(sgX, STEAM_GEN.centerY, sgZ),
    ];
    return new THREE.CatmullRomCurve3(pts);
  }, [rVesselX, rVesselZ, sgX, sgZ, nozzleY]);

  const coldLeg = useMemo(() => {
    const pts = [
      new THREE.Vector3(sgX, STEAM_GEN.centerY - 2, sgZ),
      new THREE.Vector3((sgX + pumpX) / 2, STEAM_GEN.centerY - 3, (sgZ + pumpZ) / 2),
      new THREE.Vector3(pumpX, MCP.centerY + 1, pumpZ),
      new THREE.Vector3((pumpX + rVesselX) / 2, nozzleY - 2, (pumpZ + rVesselZ) / 2),
      new THREE.Vector3(rVesselX, nozzleY, rVesselZ),
    ];
    return new THREE.CatmullRomCurve3(pts);
  }, [sgX, sgZ, pumpX, pumpZ, rVesselX, rVesselZ, nozzleY]);

  const flowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (flowMatRef.current) {
      const v = reactorStateManager.vverState;
      const rpm = v.pumpRPM[index];
      const isRunning = v.pumps[index] && rpm > 50;
      if (isRunning) {
        const speed = (rpm / 1500) * 1.6;
        const t = (state.clock.elapsedTime * speed + index * 0.25) % 1;
        flowMatRef.current.opacity = 0.35 + Math.sin(t * Math.PI * 2) * 0.25;
      } else {
        flowMatRef.current.opacity = 0.08;
      }
    }
  });

  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[hotLeg, 28, 0.42, 12, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[coldLeg, 32, 0.38, 12, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Inner pulsing glow — primary coolant flow */}
      <mesh>
        <tubeGeometry args={[hotLeg, 28, 0.18, 8, false]} />
        <meshBasicMaterial ref={flowMatRef} color="#ff5500" transparent opacity={0.5} />
      </mesh>
      <mesh>
        <tubeGeometry args={[coldLeg, 32, 0.15, 8, false]} />
        <meshBasicMaterial color="#ff7744" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function Pressurizer() {
  return (
    <group position={[-15, DECK.mainY + 3, 8]}>
      {/* Vertical surge tank in Rosatom safety lime-green finish */}
      <mesh castShadow>
        <cylinderGeometry args={[1.5, 1.5, 8, 24]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      {/* Top dome */}
      <mesh position={[0, 4.2, 0]} castShadow>
        <sphereGeometry args={[1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      {/* Bottom dome */}
      <mesh position={[0, -4.2, 0]} castShadow>
        <sphereGeometry args={[1.5, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <primitive object={rosatomLimeGreenMat} attach="material" />
      </mesh>
      {/* Surge line connecting to hot leg */}
      <mesh position={[4, 2, -3]} rotation={[Math.PI / 2.5, 0, -Math.PI / 3]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 8, 12]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Support stand */}
      <mesh position={[0, -5, 0]} castShadow>
        <boxGeometry args={[3, 1.5, 3]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
    </group>
  );
}

export default function SteamGeneratorDeck() {
  return (
    <group>
      <ReactorVessel />
      {/* 4 Horizontal Steam Generators (PGV-1000) in Rosatom lime-green */}
      {[0, 1, 2, 3].map((i) => <SteamGenerator key={`sg-${i}`} index={i} />)}
      {/* 4 Emergency Core Cooling Tanks (ЕО САОЗ / ECCS Hydroaccumulators) in Rosatom lime-green */}
      {[0, 1, 2, 3].map((i) => <ECCSTank key={`eccs-${i}`} index={i} />)}
      {/* 4 Main Coolant Pumps */}
      {[0, 1, 2, 3].map((i) => <MainCoolantPump key={`mcp-${i}`} index={i} />)}
      {/* 4 Primary Coolant Loops */}
      {[0, 1, 2, 3].map((i) => <LoopPipe key={`pipe-${i}`} index={i} />)}
      <Pressurizer />
    </group>
  );
}
