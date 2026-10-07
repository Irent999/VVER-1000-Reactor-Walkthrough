import { FLOOR_LEVELS, DECK, STAIRS, CONTAINMENT } from './constants';

/**
 * Returns the floor surface height at a given (x, z) position,
 * considering the player's current Y to disambiguate overlapping regions.
 */
export function getFloorHeightAt(x: number, z: number, currentY: number): number {
  const r = Math.sqrt(x * x + z * z);

  // 1. Polar Crane Deck / Upper Deck (+36.0m):
  // When player is walking on the +36m elevation, the continuous 360° circular platform slab
  // is at +36m from inner hole (r=8.0) to outer containment wall (r=21.6).
  // Stairwell 2 height slope must NEVER override the upper deck platform unless stepping into stairs.
  if (currentY >= 32.0 && r <= CONTAINMENT.innerRadius - 0.3) {
    // Only if user is stepping into Stair 2 near its top landing (x≈7.5, z≈19)
    if (x >= STAIRS.s2.xMin && x <= STAIRS.s2.xMax && z >= STAIRS.s2.zMin && z <= STAIRS.s2.zMax) {
      const t = (x - STAIRS.s2.xMin) / (STAIRS.s2.xMax - STAIRS.s2.xMin);
      const stairY = STAIRS.s2.yStart + t * (STAIRS.s2.yEnd - STAIRS.s2.yStart);
      if (Math.abs(currentY - stairY) < 1.6) {
        return stairY;
      }
    }
    return DECK.upperY;
  }

  // 2. Stairwell 2: main deck -> upper deck (along X at z≈19)
  // Only applies if player is vertically within 2m of the stair slope
  if (x >= STAIRS.s2.xMin && x <= STAIRS.s2.xMax && z >= STAIRS.s2.zMin && z <= STAIRS.s2.zMax) {
    const t = (x - STAIRS.s2.xMin) / (STAIRS.s2.xMax - STAIRS.s2.xMin);
    const stairY = STAIRS.s2.yStart + t * (STAIRS.s2.yEnd - STAIRS.s2.yStart);
    if (Math.abs(currentY - stairY) < 2.0 && currentY > 14 && currentY < 36.5) return stairY;
  }

  // 3. Stairwell 1: basement -> main deck (along Z at x≈19)
  if (x >= STAIRS.s1.xMin && x <= STAIRS.s1.xMax && z >= STAIRS.s1.zMin && z <= STAIRS.s1.zMax) {
    const t = (z - STAIRS.s1.zMin) / (STAIRS.s1.zMax - STAIRS.s1.zMin);
    const stairY = STAIRS.s1.yStart + t * (STAIRS.s1.yEnd - STAIRS.s1.yStart);
    if (Math.abs(currentY - stairY) < 2.0 && currentY > -6 && currentY < 16) return stairY;
  }

  // 4. Upper deck remains walkable around the refueling cavity; solid teaching platform in this walkthrough.
  if (r <= CONTAINMENT.innerRadius - 0.3 && currentY > 28) {
    return DECK.upperY;
  }

  // 5. Main deck floor (+15m) is continuous for safe educational navigation.
  if (r <= CONTAINMENT.innerRadius - 0.3 && currentY > 5 && currentY <= 28) {
    return DECK.mainY;
  }

  // Subterranean staircase: Core Catcher (-10m) -> Basement DCS (-5m) along Z at x≈0
  if (Math.abs(x) <= 1.4 && z >= -11.5 && z <= -7.5) {
    const t = (z - (-11.5)) / (-7.5 - (-11.5));
    const stairY = -10.0 + t * (-5.0 - (-10.0));
    if (currentY > -11.5 && currentY < -3.5) return stairY;
  }

  // Core Catcher subterranean vault (-10m)
  if (r <= 9.5 && currentY < -7) {
    return FLOOR_LEVELS.coreCatcher;
  }

  // Turbine Hall Operating Deck (+12m) and ground level (X from 26.5m to 127.5m, 100% outside containment)
  if (x >= 26.5 && x <= 127.5 && z >= -30.0 && z <= 6.0) {
    if (currentY > 4.0 && currentY < 24.0) {
      return FLOOR_LEVELS.turbineDeck;
    }
    if (currentY <= 4.0) {
      return FLOOR_LEVELS.ground;
    }
  }

  // Basement foundation is a continuous walkable slab beneath containment.
  if (r <= CONTAINMENT.innerRadius - 1 && currentY < 10) {
    return FLOOR_LEVELS.basement;
  }

  // Exterior ground
  return FLOOR_LEVELS.ground;
}

/** Walkable XZ bounds for clamping the player */
export function clampPlayerPosition(x: number, z: number): [number, number] {
  // If player is in the Turbine Hall (strictly outside containment dome)
  if (x > 25.0) {
    const clampedX = Math.max(27.5, Math.min(126.0, x));
    const clampedZ = Math.max(-28.5, Math.min(4.5, z));
    return [clampedX, clampedZ];
  }

  const r = Math.sqrt(x * x + z * z);
  const maxR = CONTAINMENT.innerRadius - 0.3;
  if (r > maxR) {
    const scale = maxR / r;
    return [x * scale, z * scale];
  }
  return [x, z];
}

