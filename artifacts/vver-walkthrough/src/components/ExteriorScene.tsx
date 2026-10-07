import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOOR_LEVELS } from '@/scene/constants';
import {
  concreteMap, concreteNormalMap, concreteRoughnessMap,
  brushedSteelMap, brushedSteelNormalMap, brushedSteelRoughnessMap,
} from '@/scene/pbrTextures';

// ============================================================================
// PBR MATERIALS - NOVOVORONEZH NPP UNIT 6 INDUSTRIAL PALETTE
// ============================================================================

const concretePBRMat = new THREE.MeshStandardMaterial({
  color: '#dedbd2',
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.28, 0.28),
  roughness: 0.86,
  metalness: 0.04,
});

const concreteDarkPBRMat = new THREE.MeshStandardMaterial({
  color: '#8f9294',
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.25, 0.25),
  roughness: 0.88,
  metalness: 0.05,
});

// NVNPP Unit 6 Color Scheme: Warm beige/cream industrial wall panels
const wallBeigePanelMat = new THREE.MeshStandardMaterial({
  color: '#E8DCC4', // Warm beige industrial panels
  roughness: 0.76,
  metalness: 0.12,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.06, 0.06),
});

const wallCreamPanelMat = new THREE.MeshStandardMaterial({
  color: '#D3C3AD', // Cream accent panels
  roughness: 0.8,
  metalness: 0.1,
});

// NVNPP Unit 6 Base Trim: Red-brown protective skirt
const baseRedBrownSkirtMat = new THREE.MeshStandardMaterial({
  color: '#8B4513', // Red-brown protective foundation skirt
  roughness: 0.72,
  metalness: 0.14,
});

const industrialMetalDarkMat = new THREE.MeshStandardMaterial({
  color: '#34495e',
  roughness: 0.45,
  metalness: 0.65,
});

const steelTrussMat = new THREE.MeshStandardMaterial({
  color: '#e4e7eb',
  map: brushedSteelMap,
  roughnessMap: brushedSteelRoughnessMap,
  normalMap: brushedSteelNormalMap,
  normalScale: new THREE.Vector2(0.12, 0.12),
  roughness: 0.32,
  metalness: 0.88,
});

const glassWindowMat = new THREE.MeshStandardMaterial({
  color: '#1a3344',
  roughness: 0.1,
  metalness: 0.85,
});

// Asphalt Roadway (strictly position.y = gY + 0.05 to avoid Y-fighting)
const asphaltRoadMat = new THREE.MeshStandardMaterial({
  color: '#282a2d',
  roughness: 0.92,
  metalness: 0.04,
});

const roadMarkingMat = new THREE.MeshStandardMaterial({
  color: '#f6f6f0',
  roughness: 0.6,
  metalness: 0.0,
});

const concreteCurbMat = new THREE.MeshStandardMaterial({
  color: '#cfd1ca',
  roughness: 0.85,
  metalness: 0.05,
});

// Light grey paved concrete walkways
const concreteWalkwayMat = new THREE.MeshStandardMaterial({
  color: '#cfd2cd',
  roughness: 0.86,
  metalness: 0.04,
});

// Deep green manicured lawns
const deepGreenLawnMat = new THREE.MeshStandardMaterial({
  color: '#345e2c', // Deep green lawns
  roughness: 0.95,
  metalness: 0.0,
});

// Arid semi-desert soil & steppe vegetation
const aridTerrainMat = new THREE.MeshStandardMaterial({
  color: '#ba9f77',
  roughness: 0.96,
  metalness: 0.02,
  flatShading: true,
});

