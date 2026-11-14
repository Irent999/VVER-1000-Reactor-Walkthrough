import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reactorStateManager } from '@/scene/reactorStateManager';
import { RPV, STEAM_GEN, MCP } from '@/scene/constants';

interface LoopCurveData {
  hotCurve: THREE.CatmullRomCurve3;
  coldCurve: THREE.CatmullRomCurve3;
  coreCurve: THREE.CatmullRomCurve3;
}

const PARTICLES_PER_HOT_LEG = 18;
const PARTICLES_PER_COLD_LEG = 24;
const PARTICLES_PER_CORE = 16;
const TOTAL_PARTICLES = 4 * (PARTICLES_PER_HOT_LEG + PARTICLES_PER_COLD_LEG + PARTICLES_PER_CORE);

/**
 * Анимация физического потока теплоносителя 1-го контура ВВЭР-1000:
 * 1. Горячая нитка (RPV -> ПГВ-1000): Т = 320.4 °C, ярко-красный / огненный спектр
 * 2. Теплообмен в парогенераторе: отдача тепла во 2-й контур с выработкой сухого пара
 * 3. Холодная нитка (ПГВ-1000 -> ГЦЭН-195М -> RPV): Т = 289.2 °C, сине-бирюзовый спектр
 * 4. Нагрев в активной зоне реактора (снизу вверх с цветовым градиентом от синего к красному)
 * 5. Динамическая скорость потока по каждой петле согласно реальным RPM насосов ГЦЭН
 */
const _tempCurvePt = new THREE.Vector3();

