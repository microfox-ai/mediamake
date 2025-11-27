# Transition Preset Guide

## 1. Understanding Transitions

### What is a Transition?

A **transition** is the visual effect that occurs when switching between media items (images, videos, or audio). It's the "coincidence" or overlap period where both the outgoing and incoming media are visible simultaneously, and visual effects play out to create a smooth or stylized change.

### Key Concepts

1. **Media Items Have Built-in Duration**: Each media item comes with its own duration

   ```typescript
   media: {
     src: string,
     type: 'image' | 'video' | 'audio',
     duration: number,  // Duration in seconds
   }
   ```

2. **Single BaseLayout Container**: All media atoms exist within a single `BaseLayout` container

3. **BaseLayout Duration**:
   - For simple sequential playback: `BaseLayout duration = media1.duration + media2.duration`
   - For transitions with overlap: `BaseLayout duration = media1.duration + media2.duration - overlapDuration`
   - For complex transitions: May be transition-specific based on effect requirements

4. **Overlap Period**: The transition happens during the time when both media items are visible simultaneously

## 2. Transition Architecture

### Basic Structure

```typescript
{
  id: 'transition-container',
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
      duration: media1.duration + media2.duration, // Or adjusted for overlap
    },
  },
  childrenData: [
    // Outgoing media (media1)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: 'VideoAtom', // or ImageAtom
      data: { src: media1.src, /* ... */ },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Fade out effect during transition
      ],
    },
    // Incoming media (media2)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: 'VideoAtom', // or ImageAtom
      data: { src: media2.src, /* ... */ },
      context: {
        timing: {
          start: media1.duration - overlapDuration, // Overlap starts before media1 ends
          duration: media2.duration + overlapDuration, // Extends into overlap
        },
      },
      effects: [
        // Fade in effect during transition
      ],
    },
  ],
}
```

## 3. Timing Calculation Patterns

### Pattern 1: Simple Sequential (No Overlap)

When media items play one after another without transition:

```typescript
const media1 = { src: 'video1.mp4', duration: 5 };
const media2 = { src: 'video2.mp4', duration: 3 };

// BaseLayout duration = sum of all media durations
const baseLayoutDuration = media1.duration + media2.duration; // 8 seconds

const childrenData = [
  {
    id: 'media1',
    context: {
      timing: {
        start: 0,
        duration: media1.duration, // 0-5s
      },
    },
  },
  {
    id: 'media2',
    context: {
      timing: {
        start: media1.duration, // 5s
        duration: media2.duration, // 5-8s
      },
    },
  },
];
```

### Pattern 2: Overlapping Transition

When media items overlap for transition effects:

```typescript
const media1 = { src: 'video1.mp4', duration: 5 };
const media2 = { src: 'video2.mp4', duration: 3 };
const transitionDuration = 1.0; // 1 second overlap

// BaseLayout duration = sum minus overlap (to avoid extending total time)
const baseLayoutDuration =
  media1.duration + media2.duration - transitionDuration; // 7 seconds

const childrenData = [
  {
    id: 'outgoing-media',
    context: {
      timing: {
        start: 0,
        duration: media1.duration, // 0-5s (full duration)
      },
    },
    effects: [
      {
        // Fade out during last second
        id: 'fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: media1.duration - transitionDuration, // Start at 4s
          duration: transitionDuration, // 1 second
          mode: 'wrapper',
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'incoming-media',
    context: {
      timing: {
        start: media1.duration - transitionDuration, // Start at 4s (overlap begins)
        duration: media2.duration + transitionDuration, // 4 seconds total (1s overlap + 3s normal)
      },
    },
    effects: [
      {
        // Fade in during first second
        id: 'fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming media start (4s in video)
          duration: transitionDuration, // 1 second
          mode: 'wrapper',
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  },
];
```

**Timeline Visualization:**

```
0s ────────────────────────────────── 5s ──────────── 7s
│                                      │               │
│  media1 (outgoing)                   │               │
│  [████████████████████████████████] │               │
│                                      │               │
│                                      │ media2 (incoming)
│                                      │ [████████████]
│                                      │
│  Transition overlap: 4s-5s          │
│  [████████████████████████████████] │
│                                      │
│  Fade out: 4s-5s                    │
│  Fade in:  4s-5s                    │
```

### Pattern 3: Centered Overlap

When transition is centered between media items:

