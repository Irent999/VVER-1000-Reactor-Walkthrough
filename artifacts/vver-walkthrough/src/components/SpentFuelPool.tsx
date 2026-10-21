import { useMemo } from 'react';
import * as THREE from 'three';
import CherenkovVolumeGlow from './CherenkovVolumeGlow';
import { SAFETY_YELLOW } from '@/scene/constants';
import {
  diamondPlateMap, diamondPlateNormalMap, diamondPlateRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

// Материалы бассейна выдержки
const stainlessLinerMat = new THREE.MeshStandardMaterial({
  color: '#cbd5e1',
  map: brushedSteelMap,
  normalMap: brushedSteelNormalMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughness: 0.22,
  metalness: 0.88,
});

const safetyYellowMat = new THREE.MeshStandardMaterial({
  color: SAFETY_YELLOW,
  roughness: 0.35,
  metalness: 0.25,
});

const diamondWalkwayMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: diamondPlateMap,
  normalMap: diamondPlateNormalMap,
  roughnessMap: diamondPlateRoughnessMap,
  roughness: 0.4,
  metalness: 0.78,
});

const fuelAssemblyNozzleMat = new THREE.MeshStandardMaterial({
  color: '#475569',
  roughness: 0.3,
  metalness: 0.85,
});

const boratedWaterMat = new THREE.MeshPhysicalMaterial({
  color: '#00c8ff',
  transmission: 0.82,
  transparent: true,
  opacity: 0.45,
  roughness: 0.06,
  metalness: 0.05,
  ior: 1.333,
  depthWrite: false,
});

