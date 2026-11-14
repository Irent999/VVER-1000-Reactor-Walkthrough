/**
 * ============================================================================
 * SITE ENGINEERING INFRASTRUCTURE & PROCESS PIPING (ИНЖЕНЕРНЫЕ КОММУНИКАЦИИ АЭС)
 * ============================================================================
 * 
 * 1. Process & Cable Trestles (Эстакады коммуникаций):
 *    - Двухъярусная кабельно-технологическая эстакада между реакторным отделением (РО),
 *      вспомогательным корпусом (БЩУ / спецкорпус) и деаэраторным/турбинным отделениями.
 *    - Несущие стальные пространственные рамные опоры (бенты) с фундаментами.
 *    - Верхний ярус: изолированные технологические трубопроводы пара с/н, конденсата, ХОВ.
 *    - Нижний ярус: перфорированные кабельные лотки силовых и контрольных кабелей.
 * 
 * 2. Generator Step-Up Transformers (Блочные трансформаторы ТЦ-1000000/500):
 *    - Размещены строго у восточной торцевой стены машинного зала (X = 127м..142м).
 *    - Экранированные токопроводы 24 кВ (ТЭНЕ-24 кВ) из торца машзала в трансформаторы.
 *    - Маслоприемники с гравийной засыпкой и противопожарные железобетонные брандмауэры (12м).
 *    - Высоковольтные вводы 500 кВ с экранирующими антикоронными кольцами.
 *    - Гибкая ошиновка (провода АС-500) с провисающими гирляндами изоляторов,
 *      протянутая от трансформаторов (X=137) к порталам ОРУ-500 кВ (X=172).
 * 
 * 3. Make-up / Blowdown Lines (Линии подпитки и продувки первого контура):
 *    - Высоконапорные трубопроводы Ду 150/100 из спецкорпуса в гермооболочку РО ВВЭР-1000.
 *    - Закладные герметичные проходки (гермопроходки) с сильфонными компенсаторами.
 *    - Быстродействующая электроприводная отсечная арматура (задвижки с электроприводом).
 * ============================================================================
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { FLOOR_LEVELS } from '@/scene/constants';
import {
  concreteMap,
  concreteNormalMap,
  concreteRoughnessMap,
  brushedSteelMap,
  brushedSteelNormalMap,
  brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

// ============================================================================
// SHARED PBR MATERIALS
// ============================================================================

const concreteBaseMat = new THREE.MeshStandardMaterial({
  color: '#8A8E94',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.88,
  metalness: 0.04,
});

const concreteBlastWallMat = new THREE.MeshStandardMaterial({
  color: '#7D8288',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.3, 0.3),
  roughness: 0.85,
  metalness: 0.05,
});

const steelStructureMat = new THREE.MeshStandardMaterial({
  color: '#e4e7eb',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.35,
  metalness: 0.85,
});

const darkMetalMat = new THREE.MeshStandardMaterial({
  color: '#2d3339',
  roughness: 0.45,
  metalness: 0.75,
});

const transformerOrangeMat = new THREE.MeshStandardMaterial({
  color: '#C85A17',
  roughness: 0.35,
  metalness: 0.25,
});

const porcelainInsulatorMat = new THREE.MeshStandardMaterial({
  color: '#8A3324', // Терракотовый высоковольтный фарфор
  roughness: 0.25,
  metalness: 0.15,
});

const busbarAluMat = new THREE.MeshStandardMaterial({
  color: '#E2E8F0',
  roughness: 0.28,
  metalness: 0.92,
});

const flexibleBusConductorMat = new THREE.MeshStandardMaterial({
  color: '#CBD5E1',
  roughness: 0.32,
  metalness: 0.88,
});

const insulatedPipeMat = new THREE.MeshStandardMaterial({
  color: '#D8DEE4',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.08, 0.08),
  roughness: 0.3,
  metalness: 0.82,
});

const stainlessPipeMat = new THREE.MeshStandardMaterial({
  color: '#B8C7D9',
  roughness: 0.25,
  metalness: 0.86,
});

const cableTrayMat = new THREE.MeshStandardMaterial({
  color: '#64748B',
  roughness: 0.5,
  metalness: 0.65,
});

const valveActuatorYellowMat = new THREE.MeshStandardMaterial({
  color: '#EAB308',
  roughness: 0.35,
  metalness: 0.45,
});

const valveBodyDarkMat = new THREE.MeshStandardMaterial({
  color: '#1E293B',
  roughness: 0.4,
  metalness: 0.7,
});

const gravelPitMat = new THREE.MeshStandardMaterial({
  color: '#4B5563',
  roughness: 0.95,
  metalness: 0.05,
});

const busDuctHousingMat = new THREE.MeshStandardMaterial({
  color: '#94A3B8',
  roughness: 0.4,
  metalness: 0.65,
});

// ============================================================================
// 1. PROCESS & CABLE TRESTLES (ЭСТАКАДЫ КОММУНИКАЦИЙ)
// ============================================================================

/**
 * Spatial Steel Bent Tower (Пространственная стальная опора эстакады)
 */