```typescript
const media1 = { src: 'video1.mp4', duration: 5 };
const media2 = { src: 'video2.mp4', duration: 3 };
const transitionDuration = 1.0;

// Incoming media starts centered on the transition point
const transitionStart = media1.duration - transitionDuration / 2; // 4.5s
const incomingStart = transitionStart; // 4.5s

const childrenData = [
  {
    id: 'outgoing-media',
    context: {
      timing: {
        start: 0,
        duration: media1.duration, // 0-5s
      },
    },
    effects: [
      {
        // Fade out centered on transition
        id: 'fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart - transitionDuration / 2, // 4s
          duration: transitionDuration, // 1s
          mode: 'wrapper',
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  },
  {
    id: 'incoming-media',
    context: {
      timing: {
        start: incomingStart, // 4.5s
        duration: media2.duration + transitionDuration / 2, // 3.5s
      },
    },
    effects: [
      {
        // Fade in centered on transition
        id: 'fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming start (4.5s in video)
          duration: transitionDuration, // 1s
          mode: 'wrapper',
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  },
];
```

## 4. Transition Types

### Type 1: Fade Transition

Simple crossfade between two media items:

```typescript
const createFadeTransition = (
  media1: { src: string; duration: number },
  media2: { src: string; duration: number },
  transitionDuration: number = 1.0,
) => {
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  return {
    id: 'fade-transition-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-media',
        type: 'atom',
        componentId: media1.src.match(/\.(mp4|webm|mov)$/i)
          ? 'VideoAtom'
          : 'ImageAtom',
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
        effects: [
          {
            id: 'fade-out-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: media1.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'wrapper',
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
      {
        id: 'incoming-media',
        type: 'atom',
        componentId: media2.src.match(/\.(mp4|webm|mov)$/i)
          ? 'VideoAtom'
          : 'ImageAtom',
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: media1.duration - transitionDuration,
            duration: media2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'fade-in-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'wrapper',
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };
};
```

### Type 2: Slide/Wipe Transition

Media slides in from a direction while outgoing media slides out:

```typescript
const createSlideTransition = (
  media1: { src: string; duration: number },
  media2: { src: string; duration: number },
  direction: 'left' | 'right' | 'up' | 'down' = 'right',
  transitionDuration: number = 1.0,
) => {
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Calculate translate values based on direction
  const getTranslateValues = (dir: string) => {
    const viewportWidth = 1920; // Get from props.config
    const viewportHeight = 1080;
    switch (dir) {
      case 'left':
        return { outgoing: '0px', incoming: '-100%' };
      case 'right':
        return { outgoing: '0px', incoming: '100%' };
      case 'up':
        return { outgoing: '0px', incoming: '-100%' };
      case 'down':
        return { outgoing: '0px', incoming: '100%' };
      default:
        return { outgoing: '0px', incoming: '100%' };
    }
  };

  const translateKey =
    direction === 'left' || direction === 'right' ? 'translateX' : 'translateY';
  const { outgoing, incoming } = getTranslateValues(direction);

  return {
    id: 'slide-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-media',
        type: 'atom',
        componentId: media1.src.match(/\.(mp4|webm|mov)$/i)
          ? 'VideoAtom'
          : 'ImageAtom',
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
        effects: [
          {
            id: 'slide-out-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: media1.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'wrapper',
              ranges: [
                { key: translateKey, val: '0px', prog: 0 },
                { key: translateKey, val: outgoing, prog: 1 },
              ],
            },
          },
        ],
      },
      {
        id: 'incoming-media',
        type: 'atom',
        componentId: media2.src.match(/\.(mp4|webm|mov)$/i)
          ? 'VideoAtom'
          : 'ImageAtom',
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: media1.duration - transitionDuration,
            duration: media2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'slide-in-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'wrapper',
              ranges: [
                { key: translateKey, val: incoming, prog: 0 },
                { key: translateKey, val: '0px', prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };
};
```

### Type 3: Mask/Blend Mode Transition

Using a third media item or shape as an alpha mask or blend mode layer:

```typescript
const createMaskTransition = (
  media1: { src: string; duration: number },
  media2: { src: string; duration: number },
  maskMedia: { src: string; duration: number }, // Mask/wipe layer
  transitionDuration: number = 1.0,
) => {
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  return {
    id: 'mask-transition-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      // Outgoing media (bottom layer)
      {
        id: 'outgoing-media',
        type: 'atom',
        componentId: media1.src.match(/\.(mp4|webm|mov)$/i)
          ? 'VideoAtom'
          : 'ImageAtom',
        data: {
          src: media1.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media1.duration,
          },
        },
      },
      // Incoming media (middle layer)
      {
        id: 'incoming-media',
        type: 'atom',
        componentId: media2.src.match(/\.(mp4|webm|mov)$/i)
          ? 'VideoAtom'
          : 'ImageAtom',
        data: {
          src: media2.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: media1.duration - transitionDuration,
            duration: media2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'mask-reveal-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'wrapper',
              ranges: [
                { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
                { key: 'clipPath', val: 'inset(0% 0 0 0)', prog: 1 },
              ],
            },
          },
        ],
      },
      // Mask/wipe layer (top layer)
      {
        id: 'mask-layer',
        type: 'atom',
        componentId: maskMedia.src.match(/\.(mp4|webm|mov)$/i)
          ? 'VideoAtom'
          : 'ImageAtom',
        data: {
          src: maskMedia.src,
          className: 'w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen', // or 'multiply', 'overlay', etc.
            opacity: 0.8,
          },
        },
        context: {
          timing: {
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'mask-animation-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'wrapper',
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };
};
```

