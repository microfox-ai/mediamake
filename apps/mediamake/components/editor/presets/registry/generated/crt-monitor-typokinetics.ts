/**
 * CRT Monitor Stack Typokinetics Preset
 * 
 * Simulates text being displayed on multiple stacked CRT monitors in a retro TV studio control room.
 * Each word appears on a different 'monitor' with slightly different characteristics including:
 * - Varying levels of color adjustment, sharpness, and sync issues
 * - Chrome effect looking like it was keyed through analog equipment with soft edges and color bleeding
 * - Vertical sync roll where entire text occasionally scrolls vertically as if losing sync signal
 * - RGB phosphor dots visible at close range creating a pointillistic effect
 * - Scan lines with interference patterns creating moiré effects when overlapping
 * - Analog color bars that briefly flash before text appears
 * - Bad signal moments where text turns to colored static
 * - Overall composition feels like a live broadcast switching between multiple sources
 * 
 * Technical Features:
 * - Grid layout for multi-monitor display (3 columns)
 * - Variable monitor effects with random CSS filter combinations
 * - Soft key edges using blur and text-shadow
 * - Vertical sync roll animation triggered periodically
 * - RGB phosphor dots using radial gradients with multiply blend mode
 * - Moiré patterns from overlapping linear-gradients
 * - Color bars animated from 1 to 0 opacity during entrance
 * - Static noise overlay triggered randomly
 * - Chrome variations per monitor with different gradient parameters
 * - Staggered reveal timing per monitor
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter Schema
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing data'),
  fontSize: z.number().min(24).max(120).default(48).describe('Base font size for text in pixels'),
  fontFamily: z.string().default('Orbitron').describe('Font family for text (e.g., "Orbitron", "VT323", "Share Tech Mono")'),
  textColor: z.string().default('#ffffff').describe('Base text color for monitors'),
  chromaIntensity: z.number().min(0).max(2).default(1).describe('Intensity of chromatic aberration and color bleeding (0-2)'),
  scanlineIntensity: z.number().min(0).max(1).default(0.15).describe('Intensity of scan line effect (0-1)'),
  phosphorIntensity: z.number().min(0).max(1).default(0.3).describe('Intensity of RGB phosphor dot effect (0-1)'),
  vsyncFrequency: z.number().min(0).max(10).default(3).describe('Number of vertical sync rolls per monitor during duration'),
  staticFrequency: z.number().min(0).max(10).default(2).describe('Number of static glitch moments per monitor'),
  colorBarDuration: z.number().min(0).max(2).default(0.5).describe('Duration of color bars display at start (seconds)'),
  monitorVariation: z.number().min(0).max(1).default(0.3).describe('Amount of variation between monitors (0-1)'),
});

// Preset Execution Function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    fontFamily,
    textColor,
    chromaIntensity,
    scanlineIntensity,
    phosphorIntensity,
    vsyncFrequency,
    staticFrequency,
    colorBarDuration,
    monitorVariation,
  } = params;

  // Helper: Generate random variation for monitor effects
  const getMonitorVariation = (base: number, variance: number): number => {
    return base + (Math.random() - 0.5) * variance * 2;
  };

  // Helper: Generate random CSS filter for monitor
  const generateMonitorFilter = (): string => {
    const contrast = getMonitorVariation(110, monitorVariation * 20);
    const brightness = getMonitorVariation(95, monitorVariation * 10);
    const saturate = getMonitorVariation(120, monitorVariation * 30);
    return `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturate}%)`;
  };

  // Helper: Generate chrome gradient with variation
  const generateChromeGradient = (index: number): string => {
    const hueShift = (index * 60 + Math.random() * 30) % 360;
    return `linear-gradient(135deg, 
      hsl(${hueShift}, 100%, 50%) 0%, 
      hsl(${(hueShift + 120) % 360}, 100%, 50%) 50%, 
      hsl(${(hueShift + 240) % 360}, 100%, 50%) 100%)`;
  };

  // Process captions to extract words
  const allWords: Array<{ text: string; caption: any; word: any; captionIndex: number }> = [];
  
  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    if (caption.words && caption.words.length > 0) {
      caption.words.forEach(word => {
        allWords.push({
          text: word.text,
          caption,
          word,
          captionIndex,
        });
      });
    }
  });

  // Create monitor components for each word
  const monitorComponents = allWords.map((wordData, index) => {
    const { text, caption, word } = wordData;
    const monitorId = `monitor-${index}`;
    const textId = `text-${index}`;
    
    // Calculate timing - use caption's absoluteStart and word's relative start
    const monitorStart = caption.absoluteStart + word.start;
    const monitorDuration = word.duration;
    
    // Generate random filter for this monitor
    const monitorFilter = generateMonitorFilter();
    const chromeGradient = generateChromeGradient(index);
    
    // Calculate vsync roll timings
    const vsyncRolls = [];
    if (vsyncFrequency > 0) {
      const interval = monitorDuration / vsyncFrequency;
      for (let i = 0; i < vsyncFrequency; i++) {
        const rollStart = interval * i;
        vsyncRolls.push(rollStart);
      }
    }
    
    // Calculate static glitch timings
    const staticGlitches = [];
    if (staticFrequency > 0) {
      const interval = monitorDuration / staticFrequency;
      for (let i = 0; i < staticFrequency; i++) {
        const glitchStart = interval * i + Math.random() * interval * 0.5;
        staticGlitches.push(glitchStart);
      }
    }

    // Create color bars overlay
    const colorBarsOverlay = {
      id: `color-bars-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 10; background: linear-gradient(to right, #ffffff 0%, #ffffff 14.28%, #ffff00 14.28%, #ffff00 28.56%, #00ffff 28.56%, #00ffff 42.84%, #00ff00 42.84%, #00ff00 57.12%, #ff00ff 57.12%, #ff00ff 71.4%, #ff0000 71.4%, #ff0000 85.68%, #0000ff 85.68%, #0000ff 100%); pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {},
      },
      context: {
        timing: {
          start: 0,
          duration: monitorDuration,
        },
      },
      effects: [
        {
          id: `color-bars-fade-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: colorBarDuration,
            mode: 'provider',
            targetIds: [`color-bars-${index}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Create phosphor dots layer
    const phosphorDotsLayer = {
      id: `phosphor-dots-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 20; background-image: radial-gradient(circle, rgba(255,0,0,${phosphorIntensity}) 1px, transparent 1px), radial-gradient(circle, rgba(0,255,0,${phosphorIntensity}) 1px, transparent 1px), radial-gradient(circle, rgba(0,0,255,${phosphorIntensity}) 1px, transparent 1px); background-size: 3px 3px, 3px 3px, 3px 3px; background-position: 0 0, 1px 0, 2px 0; mix-blend-mode: multiply; pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {},
      },
      context: {
        timing: {
          start: 0,
          duration: monitorDuration,
        },
      },
    };

    // Create scanlines layer with moiré effect
    const scanlinesLayer = {
      id: `scanlines-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 30; background: repeating-linear-gradient(0deg, rgba(0,0,0,${scanlineIntensity}) 0px, rgba(0,0,0,${scanlineIntensity}) 1px, transparent 1px, transparent 2px), repeating-linear-gradient(2deg, rgba(0,0,0,${scanlineIntensity * 0.7}) 0px, rgba(0,0,0,${scanlineIntensity * 0.7}) 1px, transparent 1px, transparent 2px); pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {},
      },
      context: {
        timing: {
          start: 0,
          duration: monitorDuration,
        },
      },
    };

    // Create text content with chrome effect
    const textContent = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          color: textColor,
          textShadow: `0 0 10px rgba(255,255,255,${0.5 * chromaIntensity}), 
                       ${2 * chromaIntensity}px ${2 * chromaIntensity}px 4px rgba(0,255,255,${0.3 * chromaIntensity}), 
                       ${-2 * chromaIntensity}px ${-2 * chromaIntensity}px 4px rgba(255,0,255,${0.3 * chromaIntensity})`,
          filter: `blur(${0.5 * chromaIntensity}px) ${monitorFilter}`,
          zIndex: 40,
        },
        gradient: chromeGradient,
        font: {
          family: fontFamily,
          weights: ['700', '900'],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: colorBarDuration,
          duration: monitorDuration - colorBarDuration,
        },
      },
    };

    // Create static glitch overlay with effects
    const staticEffects = staticGlitches.map((glitchStart, glitchIndex) => ({
      id: `static-effect-${index}-${glitchIndex}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: glitchStart,
        duration: 0.1,
        mode: 'provider',
        targetIds: [`static-glitch-${index}`],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    }));

    const staticGlitchOverlay = {
      id: `static-glitch-${index}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 50; background-image: repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px), repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px); opacity: 0; pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {},
      },
      context: {
        timing: {
          start: 0,
          duration: monitorDuration,
        },
      },
      effects: staticEffects,
    };

    // Create vsync roll effects
    const vsyncRollEffects = vsyncRolls.map((rollStart, rollIndex) => ({
      id: `vsync-roll-effect-${index}-${rollIndex}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: rollStart,
        duration: 0.5,
        mode: 'provider',
        targetIds: [monitorId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -100, prog: 0.33 },
          { key: 'translateY', val: 100, prog: 0.66 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    }));

    // Create monitor container
    const monitorContainer = {
      id: monitorId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl',
          style: {},
        },
      },
      context: {
        timing: {
          start: monitorStart,
          duration: monitorDuration,
        },
      },
      effects: vsyncRollEffects,
      childrenData: [
        colorBarsOverlay,
        phosphorDotsLayer,
        scanlinesLayer,
        textContent,
        staticGlitchOverlay,
      ],
    };

    return monitorContainer;
  });

  // Create root container with grid layout
  const rootContainer = {
    id: 'crt-monitor-grid',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-gray-950 grid grid-cols-3 gap-4 p-4',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? 
          (captions[captions.length - 1].absoluteEnd || 10) : 10,
      },
    },
    childrenData: monitorComponents as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'crt-monitor-typokinetics',
  title: 'CRT Monitor Stack Typokinetics',
  description: 'Simulates text displayed on multiple stacked CRT monitors in a retro TV studio control room. Each word appears on a different monitor with varying analog characteristics including color adjustment, sync issues, RGB phosphor dots, scan line moiré patterns, color bars, and static glitches. Features vertical sync roll, soft chromatic keying effects, and multi-monitor live broadcast switching aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'crt', 'retro', 'analog', 'monitor', 'glitch', 'tv-studio', 'broadcast', 'scanlines', 'phosphor', 'vsync', 'chromatic-aberration'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    fontSize: 48,
    fontFamily: 'Orbitron',
    textColor: '#ffffff',
    chromaIntensity: 1,
    scanlineIntensity: 0.15,
    phosphorIntensity: 0.3,
    vsyncFrequency: 3,
    staticFrequency: 2,
    colorBarDuration: 0.5,
    monitorVariation: 0.3,
  },
};

// Export Preset
export const crtMonitorTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
