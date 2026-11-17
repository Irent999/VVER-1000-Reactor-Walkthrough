import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SiteBox3Anchors } from '@/components/GlbAssemblyModel';

interface NppProcessVisualizerProps {
  active: boolean;
  anchors?: SiteBox3Anchors | null;
}

interface PolyPath {
  points: THREE.Vector3[];
  cumLengths: number[];
  totalLength: number;
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

function samplePolyPath(path: PolyPath, tRaw: number, outPos: THREE.Vector3, outDir: THREE.Vector3) {
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
  outDir.subVectors(points[seg + 1], points[seg]).normalize();
}

function createSoftPuffTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.38, 'rgba(240, 247, 255, 0.68)');
    grad.addColorStop(0.72, 'rgba(226, 238, 250, 0.22)');
    grad.addColorStop(1.0, 'rgba(220, 234, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const COOLING_TOWER_TOPS: [number, number, number][] = [
  [-83.85, 34.4, 13.41], // NW
  [-26.03, 34.4, 13.41], // NE
  [-83.85, 34.4, 59.65], // SW
  [-26.03, 34.4, 59.65], // SE
];

const _dummy = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

/**
 * Оптимизированная поэтапная 3D-визуализация технологического цикла АЭС (60+ FPS для десктопа и VR):
 * 1. Эффект Вавилова — Черенкова и нейтронный поток (Points) в активных зонах ВВЭР-1000 и РИТМ-200Н.
 * 2. Термодинамические потоки 1-го (оранжево-красный) и 2-го (паровой бело-голубой) контуров (InstancedMesh).
 * 3. Мягкие поднимающиеся клубы белого пара над всеми 4 сухими градирнями (Points + ShaderMaterial).
 * 4. Бегущие золотисто-голубые импульсы выдачи мощности от турбогенераторов на трансформаторы ОРУ и ЛЭП (InstancedMesh).
 */
