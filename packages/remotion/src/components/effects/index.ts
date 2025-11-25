// Import registerEffect function
import { registerEffect } from '../../core/registry';

// Import effect components for registration
import { BlurEffect, config as BlurEffectConfig } from './BlurEffect';
import { LoopEffect, config as LoopEffectConfig } from './Loop';
import { PanEffect, config as PanEffectConfig } from './Pan';
import { ZoomEffect, config as ZoomEffectConfig } from './Zoom';
import { ShakeEffect, config as ShakeEffectConfig } from './Shake';
import { StretchEffect, config as StretchEffectConfig } from './StretchEffect';
import {
  WaveformEffect,
  config as WaveformEffectConfig,
} from './WaveformEffect';
import {
  UniversalEffect,
  config as UniversalEffectConfig,
  UniversalEffectData,
} from './UniversalEffect';
import { CanvasWipeReveal } from './CanvasWipeReveal';
import { CanvasContentAwareReveal } from './CanvasContentAwareReveal';
import { CanvasGlitchEffect } from './CanvasGlitchEffect';
import { CanvasParticleEffect } from './CanvasParticleEffect';

// Register all effect components
registerEffect(BlurEffectConfig.displayName, BlurEffect, BlurEffectConfig);
registerEffect(LoopEffectConfig.displayName, LoopEffect, LoopEffectConfig);
registerEffect(PanEffectConfig.displayName, PanEffect, PanEffectConfig);
registerEffect(ZoomEffectConfig.displayName, ZoomEffect, ZoomEffectConfig);
// Register UniversalEffect as 'generic' for backwards compatibility
registerEffect('generic', UniversalEffect, UniversalEffectConfig);
registerEffect(ShakeEffectConfig.displayName, ShakeEffect, ShakeEffectConfig);
registerEffect(
  StretchEffectConfig.displayName,
  StretchEffect,
  StretchEffectConfig
);
registerEffect(
  WaveformEffectConfig.displayName,
  WaveformEffect,
  WaveformEffectConfig
);
registerEffect('CanvasWipeReveal', CanvasWipeReveal);
registerEffect('CanvasContentAwareReveal', CanvasContentAwareReveal);
registerEffect('CanvasParticleEffect', CanvasParticleEffect);
registerEffect('CanvasGlitchEffect', CanvasGlitchEffect);

// Export effect components
export { BlurEffect, config as BlurEffectConfig } from './BlurEffect';
export { LoopEffect, config as LoopEffectConfig } from './Loop';
export {
  PanEffect,
  config as PanEffectConfig,
  type PanEffectData,
} from './Pan';
export {
  ZoomEffect,
  config as ZoomEffectConfig,
  type ZoomEffectData,
} from './Zoom';

// Export Shake Effect components
export {
  ShakeEffect,
  config as ShakeEffectConfig,
  type ShakeEffectData,
} from './Shake';

// Export Stretch Effect components
export {
  StretchEffect,
  config as StretchEffectConfig,
  type StretchEffectData,
} from './StretchEffect';

// Export Waveform Effect components
export {
  WaveformEffect,
  config as WaveformEffectConfig,
  type WaveformEffectData,
} from './WaveformEffect';

// Export Universal Effect components (formerly Generic)
export {
  UniversalEffect,
  UniversalEffectProvider,
  useUniversalEffect,
  useUniversalEffectOptional,
  useHasUniversalEffectProvider,
  useAnimatedStyles,
  type UniversalEffectData,
  type AnimationRange,
} from './UniversalEffect';

type GenericEffectData = UniversalEffectData;

export { GenericEffectData };

// Export animation presets
export * from './GenericPresets';
export { CanvasWipeReveal } from './CanvasWipeReveal';
export { CanvasContentAwareReveal } from './CanvasContentAwareReveal';
export { CanvasParticleEffect } from './CanvasParticleEffect';
export { CanvasGlitchEffect } from './CanvasGlitchEffect';
