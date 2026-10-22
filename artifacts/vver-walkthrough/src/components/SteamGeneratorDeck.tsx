import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reactorStateManager } from '@/scene/reactorStateManager';
import CherenkovVolumeGlow from './CherenkovVolumeGlow';
import PrimaryCoolantFlow from './PrimaryCoolantFlow';
import PressurizerSystem from './PressurizerSystem';
import ECCSAndMakeUpSystem from './ECCSAndMakeUpSystem';
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
      // Мгновенный гравитационный сброс 61 группы ШУОК СУЗ при АЗ-5 (< 2.5 с)
      const targetY = v.scramActive
        ? RPV.flangeY + 0.2
        : RPV.flangeY + 2.2 + (v.crdmPositionPercent / 100) * 0.85;
      const dropSpeed = v.scramActive ? 18.0 : 6.0;
      crdGroupRef.current.position.y = THREE.MathUtils.lerp(crdGroupRef.current.position.y, targetY, dt * dropSpeed);
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
      {/* Volumetric Cherenkov radiation glow inside RPV and active zone */}
      <CherenkovVolumeGlow
        position={[0, RPV.headTopY - 0.5, 0]}
        radius={1.65}
        height={4.6}
        intensity={1.35}
        color="#00d4ff"
      />
      {/* Верхний ярус: 4 выходных патрубка горячих ниток Ду 850 (Y = 15.2м) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const nx = Math.cos(a) * (r + 0.35);
        const nz = Math.sin(a) * (r + 0.35);
        return (
          <group key={`hot-nozzle-${i}`} position={[nx, 15.2, nz]} rotation={[0, -a, 0]}>
            <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.54, 0.58, 1.4, 20]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            {/* Утолщенный фланец и приварной воротник */}
            <mesh position={[0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.64, 0.64, 0.22, 20]} />
              <primitive object={steelMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* Нижний ярус: 4 входных патрубка холодных ниток Ду 850 (Y = 14.1м) */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const nx = Math.cos(a) * (r + 0.35);
        const nz = Math.sin(a) * (r + 0.35);
        return (
          <group key={`cold-nozzle-${i}`} position={[nx, 14.1, nz]} rotation={[0, -a, 0]}>
            <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.52, 0.56, 1.4, 20]} />
              <primitive object={darkSteelMat} attach="material" />
            </mesh>
            <mesh position={[0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.62, 0.62, 0.22, 20]} />
              <primitive object={steelMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 4 патрубка подключения САОЗ Ду 350 к шахте и опускному кольцу */}
      {[-Math.PI * 0.18, Math.PI * 0.68, Math.PI * 1.08, Math.PI * 1.58].map((ea, ei) => {
        const ey = ei % 2 === 0 ? 14.2 : 15.4;
        const ex = Math.cos(ea) * (r + 0.25);
        const ez = Math.sin(ea) * (r + 0.25);
        return (
          <group key={`eccs-nozzle-${ei}`} position={[ex, ey, ez]} rotation={[0, -ea, 0]}>
            <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.26, 0.28, 0.8, 14]} />
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

/**
 * 4 циркуляционные петли первого контура (ГЦТ Ду 850):
 * - Горячая нитка Ду 850 (Y = 15.2м) от корпуса к входному коллектору ПГВ-1000
 * - Холодная нитка Ду 850 от выходного коллектора ПГВ-1000 к ГЦЭН-195М и возврат в опускное кольцо РК (Y = 14.1м)
 * - Теплоизоляция из сегментных матов в нержавеющих кожухах
 * - Сейсмические гидроамортизаторы и пружинные подвески
 */
function LoopPipe({ index }: { index: number }) {
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  const rVesselX = Math.cos(angle) * (RPV.radius + 0.35);
  const rVesselZ = Math.sin(angle) * (RPV.radius + 0.35);
  const sgX = Math.cos(angle) * STEAM_GEN.centerRadius;
  const sgZ = Math.sin(angle) * STEAM_GEN.centerRadius;
  const pumpX = Math.cos(angle) * MCP.centerRadius;
  const pumpZ = Math.sin(angle) * MCP.centerRadius;
  const hotNozzleY = 15.2;
  const coldNozzleY = 14.1;

  const hotLeg = useMemo(() => {
    const pts = [
      new THREE.Vector3(rVesselX, hotNozzleY, rVesselZ),
      new THREE.Vector3(rVesselX * 0.5 + sgX * 0.5, hotNozzleY + 1.2, rVesselZ * 0.5 + sgZ * 0.5),
      new THREE.Vector3(sgX, STEAM_GEN.centerY + 0.2, sgZ),
    ];
    return new THREE.CatmullRomCurve3(pts);
  }, [rVesselX, rVesselZ, sgX, sgZ, hotNozzleY]);

  const coldLeg = useMemo(() => {
    const pts = [
      new THREE.Vector3(sgX, STEAM_GEN.centerY - 1.6, sgZ),
      new THREE.Vector3((sgX + pumpX) / 2, STEAM_GEN.centerY - 2.0, (sgZ + pumpZ) / 2),
      new THREE.Vector3(pumpX, MCP.centerY - 0.4, pumpZ),
      new THREE.Vector3((pumpX + rVesselX) / 2, coldNozzleY + 0.4, (pumpZ + rVesselZ) / 2),
      new THREE.Vector3(rVesselX, coldNozzleY, rVesselZ),
    ];
    return new THREE.CatmullRomCurve3(pts);
  }, [sgX, sgZ, pumpX, pumpZ, rVesselX, rVesselZ, coldNozzleY]);

  // Точки крепления сейсмических гидроамортизаторов (snubbers)
  const snubberHotPoint = useMemo(() => hotLeg.getPoint(0.5), [hotLeg]);
  const snubberColdPoint = useMemo(() => coldLeg.getPoint(0.3), [coldLeg]);

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
    <group key={`primary-loop-${index}`}>
      {/* Горячая нитка Ду 850 (внешний диаметр ~1.05м с изоляцией) */}
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[hotLeg, 32, 0.48, 16, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Холодная нитка Ду 850 */}
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[coldLeg, 36, 0.46, 16, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>

      {/* Кольца бандажей теплоизоляции на горячей нитке */}
      {[0.25, 0.5, 0.75].map((tVal, bi) => {
        const pt = hotLeg.getPoint(tVal);
        return (
          <mesh key={`hot-band-${bi}`} position={pt}>
            <cylinderGeometry args={[0.52, 0.52, 0.12, 16]} />
            <primitive object={steelMat} attach="material" />
          </mesh>
        );
      })}

      {/* Кольца бандажей теплоизоляции на холодной нитке */}
      {[0.2, 0.4, 0.6, 0.8].map((tVal, bi) => {
        const pt = coldLeg.getPoint(tVal);
        return (
          <mesh key={`cold-band-${bi}`} position={pt}>
            <cylinderGeometry args={[0.50, 0.50, 0.12, 16]} />
            <primitive object={steelMat} attach="material" />
          </mesh>
        );
      })}

      {/* Сейсмические гидроамортизаторы (гидравлические демпферы защиты при землетрясениях) */}
      <group position={snubberHotPoint}>
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 1.2, 12]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
        <mesh position={[0, -1.2, 0]}>
          <boxGeometry args={[0.4, 0.15, 0.4]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      </group>

      <group position={snubberColdPoint}>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 1.0, 12]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
        <mesh position={[0, -1.0, 0]}>
          <boxGeometry args={[0.35, 0.15, 0.35]} />
          <primitive object={darkSteelMat} attach="material" />
        </mesh>
      </group>

      {/* Внутреннее свечение потока */}
      <mesh>
        <tubeGeometry args={[hotLeg, 28, 0.18, 8, false]} />
        <meshBasicMaterial ref={flowMatRef} color="#ff3300" transparent opacity={0.5} />
      </mesh>
      <mesh>
        <tubeGeometry args={[coldLeg, 32, 0.16, 8, false]} />
        <meshBasicMaterial color="#0099ff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

export default function SteamGeneratorDeck() {
  // Точки врезки дыхательного трубопровода и впрыска компенсатора давления к петле №4 (index 2 / 225°)
  const pzHotLegPoint = useMemo(() => new THREE.Vector3(-7.8, 16.5, -7.2), []);
  const pzColdLegPoint = useMemo(() => new THREE.Vector3(-6.2, 14.8, -5.5), []);

  return (
    <group name="VVER1000_PrimaryCircuit_Deck">
      {/* Корпус реактора ВВЭР-1000 строго в геометрическом центре шахты */}
      <ReactorVessel />

      {/* 4 горизонтальных парогенератора ПГВ-1000 в фирменном покрытии Rosatom Lime-Green */}
      {[0, 1, 2, 3].map((i) => <SteamGenerator key={`sg-${i}`} index={i} />)}

      {/* 4 Главных циркуляционных насоса (ГЦЭН-195М) */}
      {[0, 1, 2, 3].map((i) => <MainCoolantPump key={`mcp-${i}`} index={i} />)}

      {/* 4 циркуляционные петли первого контура (ГЦТ Ду 850) */}
      {[0, 1, 2, 3].map((i) => <LoopPipe key={`pipe-${i}`} index={i} />)}

      {/* Физическая визуализация движения теплоносителя по петлям и активной зоне */}
      <PrimaryCoolantFlow />

      {/* Система компенсации давления: КД В-320 (79 м³), бак-барботер, ИПК, surge & spray lines */}
      <PressurizerSystem hotLegPoint={pzHotLegPoint} coldLegPoint={pzColdLegPoint} />

      {/* Система аварийного охлаждения зоны (4 гидроемкости САОЗ по 60 м³ и узел подпитки ТК) */}
      <ECCSAndMakeUpSystem />
    </group>
  );
}
