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
  position = [-18.0, 0.14, 12.2],
}: CadInteriorBSHUProps) {
  return (
    <group position={position} name="CAD_Internal_BSHU_And_Racks">
      {/* Мягкое внутреннее освещение помещения БЩУ */}
      <pointLight position={[0, 3.1, 0]} intensity={2.0} distance={18} decay={1.6} color="#e8f3ff" />

      {/* Локальный антистатический ковёр/зона под пультами (без перекрытия пола сборки) */}
      <mesh position={[0, 0.015, 0]} material={floorMatMat} receiveShadow>
        <boxGeometry args={[12.4, 0.03, 5.0]} />
      </mesh>

      {/* 1. ПАНОРАМНАЯ ВИДЕОСТЕНА И МОНИТОРЫ ОПЕРАТОРОВ (внутри помещения у северной стены зала) */}
      <group position={[0, 0, -2.0]}>
        {/* Несущая рама видеостены */}
        <mesh position={[0, 1.55, -0.14]} material={consoleBodyMat}>
          <boxGeometry args={[7.4, 2.7, 0.18]} />
        </mesh>
        <mesh position={[0, 2.94, -0.14]} material={stainlessTrimMat}>
          <boxGeometry args={[7.5, 0.06, 0.22]} />
        </mesh>

        {/* Главный панорамный экран мнемосхемы ВВЭР */}
        <DynamicCanvasMonitorMesh
          width={3.6}
          height={1.45}
          reactorId="vver1000"
          position={[0, 1.82, 0]}
        />

        {/* Левый и правый боковые дисплеи АСУ ТП */}
        <DynamicCanvasMonitorMesh
          width={1.55}
          height={1.15}
          reactorId="vver1000"
          position={[-2.75, 1.75, 0.12]}
          rotation={[0, 0.22, 0]}
        />
        <DynamicCanvasMonitorMesh
          width={1.55}
          height={1.15}
          reactorId="vver1000"
          position={[2.75, 1.75, 0.12]}
          rotation={[0, -0.22, 0]}
        />
      </group>

      {/* 2. ЦЕНТРАЛЬНЫЙ ПУЛЬТ БЩУ (ВИУР + ВИУТ) */}
      <group position={[0, 0, -0.2]}>
        {/* Центральная секция пульта */}
        <mesh position={[0, 0.44, 0]} material={consoleBodyMat}>
          <boxGeometry args={[3.4, 0.88, 1.05]} />
        </mesh>
        <mesh position={[0, 0.91, 0.04]} rotation={[0.2, 0, 0]} material={consoleTopMat}>
          <boxGeometry args={[3.44, 0.08, 1.08]} />
        </mesh>

        {/* Левое и правое крыло П-образного пульта */}
        <group position={[-2.35, 0, 0.45]} rotation={[0, 0.42, 0]}>
          <mesh position={[0, 0.44, 0]} material={consoleBodyMat}>
            <boxGeometry args={[1.9, 0.88, 1.02]} />
          </mesh>
          <mesh position={[0, 0.91, 0.04]} rotation={[0.2, 0, 0]} material={consoleTopMat}>
            <boxGeometry args={[1.94, 0.08, 1.05]} />
          </mesh>
          <DynamicCanvasMonitorMesh
            width={0.72}
            height={0.42}
            reactorId="vver1000"
            position={[-0.38, 1.24, -0.28]}
            rotation={[-0.12, 0, 0]}
          />
          <DynamicCanvasMonitorMesh
            width={0.72}
            height={0.42}
            reactorId="vver1000"
            position={[0.42, 1.24, -0.28]}
            rotation={[-0.12, 0, 0]}
          />
        </group>

        <group position={[2.35, 0, 0.45]} rotation={[0, -0.42, 0]}>
          <mesh position={[0, 0.44, 0]} material={consoleBodyMat}>
            <boxGeometry args={[1.9, 0.88, 1.02]} />
          </mesh>
          <mesh position={[0, 0.91, 0.04]} rotation={[0.2, 0, 0]} material={consoleTopMat}>
            <boxGeometry args={[1.94, 0.08, 1.05]} />
          </mesh>
          <DynamicCanvasMonitorMesh
            width={0.72}
            height={0.42}
            reactorId="vver1000"
            position={[-0.42, 1.24, -0.28]}
            rotation={[-0.12, 0, 0]}
          />
          <DynamicCanvasMonitorMesh
            width={0.72}
            height={0.42}
            reactorId="vver1000"
            position={[0.38, 1.24, -0.28]}
            rotation={[-0.12, 0, 0]}
          />
        </group>

        {/* Настольные мониторы на центральной консоли */}
        <DynamicCanvasMonitorMesh
          width={0.82}
          height={0.46}
          reactorId="vver1000"
          position={[-0.95, 1.24, -0.28]}
          rotation={[-0.12, 0.08, 0]}
        />
        <DynamicCanvasMonitorMesh
          width={0.82}
          height={0.46}
          reactorId="vver1000"
          position={[0.0, 1.24, -0.3]}
          rotation={[-0.12, 0, 0]}
        />
        <DynamicCanvasMonitorMesh
          width={0.82}
          height={0.46}
          reactorId="vver1000"
          position={[0.95, 1.24, -0.28]}
          rotation={[-0.12, -0.08, 0]}
        />

        {/* Интерактивные органы управления на пульте БЩУ */}
        <InteractiveMCRButton
          label="АЗ-5"
          isScram
          reactorId="vver1000"
          action="SCRAM_TRIP"
          position={[0, 0.97, 0.25]}
          rotation={[0.2, 0, 0]}
          scale={1.1}
        />
        <InteractiveSwitchKey
          label="СУЗ"
          reactorId="vver1000"
          position={[-0.55, 0.97, 0.24]}
          rotation={[0.2, 0, 0]}
        />
        <InteractiveMCRButton
          label="ГЦН 1-4"
          color="#22d3ee"
          reactorId="vver1000"
          action="TOGGLE_ALL_MCPS"
          position={[0.55, 0.97, 0.24]}
          rotation={[0.2, 0, 0]}
        />
        <InteractiveMCRButton
          label="ВЗВОД"
          color="#34d399"
          reactorId="vver1000"
          action="RESET_SCRAM"
          position={[-1.1, 0.97, 0.24]}
          rotation={[0.2, 0, 0]}
        />

        {/* Кресла операторов перед пультом */}
        <OperatorChair position={[-1.4, 0, 1.05]} />
        <OperatorChair position={[0, 0, 1.0]} />
        <OperatorChair position={[1.4, 0, 1.05]} />
      </group>

      {/* 3. КОМПЬЮТЕРНЫЕ И СЕРВЕРНЫЕ СТОЙКИ АСУ ТП (по левому и правому краям зала) */}
      <group name="CAD_BSHU_ServerRacks_Left">
        {[-1.5, -0.5, 0.5, 1.5].map((rz, i) => (
          <ServerRackUnit
            key={`rack-l-${rz}`}
            position={[-5.3, 0.02, rz]}
            rotation={[0, Math.PI / 2, 0]}
            phaseOffset={i * 0.7}
          />
        ))}
        {/* Кабельный лоток над левым рядом стоек */}
        <mesh position={[-5.3, 2.34, 0]} material={cableTrayMat}>
          <boxGeometry args={[0.5, 0.08, 4.1]} />
        </mesh>
        <mesh position={[-5.2, 2.39, 0]} material={blueCableMat}>
          <boxGeometry args={[0.14, 0.05, 4.05]} />
        </mesh>
        <mesh position={[-5.4, 2.39, 0]} material={yellowCableMat}>
          <boxGeometry args={[0.1, 0.05, 4.05]} />
        </mesh>
      </group>

      <group name="CAD_BSHU_ServerRacks_Right">
        {[-1.5, -0.5, 0.5, 1.5].map((rz, i) => (
          <ServerRackUnit
            key={`rack-r-${rz}`}
            position={[5.3, 0.02, rz]}
            rotation={[0, -Math.PI / 2, 0]}
            phaseOffset={i * 0.9 + 2.0}
          />
        ))}
        {/* Кабельный лоток над правым рядом стоек */}
        <mesh position={[5.3, 2.34, 0]} material={cableTrayMat}>
          <boxGeometry args={[0.5, 0.08, 4.1]} />
        </mesh>
        <mesh position={[5.2, 2.39, 0]} material={blueCableMat}>
          <boxGeometry args={[0.14, 0.05, 4.05]} />
        </mesh>
        <mesh position={[5.4, 2.39, 0]} material={yellowCableMat}>
          <boxGeometry args={[0.1, 0.05, 4.05]} />
        </mesh>
      </group>
    </group>
  );
}