const dryGrassMat = new THREE.MeshStandardMaterial({
  color: '#BDB76B', // Steppe dry grass
  roughness: 0.95,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

const greenShrubMat = new THREE.MeshStandardMaterial({
  color: '#556B2F', // Green shrubs
  roughness: 0.92,
  metalness: 0.0,
  flatShading: true,
});

// Lake Tuzkan water & sand materials
const lakeWaterMat = new THREE.MeshStandardMaterial({
  color: '#1c5f78',
  roughness: 0.05,
  metalness: 0.42,
  transparent: true,
  opacity: 0.93,
});

const lakeSandMat = new THREE.MeshStandardMaterial({
  color: '#ceb991',
  roughness: 0.98,
  metalness: 0.01,
});

const reedGrassMat = new THREE.MeshStandardMaterial({
  color: '#829158',
  roughness: 0.9,
  metalness: 0.0,
  side: THREE.DoubleSide,
});

// Cooling Tower double-sided concrete shell & internal basin materials
const coolingTowerShellMat = new THREE.MeshStandardMaterial({
  color: '#d6d3c9',
  map: concreteMap,
  roughnessMap: concreteRoughnessMap,
  normalMap: concreteNormalMap,
  normalScale: new THREE.Vector2(0.24, 0.24),
  roughness: 0.85,
  metalness: 0.05,
  side: THREE.DoubleSide, // Double-sided so inner walls are opaque solid concrete
});

const coolingTowerBasinMat = new THREE.MeshStandardMaterial({
  color: '#2F3538', // Dark concrete floor basin
  roughness: 0.92,
  metalness: 0.05,
});

const coolingFillGrateMat = new THREE.MeshStandardMaterial({
  color: '#23282b', // Dark metallic cooling fill pack & nozzles
  roughness: 0.8,
  metalness: 0.38,
});

// Industrial Piping & Ventilation Stacks Materials
const insulationPipeMat = new THREE.MeshStandardMaterial({
  color: '#e2e6eb',
  roughness: 0.35,
  metalness: 0.78,
});

const pipeFeedwaterMat = new THREE.MeshStandardMaterial({
  color: '#2e6b9e',
  roughness: 0.45,
  metalness: 0.55,
});

const pipeGasMat = new THREE.MeshStandardMaterial({
  color: '#c99a2e',
  roughness: 0.45,
  metalness: 0.55,
});

const ventRedBandMat = new THREE.MeshStandardMaterial({
  color: '#b82a24', // Aviation red band
  roughness: 0.65,
  metalness: 0.15,
});

const ventWhiteBandMat = new THREE.MeshStandardMaterial({
  color: '#f2f2ec', // Aviation white band
  roughness: 0.65,
  metalness: 0.15,
});

// Transmission Line Pylon Materials
const transmissionCableMat = new THREE.MeshStandardMaterial({
  color: '#25282b',
  roughness: 0.35,
  metalness: 0.85,
});

const ceramicInsulatorMat = new THREE.MeshStandardMaterial({
  color: '#4d6575',
  roughness: 0.25,
  metalness: 0.6,
});

const fenceMeshMat = new THREE.MeshStandardMaterial({
  color: '#656860',
  roughness: 0.5,
  metalness: 0.45,
});

const floodlightMat = new THREE.MeshStandardMaterial({
  color: '#fffae8',
  emissive: '#ffeeaa',
  emissiveIntensity: 0.8,
});

// ============================================================================
// 1. UNDULATING STEPPE TERRAIN WITH FLAT INDUSTRIAL PLATFORM & EAST LAKE BASIN
// ============================================================================

function UndulatingSteppeTerrain() {
  const gY = FLOOR_LEVELS.ground;

  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(900, 900, 80, 80);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // In unrotated plane, Y maps to -Z in world
      const z = -y;
      const dist = Math.hypot(x, z);

      // Industrial site apron zone: Keep strictly flat between X [-160, 220], Z [-150, 160]
      if (x >= -160 && x <= 220 && z >= -150 && z <= 160) {
        pos.setZ(i, 0);
      } else if (x > 220) {
        // Lake Tuzkan Basin depression shifted EAST (+X direction, at least +150m from center)
        const eastDist = x - 220;
        const dip = Math.min(eastDist / 30, 1.0);
        pos.setZ(i, -1.8 * dip);
      } else {
        // Rolling steppe terrain around west, north and south perimeter
        const blend = Math.min((dist - 140) / 40, 1.0);
        let h =
          (Math.sin(x * 0.02) * Math.cos(z * 0.018) * 2.2 +
            Math.sin(x * 0.045 + z * 0.035) * 1.0) *
          blend;

        // Distant horizon mountain ridges rise
        if (dist > 250) {
          const horiz = (dist - 250) / 130;
          h += (Math.sin(x * 0.014) * 9 + Math.cos(z * 0.012) * 10 + 9) * horiz;
        }

        pos.setZ(i, h);
      }
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh
      geometry={terrainGeo}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, gY, 0]}
      receiveShadow
    >
      <primitive object={aridTerrainMat} attach="material" />
    </mesh>
  );
}

// ============================================================================
// 2. PROCEDURAL STEPPE VEGETATION DENSITY (InstancedMesh)
// ============================================================================

