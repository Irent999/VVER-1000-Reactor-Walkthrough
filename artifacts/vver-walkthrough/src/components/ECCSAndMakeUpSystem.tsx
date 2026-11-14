import { useMemo } from 'react';
import * as THREE from 'three';
import { RPV, SAFETY_YELLOW, ROSATOM_LIME_GREEN, DARK_STEEL_COLOR } from '@/scene/constants';
import {
  diamondPlateMap, diamondPlateNormalMap, diamondPlateRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

// Материалы САОЗ и системы подпитки/продувки
const rosatomLimeGreenMat = new THREE.MeshStandardMaterial({
  color: ROSATOM_LIME_GREEN,
  roughness: 0.32,
  metalness: 0.35,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.04, 0.04),
});

const pipeMat = new THREE.MeshStandardMaterial({
  color: '#6c7a89',
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughnessMap: brushedSteelRoughnessMap,
  roughness: 0.28,
  metalness: 0.88,
});

const stainlessSteelMat = new THREE.MeshStandardMaterial({
  color: '#e2e8f0',
  map: brushedSteelMap,
  normalMap: brushedSteelNormalMap,
  roughness: 0.25,
  metalness: 0.9,
});

const safetyYellowMat = new THREE.MeshStandardMaterial({
  color: SAFETY_YELLOW,
  roughness: 0.35,
  metalness: 0.25,
});

const valveHousingMat = new THREE.MeshStandardMaterial({
  color: '#2b6cb0', // синяя маркировка арматуры подпитки и САОЗ
  roughness: 0.35,
  metalness: 0.45,
});

const diamondCatwalkMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  map: diamondPlateMap,
  normalMap: diamondPlateNormalMap,
  roughnessMap: diamondPlateRoughnessMap,
  roughness: 0.4,
  metalness: 0.8,
});

// Симметричные углы размещения 4 гидроемкостей САОЗ
// (с гарантированным зазором от стен R=22m и лестниц)
const ECCS_ANGLES = [
  -Math.PI * 0.18, // Емкость САОЗ №1 (Юго-Восток) -> Downcomer
  Math.PI * 0.68,  // Емкость САОЗ №2 (Северо-Запад) -> Upper Plenum
  Math.PI * 1.08,  // Емкость САОЗ №3 (Юго-Запад) -> Downcomer
  Math.PI * 1.58,  // Емкость САОЗ №4 (Северо-Восток) -> Upper Plenum
];

interface ECCSAndMakeUpSystemProps {
  rpvRadius?: number;
}

/**
 * Система пассивной безопасности САОЗ (ЕО САОЗ) и система подпитки-продувки (ТК):
 * 1. 4 гидроемкости САОЗ (объем 60 м³ каждая, давление 5.9 МПа) в 4 квадрантах
 * 2. Напорные трубопроводы САОЗ Ду 350, ведущие прямо в патрубки корпуса реактора (Downcomer и Upper Plenum)
 * 3. Блоки быстродействующих обратных клапанов (ОК САОЗ) и отсечной арматуры на каждой линии
 * 4. Узел регенеративного теплообменника продувки первого контура (ТК)
 * 5. Трубопроводы продувки и высоконапорной подпитки первого контура
 */
