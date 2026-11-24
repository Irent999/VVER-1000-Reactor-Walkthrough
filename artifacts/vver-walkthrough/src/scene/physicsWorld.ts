import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import {
  CONTAINMENT,
  RPV,
  STEAM_GEN,
  MCP,
  ECCS_TANKS,
  EYE_HEIGHT,
} from './constants';

export class VVERPhysicsWorld {
  public world: CANNON.World;
  public playerBody: CANNON.Body;
  public playerRadius = 0.38;
  public playerHeight = 1.6;
  public isInitialized = false;
  private defaultMaterial: CANNON.Material;
  private playerMaterial: CANNON.Material;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    (this.world.solver as CANNON.GSSolver).iterations = 10;

    // Contact material setup for smooth character sliding against walls and pipes
    this.defaultMaterial = new CANNON.Material('staticObstacle');
    this.playerMaterial = new CANNON.Material('playerAvatar');

    const contactMat = new CANNON.ContactMaterial(
      this.playerMaterial,
      this.defaultMaterial,
      {
        friction: 0.05,
        restitution: 0.0,
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3,
      }
    );
    this.world.addContactMaterial(contactMat);

    // Player rigid body (sphere collider matching human torso/collision volume)
    this.playerBody = new CANNON.Body({
      mass: 75,
      type: CANNON.Body.DYNAMIC,
      fixedRotation: true,
      material: this.playerMaterial,
      linearDamping: 0.85,
    });

    const playerShape = new CANNON.Sphere(this.playerRadius);
    this.playerBody.addShape(playerShape, new CANNON.Vec3(0, 0, 0));
    // Additional upper sphere for head/shoulders collision check with overhead pipes
    const headShape = new CANNON.Sphere(this.playerRadius * 0.85);
    this.playerBody.addShape(headShape, new CANNON.Vec3(0, 0.7, 0));

    this.world.addBody(this.playerBody);

