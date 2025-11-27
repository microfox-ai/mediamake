# VideoAtom Documentation

## Overview

`VideoAtom` is used to display video content with advanced playback controls. It supports video trimming, playback rate adjustment, volume control, looping, and flexible styling options.

## When to Use

- Displaying video clips in compositions
- Creating video loops for backgrounds
- Implementing video transitions
- Building video montages with precise timing control
- Adding video overlays with blend modes

## Parameters

### `src` (required)

- **Type:** `string`
- **Description:** Video source URL or local file path
- **Examples:**
  - Local file: `"video.mp4"`
  - Remote URL: `"https://example.com/video.mp4"`
- **Usage:** The atom automatically handles local files using `staticFile()` and remote URLs directly

### `srcDuration` (optional)

- **Type:** `number`
- **Description:** Duration of each iteration in a loop (in seconds). Used when looping videos to specify the duration of each loop iteration.
- **Example:** `5` (5 seconds per loop)
- **Best Practice:** Use this when you want to loop a specific portion of a video rather than the entire video

### `style` (optional)

- **Type:** `Record<string, any>` (CSS styles object)
- **Description:** Inline CSS styles applied to the video element
- **Common Properties:**
  - `opacity`: `0` to `1` for transparency
  - `mixBlendMode`: Blend modes like `'multiply'`, `'screen'`, `'overlay'`
  - `objectPosition`: Position of video within container (e.g., `'center'`, `'top left'`)
- **Example:**
  ```typescript
  style: {
    opacity: 0.8,
    mixBlendMode: 'overlay',
    objectPosition: 'center top'
  }
  ```

### `containerClassName` (optional)

- **Type:** `string`
- **Description:** CSS class names for a wrapper container div. When provided, animated styles are applied to the container instead of directly to the video.
- **Use Case:** Useful when you need a container for positioning or additional styling
- **Example:** `"absolute inset-0 w-full h-full"`

### `className` (optional)

- **Type:** `string`
- **Description:** CSS class names applied directly to the video element
- **Common Classes:**
  - `"w-full h-full"`: Full width and height
  - `"object-cover"`: Cover the container (works with `fit: 'cover'`)
  - `"object-contain"`: Contain within container
- **Example:** `"w-full h-full object-cover"`

### `startFrom` (optional)

- **Type:** `number`
- **Description:** Start playback from this time in seconds (trimming start point)
- **Example:** `10` (start from 10 seconds into the video)
- **Best Practice:** Use with `endAt` to create a trimmed video segment

### `endAt` (optional)

- **Type:** `number`
- **Description:** End playback at this time in seconds (trimming end point)
- **Example:** `30` (end at 30 seconds into the video)
- **Best Practice:** Must be greater than `startFrom` for proper trimming

### `playbackRate` (optional)

- **Type:** `number`
- **Description:** Playback speed multiplier
  - `1` = normal speed
  - `2` = 2x speed (faster)
  - `0.5` = half speed (slower)
- **Default:** `1`
- **Example:** `1.5` (1.5x speed)

### `volume` (optional)

- **Type:** `number`
- **Description:** Volume level from `0` to `1`
  - `0` = silent
  - `1` = full volume
- **Default:** `1`
- **Example:** `0.5` (50% volume)

### `muted` (optional)

- **Type:** `boolean`
- **Description:** Whether to mute the video audio
- **Default:** `false`
- **Example:** `true` (mute audio)

### `loop` (optional)

- **Type:** `boolean`
- **Description:** Whether to loop the video infinitely
- **Default:** `false`
- **Best Practice:** When `true`, use `srcDuration` to control loop segment duration

### `fit` (optional)

- **Type:** `'contain' | 'cover' | 'fill' | 'none' | 'scale-down'`
- **Description:** How the video should be sized to fit its container (CSS `object-fit`)
  - `'contain'`: Scale to fit, maintaining aspect ratio
  - `'cover'`: Scale to fill, maintaining aspect ratio (may crop)
  - `'fill'`: Stretch to fill, ignoring aspect ratio
  - `'none'`: No scaling
  - `'scale-down'`: Like `'none'` or `'contain'`, whichever is smaller
- **Default:** `'cover'` (commonly used)
- **Example:** `'cover'` for background videos

## Usage Examples

### Basic Video Playback

```typescript
{
  id: 'video-1',
  componentId: 'VideoAtom',
  type: 'atom' as const,
  data: {
    src: 'background-video.mp4',
    className: 'w-full h-full object-cover',
    fit: 'cover',
  },
  context: {
    timing: {
      start: 0,
      duration: 10,
    },
  },
}
```

