/**
 * Ransom Note Transition Preset
 *
 * Creates a chaotic ransom-note style transition where cut-out letters and paper
 * pieces randomly appear and disappear to form a collage effect. Letters have
 * different fonts, sizes, and rotations as if cut from various magazines. Tape
 * strips are applied to some letters. The pieces eventually clear to reveal the
 * incoming video, with some letters sticking to frame edges.
 *
 * Features:
 * - 15-20 randomly positioned letters with varied fonts and sizes
 * - Paper texture backgrounds with shadows
 * - Tape strip overlays (semi-transparent yellow)
 * - Jerky stop-motion animation (steps(2) easing)
 * - Letters animate with opacity, scale, and rotation wobble
 * - Some letters persist longer at edges while others disappear
 * - 2.8s overlap transition duration
 *
 * Use cases:
 * - Edgy, chaotic video transitions
 * - Music video cuts and glitch aesthetics
 * - Horror/thriller style transitions
 * - Artistic collage-style video editing
 * - Social media content with bold visual impact
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video clip'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video clip'),
  transitionDuration: z
    .number()
    .default(2.8)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideoSrc, incomingVideoSrc, transitionDuration } = params;

  // Random letter generation helper
  const randomLetter = (): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!?#$&*@';
    return letters[Math.floor(Math.random() * letters.length)];
  };

  // Random font helper
  const randomFont = (): string => {
    const fonts = [
      'Impact, sans-serif',
      'Courier New, monospace',
      'Georgia, serif',
      'Times New Roman, serif',
      'Arial Black, sans-serif',
      'Verdana, sans-serif',
      'Comic Sans MS, cursive',
      'Trebuchet MS, sans-serif',
      'Helvetica, sans-serif',
      'Palatino, serif',
      'Arial, sans-serif',
      'Garamond, serif',
      'Rockwell, serif',
      'Franklin Gothic, sans-serif',
      'Century Gothic, sans-serif',
      'Lucida Sans, sans-serif',
      'Bookman, serif',
      'Optima, sans-serif',
    ];
    return fonts[Math.floor(Math.random() * fonts.length)];
  };

  // Random font size (1rem to 4rem)
  const randomFontSize = (): string => {
    const size = 1 + Math.random() * 3;
    return `${size.toFixed(1)}rem`;
  };

  // Random rotation (-25deg to 25deg)
  const randomRotation = (): number => {
    return -25 + Math.random() * 50;
  };

  // Random position (avoiding extreme edges)
  const randomPosition = (): { top: string; left: string } => {
    const top = 5 + Math.random() * 85;
    const left = 5 + Math.random() * 85;
    return {
      top: `${top}%`,
      left: `${left}%`,
    };
  };

  // Random paper background color (beige/cream tones)
  const randomPaperColor = (): string => {
    const colors = [
      '#f5f5dc',
      '#fffaf0',
      '#fff8dc',
      '#faebd7',
      '#ffefd5',
      '#f0e68c',
      '#fffacd',
      '#fef5e7',
      '#f5deb3',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Random text color (mostly black/dark)
  const randomTextColor = (): string => {
    const colors = ['#000', '#1a1a1a', '#2c2c2c', '#222', '#111', '#333'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Generate 18 letters with varied properties
  const letterCount = 18;
  const letters: RenderableComponentData[] = [];

  for (let i = 0; i < letterCount; i++) {
    const letterId = `letter-${i + 1}`;
    const letterTextId = `${letterId}-text`;
    const position = randomPosition();
    const rotation = randomRotation();
    const fontSize = randomFontSize();
    const fontFamily = randomFont();
    const paperColor = randomPaperColor();
    const textColor = randomTextColor();
    const letter = randomLetter();

    // Determine if this letter should stick to edge (last 3 letters)
    const isEdgeLetter = i >= letterCount - 3;
    const letterDuration = isEdgeLetter
      ? transitionDuration + 0.4
      : 2.3 + Math.random() * 0.4;

    // Determine if letter has tape
    const hasTape = Math.random() > 0.5;

    // Create letter container
    const letterContainer: RenderableComponentData = {
      id: letterId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: position.top,
            left: position.left,
            transform: `rotate(${rotation}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: letterDuration,
        },
      },
      childrenData: [],
    };

    // Create letter text
    const letterText: RenderableComponentData = {
      id: letterTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: letter,
        style: {
          fontSize: fontSize,
          fontFamily: fontFamily,
          color: textColor,
          backgroundColor: paperColor,
          padding: '8px 12px',
          boxShadow: '3px 3px 8px rgba(0,0,0,0.3)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: letterDuration,
        },
      },
      effects: [
        {
          id: `${letterTextId}-effect`,
          componentId: 'generic',
          data: {
            type: 'steps',
            steps: 2,
            start: 0,
            duration: letterDuration,
            mode: 'provider',
            targetIds: [letterTextId],
            ranges: [
              // Opacity animation
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.1 + Math.random() * 0.1 },
              {
                key: 'opacity',
                val: 1,
                prog: isEdgeLetter ? 1 : 0.85 + Math.random() * 0.05,
              },
              { key: 'opacity', val: isEdgeLetter ? 1 : 0, prog: 1 },
              // Scale animation
              { key: 'scale', val: 0.8 + Math.random() * 0.05, prog: 0 },
              { key: 'scale', val: 1.05 + Math.random() * 0.1, prog: 0.5 },
              {
                key: 'scale',
                val: isEdgeLetter ? 1 : 0.85 + Math.random() * 0.05,
                prog: 1,
              },
              // Rotation wobble
              { key: 'rotate', val: rotation, prog: 0 },
              {
                key: 'rotate',
                val: rotation + (-10 + Math.random() * 20),
                prog: 0.5,
              },
              {
                key: 'rotate',
                val: rotation + (-10 + Math.random() * 20),
                prog: 1,
              },
            ],
          },
        },
      ],
    };

    letterContainer.childrenData = [letterText];

    // Add tape if applicable
    if (hasTape) {
      const tapeId = `tape-${i + 1}`;
      const tapeWidth = 40 + Math.random() * 20;
      const tapeHeight = 15 + Math.random() * 5;
      const tapeTop = -5 - Math.random() * 5;
      const tapeLeft = Math.random() > 0.5 ? 5 + Math.random() * 10 : undefined;
      const tapeRight =
        tapeLeft === undefined ? 3 + Math.random() * 5 : undefined;
      const tapeRotation = -30 + Math.random() * 60;

      const tape: RenderableComponentData = {
        id: tapeId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='position: absolute; top: ${tapeTop}px; ${tapeLeft !== undefined ? `left: ${tapeLeft}px;` : `right: ${tapeRight}px;`} width: ${tapeWidth}px; height: ${tapeHeight}px; background-color: rgba(255, 235, 140, 0.6); transform: rotate(${tapeRotation}deg);'></div>`,
          className: 'absolute',
        },
        context: {
          timing: {
            start: 0,
            duration: letterDuration,
          },
        },
      };

      letterContainer.childrenData!.push(tape);
    }

    letters.push(letterContainer);
  }

  // Create outgoing video (fades out)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video (at z-0, revealed as letters clear)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Create letters container
  const lettersContainer: RenderableComponentData = {
    id: 'letters-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: letters,
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'ransom-note-transition-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: [incomingVideo, outgoingVideo, lettersContainer],
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
  id: 'ransom-note-transition',
  title: 'Ransom Note Style Transition',
  description:
    'A chaotic collage transition featuring cut-out letters and paper pieces that randomly appear and disappear with different fonts, sizes, and rotations. Letters animate with jerky stop-motion style movements, tape strips, and create a frenetic ransom note aesthetic as the incoming video reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'ransom-note',
    'collage',
    'chaotic',
    'kinetic',
    'stop-motion',
    'letters',
    'glitch',
    'edgy',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 2.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const ransomNoteTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