function SteppeVegetationDensity() {
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const shrubRef = useRef<THREE.InstancedMesh>(null);

  const { grassMatrices, shrubMatrices } = useMemo(() => {
    const gMats: THREE.Matrix4[] = [];
    const sMats: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();

    let seed = 98765;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const getGroundY = (x: number, z: number) => {
      if (x >= -160 && x <= 185 && z >= -150 && z <= 160) return FLOOR_LEVELS.ground;
      if (x > 185) return FLOOR_LEVELS.ground - 1.8;
      const dist = Math.hypot(x, z);
      const blend = Math.min((dist - 140) / 40, 1.0);
      return (
        FLOOR_LEVELS.ground +
        (Math.sin(x * 0.02) * Math.cos(z * 0.018) * 2.2 +
          Math.sin(x * 0.045 + z * 0.035) * 1.0) *
          blend
      );
    };

    // 1. Dry steppe grass tufts (#BDB76B)
    for (let i = 0; i < 260; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 70 + rnd() * 180;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Exclude East lake basin (x > 185) and paved industrial apron / roads
      if (x > 185) continue;
      if (Math.abs(x) < 55 && Math.abs(z) < 55) continue;
      if (x >= -60 && x <= 140 && z >= -55 && z <= 50) continue;
      if (Math.hypot(x - (-125), z - (-115)) < 42) continue; // Cooling tower pad

      const y = getGroundY(x, z);
      const s = 0.5 + rnd() * 0.85;
      dummy.position.set(x, y + 0.05, z);
      dummy.rotation.y = rnd() * Math.PI * 2;
      dummy.scale.set(s, s * (0.8 + rnd() * 0.4), s);
      dummy.updateMatrix();
      gMats.push(dummy.matrix.clone());
    }

    // 2. Green shrubs (#556B2F)
    for (let i = 0; i < 160; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 75 + rnd() * 170;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      if (x > 185) continue;
      if (Math.abs(x) < 55 && Math.abs(z) < 55) continue;
      if (x >= -60 && x <= 140 && z >= -55 && z <= 50) continue;
      if (Math.hypot(x - (-125), z - (-115)) < 42) continue;

      const y = getGroundY(x, z);
      const s = 0.55 + rnd() * 0.75;
      dummy.position.set(x, y + s * 0.35, z);
      dummy.rotation.y = rnd() * Math.PI * 2;
      dummy.scale.set(s, s * 0.65, s);
      dummy.updateMatrix();
      sMats.push(dummy.matrix.clone());
    }

    return { grassMatrices: gMats, shrubMatrices: sMats };
  }, []);

  useFrame(() => {
    if (grassRef.current && grassMatrices.length > 0) {
      grassMatrices.forEach((m, i) => grassRef.current?.setMatrixAt(i, m));
      grassRef.current.instanceMatrix.needsUpdate = true;
    }
    if (shrubRef.current && shrubMatrices.length > 0) {
      shrubMatrices.forEach((m, i) => shrubRef.current?.setMatrixAt(i, m));
      shrubRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const coneGeo = useMemo(() => new THREE.ConeGeometry(0.5, 0.95, 4), []);
  const dodecaGeo = useMemo(() => new THREE.DodecahedronGeometry(0.7, 0), []);

  return (
    <group>
      {grassMatrices.length > 0 && (
        <instancedMesh ref={grassRef} args={[coneGeo, dryGrassMat, grassMatrices.length]} receiveShadow />
      )}
      {shrubMatrices.length > 0 && (
        <instancedMesh ref={shrubRef} args={[dodecaGeo, greenShrubMat, shrubMatrices.length]} receiveShadow />
      )}
    </group>
  );
}

// ============================================================================
// 3. LAKE TUZKAN SHORELINE (SHIFTED +150M EAST - ZERO CLIPPING WITH PLANT)
// ============================================================================

function LakeTuzkanShoreline() {
  const gY = FLOOR_LEVELS.ground;
  const lakeY = gY - 0.75;
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (waterRef.current) {
      const t = state.clock.elapsedTime;
      waterRef.current.position.y = lakeY + Math.sin(t * 0.6) * 0.02;
    }
  });

  // Shoreline position at X = 235m (safely East of outdoor switchyard)
  const lakeCenterX = 380;

  return (
    <group position={[lakeCenterX, 0, 0]}>
      {/* Lake Tuzkan Serene Water Plane */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, lakeY, 0]} receiveShadow>
        <planeGeometry args={[320, 680, 24, 24]} />
        <primitive object={lakeWaterMat} attach="material" />
      </mesh>

      {/* Sandy shoreline bank along X ≈ 202 to 215 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-145, gY - 0.15, 0]} receiveShadow>
        <planeGeometry args={[22, 680]} />
        <primitive object={lakeSandMat} attach="material" />
      </mesh>

      {/* Shoreline wetland reed grass tufts */}
      {Array.from({ length: 48 }).map((_, i) => {
        const rz = -300 + i * 13 + (i % 3) * 1.5;
        const rx = -142 + ((i * 7) % 5) * 1.2;
        return (
          <group key={`reed-${i}`} position={[rx, gY - 0.1, rz]}>
            <mesh position={[0, 0.9, 0]}>
              <cylinderGeometry args={[0.08, 0.25, 1.8, 4]} />
              <primitive object={reedGrassMat} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// 4. SOLID HYPERBOLOID COOLING TOWER & INTERNAL WATER BASIN (NVNPP REFERENCE)
// ============================================================================

function CoolingTower({ position }: { position: [number, number, number] }) {
  const height = 94;
  const segments = 36;

  // Hyperbolic profile points
  const lathePoints = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = t * height;
      const normY = (y - 62) / 45;
      const r = 21 * Math.sqrt(1 + normY * normY * 0.95);
      pts.push(new THREE.Vector2(r, y));
    }
    return pts;
  }, [height]);

  return (
    <group position={position}>
      {/* 1. Double-Sided Solid Hyperboloid Concrete Shell */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[lathePoints, segments]} />
        <primitive object={coolingTowerShellMat} attach="material" />
      </mesh>

      {/* 2. Base Air Intake V-Columns around perimeter */}
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i / 28) * Math.PI * 2;
        const br = 33.5;
        return (
          <group
            key={`vcol-${i}`}
            position={[Math.cos(a) * br, 3.2, Math.sin(a) * br]}
            rotation={[0, -a, 0]}
          >
            <mesh position={[-0.45, 0, 0]} rotation={[0, 0, 0.16]} castShadow>
              <boxGeometry args={[0.75, 6.8, 0.75]} />
              <primitive object={concreteDarkPBRMat} attach="material" />
            </mesh>
            <mesh position={[0.45, 0, 0]} rotation={[0, 0, -0.16]} castShadow>
              <boxGeometry args={[0.75, 6.8, 0.75]} />
              <primitive object={concreteDarkPBRMat} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* 3. Internal Water Cooling Basin Foundation (Dark Concrete #2F3538) */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <cylinderGeometry args={[34.8, 35.2, 0.8, segments]} />
        <primitive object={coolingTowerBasinMat} attach="material" />
      </mesh>

      {/* Basin Rim Retaining Wall */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[34.8, 34.8, 1.6, segments, 1, true]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* Internal Water Surface Pool inside Basin */}
      <mesh position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[34.2, 32]} />
        <primitive object={lakeWaterMat} attach="material" />
      </mesh>

      {/* 4. Realistic Internal Concrete Support Columns inside Lower Ring */}
      {/* Central Heavy Pillar */}
      <mesh position={[0, 4.4, 0]} castShadow>
        <cylinderGeometry args={[2.0, 2.4, 7.8, 16]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* Concentric Internal Support Columns (holding distribution deck) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const cr = 11.5;
        return (
          <mesh key={`incol-1-${i}`} position={[Math.cos(a) * cr, 4.2, Math.sin(a) * cr]} castShadow>
            <cylinderGeometry args={[0.65, 0.75, 7.5, 12]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
        );
      })}

      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const cr = 22.5;
        return (
          <mesh key={`incol-2-${i}`} position={[Math.cos(a) * cr, 4.2, Math.sin(a) * cr]} castShadow>
            <cylinderGeometry args={[0.65, 0.75, 7.5, 12]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
        );
      })}

      {/* 5. Circular Internal Grid: Cooling Fill Pack & Sprinkler Distribution Deck */}
      <group position={[0, 8.2, 0]}>
        {/* Dark Metallic Grid Structure */}
        <mesh receiveShadow>
          <cylinderGeometry args={[30.5, 30.5, 0.45, 32]} />
          <primitive object={coolingFillGrateMat} attach="material" />
        </mesh>

        {/* Radial Header Water Supply Pipes */}
        {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((ang, ai) => (
          <mesh key={`rad-pipe-${ai}`} rotation={[0, ang, 0]} position={[0, 0.6, 0]}>
            <boxGeometry args={[58, 0.6, 0.6]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
        ))}

        {/* Inspection Catwalk across center with yellow handrails */}
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[60, 0.15, 1.4]} />
          <primitive object={steelTrussMat} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// ============================================================================
// 5. VENTILATION CHIMNEYS (ВЕНТТРУБЫ) - RED/WHITE STRIPED WITH RING PLATFORMS
// ============================================================================

function VentilationChimneys({ position }: { position: [number, number, number] }) {
  const stackHeight = 58;
  const radius = 1.7;
  const bandCount = 7;
  const bandHeight = stackHeight / bandCount;

  return (
    <group position={position}>
      {/* Heavy Concrete Foundation Base */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.8, 3.2, 3, 16]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* Alternating Red and White Cylindrical Aviation Bands */}
      {Array.from({ length: bandCount }).map((_, i) => {
        const y = 3 + i * bandHeight + bandHeight / 2;
        const isRed = i % 2 === 0;
        return (
          <mesh key={`vent-band-${i}`} position={[0, y, 0]} castShadow>
            <cylinderGeometry args={[radius, radius, bandHeight, 24]} />
            <primitive object={isRed ? ventRedBandMat : ventWhiteBandMat} attach="material" />
          </mesh>
        );
      })}

      {/* Realistic Metallic Ring Maintenance Platforms with handrails */}
      {[18, 34, 49].map((py) => (
        <group key={`platform-${py}`} position={[0, py, 0]}>
          {/* Deck disc */}
          <mesh receiveShadow>
            <cylinderGeometry args={[radius + 1.2, radius + 1.2, 0.2, 24]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
          {/* Perimeter circular railing */}
          <mesh position={[0, 0.65, 0]}>
            <torusGeometry args={[radius + 1.15, 0.05, 6, 24]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
          {/* Vertical railing posts */}
          {Array.from({ length: 8 }).map((_, pi) => {
            const pa = (pi / 8) * Math.PI * 2;
            return (
              <mesh
                key={`rpost-${pi}`}
                position={[Math.cos(pa) * (radius + 1.15), 0.35, Math.sin(pa) * (radius + 1.15)]}
              >
                <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
                <primitive object={steelTrussMat} attach="material" />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Vertical caged maintenance ladder along side */}
      <mesh position={[radius + 0.25, stackHeight / 2 + 1.5, 0]}>
        <boxGeometry args={[0.3, stackHeight - 3, 0.6]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>

      {/* Top exhaust crown with lightning arrester spire */}
      <mesh position={[0, stackHeight + 3.1, 0]}>
        <cylinderGeometry args={[radius + 0.15, radius, 0.4, 24]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>
      <mesh position={[0, stackHeight + 4.5, 0]}>
        <cylinderGeometry args={[0.04, 0.08, 2.5, 8]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>
      {/* Obstruction Warning Beacon Light at top */}
      <mesh position={[0, stackHeight + 3.4, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#ff2211" emissive="#ff1100" emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

// ============================================================================
// 7. ELEVATED PIPE RACKS (ТРУБОПРОВОДНЫЕ ЭСТАКАДЫ)
// ============================================================================

function ElevatedPipeRacks() {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group position={[0, gY, 0]}>
      {/* Main East-West Utility Pipe Gantry connecting Reactor Building & Turbine Hall area */}
      <group position={[38, 0, -36]}>
        {/* Steel Truss Supporting Bents every 14m */}
        {[-32, -18, -4, 10, 24, 38].map((bx) => (
          <group key={`bent-${bx}`} position={[bx, 0, 0]}>
            {/* Concrete Footing Pads */}
            {[-2.2, 2.2].map((fz) => (
              <mesh key={`fpad-${fz}`} position={[0, 0.3, fz]}>
                <boxGeometry args={[0.9, 0.6, 0.9]} />
                <primitive object={concreteDarkPBRMat} attach="material" />
              </mesh>
            ))}
            {/* Vertical H-beams */}
            {[-2.2, 2.2].map((fz) => (
              <mesh key={`hcol-${fz}`} position={[0, 4.2, fz]}>
                <boxGeometry args={[0.35, 7.8, 0.35]} />
                <primitive object={steelTrussMat} attach="material" />
              </mesh>
            ))}
            {/* Horizontal crossbeams */}
            <mesh position={[0, 4.5, 0]}>
              <boxGeometry args={[0.35, 0.35, 4.8]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
            <mesh position={[0, 8.1, 0]}>
              <boxGeometry args={[0.35, 0.35, 4.8]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Longitudinal Truss Span Beams */}
        {[-2.2, 2.2].map((sz) => (
          <group key={`long-truss-${sz}`} position={[3, 0, sz]}>
            <mesh position={[0, 8.1, 0]}>
              <boxGeometry args={[74, 0.3, 0.3]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
            <mesh position={[0, 4.5, 0]}>
              <boxGeometry args={[74, 0.3, 0.3]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        ))}

        {/* Insulated Steam Pipes on Upper Tier */}
        {[-1.2, 1.2].map((pz) => (
          <mesh key={`st-pipe-${pz}`} rotation={[0, 0, Math.PI / 2]} position={[3, 8.8, pz]}>
            <cylinderGeometry args={[0.42, 0.42, 74, 16]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
        ))}

        {/* Feedwater Pipes on Lower Tier with Blue Identifying Bands */}
        {[-1.4, 0, 1.4].map((pz, pi) => (
          <mesh key={`fw-pipe-${pz}`} rotation={[0, 0, Math.PI / 2]} position={[3, 5.2, pz]}>
            <cylinderGeometry args={[0.28, 0.28, 74, 16]} />
            <primitive object={pi === 1 ? pipeGasMat : pipeFeedwaterMat} attach="material" />
          </mesh>
        ))}

        {/* Thermal Expansion U-Loop (П-образный компенсатор) in the center */}
        <group position={[3, 8.8, 0]}>
          <mesh position={[0, 2.2, -1.2]}>
            <boxGeometry args={[0.8, 4.2, 0.8]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <boxGeometry args={[0.8, 0.8, 2.8]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
          <mesh position={[0, 2.2, 1.2]}>
            <boxGeometry args={[0.8, 4.2, 0.8]} />
            <primitive object={insulationPipeMat} attach="material" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ============================================================================
// 8. HIGH-VOLTAGE TRANSMISSION PYLONS (ЛЭП) & OUTDOOR SWITCHYARD (ОРУ-500 кВ)
// ============================================================================

function TransmissionPylon({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* 4 Concrete Foundation Pillars */}
      {[
        [-2.5, -2.5],
        [2.5, -2.5],
        [-2.5, 2.5],
        [2.5, 2.5],
      ].map(([fx, fz], fi) => (
        <mesh key={`pylon-pad-${fi}`} position={[fx, 0.5, fz]}>
          <boxGeometry args={[1.2, 1.0, 1.2]} />
          <primitive object={concreteDarkPBRMat} attach="material" />
        </mesh>
      ))}

      {/* Main Tapered 4-Legged Lattice Steel Body */}
      <mesh position={[0, 14, 0]} castShadow>
        <cylinderGeometry args={[1.1, 3.6, 28, 4]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>

      {/* Upper Waist to Peak */}
      <mesh position={[0, 31, 0]} castShadow>
        <cylinderGeometry args={[0.4, 1.1, 8, 4]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>

      {/* Lower Crossarm (26m height, 16m span) */}
      <group position={[0, 24, 0]}>
        <mesh castShadow>
          <boxGeometry args={[18, 0.8, 1.4]} />
          <primitive object={steelTrussMat} attach="material" />
        </mesh>
        {/* Ceramic Insulator String Assemblies hanging down */}
        {[-8, -4, 4, 8].map((ix) => (
          <group key={`ins-lo-${ix}`} position={[ix, -1.8, 0]}>
            <mesh>
              <cylinderGeometry args={[0.18, 0.22, 2.8, 8]} />
              <primitive object={ceramicInsulatorMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Middle/Upper Crossarm (30m height, 12m span) */}
      <group position={[0, 29, 0]}>
        <mesh castShadow>
          <boxGeometry args={[13, 0.7, 1.2]} />
          <primitive object={steelTrussMat} attach="material" />
        </mesh>
        {[-5.5, 5.5].map((ix) => (
          <group key={`ins-hi-${ix}`} position={[ix, -1.6, 0]}>
            <mesh>
              <cylinderGeometry args={[0.18, 0.22, 2.5, 8]} />
              <primitive object={ceramicInsulatorMat} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Top Ground Wire Spire Peak */}
      <mesh position={[0, 36, 0]}>
        <cylinderGeometry args={[0.08, 0.35, 4, 4]} />
        <primitive object={steelTrussMat} attach="material" />
      </mesh>
    </group>
  );
}

function OutdoorSwitchyard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Gravel Substation Foundation Pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.05, 0]}>
        <planeGeometry args={[95, 84]} />
        <meshStandardMaterial color="#686c72" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Main Step-Up Generator Transformers (Трансформаторы связи ТДЦ-400000/500) */}
      {[-24, 0, 24].map((tx, ti) => (
        <group key={`trafo-${ti}`} position={[tx, 0, -26]}>
          {/* Concrete Fire Blast Firewall */}
          <mesh position={[6, 4.8, 0]} castShadow>
            <boxGeometry args={[0.8, 9.6, 14]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
          {/* Transformer Main Tank */}
          <mesh position={[0, 3.8, 0]} castShadow>
            <boxGeometry args={[7, 6.5, 8.5]} />
            <primitive object={industrialMetalDarkMat} attach="material" />
          </mesh>
          {/* High-Voltage Bushings (Вводы 500 кВ) */}
          {[-2.2, 0, 2.2].map((bx) => (
            <mesh key={`bushing-${bx}`} position={[bx, 8.2, 0]} rotation={[0, 0, 0.15]}>
              <cylinderGeometry args={[0.18, 0.35, 3.2, 8]} />
              <primitive object={ceramicInsulatorMat} attach="material" />
            </mesh>
          ))}
          {/* Radiator Cooling Banks */}
          <mesh position={[-4.5, 3.5, 0]}>
            <boxGeometry args={[1.4, 5, 7.5]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* SF6 Circuit Breakers & Disconnectors (Элегазовые выключатели) */}
      {[-28, -10, 10, 28].map((bx) => (
        <group key={`cb-${bx}`} position={[bx, 0, 6]}>
          <mesh position={[0, 2.5, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 5, 8]} />
            <primitive object={industrialMetalDarkMat} attach="material" />
          </mesh>
          {[-1.2, 1.2].map((pz) => (
            <mesh key={`post-${pz}`} position={[0, 5.5, pz]}>
              <cylinderGeometry args={[0.15, 0.15, 2.2, 8]} />
              <primitive object={ceramicInsulatorMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}

      {/* Transmission Pylons inside and leading out of Switchyard */}
      <TransmissionPylon position={[30, 0, 24]} rotation={0} />
      <TransmissionPylon position={[-30, 0, 24]} rotation={0} />

      {/* High-Voltage Sagging Transmission Cable Lines */}
      {[-8, -4, 4, 8].map((cx) => (
        <mesh key={`cable-span-${cx}`} position={[cx, 23.5, 24]}>
          <boxGeometry args={[0.08, 0.08, 28]} />
          <primitive object={transmissionCableMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// 9. STANDBY DIESEL GENERATOR STATION & ADMINISTRATIVE BUILDING
// ============================================================================

function DieselGeneratorStation({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {Array.from({ length: 4 }).map((_, i) => {
        const x = -21 + i * 14;
        return (
          <group key={`d-block-${i}`} position={[x, 0, 0]}>
            {/* Red-brown protective skirt base trim */}
            <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
              <boxGeometry args={[11, 3.5, 16]} />
              <primitive object={baseRedBrownSkirtMat} attach="material" />
            </mesh>
            {/* Upper warm beige industrial panels */}
            <mesh position={[0, 6.75, 0]} castShadow receiveShadow>
              <boxGeometry args={[10.8, 6.5, 15.8]} />
              <primitive object={wallBeigePanelMat} attach="material" />
            </mesh>
            {/* Louver air intake & roll-up equipment door */}
            <mesh position={[0, 5, 8.1]}>
              <boxGeometry args={[7, 4.5, 0.2]} />
              <primitive object={industrialMetalDarkMat} attach="material" />
            </mesh>
            {/* Rooftop diesel exhaust silencer & stack */}
            <mesh position={[3, 13, -5]} castShadow>
              <cylinderGeometry args={[0.55, 0.55, 7.5, 16]} />
              <primitive object={steelTrussMat} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function AdministrativeBuilding({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Lower red-brown protective skirt base */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[46, 4, 20]} />
        <primitive object={baseRedBrownSkirtMat} attach="material" />
      </mesh>
      {/* Upper warm beige wall panels */}
      <mesh position={[0, 9.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[45.8, 11, 19.8]} />
        <primitive object={wallBeigePanelMat} attach="material" />
      </mesh>
      {/* Window ribbon strips across floors */}
      {[4.8, 8.8, 12.8].map((wy, wi) => (
        <mesh key={`abk-win-${wi}`} position={[0, wy, 10.1]}>
          <boxGeometry args={[42, 2.2, 0.2]} />
          <primitive object={glassWindowMat} attach="material" />
        </mesh>
      ))}
      {/* Entrance canopy */}
      <mesh position={[0, 3.8, 12.5]} castShadow>
        <boxGeometry args={[12, 0.4, 5]} />
        <primitive object={industrialMetalDarkMat} attach="material" />
      </mesh>
    </group>
  );
}

// ============================================================================
// 10. STRUCTURED ASPHALT ROAD NETWORK & LANDSCAPING (PERIMETER LOOP ROAD)
// ============================================================================

function RoadSegment({
  position,
  rotation = 0,
  length,
  width = 12,
}: {
  position: [number, number, number];
  rotation?: number;
  length: number;
  width?: number;
}) {
  const gY = FLOOR_LEVELS.ground;
  const halfW = width / 2;

  return (
    <group position={[position[0], gY + 0.05, position[2]]} rotation={[0, rotation, 0]}>
      {/* Asphalt Surface strictly at Y = gY + 0.05 to eliminate Y/Z-fighting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[length, width]} />
        <primitive object={asphaltRoadMat} attach="material" />
      </mesh>

      {/* Solid White Border Lines on both road edges */}
      {[-halfW + 0.45, halfW - 0.45].map((ez) => (
        <mesh key={`edge-line-${ez}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, ez]}>
          <planeGeometry args={[length, 0.25]} />
          <primitive object={roadMarkingMat} attach="material" />
        </mesh>
      ))}

      {/* Dashed White Center Divider Line */}
      {Array.from({ length: Math.floor(length / 10) }).map((_, i) => {
        const dx = -length / 2 + 5 + i * 10;
        return (
          <mesh key={`dash-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[dx, 0.01, 0]}>
            <planeGeometry args={[5, 0.3]} />
            <primitive object={roadMarkingMat} attach="material" />
          </mesh>
        );
      })}

      {/* Raised Concrete Curbs flanking both edges */}
      {[-halfW - 0.2, halfW + 0.2].map((cz) => (
        <mesh key={`curb-${cz}`} position={[0, 0.08, cz]}>
          <boxGeometry args={[length, 0.22, 0.4]} />
          <primitive object={concreteCurbMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function RoadwaysAndLandscaping() {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group>
      {/* 1. Reactor Island Heavy Concrete Paved Apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, gY + 0.02, 0]} receiveShadow>
        <ringGeometry args={[20.5, 52, 48]} />
        <primitive object={concreteDarkPBRMat} attach="material" />
      </mesh>

      {/* 2. Continuous Perimeter Loop Road around Reactor Island & Turbine Hall */}
      {/* South segment: Z = 42, X from -52 to 136 (Length = 188m) */}
      <RoadSegment position={[42, 0, 42]} length={188} width={12} />

      {/* North segment: Z = -48, X from -52 to 136 (Length = 188m) */}
      <RoadSegment position={[42, 0, -48]} length={188} width={12} />

      {/* East segment: X = 136, Z from -48 to 42 (Length = 90m) */}
      <RoadSegment position={[136, 0, -3]} rotation={Math.PI / 2} length={90} width={12} />

      {/* West segment: X = -52, Z from -48 to 42 (Length = 90m) */}
      <RoadSegment position={[-52, 0, -3]} rotation={Math.PI / 2} length={90} width={12} />

      {/* 3. Connecting Road Branches */}
      {/* South Extension: connects to Administrative Building at Z = 138 */}
      <RoadSegment position={[0, 0, 90]} rotation={Math.PI / 2} length={96} width={10} />

      {/* West Extension: connects to Diesel Station & Cooling Tower */}
      <RoadSegment position={[-88, 0, -48]} length={72} width={10} />
      <RoadSegment position={[-125, 0, -78]} rotation={Math.PI / 2} length={60} width={10} />

      {/* Turnaround ring road around Cooling Tower */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-125, gY + 0.05, -115]} receiveShadow>
        <ringGeometry args={[36.5, 46.5, 36]} />
        <primitive object={asphaltRoadMat} attach="material" />
      </mesh>

      {/* 4. Light Grey Paved Concrete Pedestrian Walkways */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, gY + 0.03, 24]} receiveShadow>
        <planeGeometry args={[8, 36]} />
        <primitive object={concreteWalkwayMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[55, gY + 0.03, 17]} receiveShadow>
        <planeGeometry args={[12, 50]} />
        <primitive object={concreteWalkwayMat} attach="material" />
      </mesh>

      {/* 5. Deep Green Manicured Lawns along roadways and building plazas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-25, gY + 0.03, 62]} receiveShadow>
        <planeGeometry args={[44, 26]} />
        <primitive object={deepGreenLawnMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[45, gY + 0.03, 62]} receiveShadow>
        <planeGeometry args={[60, 26]} />
        <primitive object={deepGreenLawnMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[40, gY + 0.03, -68]} receiveShadow>
        <planeGeometry args={[110, 28]} />
        <primitive object={deepGreenLawnMat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, gY + 0.03, 115]} receiveShadow>
        <planeGeometry args={[95, 24]} />
        <primitive object={deepGreenLawnMat} attach="material" />
      </mesh>
    </group>
  );
}

// ============================================================================
// 11. SITE PERIMETER SECURITY FENCING & FLOODLIGHT POSTS
// ============================================================================

function SiteFencingAndLighting() {
  const gY = FLOOR_LEVELS.ground;

  const floodlightPositions = useMemo(
    () => [
      [-64, gY, 68] as [number, number, number],
      [0, gY, 68] as [number, number, number],
      [64, gY, 68] as [number, number, number],
      [-64, gY, -70] as [number, number, number],
      [0, gY, -70] as [number, number, number],
      [64, gY, -70] as [number, number, number],
      [145, gY, 0] as [number, number, number],
      [-66, gY, 0] as [number, number, number],
    ],
    [gY]
  );

  return (
    <group>
      {/* Perimeter Security Fences */}
      {[
        { pos: [40, gY, 78] as [number, number, number], rot: 0, len: 196 },
        { pos: [40, gY, -82] as [number, number, number], rot: 0, len: 196 },
        { pos: [142, gY, -2] as [number, number, number], rot: Math.PI / 2, len: 160 },
        { pos: [-64, gY, -2] as [number, number, number], rot: Math.PI / 2, len: 160 },
      ].map((f, i) => (
        <group key={`fence-${i}`} position={f.pos} rotation={[0, f.rot, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[f.len, 0.3, 0.4]} />
            <primitive object={concreteCurbMat} attach="material" />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[f.len, 2.2, 0.02]} />
            <primitive object={fenceMeshMat} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Industrial Floodlight Posts along perimeter */}
      {floodlightPositions.map((pos, i) => (
        <group key={`pole-${i}`} position={pos}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.5, 0.6, 0.5, 8]} />
            <primitive object={concreteDarkPBRMat} attach="material" />
          </mesh>
          <mesh position={[0, 6, 0]}>
            <cylinderGeometry args={[0.1, 0.18, 12, 8]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
          <mesh position={[0, 12, 0]}>
            <boxGeometry args={[1.8, 0.12, 0.12]} />
            <primitive object={steelTrussMat} attach="material" />
          </mesh>
          {[-0.7, 0.7].map((lx) => (
            <mesh key={`head-${lx}`} position={[lx, 12.1, 0.2]} rotation={[Math.PI / 4, 0, 0]}>
              <boxGeometry args={[0.5, 0.35, 0.25]} />
              <primitive object={floodlightMat} attach="material" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ============================================================================
// MAIN EXTERIOR SCENE EXPORT
// ============================================================================

export default function ExteriorScene() {
  const gY = FLOOR_LEVELS.ground;

  return (
    <group>
      {/* 1. Undulating Steppe Terrain (Flat plant platform + East Lake Tuzkan depression) */}
      <UndulatingSteppeTerrain />

      {/* 2. Structured Asphalt Road Network & Paved Walkways */}
      <RoadwaysAndLandscaping />

      {/* 3. Site Security Fencing & Perimeter Industrial Lighting */}
      <SiteFencingAndLighting />

      {/* 4. Solid Hyperboloid Cooling Tower (Градирня) with Internal Basin & Columns */}
      <CoolingTower position={[-125, gY, -115]} />

      {/* 6. Ventilation Chimneys (Венттрубы) - Red/white striped with ring platforms */}
      <VentilationChimneys position={[-22, gY, -28]} />

      {/* 7. Elevated Pipe Racks (Трубопроводные эстакады) carrying insulated pipes */}
      <ElevatedPipeRacks />

      {/* 8. Outdoor Switchyard (ОРУ-500 кВ) & High-Voltage Transmission Pylons (ЛЭП) */}
      <OutdoorSwitchyard position={[172, gY, 10]} />
      <TransmissionPylon position={[215, gY, -22]} rotation={-0.2} />

      {/* 9. Standby Diesel Generator Station (РДЭС) */}
      <DieselGeneratorStation position={[-65, gY, 15]} />

      {/* 10. Administrative & Engineering Building (АБК) */}
      <AdministrativeBuilding position={[0, gY, 138]} />

      {/* 11. Lake Tuzkan Shoreline (Shifted +150m EAST, zero clipping with plant) */}
      <LakeTuzkanShoreline />

      {/* 12. Procedural Steppe Vegetation (Grass #BDB76B & Shrubs #556B2F) */}
      <SteppeVegetationDensity />
    </group>
  );
}
