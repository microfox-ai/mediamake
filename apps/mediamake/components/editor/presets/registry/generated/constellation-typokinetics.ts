/**
 * Constellation Typokinetics Preset
 *
 * Letters form from connected star points like drawing constellations in the night sky.
 * Each letter starts with 5-7 glowing dots positioned at key structural points. These dots
 * pulse and gradually draw light beams between them via animated SVG paths. As the connections
 * complete, the full letter fades in while the constellation framework fades out. Letters
 * shimmer after formation like starlight twinkling, with subtle parallax float at different
 * speeds for cosmic depth.
 *
 * Features:
 * - Star dots appear staggered at letter vertices (0.1s per dot)
 * - SVG connection lines draw between stars (stroke-dashoffset animation)
 * - Full letter fades in at ~60% of constellation animation
 * - Constellation framework fades out as letter appears
 * - Post-formation shimmer effect (2-4s random duration per letter)
 * - Parallax float effect for cosmic depth (±3px foreground, ±1px background)
 * - Letter stagger: index * 0.15s
 * - Total formation per letter: 2.5s
 *
 * Use cases:
 * - Animated text titles with constellation effects
 * - Cosmic/space themed typography
 * - Dynamic text reveals with depth
 * - Night sky themed animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text to display with constellation effect'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the final text'),
  starColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the constellation star dots'),
  connectionColor: z
    .string()
    .default('#6496ff')
    .describe('Color of the connection lines between stars'),
  font: z
    .string()
    .optional()
    .default('Inter:300')
    .describe(
      'Font family with optional weight (e.g., "Inter:300", "Roboto:400")',
    ),
  formationDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of constellation formation per letter in seconds'),
  letterStagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Stagger delay between letters in seconds'),
  shimmerIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Minimum opacity during shimmer (0.1-1)'),
  parallaxIntensity: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Parallax movement intensity in pixels'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    textColor,
    starColor,
    connectionColor,
    font,
    formationDuration,
    letterStagger,
    shimmerIntensity,
    parallaxIntensity,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = font || 'Inter:300';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 300;

  // Helper: Get letter-specific star positions (normalized 0-1)
  const getStarPositions = (letter: string): Array<{ x: number; y: number; z: number }> => {
    // Returns normalized positions (0-1 range) for each letter
    // z indicates depth layer (1=foreground, 2=middle, 3=background)
    const positions: Record<string, Array<{ x: number; y: number; z: number }>> = {
      A: [
        { x: 0.5, y: 0.1, z: 1 }, // top
        { x: 0.2, y: 0.9, z: 2 }, // bottom left
        { x: 0.8, y: 0.9, z: 2 }, // bottom right
        { x: 0.35, y: 0.5, z: 3 }, // mid left
        { x: 0.65, y: 0.5, z: 3 }, // mid right
      ],
      B: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.7, y: 0.25, z: 3 },
        { x: 0.7, y: 0.75, z: 3 },
      ],
      C: [
        { x: 0.7, y: 0.15, z: 1 },
        { x: 0.3, y: 0.15, z: 2 },
        { x: 0.2, y: 0.5, z: 1 },
        { x: 0.3, y: 0.85, z: 2 },
        { x: 0.7, y: 0.85, z: 1 },
      ],
      D: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.6, y: 0.2, z: 3 },
        { x: 0.7, y: 0.5, z: 2 },
        { x: 0.6, y: 0.8, z: 3 },
      ],
      E: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.7, y: 0.1, z: 2 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.6, y: 0.5, z: 3 },
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.7, y: 0.9, z: 2 },
      ],
      F: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.7, y: 0.1, z: 2 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.6, y: 0.5, z: 3 },
        { x: 0.2, y: 0.9, z: 1 },
      ],
      G: [
        { x: 0.7, y: 0.15, z: 1 },
        { x: 0.3, y: 0.15, z: 2 },
        { x: 0.2, y: 0.5, z: 1 },
        { x: 0.3, y: 0.85, z: 2 },
        { x: 0.7, y: 0.85, z: 1 },
        { x: 0.7, y: 0.6, z: 3 },
        { x: 0.5, y: 0.6, z: 3 },
      ],
      H: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.7, y: 0.1, z: 1 },
        { x: 0.7, y: 0.5, z: 2 },
        { x: 0.7, y: 0.9, z: 1 },
      ],
      I: [
        { x: 0.5, y: 0.1, z: 1 },
        { x: 0.5, y: 0.3, z: 2 },
        { x: 0.5, y: 0.5, z: 2 },
        { x: 0.5, y: 0.7, z: 2 },
        { x: 0.5, y: 0.9, z: 1 },
      ],
      J: [
        { x: 0.7, y: 0.1, z: 1 },
        { x: 0.7, y: 0.5, z: 2 },
        { x: 0.7, y: 0.75, z: 2 },
        { x: 0.5, y: 0.9, z: 1 },
        { x: 0.3, y: 0.85, z: 3 },
      ],
      K: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.7, y: 0.15, z: 2 },
        { x: 0.5, y: 0.5, z: 3 },
        { x: 0.7, y: 0.85, z: 2 },
      ],
      L: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.5, y: 0.9, z: 2 },
        { x: 0.7, y: 0.9, z: 1 },
      ],
      M: [
        { x: 0.15, y: 0.9, z: 1 },
        { x: 0.15, y: 0.5, z: 2 },
        { x: 0.15, y: 0.1, z: 1 },
        { x: 0.5, y: 0.4, z: 3 },
        { x: 0.85, y: 0.1, z: 1 },
        { x: 0.85, y: 0.5, z: 2 },
        { x: 0.85, y: 0.9, z: 1 },
      ],
      N: [
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.5, y: 0.5, z: 3 },
        { x: 0.7, y: 0.1, z: 1 },
        { x: 0.7, y: 0.5, z: 2 },
        { x: 0.7, y: 0.9, z: 1 },
      ],
      O: [
        { x: 0.5, y: 0.1, z: 1 },
        { x: 0.3, y: 0.2, z: 2 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.3, y: 0.8, z: 2 },
        { x: 0.5, y: 0.9, z: 1 },
        { x: 0.7, y: 0.8, z: 2 },
        { x: 0.8, y: 0.5, z: 2 },
        { x: 0.7, y: 0.2, z: 2 },
      ],
      P: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.6, y: 0.15, z: 2 },
        { x: 0.7, y: 0.35, z: 3 },
        { x: 0.6, y: 0.5, z: 2 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.2, y: 0.9, z: 1 },
      ],
      Q: [
        { x: 0.5, y: 0.1, z: 1 },
        { x: 0.3, y: 0.2, z: 2 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.3, y: 0.8, z: 2 },
        { x: 0.5, y: 0.9, z: 1 },
        { x: 0.7, y: 0.8, z: 2 },
        { x: 0.8, y: 0.5, z: 2 },
        { x: 0.7, y: 0.2, z: 2 },
        { x: 0.75, y: 0.85, z: 3 },
      ],
      R: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.6, y: 0.15, z: 2 },
        { x: 0.7, y: 0.35, z: 3 },
        { x: 0.6, y: 0.5, z: 2 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.7, y: 0.85, z: 2 },
      ],
      S: [
        { x: 0.7, y: 0.15, z: 1 },
        { x: 0.4, y: 0.15, z: 2 },
        { x: 0.3, y: 0.35, z: 3 },
        { x: 0.5, y: 0.5, z: 2 },
        { x: 0.7, y: 0.65, z: 3 },
        { x: 0.6, y: 0.85, z: 2 },
        { x: 0.3, y: 0.85, z: 1 },
      ],
      T: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.5, y: 0.1, z: 2 },
        { x: 0.8, y: 0.1, z: 1 },
        { x: 0.5, y: 0.4, z: 2 },
        { x: 0.5, y: 0.7, z: 2 },
        { x: 0.5, y: 0.9, z: 1 },
      ],
      U: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.3, y: 0.8, z: 2 },
        { x: 0.5, y: 0.9, z: 1 },
        { x: 0.7, y: 0.8, z: 2 },
        { x: 0.8, y: 0.5, z: 2 },
        { x: 0.8, y: 0.1, z: 1 },
      ],
      V: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.3, y: 0.5, z: 2 },
        { x: 0.5, y: 0.9, z: 1 },
        { x: 0.7, y: 0.5, z: 2 },
        { x: 0.8, y: 0.1, z: 1 },
      ],
      W: [
        { x: 0.15, y: 0.1, z: 1 },
        { x: 0.2, y: 0.5, z: 2 },
        { x: 0.3, y: 0.9, z: 1 },
        { x: 0.5, y: 0.6, z: 3 },
        { x: 0.7, y: 0.9, z: 1 },
        { x: 0.8, y: 0.5, z: 2 },
        { x: 0.85, y: 0.1, z: 1 },
      ],
      X: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.4, y: 0.35, z: 2 },
        { x: 0.5, y: 0.5, z: 3 },
        { x: 0.6, y: 0.65, z: 2 },
        { x: 0.8, y: 0.9, z: 1 },
        { x: 0.8, y: 0.1, z: 1 },
        { x: 0.2, y: 0.9, z: 1 },
      ],
      Y: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.4, y: 0.35, z: 2 },
        { x: 0.5, y: 0.5, z: 3 },
        { x: 0.6, y: 0.35, z: 2 },
        { x: 0.8, y: 0.1, z: 1 },
        { x: 0.5, y: 0.7, z: 2 },
        { x: 0.5, y: 0.9, z: 1 },
      ],
      Z: [
        { x: 0.2, y: 0.1, z: 1 },
        { x: 0.5, y: 0.1, z: 2 },
        { x: 0.8, y: 0.1, z: 1 },
        { x: 0.6, y: 0.4, z: 3 },
        { x: 0.4, y: 0.6, z: 3 },
        { x: 0.2, y: 0.9, z: 1 },
        { x: 0.5, y: 0.9, z: 2 },
        { x: 0.8, y: 0.9, z: 1 },
      ],
      // Fallback for unknown letters/characters
      default: [
        { x: 0.3, y: 0.2, z: 1 },
        { x: 0.7, y: 0.2, z: 2 },
        { x: 0.7, y: 0.5, z: 2 },
        { x: 0.7, y: 0.8, z: 1 },
        { x: 0.3, y: 0.8, z: 1 },
      ],
    };

    const upperLetter = letter.toUpperCase();
    return positions[upperLetter] || positions.default;
  };

  // Helper: Generate connection paths between stars
  const generateConnections = (
    positions: Array<{ x: number; y: number; z: number }>,
  ): Array<{ from: number; to: number }> => {
    // Simple strategy: connect each star to the next (chain)
    const connections: Array<{ from: number; to: number }> = [];
    for (let i = 0; i < positions.length - 1; i++) {
      connections.push({ from: i, to: i + 1 });
    }
    // Optionally close the loop for some letters
    if (positions.length > 4) {
      connections.push({ from: positions.length - 1, to: 0 });
    }
    return connections;
  };

  // Split text into letters
  const letters = text.split('');
  const letterWidth = fontSize * 0.7; // Approximate width per letter
  const letterSpacing = fontSize * 0.2;
  const letterHeight = fontSize * 1.4;

  // Build letter components
  const letterComponents: RenderableComponentData[] = letters.map((letter, letterIndex) => {
    if (letter === ' ') {
      // Space character - empty container
      return {
        id: `constellation-space-${letterIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: `${letterWidth * 0.5}px`,
              height: `${letterHeight}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData;
    }

    const starPositions = getStarPositions(letter);
    const connections = generateConnections(starPositions);
    const letterStartTime = letterIndex * letterStagger;

    // Create star dots
    const starDots: RenderableComponentData[] = starPositions.map((pos, dotIndex) => {
      const dotId = `constellation-star-${letterIndex}-${dotIndex}`;
      const dotSize = pos.z === 1 ? 8 : pos.z === 2 ? 7 : 6;
      const glowIntensity = pos.z === 1 ? 1 : pos.z === 2 ? 0.8 : 0.6;

      return {
        id: dotId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${dotSize}px; height: ${dotSize}px; border-radius: 50%; background: ${starColor}; box-shadow: 0 0 ${12 * glowIntensity}px ${4 * glowIntensity}px rgba(255,255,255,${0.8 * glowIntensity}), 0 0 ${20 * glowIntensity}px ${8 * glowIntensity}px rgba(100,150,255,${0.5 * glowIntensity});"></div>`,
          className: 'absolute',
          style: {
            left: `${pos.x * 100}%`,
            top: `${pos.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10 + pos.z,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `star-appear-${dotId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              mode: 'provider',
              targetIds: [dotId],
              start: dotIndex * 0.1 + (pos.z - 1) * 0.05, // Stagger by dot index + depth
              duration: 0.4,
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.2, prog: 0.7 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });

    // Create connection lines (SVG paths)
    const svgPaths = connections
      .map((conn) => {
        const from = starPositions[conn.from];
        const to = starPositions[conn.to];
        const x1 = from.x * 100;
        const y1 = from.y * 100;
        const x2 = to.x * 100;
        const y2 = to.y * 100;
        const pathLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="url(#starGradient-${letterIndex})" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="${pathLength}" stroke-dashoffset="${pathLength}" style="animation: draw-line-${letterIndex}-${conn.from}-${conn.to} 1.2s ease-in-out forwards; animation-delay: ${0.3 + conn.from * 0.1}s;"/>`;
      })
      .join('');

    const svgHtml = `
      <svg class="absolute inset-0 w-full h-full" style="pointer-events: none;">
        <defs>
          <linearGradient id="starGradient-${letterIndex}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${connectionColor}" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="${starColor}" stop-opacity="0.9"/>
          </linearGradient>
        </defs>
        ${svgPaths}
      </svg>
      <style>
        @keyframes draw-line-${letterIndex}-${connections.map((c) => `${c.from}-${c.to}`).join('-')} {
          to { stroke-dashoffset: 0; }
        }
      </style>
    `;

    const connectionsComponent: RenderableComponentData = {
      id: `constellation-connections-${letterIndex}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgHtml,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 5,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `connections-fadeout-${letterIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            mode: 'provider',
            targetIds: [`constellation-connections-${letterIndex}`],
            start: 1.8,
            duration: 0.7,
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;

    // Create final letter text
    const letterTextId = `constellation-letter-${letterIndex}`;
    const shimmerDuration = 2 + Math.random() * 2; // 2-4s random
    const parallaxOffset = parallaxIntensity * (3 - starPositions[0]?.z || 1); // Depth-based parallax

    const letterTextComponent: RenderableComponentData = {
      id: letterTextId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          textShadow: `0 0 20px rgba(100,150,255,0.6), 0 0 40px rgba(100,150,255,0.3)`,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        // Fade in
        {
          id: `letter-fadein-${letterIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            mode: 'provider',
            targetIds: [letterTextId],
            start: 1.5,
            duration: 0.8,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Shimmer
        {
          id: `letter-shimmer-${letterIndex}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            mode: 'provider',
            targetIds: [letterTextId],
            start: formationDuration,
            duration: shimmerDuration,
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: shimmerIntensity, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Parallax float
        {
          id: `letter-parallax-${letterIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            mode: 'provider',
            targetIds: [letterTextId],
            start: formationDuration,
            duration: 6,
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: parallaxOffset, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: parallaxOffset * 0.7, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;

    // Constellation framework fade out group
    const constellationGroupId = `constellation-framework-${letterIndex}`;
    const constellationGroup: RenderableComponentData = {
      id: constellationGroupId,
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
          duration: duration,
        },
      },
      childrenData: [...starDots, connectionsComponent],
      effects: [
        {
          id: `framework-fadeout-${letterIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            mode: 'provider',
            targetIds: [constellationGroupId],
            start: 1.8,
            duration: 0.7,
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;

    // Letter container
    return {
      id: `constellation-letter-container-${letterIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            width: `${letterWidth}px`,
            height: `${letterHeight}px`,
          },
        },
      },
      context: {
        timing: {
          start: letterStartTime,
          duration: duration - letterStartTime,
        },
      },
      childrenData: [constellationGroup, letterTextComponent],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'constellation-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          background: 'linear-gradient(to bottom, #0a0a1a, #000010)',
          gap: `${letterSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: letterComponents,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'constellationTypokinetics',
  title: 'Constellation Typokinetics',
  description:
    'Letters form from connected star points like drawing constellations in the night sky. Features glowing dots at letter vertices, animated connection lines, letter fade-in, constellation fade-out, shimmer effects, and parallax float for cosmic depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'constellation',
    'stars',
    'cosmic',
    'animated',
    'night-sky',
    'kinetic',
    'shimmer',
    'parallax',
    'text-reveal',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'COSMIC',
    duration: 10,
    fontSize: 80,
    textColor: '#ffffff',
    starColor: '#ffffff',
    connectionColor: '#6496ff',
    font: 'Inter:300',
    formationDuration: 2.5,
    letterStagger: 0.15,
    shimmerIntensity: 0.7,
    parallaxIntensity: 3,
  },
};

// --- Export ---

export const constellationTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
