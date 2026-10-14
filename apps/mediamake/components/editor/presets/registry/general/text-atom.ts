/**
 * Text Atom
 *
 * A single text atom inserted directly into its parent. Track name, timing,
 * lock, and attachedToId come from the shared track shell.
 */

import z from 'zod';
import { definePreset } from '../../define-preset';

const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  color: z.string().optional().describe('Text color'),
  fontSize: z.number().optional().describe('Font size in pixels'),
});

const presetExecution = (params: {
  text?: string;
  color?: string;
  fontSize?: number;
}) => {
  return {
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: params.text || '',
      style: {
        color: params.color || '#FFFFFF',
        fontSize: params.fontSize || 48,
      },
      font: {
        family: 'Inter',
        weights: ['600'],
      },
    },
  };
};

const textAtomPreset = definePreset({
  placement: 'atom',
  metadata: {
    id: 'text-atom',
    title: 'Text Atom',
    description:
      'A single text atom inserted directly into its parent, with no container block.',
    type: 'predefined',
    presetType: 'children',
    role: 'track',
    tags: ['text', 'atom'],
    defaultInputParams: {
      trackName: 'text-atom',
      trackType: 'aligned',
      start: 0,
      duration: 5,
      attachedToId: 'BaseScene',
      text: 'Hello',
      color: '#FFFFFF',
      fontSize: 48,
    },
  },
  params: presetParams,
  build: presetExecution,
});

export { textAtomPreset };
