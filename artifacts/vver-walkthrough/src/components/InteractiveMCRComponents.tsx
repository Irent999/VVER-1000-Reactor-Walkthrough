/**
 * ============================================================================
 * ИНТЕРАКТИВНЫЕ КОМПОНЕНТЫ ПУЛЬТОВ БЩУ ВВЭР-1000 И РИТМ-200Н
 * (PHYSICAL BUTTONS, SWITCH KEYS, SAFETY COVERS & DUAL CANVAS MONITORS)
 * ============================================================================
 */

import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  reactorStateManager,
  MCRCanvasMonitorRenderer,
  type ReactorType,
  type ActionPayload,
} from '@/scene/reactorStateManager';

// Материалы тумблеров, хрома и маркировки
const chromeMat = new THREE.MeshStandardMaterial({ color: '#e0e0e0', metalness: 0.95, roughness: 0.15 });
const yellowGuardMat = new THREE.MeshStandardMaterial({ color: '#ffb703', roughness: 0.4, metalness: 0.3 });
const blackPlasticMat = new THREE.MeshStandardMaterial({ color: '#1a1d20', roughness: 0.5, metalness: 0.2 });
const redMushroomMat = new THREE.MeshStandardMaterial({ color: '#d90429', emissive: '#4a000b', emissiveIntensity: 0.3, roughness: 0.35, metalness: 0.15 });

export interface InteractiveButtonProps {
  label: string;
  subLabel?: string;
  color?: string;
  reactorId?: ReactorType;
  action: string;
  payload?: ActionPayload;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isScram?: boolean;
}

/**
 * Физическая интерактивная кнопка пульта БЩУ с Raycaster-взаимодействием,
 * подсветкой при наведении (emissive), анимацией нажатия и звуком
 */
export function InteractiveMCRButton({
  label,
  subLabel,
  color = '#00d2ff',
  reactorId = 'ritm200n',
  action,
  payload,
  position,
  rotation = [0, 0, 0],
  scale = 1.0,
  isScram = false,
}: InteractiveButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const pressTimer = useRef<number | null>(null);

  const mat = useMemo(() => {
    return isScram
      ? redMushroomMat.clone()
      : new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.25,
          roughness: 0.3,
          metalness: 0.2,
        });
  }, [color, isScram]);

  useFrame(() => {
    // Плавная динамика подсветки
    const targetIntensity = pressed ? 1.6 : hovered ? 0.95 : (isScram ? 0.55 : 0.25);
    mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, 0.25);
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setPressed(true);
    reactorStateManager.dispatch(reactorId, action, payload);

    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      setPressed(false);
    }, 180);
  };

  const pressYOffset = pressed ? -0.012 * scale : 0;

  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* Защитная окантовка кнопки */}
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[isScram ? 0.058 : 0.04, isScram ? 0.062 : 0.042, 0.014, 16]} />
        <primitive object={isScram ? yellowGuardMat : chromeMat} attach="material" />
      </mesh>

      {/* Подвижный толкатель кнопки (Interactive Raycast target) */}
      <mesh
        position={[0, 0.02 + pressYOffset, 0]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <cylinderGeometry args={[isScram ? 0.048 : 0.028, isScram ? 0.052 : 0.03, isScram ? 0.038 : 0.028, 16]} />
        <primitive object={mat} attach="material" />
      </mesh>

      {/* Откидная защитная скоба (для кнопки АЗ / АЗ-5) */}
      {isScram && (
        <mesh position={[0, 0.045, -0.04]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.075, 0.042, 0.01]} />
          <meshStandardMaterial color="#ffcc00" roughness={0.3} metalness={0.5} transparent opacity={0.65} />
        </mesh>
      )}

      {/* Текстовая табличка с подписью команды */}
      <group position={[0, 0.01, 0.075]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <planeGeometry args={[0.11, 0.036]} />
          <primitive object={blackPlasticMat} attach="material" />
        </mesh>
        <Html
          position={[0, 0, 0.002]}
          transform
          distanceFactor={1.2}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: hovered ? '#ffffff' : (isScram ? '#ff9999' : '#d0e0ec'),
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
          }}
        >
          {label}
        </Html>
      </group>
    </group>
  );
}

