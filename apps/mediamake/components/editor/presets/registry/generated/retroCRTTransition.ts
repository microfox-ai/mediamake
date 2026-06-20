/**
 * Retro CRT Transition Internal Effect Preset
 *
 * SINGLE EFFECT (Returns Array of Effects):
 * This internal effect preset mimics old CRT monitor effects with pixel bleeding,
 * scan lines, chromatic aberration, and screen flicker. The transition starts with
 * heavy CRT distortion (curved edges, RGB separation, visible scanlines) and
 * gradually normalizes to clean display.
 *
 * Features:
 * - Curved edge distortion using perspective and scale transforms
 * - Chromatic aberration via RGB channel separation (simulated with text-shadow/box-shadow)
 * - Animated scanlines moving vertically
 * - Screen flicker effect with opacity variations
 * - Pixel bleeding simulation via blur
 * - Configurable intensity, speed, and offset parameters
 *
 * Returns an array of effect objects targeting specified component IDs:
 * 1. CRT distortion effect (filter blur/contrast + transform scale/perspective)
 * 2. Chromatic aberration effect (filter drop-shadow for RGB separation)
 * 3. Scanline effect (background gradient animation)
 * 4. Flicker effect (rapid opacity fluctuations)
 *
 * Use cases:
 * - Nostalgic retro-themed content transitions
 * - VHS/80s aesthetic overlays
 * - Glitch art effects
 * - Video game inspired visuals
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply the CRT effect to'),
  effectStart: z.number().default(0).describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z.number().default(2).describe('Duration of the CRT transition effect in seconds'),
  crtIntensity: z.number().min(0).max(1).default(1).describe('Strength of CRT distortion (0 = none, 1 = maximum distortion)'),
  scanlineSpeed: z.number().default(1).describe('Vertical movement rate of scanlines (multiplier, 1 = normal speed)'),
  flickerRate: z.number().default(0.1).describe('Flicker frequency (higher = more frequent flicker, 0 = no flicker)'),
  chromaticOffset: z.number().default(3).describe('RGB separation distance in pixels for chromatic aberration effect'),
  effectIdPrefix: z.string().optional().describe('Optional prefix for effect IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    effectDuration,
    crtIntensity,
    scanlineSpeed,
    flickerRate,
    chromaticOffset,
    effectIdPrefix,
  } = params;

  const idPrefix = effectIdPrefix || 'crt';

  // Helper function to calculate eased values
  const calculateCRTValues = () => {
    // Start values (heavy distortion)
    const startBlur = 2 * crtIntensity;
    const startContrast = 1.5;
    const startScale = 1.05 * (1 + crtIntensity * 0.05);
    const startPerspective = 800;
    const startRotateY = 2 * crtIntensity;

    // End values (clean display)
    const endBlur = 0;
    const endContrast = 1;
    const endScale = 1;
    const endRotateY = 0;

    return {
      startBlur,
      startContrast,
      startScale,
      startPerspective,
      startRotateY,
      endBlur,
      endContrast,
      endScale,
      endRotateY,
    };
  };

  const crtValues = calculateCRTValues();

  // Effect 1: CRT Distortion (blur + contrast + transform)
  const crtDistortionEffect = {
    id: `${idPrefix}-distortion`,
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // Blur progression
        { key: 'filter', val: `blur(${crtValues.startBlur}px) contrast(${crtValues.startContrast})`, prog: 0 },
        { key: 'filter', val: `blur(${crtValues.endBlur}px) contrast(${crtValues.endContrast})`, prog: 1 },
        // Transform progression (scale + perspective + rotateY)
        { key: 'transform', val: `scale(${crtValues.startScale}) perspective(${crtValues.startPerspective}px) rotateY(${crtValues.startRotateY}deg)`, prog: 0 },
        { key: 'transform', val: `scale(${crtValues.endScale}) perspective(${crtValues.startPerspective}px) rotateY(${crtValues.endRotateY}deg)`, prog: 0.5 },
        { key: 'transform', val: 'scale(1) rotateY(0deg)', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Effect 2: Chromatic Aberration (RGB separation via drop-shadow)
  const rgbOffset = chromaticOffset * crtIntensity;
  const chromaticAberrationEffect = {
    id: `${idPrefix}-chromatic`,
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // Start: heavy RGB separation
        { 
          key: 'filter', 
          val: `drop-shadow(${-rgbOffset}px 0 0 rgba(255,0,0,0.8)) drop-shadow(${rgbOffset}px 0 0 rgba(0,0,255,0.8))`, 
          prog: 0 
        },
        // Mid: reduced separation
        { 
          key: 'filter', 
          val: `drop-shadow(${-rgbOffset * 0.5}px 0 0 rgba(255,0,0,0.4)) drop-shadow(${rgbOffset * 0.5}px 0 0 rgba(0,0,255,0.4))`, 
          prog: 0.5 
        },
        // End: no separation
        { 
          key: 'filter', 
          val: 'drop-shadow(0 0 0 rgba(255,0,0,0)) drop-shadow(0 0 0 rgba(0,0,255,0))', 
          prog: 1 
        },
      ],
    } as GenericEffectData,
  };

  // Effect 3: Scanlines (animated background with gradient)
  // Simulated via backgroundPositionY animation
  const scanlineSpeedMultiplier = scanlineSpeed * 100;
  const scanlinesEffect = {
    id: `${idPrefix}-scanlines`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // Start: visible scanlines, rapid movement
        { 
          key: 'backgroundImage', 
          val: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)', 
          prog: 0 
        },
        { key: 'backgroundPositionY', val: '0px', prog: 0 },
        { key: 'backgroundPositionY', val: `${scanlineSpeedMultiplier}px`, prog: 0.5 },
        { key: 'backgroundPositionY', val: `${scanlineSpeedMultiplier * 2}px`, prog: 1 },
        // Fade out scanlines
        { key: 'backgroundImage', val: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)', prog: 0.5 },
        { key: 'backgroundImage', val: 'none', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Effect 4: Screen Flicker (rapid opacity variations)
  const flickerEffect = {
    id: `${idPrefix}-flicker`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // Multiple flicker keyframes
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.85, prog: 0.05 * flickerRate },
        { key: 'opacity', val: 1, prog: 0.1 * flickerRate },
        { key: 'opacity', val: 0.9, prog: 0.15 * flickerRate },
        { key: 'opacity', val: 1, prog: 0.2 * flickerRate },
        { key: 'opacity', val: 0.95, prog: 0.3 * flickerRate },
        { key: 'opacity', val: 1, prog: 0.4 * flickerRate },
        { key: 'opacity', val: 0.85, prog: 0.5 * flickerRate },
        { key: 'opacity', val: 1, prog: 0.6 * flickerRate },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Return all effects in container structure
  return {
    output: {
      childrenData: [
        {
          id: `${idPrefix}-effect-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [
            crtDistortionEffect,
            chromaticAberrationEffect,
            scanlinesEffect,
            flickerEffect,
          ],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'retroCRTTransition',
  title: 'Retro CRT Transition Effect',
  description: 'Internal effect preset that returns CRT monitor effect data including pixel bleeding simulation, animated scanlines, chromatic aberration (RGB separation), screen flicker, and curved edge distortion. Returns effect objects with generic type, provider mode, and animation ranges for filter blur/contrast, transform scale/perspective, opacity flicker, and backgroundPositionY scanline movement. Parameters control crtIntensity, scanlineSpeed, flickerRate, and chromaticOffset.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'crt', 'retro', 'chromatic', 'scanlines', 'flicker', 'transition', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    effectDuration: 2,
    crtIntensity: 1,
    scanlineSpeed: 1,
    flickerRate: 0.1,
    chromaticOffset: 3,
  },
};

export const retroCRTTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
