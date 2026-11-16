import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  InteractiveMCRButton,
  InteractiveSwitchKey,
  DynamicCanvasMonitorMesh,
} from '@/components/InteractiveMCRComponents';

// Статичные PBR-материалы для интерьера БЩУ и компьютерных стоек внутри здания assembly.glb
const consoleBodyMat = new THREE.MeshStandardMaterial({
  color: '#323a45',
  roughness: 0.45,
  metalness: 0.42,
});

const consoleTopMat = new THREE.MeshStandardMaterial({
  color: '#1f2630',
  roughness: 0.36,
  metalness: 0.28,
});

const stainlessTrimMat = new THREE.MeshStandardMaterial({
  color: '#c4ccd4',
  roughness: 0.35,
  metalness: 0.75,
});

const rackChassisMat = new THREE.MeshStandardMaterial({
  color: '#282f38',
  roughness: 0.42,
  metalness: 0.72,
});

const rackServerBladeMat = new THREE.MeshStandardMaterial({
  color: '#3b424c',
  roughness: 0.38,
  metalness: 0.65,
});

const rackGlassDoorMat = new THREE.MeshStandardMaterial({
  color: '#9fb8cc',
  transparent: true,
  opacity: 0.26,
  roughness: 0.15,
  metalness: 0.1,
  depthWrite: false,
});

const cableTrayMat = new THREE.MeshStandardMaterial({
  color: '#7c858f',
  roughness: 0.5,
  metalness: 0.55,
});

const blueCableMat = new THREE.MeshStandardMaterial({
  color: '#2b5b84',
  roughness: 0.4,
  metalness: 0.35,
});

const yellowCableMat = new THREE.MeshStandardMaterial({
  color: '#f0a500',
  roughness: 0.4,
  metalness: 0.3,
});

const chairFabricMat = new THREE.MeshStandardMaterial({
  color: '#1d242e',
  roughness: 0.65,
  metalness: 0.1,
});

const floorMatMat = new THREE.MeshStandardMaterial({
  color: '#46505c',
  roughness: 0.75,
  metalness: 0.1,
});

function RackStatusLED({
  position,
  color,
  phase = 0,
}: {
  position: [number, number, number];
  color: '#22d3ee' | '#34d399' | '#f59e0b';
  phase?: number;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (matRef.current) {
      const wave = Math.sin(state.clock.elapsedTime * 3.0 + phase);
      matRef.current.emissiveIntensity = wave > -0.2 ? 1.4 : 0.2;
    }
  });

  return (
    <mesh position={position}>
      <boxGeometry args={[0.04, 0.025, 0.02]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        emissiveIntensity={1.0}
      />
    </mesh>
  );
}

function ServerRackUnit({
  position,
  rotation = [0, 0, 0],
  phaseOffset = 0,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  phaseOffset?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Основной 19" металлический шкаф АСУ ТП */}
      <mesh position={[0, 1.05, 0]} material={rackChassisMat}>
        <boxGeometry args={[0.78, 2.1, 0.88]} />
      </mesh>
      {/* Стальная рамка */}
      <mesh position={[0, 2.12, 0]} material={stainlessTrimMat}>
        <boxGeometry args={[0.8, 0.04, 0.9]} />
      </mesh>
      {/* Серверные юниты спереди */}
      {[0.38, 0.68, 0.98, 1.28, 1.58, 1.84].map((ry, idx) => (
        <group key={ry} position={[0, ry, 0.445]}>
          <mesh material={rackServerBladeMat}>
            <boxGeometry args={[0.64, 0.18, 0.03]} />
          </mesh>
          <RackStatusLED
            position={[-0.22, 0.03, 0.02]}
            color={idx % 3 === 0 ? '#34d399' : idx % 3 === 1 ? '#22d3ee' : '#f59e0b'}
            phase={phaseOffset + idx * 0.9}
          />
          <RackStatusLED
            position={[-0.14, 0.03, 0.02]}
            color="#34d399"
            phase={phaseOffset + idx * 1.4}
          />
        </group>
      ))}
      {/* Прозрачная передняя дверца шкафа */}
      <mesh position={[0, 1.05, 0.47]} material={rackGlassDoorMat}>
        <boxGeometry args={[0.72, 1.98, 0.015]} />
      </mesh>
    </group>
  );
}

function OperatorChair({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Крестовина */}
      <mesh position={[0, 0.08, 0]} material={stainlessTrimMat}>
        <cylinderGeometry args={[0.28, 0.32, 0.06, 8]} />
      </mesh>
      {/* Стойка */}
      <mesh position={[0, 0.28, 0]} material={stainlessTrimMat}>
        <cylinderGeometry args={[0.04, 0.04, 0.38, 8]} />
      </mesh>
      {/* Сиденье */}
      <mesh position={[0, 0.48, 0]} material={chairFabricMat}>
        <boxGeometry args={[0.52, 0.1, 0.5]} />
      </mesh>
      {/* Спинка */}
      <mesh position={[0, 0.82, 0.22]} rotation={[-0.1, 0, 0]} material={chairFabricMat}>
        <boxGeometry args={[0.48, 0.62, 0.09]} />
      </mesh>
    </group>
  );
}

