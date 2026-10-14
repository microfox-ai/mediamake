/**
 * Scene preset
 *
 * The only preset that may contain other presets. Arrangement `sequence`
 * plays children one after another and can hug their combined duration.
 * Arrangement `aligned` overlaps children and requires a duration.
 * Start, duration, and locks live on the instance, not in this function.
 */

import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  arrangement: z.enum(['sequence', 'aligned']).default('aligned'),
  backgroundColor: z.string().optional(),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  const arrangement = params.arrangement ?? 'aligned';
  return {
    output: {
      childrenData: [
        {
          id: 'scene',
          componentId: 'BaseLayout',
          type: arrangement === 'sequence' ? 'scene' : 'layout',
          data: params.backgroundColor
            ? { style: { backgroundColor: params.backgroundColor } }
            : {},
          context: { timing: { start: 0 } },
          childrenData: [],
        },
      ],
    } as Partial<InputCompositionProps>,
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'scene',
  title: 'Scene',
  description:
    'Groups other presets. Sequence hugs child durations. Aligned scenes need a duration. Only a scene can contain nested presets.',
  type: 'predefined',
  presetType: 'children',
  role: 'scene',
  tags: ['scene', 'group', 'nest'],
  defaultInputParams: {
    arrangement: 'aligned',
  },
};

const scenePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};

export { scenePreset };