/**
 * Checks whether a given (x, z) coordinate is inside valid walkable floor space
 * at the current elevation, preventing falls into open voids, pits, or through walls.
 */
export function isPositionSafe(x: number, z: number, floorY: number): boolean {
  // 1. Turbine Hall Operating Deck (+12m) check (strictly outside containment dome)
  if (floorY >= 10.5 && floorY <= 14.0 && x >= 26.0) {
    // Outer perimeter walls of Turbine Hall
    if (x < 27.2 || x > 126.5 || z < -29.0 || z > 5.0) {
      return false;
    }
    // Solid turbine machinery collision along central shaft axis (Z ≈ -12, X from 34 to 116)
    const inShaftCylinder = x >= 34.0 && x <= 116.0 && z >= -15.0 && z <= -9.0;
    if (inShaftCylinder) {
      // Allow designated crosswalk platforms at x ≈ 47 and x ≈ 89
      const onCrosswalk = (x >= 45.5 && x <= 48.5) || (x >= 87.5 && x <= 90.5);
      if (!onCrosswalk) {
        return false; // Collides with massive turbine/generator casing!
      }
    }
    return true; // Walkway deck is safe
  }

  const r = Math.sqrt(x * x + z * z);
  const maxOuterR = CONTAINMENT.innerRadius - 0.3; // 19.7m

  // 2. Inside containment: Never allow passing through outer containment wall
  if (r > maxOuterR) return false;

  // 2. Staircase transition checks (sideways containment walls)
  // Stairwell 2 (main deck +15m -> upper deck +36m): along X at z≈19
  const onStair2 = x >= STAIRS.s2.xMin - 0.5 && x <= STAIRS.s2.xMax + 0.5 && z >= STAIRS.s2.zMin - 0.3 && z <= STAIRS.s2.zMax + 0.3;
  if (floorY > 16 && floorY < 35 && onStair2) {
    return z >= STAIRS.s2.zMin + 0.1 && z <= STAIRS.s2.zMax - 0.1;
  }

  // Stairwell 1 (basement -5m -> main deck +15m): along Z at x≈19
  const onStair1 = x >= STAIRS.s1.xMin - 0.3 && x <= STAIRS.s1.xMax + 0.3 && z >= STAIRS.s1.zMin - 0.5 && z <= STAIRS.s1.zMax + 0.5;
  if (floorY > -4 && floorY < 14 && onStair1) {
    return x >= STAIRS.s1.xMin + 0.1 && x <= STAIRS.s1.xMax - 0.1;
  }

  // Subterranean stair (core catcher -10m -> basement -5m): along Z at x≈0
  const onSubStair = Math.abs(x) <= 1.5 && z >= -12.0 && z <= -7.0;
  if (floorY > -9.5 && floorY < -5.5 && onSubStair) {
    return Math.abs(x) <= 1.35;
  }

  // 3. Level-specific floor boundary checks
  // Upper Deck (+36m): unrestricted 360° circular walkway around central crane opening
  if (floorY > 25) {
    // Inner yellow safety railing guard (r >= 8.35m) protects from falling into central opening.
    // Outer containment wall boundary (r <= 21.6m) keeps player safely on circular deck.
    const innerBarrierR = DECK.upperHoleRadius + 0.35; // 8.35m
    const outerBarrierR = CONTAINMENT.innerRadius - 0.4; // 21.6m
    return r >= innerBarrierR && r <= outerBarrierR;
  }

  // Main Deck (+15m): circular deck with central reactor pit guardrail
  if (floorY > 5 && floorY <= 25) {
    // Central reactor pit yellow railing barrier (r >= 5.5m)
    return r >= 5.5 && r <= maxOuterR;
  }

  // Basement DCS / Server Room (-5m): annular space around core catcher vault
  if (floorY >= -8 && floorY <= 5) {
    // Subterranean stair access corridor
    if (Math.abs(x) <= 1.5 && z >= -12.2 && z <= -6.8) {
      return true;
    }
    // Concrete bio-shield vault cylindrical wall barrier (r >= 7.3m)
    return r >= 7.3 && r <= maxOuterR;
  }

  // Core Catcher chamber (-10m): bio-shield vault interior
  if (floorY < -8) {
    // Corridor leading to subterranean stairs
    if (Math.abs(x) <= 1.5 && z >= -12.5 && z <= -7.0) {
      return true;
    }
    // Interior chamber radius
    return r <= 9.2;
  }

  return true;
}

/**
 * Resolves player movement with independent X/Z sliding collision physics,
 * so the character slides smoothly along invisible guardrails and barriers without sticking.
 */
export function resolvePlayerMovement(
  currentX: number,
  currentZ: number,
  dx: number,
  dz: number,
  floorY: number
): [number, number] {
  let nextX = currentX;
  let nextZ = currentZ;

  // Try movement along X axis
  if (isPositionSafe(nextX + dx, nextZ, floorY)) {
    nextX += dx;
  }

  // Try movement along Z axis
  if (isPositionSafe(nextX, nextZ + dz, floorY)) {
    nextZ += dz;
  }

  return [nextX, nextZ];
}
