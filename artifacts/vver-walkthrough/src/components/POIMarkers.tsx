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
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 2.5) * 0.2 + (hovered ? 0.5 : 0);
      ringRef.current.scale.set(s, s, 1);
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(hovered ? 1.5 : 1);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(poi);
  };

  return (
    <group position={poi.position}>
      <mesh
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          color={poi.color}
          emissive={poi.color}
          emissiveIntensity={hovered ? 1.5 : 0.8}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial color={poi.color} />
      </mesh>
      {/* Pulsing ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.9, 32]} />
        <meshBasicMaterial color={poi.color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Vertical beam to indicate position */}
      <mesh position={[0, -2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 4, 6]} />
        <meshBasicMaterial color={poi.color} transparent opacity={0.3} />
      </mesh>
      {hovered && (
        <Html distanceFactor={12} position={[0, 1.2, 0]} center>
          <div style={{
            background: 'rgba(10, 20, 35, 0.92)',
            border: `1px solid ${poi.color}`,
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#fff',
            fontSize: '13px',
            fontFamily: 'system-ui, sans-serif',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: `0 0 12px ${poi.color}55`,
          }}>
            <strong style={{ color: poi.color }}>{poi.titleEn}</strong>
          </div>
        </Html>
      )}
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
