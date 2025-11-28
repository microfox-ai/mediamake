/**
 * Typokinetics 3D Space Drift Preset
 *
 * Creates text floating through 3D space using CSS perspective and transform3d,
 * simulating titles drifting through a sci-fi holographic interface. Each word
 * exists at different Z-depths, creating natural parallax as they drift past.
 * Text feels weightless and ethereal with subtle rotation on multiple axes.
 *
 * Features:
 * - 3D perspective with nested preserve-3d containers
 * - Word-level Z-depth variation based on impact scores
 * - Parallax effect: closer text moves faster, distant text slower
 * - Depth of field: distant text appears more blurred
 * - Proximity-based glow effect pulsing
 * - Multi-axis rotation for zero-gravity feel
 * - Staggered animations for natural layering
 *
 * Use cases:
 * - Sci-fi holographic title sequences
 * - Futuristic caption overlays
 * - 3D floating text effects
 * - Immersive parallax text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing and optional impact scores'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:700", "RobotoMono:400:italic")'),
  fontSize: z.number().min(12).max(120).default(48).describe('Base font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex or rgba)'),
  glowColor: z.string().default('rgba(100, 200, 255, 0.8)').describe('Glow effect color for proximity pulse'),
  perspectiveDepth: z.number().min(500).max(2000).default(1000).describe('CSS perspective depth in pixels'),
  driftSpeed: z.number().min(0.5).max(3).default(1).describe('Overall drift speed multiplier'),
  rotationIntensity: z.number().min(0).max(2).default(1).describe('Rotation intensity on multiple axes'),
  parallaxStrength: z.number().min(0.5).max(3).default(1.5).describe('Parallax effect strength (closer vs distant movement)'),
  blurDepthFactor: z.number().min(0).max(5).default(2).describe('Blur intensity based on Z-distance (0-5px)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    let fontStyle: React.CSSProperties = {};
    
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };

  // Helper function: Calculate Z-depth based on impact score
  const calculateZDepth = (impactScore: number): number => {
    // Map impact score (0-1) to Z-depth range
    // Low impact (0-0.5) → far layer (200-500px)
    // High impact (0.5-1.0) → near layer (0-200px)
    if (impactScore < 0.5) {
      // Far layer: map 0-0.5 to 200-500px
      return 200 + (impactScore / 0.5) * 300;
    } else {
      // Near layer: map 0.5-1.0 to 0-200px
      return 200 - ((impactScore - 0.5) / 0.5) * 200;
    }
  };

  // Helper function: Create 3D drift effect for a word
  const create3DDriftEffect = (
    targetId: string,
    wordStart: number,
    wordDuration: number,
    zDepth: number,
    isNear: boolean,
  ): GenericEffectData => {
    const { driftSpeed, rotationIntensity, parallaxStrength, blurDepthFactor, glowColor } = params;
    
    // Calculate movement ranges based on Z-depth (parallax)
    const movementMultiplier = isNear ? parallaxStrength : (1 / parallaxStrength);
    const translateXRange = 100 * driftSpeed * movementMultiplier;
    const translateYRange = 50 * driftSpeed * movementMultiplier;
    const translateZRange = 100 * driftSpeed;
    
    // Calculate blur based on Z-distance
    const blurAmount = Math.abs(zDepth) / 100 * blurDepthFactor;
    const blurStart = isNear ? blurAmount * 0.5 : blurAmount;
    const blurEnd = isNear ? blurAmount * 0.3 : blurAmount * 1.2;
    
    // Calculate rotation ranges
    const rotateXRange = 15 * rotationIntensity;
    const rotateYRange = 20 * rotationIntensity;
    const rotateZRange = 10 * rotationIntensity;
    
    // Glow pulse based on proximity
    const glowIntensity = isNear ? 20 : 10;
    const glowStart = `0 0 ${glowIntensity * 0.5}px ${glowColor}`;
    const glowMid = `0 0 ${glowIntensity}px ${glowColor}`;
    const glowEnd = `0 0 ${glowIntensity * 0.5}px ${glowColor}`;

    return {
      type: 'ease-out',
      start: wordStart,
      duration: wordDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Translation (drift through space)
        { key: 'translateX', val: -translateXRange, prog: 0 },
        { key: 'translateX', val: translateXRange, prog: 1 },
        { key: 'translateY', val: -translateYRange, prog: 0 },
        { key: 'translateY', val: translateYRange * 0.5, prog: 0.5 },
        { key: 'translateY', val: translateYRange, prog: 1 },
        { key: 'translateZ', val: zDepth, prog: 0 },
        { key: 'translateZ', val: zDepth - translateZRange, prog: 1 },
        
        // Multi-axis rotation (zero gravity feel)
        { key: 'rotateX', val: -rotateXRange, prog: 0 },
        { key: 'rotateX', val: rotateXRange * 0.5, prog: 0.5 },
        { key: 'rotateX', val: rotateXRange, prog: 1 },
        { key: 'rotateY', val: -rotateYRange, prog: 0 },
        { key: 'rotateY', val: 0, prog: 0.5 },
        { key: 'rotateY', val: rotateYRange, prog: 1 },
        { key: 'rotateZ', val: -rotateZRange, prog: 0 },
        { key: 'rotateZ', val: rotateZRange, prog: 1 },
        
        // Depth of field blur
        { key: 'filter', val: `blur(${blurStart}px)`, prog: 0 },
        { key: 'filter', val: `blur(${blurEnd}px)`, prog: 1 },
        
        // Proximity glow pulse
        { key: 'textShadow', val: glowStart, prog: 0 },
        { key: 'textShadow', val: glowMid, prog: 0.5 },
        { key: 'textShadow', val: glowEnd, prog: 1 },
        
        // Fade in/out
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  // Parse font
  const fontString = params.font || 'Inter:400';
  const { fontFamily, fontStyle } = parseFontString(fontString);

  // Build word components from captions
  const allWordComponents: RenderableComponentData[] = [];
  const nearLayerWords: RenderableComponentData[] = [];
  const farLayerWords: RenderableComponentData[] = [];

  params.captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    if (!caption.words || caption.words.length === 0) return;

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      
      // Get impact score from metadata or default to word position in sentence
      let impactScore = 0.5;
      if (caption.metadata?.impact !== undefined) {
        // Use caption-level impact
        impactScore = caption.metadata.impact;
      } else {
        // Calculate based on word position (middle words = higher impact)
        const normalizedPosition = wordIndex / (caption.words.length - 1 || 1);
        impactScore = 1 - Math.abs(normalizedPosition - 0.5) * 2;
      }
      
      // Calculate Z-depth based on impact
      const zDepth = calculateZDepth(impactScore);
      const isNear = impactScore >= 0.5;
      
      // Create 3D drift effect
      const driftEffect = create3DDriftEffect(
        wordId,
        word.start,
        word.duration,
        zDepth,
        isNear,
      );
      
      // Calculate stagger delay
      const staggerDelay = isNear ? 0 : 0.2;
      
      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            },
          },
        },
        context: {
          timing: {
            start: word.start + staggerDelay,
            duration: word.duration,
          },
        },
        effects: [
          {
            id: `drift-effect-${wordId}`,
            componentId: 'generic',
            data: driftEffect,
          },
        ],
        childrenData: [
          {
            id: `text-${wordId}`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                fontWeight: isNear ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
      
      // Add to appropriate layer
      if (isNear) {
        nearLayerWords.push(wordComponent);
      } else {
        farLayerWords.push(wordComponent);
      }
      
      allWordComponents.push(wordComponent);
    });
  });

  // Get total duration from last caption
  const totalDuration = params.captions.length > 0
    ? params.captions[params.captions.length - 1].absoluteEnd
    : 10;

  // Build layer containers
  const farLayerContainer: RenderableComponentData = {
    id: 'far-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0.2,
        duration: totalDuration,
      },
    },
    childrenData: farLayerWords,
  };

  const nearLayerContainer: RenderableComponentData = {
    id: 'near-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: nearLayerWords,
  };

  // Build preserve-3d container
  const preserve3dContainer: RenderableComponentData = {
    id: 'preserve-3d-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [farLayerContainer, nearLayerContainer],
  };

  // Build root perspective container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-3d-drift-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${params.perspectiveDepth}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: params.captions.length > 0 ? params.captions[0].absoluteStart : 0,
        duration: totalDuration,
      },
    },
    childrenData: [preserve3dContainer],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-3d-drift',
  title: 'Typokinetics 3D Space Drift',
  description: 'Text floating through 3D space using CSS perspective and transform3d, simulating titles drifting through a sci-fi holographic interface with natural parallax, weightless rotation, and proximity-based glow effects. Words drift at different Z-depths with staggered animations based on impact scores.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'subtitles', '3d', 'parallax', 'sci-fi', 'holographic', 'floating', 'kinetic', 'perspective', 'drift', 'depth', 'glow', 'futuristic'],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Drifting through space',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          { id: 'word-0', text: 'Drifting', start: 0, absoluteStart: 0, end: 1, absoluteEnd: 1, duration: 1, confidence: 1 },
          { id: 'word-1', text: 'through', start: 1, absoluteStart: 1, end: 2, absoluteEnd: 2, duration: 1, confidence: 1 },
          { id: 'word-2', text: 'space', start: 2, absoluteStart: 2, end: 3, absoluteEnd: 3, duration: 1, confidence: 1 },
        ],
        metadata: { impact: 0.8 },
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    glowColor: 'rgba(100, 200, 255, 0.8)',
    perspectiveDepth: 1000,
    driftSpeed: 1,
    rotationIntensity: 1,
    parallaxStrength: 1.5,
    blurDepthFactor: 2,
  },
};

// Export preset
export const typokinetics3dDriftPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
