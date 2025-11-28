/**
 * Typokinetics Train Window Preset
 *
 * Recreates the sensation of reading text through a train window as landscape rushes by.
 * Words start far on the horizon (small, compressed), accelerate rapidly as they approach 
 * the viewer's position, then streak past with motion blur. Features realistic perspective 
 * where words at different vertical positions move at different apparent speeds due to 
 * viewing angle. Includes subtle vibration/shake to simulate train movement, depth layers 
 * for foreground/background objects, and atmospheric perspective for distant words.
 *
 * Features:
 * - **Horizon-to-Viewer Motion**: Words start small/distant and accelerate toward viewer
 * - **Perspective-Based Speed Variation**: Top/bottom lanes move at different apparent speeds
 * - **Motion Blur**: Dynamic blur effect during fast movement phase
 * - **Train Vibration**: Subtle shake simulating train movement
 * - **Depth Layers**: Multiple lanes for foreground/background depth
 * - **Atmospheric Perspective**: Distant words are faded and desaturated
 * - **Performance Optimized**: Limited visible words, recycled animations
 *
 * Use cases:
 * - Creating dynamic kinetic typography with realistic motion
 * - Simulating train/vehicle window viewing experiences
 * - Building high-energy text animations with perspective
 * - Adding depth and motion blur to text sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with words'),
  font: z.string().optional().default('Inter').describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  textColor: z.string().optional().default('#FFFFFF').describe('Text color for words'),
  fontSize: z.number().optional().default(48).describe('Base font size in pixels'),
  maxVisibleWords: z.number().optional().default(18).describe('Maximum number of visible words at once (performance optimization)'),
  vibrationIntensity: z.number().optional().default(2).describe('Train shake vibration intensity in pixels (0-5)'),
  vibrationFrequency: z.number().optional().default(0.1).describe('Train shake vibration frequency (seconds per cycle)'),
  motionBlurIntensity: z.number().optional().default(4).describe('Maximum blur intensity during fast movement (0-10px)'),
  atmosphericFade: z.number().optional().default(0.4).describe('Opacity fade for distant words (0-1, where 1 = no fade)'),
  perspectiveDepth: z.number().optional().default(1000).describe('Perspective depth value (500-2000px)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter',
    textColor = '#FFFFFF',
    fontSize = 48,
    maxVisibleWords = 18,
    vibrationIntensity = 2,
    vibrationFrequency = 0.1,
    motionBlurIntensity = 4,
    atmosphericFade = 0.4,
    perspectiveDepth = 1000,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontStyle: React.CSSProperties = {};
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

  const { fontFamily, fontStyle } = parseFontString(font);

  // Extract all words from captions
  interface WordWithMeta {
    text: string;
    start: number;
    duration: number;
    absoluteStart: number;
    captionId: string;
  }

  const allWords: WordWithMeta[] = [];
  captions.forEach((caption: TranscriptionSentence) => {
    if (caption.words && Array.isArray(caption.words)) {
      caption.words.forEach((word) => {
        allWords.push({
          text: word.text,
          start: word.start,
          duration: word.duration,
          absoluteStart: word.absoluteStart,
          captionId: caption.id,
        });
      });
    }
  });

  // Limit to maxVisibleWords
  const visibleWords = allWords.slice(0, maxVisibleWords);

  // Lane configurations (5 lanes at different Y positions)
  const laneConfigs = [
    { top: '10%', scale: 0.6, duration: 4.5, speed: 0.8, name: 'lane-0' },  // Far top (slower, smaller)
    { top: '27.5%', scale: 0.75, duration: 3.8, speed: 0.9, name: 'lane-1' },
    { top: '45%', scale: 1.0, duration: 2.5, speed: 1.0, name: 'lane-2' },   // Center (fastest, largest)
    { top: '62.5%', scale: 0.8, duration: 3.5, speed: 0.92, name: 'lane-3' },
    { top: '80%', scale: 0.65, duration: 4.2, speed: 0.85, name: 'lane-4' }, // Far bottom (slower, smaller)
  ];

  // Create word components distributed across lanes
  const wordComponents: RenderableComponentData[] = visibleWords.map((word, index) => {
    const laneIndex = index % laneConfigs.length;
    const lane = laneConfigs[laneIndex];
    const wordId = `word-${index}`;

    // Calculate atmospheric fade based on lane (distant lanes more faded)
    const laneFadeMultiplier = laneIndex === 2 ? 1.0 : (laneIndex === 0 || laneIndex === 4) ? atmosphericFade : 0.7;

    // Create motion effect: horizon → viewer → streak past
    const effectDuration = lane.duration;
    const wordEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: word.start,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Phase 1: Horizon (0-30%) - small, far, compressed
        { key: 'translateX', val: 200, prog: 0 },
        { key: 'scale', val: lane.scale * 0.3, prog: 0 },
        { key: 'scaleX', val: 0.5, prog: 0 }, // Compressed horizontally
        { key: 'opacity', val: laneFadeMultiplier * 0.5, prog: 0 },
        { key: 'blur', val: '0px', prog: 0 },
        
        // Phase 2: Approach (30-50%) - accelerating, growing
        { key: 'translateX', val: 50, prog: 0.3 },
        { key: 'scale', val: lane.scale * 0.7, prog: 0.3 },
        { key: 'scaleX', val: 0.8, prog: 0.3 },
        { key: 'opacity', val: laneFadeMultiplier * 0.8, prog: 0.3 },
        { key: 'blur', val: `${motionBlurIntensity * 0.3}px`, prog: 0.3 },
        
        // Phase 3: Viewer position (50%) - peak size, max blur
        { key: 'translateX', val: 0, prog: 0.5 },
        { key: 'scale', val: lane.scale, prog: 0.5 },
        { key: 'scaleX', val: 1, prog: 0.5 },
        { key: 'opacity', val: laneFadeMultiplier, prog: 0.5 },
        { key: 'blur', val: `${motionBlurIntensity}px`, prog: 0.5 },
        
        // Phase 4: Streak past (50-70%) - rapid movement, motion blur
        { key: 'translateX', val: -100, prog: 0.7 },
        { key: 'scale', val: lane.scale * 1.2, prog: 0.7 },
        { key: 'scaleX', val: 1.5, prog: 0.7 }, // Stretched
        { key: 'opacity', val: laneFadeMultiplier * 0.6, prog: 0.7 },
        { key: 'blur', val: `${motionBlurIntensity * 0.8}px`, prog: 0.7 },
        
        // Phase 5: Vanish (70-100%) - off screen, faded
        { key: 'translateX', val: -250, prog: 1 },
        { key: 'scale', val: lane.scale * 0.4, prog: 1 },
        { key: 'scaleX', val: 0.6, prog: 1 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'blur', val: '0px', prog: 1 },
      ],
    };

    // TextAtom component
    const textAtom: RenderableComponentData = {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: fontStyle.fontWeight || 400,
          fontStyle: fontStyle.fontStyle || 'normal',
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: word.start,
          duration: effectDuration,
        },
      },
      effects: [
        {
          id: `${wordId}-motion`,
          componentId: 'generic',
          data: wordEffect,
        },
      ],
    };

    return textAtom;
  });

  // Group words by lane
  const laneGroups: Record<string, RenderableComponentData[]> = {};
  laneConfigs.forEach((lane) => {
    laneGroups[lane.name] = [];
  });

  wordComponents.forEach((word, index) => {
    const laneIndex = index % laneConfigs.length;
    const laneName = laneConfigs[laneIndex].name;
    laneGroups[laneName].push(word);
  });

  // Create lane containers
  const laneContainers: RenderableComponentData[] = laneConfigs.map((lane) => ({
    id: lane.name,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-full flex items-center justify-center',
        style: {
          top: lane.top,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'root-container',
      },
    },
    childrenData: laneGroups[lane.name],
  }));

  // Train shake container with vibration effect
  const shakeEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: vibrationFrequency * 4, // 4 cycles
    mode: 'provider',
    targetIds: ['train-shake-container'],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: vibrationIntensity, prog: 0.25 },
      { key: 'translateY', val: 0, prog: 0.5 },
      { key: 'translateY', val: -vibrationIntensity, prog: 0.75 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  const shakeContainer: RenderableComponentData = {
    id: 'train-shake-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'root-container',
      },
    },
    effects: [
      {
        id: 'train-shake-effect',
        componentId: 'generic',
        data: shakeEffect,
      },
    ],
    childrenData: laneContainers,
  };

  // Atmospheric overlay (gradient fade at top/bottom)
  const atmosphericOverlay: RenderableComponentData = {
    id: 'atmospheric-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: 'linear-gradient(180deg, rgba(135, 206, 235, 0.3) 0%, rgba(135, 206, 235, 0) 30%, rgba(135, 206, 235, 0) 70%, rgba(135, 206, 235, 0.3) 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'root-container',
      },
    },
    childrenData: [],
  };

  // Calculate total duration
  const totalDuration = Math.max(
    ...visibleWords.map((w) => w.absoluteStart + laneConfigs[0].duration)
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: `${perspectiveDepth}px`,
          perspectiveOrigin: '50% 50%',
          backgroundColor: '#87CEEB',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [shakeContainer, atmosphericOverlay],
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

const presetMetadata: PresetMetadata = {
  id: 'TypokineticsTrainWindow',
  title: 'Typokinetics Train Window',
  description: 'Recreates the feeling of reading text through a train window as landscape rushes by. Words start far on the horizon (small and compressed), accelerate rapidly as they approach the viewer\'s position, then streak past with motion blur. Features realistic perspective with depth layers, atmospheric fading for distant words, and subtle vibration effects simulating train movement.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'motion', 'perspective', 'train', 'window', 'blur', 'depth', 'atmospheric', 'vibration'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:600',
    textColor: '#FFFFFF',
    fontSize: 48,
    maxVisibleWords: 18,
    vibrationIntensity: 2,
    vibrationFrequency: 0.1,
    motionBlurIntensity: 4,
    atmosphericFade: 0.4,
    perspectiveDepth: 1000,
  },
};

export const TypokineticsTrainWindowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};