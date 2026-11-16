import { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { POIInfo } from '@/data/poiData';

interface POIMarkerProps {
  poi: POIInfo;
  onSelect: (poi: POIInfo) => void;
}

function POIMarker({ poi, onSelect }: POIMarkerProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!hovered) return;
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      const s = 1.3 + Math.sin(t * 3.5) * 0.2;
      ringRef.current.scale.set(s, s, 1);
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(1.4);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(poi);
  };

  const handleHtmlClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(poi);
  };

  const isSpecialMCR = poi.id === 'rpv';

  return (
    <group position={poi.position}>
      {/* 3D Сфера / Иконка маркера */}
      <mesh
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[isSpecialMCR ? 0.75 : 0.5, 20, 20]} />
        <meshStandardMaterial
          color={poi.color}
          emissive={poi.color}
          emissiveIntensity={hovered ? 2.5 : isSpecialMCR ? 1.8 : 1.0}
          roughness={0.2}
          metalness={0.3}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[isSpecialMCR ? 0.45 : 0.3, 14, 14]} />
        <meshBasicMaterial color={poi.color} />
      </mesh>

      {/* Пульсирующее гало-кольцо */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[isSpecialMCR ? 1.0 : 0.7, isSpecialMCR ? 1.3 : 0.9, 32]} />
        <meshBasicMaterial color={poi.color} transparent opacity={0.65} side={THREE.DoubleSide} />
      </mesh>

      {/* Вертикальный световой маяк отметки */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 4, 8]} />
        <meshBasicMaterial color={poi.color} transparent opacity={0.45} />
      </mesh>

      {/* Интерактивная плашка с подписью, видимая с высоты облёта */}
      <Html
        distanceFactor={isSpecialMCR ? 34 : 26}
        position={[0, isSpecialMCR ? 1.5 : 1.2, 0]}
        center
      >
        <div
          onClick={handleHtmlClick}
          style={{
            background: 'rgba(10, 20, 35, 0.92)',
            border: `1.5px solid ${poi.color}`,
            borderRadius: '8px',
            padding: isSpecialMCR ? '5px 12px' : '4px 9px',
            color: '#fff',
            fontSize: isSpecialMCR ? '13px' : '11px',
            fontWeight: 700,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            boxShadow: `0 0 16px ${poi.color}77`,
            transform: hovered ? 'scale(1.15)' : 'scale(1.0)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
          }}
        >
          <span style={{ color: poi.color, fontSize: '12px' }}>●</span>
          <span>{poi.titleRu}</span>
        </div>
      </Html>
    </group>
  );
}

interface POIMarkersProps {
  pois: POIInfo[];
  onSelect: (poi: POIInfo) => void;
}

export default function POIMarkers({ pois, onSelect }: POIMarkersProps) {
  return (
    <group>
      {pois.map((poi) => (
        <POIMarker key={poi.id} poi={poi} onSelect={onSelect} />
      ))}
    </group>
  );
}
