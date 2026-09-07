import { Preset } from '../../types';
import { contentAwarePreset } from '../canvas_experimental/content-aware-reveal';
import { glitchEffectPreset } from '../canvas_experimental/glitch-effect';
import { particleEffectPreset } from '../canvas_experimental/particle-effect';
import { particleMorphRevealPreset } from '../canvas_experimental/particle-morph-reveal';
import { wipeRevealPreset } from '../canvas_experimental/wipe-reveal';
import { brollPreset } from '../captions/broll';
import { subFastRapStaticPreset } from '../captions/sub-fast-rap-static';
import { subKineticGradientFlowPreset } from '../captions/sub-kinetic-gradient-flow';
import { subKineticMotionPreset } from '../captions/sub-kinetic-motion';
import { subMediaStitchPreset } from '../captions/sub-media-stitch';
import { subScrollingVerticalPreset } from '../captions/sub-scrolling-vertical';
import { subVerticalFloatPreset } from '../captions/sub-vertical-float';
import { plainSubtitlesPreset } from '../captions/subtitles';
import { beatExposurePreset } from '../complex_untested/beat-exposure';
import { beatShakePreset } from '../complex_untested/beat-shake';
import { beatZoomPreset } from '../complex_untested/beat-zoom';
import { imageLoopSoundPreset } from '../complex_untested/imageloop-sound';
import { musicCardPreset } from '../complex_untested/music-card';
import { quotePresentPreset } from '../complex_untested/quote-present';
import { thinkerVisualsPreset } from '../complex_untested/thinker-visuals';
import { textbasePreset } from '../demo/textbase';
import { baseScenePreset } from '../full/base-scene';
import { videoStitchPreset } from '../full/video-stitch';
import { waveformPreset } from '../full/waveform-full';
import { beatstitchPreset } from '../general/beatstitch';
import { customThemeBackgroundPreset } from '../general/custom-theme-background';
import { htmlBlockAtomPreset } from '../general/htmlBlockAtom';
import { imageLoopPreset } from '../general/imageloop';
import { lottieShowcasePreset } from '../general/lottie-showcase';
import { mediaTrackPreset } from '../general/media-track';
import { textOverlayPreset } from '../general/text-overlay';
import { waveformPreset as waveformChildrenPreset } from '../general/waveform';
import { beatExposureEffectPreset } from '../internalEffects/beat-exposure-effect';
import { beatShakeEffectPreset } from '../internalEffects/beat-shake-effect';
import { beatZoomEffectPreset } from '../internalEffects/beat-zoom-effect';
import { genericOpacityEffectPreset } from '../internalEffects/generic-opacity-effect';
import { glowPulseTextEffectPreset } from '../internalEffects/glow-pulse-text-effect';
import { hipHopScratchWipePreset } from '../private2/hip-hop-scratch-wipe';

export const predefinedPresets: Preset[] = [
  baseScenePreset,
  customThemeBackgroundPreset,
  mediaTrackPreset,
  waveformPreset,
  waveformChildrenPreset,
  videoStitchPreset,
  subVerticalFloatPreset,
  plainSubtitlesPreset,
  thinkerVisualsPreset,
  imageLoopPreset,
  imageLoopSoundPreset,
  musicCardPreset,
  textOverlayPreset,
  beatstitchPreset,
  subFastRapStaticPreset,
  subMediaStitchPreset,
  subScrollingVerticalPreset,
  subKineticMotionPreset,
  lottieShowcasePreset,
  subKineticGradientFlowPreset,
  brollPreset,
  quotePresentPreset,
  htmlBlockAtomPreset,
  textbasePreset,
  genericOpacityEffectPreset,
  glowPulseTextEffectPreset,
  beatZoomEffectPreset,
  beatShakeEffectPreset,
  beatExposureEffectPreset,
  wipeRevealPreset,
  contentAwarePreset,
  glitchEffectPreset,
  particleEffectPreset,
  particleMorphRevealPreset,
  hipHopScratchWipePreset,
  beatZoomPreset,
  beatShakePreset,
  beatExposurePreset,
];

export const getPredefinedPresetById = (id: string): Preset | undefined => {
  return predefinedPresets.find(preset => preset.metadata.id === id);
};