/**
 * Интерактивный двухпозиционный ключ СУЗ (Switch Key ШУОК / СУЗ)
 */
export function InteractiveSwitchKey({
  label,
  reactorId = 'ritm200n',
  position,
  rotation = [0, 0, 0],
  onUp,
  onDown,
}: {
  label: string;
  reactorId?: ReactorType;
  position: [number, number, number];
  rotation?: [number, number, number];
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [handleAngle, setHandleAngle] = useState(0);
  const [hovered, setHovered] = useState(false);
  const handleRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (handleRef.current) {
      handleRef.current.rotation.z = THREE.MathUtils.lerp(handleRef.current.rotation.z, handleAngle, 0.25);
    }
  });

  const triggerUp = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHandleAngle(-0.6);
    if (onUp) onUp();
    else reactorStateManager.dispatch(reactorId, 'CRDM_STEP_UP');
    setTimeout(() => setHandleAngle(0), 160);
  };

  const triggerDown = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setHandleAngle(0.6);
    if (onDown) onDown();
    else reactorStateManager.dispatch(reactorId, 'CRDM_STEP_DOWN');
    setTimeout(() => setHandleAngle(0), 160);
  };

  return (
    <group position={position} rotation={rotation}>
      {/* База ключа */}
      <mesh position={[0, 0.008, 0]}>
        <boxGeometry args={[0.075, 0.016, 0.075]} />
        <primitive object={blackPlasticMat} attach="material" />
      </mesh>

      {/* Поворотная рукоятка ключа */}
      <group ref={handleRef} position={[0, 0.02, 0]}>
        <mesh
          onClick={triggerUp}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        >
          <boxGeometry args={[0.016, 0.048, 0.03]} />
          <meshStandardMaterial
            color={hovered ? '#ffffff' : '#e5e5e5'}
            emissive={hovered ? '#00d2ff' : '#000000'}
            emissiveIntensity={hovered ? 0.4 : 0}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Кнопки ▲ и ▼ по бокам ключа */}
      <mesh
        position={[-0.045, 0.014, 0]}
        onClick={triggerUp}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <cylinderGeometry args={[0.018, 0.02, 0.014, 12]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={0.3} />
      </mesh>

      <mesh
        position={[0.045, 0.014, 0]}
        onClick={triggerDown}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <cylinderGeometry args={[0.018, 0.02, 0.014, 12]} />
        <meshStandardMaterial color="#ef476f" emissive="#ef476f" emissiveIntensity={0.3} />
      </mesh>

      {/* Подпись */}
      <group position={[0, 0.01, 0.068]} rotation={[-Math.PI / 2, 0, 0]}>
        <Html
          position={[0, 0, 0.002]}
          transform
          distanceFactor={1.2}
          center
          style={{
            pointerEvents: 'none',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: '#ffd166',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Html>
      </group>
    </group>
  );
}

/**
 * 3D-монитор БЩУ с динамически обновляемой текстурой Canvas
 * Поддерживает режим ВВЭР-1000 и РИТМ-200Н
 */
export function DynamicCanvasMonitorMesh({
  width = 2.4,
  height = 1.3,
  reactorId = 'ritm200n',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: {
  width?: number;
  height?: number;
  reactorId?: ReactorType;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const rendererRef = useRef<MCRCanvasMonitorRenderer | null>(null);

  if (!rendererRef.current) {
    const resW = width > 4 ? 2048 : 1024;
    rendererRef.current = new MCRCanvasMonitorRenderer(resW, 512, reactorId);
  }

  useFrame(() => {
    if (rendererRef.current) {
      rendererRef.current.reactorId = reactorId;
      rendererRef.current.update(performance.now());
    }
  });

  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
    };
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {/* Корпус монитора */}
      <mesh castShadow>
        <boxGeometry args={[width + 0.1, height + 0.1, 0.08]} />
        <meshStandardMaterial color="#1a1e22" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Экран с динамической CanvasTexture */}
      <mesh position={[0, 0, 0.042]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={rendererRef.current?.texture} />
      </mesh>
    </group>
  );
}
