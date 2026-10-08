/**
 * ============================================================================
 * ДЕТАЛЬНАЯ ИНТЕРАКТИВНАЯ 3D-МОДЕЛЬ МАЛОЙ АЭС НА БАЗЕ РЕАКТОРА РИТМ-200Н (АСММ)
 * ============================================================================
 * 
 * Включает:
 * 1. Архитектура и габариты защитного здания АСММ (прямоугольный модульный корпус
 *    с синей кровлей #1F4E79 и полуоткрытым разрезом стены для обзора интерьера).
 * 2. Интегральный реакторный блок РИТМ-200Н:
 *    - Единый стальной корпус реактора с разрезом
 *    - Активная зона с кассетами ТВС и опорной решеткой в нижней части
 *    - Встроенные парогенераторы (12 кассет вокруг центральной шахты внутри корпуса)
 *    - Приводы СУЗ (системы управления и защиты) на крышке реактора
 *    - 4 компактных бессальниковых электронасоса (ГЦЭН), смонтированных прямо на корпусе
 * 3. Вспомогательные системы:
 *    - Бак-барботер / компенсатор давления и пассивные гидроемкости САОЗ/СПОР
 * 4. Компактный машинный зал:
 *    - Паровая турбина, конденсатор и турбогенератор 55-60 МВт, связанные паропроводами
 * 5. Блочный пункт управления (БЩУ) малой АЭС с мнемосхемами и пультами операторов
 * 6. Оптимизация памяти (8 ГБ RAM) и поддержка WebXR/VR.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOOR_LEVELS } from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

// ============================================================================
// PBR-МАТЕРИАЛЫ АСММ РИТМ-200Н
// ============================================================================

// Серебристо-стальной аустенитный корпус интегрального реактора
const reactorVesselSteelMat = new THREE.MeshStandardMaterial({
  color: '#c8d0d8',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.18, 0.18),
  roughness: 0.28,
  metalness: 0.82,
});

// Внутренняя поверхность корпуса реактора (матовая нержавеющая сталь)
const vesselInnerSteelMat = new THREE.MeshStandardMaterial({
  color: '#9aa0a6',
  roughness: 0.35,
  metalness: 0.75,
  side: THREE.BackSide,
});

// Активная зона: циркониевые твэлы и кассеты ТВС
const fuelAssemblyMat = new THREE.MeshStandardMaterial({
  color: '#a6b1ba',
  roughness: 0.38,
  metalness: 0.65,
});

// Опорные решетки и выгородка активной зоны
const coreBasketMat = new THREE.MeshStandardMaterial({
  color: '#6c757d',
  roughness: 0.45,
  metalness: 0.70,
});

// Свечение Вавилова-Черенкова в активной зоне (мягкое голубое свечение)
const cherenkovGlowMat = new THREE.MeshBasicMaterial({
  color: '#00d2ff',
  transparent: true,
  opacity: 0.45,
});

// Встроенные парогенераторы (змеевиковые кассеты труб из титана/нержавеющей стали)
const steamGenCassetteMat = new THREE.MeshStandardMaterial({
  color: '#dbe2e8',
  roughness: 0.30,
  metalness: 0.78,
});

// Приводы СУЗ (серый металл с сигнальными маркировками)
const crdmHousingMat = new THREE.MeshStandardMaterial({
  color: '#495057',
  roughness: 0.35,
  metalness: 0.80,
});

const crdmIndicatorMat = new THREE.MeshStandardMaterial({
  color: '#ffc107',
  emissive: '#ff9800',
  emissiveIntensity: 0.4,
  roughness: 0.2,
  metalness: 0.5,
});

// Компактные бессальниковые ГЦЭН на корпусе
const pumpCasingMat = new THREE.MeshStandardMaterial({
  color: '#343a40',
  roughness: 0.40,
  metalness: 0.75,
});

// Матовый архитектурный бетон стен реакторного здания (roughness: 0.85)
const containmentWallConcreteMat = new THREE.MeshStandardMaterial({
  color: '#E3E5E8', // Светло-серый монолитный бетон НВАЭС
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.24, 0.24),
  roughness: 0.86,
  metalness: 0.03,
});

// Внутренний бетон биологической защиты шахты реактора
const bioShieldConcreteMat = new THREE.MeshStandardMaterial({
  color: '#8A8E94',
  roughness: 0.88,
  metalness: 0.02,
});

// Корпоративный кобальтово-синий оттенок Росатом для кровли и отделки (#1F4E79)
const smrCobaltBlueMat = new THREE.MeshStandardMaterial({
  color: '#1F4E79',
  roughness: 0.42,
  metalness: 0.48,
});

// Сигнальный желтый цвет полярного крана и трапов
const safetyYellowMat = new THREE.MeshStandardMaterial({
  color: '#FFCC00',
  roughness: 0.35,
  metalness: 0.20,
  emissive: '#332600',
  emissiveIntensity: 0.06,
});

// Турбоагрегат АСММ (турбина и турбогенератор)
const turbineMetalMat = new THREE.MeshStandardMaterial({
  color: '#2b303a',
  roughness: 0.35,
  metalness: 0.80,
});

const generatorCasingMat = new THREE.MeshStandardMaterial({
  color: '#1b5299', // Яркий индустриальный синий генератора
  roughness: 0.40,
  metalness: 0.50,
});

// Трубопроводы пара (термоизолированные)
const steamPipeMat = new THREE.MeshStandardMaterial({
  color: '#e2e6ea',
  roughness: 0.32,
  metalness: 0.75,
});

// Трубопроводы САОЗ/питательной воды (синий цвет)
const feedwaterPipeMat = new THREE.MeshStandardMaterial({
  color: '#1d6fa5',
  roughness: 0.42,
  metalness: 0.55,
});

// Дисплеи и мнемосхемы БЩУ
const mcrScreenGlowMat = new THREE.MeshBasicMaterial({
  color: '#48cae4',
});

const mcrConsoleMat = new THREE.MeshStandardMaterial({
  color: '#212529',
  roughness: 0.60,
  metalness: 0.25,
});

// Прозрачное стекло фасадного разреза
const cutawayGlassMat = new THREE.MeshStandardMaterial({
  color: '#a0c4d8',
  transparent: true,
  opacity: 0.22,
  roughness: 0.1,
  metalness: 0.8,
  depthWrite: false,
});

// ============================================================================
// 1. ИНТЕГРАЛЬНЫЙ РЕАКТОРНЫЙ БЛОК РИТМ-200Н С РАЗРЕЗОМ
// ============================================================================

interface IntegralReactorProps {
  position?: [number, number, number];
}

export function IntegralReactorVesselRITM200N({ position = [0, 0, 0] }: IntegralReactorProps) {
  const rpvRadius = 1.9; // Радиус корпуса ~1.9м (диаметр 3.8м)
  const rpvHeight = 11.0; // Высота цилиндрической части
  const coreRef = useRef<THREE.Group>(null);
  const pumpsRef = useRef<THREE.Group>(null);

  // Небольшая пульсация свечения активной зоны
  useFrame((state) => {
    if (coreRef.current) {
      const s = 1.0 + Math.sin(state.clock.elapsedTime * 2.0) * 0.05;
      coreRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group position={position} name="RITM200N_IntegralReactor">
      {/* ------------------------------------------------------------- */}
      {/* А. Корпус Реактора (Полуоткрытый разрез 180° спереди) */}
      {/* ------------------------------------------------------------- */}
      {/* Задняя полуцилиндрическая стенка корпуса */}
      <mesh position={[0, rpvHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[rpvRadius, rpvRadius, rpvHeight, 32, 1, false, Math.PI, Math.PI]} />
        <primitive object={reactorVesselSteelMat} attach="material" />
      </mesh>
      {/* Внутренняя рубашка задней стенки */}
      <mesh position={[0, rpvHeight / 2, 0]}>
        <cylinderGeometry args={[rpvRadius - 0.15, rpvRadius - 0.15, rpvHeight, 32, 1, false, Math.PI, Math.PI]} />
        <primitive object={vesselInnerSteelMat} attach="material" />
      </mesh>
      {/* Боковые торцевые кромки разреза корпуса */}
      {[-rpvRadius + 0.075, rpvRadius - 0.075].map((kx, ki) => (
        <mesh key={`cut-edge-${ki}`} position={[kx, rpvHeight / 2, 0]}>
          <boxGeometry args={[0.15, rpvHeight, 0.05]} />
          <primitive object={reactorVesselSteelMat} attach="material" />
        </mesh>
      ))}

      {/* Нижнее эллиптическое днище корпуса */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <sphereGeometry args={[rpvRadius, 32, 16, Math.PI, Math.PI, Math.PI / 2, Math.PI / 2]} />
        <primitive object={reactorVesselSteelMat} attach="material" />
      </mesh>

      {/* Верхний фланец корпуса реактора */}
      <mesh position={[0, rpvHeight, 0]} castShadow>
        <cylinderGeometry args={[rpvRadius + 0.35, rpvRadius + 0.35, 0.6, 32, 1, false, Math.PI, Math.PI]} />
        <primitive object={reactorVesselSteelMat} attach="material" />
      </mesh>
      {/* Шпильки главного разъема фланца */}
      {Array.from({ length: 12 }).map((_, si) => {
        const ang = Math.PI + (si / 11) * Math.PI;
        const sr = rpvRadius + 0.18;
        return (
          <mesh key={`stud-${si}`} position={[Math.cos(ang) * sr, rpvHeight + 0.35, Math.sin(ang) * sr]}>
            <cylinderGeometry args={[0.045, 0.045, 0.7, 8]} />
            <primitive object={reactorVesselSteelMat} attach="material" />
          </mesh>
        );
      })}

      {/* Верхняя полусферическая крышка реактора */}
      <mesh position={[0, rpvHeight + 0.3, 0]} castShadow>
        <sphereGeometry args={[rpvRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={reactorVesselSteelMat} attach="material" />
      </mesh>

      {/* Центральная шахта реактора (разделительная обечайка между опускным участком и ПГ) */}
      <mesh position={[0, rpvHeight / 2, 0]}>
        <cylinderGeometry args={[0.95, 0.95, rpvHeight - 1.2, 24, 1, false, Math.PI, Math.PI]} />
        <primitive object={coreBasketMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------- */}
      {/* Б. Активная Зона с кассетами ТВС (Нижняя часть корпуса) */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, 1.2, 0]} name="RITM200N_Core">
        {/* Нижняя опорная плита активной зоны */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[1.55, 1.55, 0.35, 24]} />
          <primitive object={coreBasketMat} attach="material" />
        </mesh>

        {/* Черенковское свечение вокруг активной зоны */}
        <group ref={coreRef}>
          <mesh position={[0, 1.8, 0]}>
            <cylinderGeometry args={[1.52, 1.52, 3.2, 24, 1, true]} />
            <primitive object={cherenkovGlowMat} attach="material" />
          </mesh>
        </group>

        {/* Пакет шестигранных тепловыделяющих сборок (ТВС) активной зоны */}
        {useMemo(() => {
          const assemblies: Array<[number, number]> = [];
          const pitch = 0.32;
          for (let qx = -4; qx <= 4; qx++) {
            for (let qz = -4; qz <= 4; qz++) {
              const dist = Math.hypot(qx * pitch, qz * pitch);
              if (dist <= 1.35) {
                assemblies.push([qx * pitch, qz * pitch]);
              }
            }
          }
          return assemblies.map(([ax, az], ai) => (
            <group key={`fa-${ai}`} position={[ax, 1.8, az]}>
              {/* Шестигранный пучок твэлов */}
              <mesh castShadow>
                <cylinderGeometry args={[0.13, 0.13, 3.0, 6]} />
                <primitive object={fuelAssemblyMat} attach="material" />
              </mesh>
              {/* Дистанционирующие решетки ТВС */}
              {[-1.0, 0, 1.0].map((ry) => (
                <mesh key={`grid-${ry}`} position={[0, ry, 0]}>
                  <cylinderGeometry args={[0.145, 0.145, 0.08, 6]} />
                  <primitive object={coreBasketMat} attach="material" />
                </mesh>
              ))}
              {/* Головка ТВС */}
              <mesh position={[0, 1.55, 0]}>
                <cylinderGeometry args={[0.12, 0.14, 0.2, 6]} />
                <primitive object={crdmHousingMat} attach="material" />
              </mesh>
            </group>
          ));
        }, [])}

        {/* Верхняя дистанционирующая и защитная плита активной зоны */}
        <mesh position={[0, 3.45, 0]} castShadow>
          <cylinderGeometry args={[1.55, 1.55, 0.25, 24]} />
          <primitive object={coreBasketMat} attach="material" />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* В. Встроенные Парогенераторы (В верхней части вокруг шахты) */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, 5.8, 0]} name="RITM200N_SteamGenerators">
        {/* 12 кольцевых кассет парогенераторов спирально-змеевикового типа */}
        {Array.from({ length: 12 }).map((_, cgi) => {
          const ca = (cgi / 12) * Math.PI * 2;
          const cr = 1.40;
          return (
            <group key={`sg-cassette-${cgi}`} position={[Math.cos(ca) * cr, 0, Math.sin(ca) * cr]} rotation={[0, -ca, 0]}>
              {/* Корпус секции кассеты ПГ */}
              <mesh castShadow>
                <boxGeometry args={[0.42, 3.6, 0.52]} />
                <primitive object={steamGenCassetteMat} attach="material" />
              </mesh>
              {/* Имитация змеевикового трубного пучка (горизонтальные ребра теплообменных труб) */}
              {[-1.4, -0.9, -0.4, 0.1, 0.6, 1.1].map((ty) => (
                <mesh key={`sg-tube-${ty}`} position={[0.22, ty, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.48, 8]} />
                  <primitive object={reactorVesselSteelMat} attach="material" />
                </mesh>
              ))}
              {/* Верхний коллектор перегретого пара */}
              <mesh position={[0, 1.9, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.08, 0.08, 0.45, 12]} />
                <primitive object={steamPipeMat} attach="material" />
              </mesh>
              {/* Нижний коллектор питательной воды */}
              <mesh position={[0, -1.9, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.07, 0.07, 0.45, 12]} />
                <primitive object={feedwaterPipeMat} attach="material" />
              </mesh>
            </group>
          );
        })}

        {/* Кольцевой паровой коллектор 2-го контура над парогенераторами */}
        <mesh position={[0, 2.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.4, 0.12, 12, 32]} />
          <primitive object={steamPipeMat} attach="material" />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* Г. Приводы СУЗ (Системы управления и защиты на крышке) */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, rpvHeight + 1.2, 0]} name="RITM200N_CRDM">
        {/* Матрица приводов СУЗ (19 вертикальных механизмов линейного шагового перемещения) */}
        {useMemo(() => {
          const drives: Array<[number, number]> = [];
          const step = 0.48;
          for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
              if (Math.hypot(dx * step, dz * step) <= 1.25) {
                drives.push([dx * step, dz * step]);
              }
            }
          }
          return drives.map(([px, pz], di) => (
            <group key={`crdm-${di}`} position={[px, 0, pz]}>
              {/* Чехол привода СУЗ */}
              <mesh position={[0, 1.2, 0]} castShadow>
                <cylinderGeometry args={[0.065, 0.075, 2.4, 12]} />
                <primitive object={crdmHousingMat} attach="material" />
              </mesh>
              {/* Электромагнитная катушка и блок датчиков положения */}
              <mesh position={[0, 1.8, 0]}>
                <cylinderGeometry args={[0.095, 0.095, 0.6, 12]} />
                <primitive object={crdmIndicatorMat} attach="material" />
              </mesh>
              {/* Верхняя защитная штанга */}
              <mesh position={[0, 2.6, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
                <primitive object={reactorVesselSteelMat} attach="material" />
              </mesh>
            </group>
          ));
        }, [])}

        {/* Каркас сейсмоупора и кабельных трасс СУЗ */}
        <mesh position={[0, 2.8, 0]}>
          <boxGeometry args={[2.6, 0.1, 2.6]} />
          <primitive object={crdmHousingMat} attach="material" />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* Д. Компактные Бессальниковые ГЦЭН на корпусе реактора */}
      {/* 4 насоса смонтированы прямо на боковых патрубках корпуса */}
      {/* ------------------------------------------------------------- */}
      <group ref={pumpsRef} name="RITM200N_CoolantPumps">
        {[
          { angle: Math.PI * 0.25, side: 'fr-r' },
          { angle: Math.PI * 0.75, side: 'fl-l' },
          { angle: -Math.PI * 0.25, side: 'br-r' },
          { angle: -Math.PI * 0.75, side: 'bl-l' },
        ].map((p, pi) => {
          const pumpY = 4.2;
          const dist = rpvRadius + 0.65;
          const px = Math.cos(p.angle) * dist;
          const pz = Math.sin(p.angle) * dist;
          return (
            <group key={`pump-${pi}`} position={[px, pumpY, pz]} rotation={[0, -p.angle, 0]}>
              {/* Горизонтальный соединительный патрубок корпуса */}
              <mesh position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.22, 0.24, 0.7, 16]} />
                <primitive object={reactorVesselSteelMat} attach="material" />
              </mesh>
              {/* Улитка и спиральный корпус насоса */}
              <mesh position={[0.1, 0, 0]} castShadow>
                <sphereGeometry args={[0.42, 16, 16]} />
                <primitive object={pumpCasingMat} attach="material" />
              </mesh>
              {/* Герметичный гермоэлектродвигатель (электромашинная часть ГЦЭН) */}
              <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.34, 0.34, 0.95, 16]} />
                <primitive object={pumpCasingMat} attach="material" />
              </mesh>
              {/* Клеммная коробка и контур водяного охлаждения статора */}
              <mesh position={[0.65, 0.38, 0]}>
                <boxGeometry args={[0.35, 0.22, 0.32]} />
                <primitive object={safetyYellowMat} attach="material" />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

