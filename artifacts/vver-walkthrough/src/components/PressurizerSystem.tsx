import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SAFETY_YELLOW, DARK_STEEL_COLOR, ROSATOM_LIME_GREEN } from '@/scene/constants';
import {
  diamondPlateMap, diamondPlateNormalMap, diamondPlateRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
  concreteMap, concreteNormalMap, concreteRoughnessMap,
} from '@/scene/pbrTextures';
import { reactorStateManager } from '@/scene/reactorStateManager';

// Материалы компенсатора давления и бака-барботера
const pressurizerInsulationMat = new THREE.MeshStandardMaterial({
  color: '#c8d1d9',
  map: brushedSteelMap,
  normalMap: brushedSteelNormalMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalScale: new THREE.Vector2(0.1, 0.1),
  roughness: 0.32,
  metalness: 0.85,
});

const reliefTankMat = new THREE.MeshStandardMaterial({
  color: ROSATOM_LIME_GREEN,
  map: brushedSteelMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.06, 0.06),
  roughness: 0.35,
  metalness: 0.45,
});

const pipeMat = new THREE.MeshStandardMaterial({
  color: '#718096',
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughness: 0.3,
  metalness: 0.88,
});

const valveRedMat = new THREE.MeshStandardMaterial({
  color: '#e53e3e',
  roughness: 0.35,
  metalness: 0.4,
});

const safetyYellowMat = new THREE.MeshStandardMaterial({
  color: SAFETY_YELLOW,
  roughness: 0.35,
  metalness: 0.25,
});

const diamondCatwalkMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: diamondPlateMap,
  normalMap: diamondPlateNormalMap,
  roughnessMap: diamondPlateRoughnessMap,
  roughness: 0.42,
  metalness: 0.78,
});

const concreteBoxMat = new THREE.MeshStandardMaterial({
  color: '#a0aec0',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.85,
  metalness: 0.03,
});

interface PressurizerSystemProps {
  hotLegPoint?: THREE.Vector3;
  coldLegPoint?: THREE.Vector3;
}

/**
 * Высокоточная геометрическая модель системы компенсации давления ВВЭР-1000 (В-320):
 * 1. Компенсатор давления (КД): вертикальный сосуд 79 м³, диаметр 3.3м, высота 13.8м
 * 2. Дыхательный трубопровод (surge line Ду 350) с пространственным компенсатором от горячей нитки
 * 3. Линия холодного впрыска (Ду 150/200) с регулирующей арматурой и коллектором форсунок
 * 4. Импульсно-предохранительные клапаны (ИПК КД) на верхнем куполе КД
 * 5. Сбросной паропровод от ИПК в бак-барботер
 * 6. Бак-барботер (PRT): горизонтальный сосуд ~30 м³ с барботажным коллектором
 * 7. Бетонный бокс КД и решетчатые ярусные площадки обслуживания с поручнями (#FFCC00)
 */
