import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reactorStateManager } from '@/scene/reactorStateManager';

interface CherenkovVolumeGlowProps {
  position?: [number, number, number];
  radius?: number;
  height?: number;
  intensity?: number;
  color?: string;
  isSpentFuelPool?: boolean;
}

/**
 * Аутентичная визуализация свечения Вавилова — Черенкова:
 * - Объемное сине-бирюзовое свечение (электрический лазурный спектр 400-450 нм)
 * - Многослойный полупрозрачный градиентный конус с AdditiveBlending
 * - Мягкое мерцание / микрофлуктуации квантового излучения в водной среде
 * - Динамическая реакция на мощность реактора и мгновенное затухание при АЗ-5
 * - Микрочастицы сцинтилляции, поднимающиеся в толще деионизированной воды
 */
export default function CherenkovVolumeGlow({
  position = [0, 0, 0],
  radius = 1.8,
  height = 4.0,
  intensity = 1.0,
  color = '#00d4ff',
  isSpentFuelPool = false,
}: CherenkovVolumeGlowProps) {
  const outerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Генерируем взвешенные частицы сцинтилляции в объеме воды
  const [particlePositions, particleVelocities] = useMemo(() => {
    const count = isSpentFuelPool ? 75 : 60;
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = Math.random() * (radius * 0.85);
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(theta) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * height;
      pos[i * 3 + 2] = Math.sin(theta) * r;
      vel[i] = 0.35 + Math.random() * 0.55; // скорость подъема
    }

    return [pos, vel];
  }, [radius, height, isSpentFuelPool]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const v = reactorStateManager.vverState;

    // Расчет коэффициента светимости в зависимости от мощности и состояния АЗ-5
    let powerFactor = isSpentFuelPool
      ? 0.75 + Math.sin(t * 1.8) * 0.08
      : v.powerPercent / 100;

    if (!isSpentFuelPool && v.scramActive) {
      // При АЗ-5 свечение спадает до остаточного затухающего уровня (~8%)
      powerFactor = Math.max(0.08, powerFactor * 0.35);
    }

    // Мягкое органичное мерцание (двухчастотная интерференция)
    const shimmer = 0.88 + Math.sin(t * 3.4) * 0.08 + Math.sin(t * 9.2) * 0.04;
    const effectiveAlpha = Math.max(0.02, powerFactor * shimmer * intensity);

    if (coreMatRef.current) {
      coreMatRef.current.opacity = Math.min(0.95, effectiveAlpha * 0.85);
      if (v.scramActive && !isSpentFuelPool) {
        coreMatRef.current.color.set('#0055aa'); // спад в темно-синий
      } else {
        coreMatRef.current.color.set(color);
      }
    }

    if (outerMatRef.current) {
      outerMatRef.current.opacity = Math.min(0.55, effectiveAlpha * 0.38);
    }

    if (lightRef.current) {
      lightRef.current.intensity = effectiveAlpha * (isSpentFuelPool ? 8.0 : 14.0);
    }

    // Анимация подъема частиц сцинтилляции в столбе воды
    if (particlesRef.current) {
      const geom = particlesRef.current.geometry;
      const posAttr = geom.attributes.position as THREE.BufferAttribute;
      const halfH = height / 2;

      for (let i = 0; i < particleVelocities.length; i++) {
        let y = posAttr.getY(i) + particleVelocities[i] * dt;
        if (y > halfH) {
          y = -halfH;
        }
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      {/* 1. Внутренний яркий гиперболический сердечник свечения */}
      <mesh>
        <cylinderGeometry args={[radius * 0.35, radius * 0.65, height, 14, 1, true]} />
        <meshBasicMaterial
          ref={coreMatRef}
          color={color}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Внешняя объемная оболочка рассеяния в толще воды */}
      <mesh>
        <cylinderGeometry args={[radius * 0.75, radius * 1.15, height * 1.05, 14, 1, true]} />
        <meshBasicMaterial
          ref={outerMatRef}
          color="#00ffff"
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Горизонтальные рассеивающие диски ореола (Fresnel-эффект водной глади) */}
      {[-0.35, 0.0, 0.35].map((yFrac, idx) => (
        <mesh key={`halo-${idx}`} position={[0, yFrac * height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, radius * (0.8 + idx * 0.2), 14]} />
          <meshBasicMaterial
            color="#00e5ff"
            transparent
            opacity={0.22 - idx * 0.05}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* 4. Взвешенные светящиеся микрочастицы сцинтилляции */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.07}
          color="#80f5ff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* 5. Локальный источник объемного синего света */}
      <pointLight
        ref={lightRef}
        color="#00b4ff"
        intensity={10.0}
        distance={height * 3.5}
        decay={2}
      />
    </group>
  );
}
