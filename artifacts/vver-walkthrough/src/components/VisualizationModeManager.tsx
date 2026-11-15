import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reactorStateManager } from '@/scene/reactorStateManager';

export type RenderVisualizationMode = 'standard' | 'thermal' | 'wireframe';

interface VisualizationModeManagerProps {
  mode: RenderVisualizationMode;
}

// FLIR Ironbow температурная палитра для основных систем АЭС
const THERMAL_COLORS: Record<string, string> = {
  core: '#ffffff',          // 340 °C (Активная зона - белый раскал)
  hotLeg: '#ff1100',        // 320 °C (Горячие нитки - алый)
  steamGen: '#ff7700',      // 295 °C (Парогенераторы - оранжевый)
  coldLeg: '#00f0ff',       // 289 °C (Холодные нитки - циан)
  mcp: '#00d4aa',           // 288 °C (ГЦЭН - аквамарин)
  turbine: '#ff9900',       // 250 °C (ЦВД К-1000 - янтарный)
  deaerator: '#e0aaff',     // 160 °C (Деаэраторы - сиреневый)
  spentFuel: '#0088ff',     // 45 °C  (Бассейн выдержки - лазурный)
  feedwater: '#52b788',     // 220 °C (Питательная вода - зеленый)
  concrete: '#0a192f',      // 22 °C  (Бетон - глубокий индиго)
  metalStructure: '#112240',// 25 °C  (Металлоконструкции - темный синий)
  ground: '#030712',        // 18 °C  (Грунт - почти черный)
};

/**
 * Менеджер 3D-режимов визуализации сцены:
 * 1. Standard (Реалистичный вид с PBR-материалами и дневным светом)
 * 2. Thermal Cam (Тепловизор / спектр FLIR Ironbow с термограммой оборудования)
 * 3. Wireframe / X-Ray (Инженерный каркас / чертежный рентген конструкций)
 */
export default function VisualizationModeManager({ mode }: VisualizationModeManagerProps) {
  const { scene, gl, invalidate } = useThree();
  const prevMode = useRef<RenderVisualizationMode>('standard');
  const originalMaterials = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const thermalCoreMeshes = useRef<THREE.Mesh[]>([]);

  // Сохраняем и восстанавливаем материалы при переключении
  useEffect(() => {
    if (prevMode.current === mode) return;
    thermalCoreMeshes.current = [];

    if (mode === 'standard') {
      // Восстанавливаем оригинальные материалы
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const orig = originalMaterials.current.get(obj);
          if (orig) {
            obj.material = orig;
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => (m.wireframe = false));
            } else {
              obj.material.wireframe = false;
            }
          }
        }
      });
      scene.background = new THREE.Color('#bdd0e0');
      gl.setClearColor('#bdd0e0', 1.0);
    } else if (mode === 'thermal') {
      // Переводим материалы в режим тепловизора (FLIR Ironbow)
      scene.background = new THREE.Color('#030712');
      gl.setClearColor('#030712', 1.0);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (!originalMaterials.current.has(obj)) {
            originalMaterials.current.set(obj, obj.material);
          }

          const name = (obj.name || obj.parent?.name || '').toLowerCase();
          let thermalHex = THERMAL_COLORS.concrete;

          if (name.includes('core') || name.includes('fuel') || name.includes('rpv')) {
            thermalHex = THERMAL_COLORS.core;
          } else if (name.includes('hot') || name.includes('steam')) {
            thermalHex = THERMAL_COLORS.hotLeg;
          } else if (name.includes('sg') || name.includes('steamgen') || name.includes('pgv')) {
            thermalHex = THERMAL_COLORS.steamGen;
          } else if (name.includes('cold') || name.includes('pipe')) {
            thermalHex = THERMAL_COLORS.coldLeg;
          } else if (name.includes('mcp') || name.includes('pump')) {
            thermalHex = THERMAL_COLORS.mcp;
          } else if (name.includes('turbine') || name.includes('generator')) {
            thermalHex = THERMAL_COLORS.turbine;
          } else if (name.includes('pool') || name.includes('spent')) {
            thermalHex = THERMAL_COLORS.spentFuel;
          } else if (name.includes('deaerator')) {
            thermalHex = THERMAL_COLORS.deaerator;
          } else if (name.includes('steel') || name.includes('crane') || name.includes('rail')) {
            thermalHex = THERMAL_COLORS.metalStructure;
          } else if (name.includes('terrain') || name.includes('steppe') || name.includes('ground')) {
            thermalHex = THERMAL_COLORS.ground;
          }

          const origMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;

          // Создаем легковесный светящийся тепловизионный материал
          const thermalMat = new THREE.MeshStandardMaterial({
            color: thermalHex,
            emissive: thermalHex,
            emissiveIntensity: 0.65,
            roughness: 0.5,
            metalness: 0.1,
            wireframe: false,
            clippingPlanes: origMat?.clippingPlanes ?? null,
          });

          obj.material = thermalMat;

          if (name.includes('core') || name.includes('rpv')) {
            thermalCoreMeshes.current.push(obj);
          }
        }
      });
    } else if (mode === 'wireframe') {
      // Режим чертежного рентгена (Holographic Wireframe Blueprint)
      scene.background = new THREE.Color('#020617');
      gl.setClearColor('#020617', 1.0);

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (!originalMaterials.current.has(obj)) {
            originalMaterials.current.set(obj, obj.material);
          }

          const origMat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
          const name = (obj.name || obj.parent?.name || '').toLowerCase();
          let wireColor = '#00f0ff'; // neon cyan
          if (name.includes('containment') || name.includes('wall')) {
            wireColor = '#3b82f6';
          } else if (name.includes('core') || name.includes('rpv')) {
            wireColor = '#f43f5e';
          } else if (name.includes('steam') || name.includes('pipe')) {
            wireColor = '#eab308';
          }

          const wireMat = new THREE.MeshBasicMaterial({
            color: wireColor,
            wireframe: true,
            transparent: true,
            opacity: 0.65,
            clippingPlanes: origMat?.clippingPlanes ?? null,
          });

          obj.material = wireMat;
        }
      });
    }

    prevMode.current = mode;
    invalidate();
  }, [mode, scene, gl, invalidate]);

  // Непрерывный мониторинг температур оборудования для тепловизора без обхода всей сцены
  useFrame((state) => {
    if (mode !== 'thermal' || thermalCoreMeshes.current.length === 0) return;
    const v = reactorStateManager.vverState;
    const t = state.clock.elapsedTime;

    // Пульсация температуры активной зоны при работе
    const pulse = Math.sin(t * 2.0) * 0.1;
    const powerRatio = v.scramActive ? 0.2 : v.powerPercent / 100;
    const targetIntensity = 0.5 + powerRatio * 0.5 + pulse * 0.1;

    for (let i = 0; i < thermalCoreMeshes.current.length; i++) {
      const obj = thermalCoreMeshes.current[i];
      if (obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.emissiveIntensity = targetIntensity;
      }
    }
  });

  return null;
}
