import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SiteBox3Anchors } from '@/components/GlbAssemblyModel';

interface EvacuationRoutesVisualizerProps {
  active: boolean;
  anchors?: SiteBox3Anchors | null;
}

interface PolyPath {
  points: THREE.Vector3[];
  cumLengths: number[];
  totalLength: number;
}

interface SegmentInfo {
  mid: THREE.Vector3;
  quat: THREE.Quaternion;
  length: number;
}

const _worldUp = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3();
const _localUp = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _rotMat = new THREE.Matrix4();
const _dummy = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function computeOrientedQuat(dir: THREE.Vector3, outQuat: THREE.Quaternion) {
  if (Math.abs(dir.y) > 0.995) {
    _right.set(1, 0, 0);
  } else {
    _right.crossVectors(_worldUp, dir).normalize();
  }
  _localUp.crossVectors(dir, _right).normalize();
  _rotMat.makeBasis(_right, _localUp, dir);
  outQuat.setFromRotationMatrix(_rotMat);
}

function buildPolyPath(coords: [number, number, number][]): PolyPath {
  const points = coords.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const cumLengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += points[i].distanceTo(points[i - 1]);
    cumLengths.push(total);
  }
  return { points, cumLengths, totalLength: Math.max(total, 0.001) };
}

function samplePolyPath(
  path: PolyPath,
  tRaw: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion
) {
  const t = ((tRaw % 1) + 1) % 1;
  const dist = t * path.totalLength;
  const { points, cumLengths } = path;
  let seg = 0;
  for (let i = 1; i < cumLengths.length; i++) {
    if (dist <= cumLengths[i] || i === cumLengths.length - 1) {
      seg = i - 1;
      break;
    }
  }
  const segStart = cumLengths[seg];
  const segLen = Math.max(cumLengths[seg + 1] - segStart, 0.0001);
  const alpha = (dist - segStart) / segLen;
  outPos.lerpVectors(points[seg], points[seg + 1], alpha);
  _dir.subVectors(points[seg + 1], points[seg]).normalize();
  computeOrientedQuat(_dir, outQuat);
}

function createChevronGeometry(): THREE.ExtrudeGeometry {
  // Шеврон в плоскости XY с вершиной вверх (+Y), далее поворачивается в горизонтальную плоскость XZ (вершина к +Z)
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55);
  shape.lineTo(0.62, -0.25);
  shape.lineTo(0.36, -0.45);
  shape.lineTo(0, 0.02);
  shape.lineTo(-0.36, -0.45);
  shape.lineTo(-0.62, -0.25);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.035,
    bevelEnabled: false,
    curveSegments: 1,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.025, 0);
  return geo;
}

/**
 * 3D-визуализация путей эвакуации АЭС (оптимизировано для VR и десктопа, 60+ FPS):
 * 1. Маршрут из центрального зала ВВЭР-1000 и ярусов (+19.71 м / +14.41 м) через спуск наружу к западной точке сбора.
 * 2. Маршруты вдоль боковых проходов машинных залов ВВЭР-1000 (West и Mid) к боковым выходам и далее к точкам сбора.
 * 3. Маршрут из центрального коридора комплекса РИТМ-200Н через южный выход по магистральному проезду к главной точке сбора.
 * 4. Светящиеся изумрудно-зелёные направляющие полосы, бегущие шевроны движения и маркеры выходов / зон сбора.
 */
