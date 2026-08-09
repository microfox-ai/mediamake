// Core exports
export * from './core';

// Canvas pipeline system (registers CanvasPipeline atom + CanvasFx effect + op stdlib)
export * from './canvas';

// Component exports
export * from './components';

// Hook exports
export * from './hooks';

// Utility exports
export * from './utils';

// Template exports
export * from './templates';

// Main composition component
export {
  Composition,
  type InputCompositionProps,
  CompositionLayout,
  calculateCompositionLayoutMetadata,
  Player,
} from './components/Composition';