// ============================================================================
// 2. ЗДАНИЕ РЕАКТОРНОГО БЛОКА С ПОЛУОТКРЫТЫМ РАЗРЕЗОМ (SMR CONTAINMENT)
// ============================================================================

interface SMRReactorBuildingProps {
  position?: [number, number, number];
}

export function SMRReactorBuilding({ position = [0, 0, 0] }: SMRReactorBuildingProps) {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group position={position} name="RITM200N_Building_Cutaway">
      {/* ------------------------------------------------------------- */}
      {/* 1. Монолитный Бетонный Плитно-Свайный Фундамент и Шахта */}
      {/* ------------------------------------------------------------- */}
      {/* Нижняя плита */}
      <mesh position={[0, gY + 1.0, 0]} receiveShadow>
        <boxGeometry args={[36, 2.0, 38]} />
        <primitive object={bioShieldConcreteMat} attach="material" />
      </mesh>

      {/* Цилиндрическая шахта биологической защиты реактора РИТМ-200Н */}
      <mesh position={[0, gY + 5.0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.8, 3.1, 8.0, 32, 1, false, Math.PI, Math.PI]} />
        <primitive object={bioShieldConcreteMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------- */}
      {/* 2. Капитальные Стены Здания (Разрез: передняя стенка полуоткрыта) */}
      {/* ------------------------------------------------------------- */}
      {/* Задняя глухая стена (-Z) */}
      <mesh position={[0, gY + 14.5, -18.5]} castShadow receiveShadow>
        <boxGeometry args={[36, 25.0, 1.2]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>

      {/* Левая глухая стена (-X) */}
      <mesh position={[-17.4, gY + 14.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 25.0, 36]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>

      {/* Правая стена (+X): разделяющая с машинным залом, с монтажными проемами */}
      <mesh position={[17.4, gY + 14.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 25.0, 36]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>

      {/* Передняя стена (+Z): ПОЛУОТКРЫТЫЙ РАЗРЕЗ (Нижняя цокольная часть + прозрачный стеклянный фасад) */}
      {/* Нижний бетонный цоколь */}
      <mesh position={[0, gY + 3.5, 18.5]} castShadow receiveShadow>
        <boxGeometry args={[36, 3.0, 1.2]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>
      {/* Прозрачный фасадный разрез (позволяет наблюдать реактор и системы снаружи) */}
      <mesh position={[0, gY + 16.0, 18.5]}>
        <planeGeometry args={[34, 22.0]} />
        <primitive object={cutawayGlassMat} attach="material" />
      </mesh>

      {/* Колонны и портальные балки фасадного разреза */}
      {[-16, 0, 16].map((cx) => (
        <mesh key={`col-${cx}`} position={[cx, gY + 14.5, 18.5]} castShadow>
          <boxGeometry args={[0.8, 25.0, 0.8]} />
          <primitive object={containmentWallConcreteMat} attach="material" />
        </mesh>
      ))}

      {/* ------------------------------------------------------------- */}
      {/* 3. Кровля с Синим Капотом (#1F4E79) и Вентшахтой */}
      {/* Габарит кровли строго согласован с внешним периметром стен (36 x 38м), без неконтролируемых свесов */}
      {/* ------------------------------------------------------------- */}
      {/* Несущая кровельная плита (четко по внешним габаритам стен) */}
      <mesh position={[0, gY + 27.0, 0]} castShadow>
        <boxGeometry args={[36.0, 1.2, 38.0]} />
        <primitive object={smrCobaltBlueMat} attach="material" />
      </mesh>
      {/* Характерный синий наклонный парапет и люки дымоудаления */}
      <mesh position={[0, gY + 28.1, 0]} castShadow>
        <boxGeometry args={[20, 1.0, 22]} />
        <primitive object={smrCobaltBlueMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------- */}
      {/* 4. Внутренние Этажи и Обслуживающие Площадки Реакторного Зала */}
      {/* ------------------------------------------------------------- */}
      {/* Отметка +6.0 м (Площадка обслуживания ГЦЭН и бака-барботера) */}
      <mesh position={[-8.5, gY + 6.0, 0]} receiveShadow>
        <boxGeometry args={[14, 0.4, 34]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>
      <mesh position={[8.5, gY + 6.0, 0]} receiveShadow>
        <boxGeometry args={[14, 0.4, 34]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>

      {/* Отметка +14.0 м (Центральный зал перегрузки и обслуживания СУЗ) */}
      <mesh position={[-9.5, gY + 14.0, 0]} receiveShadow>
        <boxGeometry args={[12, 0.4, 34]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>
      <mesh position={[9.5, gY + 14.0, 0]} receiveShadow>
        <boxGeometry args={[12, 0.4, 34]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>
      {/* Защитные желтые ограждения вокруг шахты реактора */}
      {[-3.6, 3.6].map((rx) => (
        <group key={`rail-${rx}`} position={[rx, gY + 14.5, 0]}>
          <mesh>
            <boxGeometry args={[0.05, 1.0, 10]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ------------------------------------------------------------- */}
      {/* 5. Мостовой Кран Реакторного Отделения (50 тонн) */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, gY + 24.0, 0]} name="SMR_OverheadCrane">
        {/* Две несущие балки моста крана в сигнальном желтом цвете */}
        {[-1.2, 1.2].map((gz) => (
          <mesh key={`crane-girder-${gz}`} position={[0, 0, gz]} castShadow>
            <boxGeometry args={[33, 1.2, 0.4]} />
            <primitive object={safetyYellowMat} attach="material" />
          </mesh>
        ))}
        {/* Грузовая тележка с барабаном подъема */}
        <mesh position={[2, 0.8, 0]} castShadow>
          <boxGeometry args={[2.4, 0.5, 3.0]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
        {/* Крюковая подвеска */}
        <mesh position={[2, -1.8, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 3.6, 6]} />
          <primitive object={reactorVesselSteelMat} attach="material" />
        </mesh>
        <mesh position={[2, -3.8, 0]}>
          <torusGeometry args={[0.3, 0.08, 8, 16, Math.PI * 1.5]} />
          <primitive object={reactorVesselSteelMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// 3. ВСПОМОГАТЕЛЬНЫЕ СИСТЕМЫ: БАК-БАРБОТЕР И САОЗ / СПОР
// ============================================================================

export function SMRAuxiliarySafetySystems({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group position={position} name="RITM200N_SafetySystems">
      {/* ------------------------------------------------------------- */}
      {/* А. Бак-барботер (Компенсатор давления и барботажная емкость) */}
      {/* Расположен слева от реактора на отметке +6.0м */}
      {/* ------------------------------------------------------------- */}
      <group position={[-10.5, gY + 7.5, -4]} name="RITM200N_BubblerTank">
        {/* Цилиндрический горизонтальный корпус бака-барботера */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[1.4, 1.4, 6.2, 24]} />
          <primitive object={reactorVesselSteelMat} attach="material" />
        </mesh>
        {/* Сферические днища */}
        {[-3.1, 3.1].map((dx) => (
          <mesh key={`b-dish-${dx}`} position={[dx, 0, 0]} rotation={[0, dx < 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <sphereGeometry args={[1.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <primitive object={reactorVesselSteelMat} attach="material" />
          </mesh>
        ))}
        {/* Опорные седловые балки */}
        {[-1.8, 1.8].map((sx) => (
          <mesh key={`b-saddle-${sx}`} position={[sx, -1.2, 0]}>
            <boxGeometry args={[0.5, 0.8, 2.2]} />
            <primitive object={containmentWallConcreteMat} attach="material" />
          </mesh>
        ))}
        {/* Предохранительный клапан и барботажные сбросные трубы */}
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 1.2, 12]} />
          <primitive object={steamPipeMat} attach="material" />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* Б. Пассивные гидроемкости САОЗ (Система аварийного охлаждения зоны) */}
      {/* 2 вертикальных гидроаккумулятора с запасом борной воды */}
      {/* ------------------------------------------------------------- */}
      {[-8.5, -12.5].map((hx, hi) => (
        <group key={`eccs-tank-${hi}`} position={[hx, gY + 7.8, 8]} name={`RITM200N_ECCS_Tank_${hi + 1}`}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.9, 0.9, 3.8, 20]} />
            <primitive object={reactorVesselSteelMat} attach="material" />
          </mesh>
          {/* Сферические крышки */}
          {[-1.9, 1.9].map((ey) => (
            <mesh key={`e-dish-${ey}`} position={[0, ey, 0]} rotation={[ey < 0 ? Math.PI : 0, 0, 0]}>
              <sphereGeometry args={[0.9, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <primitive object={reactorVesselSteelMat} attach="material" />
            </mesh>
          ))}
          {/* Сигнальные зеленые маркировочные полосы САОЗ */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.92, 0.92, 0.35, 20]} />
            <primitive object={feedwaterPipeMat} attach="material" />
          </mesh>
          {/* Трубопровод аварийного впрыска в корпус реактора */}
          <mesh position={[1.2, -1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 2.4, 12]} />
            <primitive object={feedwaterPipeMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ------------------------------------------------------------- */}
      {/* В. Теплообменники СПОР (Система пассивного отвода тепла) */}
      {/* ------------------------------------------------------------- */}
      <group position={[-10.5, gY + 16.5, -10]} name="RITM200N_DecayHeatRemoval">
        <mesh castShadow>
          <boxGeometry args={[4.2, 2.4, 2.2]} />
          <primitive object={steamGenCassetteMat} attach="material" />
        </mesh>
        {/* Аварийные паропроводы и патрубки сброса пара */}
        {[-1.4, 1.4].map((px) => (
          <mesh key={`dh-pipe-${px}`} position={[px, 1.6, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 1.2, 12]} />
            <primitive object={steamPipeMat} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// 4. КОМПАКТНЫЙ МАШИННЫЙ ЗАЛ С ПАРОВОЙ ТУРБИНОЙ И ГЕНЕРАТОРОМ
// ============================================================================

export function SMRTurbineHall({ position = [26, 0, 0] }: { position?: [number, number, number] }) {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group position={position} name="RITM200N_TurbineHall">
      {/* ------------------------------------------------------------- */}
      {/* 1. Конструктив Здания Машинного Зала (Сэндвич-панели и разрез) */}
      {/* ------------------------------------------------------------- */}
      {/* Плита фундамента */}
      <mesh position={[0, gY + 0.8, 0]} receiveShadow>
        <boxGeometry args={[28, 1.6, 36]} />
        <primitive object={bioShieldConcreteMat} attach="material" />
      </mesh>
      {/* Задняя стена */}
      <mesh position={[0, gY + 9.5, -17.5]} castShadow receiveShadow>
        <boxGeometry args={[28, 16.0, 1.0]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>
      {/* Правая стена */}
      <mesh position={[13.5, gY + 9.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 16.0, 36]} />
        <primitive object={containmentWallConcreteMat} attach="material" />
      </mesh>
      {/* Синяя кровля (#1F4E79) строго по периметру стен машинного зала (28 x 36м) */}
      <mesh position={[0, gY + 17.6, 0]} castShadow>
        <boxGeometry args={[28, 1.0, 36]} />
        <primitive object={smrCobaltBlueMat} attach="material" />
      </mesh>
      {/* Открытый передний разрез с защитным стеклянным витражом */}
      <mesh position={[0, gY + 9.5, 17.5]}>
        <planeGeometry args={[26, 15.0]} />
        <primitive object={cutawayGlassMat} attach="material" />
      </mesh>

      {/* ------------------------------------------------------------- */}
      {/* 2. Турбоагрегат АСММ (Паровая турбина К-55-3.0/3000 и генератор) */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, gY + 3.8, 0]} name="RITM200N_Turbogenerator">
        {/* Железобетонный фундаментный постамент турбоагрегата */}
        <mesh position={[0, -1.0, 0]} receiveShadow>
          <boxGeometry args={[8.5, 2.0, 22.0]} />
          <primitive object={containmentWallConcreteMat} attach="material" />
        </mesh>

        {/* А. Паровая турбина: Цилиндр высокого давления (ЦВД) */}
        <mesh position={[0, 1.0, -5.5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.1, 1.3, 3.4, 24]} />
          <primitive object={turbineMetalMat} attach="material" />
        </mesh>
        {/* Стопорно-регулирующие паровые клапаны ЦВД */}
        {[-1.4, 1.4].map((vx) => (
          <group key={`valve-${vx}`} position={[vx, 1.4, -6.2]}>
            <mesh>
              <cylinderGeometry args={[0.22, 0.22, 1.4, 12]} />
              <primitive object={steamPipeMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.8, 0]}>
              <cylinderGeometry args={[0.32, 0.32, 0.4, 12]} />
              <primitive object={safetyYellowMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Б. Паровая турбина: Цилиндр низкого давления (ЦНД) */}
        <mesh position={[0, 1.4, -0.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.7, 1.9, 5.2, 24]} />
          <primitive object={turbineMetalMat} attach="material" />
        </mesh>

        {/* В. Поверхностный конденсатор под выхлопом турбины */}
        <mesh position={[0, -1.6, -1.0]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 2.4, 6.8]} />
          <primitive object={turbineMetalMat} attach="material" />
        </mesh>

        {/* Г. Синхронный Турбогенератор (55-60 МВт) в синем кожухе */}
        <mesh position={[0, 1.2, 5.8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.45, 1.45, 5.4, 24]} />
          <primitive object={generatorCasingMat} attach="material" />
        </mesh>
        {/* Блок бесщеточного возбудителя генератора */}
        <mesh position={[0, 0.8, 9.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 1.6, 16]} />
          <primitive object={generatorCasingMat} attach="material" />
        </mesh>

        {/* Валоповоротное устройство и муфты между валами */}
        <mesh position={[0, 0.6, 2.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 1.4, 16]} />
          <primitive object={reactorVesselSteelMat} attach="material" />
        </mesh>

        {/* Масляный бак и маслосистема смазки подшипников */}
        <mesh position={[3.6, -0.4, 4.0]}>
          <boxGeometry args={[2.0, 1.4, 4.5]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 3. Магистральный Паропровод из Реакторного Блока в Турбину */}
      {/* ------------------------------------------------------------- */}
      <group position={[-13.5, gY + 11.0, -5.5]}>
        {/* Паропровод острого пара через разделительную стену */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 5.0, 16]} />
          <primitive object={steamPipeMat} attach="material" />
        </mesh>
        {/* Быстродействующая защитная отсечная арматура (БЗОК) */}
        <mesh position={[1.2, 0, 0]}>
          <boxGeometry args={[0.7, 1.1, 0.7]} />
          <primitive object={safetyYellowMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// Кнопки, переключатели и индикаторы пультов БЩУ
const buttonRedMat = new THREE.MeshStandardMaterial({ color: '#e63946', emissive: '#e63946', emissiveIntensity: 0.4, roughness: 0.3 });
const buttonGreenMat = new THREE.MeshStandardMaterial({ color: '#2a9d8f', emissive: '#2a9d8f', emissiveIntensity: 0.3, roughness: 0.3 });
const buttonYellowMat = new THREE.MeshStandardMaterial({ color: '#e9c46a', emissive: '#e9c46a', emissiveIntensity: 0.3, roughness: 0.3 });
const buttonBlueMat = new THREE.MeshStandardMaterial({ color: '#457b9d', emissive: '#457b9d', emissiveIntensity: 0.3, roughness: 0.3 });
const toggleSwitchMat = new THREE.MeshStandardMaterial({ color: '#dcdcdc', metalness: 0.9, roughness: 0.2 });
const chairLeatherMat = new THREE.MeshStandardMaterial({ color: '#1a1d20', roughness: 0.55, metalness: 0.1 });
const chromeMetalMat = new THREE.MeshStandardMaterial({ color: '#e0e0e0', metalness: 0.95, roughness: 0.15 });

// ============================================================================
// 5. БЛОЧНЫЙ ПУЛЬТ УПРАВЛЕНИЯ (БЩУ) МАЛОЙ АЭС (ОТМЕТКА +3.60м)
// ============================================================================

export function SMRMainControlRoom({ position = [0, 0, -11] }: { position?: [number, number, number] }) {
  // Отметка пола БЩУ строго +3.60м
  const floorElevation = 3.60;

  return (
    <group position={position} name="RITM200N_ControlRoom">
      <group position={[0, floorElevation, 0]}>
        {/* 1. Walkable Floor Slab at +3.60m with metadata for raycasting */}
        <mesh position={[0, 0.05, 0]} receiveShadow name="BSHU_Floor_360" userData={{ isFloor: true }}>
          <boxGeometry args={[18, 0.2, 14]} />
          <primitive object={mcrConsoleMat} attach="material" />
        </mesh>

        {/* Стены и потолок помещения БЩУ */}
        {/* Задняя стена */}
        <mesh position={[0, 2.5, -6.8]} castShadow receiveShadow>
          <boxGeometry args={[18, 5.0, 0.4]} />
          <primitive object={containmentWallConcreteMat} attach="material" />
        </mesh>
        {/* Левая стена */}
        <mesh position={[-8.8, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 5.0, 14]} />
          <primitive object={containmentWallConcreteMat} attach="material" />
        </mesh>
        {/* Правая стена */}
        <mesh position={[8.8, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 5.0, 14]} />
          <primitive object={containmentWallConcreteMat} attach="material" />
        </mesh>
        {/* Потолок с встроенными светильниками */}
        <mesh position={[0, 5.0, 0]}>
          <boxGeometry args={[18, 0.2, 14]} />
          <primitive object={containmentWallConcreteMat} attach="material" />
        </mesh>
        {/* Потолочные светодиодные панели */}
        {[-4, 0, 4].map((lx) =>
          [-3, 0, 3].map((lz) => (
            <mesh key={`ceil-light-${lx}-${lz}`} position={[lx, 4.88, lz]}>
              <boxGeometry args={[1.6, 0.06, 1.2]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))
        )}

        {/* 2. Панорамная видеостена мнемосхем малой АЭС на задней стене */}
        <group position={[0, 2.6, -6.5]}>
          <mesh castShadow>
            <boxGeometry args={[15.0, 3.2, 0.25]} />
            <primitive object={mcrConsoleMat} attach="material" />
          </mesh>
          {/* Центральный экран мнемосхемы РИТМ-200Н */}
          <mesh position={[0, 0, 0.14]}>
            <planeGeometry args={[14.4, 2.8]} />
            <primitive object={mcrScreenGlowMat} attach="material" />
          </mesh>
          {/* Световые табло аварийной сигнализации (Annunciator alarm tiles) */}
          {[-6, -4, -2, 0, 2, 4, 6].map((tx) => (
            <mesh key={`bshu-ann-${tx}`} position={[tx, 1.2, 0.16]}>
              <boxGeometry args={[1.5, 0.25, 0.04]} />
              <primitive object={crdmIndicatorMat} attach="material" />
            </mesh>
          ))}
        </group>

        {/* 3. Интерактивные настенные мониторы на боковых стенах */}
        {/* Левая стена: мониторы физики реактора и энерговыделения */}
        {[-3, 2].map((mz) => (
          <group key={`l-mon-${mz}`} position={[-8.5, 2.4, mz]} rotation={[0, Math.PI / 2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[2.2, 1.4, 0.1]} />
              <primitive object={mcrConsoleMat} attach="material" />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <planeGeometry args={[2.0, 1.2]} />
              <meshBasicMaterial color="#2a9d8f" />
            </mesh>
          </group>
        ))}

        {/* Правая стена: мониторы параметров турбогенератора и радиационного контроля */}
        {[-3, 2].map((mz) => (
          <group key={`r-mon-${mz}`} position={[8.5, 2.4, mz]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[2.2, 1.4, 0.1]} />
              <primitive object={mcrConsoleMat} attach="material" />
            </mesh>
            <mesh position={[0, 0, 0.06]}>
              <planeGeometry args={[2.0, 1.2]} />
              <meshBasicMaterial color="#457b9d" />
            </mesh>
          </group>
        ))}

        {/* 4. Полукруглый эргономичный пульт управления с кнопками, переключателями и экранами */}
        <group position={[0, 0, -1.2]} name="SemiCircular_Console">
          {/* 7 секторов дугового стола образуют полукруг (дугу от -60° до +60°) */}
          {Array.from({ length: 7 }).map((_, si) => {
            const arcRadius = 4.8;
            const angle = -Math.PI * 0.35 + (si / 6) * (Math.PI * 0.70);
            const cx = Math.sin(angle) * arcRadius;
            const cz = -Math.cos(angle) * arcRadius + 2.5;

            return (
              <group key={`sec-${si}`} position={[cx, 0, cz]} rotation={[0, -angle, 0]}>
                {/* Секция стола оператора */}
                <mesh position={[0, 0.42, 0]} castShadow>
                  <boxGeometry args={[1.5, 0.84, 1.4]} />
                  <primitive object={mcrConsoleMat} attach="material" />
                </mesh>
                {/* Наклонная столешница со встроенными приборами */}
                <mesh position={[0, 0.88, 0.05]} rotation={[-0.22, 0, 0]} castShadow>
                  <boxGeometry args={[1.48, 0.08, 1.35]} />
                  <primitive object={mcrConsoleMat} attach="material" />
                </mesh>

                {/* Ряды цветных кнопок (Пуск, Стоп, АЗ, Режим) */}
                {[-0.5, -0.25, 0.0, 0.25, 0.5].map((bx, bi) => {
                  const bMat = bi === 0 ? buttonRedMat : bi === 1 ? buttonGreenMat : bi === 2 ? buttonYellowMat : buttonBlueMat;
                  return (
                    <group key={`btn-${bi}`} position={[bx, 0.94, 0.35]}>
                      <mesh position={[0, 0.02, 0]}>
                        <cylinderGeometry args={[0.025, 0.025, 0.03, 8]} />
                        <primitive object={bMat} attach="material" />
                      </mesh>
                      <mesh position={[0, 0.005, 0]}>
                        <cylinderGeometry args={[0.035, 0.035, 0.01, 8]} />
                        <primitive object={chromeMetalMat} attach="material" />
                      </mesh>
                    </group>
                  );
                })}

                {/* Тумблеры и переключатели управления */}
                {[-0.45, -0.15, 0.15, 0.45].map((sx, si2) => (
                  <group key={`sw-${si2}`} position={[sx, 0.96, 0.15]}>
                    <mesh rotation={[0.3, 0, 0]}>
                      <cylinderGeometry args={[0.008, 0.008, 0.05, 6]} />
                      <primitive object={toggleSwitchMat} attach="material" />
                    </mesh>
                    <mesh position={[0, -0.01, 0]}>
                      <boxGeometry args={[0.035, 0.015, 0.035]} />
                      <primitive object={chromeMetalMat} attach="material" />
                    </mesh>
                  </group>
                ))}

                {/* Стрелочные приборы и шкалы */}
                {[-0.35, 0.35].map((gx) => (
                  <mesh key={`gauge-${gx}`} position={[gx, 0.98, -0.05]} rotation={[-0.22, 0, 0]}>
                    <cylinderGeometry args={[0.065, 0.065, 0.01, 16]} />
                    <primitive object={crdmIndicatorMat} attach="material" />
                  </mesh>
                ))}

                {/* Дисплеи АСУ ТП на подставках (по 2 монитора на секцию) */}
                {[-0.38, 0.38].map((dx, di) => (
                  <group key={`disp-${di}`} position={[dx, 1.25, -0.35]} rotation={[-0.08, 0, 0]}>
                    {/* Ножка монитора */}
                    <mesh position={[0, -0.22, 0]}>
                      <cylinderGeometry args={[0.02, 0.02, 0.35, 8]} />
                      <primitive object={chromeMetalMat} attach="material" />
                    </mesh>
                    {/* Корпус монитора */}
                    <mesh castShadow>
                      <boxGeometry args={[0.62, 0.42, 0.05]} />
                      <primitive object={mcrConsoleMat} attach="material" />
                    </mesh>
                    {/* Экран монитора с графикой */}
                    <mesh position={[0, 0, 0.028]}>
                      <planeGeometry args={[0.58, 0.38]} />
                      <primitive object={mcrScreenGlowMat} attach="material" />
                    </mesh>
                  </group>
                ))}
              </group>
            );
          })}

          {/* 5. Кресла операторов (Reactor Operator & Turbine Operator) */}
          {[-1.6, 1.6].map((cx, ci) => (
            <group key={`chair-${ci}`} position={[cx, 0, 0.3]} rotation={[0, ci === 0 ? 0.2 : -0.2, 0]}>
              {/* Колесная пятилучевая крестовина */}
              <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.35, 0.35, 0.05, 5]} />
                <primitive object={chromeMetalMat} attach="material" />
              </mesh>
              {/* Газлифт */}
              <mesh position={[0, 0.26, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.32, 8]} />
                <primitive object={chromeMetalMat} attach="material" />
              </mesh>
              {/* Сиденье */}
              <mesh position={[0, 0.46, 0]} castShadow>
                <boxGeometry args={[0.52, 0.08, 0.52]} />
                <primitive object={chairLeatherMat} attach="material" />
              </mesh>
              {/* Анатомическая спинка с подголовником */}
              <mesh position={[0, 0.82, 0.22]} rotation={[-0.08, 0, 0]} castShadow>
                <boxGeometry args={[0.48, 0.65, 0.07]} />
                <primitive object={chairLeatherMat} attach="material" />
              </mesh>
              {/* Подлокотники */}
              {[-0.28, 0.28].map((ax) => (
                <mesh key={`arm-${ax}`} position={[ax, 0.64, 0.05]}>
                  <boxGeometry args={[0.06, 0.04, 0.32]} />
                  <primitive object={chairLeatherMat} attach="material" />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* 6. Стеклянная смотровая витрина с видом на реакторный зал */}
        <group position={[0, 2.0, 6.8]}>
          <mesh>
            <planeGeometry args={[17.6, 3.8]} />
            <primitive object={cutawayGlassMat} attach="material" />
          </mesh>
          <mesh position={[0, -1.8, 0]}>
            <boxGeometry args={[17.8, 0.4, 0.2]} />
            <primitive object={containmentWallConcreteMat} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ============================================================================
// 6. ГЛАВНАЯ СБОРКА КОМПЛЕКСА МАЛОЙ АЭС РИТМ-200Н
// ============================================================================

export interface RITM200NFullComplexProps {
  position?: [number, number, number];
}

/**
 * Габаритные параметры комплекса РИТМ-200Н (Bounding Dimensions):
 * - Общая ширина по X: 64.0 м (Реакторный блок 36м + Машзал 28м)
 * - Габаритная длина по Z: 38.0 м
 * - Высота: от фундамента Y=0 до конька кровли Y=28.1м
 * - Точка привязки (Origin / Pivot): нижний геометрический центр фундамента [0, 0, 0]
 * - Внутреннее взаимное расположение:
 *   - Реакторный блок: X от -32 до +4 (центр X = -14)
 *   - Машинный зал: X от +4 до +32 (центр X = +18)
 *   - Венттруба: X = -32.0, Z = 0 (примыкает к тыльной стене реакторного блока)
 */
export default function RITM200NFullComplex({ position = [142, 0, 80] }: RITM200NFullComplexProps) {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group position={position} name="RITM200N_SMR_FullComplex" visible={true}>
      {/* 1. Защитное здание реакторного блока с полуоткрытым фасадным разрезом (X: -32 .. +4) */}
      <group position={[-14, 0, 0]}>
        <SMRReactorBuilding position={[0, 0, 0]} />

        {/* 2. Интегральный реакторный блок РИТМ-200Н в центре шахты (ЯВНАЯ ГРУППА reactorGroup) */}
        <group name="reactorGroup" visible={true}>
          <IntegralReactorVesselRITM200N position={[0, gY + 4.8, 0]} />
        </group>

        {/* 3. Вспомогательные системы безопасности (бак-барботер, САОЗ, СПОР) */}
        <SMRAuxiliarySafetySystems position={[0, 0, 0]} />

        {/* 4. Блочный пункт управления (БЩУ) малой АЭС на отметке +3.60м (ЯВНАЯ ГРУППА bshuGroup) */}
        <group name="bshuGroup" visible={true}>
          <SMRMainControlRoom position={[0, 0, -11]} />
        </group>
      </group>

      {/* 5. Компактный машинный зал АСММ с турбоагрегатом (X: +4 .. +32, стык по стене X = +4) */}
      <SMRTurbineHall position={[18, 0, 0]} />

      {/* 6. Вентиляционная труба малой АЭС с дневной красно-белой маркировкой (у западной стены) */}
      <group position={[-31, gY, -10]} name="RITM200N_VentStack">
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[1.8, 2.2, 3, 16]} />
          <primitive object={containmentWallConcreteMat} attach="material" />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => {
          const y = 3 + i * 8 + 4;
          const isRed = i % 2 === 0;
          return (
            <mesh key={`smr-stack-seg-${i}`} position={[0, y, 0]} castShadow>
              <cylinderGeometry args={[1.1, 1.1, 8, 16]} />
              <meshStandardMaterial
                color={isRed ? '#b82a24' : '#f2f2ec'}
                roughness={0.65}
                metalness={0.15}
              />
            </mesh>
          );
        })}
      </group>

      {/* 7. Блочные трансформаторы связи РИТМ-200Н (со стороны фасада машинного зала) */}
      {[-5, 5].map((tx) => (
        <group key={`smr-trafo-pad-${tx}`} position={[tx + 18, gY, 20]} name={`RITM200N_Transformer_${tx}`}>
          <mesh position={[0, 2.2, 0]} castShadow>
            <boxGeometry args={[4.2, 4.2, 3.8]} />
            <meshStandardMaterial color="#727B84" roughness={0.45} metalness={0.65} />
          </mesh>
          <mesh position={[2.6, 2.6, 0]}>
            <boxGeometry args={[0.5, 5.2, 4.6]} />
            <primitive object={containmentWallConcreteMat} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
