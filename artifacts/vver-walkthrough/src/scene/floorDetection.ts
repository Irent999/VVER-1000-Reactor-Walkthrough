import { FLOOR_LEVELS, DECK, STAIRS, CONTAINMENT } from './constants';

/**
 * Returns the floor surface height at a given (x, z) position,
 * considering the player's current Y to disambiguate overlapping regions.
 */
export function getFloorHeightAt(x: number, z: number, currentY: number): number {
  const r = Math.sqrt(x * x + z * z);

  // Stairwell 2: main deck -> upper deck (along X at z≈19)
  // Player must be roughly in the main-to-upper height band
  if (x >= STAIRS.s2.xMin && x <= STAIRS.s2.xMax && z >= STAIRS.s2.zMin && z <= STAIRS.s2.zMax) {
    const t = (x - STAIRS.s2.xMin) / (STAIRS.s2.xMax - STAIRS.s2.xMin);
    const stairY = STAIRS.s2.yStart + t * (STAIRS.s2.yEnd - STAIRS.s2.yStart);
    if (currentY > 10 && currentY < 42) return stairY;
  }

  // Stairwell 1: basement -> main deck (along Z at x≈19)
  if (x >= STAIRS.s1.xMin && x <= STAIRS.s1.xMax && z >= STAIRS.s1.zMin && z <= STAIRS.s1.zMax) {
    const t = (z - STAIRS.s1.zMin) / (STAIRS.s1.zMax - STAIRS.s1.zMin);
    const stairY = STAIRS.s1.yStart + t * (STAIRS.s1.yEnd - STAIRS.s1.yStart);
    if (currentY > -10 && currentY < 22) return stairY;
  }

  // Upper deck remains walkable around the refueling cavity; the opening is
  // guarded and represented as a solid teaching platform in this walkthrough.
  if (r <= DECK.outerRadius && currentY > 25) {
    return DECK.upperY;
  }

  // Main deck floor is continuous for safe educational navigation.
  if (r <= DECK.outerRadius && currentY > 5 && currentY < 30) {
    return DECK.mainY;
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
  const r = Math.sqrt(x * x + z * z);
  const maxR = CONTAINMENT.innerRadius - 1;
  if (r > maxR) {
    const scale = maxR / r;
    return [x * scale, z * scale];
  }
  return [x, z];
}