    this.buildStaticObstacles();
    this.isInitialized = true;
  }

  /**
   * Builds physical static rigid bodies for:
   * 1. Cylindrical outer containment perimeter (32 wall segment boxes)
   * 2. RPV (Reactor Pressure Vessel) & concrete bio-shield central cylinder
   * 3. 4 Steam Generators (PGV-1000 horizontal cylinders/boxes)
   * 4. 4 Main Coolant Pumps (ГЦЭН-195М)
   * 5. Primary loop pipes (ГЦТ Ду 850 hot and cold legs)
   * 6. Pressurizer (КД) & relief tank
   * 7. 4 ECCS Accumulator tanks (САОЗ)
   * 8. Turbine Hall turbine machinery casing and perimeter walls
   * 9. Auxiliary building / MCR control room walls
   */
  private buildStaticObstacles() {
    // 1. Outer Containment Wall: 32 segments forming a 360° circular barrier at R = 22.0m
    const numWallSegments = 32;
    const angleStep = (Math.PI * 2) / numWallSegments;
    const segmentWidth = 2 * CONTAINMENT.innerRadius * Math.sin(angleStep / 2) + 0.4;
    const wallThickness = 1.0;
    const wallHeight = 45.0;

    for (let i = 0; i < numWallSegments; i++) {
      const angle = i * angleStep;
      const r = CONTAINMENT.innerRadius + wallThickness / 2;
      const wx = Math.cos(angle) * r;
      const wz = Math.sin(angle) * r;

      const wallBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(wx, 18.0, wz),
        material: this.defaultMaterial,
      });

      wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -angle);
      const wallBox = new CANNON.Box(
        new CANNON.Vec3(wallThickness / 2, wallHeight / 2, segmentWidth / 2)
      );
      wallBody.addShape(wallBox);
      this.world.addBody(wallBody);
    }

    // 2. RPV (Reactor Pressure Vessel) & Concrete Biological Shield
    // Outer radius 2.6m from floor -5.0m up to +22.0m
    const rpvBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(0, 14.0, 0),
      material: this.defaultMaterial,
    });
    // 12-sided polygonal approximation using static boxes or cylinder shape
    const rpvCylinder = new CANNON.Cylinder(2.65, 2.65, 28.0, 16);
    const rpvQ = new CANNON.Quaternion();
    rpvQ.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    rpvBody.addShape(rpvCylinder, new CANNON.Vec3(0, 0, 0), rpvQ);
    this.world.addBody(rpvBody);

    // 3. 4 Steam Generators (PGV-1000)
    // Horizontal massive vessels (length 14.0m, radius 2.0m, at centerRadius 12.0m, Y = 17.5m)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const cx = Math.cos(angle) * STEAM_GEN.centerRadius;
      const cz = Math.sin(angle) * STEAM_GEN.centerRadius;
      const cy = STEAM_GEN.centerY;

      const sgBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(cx, cy, cz),
        material: this.defaultMaterial,
      });

      // In Three.js: rotation={[0, -angle + Math.PI / 2, Math.PI / 2]}
      const euler = new THREE.Euler(0, -angle + Math.PI / 2, Math.PI / 2, 'XYZ');
      const threeQ = new THREE.Quaternion().setFromEuler(euler);
      sgBody.quaternion.set(threeQ.x, threeQ.y, threeQ.z, threeQ.w);

      // SG cylinder in Three.js has radius 2.0m and length 14.0m (along Y in local coords)
      const sgBox = new CANNON.Box(
        new CANNON.Vec3(STEAM_GEN.radius, STEAM_GEN.length / 2, STEAM_GEN.radius)
      );
      sgBody.addShape(sgBox);

      // Add SG support saddles to prevent walking under the generator
      const saddle1 = new CANNON.Box(new CANNON.Vec3(2.2, 1.5, 1.2));
      sgBody.addShape(saddle1, new CANNON.Vec3(0, -STEAM_GEN.length / 3, -2.2));
      const saddle2 = new CANNON.Box(new CANNON.Vec3(2.2, 1.5, 1.2));
      sgBody.addShape(saddle2, new CANNON.Vec3(0, STEAM_GEN.length / 3, -2.2));

      this.world.addBody(sgBody);
    }

    // 4. 4 Main Coolant Pumps (ГЦЭН-195М)
    // Center radius 8.0m, Y = 17.0m, radius 1.1m, height 4.8m
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(angle) * MCP.centerRadius;
      const pz = Math.sin(angle) * MCP.centerRadius;

      const mcpBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(px, MCP.centerY, pz),
        material: this.defaultMaterial,
      });

      const mcpShape = new CANNON.Cylinder(1.2, 1.25, 4.8, 12);
      const mcpQ = new CANNON.Quaternion();
      mcpQ.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
      mcpBody.addShape(mcpShape, new CANNON.Vec3(0, 0, 0), mcpQ);

      // Support base (box)
      const baseShape = new CANNON.Box(new CANNON.Vec3(1.2, 0.6, 1.2));
      mcpBody.addShape(baseShape, new CANNON.Vec3(0, -2.1, 0));

      this.world.addBody(mcpBody);
    }

    // 5. Primary Circuit Pipes (ГЦТ Ду 850)
    // Hot legs connect RPV (r=2.6, Y=15.2) to Steam Generator (r=12.0, Y=17.7)
    // Cold legs connect SG to MCP (r=8.0, Y=16.6) to RPV (r=2.6, Y=14.1)
    // Each pipe is ~1.05m outer diameter with insulation
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const rVesselX = Math.cos(angle) * (RPV.radius + 0.35);
      const rVesselZ = Math.sin(angle) * (RPV.radius + 0.35);
      const sgX = Math.cos(angle) * STEAM_GEN.centerRadius;
      const sgZ = Math.sin(angle) * STEAM_GEN.centerRadius;
      const pumpX = Math.cos(angle) * MCP.centerRadius;
      const pumpZ = Math.sin(angle) * MCP.centerRadius;

      // Hot leg intermediate segments (radial direction)
      const hotPoints = [
        new THREE.Vector3(rVesselX, 15.2, rVesselZ),
        new THREE.Vector3(rVesselX * 0.5 + sgX * 0.5, 16.4, rVesselZ * 0.5 + sgZ * 0.5),
        new THREE.Vector3(sgX, STEAM_GEN.centerY + 0.2, sgZ),
      ];

      for (let s = 0; s < hotPoints.length - 1; s++) {
        const p1 = hotPoints[s];
        const p2 = hotPoints[s + 1];
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const diff = new THREE.Vector3().subVectors(p2, p1);
        const len = diff.length();

        const pipeBody = new CANNON.Body({
          type: CANNON.Body.STATIC,
          position: new CANNON.Vec3(mid.x, mid.y, mid.z),
          material: this.defaultMaterial,
        });

        const pipeBox = new CANNON.Box(new CANNON.Vec3(0.55, 0.55, len / 2));
        // Rotate box to align with diff vector
        const dir = diff.clone().normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        pipeBody.quaternion.set(quat.x, quat.y, quat.z, quat.w);
        pipeBody.addShape(pipeBox);
        this.world.addBody(pipeBody);
      }

      // Cold leg intermediate segments
      const coldPoints = [
        new THREE.Vector3(sgX, STEAM_GEN.centerY - 1.6, sgZ),
        new THREE.Vector3((sgX + pumpX) / 2, STEAM_GEN.centerY - 2.0, (sgZ + pumpZ) / 2),
        new THREE.Vector3(pumpX, MCP.centerY - 0.4, pumpZ),
        new THREE.Vector3((pumpX + rVesselX) / 2, 14.5, (pumpZ + rVesselZ) / 2),
        new THREE.Vector3(rVesselX, 14.1, rVesselZ),
      ];

      for (let s = 0; s < coldPoints.length - 1; s++) {
        const p1 = coldPoints[s];
        const p2 = coldPoints[s + 1];
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const diff = new THREE.Vector3().subVectors(p2, p1);
        const len = diff.length();

        const pipeBody = new CANNON.Body({
          type: CANNON.Body.STATIC,
          position: new CANNON.Vec3(mid.x, mid.y, mid.z),
          material: this.defaultMaterial,
        });

        const pipeBox = new CANNON.Box(new CANNON.Vec3(0.55, 0.55, len / 2));
        const dir = diff.clone().normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        pipeBody.quaternion.set(quat.x, quat.y, quat.z, quat.w);
        pipeBody.addShape(pipeBox);
        this.world.addBody(pipeBody);
      }
    }

    // 6. Pressurizer (КД) & Relief Tank
    // КД: vertical cylinder vessel at x = -13.5, z = -8.2, baseY = 15.0m, height = 13.8m
    const pzBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(-13.5, 20.5, -8.2),
      material: this.defaultMaterial,
    });
    const pzBox = new CANNON.Box(new CANNON.Vec3(1.8, 6.5, 1.8));
    pzBody.addShape(pzBox);
    this.world.addBody(pzBody);

    // Relief tank (Бак-барботер): horizontal tank at x = -14.2, y = 11.2, z = -4.2
    const bbBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(-14.2, 11.2, -4.2),
      material: this.defaultMaterial,
    });
    const bbBox = new CANNON.Box(new CANNON.Vec3(1.4, 1.4, 3.4));
    bbBody.addShape(bbBox);
    this.world.addBody(bbBody);

    // 7. 4 ECCS Hydroaccumulators (САОЗ)
    // 4 vertical tanks at centerRadius 18.8m
    const eccsAngles = [-Math.PI * 0.18, Math.PI * 0.68, Math.PI * 1.08, Math.PI * 1.58];
    for (const a of eccsAngles) {
      const ex = Math.cos(a) * ECCS_TANKS.centerRadius;
      const ez = Math.sin(a) * ECCS_TANKS.centerRadius;
      const eccsBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(ex, ECCS_TANKS.y, ez),
        material: this.defaultMaterial,
      });
      const eccsBox = new CANNON.Box(
        new CANNON.Vec3(ECCS_TANKS.radius + 0.1, ECCS_TANKS.height / 2, ECCS_TANKS.radius + 0.1)
      );
      eccsBody.addShape(eccsBox);
      this.world.addBody(eccsBody);
    }

    // 8. Turbine Hall Machinery & Perimeter (Operating Deck +12m, Outside Containment)
    // Massive turbine/generator casing along Z ≈ -12, X from 34 to 116 with crosswalk gaps at X≈47 and X≈89
    const turbineBlocks = [
      { x: (34.0 + 45.5) / 2, width: 45.5 - 34.0 },
      { x: (48.5 + 87.5) / 2, width: 87.5 - 48.5 },
      { x: (90.5 + 116.0) / 2, width: 116.0 - 90.5 },
    ];

    for (const block of turbineBlocks) {
      const tbBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(block.x, 14.5, -12.0),
        material: this.defaultMaterial,
      });
      const tbBox = new CANNON.Box(new CANNON.Vec3(block.width / 2, 2.5, 3.2));
      tbBody.addShape(tbBox);
      this.world.addBody(tbBody);
    }

    // Turbine Hall Perimeter Walls
    // North wall (Z = 5.2), South wall (Z = -29.2), East wall (X = 127.0), West wall (X = 26.8)
    const tNorth = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3((26.5 + 127.5) / 2, 14.0, 5.2),
      material: this.defaultMaterial,
    });
    tNorth.addShape(new CANNON.Box(new CANNON.Vec3((127.5 - 26.5) / 2, 8.0, 0.4)));
    this.world.addBody(tNorth);

    const tSouth = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3((26.5 + 127.5) / 2, 14.0, -29.2),
      material: this.defaultMaterial,
    });
    tSouth.addShape(new CANNON.Box(new CANNON.Vec3((127.5 - 26.5) / 2, 8.0, 0.4)));
    this.world.addBody(tSouth);

    const tEast = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(127.2, 14.0, (-29.2 + 5.2) / 2),
      material: this.defaultMaterial,
    });
    tEast.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 8.0, (5.2 - -29.2) / 2)));
    this.world.addBody(tEast);

    const tWest = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: new CANNON.Vec3(26.8, 14.0, (-29.2 + 5.2) / 2),
      material: this.defaultMaterial,
    });
    tWest.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 8.0, (5.2 - -29.2) / 2)));
    this.world.addBody(tWest);
  }

  /**
   * Resets or teleports the player avatar to a designated world position.
   */
  public teleportPlayer(x: number, y: number, z: number) {
    this.playerBody.position.set(x, y + this.playerRadius, z);
    this.playerBody.velocity.set(0, 0, 0);
    this.playerBody.angularVelocity.set(0, 0, 0);
    this.playerBody.previousPosition.set(x, y + this.playerRadius, z);
  }

  /**
   * Steps the physics simulation and returns the resolved player position.
   * Prevents tunneling through walls, steam generators, and pipes via Cannon-es rigid contact solving.
   */
  public step(
    targetVx: number,
    targetVz: number,
    dt: number,
    currentFloorY: number
  ): { x: number; y: number; z: number } {
    const frameDt = Math.min(dt, 0.05);

    // Keep body at appropriate height relative to current floor elevation
    const targetBodyY = currentFloorY + this.playerRadius + 0.3;
    this.playerBody.position.y = targetBodyY;

    // Apply movement velocities directly to player rigid body
    this.playerBody.velocity.x = targetVx;
    this.playerBody.velocity.y = 0;
    this.playerBody.velocity.z = targetVz;

    // Run sub-stepped Cannon-es physics tick
    this.world.step(1 / 60, frameDt, 3);

    // Ensure user stays within outer containment radius safety boundary (21.7m)
    // when within reactor building footprint
    let px = this.playerBody.position.x;
    let pz = this.playerBody.position.z;
    const isOutsideBuilding = px > 25.0 || (px >= 134.0 && pz >= 56.0) || px < -22.0;

    if (!isOutsideBuilding) {
      const r = Math.hypot(px, pz);
      const maxContainmentR = CONTAINMENT.innerRadius - 0.35;
      if (r > maxContainmentR) {
        const factor = maxContainmentR / r;
        px *= factor;
        pz *= factor;
        this.playerBody.position.x = px;
        this.playerBody.position.z = pz;
      }
    }

    return {
      x: px,
      y: currentFloorY + EYE_HEIGHT,
      z: pz,
    };
  }
}

// Singleton physics instance for Walk mode
export const globalPhysicsWorld = new VVERPhysicsWorld();
