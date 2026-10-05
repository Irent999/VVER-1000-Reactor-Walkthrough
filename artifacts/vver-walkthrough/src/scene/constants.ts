export const FLOOR_LEVELS = {
  ground: -5.5,
  basement: -5.0,
  main: 15.0,
  upper: 36.0,
} as const;

export const EYE_HEIGHT = 1.6;

export const CONTAINMENT = {
  outerRadius: 23.2,
  wallThickness: 1.2,
  innerRadius: 22.0,
  baseY: -5.0,
  wallTopY: 32.5,
  domeTopY: 55.0,
  totalHeight: 60.0,
} as const;

export const CORE_CATCHER = {
  bottomY: -10.0,
  topY: -6.0,
  topRadius: 5.5,
  bottomRadius: 2.5,
  openingRadius: 6.5,
  shieldRadius: 7.5,
  sourceRadius: 8.3,
} as const;

export const RPV = {
  radius: 2.25,
  diameter: 4.5,
  bodyHeight: 12.0,
  bodyBottomY: 4.0,
  bodyTopY: 16.0,
  flangeY: 16.5,
  headTopY: 19.0,
  cavityRadius: 5.5,
} as const;

export const STEAM_GEN = {
  length: 14.0,
  radius: 2.0,
  diameter: 4.0,
  centerRadius: 12.0,
  centerY: 17.5,
  saddleHeight: 1.5,
} as const;

export const MCP = {
  radius: 0.8,
  height: 3.5,
  centerRadius: 8.0,
  centerY: 17.0,
} as const;

export const DECK = {
  mainY: 15.0,
  upperY: 36.0,
  outerRadius: 21.0,
  mainHoleRadius: 6.0,
  upperHoleRadius: 8.0,
  slabThickness: 0.5,
} as const;

export const STAIRS = {
  // Stairwell 1: basement (-5) to main deck (+15), along Z at x≈19
  s1: { xMin: 17, xMax: 21, zMin: -8, zMax: 8, yStart: -5.0, yEnd: 15.0 },
  // Stairwell 2: main deck (+15) to upper (+36), along X at z≈19
  s2: { xMin: -8, xMax: 8, zMin: 17, zMax: 21, yStart: 15.0, yEnd: 36.0 },
} as const;

export const POLAR_CRANE = {
  railRadius: 18.0,
  y: 42.0,
  capacity: 320,
} as const;

export const YELLOW = '#FFD700';
export const CONCRETE_COLOR = '#b8b5ad';
export const STEEL_COLOR = '#8d99ae';
export const DARK_STEEL_COLOR = '#3a3a40';
export const GREEN_METAL_COLOR = '#2d6a4f';
export const ARID_SOIL_COLOR = '#c4a87c';
