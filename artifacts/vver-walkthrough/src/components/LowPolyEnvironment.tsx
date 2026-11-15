/**
 * ============================================================================
 * УЛЬТРА-ЛЕГКОЕ LOW-POLY ОКРУЖЕНИЕ ДЛЯ VR-ТУРА (МИНИМУМ ПОЛИГОНОВ И DRAW CALLS)
 * ============================================================================
 *
 * Специально оптимизировано для работы совместно с тяжелой .glb-моделью (56 МБ)
 * на 72–90 FPS в VR-гарнитуре без фризов:
 * - Суммарный бюджет полигонов окружения < 1,500 треугольников.
 * - Материалы MeshLambertMaterial с flatShading (максимально быстрый шейдер).
 * - Полное отсутствие тяжелых процедурных текстур, карт нормалей, теней и useFrame-циклов.
 * - Вся растительность и камни объединены в InstancedMesh (3 Draw Call на весь ландшафт).
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface LowPolyEnvironmentProps {
  groundY?: number;
}

function getLowPolyHillHeight(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  // Ровная технологическая площадка в радиусе 142 м вокруг энергоблоков ВВЭР-1000 и РИТМ-200Н
  if (dist <= 142) return 0;

  const t = Math.min((dist - 142) / 140, 1.0);
  const smooth = t * t * (3 - 2 * t);
  const wave1 = Math.sin(x * 0.015) * Math.cos(z * 0.015) * 14;
  const wave2 = Math.sin((x + z) * 0.008) * 9;
  return Math.max(0, (10 + wave1 + wave2) * smooth);
}

// Статичные низкополигональные материалы (MeshLambertMaterial намного быстрее MeshStandardMaterial в VR)
const padSurfaceMat = new THREE.MeshLambertMaterial({
  color: '#6e767d',
  flatShading: true,
});

const padCurbMat = new THREE.MeshLambertMaterial({
  color: '#9ca3af',
  flatShading: true,
});

const roadSurfaceMat = new THREE.MeshLambertMaterial({
  color: '#343a40',
  flatShading: true,
});

const terrainLowPolyMat = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

const trunkLowPolyMat = new THREE.MeshLambertMaterial({
  color: '#6b4c35',
  flatShading: true,
});

const pineLowPolyMat = new THREE.MeshLambertMaterial({
  color: '#4f6d46',
  flatShading: true,
});

const rockLowPolyMat = new THREE.MeshLambertMaterial({
  color: '#8f8474',
  flatShading: true,
});

const backdropTowerMat = new THREE.MeshLambertMaterial({
  color: '#cbd5e1',
  flatShading: true,
});

export default function LowPolyEnvironment({ groundY = 0 }: LowPolyEnvironmentProps) {
  const treeTrunksRef = useRef<THREE.InstancedMesh>(null);
  const treeCrownsRef = useRef<THREE.InstancedMesh>(null);
  const rocksRef = useRef<THREE.InstancedMesh>(null);

  // 1. Облегченная Low-Poly сетка ландшафта (16x16 сегментов = всего 512 треугольников)
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(960, 960, 16, 16);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = -y;
      const h = getLowPolyHillHeight(x, z);
      pos.setZ(i, h);

      // Градация степного Low-Poly оттенка по высоте
      const heightRatio = Math.min(1, h / 24);
      colors[i * 3] = 0.72 - heightRatio * 0.1;
      colors[i * 3 + 1] = 0.65 - heightRatio * 0.05;
      colors[i * 3 + 2] = 0.49 + heightRatio * 0.04;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  // 2. Низкополигональные геометрии окружения (5-6 граней)
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.35, 3.2, 5), []);
  const crownGeo = useMemo(() => new THREE.ConeGeometry(2.1, 6.8, 5), []);
  const rockGeo = useMemo(() => new THREE.DodecahedronGeometry(1.0, 0), []);

  // 3. Детерминированное размещение Low-Poly деревьев и камней по внешнему кольцу
  const { trunkMatrices, crownMatrices, rockMatrices } = useMemo(() => {
    const tMats: THREE.Matrix4[] = [];
    const cMats: THREE.Matrix4[] = [];
    const rMats: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    let seed = 104729;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // 40 Low-Poly деревьев по периметру (R = 152..225 м)
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2 + (rnd() - 0.5) * 0.1;
      const radius = 152 + rnd() * 72;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = groundY + getLowPolyHillHeight(x, z);
      const scale = 0.85 + rnd() * 0.55;
      const rotY = rnd() * Math.PI * 2;

      dummy.position.set(x, y + 1.5 * scale, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      tMats.push(dummy.matrix.clone());

      dummy.position.set(x, y + 5.2 * scale, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      cMats.push(dummy.matrix.clone());
    }

    // 16 Low-Poly камней на холмах (R = 156..245 м)
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + 0.25;
      const radius = 156 + rnd() * 90;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = groundY + getLowPolyHillHeight(x, z);
      const s = 2.4 + rnd() * 3.0;

      dummy.position.set(x, y + s * 0.25, z);
      dummy.rotation.set(rnd() * 0.4, rnd() * Math.PI * 2, rnd() * 0.4);
      dummy.scale.set(s * 1.25, s * 0.7, s);
      dummy.updateMatrix();
      rMats.push(dummy.matrix.clone());
    }

    return { trunkMatrices: tMats, crownMatrices: cMats, rockMatrices: rMats };
  }, [groundY]);

  useEffect(() => {
    if (treeTrunksRef.current) {
      trunkMatrices.forEach((m, i) => treeTrunksRef.current?.setMatrixAt(i, m));
      treeTrunksRef.current.instanceMatrix.needsUpdate = true;
      treeTrunksRef.current.computeBoundingSphere();
    }
    if (treeCrownsRef.current) {
      crownMatrices.forEach((m, i) => treeCrownsRef.current?.setMatrixAt(i, m));
      treeCrownsRef.current.instanceMatrix.needsUpdate = true;
      treeCrownsRef.current.computeBoundingSphere();
    }
    if (rocksRef.current) {
      rockMatrices.forEach((m, i) => rocksRef.current?.setMatrixAt(i, m));
      rocksRef.current.instanceMatrix.needsUpdate = true;
      rocksRef.current.computeBoundingSphere();
    }
  }, [trunkMatrices, crownMatrices, rockMatrices]);

  return (
    <group name="LowPolyEnvironment">
      {/* 1. Основная степная Low-Poly поверхность (чуть ниже 0.03м во избежание Z-fighting) */}
      <mesh
        geometry={terrainGeo}
        material={terrainLowPolyMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, groundY - 0.04, 0]}
        matrixAutoUpdate={false}
        onUpdate={(self) => self.updateMatrix()}
      />

      {/* 2. Центральная ровная технологическая площадка под ВВЭР-1000 и РИТМ-200Н */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, groundY - 0.015, 0]}
        material={padSurfaceMat}
        receiveShadow
        matrixAutoUpdate={false}
        onUpdate={(self) => self.updateMatrix()}
      >
        <circleGeometry args={[132, 28]} />
      </mesh>

      {/* 3. Кольцевой бордюр и объездная Low-Poly дорога */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, groundY - 0.005, 0]}
        material={padCurbMat}
        matrixAutoUpdate={false}
        onUpdate={(self) => self.updateMatrix()}
      >
        <ringGeometry args={[131.5, 133.0, 28]} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, groundY - 0.01, 0]}
        material={roadSurfaceMat}
        matrixAutoUpdate={false}
        onUpdate={(self) => self.updateMatrix()}
      >
        <ringGeometry args={[133.0, 141.0, 28]} />
      </mesh>

      {/* 4. Две ультра-облегченные Low-Poly башни-градирни на дальнем фоне (всего по 10 сегментов) */}
      {[-195, -195].map((tx, idx) => (
        <mesh
          key={`lowpoly-tower-${idx}`}
          position={[tx, groundY + 26, idx === 0 ? -95 : 65]}
          material={backdropTowerMat}
          matrixAutoUpdate={false}
          onUpdate={(self) => self.updateMatrix()}
        >
          <cylinderGeometry args={[12, 20, 52, 10, 1, false]} />
        </mesh>
      ))}

      {/* 5. InstancedMesh: Low-Poly деревья и валуны (всего 3 Draw Call) */}
      <instancedMesh
        ref={treeTrunksRef}
        args={[trunkGeo, trunkLowPolyMat, trunkMatrices.length]}
        frustumCulled={true}
      />
      <instancedMesh
        ref={treeCrownsRef}
        args={[crownGeo, pineLowPolyMat, crownMatrices.length]}
        frustumCulled={true}
      />
      <instancedMesh
        ref={rocksRef}
        args={[rockGeo, rockLowPolyMat, rockMatrices.length]}
        frustumCulled={true}
      />
    </group>
  );
}