function TrestleBent({
  position,
  width = 4.2,
  height = 9.5,
}: {
  position: [number, number, number];
  width?: number;
  height?: number;
}) {
  return (
    <group position={position}>
      {/* Reinforced Concrete Foundation Footing */}
      <mesh position={[0, -height / 2 + 0.4, 0]}>
        <boxGeometry args={[width + 0.8, 0.8, 1.8]} />
        <primitive object={concreteBaseMat} attach="material" />
      </mesh>

      {/* 2 Vertical Steel H-Columns */}
      {[-width / 2, width / 2].map((cx, i) => (
        <mesh key={`col-${i}`} position={[cx, 0, 0]}>
          <boxGeometry args={[0.25, height, 0.25]} />
          <primitive object={steelStructureMat} attach="material" />
        </mesh>
      ))}

      {/* Horizontal Cross Beams (Нижний и верхний ригели) */}
      {/* Lower tier (кабельный ярус) at Y = +4.5m relative to ground */}
      <mesh position={[0, -height / 2 + 5.0, 0]}>
        <boxGeometry args={[width + 0.4, 0.2, 0.25]} />
        <primitive object={steelStructureMat} attach="material" />
      </mesh>
      {/* Upper tier (технологический трубопроводный ярус) at top */}
      <mesh position={[0, height / 2 - 0.2, 0]}>
        <boxGeometry args={[width + 0.4, 0.22, 0.25]} />
        <primitive object={steelStructureMat} attach="material" />
      </mesh>

      {/* Diagonal K/X Bracing */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[width * 1.1, 0.1, 0.1]} />
        <primitive object={steelStructureMat} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[width * 1.1, 0.1, 0.1]} />
        <primitive object={steelStructureMat} attach="material" />
      </mesh>
    </group>
  );
}

/**
 * Multi-Tier Process & Cable Trestle Systems across the site
 */
