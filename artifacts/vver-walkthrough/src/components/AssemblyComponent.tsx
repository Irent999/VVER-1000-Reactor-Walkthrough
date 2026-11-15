import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface AssemblyComponentProps {
  position?: [number, number, number];
  scale?: [number, number, number];
}

export default function AssemblyComponent({ position = [0, 0, 0], scale = [1, 1, 1] }: AssemblyComponentProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Загружаем GLB модель из папки public приложения
  const { scene } = useGLTF('/assets/aistudio/Сборка.glb');

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive 
        object={scene} 
        onUpdate={(self: THREE.Object3D) => {
          self.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
        }}
      />
    </group>
  );
}

useGLTF.preload('/assets/aistudio/Сборка.glb');