export interface CadInteriorBSHUProps {
  position?: [number, number, number];
}

/**
 * Детализированный интерьер БЩУ (Блочного щита управления) и серверных стоек АСУ ТП,
 * размещённый строго внутри готового помещения CAD-сборки assembly.glb.
 * Не добавляет никаких внешних зданий, крыш или стен.
 */
export default function CadInteriorBSHU({
  position = [36.15, 0.65, -73.5],
}: CadInteriorBSHUProps) {
  return (
    <group position={position} name="CAD_Internal_BSHU_And_Racks">
      {/* Мягкое внутреннее освещение помещения БЩУ */}
      <pointLight position={[0, 3.6, 0]} intensity={3.2} distance={28} decay={1.4} color="#eef6ff" />

      {/* Компактный антистатический пол зоны БЩУ (9.0 x 10.0 м, внутри зала 24.3 x 45.9 м) */}
      <mesh position={[0, 0.015, 0]} material={floorMatMat} receiveShadow>
        <boxGeometry args={[9.0, 0.03, 10.0]} />
      </mesh>

      {/* 1. ПАНОРАМНАЯ ВИДЕОСТЕНА И МОНИТОРЫ ОПЕРАТОРОВ (северная сторона зала) */}
      <group position={[0, 0, -2.85]}>
        {/* Несущая рама видеостены (высота 2.75 м — полностью под потолком 5.55 м и ниже линии среза) */}
        <mesh position={[0, 1.38, -0.14]} material={consoleBodyMat}>
          <boxGeometry args={[4.8, 2.45, 0.16]} />
        </mesh>
        <mesh position={[0, 2.63, -0.14]} material={stainlessTrimMat}>
          <boxGeometry args={[4.9, 0.06, 0.2]} />
        </mesh>

        {/* Главный панорамный экран мнемосхемы ВВЭР */}
        <DynamicCanvasMonitorMesh
          width={2.35}
          height={1.15}
          reactorId="vver1000"
          position={[0, 1.62, 0]}
        />

        {/* Левый и правый боковые дисплеи АСУ ТП */}
        <DynamicCanvasMonitorMesh
          width={1.08}
          height={0.86}
          reactorId="vver1000"
          position={[-1.78, 1.56, 0.1]}
          rotation={[0, 0.22, 0]}
        />
        <DynamicCanvasMonitorMesh
          width={1.08}
          height={0.86}
          reactorId="vver1000"
          position={[1.78, 1.56, 0.1]}
          rotation={[0, -0.22, 0]}
        />
      </group>

      {/* 2. ЦЕНТРАЛЬНЫЙ ПУЛЬТ БЩУ (ВИУР + ВИУТ) */}
      <group position={[0, 0, -0.85]}>
        {/* Центральная секция пульта */}
        <mesh position={[0, 0.44, 0]} material={consoleBodyMat}>
          <boxGeometry args={[2.3, 0.88, 0.95]} />
        </mesh>
        <mesh position={[0, 0.91, 0.04]} rotation={[0.2, 0, 0]} material={consoleTopMat}>
          <boxGeometry args={[2.34, 0.08, 0.98]} />
        </mesh>

        {/* Левое и правое крыло П-образного пульта */}
        <group position={[-1.55, 0, 0.34]} rotation={[0, 0.44, 0]}>
          <mesh position={[0, 0.44, 0]} material={consoleBodyMat}>
            <boxGeometry args={[1.25, 0.88, 0.92]} />
          </mesh>
          <mesh position={[0, 0.91, 0.04]} rotation={[0.2, 0, 0]} material={consoleTopMat}>
            <boxGeometry args={[1.28, 0.08, 0.95]} />
          </mesh>
          <DynamicCanvasMonitorMesh
            width={0.52}
            height={0.34}
            reactorId="vver1000"
            position={[-0.28, 1.2, -0.24]}
            rotation={[-0.12, 0, 0]}
          />
          <DynamicCanvasMonitorMesh
            width={0.52}
            height={0.34}
            reactorId="vver1000"
            position={[0.28, 1.2, -0.24]}
            rotation={[-0.12, 0, 0]}
          />
        </group>

        <group position={[1.55, 0, 0.34]} rotation={[0, -0.44, 0]}>
          <mesh position={[0, 0.44, 0]} material={consoleBodyMat}>
            <boxGeometry args={[1.25, 0.88, 0.92]} />
          </mesh>
          <mesh position={[0, 0.91, 0.04]} rotation={[0.2, 0, 0]} material={consoleTopMat}>
            <boxGeometry args={[1.28, 0.08, 0.95]} />
          </mesh>
          <DynamicCanvasMonitorMesh
            width={0.52}
            height={0.34}
            reactorId="vver1000"
            position={[-0.28, 1.2, -0.24]}
            rotation={[-0.12, 0, 0]}
          />
          <DynamicCanvasMonitorMesh
            width={0.52}
            height={0.34}
            reactorId="vver1000"
            position={[0.28, 1.2, -0.24]}
            rotation={[-0.12, 0, 0]}
          />
        </group>

        {/* Настольные мониторы на центральной консоли */}
        <DynamicCanvasMonitorMesh
          width={0.62}
          height={0.38}
          reactorId="vver1000"
          position={[-0.72, 1.2, -0.24]}
          rotation={[-0.12, 0.08, 0]}
        />
        <DynamicCanvasMonitorMesh
          width={0.62}
          height={0.38}
          reactorId="vver1000"
          position={[0.0, 1.2, -0.26]}
          rotation={[-0.12, 0, 0]}
        />
        <DynamicCanvasMonitorMesh
          width={0.62}
          height={0.38}
          reactorId="vver1000"
          position={[0.72, 1.2, -0.24]}
          rotation={[-0.12, -0.08, 0]}
        />

        {/* Интерактивные органы управления на пульте БЩУ */}
        <InteractiveMCRButton
          label="АЗ-5"
          isScram
          reactorId="vver1000"
          action="SCRAM_TRIP"
          position={[0, 0.97, 0.22]}
          rotation={[0.2, 0, 0]}
          scale={1.0}
        />
        <InteractiveSwitchKey
          label="СУЗ"
          reactorId="vver1000"
          position={[-0.44, 0.97, 0.21]}
          rotation={[0.2, 0, 0]}
        />
        <InteractiveMCRButton
          label="ГЦН 1-4"
          color="#22d3ee"
          reactorId="vver1000"
          action="TOGGLE_ALL_MCPS"
          position={[0.44, 0.97, 0.21]}
          rotation={[0.2, 0, 0]}
        />
        <InteractiveMCRButton
          label="ВЗВОД"
          color="#34d399"
          reactorId="vver1000"
          action="RESET_SCRAM"
          position={[-0.88, 0.97, 0.21]}
          rotation={[0.2, 0, 0]}
        />

        {/* Кресла операторов перед пультом */}
        <OperatorChair position={[-1.05, 0, 0.98]} />
        <OperatorChair position={[0, 0, 0.95]} />
        <OperatorChair position={[1.05, 0, 0.98]} />
      </group>

      {/* 3. КОМПЬЮТЕРНЫЕ И СЕРВЕРНЫЕ СТОЙКИ АСУ ТП (вдоль левой и правой стен помещения) */}
      <group name="CAD_BSHU_ServerRacks_Left">
        {[-1.55, -0.45, 0.65, 1.75].map((rz, i) => (
          <ServerRackUnit
            key={`rack-l-${rz}`}
            position={[-2.62, 0.02, rz]}
            rotation={[0, Math.PI / 2, 0]}
            phaseOffset={i * 0.7}
          />
        ))}
        <mesh position={[-2.62, 2.32, 0.1]} material={cableTrayMat}>
          <boxGeometry args={[0.46, 0.08, 4.3]} />
        </mesh>
        <mesh position={[-2.52, 2.37, 0.1]} material={blueCableMat}>
          <boxGeometry args={[0.12, 0.05, 4.25]} />
        </mesh>
        <mesh position={[-2.72, 2.37, 0.1]} material={yellowCableMat}>
          <boxGeometry args={[0.1, 0.05, 4.25]} />
        </mesh>
      </group>

      <group name="CAD_BSHU_ServerRacks_Right">
        {[-1.55, -0.45, 0.65, 1.75].map((rz, i) => (
          <ServerRackUnit
            key={`rack-r-${rz}`}
            position={[2.62, 0.02, rz]}
            rotation={[0, -Math.PI / 2, 0]}
            phaseOffset={i * 0.9 + 2.0}
          />
        ))}
        <mesh position={[2.62, 2.32, 0.1]} material={cableTrayMat}>
          <boxGeometry args={[0.46, 0.08, 4.3]} />
        </mesh>
        <mesh position={[2.52, 2.37, 0.1]} material={blueCableMat}>
          <boxGeometry args={[0.12, 0.05, 4.25]} />
        </mesh>
        <mesh position={[2.72, 2.37, 0.1]} material={yellowCableMat}>
          <boxGeometry args={[0.1, 0.05, 4.25]} />
        </mesh>
      </group>
    </group>
  );
}