interface SpentFuelPoolProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * Бассейн выдержки отработавшего ядерного топлива (БВ) ВВЭР-1000:
 * - Глубокий резервуар из нержавеющей стали, заполненный борированной водой
 * - Стеллажи уплотненного хранения (СУХ) с кассетами ТВС на дне бассейна
 * - Объемное свечение Черенкова, пробивающееся сквозь толщу воды от сборок
 * - Периметральное защитное ограждение (#FFCC00) и мостки перегрузочной машины
 */
export default function SpentFuelPool({
  position = [6.8, 15.0, -5.2],
  rotation = [0, 0, 0],
}: SpentFuelPoolProps) {
  const poolL = 7.4; // длина (Z)
  const poolW = 5.2; // ширина (X)
  const poolDepth = 8.5; // глубина от отметки +15м вниз
  const waterY = -0.5; // зеркало воды на 0.5м ниже пола

  // Позиции сборок ТВС в ячейках стеллажа (сетка 4 x 7)
  const fuelAssemblyCoords = useMemo(() => {
    const coords: [number, number][] = [];
    const rows = 6;
    const cols = 4;
    const spacingX = (poolW - 1.4) / (cols - 1);
    const spacingZ = (poolL - 1.6) / (rows - 1);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Оставляем несколько свободных ячеек для реализма перегрузки
        if ((r === 1 && c === 2) || (r === 4 && c === 1)) continue;
        const x = -((cols - 1) * spacingX) / 2 + c * spacingX;
        const z = -((rows - 1) * spacingZ) / 2 + r * spacingZ;
        coords.push([x, z]);
      }
    }
    return coords;
  }, [poolL, poolW]);

  return (
    <group position={position} rotation={rotation} name="SpentFuelPool_VVER1000">
      {/* 1. Металлическая облицовка стен и дна шахты бассейна (нержавеющая сталь) */}
      <group position={[0, -poolDepth / 2, 0]}>
        {/* Дно бассейна */}
        <mesh position={[0, -poolDepth / 2 + 0.05, 0]} receiveShadow>
          <boxGeometry args={[poolW, 0.1, poolL]} />
          <primitive object={stainlessLinerMat} attach="material" />
        </mesh>
        {/* Боковые стены бассейна (внутри шахты) */}
        <mesh position={[-poolW / 2, 0, 0]} receiveShadow>
          <boxGeometry args={[0.1, poolDepth, poolL]} />
          <primitive object={stainlessLinerMat} attach="material" />
        </mesh>
        <mesh position={[poolW / 2, 0, 0]} receiveShadow>
          <boxGeometry args={[0.1, poolDepth, poolL]} />
          <primitive object={stainlessLinerMat} attach="material" />
        </mesh>
        <mesh position={[0, 0, -poolL / 2]} receiveShadow>
          <boxGeometry args={[poolW, poolDepth, 0.1]} />
          <primitive object={stainlessLinerMat} attach="material" />
        </mesh>
        <mesh position={[0, 0, poolL / 2]} receiveShadow>
          <boxGeometry args={[poolW, poolDepth, 0.1]} />
          <primitive object={stainlessLinerMat} attach="material" />
        </mesh>
      </group>

      {/* 2. Стеллажи уплотненного хранения (СУХ) и головки тепловыделяющих сборок (ТВС) */}
      <group position={[0, -poolDepth + 1.2, 0]}>
        {/* Основание стеллажа с ячейками */}
        <mesh receiveShadow>
          <boxGeometry args={[poolW - 0.6, 0.8, poolL - 0.8]} />
          <primitive object={stainlessLinerMat} attach="material" />
        </mesh>

        {/* Головки сборок ТВС с захватными кольцами и пружинными блоками */}
        {fuelAssemblyCoords.map(([fx, fz], idx) => (
          <group key={`fa-${idx}`} position={[fx, 0.6, fz]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.16, 0.16, 0.45, 6]} />
              <primitive object={fuelAssemblyNozzleMat} attach="material" />
            </mesh>
            {/* Яркая точка излучения на головке каждой активной ТВС */}
            <mesh position={[0, 0.24, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.04, 6]} />
              <meshBasicMaterial color="#00e5ff" />
            </mesh>
          </group>
        ))}
      </group>

      {/* 3. ОБЪЕМНОЕ СВЕЧЕНИЕ ЧЕРЕНКОВА В ТОЛЩЕ ВОДЫ БАССЕЙНА ВЫДЕРЖКИ */}
      <CherenkovVolumeGlow
        position={[0, -poolDepth / 2, 0]}
        radius={poolW * 0.45}
        height={poolDepth * 0.9}
        intensity={1.25}
        color="#00b4ff"
        isSpentFuelPool={true}
      />
      <CherenkovVolumeGlow
        position={[0, -poolDepth / 2, -1.2]}
        radius={poolW * 0.38}
        height={poolDepth * 0.85}
        intensity={0.9}
        color="#00e5ff"
        isSpentFuelPool={true}
      />

      {/* 4. Зеркало борированной воды бассейна выдержки */}
      <mesh position={[0, waterY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[poolW - 0.05, poolL - 0.05]} />
        <primitive object={boratedWaterMat} attach="material" />
      </mesh>

      {/* 5. Периметральное защитное желтое ограждение (#FFCC00) на отметке +15м */}
      {/* Стойки ограждения */}
      {Array.from({ length: 14 }).map((_, i) => {
        const perimeter = 2 * (poolW + poolL);
        const dist = (i / 14) * perimeter;
        let px = 0;
        let pz = 0;

        if (dist < poolW) {
          px = -poolW / 2 + dist;
          pz = -poolL / 2 - 0.2;
        } else if (dist < poolW + poolL) {
          px = poolW / 2 + 0.2;
          pz = -poolL / 2 + (dist - poolW);
        } else if (dist < 2 * poolW + poolL) {
          px = poolW / 2 - (dist - (poolW + poolL));
          pz = poolL / 2 + 0.2;
        } else {
          px = -poolW / 2 - 0.2;
          pz = poolL / 2 - (dist - (2 * poolW + poolL));
        }

        return (
          <group key={`sfp-post-${i}`} position={[px, 0.55, pz]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.025, 0.025, 1.1, 6]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* Верхние поручни ограждения */}
      {/* Северный и южный поручни */}
      {[-poolL / 2 - 0.2, poolL / 2 + 0.2].map((rz, ri) => (
        <mesh key={`sfp-hr-ns-${ri}`} position={[0, 1.1, rz]}>
          <boxGeometry args={[poolW + 0.4, 0.04, 0.04]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
      ))}
      {/* Западный и восточный поручни */}
      {[-poolW / 2 - 0.2, poolW / 2 + 0.2].map((rx, ri) => (
        <mesh key={`sfp-hr-ew-${ri}`} position={[rx, 1.1, 0]}>
          <boxGeometry args={[0.04, 0.04, poolL + 0.4]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
      ))}

      {/* Рельсовые пути перегрузочной машины МП-1000 вдоль бассейна */}
      {[-poolW / 2 - 0.55, poolW / 2 + 0.55].map((trackX, ti) => (
        <mesh key={`sfp-rail-${ti}`} position={[trackX, 0.04, 0]}>
          <boxGeometry args={[0.08, 0.06, poolL + 3.0]} />
          <primitive object={diamondWalkwayMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
