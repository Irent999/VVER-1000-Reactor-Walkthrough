export const FLOOR_LEVELS = {
  coreCatcher: -10.0,
  ground: -5.5,
  basement: -5.0,
  turbineDeck: 12.0,
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

/**
 * Единые геометрические параметры и отметки высот для обоих контайнментов ВВЭР-1000
 * (Энергоблок №1 и Энергоблок №2):
 * - Единый нулевой уровень фундамента: baseY = -5.0м
 * - Фундаментная плита: отметка низа -5.5м (уровень планировки ground), отметка верха -5.0м, толщина 0.5м
 * - Высота цилиндрической части оболочки: wallHeight = 37.5м (от -5.0м до +32.5м)
 * - Центр полусферического купола: +32.5м, радиус 23.2м, верхняя точка купола (зенит) = +55.7м
 * - Полная высота сооружения от подошвы плиты: 61.2м
 * - Масштаб (scale) обоих энергоблоков: строго [1, 1, 1]
 */
export const CONTAINMENT_GEOMETRY = {
  outerRadius: 23.2,
  innerRadius: 22.0,
  wallThickness: 1.2,
  foundationRadius: 23.2 + 1.2, // 24.4m
  foundationThickness: 0.5,
  foundationBaseY: FLOOR_LEVELS.ground, // -5.5m
  foundationTopY: CONTAINMENT.baseY,     // -5.0m
  foundationCenterY: (CONTAINMENT.baseY + FLOOR_LEVELS.ground) / 2, // -5.25m
  wallBaseY: CONTAINMENT.baseY,          // -5.0m
  wallTopY: CONTAINMENT.wallTopY,        // +32.5m
  wallHeight: CONTAINMENT.wallTopY - CONTAINMENT.baseY, // 37.5m
  wallCenterY: (CONTAINMENT.baseY + CONTAINMENT.wallTopY) / 2, // +13.75m
  domeCenterY: CONTAINMENT.wallTopY,     // +32.5m
  domeRadius: 23.2,
  domeApexY: CONTAINMENT.wallTopY + 23.2, // +55.7m
  totalHeightFromGround: (CONTAINMENT.wallTopY + 23.2) - FLOOR_LEVELS.ground, // 61.2m
  buttressWidth: 0.9,
  buttressDepth: 0.7,
  buttressCount: 12,
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

export const YELLOW = '#FFCC00';
export const SAFETY_YELLOW = '#FFCC00';
export const ROSATOM_LIME_GREEN = '#8DB600';
export const CONCRETE_COLOR = '#E3E5E8'; // Свежий автоклавный светло-серый бетон НВАЭС
export const CONCRETE_WEATHERED = '#D0D4D9'; // Швы, фаски и цокольные плиты
export const STEEL_COLOR = '#B0B7BD'; // Нержавеющая сталь оборудования 1-го контура
export const DARK_STEEL_COLOR = '#3a3a40';
export const GREEN_METAL_COLOR = '#8DB600';
export const ARID_SOIL_COLOR = '#c4a87c';

export const ECCS_TANKS = {
  radius: 1.45,
  height: 7.2,
  capRadius: 1.45,
  centerRadius: 16.2,
  y: 18.6,
} as const;

export const HIGH_BAY_LIGHTS = {
  ringRadius: 18.0,
  y: 41.2,
  count: 8,
  color: '#fff4e6', // 4500K warm-white LED
  intensity: 32,
  distance: 45,
} as const;

export const RAIL_TRACKS = {
  gauge: 1.52, // Standard Russian broad gauge / equipment transport dolly track
  railWidth: 0.12,
  railHeight: 0.08,
  startX: -19,
  endX: 6,
  z: 0,
  deckY: 15.0,
} as const;