export default function ECCSAndMakeUpSystem({
  rpvRadius = RPV.radius,
}: ECCSAndMakeUpSystemProps) {
  const tankRadius = 1.35;
  const tankHeight = 6.8;
  const tankCenterRadius = 18.2; // радиальная привязка в боксах
  const tankY = 18.6; // отметка центра гидроемкости

  // Построение 4-х соединительных напорных линий САОЗ прямо в корпус реактора
  const eccsPipelines = useMemo(() => {
    return ECCS_ANGLES.map((angle, idx) => {
      const tx = Math.cos(angle) * tankCenterRadius;
      const tz = Math.sin(angle) * tankCenterRadius;
      const bottomNozzle = new THREE.Vector3(tx, tankY - tankHeight / 2 - tankRadius - 0.2, tz);

      // Целевой штуцер на корпусе реактора
      // Емкости 0 и 2 врезаются в опускной участок (Downcomer, Y ≈ 14.2м)
      // Емкости 1 и 3 врезаются в верхнюю камеру (Upper Plenum, Y ≈ 15.4м)
      const targetY = idx % 2 === 0 ? 14.2 : 15.4;
      const rpvNozzle = new THREE.Vector3(
        Math.cos(angle) * (rpvRadius + 0.3),
        targetY,
        Math.sin(angle) * (rpvRadius + 0.3)
      );

      // Промежуточные трассировочные точки с уклоном над полом +15м и вводом в шахту
      const step1 = new THREE.Vector3(Math.cos(angle) * 14.5, 15.35, Math.sin(angle) * 14.5);
      const step2 = new THREE.Vector3(Math.cos(angle) * 9.5, 15.35, Math.sin(angle) * 9.5);
      const step3 = new THREE.Vector3(Math.cos(angle) * 5.2, targetY + 0.3, Math.sin(angle) * 5.2);

      const curve = new THREE.CatmullRomCurve3([bottomNozzle, step1, step2, step3, rpvNozzle]);
      return { curve, tx, tz, angle, step2, targetY };
    });
  }, [tankCenterRadius, tankY, tankHeight, tankRadius, rpvRadius]);

  // Трассировка регенеративного теплообменника продувки ТК и линий подпитки
  const tkSkidPos = new THREE.Vector3(-8.8, 15.0, 7.5);

  const letdownCurve = useMemo(() => {
    // Отбор теплоносителя из холодной нитки петли №2
    const coldLegTap = new THREE.Vector3(-6.5, 15.2, 5.8);
    const mid1 = new THREE.Vector3(-7.6, 15.3, 6.8);
    const hxInlet = new THREE.Vector3(tkSkidPos.x + 0.8, 16.2, tkSkidPos.z);
    return new THREE.CatmullRomCurve3([coldLegTap, mid1, hxInlet]);
  }, [tkSkidPos]);

  const makeUpCurve = useMemo(() => {
    // Напорная линия подпитки от теплообменника ТК в холодную нитку
    const hxOutlet = new THREE.Vector3(tkSkidPos.x - 0.6, 15.8, tkSkidPos.z);
    const mid1 = new THREE.Vector3(-9.5, 15.3, 5.2);
    const coldLegInjection = new THREE.Vector3(-7.2, 14.6, 3.8);
    return new THREE.CatmullRomCurve3([hxOutlet, mid1, coldLegInjection]);
  }, [tkSkidPos]);

  return (
    <group name="ECCS_And_MakeUp_System_VVER1000">
      {/* ================================================================== */}
      {/* 1. 4 ГИДРОЕМКОСТИ САОЗ (ЕО САОЗ №1..№4)                           */}
      {/* ================================================================== */}
      {ECCS_ANGLES.map((angle, idx) => {
        const tx = Math.cos(angle) * tankCenterRadius;
        const tz = Math.sin(angle) * tankCenterRadius;

        return (
          <group key={`eccs-accumulator-${idx}`} position={[tx, tankY, tz]}>
            {/* Вертикальный цилиндрический корпус в покрытии Rosatom (#8DB600) */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[tankRadius, tankRadius, tankHeight, 16]} />
              <primitive object={rosatomLimeGreenMat} attach="material" />
            </mesh>
            {/* Верхнее полусферическое днище гидроемкости */}
            <mesh position={[0, tankHeight / 2, 0]} castShadow>
              <sphereGeometry args={[tankRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={rosatomLimeGreenMat} attach="material" />
            </mesh>
            {/* Нижнее полусферическое днище гидроемкости */}
            <mesh position={[0, -tankHeight / 2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
              <sphereGeometry args={[tankRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={rosatomLimeGreenMat} attach="material" />
            </mesh>
            {/* Опорная цилиндрическая обечайка с анкерными болтами к отметке +15м */}
            <mesh position={[0, -tankHeight / 2 - 1.2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[tankRadius + 0.15, tankRadius + 0.35, 2.4, 16, 1, true]} />
              <primitive object={DARK_STEEL_COLOR ? pipeMat : stainlessSteelMat} attach="material" />
            </mesh>

            {/* Верхний штуцер подачи азота и импульсный предохранительный клапан */}
            <mesh position={[0, tankHeight / 2 + tankRadius + 0.35, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.18, 0.7, 10]} />
              <primitive object={pipeMat} attach="material" />
            </mesh>
            <mesh position={[0, tankHeight / 2 + tankRadius + 0.8, 0]} castShadow>
              <boxGeometry args={[0.35, 0.45, 0.35]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>

            {/* Колонки дифференциальных уровнемеров и манометров азотной подушки */}
            <mesh position={[tankRadius + 0.25, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, tankHeight * 0.75, 6]} />
              <primitive object={stainlessSteelMat} attach="material" />
            </mesh>

            {/* Круговая смотровая площадка обслуживания гидроемкости */}
            <mesh position={[0, tankHeight / 2 - 0.2, 0]}>
              <ringGeometry args={[tankRadius + 0.15, tankRadius + 0.95, 16]} />
              <primitive object={diamondCatwalkMat} attach="material" side={THREE.DoubleSide} />
            </mesh>
            {/* Ограждение площадки безопасности */}
            <mesh position={[0, tankHeight / 2 + 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[tankRadius + 0.95, 0.03, 6, 16]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* ================================================================== */}
      {/* 2. НАПОРНЫЕ ТРУБОПРОВОДЫ САОЗ (ДУ 350) С БЛОКАМИ ОБРАТНЫХ КЛАПАНОВ */}
      {/* ================================================================== */}
      {eccsPipelines.map((pipe, idx) => (
        <group key={`eccs-pipe-assembly-${idx}`}>
          {/* Трубопровод Ду 350 от емкости прямо в корпус реактора */}
          <mesh castShadow receiveShadow>
            <tubeGeometry args={[pipe.curve, 18, 0.18, 8, false]} />
            <primitive object={pipeMat} attach="material" />
          </mesh>

          {/* Блок безопасности САОЗ: быстродействующая задвижка + 2 обратных клапана ОК САОЗ */}
          <group position={[pipe.step2.x, pipe.step2.y, pipe.step2.z]} rotation={[0, -pipe.angle, 0]}>
            {/* Быстродействующая запорная задвижка с электроприводом */}
            <mesh position={[-0.6, 0, 0]}>
              <boxGeometry args={[0.4, 0.45, 0.4]} />
              <primitive object={valveHousingMat} attach="material" />
            </mesh>
            <mesh position={[-0.6, 0.4, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.4, 10]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>

            {/* Первый обратный клапан (ОК-1 САОЗ) */}
            <mesh position={[0.0, 0, 0]}>
              <cylinderGeometry args={[0.26, 0.26, 0.35, 12]} />
              <primitive object={valveHousingMat} attach="material" />
            </mesh>
            {/* Второй обратный клапан (ОК-2 САОЗ) для резервирования герметичности */}
            <mesh position={[0.6, 0, 0]}>
              <cylinderGeometry args={[0.26, 0.26, 0.35, 12]} />
              <primitive object={valveHousingMat} attach="material" />
            </mesh>

            {/* Стрелка направления потока в реактор */}
            <mesh position={[0, 0.28, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.08, 0.22, 8]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>

          {/* Усиленный вводной патрубок в шахту корпуса реактора */}
          <mesh
            position={[
              Math.cos(pipe.angle) * (rpvRadius + 0.35),
              pipe.targetY,
              Math.sin(pipe.angle) * (rpvRadius + 0.35),
            ]}
            rotation={[0, -pipe.angle, 0]}
          >
            <cylinderGeometry args={[0.26, 0.26, 0.45, 14]} />
            <primitive object={stainlessSteelMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ================================================================== */}
      {/* 3. СИСТЕМА ПОДПИТКИ И ПРОДУВКИ ПЕРВОГО КОНТУРА (ТК)                 */}
      {/* ================================================================== */}
      <group position={[tkSkidPos.x, tkSkidPos.y, tkSkidPos.z]}>
        {/* Опорная рама регенеративного теплообменника продувки */}
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.8, 1.6]} />
          <primitive object={pipeMat} attach="material" />
        </mesh>

        {/* 3 секции теплообменника «труба в трубе» ТК */}
        {[-0.6, 0, 0.6].map((tx, ti) => (
          <group key={`hx-sec-${ti}`} position={[tx, 1.4, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.25, 1.4, 16]} />
              <primitive object={stainlessSteelMat} attach="material" />
            </mesh>
            {/* Фланцевые калачи перетока */}
            <mesh position={[0, 0, 0.75]}>
              <torusGeometry args={[0.18, 0.06, 6, 12, Math.PI]} />
              <primitive object={pipeMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Блок регулирующих вентилей продувки и подпитки с электроприводами */}
        {[-0.5, 0.5].map((vx, vi) => (
          <group key={`tk-valv-${vi}`} position={[vx, 2.3, 0.3]}>
            <mesh>
              <boxGeometry args={[0.3, 0.35, 0.3]} />
              <primitive object={valveHousingMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.35, 8]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Трубопровод продувки от холодной нитки петли №2 в теплообменник ТК */}
      <mesh castShadow>
        <tubeGeometry args={[letdownCurve, 16, 0.08, 8, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>

      {/* Высоконапорный трубопровод подпитки от теплообменника ТК обратно в контур */}
      <mesh castShadow>
        <tubeGeometry args={[makeUpCurve, 16, 0.08, 8, false]} />
        <primitive object={pipeMat} attach="material" />
      </mesh>
    </group>
  );
}
