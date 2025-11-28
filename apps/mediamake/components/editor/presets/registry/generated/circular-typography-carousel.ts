/**
 * Circular Typography Carousel Preset
 *
 * A dynamic typography carousel where caption text orbits around an invisible center point 
 * with gravitational pull dynamics. Words at different orbital distances move at varied speeds 
 * (inner faster, outer slower) simulating planetary motion. Features 3D perspective depth using 
 * scale variations, and a magnetic snap effect where words briefly pause at cardinal positions 
 * (top, right, bottom, left) like a clock mechanism.
 *
 * Features:
 * - **Planetary Orbital Motion**: Words orbit around center with physics-based speeds
 * - **Variable Orbital Speeds**: Inner orbits faster (4s), middle (6s), outer slower (8s)
 * - **3D Perspective Depth**: Uses perspective and translateZ for depth simulation
 * - **Magnetic Snap Effect**: Words pause briefly at cardinal positions (0°, 90°, 180°, 270°)
 * - **Concentric Orbit Rings**: Three orbit rings at different radii (150px, 250px, 350px)
 * - **Continuous Rotation**: Smooth orbital motion with gravitational dynamics
 * - **Font Customization**: Custom font family and weight support
 * - **Color Theming**: Configurable text colors per orbit ring
 *
 * Use cases:
 * - Creating dynamic planetary text animations
 * - Building engaging circular typography effects
 * - Creating orbital motion graphics for social media
 * - Adding professional carousel text effects
 * - Simulating gravitational text dynamics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema with comprehensive descriptions
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with words for orbital display'),

  // Orbit configuration
  innerOrbitRadius: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .optional()
    .describe('Radius of inner orbit ring in pixels (default: 150)'),
  middleOrbitRadius: z
    .number()
    .min(100)
    .max(400)
    .default(250)
    .optional()
    .describe('Radius of middle orbit ring in pixels (default: 250)'),
  outerOrbitRadius: z
    .number()
    .min(150)
    .max(500)
    .default(350)
    .optional()
    .describe('Radius of outer orbit ring in pixels (default: 350)'),

  // Orbital speed configuration (in seconds per revolution)
  innerOrbitSpeed: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .optional()
    .describe('Revolution period for inner orbit in seconds (default: 4)'),
  middleOrbitSpeed: z
    .number()
    .min(4)
    .max(15)
    .default(6)
    .optional()
    .describe('Revolution period for middle orbit in seconds (default: 6)'),
  outerOrbitSpeed: z
    .number()
    .min(6)
    .max(20)
    .default(8)
    .optional()
    .describe('Revolution period for outer orbit in seconds (default: 8)'),

  // Font configuration
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),

  // Color configuration per orbit
  innerOrbitColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color for inner orbit words (default: #ffffff)'),
  middleOrbitColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color for middle orbit words (default: #ffffff)'),
  outerOrbitColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color for outer orbit words (default: #ffffff)'),

  // Font size configuration
  innerOrbitFontSize: z
    .number()
    .min(12)
    .max(48)
    .default(24)
    .optional()
    .describe('Font size for inner orbit words in pixels (default: 24)'),
  middleOrbitFontSize: z
    .number()
    .min(16)
    .max(56)
    .default(28)
    .optional()
    .describe('Font size for middle orbit words in pixels (default: 28)'),
  outerOrbitFontSize: z
    .number()
    .min(20)
    .max(64)
    .default(32)
    .optional()
    .describe('Font size for outer orbit words in pixels (default: 32)'),

  // Snap effect configuration
  snapDuration: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe(
      'Duration of magnetic snap pause at cardinal positions in seconds (default: 0.15)',
    ),

  // 3D perspective configuration
  perspectiveDepth: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .optional()
    .describe('Perspective depth for 3D effect in pixels (default: 1000)'),
  zDepthVariation: z
    .number()
    .min(0)
    .max(200)
    .default(50)
    .optional()
    .describe(
      'Z-axis translation variation for depth effect in pixels (default: 50)',
    ),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Extract configuration
  const innerRadius = params.innerOrbitRadius ?? 150;
  const middleRadius = params.middleOrbitRadius ?? 250;
  const outerRadius = params.outerOrbitRadius ?? 350;

  const innerSpeed = params.innerOrbitSpeed ?? 4;
  const middleSpeed = params.middleOrbitSpeed ?? 6;
  const outerSpeed = params.outerOrbitSpeed ?? 8;

  const innerColor = params.innerOrbitColor ?? '#ffffff';
  const middleColor = params.middleOrbitColor ?? '#ffffff';
  const outerColor = params.outerOrbitColor ?? '#ffffff';

  const innerFontSize = params.innerOrbitFontSize ?? 24;
  const middleFontSize = params.middleOrbitFontSize ?? 28;
  const outerFontSize = params.outerOrbitFontSize ?? 32;

  const snapDuration = params.snapDuration ?? 0.15;
  const perspectiveDepth = params.perspectiveDepth ?? 1000;
  const zDepthVariation = params.zDepthVariation ?? 50;

  // Helper function to create orbital motion effect with snap
  const createOrbitalEffect = (
    wordId: string,
    captionStart: number,
    captionDuration: number,
    orbitRadius: number,
    orbitSpeed: number,
    startAngle: number,
  ): GenericEffectData => {
    // Calculate number of revolutions during caption duration
    const numRevolutions = captionDuration / orbitSpeed;
    const totalDegrees = numRevolutions * 360;

    // Create keyframes with snap effect at cardinal positions
    const ranges: any[] = [];

    // Number of keyframes per revolution (more = smoother)
    const keyframesPerRevolution = 120;
    const totalKeyframes = Math.ceil(numRevolutions * keyframesPerRevolution);

    for (let i = 0; i <= totalKeyframes; i++) {
      const progress = i / totalKeyframes;
      const currentAngle = startAngle + (totalDegrees * progress);
      const normalizedAngle = currentAngle % 360;

      // Check if we're near a cardinal position (0°, 90°, 180°, 270°)
      const cardinalAngles = [0, 90, 180, 270, 360];
      let snapAngle = normalizedAngle;
      let isSnapping = false;

      for (const cardinal of cardinalAngles) {
        const angleDistance = Math.abs(normalizedAngle - cardinal);
        if (angleDistance < 5) {
          // Within 5° of cardinal
          snapAngle = cardinal % 360;
          isSnapping = true;
          break;
        }
      }

      // Convert angle to radians
      const angleRad = (snapAngle * Math.PI) / 180;

      // Calculate x, y position on circle
      const x = orbitRadius * Math.cos(angleRad);
      const y = orbitRadius * Math.sin(angleRad);

      // Calculate z-depth based on y position (closer when at bottom, further when at top)
      const zDepth = (y / orbitRadius) * zDepthVariation;

      // Scale based on z-depth (closer = larger)
      const depthScale = 1 + (zDepth / zDepthVariation) * 0.2;

      // Add keyframe
      ranges.push({ key: 'translateX', val: x, prog: progress });
      ranges.push({ key: 'translateY', val: y, prog: progress });
      ranges.push({ key: 'translateZ', val: zDepth, prog: progress });
      ranges.push({ key: 'scale', val: depthScale, prog: progress });

      // If snapping, add duplicate keyframes to create pause effect
      if (isSnapping && i > 0 && i < totalKeyframes) {
        const snapProgress = progress + (snapDuration / captionDuration);
        if (snapProgress < 1) {
          ranges.push({ key: 'translateX', val: x, prog: snapProgress });
          ranges.push({ key: 'translateY', val: y, prog: snapProgress });
          ranges.push({ key: 'translateZ', val: zDepth, prog: snapProgress });
          ranges.push({ key: 'scale', val: depthScale, prog: snapProgress });
        }
      }
    }

    return {
      type: 'linear',
      start: 0,
      duration: captionDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Process captions and distribute words across orbits
  const allCaptionComponents: RenderableComponentData[] = [];

  params.captions.forEach((caption) => {
    const captionWords = caption.words;
    const numWords = captionWords.length;

    // Distribute words across three orbits
    const wordsPerOrbit = Math.ceil(numWords / 3);

    const innerWords = captionWords.slice(0, wordsPerOrbit);
    const middleWords = captionWords.slice(wordsPerOrbit, wordsPerOrbit * 2);
    const outerWords = captionWords.slice(wordsPerOrbit * 2);

    // Helper to create word components for an orbit
    const createOrbitWords = (
      words: typeof captionWords,
      orbitRadius: number,
      orbitSpeed: number,
      fontSize: number,
      color: string,
      orbitName: string,
    ): RenderableComponentData[] => {
      return words.map((word, index) => {
        const wordId = `${caption.id}-${orbitName}-word-${index}`;
        const startAngle = (index / words.length) * 360;

        // Create orbital motion effect
        const orbitalEffect = createOrbitalEffect(
          wordId,
          caption.absoluteStart,
          caption.duration,
          orbitRadius,
          orbitSpeed,
          startAngle,
        );

        return {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              position: 'absolute',
              fontSize: `${fontSize}px`,
              fontWeight: 'bold',
              color: color,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
            className: 'whitespace-nowrap',
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [
            {
              id: `${wordId}-orbital-effect`,
              componentId: 'generic',
              data: orbitalEffect,
            },
          ],
        } as RenderableComponentData;
      });
    };

    // Create words for each orbit
    const innerOrbitWords = createOrbitWords(
      innerWords,
      innerRadius,
      innerSpeed,
      innerFontSize,
      innerColor,
      'inner',
    );
    const middleOrbitWords = createOrbitWords(
      middleWords,
      middleRadius,
      middleSpeed,
      middleFontSize,
      middleColor,
      'middle',
    );
    const outerOrbitWords = createOrbitWords(
      outerWords,
      outerRadius,
      outerSpeed,
      outerFontSize,
      outerColor,
      'outer',
    );

    // Create caption container with all orbit words
    const captionContainer: RenderableComponentData = {
      id: `${caption.id}-orbital-container`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            perspective: `${perspectiveDepth}px`,
            transformStyle: 'preserve-3d',
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        ...innerOrbitWords,
        ...middleOrbitWords,
        ...outerOrbitWords,
      ],
    };

    allCaptionComponents.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'circular-typography-carousel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.captions.reduce(
          (max, cap) => Math.max(max, cap.absoluteEnd),
          0,
        ),
      },
    },
    childrenData: allCaptionComponents,
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'circular-typography-carousel',
  title: 'Circular Typography Carousel',
  description:
    'A dynamic typography carousel where caption text orbits around an invisible center point with gravitational pull dynamics. Words at different orbital distances move at varied speeds (inner faster, outer slower) simulating planetary motion. Features 3D perspective depth using scale variations, and a magnetic snap effect where words briefly pause at cardinal positions (top, right, bottom, left) like a clock mechanism. Three concentric orbit rings support dynamic word distribution with smooth continuous rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'carousel',
    'circular',
    'orbital',
    'planetary',
    'rotation',
    '3d-perspective',
    'gravitational',
    'kinetic',
    'snap-effect',
    'caption',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Orbiting words in circular motion with gravitational dynamics',
        start: 0,
        end: 10,
        duration: 10,
        absoluteStart: 0,
        absoluteEnd: 10,
        words: [
          {
            text: 'Orbiting',
            start: 0,
            end: 1,
            duration: 1,
            absoluteStart: 0,
            absoluteEnd: 1,
          },
          {
            text: 'words',
            start: 1,
            end: 2,
            duration: 1,
            absoluteStart: 1,
            absoluteEnd: 2,
          },
          {
            text: 'in',
            start: 2,
            end: 2.5,
            duration: 0.5,
            absoluteStart: 2,
            absoluteEnd: 2.5,
          },
          {
            text: 'circular',
            start: 2.5,
            end: 3.5,
            duration: 1,
            absoluteStart: 2.5,
            absoluteEnd: 3.5,
          },
          {
            text: 'motion',
            start: 3.5,
            end: 4.5,
            duration: 1,
            absoluteStart: 3.5,
            absoluteEnd: 4.5,
          },
          {
            text: 'with',
            start: 4.5,
            end: 5,
            duration: 0.5,
            absoluteStart: 4.5,
            absoluteEnd: 5,
          },
          {
            text: 'gravitational',
            start: 5,
            end: 6.5,
            duration: 1.5,
            absoluteStart: 5,
            absoluteEnd: 6.5,
          },
          {
            text: 'dynamics',
            start: 6.5,
            end: 8,
            duration: 1.5,
            absoluteStart: 6.5,
            absoluteEnd: 8,
          },
        ],
      },
    ],
    innerOrbitRadius: 150,
    middleOrbitRadius: 250,
    outerOrbitRadius: 350,
    innerOrbitSpeed: 4,
    middleOrbitSpeed: 6,
    outerOrbitSpeed: 8,
    font: 'Inter:700',
    innerOrbitColor: '#ffffff',
    middleOrbitColor: '#ffffff',
    outerOrbitColor: '#ffffff',
    innerOrbitFontSize: 24,
    middleOrbitFontSize: 28,
    outerOrbitFontSize: 32,
    snapDuration: 0.15,
    perspectiveDepth: 1000,
    zDepthVariation: 50,
  },
};

// Export preset
export const circularTypographyCarouselPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
