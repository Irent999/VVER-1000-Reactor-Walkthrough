/**
 * ============================================================================
 * ДЕАЭРАТОРНАЯ ЭТАЖЕРКА ВВЭР-1000 (VVER-1000 DEAERATOR COMPARTMENT / ANNEX)
 * ============================================================================
 * 
 * Массивный технологический корпус, непосредственно сопрягающий защитную
 * оболочку реакторного отделения (РО) с машинным / турбинным залом (МЗ):
 * - Расположен между контейнментом (X ≈ 21..23м) и машинным залом (X = 27..38м).
 * - Габариты: ширина по X = 11.5м (от X = 22.5м до X = 34.0м, центр X = 28.25м),
 *   протяженность по оси Z = 56м (от Z = -38м до Z = +18м, центр Z = -10м),
 *   высота: отметки от -5.5м (грунт) до +34.5м (кровля с деаэраторами).
 * - На верхнем ярусе (+24..+28м) установлены 2 горизонтальных деаэратора ДП-1000
 *   (деаэрационно-питательные баки емкостью по 185 м³ с колонками деаэрации K-1000).
 * - Через корпус проходят 4 главных паропровода острого пара (Ду 600, 6.0 МПа),
 *   питательные трубопроводы и гермопроходки из контейнмента в турбинный зал.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { FLOOR_LEVELS } from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

// Материалы промышленной палитры НВАЭС / Росатома
const wallBeigePanelMat = new THREE.MeshStandardMaterial({
  color: '#E8DCC4', // Теплые бежевые сэндвич-панели
  roughness: 0.78,
  metalness: 0.1,
});

const baseRedBrownSkirtMat = new THREE.MeshStandardMaterial({
  color: '#8B4513', // Красно-коричневый защитный цоколь
  roughness: 0.74,
  metalness: 0.12,
});

const structuralConcreteDark = new THREE.MeshStandardMaterial({
  color: '#5a626d',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.88,
  metalness: 0.04,
});

const deaeratorVesselMat = new THREE.MeshStandardMaterial({
  color: '#70933C', // Фирменная защитная салатово-оливковая окраска теплообменного оборудования
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.38,
  metalness: 0.65,
});

const steamPipeInsulatedMat = new THREE.MeshStandardMaterial({
  color: '#d4d8de',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.1, 0.1),
  roughness: 0.32,
  metalness: 0.82,
});

const valveMetalMat = new THREE.MeshStandardMaterial({
  color: '#b82a24', // Красная маркировка предохранительных и отсечных клапанов
  roughness: 0.45,
  metalness: 0.6,
});

const steelTrussMat = new THREE.MeshStandardMaterial({
  color: '#e2e5e9',
  roughness: 0.35,
  metalness: 0.85,
});

const glassWindowMat = new THREE.MeshStandardMaterial({
  color: '#1a3344',
  roughness: 0.1,
  metalness: 0.85,
  transparent: true,
  opacity: 0.7,
});

export default function DeaeratorBuilding() {
  const gY = FLOOR_LEVELS.ground; // -5.5m

  // Геометрические параметры деаэраторной этажерки
  const widthX = 11.0; // по X
  const lengthZ = 54.0; // по Z
  const heightY = 35.0; // от -5.5м до +29.5м
  const centerX = 28.5; // вплотную примыкает к гермооболочке контейнмента слева (X=23) и машзалу справа (X=34)
  const centerZ = -12.0; // выровнен по оси паропроводов и турбоагрегата

  const bentsZ = useMemo(() => {
    const list: number[] = [];
    for (let z = -lengthZ / 2 + 3; z <= lengthZ / 2 - 3; z += 9.5) {
      list.push(z);
    }
    return list;
  }, [lengthZ]);

  return (
    <group name="VVERUnit1_DeaeratorBuilding" position={[centerX, gY, centerZ]}>
      {/* 1. Фундаментная плита и цокольный железобетонный пояс */}
      <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthX + 0.6, 3.5, lengthZ + 0.6]} />
        <primitive object={baseRedBrownSkirtMat} attach="material" />
      </mesh>

      {/* 2. Основной объем здания (сэндвич-панели теплый беж) */}
      <mesh position={[0, 3.5 + (heightY - 3.5) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthX, heightY - 3.5, lengthZ]} />
        <primitive object={wallBeigePanelMat} attach="material" />
      </mesh>

      {/* 3. Горизонтальные фасадные ленты остекления на технологических ярусах */}
      {[-lengthZ / 2 - 0.1, lengthZ / 2 + 0.1].map((fz, fi) => (
        <group key={`dea-end-facade-${fi}`}>
          {[12.5, 20.5, 27.5].map((wy, wi) => (
            <mesh key={`dea-win-${fi}-${wi}`} position={[0, wy, fz]}>
              <boxGeometry args={[widthX - 2.0, 2.2, 0.2]} />
              <primitive object={glassWindowMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* 4. Несущие вертикальные железобетонные и стальные пилоны каркаса */}
      {bentsZ.map((bz) => (
        <group key={`dea-bent-${bz}`} position={[0, 0, bz]}>
          {[-widthX / 2 + 0.5, widthX / 2 - 0.5].map((bx, bi) => (
            <mesh key={`col-${bi}`} position={[bx, heightY / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.8, heightY, 0.8]} />
              <primitive object={structuralConcreteDark} attach="material" />
            </mesh>
          ))}
          {/* Межэтажные балки */}
          {[11.0, 18.5, 26.0].map((by, bi) => (
            <mesh key={`beam-${bi}`} position={[0, by, 0]}>
              <boxGeometry args={[widthX - 1.0, 0.6, 0.5]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* 5. Кровельный парапет по периметру */}
      <group position={[0, heightY + 0.6, 0]}>
        {[-widthX / 2 + 0.3, widthX / 2 - 0.3].map((px, pi) => (
          <mesh key={`par-x-${pi}`} position={[px, 0, 0]}>
            <boxGeometry args={[0.6, 1.2, lengthZ]} />
            <primitive object={wallBeigePanelMat} attach="material" />
          </mesh>
        ))}
        {[-lengthZ / 2 + 0.3, lengthZ / 2 - 0.3].map((pz, pi) => (
          <mesh key={`par-z-${pi}`} position={[0, 0, pz]}>
            <boxGeometry args={[widthX, 1.2, 0.6]} />
            <primitive object={wallBeigePanelMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* 6. ДЕАЭРАТОРЫ ПИТАТЕЛЬНОЙ ВОДЫ (ДП-1000): 2 массивных сосуда на кровле/ярусе +27м */}
      {[-13.0, 13.0].map((dz, di) => (
        <group key={`deaerator-${di}`} position={[0, heightY + 2.4, dz]}>
          {/* Седловые железобетонные опоры деаэраторного бака */}
          {[-3.0, 3.0].map((ox) => (
            <mesh key={`saddle-${ox}`} position={[ox, -1.2, 0]} castShadow>
              <boxGeometry args={[0.9, 2.4, 3.2]} />
              <primitive object={structuralConcreteDark} attach="material" />
            </mesh>
          ))}

          {/* Горизонтальный цилиндрический бак деаэратора (L = 14m, D = 3.4m) */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[1.7, 1.7, 12.5, 32]} />
            <primitive object={deaeratorVesselMat} attach="material" />
          </mesh>
          {/* Сферические днища бака */}
          {[-6.25, 6.25].map((cx, ci) => (
            <mesh
              key={`dome-${ci}`}
              position={[cx, 0, 0]}
              rotation={[0, ci === 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
              castShadow
            >
              <sphereGeometry args={[1.7, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={deaeratorVesselMat} attach="material" />
            </mesh>
          ))}

          {/* Вертикальная деаэрационная колонка (К-1000) по центру бака */}
          <mesh position={[0, 2.8, 0]} castShadow>
            <cylinderGeometry args={[1.1, 1.1, 3.8, 24]} />
            <primitive object={deaeratorVesselMat} attach="material" />
          </mesh>
          {/* Верхняя крышка деаэрационной колонки */}
          <mesh position={[0, 4.8, 0]} castShadow>
            <sphereGeometry args={[1.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <primitive object={deaeratorVesselMat} attach="material" />
          </mesh>

          {/* Паровые трубопроводы выпара и предохранительные клапаны */}
          <mesh position={[0, 5.8, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 1.6, 12]} />
            <primitive object={steamPipeInsulatedMat} attach="material" />
          </mesh>
          <mesh position={[0, 6.7, 0]} castShadow>
            <boxGeometry args={[0.8, 0.6, 0.6]} />
            <primitive object={valveMetalMat} attach="material" />
          </mesh>

          {/* Площадка обслуживания деаэратора с ограждением */}
          <mesh position={[0, 0.2, 2.3]}>
            <boxGeometry args={[11.5, 0.1, 1.2]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
          {/* Перила площадки */}
          <mesh position={[0, 0.8, 2.85]}>
            <boxGeometry args={[11.5, 0.05, 0.05]} />
            <primitive object={valveMetalMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* 7. Главные паропроводы острого пара (Ду 600), соединяющие РО с машзалом */}
      {[-18, -6, 6, 18].map((pz, pi) => (
        <group key={`main-steam-${pi}`} position={[0, 20.0, pz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.55, 0.55, widthX + 1.2, 20]} />
            <primitive object={steamPipeInsulatedMat} attach="material" />
          </mesh>
          {/* Фланцевые муфты и компенсаторы */}
          {[-3.5, 3.5].map((fx) => (
            <mesh key={`flange-${fx}`} position={[fx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.75, 0.75, 0.35, 20]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