export default function PressurizerSystem({
  hotLegPoint = new THREE.Vector3(-9.2, 16.5, -4.8),
  coldLegPoint = new THREE.Vector3(-10.8, 14.8, -1.2),
}: PressurizerSystemProps) {
  // Координаты размещения компенсатора давления (КД) в специализированном боксе
  const pzX = -13.5;
  const pzY = 15.0; // отметка основания опорной обечайки
  const pzZ = -8.2;

  // Размеры КД (В-320: объем 79 м³, диаметр корпуса 3.3м, высота 13.8м)
  const pzRadius = 1.65;
  const cylinderHeight = 8.5;
  const bottomHeadCenterY = pzY + 3.2;
  const cylinderCenterY = bottomHeadCenterY + cylinderHeight / 2;
  const topHeadCenterY = bottomHeadCenterY + cylinderHeight;

  // Координаты бака-барботера (PRT) в нижнем смежном отсеке
  const bbX = -14.2;
  const bbY = 11.2;
  const bbZ = -4.2;
  const bbRadius = 1.2;
  const bbLength = 6.4;

  // 1. Дыхательный трубопровод (surge line Ду 350) от горячей нитки к нижнему штуцеру КД
  const surgeCurve = useMemo(() => {
    const bottomNozzle = new THREE.Vector3(pzX, bottomHeadCenterY - pzRadius - 0.4, pzZ);
    const mid1 = new THREE.Vector3((hotLegPoint.x + pzX) / 2 + 0.6, hotLegPoint.y - 0.5, (hotLegPoint.z + pzZ) / 2 - 0.8);
    const mid2 = new THREE.Vector3(pzX + 1.2, bottomNozzle.y - 1.2, pzZ + 1.2);
    const mid3 = new THREE.Vector3(pzX + 0.3, bottomNozzle.y - 0.8, pzZ);
    return new THREE.CatmullRomCurve3([hotLegPoint, mid1, mid2, mid3, bottomNozzle]);
  }, [hotLegPoint, pzX, bottomHeadCenterY, pzRadius, pzZ]);

  // 2. Линия впрыска (spray line Ду 150) от холодной нитки к верхнему куполу КД
  const sprayCurve = useMemo(() => {
    const topSprayNozzle = new THREE.Vector3(pzX + 0.4, topHeadCenterY + pzRadius + 0.5, pzZ);
    const valveStation = new THREE.Vector3(pzX + pzRadius + 0.6, pzY + 10.0, pzZ + 0.4);
    const intermediate1 = new THREE.Vector3(coldLegPoint.x - 0.5, coldLegPoint.y + 0.8, coldLegPoint.z - 0.8);
    const intermediate2 = new THREE.Vector3(pzX + pzRadius + 0.6, pzY + 4.5, pzZ + 0.8);
    return new THREE.CatmullRomCurve3([coldLegPoint, intermediate1, intermediate2, valveStation, topSprayNozzle]);
  }, [coldLegPoint, pzX, pzRadius, pzY, topHeadCenterY, pzZ]);

  // 3. Сбросной трубопровод от ИПК КД в бак-барботер
  const reliefCurve = useMemo(() => {
    const ipkTop = new THREE.Vector3(pzX, topHeadCenterY + pzRadius + 1.4, pzZ);
    const bend1 = new THREE.Vector3(pzX - 0.9, topHeadCenterY + pzRadius + 1.0, pzZ + 0.6);
    const drop = new THREE.Vector3(pzX - 1.2, pzY + 4.0, pzZ + 1.2);
    const bbInlet = new THREE.Vector3(bbX, bbY + bbRadius + 0.3, bbZ);
    return new THREE.CatmullRomCurve3([ipkTop, bend1, drop, bbInlet]);
  }, [pzX, topHeadCenterY, pzRadius, pzZ, pzY, bbX, bbY, bbRadius, bbZ]);

  // Пульсирующая индикация давления в КД
  const heaterGlowRef = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (heaterGlowRef.current) {
      const v = reactorStateManager.vverState;
      const t = state.clock.elapsedTime;
      // ТЭНы работают для поддержания давления 15.70 МПа
      const heaterActive = !v.scramActive && v.primaryPressureMPa > 14.5;
      heaterGlowRef.current.intensity = heaterActive
        ? 1.5 + Math.sin(t * 4.0) * 0.4
        : 0.2;
    }
  });

  return (
    <group name="PressurizerAndReliefSystem_VVER1000">
      {/* ================================================================== */}
      {/* 1. БЕТОННЫЙ БОКС КОМПЕНСАТОРА ДАВЛЕНИЯ                             */}
      {/* ================================================================== */}
      <group position={[pzX, pzY + 7.0, pzZ]}>
        {/* Задняя защитная стенка бокса */}
        <mesh position={[0, 0, -2.6]} receiveShadow>
          <boxGeometry args={[5.2, 14.5, 0.4]} />
          <primitive object={concreteBoxMat} attach="material" />
        </mesh>
        {/* Боковая разделительная стенка бокса */}
        <mesh position={[-2.6, 0, 0]} receiveShadow>
          <boxGeometry args={[0.4, 14.5, 5.2]} />
          <primitive object={concreteBoxMat} attach="material" />
        </mesh>
      </group>

      {/* ================================================================== */}
      {/* 2. КОРПУС КОМПЕНСАТОРА ДАВЛЕНИЯ (КД В-320)                        */}
      {/* ================================================================== */}
      <group position={[pzX, 0, pzZ]}>
        {/* Опорная цилиндрическая обечайка (юбка) */}
        <mesh position={[0, pzY + 1.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[pzRadius + 0.08, pzRadius + 0.25, 3.2, 32, 1, true]} />
          <primitive object={pressurizerInsulationMat} attach="material" />
        </mesh>

        {/* Нижнее эллиптическое днище КД */}
        <mesh position={[0, bottomHeadCenterY, 0]} rotation={[Math.PI, 0, 0]} castShadow receiveShadow>
          <sphereGeometry args={[pzRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={pressurizerInsulationMat} attach="material" />
        </mesh>

        {/* Блок электрических нагревателей (ТЭН: 28 нагревательных пучков мощностью 2520 кВт) */}
        <group position={[0, bottomHeadCenterY - pzRadius + 0.3, 0]}>
          {Array.from({ length: 20 }).map((_, i) => {
            const a = (i / 20) * Math.PI * 2;
            const tr = 0.5 + (i % 3) * 0.35;
            return (
              <mesh key={`ten-${i}`} position={[Math.cos(a) * tr, -0.4, Math.sin(a) * tr]}>
                <cylinderGeometry args={[0.045, 0.045, 0.8, 8]} />
                <primitive object={safetyYellowMat} attach="material" />
              </mesh>
            );
          })}
          {/* Световое тепловое свечение ТЭНов под днищем КД */}
          <pointLight
            ref={heaterGlowRef}
            position={[0, -0.2, 0]}
            color="#ff5500"
            intensity={1.5}
            distance={6.0}
          />
        </group>

        {/* Цилиндрическая обечайка корпуса КД с металлизированной изоляцией */}
        <mesh position={[0, cylinderCenterY, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[pzRadius, pzRadius, cylinderHeight, 32]} />
          <primitive object={pressurizerInsulationMat} attach="material" />
        </mesh>

        {/* Фирменные пояса жесткости и бандажные кольца КД */}
        {[-2.5, 0, 2.5].map((ringY, ri) => (
          <mesh key={`pz-ring-${ri}`} position={[0, cylinderCenterY + ringY, 0]}>
            <torusGeometry args={[pzRadius + 0.05, 0.06, 8, 32]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        ))}

        {/* Верхнее эллиптическое днище КД */}
        <mesh position={[0, topHeadCenterY, 0]} castShadow receiveShadow>
          <sphereGeometry args={[pzRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={pressurizerInsulationMat} attach="material" />
        </mesh>

        {/* Люк-лаз верхний Ду 450 с фланцевой заглушкой */}
        <mesh position={[0, topHeadCenterY + pzRadius + 0.15, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.3, 20]} />
          <primitive object={pipeMat} attach="material" />
        </mesh>

        {/* 3 Импульсно-предохранительных клапана (ИПК КД) с электромагнитным приводом */}
        {[-0.65, 0, 0.65].map((valvX, vi) => (
          <group key={`ipk-valve-${vi}`} position={[valvX, topHeadCenterY + pzRadius + 0.7, 0.35]}>
            {/* Штуцер клапана */}
            <mesh>
              <cylinderGeometry args={[0.14, 0.14, 0.6, 12]} />
              <primitive object={pipeMat} attach="material" />
            </mesh>
            {/* Корпус клапана */}
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[0.35, 0.4, 0.35]} />
              <primitive object={valveRedMat} attach="material" />
            </mesh>
            {/* Электромагнитный привод импульсного сброса */}
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.45, 12]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Ярусные площадки обслуживания КД (+19.5м и +25.5м) */}
        {[19.5, 25.5].map((catY, ci) => (
          <group key={`catwalk-${ci}`} position={[0, catY, 0]}>
            {/* Решетчатый настил круговой галереи */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <ringGeometry args={[pzRadius + 0.15, pzRadius + 1.1, 28]} />
              <primitive object={diamondCatwalkMat} attach="material" side={THREE.DoubleSide} />
            </mesh>
            {/* Опорные кронштейны */}
            {Array.from({ length: 8 }).map((_, bi) => {
              const ba = (bi / 8) * Math.PI * 2;
              return (
                <mesh key={`bkt-${bi}`} position={[Math.cos(ba) * (pzRadius + 0.5), -0.3, Math.sin(ba) * (pzRadius + 0.5)]}>
                  <boxGeometry args={[0.9, 0.6, 0.08]} />
                  <primitive object={pipeMat} attach="material" />
                </mesh>
              );
            })}
            {/* Желтое защитное перильное ограждение */}
            <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[pzRadius + 1.1, 0.028, 6, 28]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Вертикальная лестница-стремянка между ярусами с защитным ограждением */}
        <group position={[pzRadius + 0.75, pzY + 2.0, 0.8]}>
          <mesh position={[0, 5.0, 0]}>
            <boxGeometry args={[0.04, 10.0, 0.04]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          <mesh position={[0.45, 5.0, 0]}>
            <boxGeometry args={[0.04, 10.0, 0.04]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
          {Array.from({ length: 22 }).map((_, si) => (
            <mesh key={`lad-step-${si}`} position={[0.22, si * 0.45, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.45, 6]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          ))}
        </group>
      </group>

      {/* ================================================================== */}
      {/* 3. ТРУБОПРОВОДЫ ОБВЯЗКИ КОМПЕНСАТОРА ДАВЛЕНИЯ                       */}
      {/* ================================================================== */}
      {/* А. Дыхательный трубопровод (surge line Ду 350) с теплоизоляцией */}
      <mesh castShadow receiveShadow>
        <tubeGeometry args={[surgeCurve, 36, 0.22, 16, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Фланцы и сварные швы на дыхательной линии */}
      <mesh position={[pzX, bottomHeadCenterY - pzRadius - 0.25, pzZ]}>
        <cylinderGeometry args={[0.32, 0.32, 0.15, 16]} />
        <primitive object={safetyYellowMat} attach="material" />
      </mesh>

      {/* Б. Линия впрыска (spray line Ду 150/200) от холодной нитки/подпитки */}
      <mesh castShadow>
        <tubeGeometry args={[sprayCurve, 32, 0.12, 12, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
      {/* Блок регулирующих клапанов впрыска на отметке +25м */}
      <group position={[pzX + pzRadius + 0.6, pzY + 10.0, pzZ + 0.4]}>
        <mesh>
          <boxGeometry args={[0.35, 0.35, 0.55]} />
          <primitive object={valveRedMat} attach="material" />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.4, 12]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
      </group>

      {/* В. Сбросной трубопровод от ИПК в бак-барботер */}
      <mesh castShadow>
        <tubeGeometry args={[reliefCurve, 32, 0.16, 12, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>

      {/* ================================================================== */}
      {/* 4. БАК-БАРБОТЕР (PRESSURIZER RELIEF TANK - PRT)                    */}
      {/* ================================================================== */}
      <group position={[bbX, bbY, bbZ]}>
        {/* Горизонтальный цилиндрический корпус в фирменном покрытии Rosatom */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[bbRadius, bbRadius, bbLength, 28]} />
          <primitive object={reliefTankMat} attach="material" />
        </mesh>
        {/* Эллиптические днища бака-барботера */}
        <mesh position={[bbLength / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <sphereGeometry args={[bbRadius, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={reliefTankMat} attach="material" />
        </mesh>
        <mesh position={[-bbLength / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <sphereGeometry args={[bbRadius, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={reliefTankMat} attach="material" />
        </mesh>

        {/* Тяжелые седловые опоры бака-барботера */}
        {[-bbLength / 3, bbLength / 3].map((sx, si) => (
          <mesh key={`bb-saddle-${si}`} position={[sx, -bbRadius - 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.8, bbRadius * 2.1]} />
            <primitive object={pressurizerInsulationMat} attach="material" />
          </mesh>
        ))}

        {/* Входной патрубок сброса пара от ИПК КД с барботажным коллектором */}
        <mesh position={[0, bbRadius + 0.3, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.6, 16]} />
          <primitive object={pipeMat} attach="material" />
        </mesh>

        {/* Блок предохранительных разрывных мембран бака-барботера */}
        <mesh position={[1.4, bbRadius + 0.25, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.25, 16]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>

        {/* Штуцеры азотной подушки и уровнемерная колонка */}
        <mesh position={[-1.4, bbRadius + 0.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
          <primitive object={pipeMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
