import * as THREE from 'three';

interface LowPolyEnvironmentProps {
  groundY?: number;
}

const plinthUpperMat = new THREE.MeshStandardMaterial({
  color: '#b4bec8',
  roughness: 0.88,
  metalness: 0.04,
});

const plinthLowerMat = new THREE.MeshStandardMaterial({
  color: '#7f8994',
  roughness: 0.9,
  metalness: 0.06,
});

const plinthTrimMat = new THREE.MeshStandardMaterial({
  color: '#d2dae2',
  roughness: 0.72,
  metalness: 0.1,
});

/**
 * Аккуратное компактное архитектурное основание строго под габариты CAD-сборки assembly.glb (75 × 75 м).
 * Без сторонних процедурных зданий, гор, деревьев, дорог и лишних элементов генплана.
 */
export default function LowPolyEnvironment({ groundY = 0 }: LowPolyEnvironmentProps) {
  return (
    <group name="CompactAssemblyPedestal">
      {/* Верхний цоколь основания (80 × 80 м, строго под плитой assembly.glb без Z-fighting) */}
      <mesh
        name="Pedestal_UpperSlab"
        position={[0, groundY - 0.24, 0]}
        material={plinthUpperMat}
        receiveShadow
        matrixAutoUpdate={false}
        onUpdate={(self) => self.updateMatrix()}
      >
        <boxGeometry args={[80, 0.4, 80]} />
      </mesh>

      {/* Декоративная светлая окантовка по периметру площадки */}
      <mesh
        name="Pedestal_TrimBorder"
        position={[0, groundY - 0.36, 0]}
        material={plinthTrimMat}
        receiveShadow
        matrixAutoUpdate={false}
        onUpdate={(self) => self.updateMatrix()}
      >
        <boxGeometry args={[81.2, 0.18, 81.2]} />
      </mesh>

      {/* Нижний несущий фундаментный пьедестал */}
      <mesh
        name="Pedestal_BaseBlock"
        position={[0, groundY - 0.85, 0]}
        material={plinthLowerMat}
        matrixAutoUpdate={false}
        onUpdate={(self) => self.updateMatrix()}
      >
        <boxGeometry args={[83, 0.85, 83]} />
      </mesh>
    </group>
  );
}
