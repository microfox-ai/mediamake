# Media Content Guide

## 1. Overview

Media content nodes use atom components: `VideoAtom`, `ImageAtom`, and `AudioAtom`. Each supports styling, timing, effects, and media-specific controls.

## 2. Media Source (src)

### Source URLs

```typescript
{
  type: 'atom',
  componentId: 'VideoAtom',
  data: {
    src: 'https://example.com/video.mp4', // Full URL
    // or
    src: 'video.mp4', // Local file (uses staticFile)
  },
}
```

**Supported formats:**

- **Video**: `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv`, `.wmv`
- **Image**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.avif`
- **Audio**: `.mp3`, `.wav`, `.ogg`, `.m4a`, etc.

### Auto-detection

If `type` is not specified, it's auto-detected from file extension:

```typescript
// Auto-detects as 'video'
{
  src: 'https://example.com/clip.mp4';
}

// Auto-detects as 'image'
{
  src: 'https://example.com/image.jpg';
}

// Auto-detects as 'audio'
{
  src: 'https://example.com/sound.mp3';
}
```

## 3. Styling

### Basic Styling

```typescript
{
  data: {
    src: 'video.mp4',
    className: 'w-full h-full object-cover', // Tailwind classes
    style: {
      opacity: 0.8,
      mixBlendMode: 'overlay',
      filter: 'brightness(1.2)',
    },
  },
}
```

### Object Fit (Video/Image)

```typescript
{
  data: {
    fit: 'cover', // 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  },
}
```

**Common patterns:**

BY DEFAULT, use COVER ( that is the msot correct way to crop a video to fill the container)

- `cover` - Fill container, maintain aspect ratio, crop if needed
- `contain` - Fit entirely, maintain aspect ratio
- `fill` - Stretch to fill container ( usually messes up the aspect ratio )
- `none` - Original size
- `scale-down` - Like `none` or `contain`, whichever is smaller

### Blend Modes

```typescript
{
  data: {
    style: {
      mixBlendMode: 'overlay', // 'screen' | 'multiply' | 'overlay' | 'darken' | etc.
    },
  },
}
```

## 4. Media-Specific Properties

### Video Properties

```typescript
{
  componentId: 'VideoAtom',
  data: {
    src: 'video.mp4',
    volume: 0.8,              // 0-1, default: 1
    muted: false,             // Mute video audio
    playbackRate: 1.0,        // Speed multiplier (1.0 = normal, 2.0 = 2x)
    loop: false,              // Loop video
    startFrom: 5.0,           // Start playback from 5 seconds
    endAt: 30.0,              // End playback at 30 seconds (trimming)
    srcDuration: 10.0,        // Duration for each loop iteration
  },
}
```

### Audio Properties

```typescript
{
  componentId: 'AudioAtom',
  data: {
    src: 'audio.mp3',
    volume: 0.7,              // 0-1
    playbackRate: 1.0,        // Speed multiplier
    startFrom: 0,             // Start from time
    endAt: 60,                // End at time
    muted: {                  // Mute configuration
      type: 'range',
      values: [
        { start: 10, end: 15 }, // Mute from 10s to 15s
        { start: 20, end: 25 }, // Mute from 20s to 25s
      ],
    },
    // or
    muted: {
      type: 'full',
      value: false,           // true = muted, false = unmuted
    },
  },
}
```

### Image Properties

```typescript
{
  componentId: 'ImageAtom',
  data: {
    src: 'image.jpg',
    proxySrc: 'https://proxy.example.com', // Custom CORS proxy (optional)
    className: 'w-full h-auto',
    style: {
      opacity: 0.9,
      objectFit: 'cover',
    },
  },
}
```

## 5. Timing

### Basic Timing

```typescript
{
  context: {
    timing: {
      start: 0,        // Start time relative to parent
      duration: 10,    // Duration in seconds
    },
  },
}
```

### Time Ranges (MM:SS-MM:SS Format)

Use time ranges to show specific segments of media:

```typescript
{
  context: {
    timing: {
      start: 10,       // Start at 10 seconds (from "0:10")
      duration: 140,   // Duration 140 seconds (from "0:10-2:30")
    },
  },
  data: {
    src: 'video.mp4',
    // Time range "0:10-2:30" means:
    // - Start at 10 seconds into video
    // - Show until 2 minutes 30 seconds (150s total, 140s duration)
  },
}
```

**Parsing time ranges:**

```typescript
// Input: "0:10-2:30"
// Output: { start: 10, duration: 140 }
const parseTimeRange = (range: string) => {
  const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  const startMinutes = parseInt(match[1], 10);
  const startSeconds = parseInt(match[2], 10);
  const endMinutes = parseInt(match[3], 10);
  const endSeconds = parseInt(match[4], 10);

  const startTime = startMinutes * 60 + startSeconds;
  const endTime = endMinutes * 60 + endSeconds;
  const duration = endTime - startTime;

  return { start: startTime, duration };
};
```

### fitDurationTo

Match duration to another component:

```typescript
{
  context: {
    timing: {
      fitDurationTo: 'audio-track', // Match audio duration
    },
  },
}
```

## 6. Effects & Transitions

### Fade In/Out

```typescript
{
  effects: [
    {
      id: 'fade-in',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 1.5,
        mode: 'provider',
        targetIds: ['video-id'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
  ],
}
```

### Slide Transitions

```typescript
// Slide in from right
{
  id: 'slide-in-right',
  componentId: 'generic',
  data: {
    type: 'ease-out',
    start: 0,
    duration: 0.8,
    mode: 'provider',
    targetIds: ['video-id'],
    ranges: [
      { key: 'translateX', val: '100px', prog: 0 },
      { key: 'translateX', val: '0px', prog: 1 },
    ],
  },
}

// Slide in from left
ranges: [
  { key: 'translateX', val: '-100px', prog: 0 },
  { key: 'translateX', val: '0px', prog: 1 },
]

// Slide in from top
ranges: [
  { key: 'translateY', val: '-100px', prog: 0 },
  { key: 'translateY', val: '0px', prog: 1 },
]

// Slide in from bottom
ranges: [
  { key: 'translateY', val: '100px', prog: 0 },
  { key: 'translateY', val: '0px', prog: 1 },
]
```

### Scale Transitions

```typescript
// Scale in
{
  data: {
    ranges: [
      { key: 'scale', val: 0.8, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  },
}

// Scale out
{
  data: {
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.1, prog: 1 },
    ],
  },
}
```

### Blur Transitions

```typescript
// Blur in
{
  data: {
    ranges: [
      { key: 'filter', val: 'blur(10px)', prog: 0 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    ],
  },
}

// Blur out
{
  data: {
    ranges: [
      { key: 'filter', val: 'blur(0px)', prog: 0 },
      { key: 'filter', val: 'blur(10px)', prog: 1 },
    ],
  },
}
```

### Shake Effects

```typescript
{
  id: 'shake-in',
  componentId: 'shake', // Use 'shake' component, not 'generic'
  data: {
    type: 'linear',
    start: 0,
    duration: 1.5,
    mode: 'provider',
    targetIds: ['video-id'],
    amplitude: 15,      // Shake intensity
    frequency: 0.2,     // Shake frequency (seconds)
    decay: true,        // Decay over time
    axis: 'both',       // 'x' | 'y' | 'both'
  },
}
```

## 7. Complete Examples

### Video with Fade Transitions

```typescript
{
  id: 'video-1',
  type: 'atom',
  componentId: 'VideoAtom',
  data: {
    src: 'https://example.com/video.mp4',
    className: 'w-full h-full object-cover',
    fit: 'cover',
    volume: 0.8,
    loop: false,
    style: {
      opacity: 1,
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 10,
    },
  },
  effects: [
    {
      id: 'fade-in',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 1.5,
        mode: 'provider',
        targetIds: ['video-1'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    },
    {
      id: 'fade-out',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 8.5, // 10 - 1.5
        duration: 1.5,
        mode: 'provider',
        targetIds: ['video-1'],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    },
  ],
}
```

### Video with Time Range

```typescript
{
  id: 'video-clip',
  type: 'atom',
  componentId: 'VideoAtom',
  data: {
    src: 'https://example.com/long-video.mp4',
    className: 'w-full h-full object-cover',
  },
  context: {
    timing: {
      start: 10,      // Start at 10 seconds (from "0:10")
      duration: 140,   // Duration 140 seconds (from "0:10-2:30")
    },
  },
}
```

### Image with Slide Transition

```typescript
{
  id: 'image-1',
  type: 'atom',
  componentId: 'ImageAtom',
  data: {
    src: 'https://example.com/image.jpg',
    className: 'w-full h-auto object-cover',
    style: {
      opacity: 1,
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 5,
    },
  },
  effects: [
    {
      id: 'slide-in',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 0.8,
        mode: 'provider',
        targetIds: ['image-1'],
        ranges: [
          { key: 'translateX', val: '100px', prog: 0 },
          { key: 'translateX', val: '0px', prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.4 },
        ],
      },
    },
  ],
}
```

### Audio Track

```typescript
{
  id: 'audio-track',
  type: 'atom',
  componentId: 'AudioAtom',
  data: {
    src: 'https://example.com/audio.mp3',
    volume: 0.7,
    playbackRate: 1.0,
    muted: {
      type: 'range',
      values: [
        { start: 10, end: 15 }, // Mute 10-15s
      ],
    },
  },
  context: {
    timing: {
      start: 0,
      // Duration auto-calculated from audio file
    },
  },
}
```

## 8. Helper Function: Create Transition Effects

```typescript
const createTransitionEffects = (
  mediaItem: any,
  sceneId: string,
  isFadeIn: boolean,
  timeRangeOffset: number = 0,
  timeRangeDuration?: number,
) => {
  const effects = [];
  const transition = isFadeIn
    ? mediaItem.fadeInTransition
    : mediaItem.fadeOutTransition;
  const duration = isFadeIn
    ? mediaItem.fadeInDuration || 1.5
    : mediaItem.fadeOutDuration || 1;

  if (!transition || transition === 'none') return effects;

  const mediaDuration = timeRangeDuration || mediaItem.duration || 0;
  const startTime = isFadeIn ? 0 : mediaDuration - duration;

  // Base opacity effect
  effects.push({
    type: 'ease-in-out',
    start: startTime,
    duration: duration,
    mode: 'provider',
    targetIds: [sceneId],
    ranges: [
      {
        key: 'opacity',
        val: isFadeIn ? 0 : (mediaItem.opacity ?? 1),
        prog: 0,
      },
      {
        key: 'opacity',
        val: isFadeIn ? (mediaItem.opacity ?? 1) : 0,
        prog: 1,
      },
    ],
  });

  // Add transition-specific effects (slide, scale, blur, shake)
  // ... (see examples above)

  return effects;
};
```

## 9. Best Practices

1. **Always set `className`** - Use Tailwind for responsive sizing (`w-full h-full`)
2. **Use `fit: 'cover'`** - For full-screen backgrounds
3. **Set opacity in style** - Base opacity, then animate with effects
4. **Time ranges for clips** - Use MM:SS-MM:SS format for video segments
5. **Combine transitions** - Fade + slide for smooth entrances
6. **Shake uses 'shake' component** - Not 'generic' component
7. **Audio muted ranges** - Use for ducking or silence periods
8. **Test timing carefully** - Media timing is relative to parent

## 10. Common Patterns

### Pattern: Video with Multiple Time Ranges

```typescript
const ranges = ['0:10-2:30', '5:00-7:30', '10:00-12:00'];

ranges.map((range, index) => {
  const timeRange = parseTimeRange(range);
  return {
    id: `video-clip-${index}`,
    componentId: 'VideoAtom',
    data: { src: 'video.mp4' },
    context: {
      timing: {
        start: timeRange.start,
        duration: timeRange.duration,
      },
    },
  };
});
```

### Pattern: Media with Fade In/Out

```typescript
const fadeInEffects = createTransitionEffects(mediaItem, sceneId, true);
const fadeOutEffects = createTransitionEffects(mediaItem, sceneId, false);

{
  effects: [...fadeInEffects, ...fadeOutEffects],
}
```

### Pattern: Media with Blend Mode

```typescript
{
  data: {
    src: 'overlay-video.mp4',
    style: {
      mixBlendMode: 'overlay',
      opacity: 0.6,
    },
  },
}
```
