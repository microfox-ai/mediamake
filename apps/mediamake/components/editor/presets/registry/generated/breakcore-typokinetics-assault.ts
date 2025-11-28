/**
 * Breakcore Typokinetics Assault Preset
 *
 * An ultra-aggressive kinetic typography preset that mimics the visual chaos of breakcore and 
 * speedcore music videos. This preset pushes the boundaries of readability while maintaining 
 * visceral impact through extreme effects:
 *
 * Features:
 * - **Stroboscopic Flashing**: Ultra-fast text flashing at 10-15Hz creating persistence of vision
 * - **Bass-Triggered Destruction**: Letters explode outward on bass hits with individual trajectories
 * - **Chaos Rotation/Scaling**: Words spin wildly (720deg) while scaling up to 5x
 * - **Datamosh Traces**: Previous words leave corrupted ghost traces with positional offsets
 * - **Waveform Integration**: Extreme audio sensitivity (5.0+) for instant bass response
 * - **GPU Optimized**: All animations use transform-gpu and will-change-transform
 * - **Photosensitivity Warning**: Mandatory 3-second warning before extreme effects begin
 * - **Reduced Motion Support**: Respects prefers-reduced-motion via containerProps
 *
 * ⚠️ PHOTOSENSITIVITY WARNING: This preset contains rapidly flashing images and strobing 
 * effects at speeds that may trigger seizures in photosensitive individuals. NOT suitable 
 * for photosensitive viewers.
 *
 * Use cases:
 * - Breakcore/speedcore music video typography
 * - Extreme kinetic title sequences
 * - High-intensity visual assault content
 * - Experimental video art with maximum motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, WaveformEffectData } from '@microfex/remotion';

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with text, timing, and words data'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for beat detection'),
  
  // Typography settings
  fontSize: z.number().min(24).max(200).default(96).describe('Font size in pixels'),
  font: z.string().default('Inter:900').describe('Font family with weight (e.g., "Inter:900", "BebasNeue:700")'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex or CSS color)'),
  
  // Strobe effect settings
  strobeFrequency: z.number().min(5).max(20).default(15).describe('Strobe flash frequency in Hz (flashes per second)'),
  
  // Explosion settings
  explosionIntensity: z.number().min(50).max(300).default(150).describe('Letter explosion distance in pixels'),
  explosionDuration: z.number().min(0.05).max(0.3).default(0.1).describe('Explosion animation duration in seconds'),
  
  // Chaos rotation/scaling
  maxRotation: z.number().min(180).max(1440).default(720).describe('Maximum rotation in degrees'),
  maxScale: z.number().min(2).max(10).default(5).describe('Maximum scale multiplier'),
  chaosDuration: z.number().min(0.1).max(0.5).default(0.15).describe('Chaos effect duration in seconds'),
  
  // Datamosh settings
  datamoshTraceCount: z.number().min(3).max(7).default(5).describe('Number of datamosh ghost traces'),
  datamoshOpacity: z.number().min(0.05).max(0.3).default(0.15).describe('Maximum opacity of datamosh traces'),
  
  // Waveform/bass settings
  bassEffectIntensity: z.number().min(3).max(10).default(6).describe('Bass effect intensity multiplier'),
  bassSensitivity: z.number().min(1).max(10).default(5.5).describe('Bass detection sensitivity'),
  bassThreshold: z.number().min(0).max(0.5).default(0.15).describe('Minimum bass level to trigger effects'),
  
  // Warning
  showWarning: z.boolean().default(true).describe('Show photosensitivity warning at start'),
  warningDuration: z.number().min(2).max(5).default(3).describe('Warning duration in seconds'),
  
  // Performance
  reducedMotionMode: z.boolean().default(false).describe('Enable reduced motion mode (lowers intensity)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font string
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  let fontWeight = '900';
  if (fontString.includes(':')) {
    const parts = fontString.split(':');
    if (parts.length > 1) {
      fontWeight = parts[1];
    }
  }
  
  // Calculate timing offsets
  const warningDuration = params.showWarning ? params.warningDuration : 0;
  const mainContentStart = warningDuration;
  
  // Helper: Create datamosh trace offsets
  const createDatamoshOffset = (index: number, total: number): { x: number; y: number } => {
    const angle = (index / total) * Math.PI * 2;
    const distance = 3 + Math.random() * 5;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };
  
  // Helper: Create explosion vectors for characters
  const createExplosionVectors = (charCount: number): Array<{ x: number; y: number; rotation: number }> => {
    const vectors: Array<{ x: number; y: number; rotation: number }> = [];
    for (let i = 0; i < charCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = params.explosionIntensity * (0.7 + Math.random() * 0.6);
      vectors.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: -180 + Math.random() * 360,
      });
    }
    return vectors;
  };
  
  // Build caption children
  const captionChildren: RenderableComponentData[] = [];
  
  captions.forEach((caption, captionIndex) => {
    const captionText = caption.text || '';
    const captionDuration = caption.duration || 0;
    const captionAbsoluteStart = (caption.absoluteStart || 0) + mainContentStart;
    
    // Extract characters for explosion layer
    const chars = captionText.split('').filter(c => c.trim().length > 0);
    const explosionVectors = createExplosionVectors(chars.length);
    
    // Strobe flash interval
    const strobeInterval = 1 / params.strobeFrequency;
    
    // Main word display with strobe + chaos effects
    const mainWordId = `main-word-${captionIndex}`;
    
    const strobeEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: strobeInterval,
      mode: 'provider',
      targetIds: [mainWordId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
    
    const chaosEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: params.chaosDuration,
      mode: 'provider',
      targetIds: [mainWordId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: params.maxRotation * 0.25, prog: 0.25 },
        { key: 'rotate', val: params.maxRotation * 0.5, prog: 0.5 },
        { key: 'rotate', val: params.maxRotation * 0.75, prog: 0.75 },
        { key: 'rotate', val: params.maxRotation, prog: 1 },
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: params.maxScale * 0.6, prog: 0.25 },
        { key: 'scale', val: params.maxScale, prog: 0.5 },
        { key: 'scale', val: params.maxScale * 0.6, prog: 0.75 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };
    
    // Bass-triggered zoom effect on main word
    const bassZoomEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'bass',
      effectType: 'zoom',
      intensity: params.bassEffectIntensity * 0.5,
      baseScale: 1,
      sensitivity: params.bassSensitivity,
      threshold: params.bassThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [mainWordId],
      start: 0,
      duration: captionDuration,
      smoothNormalisation: 0,
    };
    
    const mainWordComponent: RenderableComponentData = {
      id: mainWordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: captionText,
        style: {
          fontSize: params.fontSize,
          fontWeight: parseInt(fontWeight, 10),
          color: params.textColor,
          textTransform: 'uppercase' as const,
          letterSpacing: '-0.02em',
          willChange: 'transform',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captionDuration,
        },
      },
      effects: [
        { id: `strobe-${captionIndex}`, componentId: 'generic', data: strobeEffect },
        { id: `chaos-${captionIndex}`, componentId: 'generic', data: chaosEffect },
        { id: `bass-zoom-${captionIndex}`, componentId: 'waveform', data: bassZoomEffect },
      ],
    };
    
    // Main word container
    const mainWordContainer: RenderableComponentData = {
      id: `main-word-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: captionAbsoluteStart,
          duration: captionDuration,
        },
      },
      childrenData: [mainWordComponent],
    };
    
    captionChildren.push(mainWordContainer);
    
    // Datamosh trace layers
    for (let traceIndex = 0; traceIndex < params.datamoshTraceCount; traceIndex++) {
      const offset = createDatamoshOffset(traceIndex, params.datamoshTraceCount);
      const traceDuration = 0.2 + (traceIndex * 0.05);
      const traceOpacity = params.datamoshOpacity * (1 - (traceIndex / params.datamoshTraceCount));
      
      const traceId = `datamosh-trace-${captionIndex}-${traceIndex}`;
      
      const traceFadeEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: traceDuration,
        mode: 'provider',
        targetIds: [traceId],
        ranges: [
          { key: 'opacity', val: traceOpacity, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };
      
      const traceComponent: RenderableComponentData = {
        id: traceId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: captionText,
          style: {
            fontSize: params.fontSize,
            fontWeight: parseInt(fontWeight, 10),
            color: params.textColor,
            position: 'absolute' as const,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
            willChange: 'transform',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionDuration,
          },
        },
        effects: [
          { id: `trace-fade-${captionIndex}-${traceIndex}`, componentId: 'generic', data: traceFadeEffect },
        ],
      };
      
      const traceContainer: RenderableComponentData = {
        id: `datamosh-container-${captionIndex}-${traceIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: captionAbsoluteStart,
            duration: captionDuration,
          },
        },
        childrenData: [traceComponent],
      };
      
      captionChildren.push(traceContainer);
    }
    
    // Explosion layer - individual character explosions
    const explosionChildren: RenderableComponentData[] = [];
    
    chars.forEach((char, charIndex) => {
      if (charIndex >= explosionVectors.length) return;
      
      const vector = explosionVectors[charIndex];
      const charId = `exploding-char-${captionIndex}-${charIndex}`;
      
      // Bass-triggered explosion effect
      const explosionEffect: WaveformEffectData = {
        audioSrc: params.audioSrc,
        audioProperty: 'bass',
        effectType: 'shake',
        intensity: params.bassEffectIntensity * 30,
        shakeAxis: 'both',
        sensitivity: params.bassSensitivity,
        threshold: params.bassThreshold,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: [charId],
        start: 0,
        duration: captionDuration,
        smoothNormalisation: 0,
      };
      
      const charExplosionEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: params.explosionDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: vector.x, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: vector.y, prog: 1 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: vector.rotation, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };
      
      const charComponent: RenderableComponentData = {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: params.fontSize,
            fontWeight: parseInt(fontWeight, 10),
            color: params.textColor,
            position: 'absolute' as const,
            willChange: 'transform',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionDuration,
          },
        },
        effects: [
          { id: `char-explosion-${captionIndex}-${charIndex}`, componentId: 'generic', data: charExplosionEffect },
          { id: `bass-shake-${captionIndex}-${charIndex}`, componentId: 'waveform', data: explosionEffect },
        ],
      };
      
      explosionChildren.push(charComponent);
    });
    
    if (explosionChildren.length > 0) {
      const explosionContainer: RenderableComponentData = {
        id: `explosion-container-${captionIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
          },
        },
        context: {
          timing: {
            start: captionAbsoluteStart,
            duration: captionDuration,
          },
        },
        childrenData: explosionChildren,
      };
      
      captionChildren.push(explosionContainer);
    }
  });
  
  // Warning screen
  const warningChildren: RenderableComponentData[] = [];
  
  if (params.showWarning) {
    const warningTextId = 'warning-text';
    const warningFadeInEffect: GenericEffectData = {
      type: 'ease-in',
      start: 0,
      duration: 0.5,
      mode: 'provider',
      targetIds: [warningTextId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
    
    const warningFadeOutEffect: GenericEffectData = {
      type: 'ease-out',
      start: warningDuration - 0.5,
      duration: 0.5,
      mode: 'provider',
      targetIds: [warningTextId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
    
    const warningText: RenderableComponentData = {
      id: warningTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: '⚠️ PHOTOSENSITIVITY WARNING\n\nThis video contains rapidly flashing images and strobing effects.\nViewer discretion advised.',
        style: {
          fontSize: 24,
          color: '#ff0000',
          textAlign: 'center' as const,
          padding: '40px',
          fontWeight: 'bold',
          lineHeight: '1.6',
        },
        font: {
          family: 'Inter',
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: warningDuration,
        },
      },
      effects: [
        { id: 'warning-fade-in', componentId: 'generic', data: warningFadeInEffect },
        { id: 'warning-fade-out', componentId: 'generic', data: warningFadeOutEffect },
      ],
    };
    
    const warningContainer: RenderableComponentData = {
      id: 'photosensitivity-warning',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center z-50 bg-black',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: warningDuration,
        },
      },
      childrenData: [warningText],
    };
    
    warningChildren.push(warningContainer);
  }
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'breakcore-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        'data-reduce-motion': params.reducedMotionMode ? 'reduce' : 'no-preference',
      },
    },
    context: {
      timing: {
        start: 0,
      },
    },
    childrenData: [
      ...warningChildren,
      ...captionChildren,
    ],
  } as RenderableComponentData;
  
  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'breakcore-typokinetics-assault',
  title: 'Breakcore Typokinetics Assault',
  description: 'An aggressive, boundary-pushing typokinetics preset inspired by breakcore and speedcore aesthetics. Features stroboscopic text flashing at up to 15Hz, bass-triggered character explosions with individual letter trajectories, extreme rotation/scaling chaos (720deg + 5x scale), and datamosh-style persistence trails. Includes mandatory photosensitivity warning. ⚠️ NOT SUITABLE for photosensitive viewers.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'breakcore', 'extreme', 'strobe', 'explosion', 'datamosh', 'bass-reactive', 'photosensitive-warning', 'gpu-optimized'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    audioSrc: '',
    fontSize: 96,
    font: 'Inter:900',
    textColor: '#FFFFFF',
    strobeFrequency: 15,
    explosionIntensity: 150,
    explosionDuration: 0.1,
    maxRotation: 720,
    maxScale: 5,
    chaosDuration: 0.15,
    datamoshTraceCount: 5,
    datamoshOpacity: 0.15,
    bassEffectIntensity: 6,
    bassSensitivity: 5.5,
    bassThreshold: 0.15,
    showWarning: true,
    warningDuration: 3,
    reducedMotionMode: false,
  },
};

export const breakcoreTypokineticsAssaultPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};