export default function PrimaryCoolantFlow() {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Построение точных 3D-траекторий 4 циркуляционных петель
  const loopsData = useMemo<LoopCurveData[]>(() => {
    const data: LoopCurveData[] = [];
    const nozzleY = 15.2;
    const inletNozzleY = 14.1;

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const rVesselX = Math.cos(angle) * (RPV.radius + 0.35);
      const rVesselZ = Math.sin(angle) * (RPV.radius + 0.35);

      const sgX = Math.cos(angle) * STEAM_GEN.centerRadius;
      const sgZ = Math.sin(angle) * STEAM_GEN.centerRadius;

      const pumpX = Math.cos(angle) * MCP.centerRadius;
      const pumpZ = Math.sin(angle) * MCP.centerRadius;

      // 1. Горячая нитка (Hot Leg: RPV -> SG) ~320°C
      const hotPts = [
        new THREE.Vector3(rVesselX, nozzleY, rVesselZ),
        new THREE.Vector3(rVesselX * 0.5 + sgX * 0.5, nozzleY + 1.2, rVesselZ * 0.5 + sgZ * 0.5),
        new THREE.Vector3(sgX, STEAM_GEN.centerY + 0.2, sgZ),
      ];
      const hotCurve = new THREE.CatmullRomCurve3(hotPts);

      // 2. Холодная нитка (Cold Leg: SG -> MCP -> RPV) ~289°C
      const coldPts = [
        new THREE.Vector3(sgX, STEAM_GEN.centerY - 1.6, sgZ),
        new THREE.Vector3((sgX + pumpX) / 2, STEAM_GEN.centerY - 2.0, (sgZ + pumpZ) / 2),
        new THREE.Vector3(pumpX, MCP.centerY - 0.4, pumpZ),
        new THREE.Vector3((pumpX + rVesselX) / 2, inletNozzleY + 0.4, (pumpZ + rVesselZ) / 2),
        new THREE.Vector3(rVesselX, inletNozzleY, rVesselZ),
      ];
      const coldCurve = new THREE.CatmullRomCurve3(coldPts);

      // 3. Восходящий поток теплоносителя сквозь активную зону (RPV bottom -> RPV top)
      const coreR = 0.5 + (i * 0.35);
      const corePts = [
        new THREE.Vector3(Math.cos(angle) * coreR, 8.5, Math.sin(angle) * coreR),
        new THREE.Vector3(Math.cos(angle) * coreR, 12.0, Math.sin(angle) * coreR),
        new THREE.Vector3(rVesselX * 0.8, nozzleY, rVesselZ * 0.8),
      ];
      const coreCurve = new THREE.CatmullRomCurve3(corePts);

      data.push({ hotCurve, coldCurve, coreCurve });
    }
    return data;
  }, []);

  // Предрасчет цветов частиц для градиента температур
  const particleColors = useMemo(() => {
    const colors: THREE.Color[] = [];
    const hotCol1 = new THREE.Color('#ff1a00'); // 320 °C
    const hotCol2 = new THREE.Color('#ff6e00'); // 305 °C
    const coldCol1 = new THREE.Color('#00e5ff'); // 289 °C
    const coldCol2 = new THREE.Color('#0077ff'); // 285 °C

    for (let loop = 0; loop < 4; loop++) {
      // Hot leg
      for (let p = 0; p < PARTICLES_PER_HOT_LEG; p++) {
        const t = p / PARTICLES_PER_HOT_LEG;
        const c = hotCol1.clone().lerp(hotCol2, t);
        colors.push(c);
      }
      // Cold leg
      for (let p = 0; p < PARTICLES_PER_COLD_LEG; p++) {
        const t = p / PARTICLES_PER_COLD_LEG;
        const c = coldCol1.clone().lerp(coldCol2, t);
        colors.push(c);
      }
      // Core flow (heating up from cold blue to fiery red)
      for (let p = 0; p < PARTICLES_PER_CORE; p++) {
        const t = p / PARTICLES_PER_CORE;
        const c = coldCol2.clone().lerp(hotCol1, t);
        colors.push(c);
      }
    }
    return colors;
  }, []);

  // Инициализация цветов в InstancedMesh
  useMemo(() => {
    if (instancedMeshRef.current) {
      particleColors.forEach((color, i) => {
        instancedMeshRef.current?.setColorAt(i, color);
      });
      if (instancedMeshRef.current.instanceColor) {
        instancedMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [particleColors]);

  // Смещение потока для каждой петли
  const loopOffsets = useRef([0, 0.25, 0.5, 0.75]);

  useFrame((_, dt) => {
    if (!instancedMeshRef.current) return;
    const v = reactorStateManager.vverState;

    let instanceIdx = 0;

    for (let loop = 0; loop < 4; loop++) {
      const rpm = v.pumpRPM[loop];
      const isPumpOn = v.pumps[loop];
      // Скорость циркуляции прямо пропорциональна оборотам ГЦЭН
      const flowSpeed = (rpm / 1500) * (isPumpOn ? 0.38 : 0.08);

      loopOffsets.current[loop] = (loopOffsets.current[loop] + dt * flowSpeed) % 1.0;
      const baseOffset = loopOffsets.current[loop];

      const { hotCurve, coldCurve, coreCurve } = loopsData[loop];

      // 1. Частицы горячей нитки (RPV -> SG)
      for (let p = 0; p < PARTICLES_PER_HOT_LEG; p++) {
        const t = (baseOffset + p / PARTICLES_PER_HOT_LEG) % 1.0;
        hotCurve.getPoint(t, _tempCurvePt);
        const scale = 0.16 + Math.sin(t * Math.PI) * 0.05;

        dummy.position.copy(_tempCurvePt);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        instancedMeshRef.current.setMatrixAt(instanceIdx, dummy.matrix);
        instanceIdx++;
      }

      // 2. Частицы холодной нитки (SG -> MCP -> RPV)
      for (let p = 0; p < PARTICLES_PER_COLD_LEG; p++) {
        const t = (baseOffset + p / PARTICLES_PER_COLD_LEG) % 1.0;
        coldCurve.getPoint(t, _tempCurvePt);
        const scale = 0.15 + Math.sin(t * Math.PI) * 0.04;

        dummy.position.copy(_tempCurvePt);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        instancedMeshRef.current.setMatrixAt(instanceIdx, dummy.matrix);
        instanceIdx++;
      }

      // 3. Частицы нагрева внутри активной зоны
      for (let p = 0; p < PARTICLES_PER_CORE; p++) {
        const t = (baseOffset + p / PARTICLES_PER_CORE) % 1.0;
        coreCurve.getPoint(t, _tempCurvePt);
        const scale = 0.14 + Math.sin(t * Math.PI) * 0.04;

        dummy.position.copy(_tempCurvePt);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        instancedMeshRef.current.setMatrixAt(instanceIdx, dummy.matrix);
        instanceIdx++;
      }
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="PrimaryCoolantFlow_Animation">
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, TOTAL_PARTICLES]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