export function ProcessAndCableTrestles() {
  const gY = FLOOR_LEVELS.ground;

  // 1. Trestle 1: РО ↔ Спецкорпус (runs North-South from Auxiliary Building Z = -16 to Special Auxiliary Building Z = -72 at X = -28)
  const zStart1 = -16.0;
  const zEnd1 = -72.0;
  const length1 = Math.abs(zEnd1 - zStart1);
  const midZ1 = (zStart1 + zEnd1) / 2;
  const bentsZ1 = [-20, -32, -44, -56, -68];
  const trestleHeight = 9.5;
  const beamY = gY + trestleHeight;

  // 2. Trestle 2: Восточное ответвление к Машинному залу (East-West branch crossing between РО and Turbine Hall 1)
  // Runs from X = -14.0m to X = 27.0m (Turbine Hall West wall) at Z = -16.0m
  const xStart2 = -14.0;
  const xEnd2 = 27.0;
  const length2 = xEnd2 - xStart2;
  const midX2 = (xStart2 + xEnd2) / 2;
  const bentsX2 = [-10, 2, 14, 25];

  return (
    <group name="ProcessAndCableTrestles">
      {/* ================================================================== */}
      {/* ТРАССА 1: ЭСТАКАДА РО ↔ СПЕЦКОРПУС (X = -28.0m, Z от -16 до -72)  */}
      {/* ================================================================== */}
      <group position={[-28.0, 0, 0]}>
        {/* Steel Bent Towers */}
        {bentsZ1.map((bz) => (
          <TrestleBent
            key={`bent-z1-${bz}`}
            position={[0, gY + trestleHeight / 2, bz]}
            width={4.0}
            height={trestleHeight}
          />
        ))}

        {/* Longitudinal Steel Stringer Beams (Продольные балки) */}
        {/* Upper tier stringers */}
        {[-2.0, 2.0].map((sx, i) => (
          <mesh key={`str-up-${i}`} position={[sx, beamY - 0.2, midZ1]}>
            <boxGeometry args={[0.2, 0.22, length1]} />
            <primitive object={steelStructureMat} attach="material" />
          </mesh>
        ))}
        {/* Lower tier stringers */}
        {[-2.0, 2.0].map((sx, i) => (
          <mesh key={`str-low-${i}`} position={[sx, gY + 5.0, midZ1]}>
            <boxGeometry args={[0.2, 0.2, length1]} />
            <primitive object={steelStructureMat} attach="material" />
          </mesh>
        ))}

        {/* Lower Tier: Cable Trays with Power & I&C Cable Bundles (Кабельные лотки) */}
        {[-1.2, 0.0, 1.2].map((cx, ci) => (
          <group key={`tray-${ci}`} position={[cx, gY + 5.15, midZ1]}>
            {/* Galvanized Tray Body */}
            <mesh>
              <boxGeometry args={[0.7, 0.12, length1]} />
              <primitive object={cableTrayMat} attach="material" />
            </mesh>
            {/* Cable Bundle in tray */}
            <mesh position={[0, 0.08, 0]}>
              <boxGeometry args={[0.6, 0.08, length1]} />
              <primitive object={darkMetalMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Upper Tier: Process Pipes (Трубопроводы пара с/н, конденсата, ХОВ) */}
        {/* Main Steam auxiliary line (Ду 300) */}
        <mesh position={[-1.2, beamY + 0.4, midZ1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, length1, 14]} />
          <primitive object={insulatedPipeMat} attach="material" />
        </mesh>
        {/* Condensate & Water cleanup lines */}
        {[-0.3, 0.5, 1.3].map((px, pi) => (
          <mesh key={`pipe-proc-${pi}`} position={[px, beamY + 0.28, midZ1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, length1, 12]} />
            <primitive object={insulatedPipeMat} attach="material" />
          </mesh>
        ))}

        {/* Mid-span Thermal Expansion U-Loop (П-образный компенсатор) at Z = -44m */}
        <group position={[0, beamY + 0.4, -44.0]}>
          {/* U-Shape loop offset by 2.2m horizontally */}
          <mesh position={[-2.4, 0, 0]}>
            <boxGeometry args={[2.4, 0.32, 0.32]} />
            <primitive object={insulatedPipeMat} attach="material" />
          </mesh>
          <mesh position={[-3.6, 0, 2.0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 4.0, 12]} />
            <primitive object={insulatedPipeMat} attach="material" />
          </mesh>
          <mesh position={[-2.4, 0, 4.0]}>
            <boxGeometry args={[2.4, 0.32, 0.32]} />
            <primitive object={insulatedPipeMat} attach="material" />
          </mesh>
        </group>

        {/* Maintenance Walkway Catwalk with Safety Handrail on Upper Tier */}
        <mesh position={[0, beamY + 0.02, midZ1]}>
          <boxGeometry args={[1.0, 0.05, length1]} />
          <primitive object={steelStructureMat} attach="material" />
        </mesh>
      </group>

      {/* ================================================================== */}
      {/* ТРАССА 2: ЭСТАКАДА РО ↔ МАШИННЫЙ ЗАЛ 1 (Z = -16.0m, X от -14 до 27) */}
      {/* ================================================================== */}
      <group position={[0, 0, -16.0]}>
        {bentsX2.map((bx) => (
          <TrestleBent
            key={`bent-x2-${bx}`}
            position={[bx, gY + (trestleHeight + 1.5) / 2, 0]}
            width={3.8}
            height={trestleHeight + 1.5}
          />
        ))}

        {/* Running East-West Process Pipe Bundle */}
        {[-1.0, 0, 1.0].map((pz, pi) => (
          <mesh
            key={`pipe-ew-${pi}`}
            position={[midX2, gY + trestleHeight + 1.8, pz]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.26, 0.26, length2, 14]} />
            <primitive object={insulatedPipeMat} attach="material" />
          </mesh>
        ))}

        {/* Lower Cable Gallery Trays */}
        {[-0.8, 0.8].map((cz, ci) => (
          <mesh key={`tray-ew-${ci}`} position={[midX2, gY + 6.2, cz]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.12, length2, 0.7]} />
            <primitive object={cableTrayMat} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// 2. GENERATOR STEP-UP TRANSFORMERS (БЛОЧНЫЕ ТРАНСФОРМАТОРЫ ТЦ-1000000/500)
// With Enclosed 24 kV Bus Ducts and Flexible 500 kV Busbars to Switchyard
// ============================================================================

/**
 * Pre-calculated catenary flexible busbar curve generator.
 * Creates smooth catenary hanging overhead conductors from transformer bushings to switchyard portals.
 */
function createCatenaryCurve(
  start: [number, number, number],
  end: [number, number, number],
  sag: number = 3.2
): THREE.QuadraticBezierCurve3 {
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 - sag,
    (start[2] + end[2]) / 2,
  ];
  return new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(...mid),
    new THREE.Vector3(...end)
  );
}

export function MainGSUTransformers() {
  const gY = FLOOR_LEVELS.ground;

  // Transformer locations along East gable wall of Turbine Hall 1 (Wall is at X = 127.0m)
  // Transformers placed at X = 136.0m
  const trafoX = 136.0;
  const turbineWallX = 127.0;

  // Switchyard 500 kV entry gantry portal tower line at X = 172.0m
  const switchyardPortalX = 172.0;

  // Unit 1 3-Phase Step-up Transformer Bays (ТЦ-1000000/500)
  const unit1Bays = [
    { name: 'Unit1_Phase_A', z: -24.0, oruZ: -22.0 },
    { name: 'Unit1_Phase_B', z: -12.0, oruZ: -10.0 },
    { name: 'Unit1_Phase_C', z: 0.0, oruZ: 2.0 },
  ];

  // Unit 2 3-Phase Step-up Transformer Bays
  const unit2Bays = [
    { name: 'Unit2_Phase_A', z: 48.0, oruZ: 46.0 },
    { name: 'Unit2_Phase_B', z: 60.0, oruZ: 58.0 },
    { name: 'Unit2_Phase_C', z: 72.0, oruZ: 70.0 },
  ];

  const allBays = [...unit1Bays, ...unit2Bays];

  // Geometry for catenary busbars (flexible overhead conductors АС-500)
  const catenaryGeometries = useMemo(() => {
    return allBays.map((bay) => {
      // 3 individual phase conductors per transformer bay (расщепленная фаза)
      const offsets = [-0.9, 0.0, 0.9];
      return offsets.map((oz) => {
        const startPoint: [number, number, number] = [trafoX + 1.2, gY + 14.8, bay.z + oz];
        const endPoint: [number, number, number] = [switchyardPortalX, gY + 18.5, bay.oruZ + oz * 1.5];
        const curve = createCatenaryCurve(startPoint, endPoint, 3.4);
        return new THREE.TubeGeometry(curve, 28, 0.045, 6, false);
      });
    });
  }, [allBays, gY, trafoX, switchyardPortalX]);

  return (
    <group name="MainGSUTransformers_500kV">
      {allBays.map((bay, bayIdx) => (
        <group key={bay.name} position={[trafoX, gY, bay.z]}>
          {/* 1. Gravel Oil Catchment Basin (Маслоприемник с гравийной засыпкой) */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[12.5, 0.6, 11.5]} />
            <primitive object={concreteBaseMat} attach="material" />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[11.8, 0.1, 10.8]} />
            <primitive object={gravelPitMat} attach="material" />
          </mesh>

          {/* 2. Reinforced Concrete Fire Separation Blast Wall (Брандмауэр 12м) */}
          <mesh position={[0, 6.2, 5.8]}>
            <boxGeometry args={[12.8, 12.0, 0.9]} />
            <primitive object={concreteBlastWallMat} attach="material" />
          </mesh>

          {/* 3. Transformer Main Steel Body Tank (Бак силового трансформатора ТЦ-1000000/500) */}
          <mesh position={[0, 4.6, 0]}>
            <boxGeometry args={[7.2, 7.6, 7.8]} />
            <primitive object={darkMetalMat} attach="material" />
          </mesh>

          {/* Stiffener ribs on tank sides */}
          {[-2.5, 0, 2.5].map((rx) => (
            <mesh key={`rib-${rx}`} position={[rx, 4.6, 3.95]}>
              <boxGeometry args={[0.2, 6.8, 0.15]} />
              <primitive object={steelStructureMat} attach="material" />
            </mesh>
          ))}

          {/* 4. Oil Conservator Tank (Расширитель масла с маслоуказателем) */}
          <group position={[0, 9.4, -2.0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[1.0, 1.0, 6.8, 16]} />
              <primitive object={transformerOrangeMat} attach="material" />
            </mesh>
            {/* Conservator support legs */}
            {[-2.2, 2.2].map((lx) => (
              <mesh key={`con-leg-${lx}`} position={[lx, -0.7, 0]}>
                <boxGeometry args={[0.2, 1.4, 0.2]} />
                <primitive object={steelStructureMat} attach="material" />
              </mesh>
            ))}
          </group>

          {/* 5. Forced Oil-Air Radiator Cooling Bank with Cooling Fans (Охладители ДЦ) */}
          <group position={[-4.5, 4.2, 0]}>
            <mesh>
              <boxGeometry args={[1.6, 6.2, 7.4]} />
              <primitive object={steelStructureMat} attach="material" />
            </mesh>
            {/* Cooling Fans (Вентиляторы обдува) */}
            {[-2.2, 0, 2.2].map((fz) => (
              <mesh key={`fan-${fz}`} position={[-0.85, 0, fz]} rotation={[0, Math.PI / 2, 0]}>
                <cylinderGeometry args={[0.8, 0.8, 0.2, 12]} />
                <primitive object={darkMetalMat} attach="material" />
              </mesh>
            ))}
          </group>

          {/* 6. Enclosed 24 kV Generator Isolated-Phase Bus Ducts (Токопроводы ТЭНЕ-24 кВ) */}
          {/* Extending from the Turbine Hall East wall (X=127m) into the low-voltage side of transformer */}
          {[-1.6, 0.0, 1.6].map((dz, di) => {
            const ductLength = trafoX - turbineWallX - 3.6; // ~5.4m span
            const ductMidX = -ductLength / 2 - 3.6;
            return (
              <group key={`busduct-${di}`} position={[ductMidX, 5.0, dz]}>
                {/* Aluminum Circular Enclosed Duct */}
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.48, 0.48, ductLength + 0.5, 14]} />
                  <primitive object={busDuctHousingMat} attach="material" />
                </mesh>
                {/* Wall Penetration Flange at Turbine Hall wall */}
                <mesh position={[-ductLength / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.65, 0.65, 0.3, 14]} />
                  <primitive object={darkMetalMat} attach="material" />
                </mesh>
              </group>
            );
          })}

          {/* 7. High-Voltage 500 kV Porcelain Bushings on Tank Top */}
          {[-1.8, 0.0, 1.8].map((bx, bi) => (
            <group key={`hv-bush-${bi}`} position={[bx, 9.2, 1.4]} rotation={[0, 0, 0.1]}>
              {/* Ribbed Porcelain Insulator Column */}
              <mesh position={[0, 1.8, 0]}>
                <cylinderGeometry args={[0.22, 0.44, 3.8, 12]} />
                <primitive object={porcelainInsulatorMat} attach="material" />
              </mesh>
              {/* Toroidal Anti-Corona Shielding Ring (Экранирующее кольцо) */}
              <mesh position={[0, 3.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.42, 0.05, 8, 16]} />
                <primitive object={busbarAluMat} attach="material" />
              </mesh>
              {/* Terminal Connection Clamp */}
              <mesh position={[0, 3.8, 0]}>
                <boxGeometry args={[0.25, 0.3, 0.25]} />
                <primitive object={busbarAluMat} attach="material" />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* ================================================================== */}
      {/* 8. FLEXIBLE OVERHEAD BUSBARS (ГИБКАЯ ОШИНОВКА АС-500 К ОРУ-500 кВ)  */}
      {/* 3-Phase catenary conductors with glass insulator strings           */}
      {/* ================================================================== */}
      <group name="FlexibleOverheadBusbars_500kV">
        {catenaryGeometries.map((phaseTubes, bayIdx) => (
          <group key={`busbar-group-${bayIdx}`}>
            {phaseTubes.map((geom, tubeIdx) => (
              <mesh key={`tube-${bayIdx}-${tubeIdx}`} geometry={geom}>
                <primitive object={flexibleBusConductorMat} attach="material" />
              </mesh>
            ))}

            {/* Tension Insulator Strings (Гирлянды подвесных изоляторов) at Switchyard Portal */}
            {[-0.9, 0.0, 0.9].map((oz, stringIdx) => (
              <group
                key={`string-${bayIdx}-${stringIdx}`}
                position={[switchyardPortalX, gY + 18.5, allBays[bayIdx].oruZ + oz * 1.5]}
              >
                {/* 2.5m Glass Disk Insulator String */}
                <mesh position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.16, 0.16, 2.4, 8]} />
                  <primitive object={porcelainInsulatorMat} attach="material" />
                </mesh>
                {/* Stockbridge Vibration Damper (Гаситель вибрации ГВ) */}
                <mesh position={[-2.6, -0.15, 0]}>
                  <boxGeometry args={[0.4, 0.15, 0.15]} />
                  <primitive object={darkMetalMat} attach="material" />
                </mesh>
                {/* Downward Dropper Jumper (Спуск к разъединителям/ОПН) */}
                <mesh position={[-0.4, -2.5, 0]}>
                  <cylinderGeometry args={[0.035, 0.035, 5.0, 6]} />
                  <primitive object={flexibleBusConductorMat} attach="material" />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

// ============================================================================
// 3. MAKE-UP & BLOWDOWN SYSTEM (ЛИНИИ ПОДПИТКИ/ПРОДУВКИ 1-ГО КОНТУРА)
// Interconnects Auxiliary Building (СВО) with Containment Wall Penetrations
// ============================================================================

export function MakeUpAndBlowdownSystem() {
  const gY = FLOOR_LEVELS.ground;

  // Containment wall cylindrical radius R = 23.2m
  // Penetration area on the West flank between X = -23.0m and Auxiliary building at X = -22.5m..-36.0m
  const penetrationX = -23.0;
  const auxBuildingX = -32.0;
  const pipeSpanX = Math.abs(penetrationX - auxBuildingX);
  const midX = (penetrationX + auxBuildingX) / 2;

  // 3 Process Lines:
  // 1. TK10 / TK20 Make-Up Line (Линия подпитки Ду 150)
  // 2. TK30 / TK40 Primary & Steam Generator Blowdown Line (Линия продувки Ду 100)
  // 3. Emergency Boron Injection Line (Линия аварийного ввода бора Ду 50)
  const lines = [
    {
      name: 'MakeUp_TK10_150mm',
      y: gY + 8.2,
      z: -2.5,
      radius: 0.16,
      label: 'ТК10 Подпитка Ду150',
      color: '#38BDF8',
    },
    {
      name: 'Blowdown_TK30_100mm',
      y: gY + 9.8,
      z: 0.0,
      radius: 0.12,
      label: 'ТК30 Продувка Ду100',
      color: '#FB923C',
    },
    {
      name: 'EmergencyBoron_50mm',
      y: gY + 11.4,
      z: 2.5,
      radius: 0.08,
      label: 'Линия бора Ду50',
      color: '#4ADE80',
    },
  ];

  return (
    <group name="MakeUpAndBlowdownSystem">
      {lines.map((line) => (
        <group key={line.name}>
          {/* 1. Straight Horizontal Process Pipe spanning from Auxiliary Building to Containment */}
          <mesh
            position={[midX, line.y, line.z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[line.radius, line.radius, pipeSpanX, 14]} />
            <primitive object={stainlessPipeMat} attach="material" />
          </mesh>

          {/* Thermal Insulation Aluminum Cladding bands */}
          {[-2.5, 0.0, 2.5].map((ox) => (
            <mesh
              key={`band-${ox}`}
              position={[midX + ox, line.y, line.z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[line.radius + 0.03, line.radius + 0.03, 0.25, 14]} />
              <primitive object={insulatedPipeMat} attach="material" />
            </mesh>
          ))}

          {/* 2. Hermetic Penetration Assembly (Закладная гермопроходка в стене контейнмента) */}
          <group position={[penetrationX, line.y, line.z]}>
            {/* Embedded Heavy Cylindrical Penetration Sleeve */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[line.radius * 2.2, line.radius * 2.2, 1.4, 16]} />
              <primitive object={darkMetalMat} attach="material" />
            </mesh>

            {/* Heavy Mounting Bolted Flange Ring */}
            <mesh position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[line.radius * 2.6, line.radius * 2.6, 0.2, 16]} />
              <primitive object={steelStructureMat} attach="material" />
            </mesh>

            {/* Multi-Ply Bellows Expansion Compensator (Сильфонный компенсатор) */}
            {[-0.3, -0.15, 0.0, 0.15].map((bx, bi) => (
              <mesh key={`bellow-${bi}`} position={[bx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[line.radius * 1.5, 0.04, 8, 16]} />
                <primitive object={stainlessPipeMat} attach="material" />
              </mesh>
            ))}
          </group>

          {/* 3. Motor-Operated Isolation Gate Valve (Задвижка с электроприводом) */}
          <group position={[penetrationX - 3.2, line.y, line.z]}>
            {/* Cast Steel Valve Body */}
            <mesh>
              <boxGeometry args={[0.5, line.radius * 2.8, line.radius * 2.8]} />
              <primitive object={valveBodyDarkMat} attach="material" />
            </mesh>
            {/* Valve Bonnet & Yoke */}
            <mesh position={[0, line.radius * 2.0, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 0.6, 10]} />
              <primitive object={steelStructureMat} attach="material" />
            </mesh>
            {/* Electric Motor Actuator (Электропривод) */}
            <mesh position={[0, line.radius * 2.0 + 0.5, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.5, 12]} />
              <primitive object={valveActuatorYellowMat} attach="material" />
            </mesh>
            {/* Manual Emergency Handwheel on Actuator */}
            <mesh position={[0, line.radius * 2.0 + 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.18, 0.025, 6, 14]} />
              <primitive object={darkMetalMat} attach="material" />
            </mesh>
          </group>

          {/* 4. Spring Pipe Hanger Support from Auxiliary Building Ceiling */}
          <group position={[auxBuildingX + 2.0, line.y, line.z]}>
            <mesh position={[0, 1.0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 2.0, 6]} />
              <primitive object={steelStructureMat} attach="material" />
            </mesh>
            {/* Spring Can Housing */}
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.4, 10]} />
              <primitive object={valveBodyDarkMat} attach="material" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// MASTER COMPONENT EXPORT
// ============================================================================

export default function SiteEngineeringInfrastructure() {
  return (
    <group name="SiteEngineeringInfrastructure">
      {/* 1. Pipe & Cable Trestles between РО, Спецкорпус and Turbine Halls */}
      <ProcessAndCableTrestles />

      {/* 2. Main Generator Step-Up Transformers at East Gable Wall with 500 kV Flexible Busbars to Switchyard */}
      <MainGSUTransformers />

      {/* 3. Primary Circuit Make-up and Blowdown Piping into Containment Penetrations */}
      <MakeUpAndBlowdownSystem />
    </group>
  );
}
