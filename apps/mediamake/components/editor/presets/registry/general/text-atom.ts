/**
 * Text Atom
 *
 * A single text atom inserted directly into its parent. Track name, timing,
 * lock, and attachedToId come from the shared track shell.
 */

import z from 'zod';
import { paramInputTypes, paramMetaTypes } from '../../dataTypes';
import { ATOM_FILL_STYLE, definePreset } from '../../define-preset';

const presetParams = z.object({
  text: z
    .string()
    .meta({ [paramMetaTypes.inputType]: paramInputTypes.textarea })
    .describe('Text content to display'),
  style: z
    .object({
      color: z
        .string()
        .optional()
        .meta({ [paramMetaTypes.inputType]: paramInputTypes.color })
        .describe('Text color'),
    })
    .loose()
    .optional()
    .meta({
      [paramMetaTypes.textStyle]: true,
      [paramMetaTypes.blockStyle]: true,
      [paramMetaTypes.positionStyle]: true,
    })
    .describe('Style'),
});

const presetExecution = (params: {
  text?: string;
  style?: Record<string, unknown>;
  color?: string;
  fontSize?: number;
}) => {
  const style: Record<string, unknown> = {
    color: params.color || '#FFFFFF',
    fontSize: params.fontSize || 64,
    fontFamily: 'Inter',
    fontWeight: 600,
    ...(params.style && typeof params.style === 'object' ? params.style : {}),
  };

  return {
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: params.text || '',
      style,
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
      containerProps: { style: { ...ATOM_FILL_STYLE } },
      text: 'Hello',
      style: {
        color: '#FFFFFF',
        fontSize: 64,
        fontFamily: 'Inter',
        fontWeight: 600,
      },
    },
  },
  params: presetParams,
  build: presetExecution,
});

export { textAtomPreset };
