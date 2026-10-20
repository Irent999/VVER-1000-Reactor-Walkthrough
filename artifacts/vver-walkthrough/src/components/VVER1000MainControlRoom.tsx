/**
 * ============================================================================
 * БЛОЧНЫЙ ЩИТ УПРАВЛЕНИЯ ВВЭР-1000 (БЩУ-1)
 * (VVER-1000 MAIN CONTROL ROOM & OPERATOR CONSOLE)
 * ============================================================================
 * 
 * Расположен в обстройке реакторного отделения ВВЭР-1000 на отметке +10.8м.
 * Включает:
 * 1. Центральный пульт ВИУР (Ведущий инженер управления реактором):
 *    - 4 раздельные секции управления ГЦЭН-195М (петли 1, 2, 3, 4) и кнопка группового пуска
 *    - 4 секции ввода парогенераторов ПГВ-1000
 *    - Двухпозиционный ключ перемещения 61 группы ШУОК СУЗ
 *    - Грибовидная красная кнопка Аварийной Защиты АЗ-5 под защитной скобой
 * 2. Центральный пульт ВИУТ (Ведущий инженер управления турбиной):
 *    - Управление турбоагрегатом К-1000-60/1500 (ЦВД, 3 ЦНД) и генератором ТВВ-1000 (1000 МВт)
 *    - Панель управления полярным краном 320/20т реакторного зала
 * 3. Панорамная видеостена мнемосхем АСУ ТП (THREE.CanvasTexture) с выводом 4-х петель,
 *    графиков мощности 3000 МВт(т) / 1000 МВт(э), давлений и температур теплоносителя.
 */

import { useRef } from 'react';
import * as THREE from 'three';
import {
  InteractiveMCRButton,
  InteractiveSwitchKey,
  DynamicCanvasMonitorMesh,
} from './InteractiveMCRComponents';

// Материалы интерьера БЩУ ВВЭР-1000
const consoleGreyMat = new THREE.MeshStandardMaterial({ color: '#2b333a', roughness: 0.45, metalness: 0.25 });
const falseFloorMat = new THREE.MeshStandardMaterial({ color: '#1e242b', roughness: 0.65, metalness: 0.15 });
const wallAcousticMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.85, metalness: 0.05 });
const wallAccentMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.75, metalness: 0.1 });
const ceilingTileMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8, metalness: 0.05 });
const deskTopMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.35, metalness: 0.2 });
const chromeMetalMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.9 });
const leatherMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.5, metalness: 0.1 });

// Полупрозрачное витражное стекло смотровой галереи БЩУ ВВЭР-1000
const glassViewingMat = new THREE.MeshPhysicalMaterial({
  color: '#cffafe',
  transmission: 0.88,
  transparent: true,
  opacity: 0.22,
  roughness: 0.12,
  metalness: 0.1,
  depthWrite: false,
});

const structuralConcreteDark = new THREE.MeshStandardMaterial({ color: '#3f4752', roughness: 0.82, metalness: 0.1 });

