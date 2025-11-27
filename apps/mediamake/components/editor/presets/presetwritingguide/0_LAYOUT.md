# Layout Preset Guide

## 1. BaseLayout Overview

`BaseLayout` is the equivalent of a `<div>` element. It provides container functionality with support for styling, positioning, and timing control.

```typescript
{
  id: 'container',
  type: 'layout',
  componentId: 'BaseLayout',
  data: {
    containerProps: {
      className: 'flex items-center justify-center',
      style: { gap: '20px' },
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 10,
    },
  },
  childrenData: [/* child components */],
}
```

## 2. Context Timing and Relative Timing

### Relative Timing in Nested Structures

**Key Principle**: Timing is always relative to the parent component.

In nested structures, `context.timing.start` and `context.timing.duration` are relative to the parent's timeline, not the video timeline.

```typescript
// Parent container
{
  id: 'parent-container',
  context: {
    timing: {
      start: 0,        // Starts at 0 relative to video
      duration: 10,    // Lasts 10 seconds
    },
  },
  childrenData: [
    // Child 1: starts at 0 relative to parent (0s in video)
    {
      id: 'child-1',
      context: {
        timing: {
          start: 0,        // Relative to parent start
          duration: 5,     // Lasts 5 seconds
        },
      },
    },
    // Child 2: starts at 5 relative to parent (5s in video)
    {
      id: 'child-2',
      context: {
        timing: {
          start: 5,        // Relative to parent start (5s in video)
          duration: 5,     // Lasts 5 seconds
        },
      },
    },
  ],
}
```

**Important**: Child timing is calculated relative to parent's start time. If parent starts at 10s and child starts at 2s relative to parent, child appears at 12s in video.

### Timing Inheritance

If a child doesn't specify `duration`, it inherits from parent:

```typescript
{
  id: 'parent',
  context: {
    timing: { start: 0, duration: 10 },
  },
  childrenData: [
    {
      id: 'child',
      context: {
        timing: { start: 0 }, // No duration - inherits 10s from parent
      },
    },
  ],
}
```

## 3. fitDurationTo

`fitDurationTo` allows a component to match its duration to another component (media source, scene, or layout).

### Basic Usage

```typescript
{
  id: 'overlay',
  context: {
    timing: {
      start: 0,
      fitDurationTo: 'audio-track', // Match duration to component with id 'audio-track'
    },
  },
}
```

### Special Values

- `'this'` - Match duration to sum of children durations
- `'fill'` - Fill remaining space in parent
- Component ID - Match duration to specific component

```typescript
// Match to audio track
{
  id: 'waveform',
  context: {
    timing: {
      fitDurationTo: 'Audio-xyz', // Matches AudioAtom or VideoAtom duration
    },
  },
}

// Match to scene
{
  id: 'overlay',
  context: {
    timing: {
      fitDurationTo: 'video-scene', // Matches scene/layout duration
    },
  },
}

// Auto-calculate from children
{
  id: 'container',
  context: {
    timing: {
      fitDurationTo: 'this', // Sum of all children durations
    },
  },
}
```

### How It Works

1. **Media Sources** (`AudioAtom`, `VideoAtom`): Extracts actual media duration
2. **Scenes/Layouts**: Uses their `context.timing.duration` or sums children durations
3. **Recursive Search**: Searches through `childrenData` to find matching component ID

```typescript
// Example: Overlay that matches video duration
{
  id: 'video-overlay',
  componentId: 'BaseLayout',
  context: {
    timing: {
      start: 0,
      fitDurationTo: 'video-scene', // Finds and matches 'video-scene' duration
    },
  },
  childrenData: [
    {
      id: 'video-scene',
      type: 'scene',
      context: {
        timing: { start: 0, duration: 30 }, // 30 seconds
      },
      // ... video content
    },
  ],
}
```

## 4. Container Props

### containerProps

Props applied to the container element itself (the `<div>` or `<AbsoluteFill>`):

```typescript
{
  data: {
    containerProps: {
      className: 'flex items-center justify-center',
      style: {
        gap: '20px',
        padding: '40px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
    },
  },
}
```

**Use for:**

- Container styling (flexbox, grid, positioning)
- Container-level animations (via effects, not style)
- Dynamic positioning based on input params

### childrenProps

Array of props applied to each child individually (by index):

```typescript
{
  data: {
    containerProps: {
      className: 'relative',
    },
    childrenProps: [
      { className: 'absolute', style: { top: '10px', left: '10px' } }, // Child 0
      { className: 'absolute', style: { top: '50px', left: '50px' } }, // Child 1
      { className: 'absolute', style: { top: '90px', left: '90px' } }, // Child 2
    ],
  },
  childrenData: [child0, child1, child2],
}
```

**Use for:**

- Individual child positioning
- Per-child styling
- Dynamic props based on child index

**Example from sub-vertical-float.ts:**

```typescript
{
  data: {
    containerProps: {
      className: 'absolute inset-0',
    },
    childrenProps: Array(captionsChildrenData.length)
      .fill({ className: 'absolute' })
      .map((child, index) => ({
        ...child,
        style: getPosition(captionHeight, positionConfig),
      })),
  },
}
```

### repeatChildrenProps

Single props object applied to ALL children:

```typescript
{
  data: {
    containerProps: {
      className: 'flex flex-row',
    },
    repeatChildrenProps: {
      className: 'px-3 py-2 rounded-lg',
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
      },
    },
  },
  childrenData: [word1, word2, word3], // All get same wrapper props
}
```

**Use for:**

- Uniform child styling (all children get same wrapper)
- Reusable wrapper elements
- Consistent spacing/styling across children

**Priority**: `childrenProps[index]` > `repeatChildrenProps` > no props

## 5. Complete Example

```typescript
{
  id: 'main-container',
  type: 'layout',
  componentId: 'BaseLayout',
  data: {
    containerProps: {
      className: 'absolute inset-0 flex flex-col',
      style: {
        gap: '20px',
      },
    },
    repeatChildrenProps: {
      className: 'px-4 py-2',
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      },
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 30,
    },
  },
  childrenData: [
    {
      id: 'header',
      context: {
        timing: {
          start: 0,        // Relative to parent (0s in video)
          duration: 5,     // 5 seconds
        },
      },
    },
    {
      id: 'content',
      context: {
        timing: {
          start: 5,       // Relative to parent (5s in video)
          fitDurationTo: 'audio-track', // Match audio duration
        },
      },
    },
  ],
}
```

## 6. Best Practices

1. **Always use relative timing** - `start` is relative to parent, not video timeline
2. **Use `fitDurationTo` for media sync** - Match overlays to audio/video duration
3. **Prefer `repeatChildrenProps`** for uniform child styling
4. **Use `childrenProps`** only when each child needs different props
5. **Container styling in `containerProps.style`** - Use for static positioning, not animations
6. **Animations go in effects** - Don't animate via `containerProps.style`
