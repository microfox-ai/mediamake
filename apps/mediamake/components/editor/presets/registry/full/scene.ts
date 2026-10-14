/**
 * Scene preset
 *
 * The only preset that may contain other presets. Timing and placement follow
 * a media track: sequence hugs children, aligned uses start and duration, and
 * auto range starts at the first child and ends at the last, the same way the
 * base scene does. Lock can target a sibling, a parent, or a child. Locking
 * to a child trims this scene to that child. A negative startOffset trims the
 * head without moving the end.
 * The container can be positioned like a media track.
 *
 * Track name, timing, lock, and attachedToId come from the shared track shell.
 */

import z from 'zod';
import { paramMetaTypes } from '../../dataTypes';
import { definePreset, type TrackShellParams } from '../../define-preset';

const presetParams = z.object({
  backgroundColor: z.string().optional(),
  containerObject: z
    .object({
      left: z
        .number()
        .optional()
        .describe('Container left position in pixels or percentage'),
      top: z
        .number()
        .optional()
        .describe('Container top position in pixels or percentage'),
      right: z
        .number()
        .optional()
        .describe('Container right position in pixels or percentage'),
      bottom: z
        .number()
        .optional()
        .describe('Container bottom position in pixels or percentage'),
      width: z.number().optional().describe('Container width in pixels'),
      height: z.number().optional().describe('Container height in pixels'),
      positioning: z
        .enum([
          'top-left',
          'top-center',
          'top-right',
          'center-left',
          'center',
          'center-right',
          'bottom-left',
          'bottom-center',
          'bottom-right',
        ])
        .optional()
        .describe('Anchor position within the parent'),
    })
    .optional()
    .meta({ [paramMetaTypes.containerObject]: true })
    .describe(
      'Container layout (insets, size, positioning). Omit a field to leave unset.',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams> & TrackShellParams,
) => {
  const applyPositioning = (
    positioning: string | undefined,
  ): Record<string, string | number> => {
    switch (positioning) {
      case 'top-left':
        return { top: 0, left: 0 };
      case 'top-center':
        return { top: 0, left: '50%', transform: 'translateX(-50%)' };
      case 'top-right':
        return { top: 0, right: 0 };
      case 'center-left':
        return { top: '50%', left: 0, transform: 'translateY(-50%)' };
      case 'center':
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'center-right':
        return { top: '50%', right: 0, transform: 'translateY(-50%)' };
      case 'bottom-left':
        return { bottom: 0, left: 0 };
      case 'bottom-center':
        return { bottom: 0, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
        return { bottom: 0, right: 0 };
      default:
        return {};
    }
  };

  const container = params.containerObject ?? {};
  const containerStyle: Record<string, string | number> = {
    ...applyPositioning(container.positioning),
  };
  if (container.left !== undefined) containerStyle.left = container.left;
  if (container.top !== undefined) containerStyle.top = container.top;
  if (container.right !== undefined) containerStyle.right = container.right;
  if (container.bottom !== undefined) containerStyle.bottom = container.bottom;
  if (container.width !== undefined) containerStyle.width = container.width;
  if (container.height !== undefined) containerStyle.height = container.height;
  if (params.backgroundColor) containerStyle.backgroundColor = params.backgroundColor;
  const positioned = Object.keys(containerStyle).some(
    (key) => key !== 'backgroundColor',
  );
  const containerProps = {
    className: positioned ? 'absolute' : 'absolute inset-0',
    ...(Object.keys(containerStyle).length > 0 ? { style: containerStyle } : {}),
  };

  return {
    children: [],
    containerProps,
  };
};

const scenePreset = definePreset({
  placement: 'container',
  trackModes: ['lockedTo', 'sequence', 'aligned', 'autoRange'],
  metadata: {
    id: 'scene',
    title: 'Scene',
    description:
      'Groups other presets. Sequence hugs child durations. Aligned scenes use a start and duration. Auto range starts at the first child and ends at the last. Lock can follow a sibling, a parent, or a child, and locking to a child trims the scene to that child. Position the container the same way as a media track.',
    type: 'predefined',
    presetType: 'children',
    role: 'scene',
    tags: ['scene', 'group', 'nest'],
    defaultInputParams: {
      trackName: 'scene',
      trackType: 'aligned',
      start: 0,
      duration: 10,
      attachedToId: 'BaseScene',
    },
  },
  params: presetParams,
  build: presetExecution,
});

export { scenePreset };