export interface VVER1000MainControlRoomProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export default function VVER1000MainControlRoom({
  position = [-32.0, 13.20, 0.0],
  rotation = [0, 0, 0],
}: VVER1000MainControlRoomProps) {
  const roomW = 14.0;
  const roomH = 4.2;
  const roomD = 9.2;

  return (
    <group
      position={position}
      rotation={rotation}
      name="VVER1000_MainControlRoom"
      visible={true}
      renderOrder={2}
    >
      {/* 1. Железобетонная плита перекрытия вспомогательного корпуса (+13.20м) */}
      <mesh
        position={[0, -0.2, 0]}
        receiveShadow
        castShadow
        name="VVER_BSHU_MezzanineSlab"
        userData={{ isFloor: true, isWalkableFloor: true, floorLevel: 13.2, floorY: 13.20, levelName: 'VVER_BSHU_MezzanineSlab' }}
      >
        <boxGeometry args={[roomW + 0.4, 0.4, roomD + 0.4]} />
        <primitive object={structuralConcreteDark} attach="material" />
      </mesh>

      {/* 2. Фальшпол помещения БЩУ с явными метаданными для ходьбы и Raycast в WebXR */}
      <mesh
        position={[0, 0.05, 0]}
        receiveShadow
        name="VVER_BSHU_Floor"
        userData={{ isFloor: true, isWalkableFloor: true, floorLevel: 13.2, floorY: 13.20, levelName: 'VVER_BSHU_Floor' }}
      >
        <boxGeometry args={[roomW, 0.2, roomD]} />
        <primitive object={falseFloorMat} attach="material" />
      </mesh>

      {/* Железобетонные опорные пилоны / колонны, опирающиеся на перекрытие +6.60м */}
      {[-roomW / 2 + 1.0, roomW / 2 - 1.0].map((px) =>
        [-roomD / 2 + 1.0, roomD / 2 - 1.0].map((pz) => (
          <mesh
            key={`bshu-col-${px}-${pz}`}
            position={[px, -3.3, pz]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[0.8, 6.6, 0.8]} />
            <primitive object={structuralConcreteDark} attach="material" />
          </mesh>
        ))
      )}

      {/* 3. Стены помещения БЩУ */}
      {/* Задняя стена с видеостеной мнемосхем */}
      <mesh position={[0, roomH / 2, -roomD / 2]} receiveShadow castShadow name="VVER_BSHU_BackWall">
        <boxGeometry args={[roomW, roomH, 0.4]} />
        <primitive object={wallAcousticMat} attach="material" />
      </mesh>

      {/* Передняя стена: полупрозрачная/открытая смотровая галерея без глухих перегородок */}
      {/* Нижний цоколь передней стены (0.8м) */}
      <mesh position={[0, 0.4, roomD / 2]} receiveShadow name="VVER_BSHU_FrontSill">
        <boxGeometry args={[roomW, 0.8, 0.35]} />
        <primitive object={wallAcousticMat} attach="material" />
      </mesh>

      {/* Полупрозрачные витражи по бокам смотровой зоны */}
      {[-4.6, 4.6].map((gx, gi) => (
        <group key={`front-glazing-${gi}`} position={[gx, 2.2, roomD / 2]} renderOrder={10}>
          <mesh receiveShadow castShadow>
            <boxGeometry args={[4.2, 2.8, 0.08]} />
            <primitive object={glassViewingMat} attach="material" />
          </mesh>
          {/* Вертикальные алюминиевые импосты */}
          {[-1.6, 0, 1.6].map((mx) => (
            <mesh key={`mullion-${gi}-${mx}`} position={[mx, 0, 0]}>
              <boxGeometry args={[0.08, 2.8, 0.12]} />
              <primitive object={chromeMetalMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Центральный открытый смотровой проём (X: -2.5..+2.5м) для прямого обзора залов реактора */}
      {/* Верхняя балка над проёмом */}
      <mesh position={[0, roomH - 0.35, roomD / 2]}>
        <boxGeometry args={[roomW, 0.7, 0.35]} />
        <primitive object={wallAcousticMat} attach="material" />
      </mesh>

      {/* Боковые стены с акустическими панелями */}
      <mesh position={[-roomW / 2, roomH / 2, 0]} receiveShadow castShadow name="VVER_BSHU_LeftWall">
        <boxGeometry args={[0.4, roomH, roomD]} />
        <primitive object={wallAccentMat} attach="material" />
      </mesh>
      <mesh position={[roomW / 2, roomH / 2, 0]} receiveShadow castShadow name="VVER_BSHU_RightWall">
        <boxGeometry args={[0.4, roomH, roomD]} />
        <primitive object={wallAccentMat} attach="material" />
      </mesh>

      {/* Потолок с утопленными светильниками */}
      <group position={[0, roomH, 0]}>
        {/* Потолочная плита перекрытия (примыкает к отметке +15.0м реакторного зала) */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[roomW, 0.2, roomD]} />
          <primitive object={ceilingTileMat} attach="material" />
        </mesh>
      </group>

      {/* Потолочные светильники */}
      {[-4.5, -1.5, 1.5, 4.5].map((lx) =>
        [-2.5, 0, 2.5].map((lz) => (
          <mesh key={`vver-light-${lx}-${lz}`} position={[lx, roomH - 0.05, lz]}>
            <boxGeometry args={[1.4, 0.05, 0.9]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        ))
      )}

      {/* Точечное мягкое освещение помещения БЩУ */}
      <pointLight position={[0, roomH - 0.8, 0]} intensity={14} color="#f0f9ff" distance={18} />
      <pointLight position={[0, roomH - 1.0, -2.5]} intensity={12} color="#e0f2fe" distance={15} />

      {/* ==================================================================== */}
      {/* 3. ПАНОРАМНАЯ ВИДЕОСТЕНА МНЕМОСХЕМ БЩУ-1 ВВЭР-1000                   */}
      {/* ==================================================================== */}
      <group position={[0, 2.7, -roomD / 2 + 0.35]}>
        {/* Главный панорамный экран 4-х петель и мощности */}
        <DynamicCanvasMonitorMesh
          width={5.6}
          height={2.4}
          reactorId="vver1000"
          position={[0, 0, 0]}
        />

        {/* Боковые экраны электротехнического оборудования и турбогенератора */}
        <DynamicCanvasMonitorMesh
          width={2.8}
          height={1.7}
          reactorId="vver1000"
          position={[-4.6, 0, 0]}
          rotation={[0, 0.15, 0]}
        />
        <DynamicCanvasMonitorMesh
          width={2.8}
          height={1.7}
          reactorId="vver1000"
          position={[4.6, 0, 0]}
          rotation={[0, -0.15, 0]}
        />

        {/* Световые табло аварийной сигнализации (Annunciator panels) */}
        {[-7, -5, -3, -1, 1, 3, 5, 7].map((tx) => (
          <mesh key={`vver-ann-${tx}`} position={[tx, 1.45, 0.06]}>
            <boxGeometry args={[1.7, 0.28, 0.05]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.4} />
          </mesh>
        ))}
      </group>

      {/* ==================================================================== */}
      {/* 4. ГЛАВНЫЙ ПУЛЬТ ОПЕРАТОРОВ ВИУР И ВИУТ                              */}
      {/* ==================================================================== */}
      <group position={[0, 0, -1.5]} name="VVER1000_OperatorConsole">
        {/* Стол оператора — изогнутый эргономичный профиль из 5 секций */}
        {[-5.0, -2.5, 0, 2.5, 5.0].map((dx, di) => {
          const rotZ = di === 0 ? 0.18 : di === 1 ? 0.08 : di === 2 ? 0 : di === 3 ? -0.08 : -0.18;
          const posZ = Math.abs(dx) * 0.15;
          return (
            <group key={`console-sec-${di}`} position={[dx, 0, posZ]} rotation={[0, rotZ, 0]}>
              {/* Тумба пульта */}
              <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[2.4, 0.9, 1.3]} />
                <primitive object={consoleGreyMat} attach="material" />
              </mesh>
              {/* Наклонная панель приборов и кнопок */}
              <mesh position={[0, 0.92, 0.05]} rotation={[-0.22, 0, 0]} castShadow>
                <boxGeometry args={[2.36, 0.06, 1.25]} />
                <primitive object={deskTopMat} attach="material" />
              </mesh>
            </group>
          );
        })}

        {/* ================================================================== */}
        {/* А. СЕКЦИЯ ВИУР (РЕАКТОР, 4 ГЦЭН, СУЗ, ПГВ-1000, АЗ-5)              */}
        {/* ================================================================== */}
        <group position={[-2.4, 0.98, -0.15]} rotation={[-0.22, 0, 0]}>
          {/* 4 кнопки раздельного управления ГЦЭН-195М */}
          {[-0.6, -0.2, 0.2, 0.6].map((bx, bi) => (
            <InteractiveMCRButton
              key={`btn-mcp-${bi}`}
              label={`ГЦЭН №${bi + 1}`}
              reactorId="vver1000"
              action="TOGGLE_PUMP"
              payload={{ pumpIndex: bi }}
              color="#06d6a0"
              position={[bx, 0, 0.22]}
              scale={0.92}
            />
          ))}

          {/* Кнопка группового пуска ГЦЭН */}
          <InteractiveMCRButton
            label="ПУСК 4 ГЦЭН"
            reactorId="vver1000"
            action="TOGGLE_ALL_PUMPS"
            color="#00b4d8"
            position={[-0.45, 0, 0.05]}
            scale={1.0}
          />

          {/* Двухпозиционный ключ перемещения 61 группы ШУОК СУЗ */}
          <InteractiveSwitchKey
            label="ШУОК СУЗ"
            reactorId="vver1000"
            position={[0.0, 0, 0.05]}
          />

          {/* 4 кнопки парогенераторов ПГВ-1000 */}
          {[-0.6, -0.2, 0.2, 0.6].map((bx, bi) => (
            <InteractiveMCRButton
              key={`btn-sg-${bi}`}
              label={`ПГВ-${bi + 1}`}
              reactorId="vver1000"
              action="TOGGLE_STEAM_GEN"
              payload={{ sgIndex: bi }}
              color="#64dfdf"
              position={[bx, 0, -0.12]}
              scale={0.88}
            />
          ))}

          {/* ГЛАВНАЯ КНОПКА АВАРИЙНОЙ ЗАЩИТЫ АЗ-5 ПОД ЗАЩИТНОЙ КРЫШКОЙ */}
          <InteractiveMCRButton
            label="АЗ-5 ВВЭР"
            reactorId="vver1000"
            action="SCRAM_TRIP"
            color="#d90429"
            position={[0.55, 0, 0.05]}
            scale={1.15}
            isScram={true}
          />

          {/* Кнопка деблокировки / возврата в режим после АЗ-5 */}
          <InteractiveMCRButton
            label="СБРОС АЗ-5"
            reactorId="vver1000"
            action="RESET_SCRAM"
            color="#e2e8f0"
            position={[0.85, 0, 0.05]}
            scale={0.85}
          />
        </group>

        {/* ================================================================== */}
        {/* Б. СЕКЦИЯ ВИУТ (ТУРБИНА К-1000, ПОЛЯРНЫЙ КРАН, ГЕНЕРАТОР ТВВ-1000) */}
        {/* ================================================================== */}
        <group position={[2.6, 0.98, -0.15]} rotation={[-0.22, 0, 0]}>
          {/* Пуск миллионного турбоагрегата */}
          <InteractiveMCRButton
            label="ТУРБИНА К-1000"
            reactorId="vver1000"
            action="TOGGLE_TURBINE"
            color="#3a86ff"
            position={[-0.5, 0, 0.15]}
            scale={1.0}
          />

          {/* Ввод генератора ТВВ-1000 1000 МВт в сеть 500 кВ */}
          <InteractiveMCRButton
            label="СЕТЬ ТВВ-1000"
            reactorId="vver1000"
            action="TOGGLE_GENERATOR"
            color="#ffbe0b"
            position={[0.0, 0, 0.15]}
            scale={1.0}
          />

          {/* Переключатель хода полярного крана */}
          <InteractiveMCRButton
            label="ПОЛЯРНЫЙ КРАН"
            reactorId="vver1000"
            action="TOGGLE_POLAR_CRANE"
            color="#fb5607"
            position={[0.5, 0, 0.15]}
            scale={1.0}
          />

          {/* Тумблер звуковой сигнализации */}
          <InteractiveMCRButton
            label="ЗВУК СИРЕНЫ"
            reactorId="vver1000"
            action="TOGGLE_SOUND"
            color="#8338ec"
            position={[0.0, 0, -0.08]}
            scale={0.9}
          />
        </group>

        {/* ================================================================== */}
        {/* В. КРЕСЛА ОПЕРАТОРОВ                                               */}
        {/* ================================================================== */}
        {[-2.4, 2.6].map((cx, ci) => (
          <group key={`vver-chair-${ci}`} position={[cx, 0, 0.95]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[0.36, 0.36, 0.05, 5]} />
              <primitive object={chromeMetalMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.28, 0]}>
              <cylinderGeometry args={[0.035, 0.035, 0.35, 8]} />
              <primitive object={chromeMetalMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.56, 0.09, 0.54]} />
              <primitive object={leatherMat} attach="material" />
            </mesh>
            <mesh position={[0, 0.9, 0.23]} rotation={[-0.08, 0, 0]} castShadow>
              <boxGeometry args={[0.5, 0.72, 0.08]} />
              <primitive object={leatherMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