### Type 4: Grid/Multi-Item Transition

When transitioning between multiple media items in a grid layout:

```typescript
const createGridTransition = (
  mediaItems: Array<{ src: string; duration: number }>,
  gridCols: number = 2,
  gridRows: number = 2,
  transitionDuration: number = 1.0,
) => {
  // Calculate total duration
  const totalDuration = mediaItems.reduce(
    (sum, media) => sum + media.duration,
    0,
  );
  const baseLayoutDuration =
    totalDuration - (mediaItems.length - 1) * transitionDuration;

  const childrenData: any[] = [];
  let currentTime = 0;

  mediaItems.forEach((media, index) => {
    const isFirst = index === 0;
    const isLast = index === mediaItems.length - 1;
    const prevMedia = mediaItems[index - 1];

    // Calculate position in grid
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    const width = 100 / gridCols;
    const height = 100 / gridRows;
    const left = col * width;
    const top = row * height;

    // Calculate timing
    let startTime: number;
    let duration: number;

    if (isFirst) {
      startTime = 0;
      duration = media.duration;
    } else {
      startTime = currentTime - transitionDuration;
      duration = media.duration + transitionDuration;
    }

    childrenData.push({
      id: `grid-media-${index}`,
      type: 'atom',
      componentId: media.src.match(/\.(mp4|webm|mov)$/i)
        ? 'VideoAtom'
        : 'ImageAtom',
      data: {
        src: media.src,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: duration,
        },
      },
      effects: [
        // Fade in for incoming
        !isFirst && {
          id: `fade-in-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'wrapper',
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Fade out for outgoing (except last)
        !isLast && {
          id: `fade-out-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: media.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'wrapper',
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ].filter(Boolean),
    });

    currentTime += media.duration;
  });

  return {
    id: 'grid-transition-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData,
  };
};
```

## 5. Complete Preset Example

### Fade Transition Preset

```typescript
import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  const childrenData: RenderableComponentData[] = [
    // Outgoing media
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        {
          id: 'fade-out-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'wrapper',
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming media
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'fade-in-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'wrapper',
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'fade-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData,
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
  id: 'fade-transition',
  title: 'Fade Transition',
  description: 'Smooth crossfade transition between two media items',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'fade', 'crossfade'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const fadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
```

## 6. Common Patterns from beatstitch.ts

### Pattern: Overlapping Clips with Transition Effects

From `beatstitch.ts`, the correct pattern for overlapping media:

```typescript
// Calculate overlap timing
const overlapTime = transitionDuration;
const duration = baseDuration + overlapTime; // Extend duration to include overlap
const startTime = timestamp - overlapTime / 2; // Start before the transition point

// Create clip with extended duration
{
  id: 'clip',
  context: {
    timing: {
      start: startTime, // Starts before transition point
      duration: duration, // Extended to include overlap
    },
  },
  effects: [
    // Transition effects applied during overlap period
  ],
}
```

**Key Points:**

- Clips have overlapping timing (both visible simultaneously)
- Duration is extended to include overlap
- Start time is adjusted to create overlap
- Effects are applied during the overlap period

## 7. Best Practices

### ✅ DO

1. **Always assume media has duration**: Media items come with `{src, type, duration}`

2. **Calculate BaseLayout duration correctly**:
   - Sequential: `sum of all media durations`
   - With overlap: `sum - (number of transitions × overlap duration)`

3. **Use relative timing**: All child timings are relative to BaseLayout start

4. **Create overlap for transitions**: Incoming media should start before outgoing media ends

5. **Apply effects during overlap**: Transition effects should play during the overlap period

6. **Handle multiple media items**: Support 2+ media items, including grid layouts

7. **Use z-index for layering**: Control which media appears on top during transition

### ❌ DON'T

1. **Don't create separate containers for each media**: All media should be in the same BaseLayout

2. **Don't ignore media duration**: Always use the provided duration, don't assume or calculate

3. **Don't create gaps**: Media items should overlap or be sequential, never have gaps

4. **Don't use absolute video timeline**: All timings are relative to parent BaseLayout

5. **Don't forget overflow handling**: Use `overflow-hidden` on container for slide/wipe transitions

6. **Don't apply effects outside overlap**: Effects should only play during the transition period

## 8. Advanced Techniques

### Technique 1: Dynamic Transition Duration

Adjust transition duration based on media duration:

```typescript
const calculateTransitionDuration = (
  media1Duration: number,
  media2Duration: number,
  baseTransitionDuration: number = 1.0,
): number => {
  const minDuration = Math.min(media1Duration, media2Duration);
  // Transition should not exceed 30% of shortest media
  return Math.min(baseTransitionDuration, minDuration * 0.3);
};
```

### Technique 2: Effect Synchronization

Synchronize multiple effects during transition:

```typescript
const transitionStart = media1.duration - transitionDuration;

// Outgoing media effects
effects: [
  {
    id: 'fade-out',
    data: {
      start: transitionStart,
      duration: transitionDuration,
      // ...
    },
  },
  {
    id: 'blur-out',
    data: {
      start: transitionStart,
      duration: transitionDuration,
      // ...
    },
  },
],

// Incoming media effects
effects: [
  {
    id: 'fade-in',
    data: {
      start: 0, // Relative to incoming media start
      duration: transitionDuration,
      // ...
    },
  },
  {
    id: 'scale-in',
    data: {
      start: 0,
      duration: transitionDuration,
      // ...
    },
  },
],
```

### Technique 3: Conditional Media Type Handling

Handle different media types appropriately:

```typescript
const getComponentId = (src: string, type?: string): string => {
  if (type === 'video') return 'VideoAtom';
  if (type === 'image') return 'ImageAtom';

  // Auto-detect from extension
  if (src.match(/\.(mp4|webm|mov)$/i)) return 'VideoAtom';
  if (src.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)) return 'ImageAtom';

  return 'ImageAtom'; // Default
};
```

## 9. Testing Checklist

When creating a transition preset, verify:

- [ ] BaseLayout duration matches sum of media durations (minus overlaps)
- [ ] Media items overlap correctly during transition
- [ ] Effects play during overlap period only
- [ ] No gaps between media items
- [ ] Works with 2+ media items
- [ ] Works with both images and videos
- [ ] Z-index/layering is correct
- [ ] Timing is relative to BaseLayout, not absolute
- [ ] Overflow is handled for slide/wipe transitions
- [ ] Effects are properly scoped (wrapper mode)

## 10. Common Mistakes to Avoid

### Mistake 1: Wrong BaseLayout Duration

❌ **Wrong:**

```typescript
// Using transition duration instead of media durations
context: {
  timing: {
    duration: transitionDuration, // WRONG!
  },
}
```

✅ **Correct:**

```typescript
// Using sum of media durations
context: {
  timing: {
    duration: media1.duration + media2.duration - transitionDuration,
  },
}
```

### Mistake 2: No Overlap

❌ **Wrong:**

```typescript
// Incoming media starts exactly when outgoing ends
{
  context: {
    timing: {
      start: media1.duration, // No overlap!
      duration: media2.duration,
    },
  },
}
```

✅ **Correct:**

```typescript
// Incoming media starts before outgoing ends
{
  context: {
    timing: {
      start: media1.duration - transitionDuration, // Overlap!
      duration: media2.duration + transitionDuration,
    },
  },
}
```

### Mistake 3: Effects Outside Overlap

❌ **Wrong:**

```typescript
// Effect plays after media ends
{
  effects: [
    {
      data: {
        start: media1.duration, // After media ends!
        duration: transitionDuration,
      },
    },
  ],
}
```

✅ **Correct:**

```typescript
// Effect plays during overlap
{
  effects: [
    {
      data: {
        start: media1.duration - transitionDuration, // During overlap!
        duration: transitionDuration,
      },
    },
  ],
}
```

## 11. Reference: beatstitch.ts Pattern

The `beatstitch.ts` preset demonstrates the correct pattern:

```typescript
// From beatstitch.ts - correct overlap pattern
const overlapTime = transitionDuration;
const duration = baseDuration + overlapTime;
const startTime = timestamp - overlapTime / 2;

{
  context: {
    timing: {
      start: startTime, // Overlaps with previous clip
      duration: duration, // Extended to include overlap
    },
  },
  effects: [
    // Effects applied during overlap
  ],
}
```

**Key takeaway**: Clips overlap in time, and effects play during the overlap period. The BaseLayout contains all clips with their individual overlapping timings.
