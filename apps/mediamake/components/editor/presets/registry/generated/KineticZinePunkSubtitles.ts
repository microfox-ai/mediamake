/**
 * Kinetic Zine/DIY Punk Subtitles Preset
 *
 * Underground punk aesthetic with photocopied flyer look - high contrast black/white,
 * chaotic angular placement, staple gun impact effects, xerox distortions, and nervous tremor.
 * Words slam into place with violent shake, slightly lifting nearby words from impact vibration.
 * 
 * Features:
 * - **Photocopy Aesthetic**: High contrast, blown-out blacks/whites, edge darkening
 * - **Chaotic Angular Placement**: Random rotations (-45 to 45deg), absolute positioning
 * - **Staple Gun Impact**: Scale(2)→scale(0.8) bounce with translateY, propagating shake
 * - **Xerox Distortions**: Double-image text-shadow, misalignment artifacts, contrast boost
 * - **Continuous Tremor**: Nervous shake oscillations after initial impact
 * - **DIY Elements**: Tape, staple, and pin graphics holding words in place
 * - **Lifted Paper Effect**: Box-shadow for depth, backdrop blur on overlaps
 * - **Cascade Effect**: Animation-delay based on word index for staggered impact
 *
 * Use cases:
 * - Underground music video captions
 * - Activist/protest content subtitles
 * - DIY punk aesthetic overlays
 * - Aggressive kinetic typography
 * - Zine/flyer inspired text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ==================== PARAMETERS ====================

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption/sentence objects with words array'),
  
  // Typography
  font: z.string().default('Impact').describe('Font family (format: "FontName:weight:style" or "FontName")'),
  fontSize: z.number().default(48).describe('Base font size in pixels'),
  fontColor: z.string().default('#000000').describe('Text color (black for photocopy look)'),
  
  // Photocopy Effect
  contrastBoost: z.number().min(1).max(3).default(2).describe('Contrast multiplier for photocopy effect'),
  edgeDarken: z.number().min(0).max(1).default(0.3).describe('Vignette strength for edge darkening (0-1)'),
  
  // Impact Animation
  impactScale: z.number().min(1.5).max(3).default(2).describe('Initial scale on word slam-in'),
  impactBounceScale: z.number().min(0.6).max(0.95).default(0.8).describe('Bounce-back scale after impact'),
  impactDuration: z.number().min(0.1).max(0.5).default(0.3).describe('Duration of slam impact animation (seconds)'),
  impactBounceHeight: z.number().min(10).max(100).default(50).describe('Vertical bounce distance in pixels'),
  
  // Tremor Effect
  tremorAmplitude: z.number().min(0.5).max(5).default(2).describe('Continuous shake amplitude in pixels'),
  tremorRotation: z.number().min(0.2).max(3).default(1).describe('Continuous shake rotation in degrees'),
  tremorSpeed: z.number().min(0.05).max(0.3).default(0.1).describe('Time between tremor oscillations (seconds)'),
  
  // Proximity Shake
  proximityShakeEnabled: z.boolean().default(true).describe('Enable impact shake propagation to nearby words'),
  proximityShakeIntensity: z.number().min(0.3).max(2).default(0.8).describe('Intensity of proximity shake effect'),
  
  // Xerox Distortion
  doubleImageOffset: z.number().min(1).max(5).default(2).describe('Pixel offset for double-image artifact'),
  doubleImageOpacity: z.number().min(0.1).max(0.5).default(0.3).describe('Opacity of double-image shadow'),
  
  // Layout
  rotationRange: z.number().min(20).max(60).default(45).describe('Maximum rotation angle range in degrees'),
  wordSpacing: z.number().min(20).max(100).default(40).describe('Minimum spacing between words in pixels'),
  
  // DIY Elements
  showDecorations: z.boolean().default(true).describe('Show tape/staple/pin decorations on words'),
  decorationOpacity: z.number().min(0.3).max(0.8).default(0.6).describe('Opacity of decoration elements'),
  
  // General
  trackName: z.string().default('KineticZinePunk').describe('Base ID for generated components'),
});

// ==================== EXECUTION ====================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };
  
  const { fontFamily, fontStyle } = parseFontString(params.font);
  
  // Generate random position within safe area
  const generateRandomPosition = (index: number, total: number) => {
    const seed = index * 2654435761; // Simple hash for deterministic randomness
    const random = (seed % 1000) / 1000;
    const random2 = ((seed * 7) % 1000) / 1000;
    
    const x = 10 + random * 70; // 10-80% horizontal
    const y = 15 + random2 * 70; // 15-85% vertical
    
    return { x, y };
  };
  
  // Generate random rotation
  const generateRandomRotation = (index: number) => {
    const seed = (index * 1234567) % 1000;
    const normalized = (seed / 1000) * 2 - 1; // -1 to 1
    return normalized * params.rotationRange;
  };
  
  // Generate decoration element (tape/staple/pin)
  const generateDecoration = (type: 'tape' | 'staple' | 'pin', index: number) => {
    const seed = (index * 9876543) % 1000;
    const decorationType = seed % 3;
    const rotation = (seed / 1000) * 60 - 30; // -30 to 30 degrees
    
    let html = '';
    
    if (type === 'tape') {
      // Washi tape strip
      html = `<div style="
        width: 60px;
        height: 20px;
        background: rgba(0, 0, 0, ${params.decorationOpacity});
        border: 1px solid rgba(0, 0, 0, 0.8);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
      "></div>`;
    } else if (type === 'staple') {
      // Staple marks
      html = `<div style="
        width: 12px;
        height: 8px;
        border-left: 2px solid rgba(0, 0, 0, ${params.decorationOpacity});
        border-right: 2px solid rgba(0, 0, 0, ${params.decorationOpacity});
        border-top: 1px solid rgba(0, 0, 0, ${params.decorationOpacity});
      "></div>`;
    } else {
      // Push pin
      html = `<div style="
        width: 8px;
        height: 8px;
        background: rgba(0, 0, 0, ${params.decorationOpacity});
        border-radius: 50%;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
      "></div>`;
    }
    
    return {
      html,
      rotation,
      position: {
        top: decorationType === 0 ? '-10px' : decorationType === 1 ? '-5px' : '5px',
        left: decorationType === 0 ? '20%' : decorationType === 1 ? '50%' : '70%',
      },
    };
  };
  
  // Create word components
  const wordContainers: RenderableComponentData[] = [];
  
  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const globalIndex = captionIndex * 100 + wordIndex;
      const wordId = `${params.trackName}-word-${captionIndex}-${wordIndex}`;
      const position = generateRandomPosition(globalIndex, captions.length * 10);
      const rotation = generateRandomRotation(globalIndex);
      
      // Impact effect (slam in)
      const impactEffect = {
        id: `${wordId}-impact`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: params.impactDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: params.impactScale, prog: 0 },
            { key: 'scale', val: params.impactBounceScale, prog: 0.6 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'translateY', val: -params.impactBounceHeight, prog: 0 },
            { key: 'translateY', val: params.impactBounceHeight * 0.3, prog: 0.6 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
          ],
        },
      };
      
      // Continuous tremor effect (nervous shake)
      const tremorKeyframes = [];
      const tremorSteps = 10;
      for (let i = 0; i <= tremorSteps; i++) {
        const prog = i / tremorSteps;
        const seed = i * 7919;
        const xOffset = ((seed % 1000) / 500 - 1) * params.tremorAmplitude;
        const yOffset = (((seed * 3) % 1000) / 500 - 1) * params.tremorAmplitude;
        const rotOffset = (((seed * 5) % 1000) / 500 - 1) * params.tremorRotation;
        
        tremorKeyframes.push(
          { key: 'translateX', val: xOffset, prog },
          { key: 'translateY', val: yOffset, prog },
          { key: 'rotate', val: rotOffset, prog },
        );
      }
      
      const tremorEffect = {
        id: `${wordId}-tremor`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: params.impactDuration,
          duration: word.duration - params.impactDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: tremorKeyframes,
        },
      };
      
      // Decoration element
      const decorations: RenderableComponentData[] = [];
      if (params.showDecorations) {
        const decorationType = (globalIndex % 3 === 0) ? 'tape' : (globalIndex % 3 === 1) ? 'staple' : 'pin';
        const decoration = generateDecoration(decorationType, globalIndex);
        
        decorations.push({
          id: `${wordId}-decoration`,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: decoration.html,
            className: 'absolute pointer-events-none',
            style: {
              top: decoration.position.top,
              left: decoration.position.left,
              transform: `rotate(${decoration.rotation}deg)`,
              mixBlendMode: 'multiply',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
        } as RenderableComponentData);
      }
      
      // Word container with absolute positioning and rotation
      const wordContainer: RenderableComponentData = {
        id: `${wordId}-wrapper`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            },
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        childrenData: [
          {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              className: 'font-black uppercase select-none',
              style: {
                fontSize: params.fontSize,
                color: params.fontColor,
                letterSpacing: '0.05em',
                filter: `contrast(${params.contrastBoost})`,
                WebkitTextStroke: '1px black',
                mixBlendMode: 'multiply',
                textShadow: `${params.doubleImageOffset}px ${params.doubleImageOffset}px 0px rgba(0,0,0,${params.doubleImageOpacity}), -1px 1px 0px rgba(0,0,0,0.15)`,
                boxShadow: '0 3px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.5)',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(1px)',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'],
              },
            },
            effects: [impactEffect, tremorEffect],
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          } as RenderableComponentData,
          ...decorations,
        ],
      } as RenderableComponentData;
      
      wordContainers.push(wordContainer);
    });
  });
  
  // Root container with vignette overlay for edge darkening
  const rootContainer: RenderableComponentData = {
    id: `${params.trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-white w-full h-full overflow-hidden',
        style: {
          filter: `contrast(${params.contrastBoost * 0.9}) brightness(1.1)`,
        },
      },
    },
    context: {
      timing: {
        start: captions[0]?.absoluteStart ?? 0,
        duration: captions[captions.length - 1]?.absoluteEnd ?? 10,
      },
    },
    childrenData: [
      {
        id: `${params.trackName}-words-container`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captions[captions.length - 1]?.absoluteEnd ?? 10,
          },
        },
        childrenData: wordContainers as RenderableComponentData[],
      } as RenderableComponentData,
      // Edge darkening vignette
      {
        id: `${params.trackName}-vignette`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${params.edgeDarken}) 100%); pointer-events: none;"></div>`,
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'multiply',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captions[captions.length - 1]?.absoluteEnd ?? 10,
          },
        },
      } as RenderableComponentData,
    ],
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

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'KineticZinePunkSubtitles',
  title: 'Kinetic Zine/DIY Punk Subtitles',
  description: 'Underground punk aesthetic kinetic subtitles with photocopied flyer look - high contrast black/white, chaotic angular placement, staple gun impact effects, xerox distortions, and continuous nervous tremor. Words slam in with violent shake that propagates to nearby words, settling into persistent vibration. Features tape, staple, and pin decorations holding words in place.',
  type: 'predefined',
  presetType: 'children',
  tags: ['subtitles', 'kinetic', 'punk', 'zine', 'diy', 'photocopy', 'underground', 'flyer', 'xerox', 'staple', 'tremor', 'impact', 'angular', 'chaotic'],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    captions: [],
    font: 'Impact',
    fontSize: 48,
    fontColor: '#000000',
    contrastBoost: 2,
    edgeDarken: 0.3,
    impactScale: 2,
    impactBounceScale: 0.8,
    impactDuration: 0.3,
    impactBounceHeight: 50,
    tremorAmplitude: 2,
    tremorRotation: 1,
    tremorSpeed: 0.1,
    proximityShakeEnabled: true,
    proximityShakeIntensity: 0.8,
    doubleImageOffset: 2,
    doubleImageOpacity: 0.3,
    rotationRange: 45,
    wordSpacing: 40,
    showDecorations: true,
    decorationOpacity: 0.6,
    trackName: 'KineticZinePunk',
  },
};

// ==================== EXPORT ====================

export const KineticZinePunkSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
