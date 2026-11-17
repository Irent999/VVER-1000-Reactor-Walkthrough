import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { computeCutawayHeight, type SiteBox3Anchors } from '@/components/GlbAssemblyModel';

function createAsphaltRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#48515c';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 1800; i++) {
      const x = (i * 73) % 256;
      const y = (i * 137) % 256;
      const shade = 58 + ((i * 29) % 20);
      ctx.fillStyle = `rgb(${shade},${shade + 5},${shade + 11})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Тёмные чёткие контуры дорог и светлая бордюрная кромка
    ctx.fillStyle = '#2d343e';
    ctx.fillRect(0, 0, 12, 256);
    ctx.fillRect(244, 0, 12, 256);

    ctx.fillStyle = '#d5dbe2';
    ctx.fillRect(12, 0, 4, 256);
    ctx.fillRect(240, 0, 4, 256);

    ctx.fillStyle = '#dce2e8';
    ctx.fillRect(126, 16, 4, 84);
    ctx.fillRect(126, 144, 4, 84);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  return tex;
}

function createConcretePadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d2d8df';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(92, 102, 114, 0.20)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

const DEFAULT_ANCHORS: SiteBox3Anchors = {
  westHall: {
    minX: -94.56,
    maxX: -79.03,
    minY: 0.62,
    maxY: 17.1,
    minZ: -93.25,
    maxZ: -52.26,
    center: [-86.8, 0.62, -72.755],
  },
  midHall: {
    minX: -34.76,
    maxX: -16.02,
    minY: 0.62,
    maxY: 17.1,
    minZ: -93.25,
    maxZ: -52.26,
    center: [-25.39, 0.62, -72.755],
  },
  ritmHall: {
    minX: 23.05,
    maxX: 48.31,
    minY: 0.62,
    maxY: 17.57,
    minZ: -94.33,
    maxZ: -47.48,
    center: [35.68, 0.62, -70.905],
  },
  reactorDome: {
    minX: -88.0,
    maxX: -75.0,
    minY: 0.62,
    maxY: 23.49,
    minZ: -47.0,
    maxZ: -33.0,
    center: [-84.1, 14.0, -40.2],
  },
  ventStacks: [
    { id: 'vent-west-vver', x: -81.5, y: 16.95, z: -50.0, h: 15.5, r: 0.95 },
    { id: 'vent-mid-vver', x: -22.5, y: 16.95, z: -50.0, h: 15.5, r: 0.95 },
    { id: 'vent-east-ritm-main', x: 36.0, y: 17.42, z: -70.4, h: 14.5, r: 0.85 },
    { id: 'vent-east-ritm-wing', x: 36.0, y: 12.8, z: -54.0, h: 13.5, r: 0.8 },
  ],
};

function TurboGeneratorK1000({
  name,
  position,
  energyFlowActive = false,
}: {
  name: string;
  position: [number, number, number];
  energyFlowActive?: boolean;
}) {
  const lpOffsetsLocalX = [-8.5, -2.0, 4.5];
  const rotorGroupRef = useRef<THREE.Group | null>(null);
  const genStatorMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useFrame((state, delta) => {
    if (!energyFlowActive) return;
    if (rotorGroupRef.current) {
      rotorGroupRef.current.rotation.x += Math.min(delta, 0.05) * 18.0;
    }
    if (genStatorMatRef.current) {
      genStatorMatRef.current.emissiveIntensity =
        0.42 + Math.sin(state.clock.elapsedTime * 4.5) * 0.16;
    }
  });

  return (
    <group name={name} position={position} rotation={[0, Math.PI / 2, 0]}>
      {/* Фундаментная плита машзала на уровне пола 0.62 м */}
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[36.0, 0.28, 10.6]} />
        <meshStandardMaterial color="#bcc3cb" roughness={0.84} metalness={0.05} />
      </mesh>

      {/* Опорные колонны турбофундамента */}
      {[-15.0, -8.5, -2.0, 4.5, 11.0, 15.5].map((px, idx) => (
        <group key={`${name}-ped-${idx}`} position={[px, 1.48, 0]}>
          <mesh position={[0, 0, -2.25]} castShadow receiveShadow>
            <boxGeometry args={[1.25, 2.4, 1.15]} />
            <meshStandardMaterial color="#9ea6af" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0, 2.25]} castShadow receiveShadow>
            <boxGeometry args={[1.25, 2.4, 1.15]} />
            <meshStandardMaterial color="#9ea6af" roughness={0.82} />
          </mesh>
        </group>
      ))}

      {/* Верхняя плита турбофундамента */}
      <mesh position={[0, 2.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[33.5, 0.55, 6.0]} />
        <meshStandardMaterial color="#aeb6bf" roughness={0.78} metalness={0.08} />
      </mesh>

      {/* Жёлтые перила площадки обслуживания */}
      <mesh position={[0, 3.68, 2.9]}>
        <boxGeometry args={[33.0, 0.08, 0.08]} />
        <meshStandardMaterial color="#e5a922" roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh position={[0, 3.68, -2.9]}>
        <boxGeometry args={[33.0, 0.08, 0.08]} />
        <meshStandardMaterial color="#e5a922" roughness={0.4} metalness={0.45} />
      </mesh>

      {/* 3 Конденсатора под ЦНД и циркуляционные водоводы */}
      {lpOffsetsLocalX.map((cxPos, idx) => (
        <group key={`${name}-cond-${idx}`} position={[cxPos, 1.55, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.8, 2.1, 3.8]} />
            <meshStandardMaterial color="#495461" roughness={0.46} metalness={0.68} />
          </mesh>
          <mesh position={[0, 0, 2.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 1.1, 16]} />
            <meshStandardMaterial color="#355d87" roughness={0.38} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0, -2.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.52, 0.52, 1.1, 16]} />
            <meshStandardMaterial color="#355d87" roughness={0.38} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Главный валопровод и вращающиеся диски ротора К-1000 */}
      <group ref={rotorGroupRef} position={[0, 4.42, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 32.0, 24]} />
          <meshStandardMaterial color="#dce3ea" roughness={0.2} metalness={0.92} />
        </mesh>
        {[-12.2, -10.8, -5.6, 0.9, 7.4, 15.6].map((rx, rIdx) => (
          <group key={`${name}-blade-${rIdx}`} position={[rx, 0, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[1.15, 1.15, 0.14, 16]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.22} metalness={0.9} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.1, 2.55, 0.22]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.25} metalness={0.8} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.1, 2.55, 0.22]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.25} metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Цилиндр высокого давления (ЦВД) */}
      <group position={[-14.2, 4.42, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.6, 4.8, 24]} />
          <meshStandardMaterial color="#c4ccd4" roughness={0.32} metalness={0.78} />
        </mesh>
        <mesh position={[0, -0.32, 0]} castShadow>
          <boxGeometry args={[5.2, 1.35, 3.6]} />
          <meshStandardMaterial color="#73808e" roughness={0.42} metalness={0.65} />
        </mesh>
        {[-1.4, 1.4].map((vz, vIdx) => (
          <mesh key={`${name}-valve-${vIdx}`} position={[-1.0, 1.15, vz]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 1.7, 16]} />
            <meshStandardMaterial color="#aeb7c0" roughness={0.35} metalness={0.75} />
          </mesh>
        ))}
      </group>

      {/* Три цилиндра низкого давления (ЦНД-1, ЦНД-2, ЦНД-3) */}
      {lpOffsetsLocalX.map((cxPos, idx) => (
        <group key={`${name}-lpc-${idx}`} position={[cxPos, 4.5, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[2.1, 2.1, 5.0, 24]} />
            <meshStandardMaterial color="#677584" roughness={0.38} metalness={0.68} />
          </mesh>
          {[-1.9, 0, 1.9].map((fx, fIdx) => (
            <mesh key={`${name}-rib-${fIdx}`} position={[fx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[2.28, 2.28, 0.22, 24]} />
              <meshStandardMaterial color="#c4ccd4" roughness={0.3} metalness={0.82} />
            </mesh>
          ))}
          <mesh position={[0, -1.05, 0]}>
            <boxGeometry args={[4.6, 1.5, 4.0]} />
            <meshStandardMaterial color="#586472" roughness={0.48} metalness={0.62} />
          </mesh>
        </group>
      ))}

      {/* Перепускные паропроводы от ЦВД к ЦНД */}
      {[-1.25, 1.25].map((pz, idx) => (
        <mesh
          key={`${name}-xover-${idx}`}
          position={[-5.0, 7.05, pz]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.42, 0.42, 19.5, 16]} />
          <meshStandardMaterial color="#cfd7df" roughness={0.3} metalness={0.84} />
        </mesh>
      ))}

      {/* Турбогенератор ТВВ-1000 и возбудитель */}
      <group position={[11.6, 4.5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[1.95, 1.95, 7.6, 28]} />
          <meshStandardMaterial
            ref={genStatorMatRef}
            color="#2a4b7c"
            roughness={0.42}
            metalness={0.48}
            emissive={energyFlowActive ? '#0ea5e9' : '#000000'}
            emissiveIntensity={energyFlowActive ? 0.45 : 0}
          />
        </mesh>
        {[-3.95, 3.95].map((ex, eIdx) => (
          <mesh key={`${name}-end-${eIdx}`} position={[ex, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[2.08, 2.08, 0.36, 24]} />
            <meshStandardMaterial color="#cfd6de" roughness={0.3} metalness={0.82} />
          </mesh>
        ))}
        <mesh position={[0, 2.05, 0]} castShadow>
          <boxGeometry args={[5.4, 1.05, 2.8]} />
          <meshStandardMaterial color="#9ea8b2" roughness={0.4} metalness={0.62} />
        </mesh>
        <mesh position={[5.2, -0.3, 0]} castShadow>
          <boxGeometry args={[2.5, 2.2, 2.4]} />
          <meshStandardMaterial color="#3c6194" roughness={0.44} metalness={0.48} />
        </mesh>
      </group>

      {/* Мостовой кран машзала (строго под кровлей <= 11.4 м и внутри пролёта) */}
      <group name={`${name}BridgeCrane`} position={[1.5, 9.85, 0]}>
        <mesh position={[-1.15, 0, 0]} castShadow>
          <boxGeometry args={[0.85, 0.95, 11.6]} />
          <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.45} />
        </mesh>
        <mesh position={[1.15, 0, 0]} castShadow>
          <boxGeometry args={[0.85, 0.95, 11.6]} />
          <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.45} />
        </mesh>
        <mesh position={[0, 0.65, -1.2]} castShadow>
          <boxGeometry args={[2.8, 0.7, 2.2]} />
          <meshStandardMaterial color="#3b424c" roughness={0.45} metalness={0.7} />
        </mesh>
        <mesh position={[0, -1.05, -1.2]}>
          <boxGeometry args={[0.65, 1.0, 0.65]} />
          <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

interface CadSiteAddonsProps {
  anchors?: SiteBox3Anchors | null;
  containmentOpacity?: number;
  energyFlowActive?: boolean;
}

/**
 * Процедурные доработки площадки АЭС поверх assembly.glb, строго привязанные к мировым Box3 и высотам крыш:
 * 1. Круглая бетонная заглушка выреза в плите [62.05, 0.40, 61.93] + ОРУ 500 кВ.
 * 2. Асфальтовые проезды и венттрубы, посаженные строго на крыши по raycast (и подрезаемые тем же cutawayPlane).
 * 3. Турбоагрегаты К-1000 вдоль продольной оси Z внутри обоих машзалов ВВЭР-1000 (Mid и West).
 * 4. Полный комплекс РИТМ-200Н внутри большого широкого корпуса (X[23.05..48.31], Z[-94.33..-47.48], floorY=0.62м):
 *    интегральный реактор РИТМ-200Н с 7 приводами СУЗ и 4 патрубками ПГ в высоком центральном пролёте,
 *    вспомогательные модули, паропроводы над коридором, продольный турбоагрегат РИТМ-200Н и мостовые краны.
 * 5. Внутренние площадки обслуживания в центральном зале (+14.41 м) и эстакаде крана (+19.71 м).
 */
export default function CadSiteAddons({
  anchors,
  containmentOpacity = 1.0,
  energyFlowActive = false,
}: CadSiteAddonsProps) {
  const resolved = anchors ?? DEFAULT_ANCHORS;
  const ritmRotorRef = useRef<THREE.Group | null>(null);
  const ritmGenMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

  useFrame((state, delta) => {
    if (!energyFlowActive) return;
    if (ritmRotorRef.current) {
      ritmRotorRef.current.rotation.x += Math.min(delta, 0.05) * 22.0;
    }
    if (ritmGenMatRef.current) {
      ritmGenMatRef.current.emissiveIntensity =
        0.46 + Math.sin(state.clock.elapsedTime * 5.0 + 1.0) * 0.18;
    }
  });

  const cutawayPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 60), []);
  useEffect(() => {
    cutawayPlane.constant = computeCutawayHeight(containmentOpacity);
  }, [containmentOpacity, cutawayPlane]);

  const textures = useMemo(() => {
    const roadTex = createAsphaltRoadTexture();
    const padTex = createConcretePadTexture();
    return { roadTex, padTex };
  }, []);

  useEffect(() => {
    return () => {
      textures.roadTex.dispose();
      textures.padTex.dispose();
    };
  }, [textures]);

  const transformerPositions: [number, number, number][] = [
    [48, 0.4, 48],
    [62, 0.4, 48],
    [76, 0.4, 48],
  ];

  const portalPositions: [number, number, number][] = [
    [48, 0.4, 68],
    [62, 0.4, 68],
    [76, 0.4, 68],
    [48, 0.4, 84],
    [62, 0.4, 84],
    [76, 0.4, 84],
  ];

  // Привязка обоих К-1000 строго по центру пролётов машзалов ВВЭР-1000 (ось Z)
  const midHall = resolved.midHall;
  const midK1000CenterX = THREE.MathUtils.clamp(-27.6, midHall.minX + 6.5, -20.31 - 6.5);
  const midK1000CenterZ = (midHall.minZ + midHall.maxZ) / 2;

  const westHall = resolved.westHall;
  const westK1000CenterX = THREE.MathUtils.clamp(-86.8, westHall.minX + 6.5, -79.03 - 6.5);
  const westK1000CenterZ = (westHall.minZ + westHall.maxZ) / 2;

  // Геометрическая привязка комплекса РИТМ-200Н внутрь широкого корпуса (X[23.05..48.31], Z[-94.33..-47.48])
  const ritmHall = resolved.ritmHall;
  const ritmFloorY = ritmHall.minY;
  const ritmHallCenterZ = (ritmHall.minZ + ritmHall.maxZ) / 2;
  const ritmReactorPos: [number, number, number] = [
    THREE.MathUtils.clamp(29.5, ritmHall.minX + 4.8, ritmHall.maxX - 15.0),
    ritmFloorY,
    THREE.MathUtils.clamp(ritmHallCenterZ, -75.0, -66.5),
  ];
  const ritmTurbinePos: [number, number, number] = [
    THREE.MathUtils.clamp(41.4, ritmHall.minX + 14.0, ritmHall.maxX - 4.2),
    ritmFloorY,
    THREE.MathUtils.clamp(ritmHallCenterZ, ritmHall.minZ + 16.0, ritmHall.maxZ - 16.0),
  ];
  const ritmWalkwayCenterX = (ritmReactorPos[0] + ritmTurbinePos[0]) / 2;

  // Координаты настилов центрального зала ВВЭР-1000, строго вписанные внутрь контайнмента
  const dome = resolved.reactorDome;
  const deckMinX = Math.max(dome.minX + 4.5, -83.2);
  const deckMaxX = Math.min(dome.maxX - 0.3, -75.4);
  const deckCenterX = (deckMinX + deckMaxX) / 2;
  const deckWidthX = Math.max(4.5, deckMaxX - deckMinX);
  const deckCenterZ = (dome.minZ + dome.maxZ) / 2;
  const deckDepthZ = Math.min(11.6, dome.maxZ - dome.minZ - 2.2);

  // Кластер 7 приводов СУЗ поверх крышки РИТМ-200Н
  const crdmOffsets: [number, number][] = [
    [0, 0],
    [0.58, 0],
    [-0.58, 0],
    [0.29, 0.5],
    [-0.29, 0.5],
    [0.29, -0.5],
    [-0.29, -0.5],
  ];

  return (
    <group name="CadSiteAddons">
      {/* 1. Закрытие круглого выреза в базовой плите (центр [62.05, 61.93], R = 42.9 м) и ОРУ 500 кВ */}
      <group name="CircularBasePlugAndORU">
        <mesh position={[62.05, 0.2, 61.93]} receiveShadow>
          <cylinderGeometry args={[43.25, 43.25, 0.4, 64]} />
          <meshStandardMaterial
            map={textures.padTex}
            color="#d2d8df"
            roughness={0.86}
            metalness={0.03}
          />
        </mesh>

        <mesh position={[62.05, 0.405, 61.93]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry args={[42.6, 43.3, 64]} />
          <meshStandardMaterial color="#58616c" roughness={0.84} metalness={0.08} />
        </mesh>

        <mesh position={[62, 0.48, 64]} receiveShadow>
          <boxGeometry args={[46, 0.16, 52]} />
          <meshStandardMaterial color="#b4bcc6" roughness={0.85} metalness={0.05} />
        </mesh>

        <mesh position={[62, 0.42, 26]} receiveShadow>
          <boxGeometry args={[7.2, 0.03, 28]} />
          <meshStandardMaterial map={textures.roadTex} roughness={0.9} metalness={0.04} />
        </mesh>

        {transformerPositions.map((pos, idx) => (
          <group key={`tx-${idx}`} position={pos}>
            <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
              <boxGeometry args={[6.8, 0.4, 5.2]} />
              <meshStandardMaterial color="#9aa3ad" roughness={0.85} />
            </mesh>
            <mesh position={[0, 2.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[4.4, 3.7, 3.0]} />
              <meshStandardMaterial color="#6e7782" roughness={0.45} metalness={0.62} />
            </mesh>
            <mesh position={[-2.75, 2.25, 0]} castShadow>
              <boxGeometry args={[0.9, 2.8, 2.4]} />
              <meshStandardMaterial color="#87919c" roughness={0.42} metalness={0.68} />
            </mesh>
            <mesh position={[2.75, 2.25, 0]} castShadow>
              <boxGeometry args={[0.9, 2.8, 2.4]} />
              <meshStandardMaterial color="#87919c" roughness={0.42} metalness={0.68} />
            </mesh>
            <mesh position={[0, 4.65, -0.75]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.52, 0.52, 3.6, 16]} />
              <meshStandardMaterial color="#96a0ab" roughness={0.38} metalness={0.7} />
            </mesh>
            {[-1.25, 0, 1.25].map((bx, bIdx) => (
              <mesh key={`bush-${bIdx}`} position={[bx, 5.1, 0.45]} castShadow>
                <cylinderGeometry args={[0.16, 0.24, 2.2, 12]} />
                <meshStandardMaterial color="#c9d3dc" roughness={0.25} metalness={0.12} />
              </mesh>
            ))}
          </group>
        ))}

        {portalPositions.map((pos, idx) => (
          <group key={`portal-${idx}`} position={pos}>
            <mesh position={[-4.5, 5.2, 0]} castShadow>
              <boxGeometry args={[0.55, 10.2, 0.55]} />
              <meshStandardMaterial color="#7f8892" roughness={0.4} metalness={0.74} />
            </mesh>
            <mesh position={[4.5, 5.2, 0]} castShadow>
              <boxGeometry args={[0.55, 10.2, 0.55]} />
              <meshStandardMaterial color="#7f8892" roughness={0.4} metalness={0.74} />
            </mesh>
            <mesh position={[0, 9.8, 0]} castShadow>
              <boxGeometry args={[10.4, 0.65, 0.65]} />
              <meshStandardMaterial color="#8d96a0" roughness={0.38} metalness={0.75} />
            </mesh>
            {[-2.4, 0, 2.4].map((ix, iIdx) => (
              <mesh key={`ins-${iIdx}`} position={[ix, 8.85, 0]}>
                <cylinderGeometry args={[0.14, 0.14, 1.3, 10]} />
                <meshStandardMaterial color="#d2dbe3" roughness={0.25} metalness={0.15} />
              </mesh>
            ))}
          </group>
        ))}

        {[48, 62, 76].map((xPos, idx) =>
          [-2.4, 0, 2.4].map((dx, lineIdx) => (
            <mesh
              key={`bus-${idx}-${lineIdx}`}
              position={[xPos + dx, 8.65, 67]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.06, 0.06, 38, 8]} />
              <meshStandardMaterial color="#bcc4cd" roughness={0.3} metalness={0.85} />
            </mesh>
          ))
        )}
      </group>

      {/* 2. Асфальтовые дороги площадки (вне границ корпусов и градирен) */}
      <group name="AsphaltRoadNetwork">
        <mesh position={[-5, 0.415, -20.5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[6.2, 0.025, 194]} />
          <meshStandardMaterial map={textures.roadTex} roughness={0.9} metalness={0.04} />
        </mesh>

        <mesh position={[62, 0.418, -32]} receiveShadow>
          <boxGeometry args={[7.2, 0.025, 130]} />
          <meshStandardMaterial map={textures.roadTex} roughness={0.9} metalness={0.04} />
        </mesh>

        <mesh position={[-104, 0.418, -6]} receiveShadow>
          <boxGeometry args={[6.4, 0.025, 178]} />
          <meshStandardMaterial map={textures.roadTex} roughness={0.9} metalness={0.04} />
        </mesh>

        <mesh position={[-18, 0.416, -98]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <boxGeometry args={[6.4, 0.025, 176]} />
          <meshStandardMaterial map={textures.roadTex} roughness={0.9} metalness={0.04} />
        </mesh>
      </group>

      {/* 3. Вентиляционные трубы на кровлях зданий (высокие ВВЭР #e5a922, РИТМ-200Н #f1f4f8 + #1d4580) */}
      <group name="VentilationStacks">
        {resolved.ventStacks.map((st) => {
          const isRitmStack = st.id.includes('ritm');
          const shaftColor = isRitmStack ? '#f1f4f8' : '#e5a922';
          const capColor = isRitmStack ? '#1d4580' : '#3b424c';
          const baseColor = isRitmStack ? '#3b424c' : '#464e59';
          return (
            <group key={st.id} name={st.id} position={[st.x, st.y, st.z]}>
              <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[st.r * 1.4, st.r * 1.65, 0.9, 20]} />
                <meshStandardMaterial
                  color={baseColor}
                  roughness={0.68}
                  metalness={0.28}
                  clippingPlanes={[cutawayPlane]}
                />
              </mesh>
              <mesh position={[0, st.h / 2 + 0.5, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[st.r * 0.84, st.r, st.h, 24]} />
                <meshStandardMaterial
                  color={shaftColor}
                  roughness={isRitmStack ? 0.52 : 0.36}
                  metalness={isRitmStack ? 0.14 : 0.32}
                  clippingPlanes={[cutawayPlane]}
                />
              </mesh>
              <mesh position={[0, st.h + 0.7, 0]}>
                <cylinderGeometry args={[st.r * 0.96, st.r * 0.86, 0.52, 24]} />
                <meshStandardMaterial
                  color={capColor}
                  roughness={0.42}
                  metalness={0.35}
                  clippingPlanes={[cutawayPlane]}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* 4. Турбоагрегаты К-1000 в обоих машзалах ВВЭР-1000 (ось Z) */}
      <TurboGeneratorK1000
        name="TurbineHallK1000Mid"
        position={[midK1000CenterX, midHall.minY, midK1000CenterZ]}
        energyFlowActive={energyFlowActive}
      />
      <TurboGeneratorK1000
        name="TurbineHallK1000West"
        position={[westK1000CenterX, westHall.minY, westK1000CenterZ]}
        energyFlowActive={energyFlowActive}
      />

      {/* 5. Комплекс РИТМ-200Н внутри большого широкого корпуса (X[23.05..48.31], Z[-94.33..-47.48]) */}
      <group name="Ritm200nComplex">
        {/* Навигационный пол и отсеки для VR-телепортации / прогулки 1:1 по корпусу РИТМ-200Н */}
        <group name="Ritm200nWalkwayFloor">
          <mesh position={[ritmWalkwayCenterX, ritmFloorY + 0.015, ritmHallCenterZ]} receiveShadow>
            <boxGeometry args={[3.4, 0.03, 39.0]} />
            <meshStandardMaterial color="#8c96a2" roughness={0.78} metalness={0.18} />
          </mesh>
          {/* Продольная технологическая разметка коридора */}
          <mesh position={[ritmWalkwayCenterX - 1.55, ritmFloorY + 0.032, ritmHallCenterZ]}>
            <boxGeometry args={[0.14, 0.008, 38.0]} />
            <meshStandardMaterial color="#e5a922" roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[ritmWalkwayCenterX + 1.55, ritmFloorY + 0.032, ritmHallCenterZ]}>
            <boxGeometry args={[0.14, 0.008, 38.0]} />
            <meshStandardMaterial color="#e5a922" roughness={0.5} metalness={0.2} />
          </mesh>
        </group>

        {/* 5А. Реакторная установка РИТМ-200Н (центральный высокий пролёт, Z ∈ [-79.07..-62.74], кровля 17.57 м) */}
        <group name="Ritm200nReactorUnit" position={ritmReactorPos}>
          {/* Бетонная фундаментная плита и шахта биологической защиты */}
          <mesh position={[0, 0.18, 0]} receiveShadow>
            <cylinderGeometry args={[2.75, 2.85, 0.36, 32]} />
            <meshStandardMaterial color="#aeb6bf" roughness={0.85} metalness={0.05} />
          </mesh>
          <mesh position={[0, 2.45, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[2.35, 2.48, 4.2, 32]} />
            <meshStandardMaterial color="#c4ccd4" roughness={0.8} metalness={0.08} />
          </mesh>
          {/* Стальное опорное кольцо площадки обслуживания реактора */}
          <mesh position={[0, 4.68, 0]} receiveShadow>
            <cylinderGeometry args={[2.5, 2.5, 0.25, 32]} />
            <meshStandardMaterial color="#7d8792" roughness={0.52} metalness={0.52} />
          </mesh>
          {/* Жёлтое круговое ограждение площадки реактора */}
          <mesh position={[0, 5.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.38, 0.06, 10, 36]} />
            <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.45} />
          </mesh>

          {/* Интегральный корпус реактора РИТМ-200Н (полупрозрачный в режиме Энергопотока для видимости Черенковского свечения) */}
          <mesh position={[0, 4.4, 0]} castShadow={!energyFlowActive} receiveShadow>
            <cylinderGeometry args={[1.38, 1.38, 5.4, 32]} />
            <meshStandardMaterial
              color="#ced6de"
              roughness={0.28}
              metalness={0.82}
              transparent={energyFlowActive}
              opacity={energyFlowActive ? 0.42 : 1.0}
              depthWrite={!energyFlowActive}
            />
          </mesh>
          {/* Утолщённая зона встроенных парогенераторных кассет */}
          <mesh position={[0, 5.8, 0]} castShadow>
            <cylinderGeometry args={[1.58, 1.48, 1.45, 32]} />
            <meshStandardMaterial color="#b4bec8" roughness={0.32} metalness={0.8} />
          </mesh>
          {/* 4 встроенных патрубка ПГ с коллекторами */}
          {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, idx) => (
            <group key={`ritm-nozzle-${idx}`} rotation={[0, ang, 0]}>
              <mesh position={[1.55, 5.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.34, 0.38, 0.85, 16]} />
                <meshStandardMaterial color="#8f9aa6" roughness={0.34} metalness={0.78} />
              </mesh>
              <mesh position={[2.05, 5.4, 0]} castShadow>
                <cylinderGeometry args={[0.28, 0.28, 1.45, 14]} />
                <meshStandardMaterial color="#677584" roughness={0.4} metalness={0.72} />
              </mesh>
            </group>
          ))}
          {/* Главный разъёмный фланец и крышка верхнего блока */}
          <mesh position={[0, 6.72, 0]} castShadow>
            <cylinderGeometry args={[1.66, 1.66, 0.42, 32]} />
            <meshStandardMaterial color="#dce3ea" roughness={0.24} metalness={0.86} />
          </mesh>
          <mesh position={[0, 7.15, 0]} castShadow>
            <cylinderGeometry args={[1.22, 1.56, 0.55, 32]} />
            <meshStandardMaterial color="#355887" roughness={0.38} metalness={0.55} />
          </mesh>

          {/* Блок приводов СУЗ (7 вертикальных приводов управления и защиты сверху) */}
          {crdmOffsets.map(([dx, dz], idx) => (
            <group key={`ritm-crdm-${idx}`} position={[dx, 8.65, dz]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.13, 0.15, 2.55, 14]} />
                <meshStandardMaterial color="#dce3ea" roughness={0.22} metalness={0.88} />
              </mesh>
              <mesh position={[0, 0.85, 0]}>
                <cylinderGeometry args={[0.19, 0.19, 0.55, 14]} />
                <meshStandardMaterial color="#2a4b7c" roughness={0.36} metalness={0.52} />
              </mesh>
            </group>
          ))}
          {/* Верхняя траверса и защитный кожух приводов СУЗ */}
          <mesh position={[0, 9.95, 0]} castShadow>
            <cylinderGeometry args={[1.08, 1.08, 0.24, 24]} />
            <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.48} />
          </mesh>

          {/* Паропроводы свежего пара над коридором в турбинный пролёт (просвет > 4.0 м над полом) */}
          {[-0.85, 0.85].map((pz, pIdx) => (
            <group key={`ritm-steam-${pIdx}`}>
              <mesh position={[2.0, 5.15, pz]} castShadow>
                <cylinderGeometry args={[0.24, 0.24, 1.4, 12]} />
                <meshStandardMaterial color="#cfd7df" roughness={0.3} metalness={0.84} />
              </mesh>
              <mesh
                position={[6.2, 4.95, pz]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.24, 0.24, 9.8, 14]} />
                <meshStandardMaterial color="#cfd7df" roughness={0.3} metalness={0.84} />
              </mesh>
            </group>
          ))}

          {/* Мостовой кран реакторного отсека (внутри высокого пролёта, Y=12.6 < 16.5 м) */}
          <group name="RitmReactorCrane" position={[0, 12.6, -1.6]}>
            <mesh position={[0, 0, -0.75]} castShadow>
              <boxGeometry args={[8.8, 0.68, 0.58]} />
              <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.46} />
            </mesh>
            <mesh position={[0, 0, 0.75]} castShadow>
              <boxGeometry args={[8.8, 0.68, 0.58]} />
              <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.46} />
            </mesh>
            <mesh position={[0, 0.52, 0]}>
              <boxGeometry args={[1.7, 0.58, 1.9]} />
              <meshStandardMaterial color="#3b424c" roughness={0.44} metalness={0.72} />
            </mesh>
          </group>
        </group>

        {/* 5Б. Вспомогательные системы безопасности и перегрузки топлива внутри левой половины корпуса */}
        <group name="Ritm200nAuxNorth" position={[ritmReactorPos[0], ritmFloorY, ritmReactorPos[2] - 12.6]}>
          <mesh position={[0, 0.14, 0]} receiveShadow>
            <boxGeometry args={[7.4, 0.28, 7.6]} />
            <meshStandardMaterial color="#aeb6bf" roughness={0.84} />
          </mesh>
          {[-2.0, 2.0].map((tx, idx) => (
            <mesh key={`eccs-tank-${idx}`} position={[tx, 2.1, -1.2]} castShadow receiveShadow>
              <cylinderGeometry args={[1.05, 1.05, 3.6, 20]} />
              <meshStandardMaterial color="#7b8794" roughness={0.36} metalness={0.72} />
            </mesh>
          ))}
          <mesh position={[0, 1.4, 1.8]} castShadow>
            <boxGeometry args={[5.8, 2.2, 1.8]} />
            <meshStandardMaterial color="#3d5b7d" roughness={0.45} metalness={0.55} />
          </mesh>
        </group>

        <group name="Ritm200nAuxSouth" position={[ritmReactorPos[0], ritmFloorY, ritmReactorPos[2] + 13.0]}>
          <mesh position={[0, 0.14, 0]} receiveShadow>
            <boxGeometry args={[7.4, 0.28, 8.2]} />
            <meshStandardMaterial color="#aeb6bf" roughness={0.84} />
          </mesh>
          {/* Бассейн выдержки и перегрузки ТВС + шкафы АСУ ТП */}
          <mesh position={[-1.2, 1.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.8, 2.3, 5.2]} />
            <meshStandardMaterial color="#94a0ac" roughness={0.62} metalness={0.35} />
          </mesh>
          <mesh position={[-1.2, 2.52, 0]}>
            <boxGeometry args={[3.2, 0.06, 4.6]} />
            <meshStandardMaterial color="#2a7ab0" roughness={0.18} metalness={0.25} />
          </mesh>
          <mesh position={[2.1, 1.3, 0]} castShadow>
            <boxGeometry args={[1.4, 2.2, 5.6]} />
            <meshStandardMaterial color="#44505c" roughness={0.44} metalness={0.6} />
          </mesh>
        </group>

        {/* 5В. Турбоагрегат РИТМ-200Н вдоль продольной оси Z (X ∈ [38.6..44.2], Z ∈ [-83.9..-57.9]) */}
        <group
          name="Ritm200nTurbineSet"
          position={ritmTurbinePos}
          rotation={[0, Math.PI / 2, 0]}
        >
          {/* Фундаментная плита турбоагрегата */}
          <mesh position={[0, 0.14, 0]} receiveShadow>
            <boxGeometry args={[26.0, 0.28, 5.6]} />
            <meshStandardMaterial color="#bcc3cb" roughness={0.84} metalness={0.05} />
          </mesh>

          {/* Колонны и стол турбофундамента */}
          {[-11.0, -5.0, 1.0, 7.0, 11.4].map((px, idx) => (
            <group key={`rt-ped-${idx}`} position={[px, 1.15, 0]}>
              <mesh position={[0, 0, -1.5]} castShadow>
                <boxGeometry args={[0.95, 1.8, 0.88]} />
                <meshStandardMaterial color="#9ea6af" roughness={0.82} />
              </mesh>
              <mesh position={[0, 0, 1.5]} castShadow>
                <boxGeometry args={[0.95, 1.8, 0.88]} />
                <meshStandardMaterial color="#9ea6af" roughness={0.82} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
            <boxGeometry args={[24.2, 0.42, 4.2]} />
            <meshStandardMaterial color="#aeb6bf" roughness={0.78} metalness={0.08} />
          </mesh>
          <mesh position={[0, 2.9, 2.0]}>
            <boxGeometry args={[23.8, 0.06, 0.06]} />
            <meshStandardMaterial color="#e5a922" roughness={0.4} metalness={0.45} />
          </mesh>
          <mesh position={[0, 2.9, -2.0]}>
            <boxGeometry args={[23.8, 0.06, 0.06]} />
            <meshStandardMaterial color="#e5a922" roughness={0.4} metalness={0.45} />
          </mesh>

          {/* Конденсатор под ЦНД */}
          <mesh position={[-2.0, 1.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.6, 1.65, 2.7]} />
            <meshStandardMaterial color="#495461" roughness={0.46} metalness={0.68} />
          </mesh>

          {/* Валопровод и вращающиеся диски ротора турбины РИТМ-200Н */}
          <group ref={ritmRotorRef} position={[0, 3.38, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.27, 0.27, 21.6, 20]} />
              <meshStandardMaterial color="#dce3ea" roughness={0.2} metalness={0.92} />
            </mesh>
            {[-6.2, -4.4, 0.8, 9.4].map((rx, rIdx) => (
              <group key={`rt-blade-${rIdx}`} position={[rx, 0, 0]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.88, 0.88, 0.12, 16]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={0.22} metalness={0.9} />
                </mesh>
                <mesh>
                  <boxGeometry args={[0.08, 1.95, 0.18]} />
                  <meshStandardMaterial color="#38bdf8" roughness={0.25} metalness={0.8} />
                </mesh>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <boxGeometry args={[0.08, 1.95, 0.18]} />
                  <meshStandardMaterial color="#38bdf8" roughness={0.25} metalness={0.8} />
                </mesh>
              </group>
            ))}
          </group>

          {/* ЦВД (цилиндр высокого давления) */}
          <group position={[-8.4, 3.38, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
              <cylinderGeometry args={[1.1, 1.2, 3.6, 24]} />
              <meshStandardMaterial color="#c4ccd4" roughness={0.32} metalness={0.78} />
            </mesh>
            <mesh position={[0, -0.25, 0]}>
              <boxGeometry args={[3.9, 0.95, 2.6]} />
              <meshStandardMaterial color="#73808e" roughness={0.42} metalness={0.65} />
            </mesh>
          </group>

          {/* Двухпоточный ЦНД */}
          <group position={[-2.0, 3.45, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
              <cylinderGeometry args={[1.6, 1.6, 4.8, 24]} />
              <meshStandardMaterial color="#677584" roughness={0.38} metalness={0.68} />
            </mesh>
            {[-1.55, 0, 1.55].map((rx, rIdx) => (
              <mesh key={`rt-rib-${rIdx}`} position={[rx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[1.74, 1.74, 0.16, 24]} />
                <meshStandardMaterial color="#c4ccd4" roughness={0.3} metalness={0.82} />
              </mesh>
            ))}
          </group>

          {/* Перепускной паропровод */}
          <mesh position={[-5.2, 5.28, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 6.4, 16]} />
            <meshStandardMaterial color="#cfd7df" roughness={0.3} metalness={0.84} />
          </mesh>

          {/* Турбогенератор и возбудитель */}
          <group position={[6.4, 3.45, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
              <cylinderGeometry args={[1.45, 1.45, 5.8, 24]} />
              <meshStandardMaterial
                ref={ritmGenMatRef}
                color="#2a4b7c"
                roughness={0.42}
                metalness={0.48}
                emissive={energyFlowActive ? '#0ea5e9' : '#000000'}
                emissiveIntensity={energyFlowActive ? 0.48 : 0}
              />
            </mesh>
            <mesh position={[0, 1.48, 0]} castShadow>
              <boxGeometry args={[4.0, 0.8, 2.1]} />
              <meshStandardMaterial color="#9ea8b2" roughness={0.4} metalness={0.62} />
            </mesh>
            <mesh position={[4.0, -0.2, 0]} castShadow>
              <boxGeometry args={[1.9, 1.7, 1.8]} />
              <meshStandardMaterial color="#3c6194" roughness={0.44} metalness={0.48} />
            </mesh>
          </group>

          {/* Мостовой кран турбинного пролёта (строго под крышей 12.95 м, верх <= 9.9 м) */}
          <group name="RitmTurbineCrane" position={[0, 8.9, 0]}>
            <mesh position={[-0.9, 0, 0]} castShadow>
              <boxGeometry args={[0.65, 0.72, 7.6]} />
              <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.45} />
            </mesh>
            <mesh position={[0.9, 0, 0]} castShadow>
              <boxGeometry args={[0.65, 0.72, 7.6]} />
              <meshStandardMaterial color="#e5a922" roughness={0.38} metalness={0.45} />
            </mesh>
            <mesh position={[0, 0.48, -0.6]} castShadow>
              <boxGeometry args={[2.0, 0.55, 1.65]} />
              <meshStandardMaterial color="#3b424c" roughness={0.45} metalness={0.7} />
            </mesh>
          </group>
        </group>
      </group>

      {/* 6. Внутренние площадки обслуживания центрального зала (+14.41 м) и крана (+19.71 м) строго внутри стен */}
      <group name="ReactorHallWalkableDecks">
        <mesh position={[deckCenterX, 14.3, deckCenterZ]} receiveShadow>
          <boxGeometry args={[deckWidthX, 0.22, deckDepthZ]} />
          <meshStandardMaterial color="#b8bcc2" roughness={0.68} metalness={0.32} />
        </mesh>
        <mesh position={[deckCenterX, 15.35, deckCenterZ + deckDepthZ / 2 - 0.1]}>
          <boxGeometry args={[deckWidthX - 0.2, 0.08, 0.08]} />
          <meshStandardMaterial color="#f0a500" roughness={0.36} metalness={0.45} />
        </mesh>
        <mesh position={[deckCenterX, 15.35, deckCenterZ - deckDepthZ / 2 + 0.1]}>
          <boxGeometry args={[deckWidthX - 0.2, 0.08, 0.08]} />
          <meshStandardMaterial color="#f0a500" roughness={0.36} metalness={0.45} />
        </mesh>

        {/* Обзорный мостик полярного крана строго внутри купола */}
        <mesh position={[-80.8, 19.6, -44.2]} receiveShadow>
          <boxGeometry args={[4.6, 0.22, 2.2]} />
          <meshStandardMaterial color="#7d8792" roughness={0.62} metalness={0.45} />
        </mesh>
        <mesh position={[-80.8, 20.65, -43.15]}>
          <boxGeometry args={[4.4, 0.08, 0.08]} />
          <meshStandardMaterial color="#f0a500" roughness={0.38} metalness={0.45} />
        </mesh>
        <mesh position={[-80.8, 20.65, -45.25]}>
          <boxGeometry args={[4.4, 0.08, 0.08]} />
          <meshStandardMaterial color="#f0a500" roughness={0.38} metalness={0.45} />
        </mesh>
      </group>
    </group>
  );
}