export default function EvacuationRoutesVisualizer({
  active,
  anchors,
}: EvacuationRoutesVisualizerProps) {
  const stripInstRef = useRef<THREE.InstancedMesh | null>(null);
  const chevronInstRef = useRef<THREE.InstancedMesh | null>(null);
  const exitBeaconRefs = useRef<(THREE.Mesh | null)[]>([]);
  const assemblyRingRefs = useRef<(THREE.Mesh | null)[]>([]);

  const ritmHall = anchors?.ritmHall;
  const ritmFloorY = ritmHall?.minY ?? 0.62;
  const ritmHallCenterZ = ((ritmHall?.minZ ?? -94.33) + (ritmHall?.maxZ ?? -47.48)) / 2;
  const ritmRxX = THREE.MathUtils.clamp(
    29.5,
    (ritmHall?.minX ?? 23.05) + 4.8,
    (ritmHall?.maxX ?? 48.31) - 15.0
  );
  const ritmTgX = THREE.MathUtils.clamp(
    41.4,
    (ritmHall?.minX ?? 23.05) + 14.0,
    (ritmHall?.maxX ?? 48.31) - 4.2
  );
  const ritmWalkwayCenterX = (ritmRxX + ritmTgX) / 2;
  const ritmZStart = Math.max((ritmHall?.minZ ?? -94.33) + 6.0, -88.0);
  const ritmZExitDoor = (ritmHall?.maxZ ?? -47.48) + 1.0;

  const routes = useMemo<PolyPath[]>(() => {
    return [
      // 1А. Эстакада полярного крана (+19.71 м) -> спуск на верхний ярус центрального зала (+14.41 м)
      buildPolyPath([
        [-80.8, 19.77, -44.2],
        [-77.2, 19.77, -44.2],
        [-77.2, 14.47, -40.5],
      ]),
      // 1Б. Центральный зал ВВЭР-1000 (+14.41 м) -> выход из контайнмента -> лестница на 0.62 м -> выход наружу -> Западная точка сбора
      buildPolyPath([
        [-77.2, 14.47, -40.5],
        [-77.2, 14.47, -34.6],
        [-74.6, 14.47, -34.6],
        [-74.6, 14.47, -30.5],
        [-74.6, 0.68, -26.5],
        [-74.6, 0.465, -20.5],
        [-104.0, 0.465, -20.5],
      ]),
      // 2. Машинный зал West (боковой проход вдоль К-1000) -> боковой выход -> дорога к Западной точке сбора
      buildPolyPath([
        [-77.8, 0.68, -86.0],
        [-77.8, 0.68, -54.5],
        [-72.0, 0.465, -54.5],
        [-72.0, 0.465, -20.5],
        [-104.0, 0.465, -20.5],
      ]),
      // 3. Машинный зал Mid (восточный проход вдоль К-1000) -> боковой выход -> магистральный проезд -> Главная восточная точка сбора
      buildPolyPath([
        [-19.2, 0.68, -86.0],
        [-19.2, 0.68, -52.5],
        [-14.0, 0.465, -52.5],
        [-14.0, 0.465, -20.5],
        [86.0, 0.465, -20.5],
      ]),
      // 4. Комплекс РИТМ-200Н (центральный коридор между реактором и турбиной) -> южный выход -> проезд -> Главная восточная точка сбора
      buildPolyPath([
        [ritmWalkwayCenterX, ritmFloorY + 0.06, Math.min(ritmZStart, ritmHallCenterZ - 14)],
        [ritmWalkwayCenterX, ritmFloorY + 0.06, ritmHallCenterZ],
        [ritmWalkwayCenterX, ritmFloorY + 0.06, ritmZExitDoor - 1.5],
        [ritmWalkwayCenterX, 0.465, ritmZExitDoor],
        [ritmWalkwayCenterX, 0.465, -20.5],
        [86.0, 0.465, -20.5],
      ]),
    ];
  }, [ritmWalkwayCenterX, ritmFloorY, ritmZStart, ritmHallCenterZ, ritmZExitDoor]);

  // Предвычисленные сегменты направляющей полосы для каждого прямого участка
  const segments = useMemo<SegmentInfo[]>(() => {
    const out: SegmentInfo[] = [];
    for (const route of routes) {
      for (let i = 0; i < route.points.length - 1; i++) {
        const a = route.points[i];
        const b = route.points[i + 1];
        const len = a.distanceTo(b);
        if (len < 0.05) continue;
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        const dir = new THREE.Vector3().subVectors(b, a).normalize();
        const quat = new THREE.Quaternion();
        computeOrientedQuat(dir, quat);
        out.push({ mid, quat, length: len });
      }
    }
    return out;
  }, [routes]);

  // Вычисление числа шевронов пропорционально длине каждого маршрута (шаг ~2.8 м)
  const chevronDistribution = useMemo(() => {
    const items: { routeIdx: number; offset: number; speed: number }[] = [];
    routes.forEach((route, routeIdx) => {
      const count = Math.max(4, Math.round(route.totalLength / 3.0));
      // Постоянная линейная скорость ~5.2 м/с независимо от длины маршрута
      const speed = 5.2 / route.totalLength;
      for (let k = 0; k < count; k++) {
        items.push({ routeIdx, offset: k / count, speed });
      }
    });
    return items;
  }, [routes]);

  const exitPoints = useMemo<[number, number, number][]>(
    () => [
      [-74.6, 0.465, -26.5],
      [-72.0, 0.465, -54.5],
      [-14.0, 0.465, -52.5],
      [ritmWalkwayCenterX, 0.465, ritmZExitDoor],
    ],
    [ritmWalkwayCenterX, ritmZExitDoor]
  );

  const assemblyPoints = useMemo<
    { pos: [number, number, number]; name: string }[]
  >(
    () => [
      { pos: [86.0, 0.465, -20.5], name: 'AssemblyPointEast' },
      { pos: [-104.0, 0.465, -20.5], name: 'AssemblyPointWest' },
    ],
    []
  );

  const stripGeo = useMemo(() => new THREE.BoxGeometry(0.42, 0.018, 1.0), []);
  const stripMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#10b981',
        transparent: true,
        opacity: 0.72,
        toneMapped: false,
        depthWrite: false,
      }),
    []
  );

  const chevronGeo = useMemo(() => createChevronGeometry(), []);
  const chevronMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#6ee7b7',
        toneMapped: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      stripGeo.dispose();
      stripMat.dispose();
      chevronGeo.dispose();
      chevronMat.dispose();
    };
  }, [stripGeo, stripMat, chevronGeo, chevronMat]);

  // Однократная расстановка статичных направляющих полос при включении/обновлении маршрутов
  useEffect(() => {
    if (!active || !stripInstRef.current) return;
    const inst = stripInstRef.current;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      _dummy.position.copy(seg.mid);
      _dummy.quaternion.copy(seg.quat);
      _dummy.scale.set(1, 1, seg.length);
      _dummy.updateMatrix();
      inst.setMatrixAt(i, _dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  }, [active, segments]);

  useFrame((state) => {
    if (!active) return;
    const t = state.clock.elapsedTime;

    // 1. Бегущие шевроны направления движения к выходам и зонам сбора
    if (chevronInstRef.current) {
      const inst = chevronInstRef.current;
      for (let i = 0; i < chevronDistribution.length; i++) {
        const item = chevronDistribution[i];
        const route = routes[item.routeIdx];
        const u = item.offset + t * item.speed;
        samplePolyPath(route, u, _pos, _quat);
        _dummy.position.copy(_pos);
        _dummy.quaternion.copy(_quat);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        inst.setMatrixAt(i, _dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    }

    // 2. Мягкое пульсирующее свечение маркеров дверных выходов
    for (let i = 0; i < exitBeaconRefs.current.length; i++) {
      const mesh = exitBeaconRefs.current[i];
      if (!mesh) continue;
      const pulse = 0.72 + Math.sin(t * 3.4 + i * 0.9) * 0.28;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.26 * pulse;
    }

    // 3. Пульсация внешних колец точек безопасного сбора
    for (let i = 0; i < assemblyRingRefs.current.length; i++) {
      const ring = assemblyRingRefs.current[i];
      if (!ring) continue;
      const phase = (t * 0.65 + i * 0.5) % 1.0;
      const sc = 1.0 + phase * 0.65;
      ring.scale.set(sc, sc, 1);
      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = (1.0 - phase) * 0.68;
    }
  });

  if (!active) return null;

  return (
    <group name="EvacuationRoutesVisualizer">
      {/* 1. Направляющие полосы маршрутов вдоль полов, проходов и дорог */}
      <instancedMesh
        key={`evac-strips-${segments.length}`}
        ref={stripInstRef}
        args={[stripGeo, stripMat, segments.length]}
        frustumCulled={false}
        renderOrder={2}
      />

      {/* 2. Анимированные шевроны направления эвакуации */}
      <instancedMesh
        key={`evac-chevrons-${chevronDistribution.length}`}
        ref={chevronInstRef}
        args={[chevronGeo, chevronMat, chevronDistribution.length]}
        frustumCulled={false}
        renderOrder={3}
      />

      {/* 3. Световые маркеры эвакуационных выходов из зданий (низкопрофильные, без перекрытия прохода) */}
      {exitPoints.map((pos, idx) => (
        <group key={`evac-exit-${idx}`} position={pos}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <ringGeometry args={[0.68, 1.02, 28]} />
            <meshBasicMaterial
              color="#34d399"
              transparent
              opacity={0.88}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh
            ref={(el) => {
              exitBeaconRefs.current[idx] = el;
            }}
            position={[0, 1.45, 0]}
            renderOrder={4}
          >
            <cylinderGeometry args={[0.68, 0.85, 2.9, 24, 1, true]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.24}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}

      {/* 4. Безопасные точки сбора на открытой площадке за пределами плотной застройки */}
      {assemblyPoints.map((ap, idx) => (
        <group key={ap.name} name={ap.name} position={ap.pos}>
          {/* Внутренний светящийся контур зоны сбора */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
            <circleGeometry args={[2.6, 36]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.22}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={3}>
            <ringGeometry args={[2.55, 3.05, 40]} />
            <meshBasicMaterial
              color="#6ee7b7"
              transparent
              opacity={0.95}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Расширяющееся импульсное кольцо маяка */}
          <mesh
            ref={(el) => {
              assemblyRingRefs.current[idx] = el;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.008, 0]}
            renderOrder={3}
          >
            <ringGeometry args={[2.9, 3.35, 40]} />
            <meshBasicMaterial
              color="#34d399"
              transparent
              opacity={0.65}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Мягкий световой столб-ориентир, не мешающий ходьбе на уровне 1.65 м */}
          <mesh position={[0, 3.2, 0]} renderOrder={4}>
            <cylinderGeometry args={[2.2, 2.75, 6.4, 32, 1, true]} />
            <meshBasicMaterial
              color="#10b981"
              transparent
              opacity={0.14}
              toneMapped={false}
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Верхний световой маркер точки сбора над головой (Y = 5.4 м) */}
          <mesh position={[0, 5.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.65, 0.09, 10, 36]} />
            <meshBasicMaterial color="#6ee7b7" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
