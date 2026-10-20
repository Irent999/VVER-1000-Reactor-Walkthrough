/**
 * Реэкспорт и обратная совместимость для существующего модуля симуляции РИТМ-200Н.
 * Основная логика вынесена в единый масштабируемый модуль @/scene/reactorStateManager
 */

export {
  reactorStateManager,
  ritmSimulation,
  soundFx,
  MCRCanvasMonitorRenderer,
  type ReactorType,
  type VVER1000PhysicsState,
  type RITM200NPhysicsState,
  type ReactorPhysicsState,
  type ReactorActionType,
  type ActionPayload,
} from './reactorStateManager';

export type MCRAction =
  | 'TOGGLE_PUMPS'
  | 'CRDM_STEP_UP'
  | 'CRDM_STEP_DOWN'
  | 'TOGGLE_STEAM_GEN'
  | 'SCRAM_TRIP'
  | 'RESET_SCRAM'
  | 'TOGGLE_SOUND';