### Video with Trimming and Effects

```typescript
{
  id: 'video-trimmed',
  componentId: 'VideoAtom',
  type: 'atom' as const,
  data: {
    src: 'long-video.mp4',
    startFrom: 30,  // Start from 30 seconds
    endAt: 45,      // End at 45 seconds
    playbackRate: 1.5,
    volume: 0.8,
    className: 'w-full h-full object-cover',
    fit: 'cover',
    style: {
      opacity: 0.9,
      mixBlendMode: 'overlay',
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 10,  // 15 seconds trimmed at 1.5x = 10 seconds effective
    },
  },
}
```

### Looping Video Background

```typescript
{
  id: 'video-loop',
  componentId: 'VideoAtom',
  type: 'atom' as const,
  data: {
    src: 'loop-video.mp4',
    loop: true,
    srcDuration: 3,  // Loop every 3 seconds
    muted: true,
    className: 'w-full h-full object-cover',
    fit: 'cover',
  },
  context: {
    timing: {
      duration: 30,  // Will loop for 30 seconds
    },
  },
}
```

### Video Overlay with Blend Mode

```typescript
{
  id: 'video-overlay',
  componentId: 'VideoAtom',
  type: 'atom' as const,
  data: {
    src: 'overlay-video.mp4',
    className: 'w-full h-full object-cover',
    fit: 'cover',
    muted: true,
    style: {
      opacity: 0.6,
      mixBlendMode: 'screen',
    },
  },
  context: {
    timing: {
      start: 5,
      duration: 10,
    },
  },
}
```

## Real-World Examples from Presets

### From `media-track.ts`

Shows video with fit options, blend modes, and trimming:

```typescript
{
  id: sceneId,
  componentId: 'VideoAtom',
  type: 'atom' as const,
  data: {
    src: mediaItem.src,
    className: mediaItem.fit === 'cover'
      ? 'w-full h-full object-cover'
      : 'w-full h-auto',
    fit: mediaItem.fit ?? 'cover',
    loop: mediaItem.loop ?? false,
    muted: mediaItem.mute ?? false,
    volume: mediaItem.volume ?? 1,
    playbackRate: mediaItem.playbackRate ?? 1,
    style: {
      ...(mediaItem.blendMode
        ? { mixBlendMode: mediaItem.blendMode }
        : {}),
      ...(mediaItem.opacity !== undefined
        ? { opacity: mediaItem.opacity }
        : {}),
    },
    startFrom: mediaItem.startCropVideo ?? 0,
    ...(timeRange && !mediaItem.duration && {
      srcDuration: timeRange.duration,
    }),
  },
}
```

### From `video-stitch.ts`

Shows video stitching with positioning:

```typescript
{
  id: videoId,
  componentId: 'VideoAtom',
  type: 'atom' as const,
  data: {
    src: videoItem.src,
    className: 'w-full h-full object-cover',
    style: {
      objectPosition: params.position,
      ...videoItem.style,
    },
    fit: videoItem.fit ?? 'cover',
  },
}
```

### From `quote-present.ts`

Shows looping video with muted audio:

```typescript
{
  type: 'atom',
  id: `${params.trackName}-video-${index}`,
  componentId: 'VideoAtom',
  data: {
    src: video.src,
    startFrom: 0,
    playbackRate: video.playbackRate || 1,
    loop: true,
    className: 'w-full h-full object-cover',
    fit: 'cover',
    muted: true,
    volume: 0,
    style: {
      opacity: video.opacity || 1,
    },
  },
  context: {
    timing: {
      start: videoStartTime,
      duration: video.duration / (video.playbackRate || 1),
    },
  },
}
```

## Best Practices

1. **Always specify `fit`** for predictable video sizing
2. **Use `startFrom` and `endAt`** for precise video trimming instead of relying on duration alone
3. **Set `muted: true`** for background videos to avoid audio conflicts
4. **Use `srcDuration` with `loop: true`** to control loop segment length
5. **Combine `className` and `fit`** for consistent sizing (e.g., `className: 'w-full h-full object-cover'` with `fit: 'cover'`)
6. **Use `containerClassName`** when you need animated styles on a wrapper instead of the video element
7. **Calculate effective duration** when using `playbackRate` and trimming:
   - Effective duration = (endAt - startFrom) / playbackRate

## Helper Functions

The `VideoAtom` exports `VideoDataHelper` with utility functions:

- `isTrimmed(data, options)`: Check if video should be trimmed at a timestamp
- `getEffectiveDuration(data, originalDuration)`: Calculate effective duration after trimming and playback rate
- `isValidSource(src)`: Validate video source URL format
