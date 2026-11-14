/**
 * ============================================================================
 * ВВЭР-1000: ЛЕВЫЙ ВСПОМОГАТЕЛЬНЫЙ РЕАКТОРНЫЙ КОРПУС / ОБСТРОЙКА РО (БЩУ)
 * (VVER-1000 AUXILIARY REACTOR BUILDING & CONTROL ANNEX)
 * ============================================================================
 * 
 * Расположен слева от цилиндрической части контейнмента (западное крыло):
 * - Координаты X: от X = -22.5м (примыкание к оболочке контейнмента) до X = -44.5м (западный фасад)
 * - Координаты Z: от Z = -16.0м до Z = +16.0м (симметрично относительно оси реактора)
 * - Отметки высот:
 *   - Подошва фундамента: отметка -5.5м (ground) / -5.0м
 *   - Цокольный / кабельный полуэтаж: отметка 0.00м
 *   - Технологический этаж КИПиА и нормальной эксплуатации: отметка +6.60м
 *   - ГЛАВНЫЙ ЭТАЖ БЩУ (Блочный щит управления): отметка +13.20м (высота зала 4.2м)
 *   - Верхний этаж вентиляции БЩУ и резервного щита РЩУ: отметка +18.20м
 *   - Кровля с парапетом: отметка +25.50м / +26.50м
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { FLOOR_LEVELS } from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

// Материалы фасадов и конструкций вспомогательного корпуса ВВЭР-1000
const exteriorConcreteMat = new THREE.MeshStandardMaterial({
  color: '#E3E5E8', // Светло-серый монолитный бетон АЭС
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.3, 0.3),
  roughness: 0.86,
  metalness: 0.03,
});

const structuralDarkConcreteMat = new THREE.MeshStandardMaterial({
  color: '#6e747d',
  map: concreteMap,
  normalMap: concreteNormalMap,
  roughnessMap: concreteRoughnessMap,
  normalScale: new THREE.Vector2(0.2, 0.2),
  roughness: 0.88,
  metalness: 0.03,
});

const baseRedBrownSkirtMat = new THREE.MeshStandardMaterial({
  color: '#8B4513', // Защитный цоколь красно-коричневого оттенка
  roughness: 0.72,
  metalness: 0.14,
});

const windowGlassMat = new THREE.MeshStandardMaterial({
  color: '#1a3344',
  roughness: 0.1,
  metalness: 0.85,
});

const viewingWindowGlassMat = new THREE.MeshPhysicalMaterial({
  color: '#cffafe',
  transmission: 0.75,
  transparent: true,
  opacity: 0.35,
  roughness: 0.15,
  metalness: 0.1,
  depthWrite: false,
});

const metalTrimMat = new THREE.MeshStandardMaterial({
  color: '#34495e',
  roughness: 0.45,
  metalness: 0.65,
});

const steelTrussMat = new THREE.MeshStandardMaterial({
  color: '#e4e7eb',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.32,
  metalness: 0.88,
});

const roofGravelMat = new THREE.MeshStandardMaterial({
  color: '#475569',
  roughness: 0.95,
  metalness: 0.05,
});

export interface VVER1000AuxiliaryBuildingProps {
  children?: React.ReactNode;
}

export default function VVER1000AuxiliaryBuilding({ children }: VVER1000AuxiliaryBuildingProps) {
  const gY = FLOOR_LEVELS.ground; // -5.5m

  // Геометрия корпуса
  const eastX = -22.5; // Примыкание к цилиндру контейнмента
  const westX = -44.5; // Западный внешний фасад
  const bldgW = eastX - westX; // 22.0m
  const centerX = (eastX + westX) / 2; // -33.5m
  const bldgD = 32.0; // от Z = -16.0м до Z = +16.0м
  const centerZ = 0.0;

  const foundationY = gY + 0.25; // -5.25m
  const level0Y = 0.0;
  const level1Y = 6.6;
  const level2Y = 13.2; // ЭТАЖ БЩУ
  const level3Y = 18.2;
  const roofY = 25.5;
  const totalH = roofY - gY; // 31.0m

  return (
    <group name="VVERUnit1_AuxiliaryBuilding">
      {/* ================================================================== */}
      {/* 1. ФУНДАМЕНТНАЯ ПЛИТА И ЦОКОЛЬНЫЙ ПОЯС                              */}
      {/* ================================================================== */}
      <mesh
        position={[centerX, foundationY, centerZ]}
        receiveShadow
        castShadow
        name="AuxBldg_FoundationSlab"
      >
        <boxGeometry args={[bldgW + 1.2, 0.5, bldgD + 1.2]} />
        <primitive object={structuralDarkConcreteMat} attach="material" />
      </mesh>

      {/* Красно-коричневый защитный цоколь (высота 3.5м, от -5.5м до -2.0м) */}
      <mesh
        position={[centerX, gY + 1.75, centerZ]}
        receiveShadow
        castShadow
        name="AuxBldg_PlinthSkirt"
      >
        <boxGeometry args={[bldgW, 3.5, bldgD]} />
        <primitive object={baseRedBrownSkirtMat} attach="material" />
      </mesh>

      {/* ================================================================== */}
      {/* 2. НЕСУЩИЕ МЕЖЭТАЖНЫЕ ПЕРЕКРЫТИЯ (ЖЕЛЕЗОБЕТОННЫЕ ПЛИТЫ)            */}
      {/* ================================================================== */}
      {/* Перекрытие отметки 0.00м */}
      <mesh position={[centerX, level0Y - 0.2, centerZ]} receiveShadow>
        <boxGeometry args={[bldgW - 0.4, 0.4, bldgD - 0.4]} />
        <primitive object={structuralDarkConcreteMat} attach="material" />
      </mesh>

      {/* Перекрытие отметки +6.60м */}
      <mesh position={[centerX, level1Y - 0.2, centerZ]} receiveShadow>
        <boxGeometry args={[bldgW - 0.4, 0.4, bldgD - 0.4]} />
        <primitive object={structuralDarkConcreteMat} attach="material" />
      </mesh>

      {/* ГЛАВНОЕ ПЕРЕКРЫТИЕ ОТМЕТКИ +13.20м (ПОЛ ОПЕРАТОРСКОГО ЭТАЖА БЩУ) */}
      <mesh
        position={[centerX, level2Y - 0.2, centerZ]}
        receiveShadow
        name="AuxBldg_Level13FloorDeck"
        userData={{
          isFloor: true,
          isWalkableFloor: true,
          floorLevel: 13.2,
          floorY: 13.2,
          levelName: 'AuxBldg_Level13FloorDeck',
        }}
      >
        <boxGeometry args={[bldgW - 0.4, 0.4, bldgD - 0.4]} />
        <primitive object={structuralDarkConcreteMat} attach="material" />
      </mesh>

      {/* Перекрытие отметки +18.20м (Потолок зала БЩУ и пол вентцентра) */}
      <mesh position={[centerX, level3Y - 0.2, centerZ]} receiveShadow>
        <boxGeometry args={[bldgW - 0.4, 0.4, bldgD - 0.4]} />
        <primitive object={structuralDarkConcreteMat} attach="material" />
      </mesh>

      {/* Кровельное перекрытие на отметке +25.50м */}
      <mesh position={[centerX, roofY - 0.2, centerZ]} receiveShadow>
        <boxGeometry args={[bldgW, 0.4, bldgD]} />
        <primitive object={roofGravelMat} attach="material" />
      </mesh>

      {/* Кровельный парапет по периметру (высота 1.0м) */}
      <group position={[centerX, roofY + 0.5, centerZ]}>
        {/* Северный и южный парапеты */}
        {[-bldgD / 2 + 0.25, bldgD / 2 - 0.25].map((pz, pi) => (
          <mesh key={`parapet-ns-${pi}`} position={[0, 0, pz]} castShadow receiveShadow>
            <boxGeometry args={[bldgW, 1.0, 0.5]} />
            <primitive object={exteriorConcreteMat} attach="material" />
          </mesh>
        ))}
        {/* Западный парапет */}
        <mesh position={[-bldgW / 2 + 0.25, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 1.0, bldgD]} />
          <primitive object={exteriorConcreteMat} attach="material" />
        </mesh>
      </group>

      {/* ================================================================== */}
      {/* 3. ВЕРТИКАЛЬНЫЕ ОПОРНЫЕ КОЛОННЫ КАРКАСА ЗДАНИЯ                     */}
      {/* ================================================================== */}
      {[-bldgW / 2 + 1.2, -bldgW / 6, bldgW / 6, bldgW / 2 - 1.2].map((cx, ci) =>
        [-bldgD / 2 + 1.2, -bldgD / 6, bldgD / 6, bldgD / 2 - 1.2].map((cz, cj) => (
          <mesh
            key={`col-${ci}-${cj}`}
            position={[centerX + cx, (roofY + gY) / 2, cz]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[0.9, totalH, 0.9]} />
            <primitive object={structuralDarkConcreteMat} attach="material" />
          </mesh>
        ))
      )}

      {/* ================================================================== */}
      {/* 4. НАРУЖНЫЕ ФАСАДЫ И СТЕНЫ ЗДАНИЯ                                  */}
      {/* ================================================================== */}
      {/* Западный фасад (X = -44.5м): наружные панели, окна, портал входа */}
      <group position={[westX, 0, centerZ]}>
        {/* Нижний и средний массив стены (от -2.0м до +12.8м) */}
        <mesh position={[0.2, (12.8 - 2.0) / 2 - 2.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 14.8, bldgD]} />
          <primitive object={exteriorConcreteMat} attach="material" />
        </mesh>

        {/* Смотровые технологические витражи на этаже БЩУ (+13.20м) */}
        <mesh position={[0.2, 15.5, 0]}>
          <boxGeometry args={[0.4, 4.4, bldgD - 4.0]} />
          <primitive object={viewingWindowGlassMat} attach="material" />
        </mesh>

        {/* Верхний массив стены (от +18.0м до +25.5м) */}
        <mesh position={[0.2, (25.5 + 18.0) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.4, 7.5, bldgD]} />
          <primitive object={exteriorConcreteMat} attach="material" />
        </mesh>

        {/* Ленточные оконные пояса на технических этажах */}
        {[-8, 8].map((wz, wi) => (
          <mesh key={`west-ribbon-win-${wi}`} position={[-0.05, 3.5, wz]}>
            <boxGeometry args={[0.2, 1.8, 10.0]} />
            <primitive object={windowGlassMat} attach="material" />
          </mesh>
        ))}

        {/* Входной козырек и портал на отметке земли */}
        <group position={[-1.2, 0.0, 0]}>
          <mesh position={[0, 3.2, 0]} castShadow>
            <boxGeometry args={[2.4, 0.3, 5.0]} />
            <primitive object={metalTrimMat} attach="material" />
          </mesh>
          <mesh position={[0.8, 1.4, 0]}>
            <boxGeometry args={[0.2, 2.8, 3.6]} />
            <primitive object={metalTrimMat} attach="material" />
          </mesh>
          {/* Ступени входа */}
          <mesh position={[0, -0.4, 0]} receiveShadow>
            <boxGeometry args={[2.0, 0.8, 4.2]} />
            <primitive object={structuralDarkConcreteMat} attach="material" />
          </mesh>
        </group>
      </group>

      {/* Северный фасад (Z = -16.0м) */}
      <group position={[centerX, 0, -bldgD / 2]}>
        <mesh position={[0, (roofY - 2.0) / 2 - 2.0, 0.2]} castShadow receiveShadow>
          <boxGeometry args={[bldgW, roofY + 2.0, 0.4]} />
          <primitive object={exteriorConcreteMat} attach="material" />
        </mesh>
        {/* Ряды окон */}
        {[3.5, 9.5, 21.5].map((wy, wi) => (
          <mesh key={`north-win-${wi}`} position={[0, wy, -0.05]}>
            <boxGeometry args={[16.0, 1.6, 0.2]} />
            <primitive object={windowGlassMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Южный фасад (Z = +16.0м) */}
      <group position={[centerX, 0, bldgD / 2]}>
        <mesh position={[0, (roofY - 2.0) / 2 - 2.0, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[bldgW, roofY + 2.0, 0.4]} />
          <primitive object={exteriorConcreteMat} attach="material" />
        </mesh>
        {/* Ряды окон */}
        {[3.5, 9.5, 21.5].map((wy, wi) => (
          <mesh key={`south-win-${wi}`} position={[0, wy, 0.05]}>
            <boxGeometry args={[16.0, 1.6, 0.2]} />
            <primitive object={windowGlassMat} attach="material" />
          </mesh>
        ))}
      </group>

      {/* Восточный узел примыкания к цилиндру контейнмента (X = -22.5м) */}
      <group position={[eastX, 0, centerZ]}>
        {/* Сейсмодеформационный переходный воротник между корпусом и контейнментом */}
        <mesh position={[-0.4, (roofY - 2.0) / 2 - 2.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, roofY + 2.0, bldgD - 0.2]} />
          <primitive object={structuralDarkConcreteMat} attach="material" />
        </mesh>

        {/* Гермошлюз / переходная галерея на отметке +13.20м в реакторное отделение */}
        <group position={[0.8, level2Y + 1.8, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.4, 3.6, 4.2]} />
            <primitive object={structuralDarkConcreteMat} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.5, 3.2, 3.8]} />
            <primitive object={metalTrimMat} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ================================================================== */}
      {/* 5. КРОВЕЛЬНОЕ ОБОРУДОВАНИЕ (ВЕНТУСТАНОВКИ, ЧИЛЛЕРЫ, ДЕФЛЕКТОРЫ)    */}
      {/* ================================================================== */}
      <group position={[centerX, roofY + 0.2, centerZ]}>
        {/* Блоки приточно-вытяжной вентиляции БЩУ */}
        {[-5.0, 5.0].map((vx, vi) => (
          <group key={`roof-vent-${vi}`} position={[vx, 1.2, -6.0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[4.2, 2.2, 5.0]} />
              <primitive object={metalTrimMat} attach="material" />
            </mesh>
            {/* Вентиляционные решетки */}
            <mesh position={[0, 0.4, 2.55]}>
              <boxGeometry args={[3.6, 1.2, 0.1]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Крышные градирни чиллерной системы кондиционирования БЩУ */}
        {[-4.0, 4.0].map((cx, ci) => (
          <group key={`roof-chiller-${ci}`} position={[cx, 1.0, 7.0]}>
            <mesh castShadow>
              <cylinderGeometry args={[1.5, 1.5, 1.8, 10]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* ================================================================== */}
      {/* 6. ПОМЕЩЕНИЕ БЩУ И ДОЧЕРНИЕ ОБЪЕКТЫ ЭТАЖА +13.20м                 */}
      {/* ================================================================== */}
      {children}
    </group>
  );
}
