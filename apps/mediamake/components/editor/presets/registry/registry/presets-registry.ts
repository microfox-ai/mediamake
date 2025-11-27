import { Preset } from '../../types';
import { waveformPreset } from '../full/waveform-full';
import { waveformPreset as waveformChildrenPreset } from '../general/waveform';
import { videoStitchPreset } from '../full/video-stitch';
import { subVerticalFloatPreset } from '../captions/sub-vertical-float';
import { subFastRapStaticPreset } from '../captions/sub-fast-rap-static';
import { plainSubtitlesPreset } from '../captions/subtitles';
import { baseScenePreset } from '../full/base-scene';
import { mediaTrackPreset } from '../general/media-track';
import { thinkerVisualsPreset } from '../complex_untested/thinker-visuals';
import { imageLoopPreset } from '../general/imageloop';
import { imageLoopSoundPreset } from '../complex_untested/imageloop-sound';
import { musicCardPreset } from '../complex_untested/music-card';
import { textOverlayPreset } from '../general/text-overlay';
import { beatstitchPreset } from '../general/beatstitch';
import { subMediaStitchPreset } from '../captions/sub-media-stitch';
import { subScrollingVerticalPreset } from '../captions/sub-scrolling-vertical';
import { subKineticMotionPreset } from '../captions/sub-kinetic-motion';
import { customThemeBackgroundPreset } from '../general/custom-theme-background';
import { lottieShowcasePreset } from '../general/lottie-showcase';
import { subKineticGradientFlowPreset } from '../captions/sub-kinetic-gradient-flow';
import { beatstitchWithCaptionsPreset } from '../complex_untested/beatstitchwithcaptions';
import { brollPreset } from '../captions/broll';
import { quotePresentPreset } from '../complex_untested/quote-present';
import { htmlBlockAtomPreset } from '../general/htmlBlockAtom';
import { textbasePreset } from '../demo/textbase';
import { genericOpacityEffectPreset } from '../internalEffects/generic-opacity-effect';
import { glowPulseTextEffectPreset } from '../internalEffects/glow-pulse-text-effect';
import { beatZoomEffectPreset } from '../internalEffects/beat-zoom-effect';
import { beatShakeEffectPreset } from '../internalEffects/beat-shake-effect';
import { beatExposureEffectPreset } from '../internalEffects/beat-exposure-effect';
import { wipeRevealPreset } from '../canvas_experimental/wipe-reveal';
import { contentAwarePreset } from '../canvas_experimental/content-aware-reveal';
import { glitchEffectPreset } from '../canvas_experimental/glitch-effect';
import { particleEffectPreset } from '../canvas_experimental/particle-effect';
import { hipHopScratchWipePreset } from '../private2/hip-hop-scratch-wipe';
import { beatZoomPreset } from '../complex_untested/beat-zoom';
import { beatShakePreset } from '../complex_untested/beat-shake';
import { beatExposurePreset } from '../complex_untested/beat-exposure';
import { matrixDigitalRainTransitionPreset } from '../generated/matrix-digital-rain-transition';

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
  hipHopScratchWipePreset,
  beatZoomPreset,
  beatShakePreset,
  beatExposurePreset,
  matrixDigitalRainTransitionPreset,
];

export const getPredefinedPresetById = (id: string): Preset | undefined => {
  return predefinedPresets.find(preset => preset.metadata.id === id);
};
