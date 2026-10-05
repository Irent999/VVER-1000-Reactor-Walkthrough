import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  RPV, STEAM_GEN, MCP, DECK, DARK_STEEL_COLOR, GREEN_METAL_COLOR, YELLOW,
} from '@/scene/constants';
import {
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

const steelMat = new THREE.MeshStandardMaterial({
  color: '#ffffff', map: brushedSteelMap, roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap, normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.28, metalness: 0.9,
});
const darkSteelMat = new THREE.MeshStandardMaterial({
  color: DARK_STEEL_COLOR, normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08), roughness: 0.4, metalness: 0.85,
});
const greenMetalMat = new THREE.MeshStandardMaterial({
  color: GREEN_METAL_COLOR, normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.1, 0.1), roughness: 0.35, metalness: 0.75,
});
const yellowMat = new THREE.MeshStandardMaterial({ color: YELLOW, roughness: 0.45, metalness: 0.5 });
const pipeMat = new THREE.MeshStandardMaterial({
  color: '#5a6c7d', normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08), roughnessMap: brushedSteelRoughnessMap,
  roughness: 0.3, metalness: 0.92,
});

/** Blue Cherenkov-like glow inside the reactor vessel top aperture */
function CherenkovGlow() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((state) => {
    if (matRef.current) {
      const t = state.clock.elapsedTime;
      matRef.current.opacity = 0.5 + Math.sin(t * 2.2) * 0.15;
    }
  });
  return (
    <mesh position={[0, RPV.headTopY + 0.5, 0]}>
      <cylinderGeometry args={[1.2, 1.2, 0.3, 20]} />
      <meshBasicMaterial ref={matRef} color="#00aaff" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ReactorVessel() {
  const studRotRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (studRotRef.current) studRotRef.current.rotation.y += dt * 0.015; });

  const r = RPV.radius;
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
        <cylinderGeometry args={[r + 0.2, r + 0.2, 1.0, 36]} />
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
              <primitive object={yellowMat} attach="material" />
            </mesh>
          );
        })}
      </group>
      {/* Inspection aperture (dark, reveals Cherenkov glow) */}
      <mesh position={[0, RPV.headTopY, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.4, 16]} />
        <meshStandardMaterial color="#0a0a12" roughness={0.2} metalness={0.1} />
      </mesh>
      <CherenkovGlow />
      {/* 4 inlet/outlet nozzles */}
      {Array.from({ length: 4 }).map((_, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const nx = Math.cos(a) * (r + 0.2);
        const nz = Math.sin(a) * (r + 0.2);
        return (
          <group key={i} position={[nx, RPV.bodyTopY - 1, nz]} rotation={[0, -a, 0]}>
            <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.6, 0.6, 2, 16]} />
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

/** Horizontal steam generator — 14m long, 4m diameter, oriented tangentially */
function SteamGenerator({ index }: { index: number }) {
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  const cx = Math.cos(angle) * STEAM_GEN.centerRadius;
  const cz = Math.sin(angle) * STEAM_GEN.centerRadius;
  const len = STEAM_GEN.length;
  const rad = STEAM_GEN.radius;

  return (
    <group position={[cx, STEAM_GEN.centerY, cz]} rotation={[0, -angle + Math.PI / 2, Math.PI / 2]}>
      {/* Horizontal cylindrical shell */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[rad, rad, len, 28]} />
        <primitive object={greenMetalMat} attach="material" />
      </mesh>
      {/* Dished ends */}
      <mesh position={[0, len / 2, 0]} castShadow>
        <sphereGeometry args={[rad, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={greenMetalMat} attach="material" />
      </mesh>
      <mesh position={[0, -len / 2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[rad, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={greenMetalMat} attach="material" />
      </mesh>
      {/* Support saddles */}
      <mesh position={[0, -len / 3, -rad - 0.5]} castShadow>
        <boxGeometry args={[rad * 2.2, 1.5, 1.5]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      <mesh position={[0, len / 3, -rad - 0.5]} castShadow>
        <boxGeometry args={[rad * 2.2, 1.5, 1.5]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Secondary steam outlet nozzle on top */}
      <mesh position={[rad - 0.3, len / 4, 0]} rotation={[0, 0, Math.PI / 2.5]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 2.5, 12]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>
      {/* Feedwater inlet nozzle on bottom */}
      <mesh position={[-rad + 0.3, -len / 4, 0]} rotation={[0, 0, -Math.PI / 2.5]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 2, 12]} />
        <primitive object={darkSteelMat} attach="material" />
      </mesh>
    </group>
  );
}

function MainCoolantPump({ index }: { index: number }) {
  const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
  const px = Math.cos(angle) * MCP.centerRadius;
  const pz = Math.sin(angle) * MCP.centerRadius;

  const rotRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (rotRef.current) rotRef.current.rotation.y += dt * 1.8; });

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
        <meshStandardMaterial color="#4a5a6a" roughness={0.35} metalness={0.85} />
      </mesh>
      {/* Cooling fins on motor */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, 1, 0]} rotation={[0, (i / 8) * Math.PI * 2, 0]}>
          <boxGeometry args={[1.6, 1.8, 0.08]} />
          <meshStandardMaterial color="#3a4a5a" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}
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
      const t = (state.clock.elapsedTime * 0.4 + index * 0.25) % 1;
      flowMatRef.current.opacity = 0.35 + Math.sin(t * Math.PI * 2) * 0.2;
    }
  });

  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[hotLeg, 28, 0.4, 12, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[coldLeg, 32, 0.35, 12, false]} />
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
      {/* Pipe insulation cladding */}
      <mesh>
        <tubeGeometry args={[hotLeg, 28, 0.48, 8, false]} />
        <meshStandardMaterial color="#9aa5b8" roughness={0.4} metalness={0.6} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function Pressurizer() {
  return (
    <group position={[-15, DECK.mainY + 3, 8]}>
      {/* Vertical surge tank */}
      <mesh castShadow>
        <cylinderGeometry args={[1.5, 1.5, 8, 24]} />
        <primitive object={greenMetalMat} attach="material" />
      </mesh>
      {/* Top dome */}
      <mesh position={[0, 4.2, 0]} castShadow>
        <sphereGeometry args={[1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={greenMetalMat} attach="material" />
      </mesh>
      {/* Bottom dome */}
      <mesh position={[0, -4.2, 0]} castShadow>
        <sphereGeometry args={[1.5, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <primitive object={greenMetalMat} attach="material" />
      </mesh>
      {/* Surge line connecting to hot leg of loop 1 */}
      <mesh position={[4, 2, -3]} rotation={[Math.PI / 2.5, 0, -Math.PI / 3]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 8, 12]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Support stand */}
      <mesh position={[0, -5, 0]} castShadow>
        <boxGeometry args={[3, 1.5, 3]} />
        <primitive object={steelMat} attach="material" />
      </mesh>
      {/* Heating elements at bottom */}
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, -3.5, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 2, 8]} />
          <meshStandardMaterial color="#cc4422" emissive="#cc4422" emissiveIntensity={0.4} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default function SteamGeneratorDeck() {
  return (
    <group>
      <ReactorVessel />
      {[0, 1, 2, 3].map((i) => <SteamGenerator key={`sg-${i}`} index={i} />)}
      {[0, 1, 2, 3].map((i) => <MainCoolantPump key={`mcp-${i}`} index={i} />)}
      {[0, 1, 2, 3].map((i) => <LoopPipe key={`pipe-${i}`} index={i} />)}
      <Pressurizer />
    </group>
  );
}