export default function NppProcessVisualizer({ active, anchors }: NppProcessVisualizerProps) {
  const cherenkovRefs = useRef<(THREE.Mesh | null)[]>([]);
  const coreLightRefs = useRef<(THREE.PointLight | null)[]>([]);
  const neutronPointsRef = useRef<THREE.Points | null>(null);
  const primaryInstRef = useRef<THREE.InstancedMesh | null>(null);
  const secondaryInstRef = useRef<THREE.InstancedMesh | null>(null);
  const powerInstRef = useRef<THREE.InstancedMesh | null>(null);
  const steamPointsRef = useRef<THREE.Points | null>(null);

  const ritmHall = anchors?.ritmHall;
  const ritmFloorY = ritmHall?.minY ?? 0.62;
  const ritmRxX = THREE.MathUtils.clamp(29.5, (ritmHall?.minX ?? 23.05) + 4.8, (ritmHall?.maxX ?? 48.31) - 15.0);
  const ritmRxZ = THREE.MathUtils.clamp(
    ((ritmHall?.minZ ?? -94.33) + (ritmHall?.maxZ ?? -47.48)) / 2,
    -75.0,
    -66.5
  );
  const ritmTgX = THREE.MathUtils.clamp(41.4, (ritmHall?.minX ?? 23.05) + 14.0, (ritmHall?.maxX ?? 48.31) - 4.2);

  // Центры активных зон (ВВЭР-1000 #1, ВВЭР-1000 #2, РИТМ-200Н)
  const coreSpecs = useMemo(
    () => [
      { pos: [-84.1, 13.0, -40.2] as [number, number, number], r: 2.15, h: 4.8 },
      { pos: [-26.0, 12.6, -40.2] as [number, number, number], r: 2.05, h: 4.5 },
      { pos: [ritmRxX, ritmFloorY + 4.2, ritmRxZ] as [number, number, number], r: 1.05, h: 3.1 },
    ],
    [ritmRxX, ritmFloorY, ritmRxZ]
  );

  // Трассы 1-го контура теплоносителя (реактор <-> парогенераторы)
  const primaryPaths = useMemo<PolyPath[]>(() => {
    const paths: PolyPath[] = [];
    // ВВЭР-1000 #1 (4 петли вокруг [-84.1, -40.2])
    const vver1Loops: [number, number][] = [
      [-80.2, -36.5],
      [-80.2, -43.9],
      [-88.0, -36.5],
      [-88.0, -43.9],
    ];
    for (const [lx, lz] of vver1Loops) {
      paths.push(
        buildPolyPath([
          [-84.1, 14.2, -40.2],
          [lx, 14.2, lz],
          [lx, 11.4, lz],
          [-84.1, 11.4, -40.2],
          [-84.1, 14.2, -40.2],
        ])
      );
    }
    // ВВЭР-1000 #2 (4 петли вокруг [-26.0, -40.2])
    const vver2Loops: [number, number][] = [
      [-22.4, -36.8],
      [-22.4, -43.6],
      [-29.6, -36.8],
      [-29.6, -43.6],
    ];
    for (const [lx, lz] of vver2Loops) {
      paths.push(
        buildPolyPath([
          [-26.0, 13.8, -40.2],
          [lx, 13.8, lz],
          [lx, 11.0, lz],
          [-26.0, 11.0, -40.2],
          [-26.0, 13.8, -40.2],
        ])
      );
    }
    // РИТМ-200Н (интегральная циркуляция к 4 встроенным кассетам ПГ)
    const ritmOffsets: [number, number][] = [
      [1.9, 0],
      [-1.9, 0],
      [0, 1.9],
      [0, -1.9],
    ];
    for (const [dx, dz] of ritmOffsets) {
      paths.push(
        buildPolyPath([
          [ritmRxX, ritmFloorY + 5.6, ritmRxZ],
          [ritmRxX + dx, ritmFloorY + 5.7, ritmRxZ + dz],
          [ritmRxX + dx, ritmFloorY + 3.2, ritmRxZ + dz],
          [ritmRxX, ritmFloorY + 3.2, ritmRxZ],
          [ritmRxX, ritmFloorY + 5.6, ritmRxZ],
        ])
      );
    }
    return paths;
  }, [ritmRxX, ritmFloorY, ritmRxZ]);

  // Трассы 2-го контура (пар от ПГ к ЦВД турбин + возврат конденсата)
  const secondaryPaths = useMemo<PolyPath[]>(() => {
    return [
      // ВВЭР-1000 #1: ПГ -> паропроводы -> ЦВД К-1000 West -> ЦНД -> конденсатор -> возврат
      buildPolyPath([
        [-82.0, 15.2, -43.5],
        [-84.5, 13.6, -54.0],
        [-86.8, 5.2, -86.95],
        [-86.8, 5.2, -68.2],
        [-86.8, 2.2, -74.7],
        [-84.0, 6.5, -52.0],
        [-82.0, 15.2, -43.5],
      ]),
      buildPolyPath([
        [-86.2, 15.2, -43.5],
        [-88.0, 13.6, -54.0],
        [-86.8, 7.6, -82.0],
        [-86.8, 5.2, -68.2],
        [-86.8, 2.2, -74.7],
        [-86.2, 15.2, -43.5],
      ]),
      // ВВЭР-1000 #2: ПГ -> паропроводы -> ЦВД К-1000 Mid -> ЦНД -> конденсатор -> возврат
      buildPolyPath([
        [-24.2, 14.8, -43.5],
        [-26.2, 13.0, -54.0],
        [-27.6, 5.2, -86.95],
        [-27.6, 5.2, -68.2],
        [-27.6, 2.2, -74.7],
        [-24.2, 14.8, -43.5],
      ]),
      buildPolyPath([
        [-28.0, 14.8, -43.5],
        [-29.2, 13.0, -54.0],
        [-27.6, 7.6, -82.0],
        [-27.6, 5.2, -68.2],
        [-27.6, 2.2, -74.7],
        [-28.0, 14.8, -43.5],
      ]),
      // РИТМ-200Н: коллекторы ПГ -> паровой мост над проходом -> ЦВД -> ЦНД -> конденсатор -> возврат
      buildPolyPath([
        [ritmRxX + 1.8, ritmFloorY + 5.7, ritmRxZ - 0.85],
        [ritmTgX - 2.0, ritmFloorY + 5.0, ritmRxZ - 0.85],
        [ritmTgX, ritmFloorY + 3.6, ritmRxZ - 8.4],
        [ritmTgX, ritmFloorY + 5.3, ritmRxZ - 5.2],
        [ritmTgX, ritmFloorY + 3.6, ritmRxZ - 2.0],
        [ritmTgX, ritmFloorY + 1.2, ritmRxZ - 2.0],
        [ritmRxX + 1.8, ritmFloorY + 2.6, ritmRxZ - 0.85],
      ]),
      buildPolyPath([
        [ritmRxX + 1.8, ritmFloorY + 5.7, ritmRxZ + 0.85],
        [ritmTgX - 2.0, ritmFloorY + 5.0, ritmRxZ + 0.85],
        [ritmTgX, ritmFloorY + 3.6, ritmRxZ - 8.4],
        [ritmTgX, ritmFloorY + 3.6, ritmRxZ - 2.0],
        [ritmTgX, ritmFloorY + 1.2, ritmRxZ - 2.0],
        [ritmRxX + 1.8, ritmFloorY + 2.6, ritmRxZ + 0.85],
      ]),
    ];
  }, [ritmRxX, ritmTgX, ritmFloorY, ritmRxZ]);

  // Трассы выдачи мощности на ОРУ 500 кВ и ЛЭП
  const powerPaths = useMemo<PolyPath[]>(() => {
    return [
      // От ТВВ-1000 ВВЭР-1000 West -> блочный кабель -> трансформатор ОРУ #1 -> порталы -> ЛЭП
      buildPolyPath([
        [-86.8, 5.1, -61.15],
        [-86.8, 3.2, -26.0],
        [-20.0, 2.6, -24.0],
        [48.0, 4.6, 48.0],
        [48.0, 8.65, 68.0],
        [48.0, 8.65, 84.0],
        [48.0, 9.8, 108.0],
      ]),
      // От ТВВ-1000 ВВЭР-1000 Mid -> трансформатор ОРУ #2 -> порталы -> ЛЭП
      buildPolyPath([
        [-27.6, 5.1, -61.15],
        [-27.6, 3.2, -25.0],
        [30.0, 2.8, -12.0],
        [62.0, 4.6, 48.0],
        [62.0, 8.65, 68.0],
        [62.0, 8.65, 84.0],
        [62.0, 9.8, 108.0],
      ]),
      // От генератора РИТМ-200Н -> трансформатор ОРУ #3 -> порталы -> ЛЭП
      buildPolyPath([
        [ritmTgX, ritmFloorY + 3.5, ritmRxZ + 6.4],
        [ritmTgX + 3.5, 4.2, -46.0],
        [62.0, 3.2, -24.0],
        [76.0, 4.6, 48.0],
        [76.0, 8.65, 68.0],
        [76.0, 8.65, 84.0],
        [76.0, 9.8, 108.0],
      ]),
    ];
  }, [ritmTgX, ritmFloorY, ritmRxZ]);

  // Инициализация частиц нейтронного потока (540 шт. для 3 реакторов)
  const neutronData = useMemo(() => {
    const perCore = 160;
    const total = perCore * 3;
    const positions = new Float32Array(total * 3);
    const velocities = new Float32Array(total * 3);
    const coreIndices = new Uint8Array(total);
    for (let c = 0; c < 3; c++) {
      const spec = coreSpecs[c];
      for (let i = 0; i < perCore; i++) {
        const idx = c * perCore + i;
        coreIndices[idx] = c;
        const ang = (i * 2.39996) % (Math.PI * 2);
        const rad = Math.sqrt(((i * 37) % 100) / 100) * spec.r * 0.82;
        const py = (((i * 53) % 100) / 100 - 0.5) * spec.h * 0.85;
        positions[idx * 3] = spec.pos[0] + Math.cos(ang) * rad;
        positions[idx * 3 + 1] = spec.pos[1] + py;
        positions[idx * 3 + 2] = spec.pos[2] + Math.sin(ang) * rad;

        const vx = Math.sin(i * 1.7 + c) * 3.8;
        const vy = Math.cos(i * 2.3 + c) * 3.2;
        const vz = Math.cos(i * 1.3 - c) * 3.8;
        velocities[idx * 3] = vx;
        velocities[idx * 3 + 1] = vy;
        velocities[idx * 3 + 2] = vz;
      }
    }
    return { total, positions, velocities, coreIndices };
  }, [coreSpecs]);

  // Пар из всех 4 градирен: мягкие полупрозрачные клубы (Points + ShaderMaterial)
  const steamSystem = useMemo(() => {
    const perTower = 90;
    const total = perTower * COOLING_TOWER_TOPS.length;
    const positions = new Float32Array(total * 3);
    const phases = new Float32Array(total);
    const radialOffsets = new Float32Array(total * 2);
    const sizes = new Float32Array(total);
    const alphas = new Float32Array(total);

    for (let t = 0; t < COOLING_TOWER_TOPS.length; t++) {
      const [tx, ty, tz] = COOLING_TOWER_TOPS[t];
      for (let i = 0; i < perTower; i++) {
        const idx = t * perTower + i;
        phases[idx] = i / perTower;
        const ang = (i * 2.39996 + t * 1.1) % (Math.PI * 2);
        const r = Math.sqrt(((i * 41 + t * 19) % 100) / 100) * 5.6;
        radialOffsets[idx * 2] = Math.cos(ang) * r;
        radialOffsets[idx * 2 + 1] = Math.sin(ang) * r;
        positions[idx * 3] = tx + radialOffsets[idx * 2];
        positions[idx * 3 + 1] = ty;
        positions[idx * 3 + 2] = tz + radialOffsets[idx * 2 + 1];
        sizes[idx] = 28;
        alphas[idx] = 0.0;
      }
    }

    const texture = createSoftPuffTexture();
    const shaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        uniform float uPixelRatio;
        void main() {
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (180.0 / max(1.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying float vAlpha;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float alpha = tex.a * vAlpha;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(tex.rgb, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    return { perTower, total, positions, phases, radialOffsets, sizes, alphas, shaderMat, texture };
  }, []);

  useEffect(() => {
    return () => {
      steamSystem.shaderMat.dispose();
      steamSystem.texture.dispose();
    };
  }, [steamSystem]);

  // Геометрии и материалы InstancedMesh
  const packetGeo = useMemo(() => new THREE.CapsuleGeometry(0.24, 0.72, 4, 8), []);
  const primaryMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ff5a1f',
        toneMapped: false,
      }),
    []
  );
  const secondaryMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#bae6fd',
        toneMapped: false,
      }),
    []
  );
  const powerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fde047',
        toneMapped: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      packetGeo.dispose();
      primaryMat.dispose();
      secondaryMat.dispose();
      powerMat.dispose();
    };
  }, [packetGeo, primaryMat, secondaryMat, powerMat]);

  const primaryCount = primaryPaths.length * 10; // 120 импульсов 1-го контура
  const secondaryCount = secondaryPaths.length * 18; // 108 импульсов 2-го контура
  const powerCount = powerPaths.length * 32; // 96 импульсов выдачи мощности

  useFrame((state, delta) => {
    if (!active) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // 1. Черенковское свечение активных зон
    for (let i = 0; i < coreSpecs.length; i++) {
      const pulse = 0.72 + Math.sin(t * 4.2 + i * 1.3) * 0.22;
      const mesh = cherenkovRefs.current[i];
      if (mesh) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.36 + Math.sin(t * 4.2 + i * 1.3) * 0.14;
      }
      const light = coreLightRefs.current[i];
      if (light) {
        light.intensity = 14.0 * pulse;
      }
    }

    // 2. Частицы нейтронного потока внутри активных зон
    if (neutronPointsRef.current) {
      const posAttr = neutronPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const { velocities, coreIndices, total } = neutronData;
      for (let i = 0; i < total; i++) {
        const spec = coreSpecs[coreIndices[i]];
        const ix = i * 3;
        let nx = posArr[ix] + velocities[ix] * dt;
        let ny = posArr[ix + 1] + velocities[ix + 1] * dt;
        let nz = posArr[ix + 2] + velocities[ix + 2] * dt;

        const dx = nx - spec.pos[0];
        const dy = ny - spec.pos[1];
        const dz = nz - spec.pos[2];
        const maxR = spec.r * 0.85;
        const maxH = spec.h * 0.45;

        if (dx * dx + dz * dz > maxR * maxR) {
          velocities[ix] = -velocities[ix];
          velocities[ix + 2] = -velocities[ix + 2];
          nx = spec.pos[0] + dx * 0.86;
          nz = spec.pos[2] + dz * 0.86;
        }
        if (Math.abs(dy) > maxH) {
          velocities[ix + 1] = -velocities[ix + 1];
          ny = spec.pos[1] + Math.sign(dy) * maxH * 0.92;
        }

        posArr[ix] = nx;
        posArr[ix + 1] = ny;
        posArr[ix + 2] = nz;
      }
      posAttr.needsUpdate = true;
    }

    // 3. Импульсы 1-го контура (горячий теплоноситель)
    if (primaryInstRef.current) {
      let instanceIdx = 0;
      const perPath = 10;
      for (let p = 0; p < primaryPaths.length; p++) {
        const path = primaryPaths[p];
        for (let k = 0; k < perPath; k++) {
          const u = t * 0.38 + k / perPath + p * 0.13;
          samplePolyPath(path, u, _pos, _dir);
          _quat.setFromUnitVectors(_up, _dir);
          _dummy.position.copy(_pos);
          _dummy.quaternion.copy(_quat);
          _dummy.scale.set(0.75, 0.95, 0.75);
          _dummy.updateMatrix();
          primaryInstRef.current.setMatrixAt(instanceIdx++, _dummy.matrix);
        }
      }
      primaryInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // 4. Импульсы 2-го контура (пароводяной тракт)
    if (secondaryInstRef.current) {
      let instanceIdx = 0;
      const perPath = 18;
      for (let p = 0; p < secondaryPaths.length; p++) {
        const path = secondaryPaths[p];
        for (let k = 0; k < perPath; k++) {
          const u = t * 0.24 + k / perPath + p * 0.17;
          samplePolyPath(path, u, _pos, _dir);
          _quat.setFromUnitVectors(_up, _dir);
          _dummy.position.copy(_pos);
          _dummy.quaternion.copy(_quat);
          _dummy.scale.set(0.85, 1.35, 0.85);
          _dummy.updateMatrix();
          secondaryInstRef.current.setMatrixAt(instanceIdx++, _dummy.matrix);
        }
      }
      secondaryInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // 5. Выдача электроэнергии на ОРУ 500 кВ и ЛЭП (золотисто-голубые импульсы)
    if (powerInstRef.current) {
      let instanceIdx = 0;
      const perPath = 32;
      for (let p = 0; p < powerPaths.length; p++) {
        const path = powerPaths[p];
        for (let k = 0; k < perPath; k++) {
          const u = t * 0.34 + k / perPath + p * 0.21;
          samplePolyPath(path, u, _pos, _dir);
          _quat.setFromUnitVectors(_up, _dir);
          _dummy.position.copy(_pos);
          _dummy.quaternion.copy(_quat);
          _dummy.scale.set(0.9, 2.2, 0.9);
          _dummy.updateMatrix();
          powerInstRef.current.setMatrixAt(instanceIdx++, _dummy.matrix);
        }
      }
      powerInstRef.current.instanceMatrix.needsUpdate = true;
    }

    // 6. Облака пара над всеми 4 сухими градирнями
    if (steamPointsRef.current) {
      const geo = steamPointsRef.current.geometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const sizeAttr = geo.attributes.aSize as THREE.BufferAttribute;
      const alphaAttr = geo.attributes.aAlpha as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const sizeArr = sizeAttr.array as Float32Array;
      const alphaArr = alphaAttr.array as Float32Array;
      const { perTower, phases, radialOffsets } = steamSystem;

      for (let towerIdx = 0; towerIdx < COOLING_TOWER_TOPS.length; towerIdx++) {
        const [tx, ty, tz] = COOLING_TOWER_TOPS[towerIdx];
        for (let i = 0; i < perTower; i++) {
          const idx = towerIdx * perTower + i;
          const life = (phases[idx] + t * 0.14) % 1.0;
          const rise = life * 32.0;
          const spread = 1.0 + life * 1.95;
          const windX = life * 9.5 + Math.sin(t * 0.9 + idx) * 0.8 * life;
          const windZ = life * 3.8 + Math.cos(t * 0.7 + idx) * 0.6 * life;

          posArr[idx * 3] = tx + radialOffsets[idx * 2] * spread + windX;
          posArr[idx * 3 + 1] = ty + rise;
          posArr[idx * 3 + 2] = tz + radialOffsets[idx * 2 + 1] * spread + windZ;

          sizeArr[idx] = 22.0 + life * 48.0;
          // Плавное появление над раструбом -> растворение в небе
          const fadeIn = Math.min(1.0, life / 0.14);
          const fadeOut = Math.pow(1.0 - life, 1.35);
          alphaArr[idx] = 0.44 * fadeIn * fadeOut;
        }
      }

      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    }
  });

  if (!active) return null;

  return (
    <group name="NppProcessVisualizer">
      {/* 1. Эффект Вавилова — Черенкова внутри активных зон реакторов */}
      {coreSpecs.map((spec, idx) => (
        <group key={`cherenkov-core-${idx}`} position={spec.pos}>
          <mesh
            ref={(el) => {
              cherenkovRefs.current[idx] = el;
            }}
          >
            <cylinderGeometry args={[spec.r, spec.r, spec.h, 24]} />
            <meshBasicMaterial
              color="#22b8ff"
              transparent
              opacity={0.44}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh>
            <cylinderGeometry args={[spec.r * 0.62, spec.r * 0.62, spec.h * 0.85, 20]} />
            <meshBasicMaterial
              color="#7dd3fc"
              transparent
              opacity={0.62}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <pointLight
            ref={(el) => {
              coreLightRefs.current[idx] = el;
            }}
            color="#38bdf8"
            intensity={14}
            distance={22}
            decay={2}
          />
        </group>
      ))}

      {/* 2. Нейтронный поток в активных зонах (1 draw call Points) */}
      <points ref={neutronPointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[neutronData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#a5f3fc"
          size={0.34}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 3. Импульсы 1-го контура (горячий теплоноситель) */}
      <instancedMesh
        ref={primaryInstRef}
        args={[packetGeo, primaryMat, primaryCount]}
        frustumCulled={false}
      />

      {/* 4. Импульсы 2-го контура (пар к турбинам и конденсат) */}
      <instancedMesh
        ref={secondaryInstRef}
        args={[packetGeo, secondaryMat, secondaryCount]}
        frustumCulled={false}
      />

      {/* 5. Импульсы выдачи мощности на ОРУ и ЛЭП */}
      <instancedMesh
        ref={powerInstRef}
        args={[packetGeo, powerMat, powerCount]}
        frustumCulled={false}
      />

      {/* 6. Мягкий пар из всех 4 градирен */}
      <points ref={steamPointsRef} material={steamSystem.shaderMat} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[steamSystem.positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[steamSystem.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[steamSystem.alphas, 1]} />
        </bufferGeometry>
      </points>
    </group>
  );
}
