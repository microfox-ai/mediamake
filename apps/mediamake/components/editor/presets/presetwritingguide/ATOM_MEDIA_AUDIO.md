# AudioAtom Documentation

## Overview

`AudioAtom` is used to play audio tracks with advanced control features including time-based trimming, volume control, playback rate adjustment, and flexible muting options (full track or specific time ranges).

## When to Use

- Playing background music
- Adding sound effects
- Creating audio-visual synchronization
- Implementing audio tracks for video compositions
- Building music visualizations

## Parameters

### `src` (required)

- **Type:** `string`
- **Description:** Audio source URL or local file path
- **Examples:**
  - Local file: `"audio.mp3"`
  - Remote URL: `"https://example.com/audio.mp3"`
- **Usage:** The atom automatically handles local files using `staticFile()` and remote URLs directly
- **Supported Formats:** MP3, WAV, OGG, M4A

### `startFrom` (optional)

- **Type:** `number`
- **Description:** Start playback from this time in seconds (trimming start point)
- **Example:** `10` (start from 10 seconds into the audio)
- **Best Practice:** Use with `endAt` to create a trimmed audio segment

### `endAt` (optional)

- **Type:** `number`
- **Description:** End playback at this time in seconds (trimming end point)
- **Example:** `60` (end at 60 seconds into the audio)
- **Best Practice:** Must be greater than `startFrom` for proper trimming

### `volume` (optional)

- **Type:** `number`
- **Description:** Volume level from `0` to `2`
  - `0` = silent
  - `1` = normal volume (100%)
  - `2` = double volume (200%)
- **Default:** `1`
- **Example:** `0.5` (50% volume) or `1.5` (150% volume)

### `playbackRate` (optional)

- **Type:** `number`
- **Description:** Playback speed multiplier
  - `1` = normal speed
  - `2` = 2x speed (faster)
  - `0.5` = half speed (slower)
- **Default:** `1`
- **Example:** `1.25` (1.25x speed)

### `muted` (optional)

- **Type:** `MutedConfig` (union type)
- **Description:** Mute configuration - can be full track mute or time range mutes
- **Options:**

  **1. Full Mute:**

  ```typescript
  {
    type: 'full',
    value: boolean  // true = muted, false = unmuted
  }
  ```

  **2. Range Mute:**

  ```typescript
  {
    type: 'range',
    values: [
      {
        start: number,  // Start time in seconds
        end: number      // End time in seconds
      },
      // ... more ranges
    ]
  }
  ```

- **Examples:**

  ```typescript
  // Mute entire track
  muted: { type: 'full', value: true }

  // Mute specific time ranges
  muted: {
    type: 'range',
    values: [
      { start: 10, end: 15 },  // Mute from 10s to 15s
      { start: 30, end: 35 },  // Mute from 30s to 35s
    ]
  }
  ```

## Usage Examples

### Basic Audio Playback

```typescript
{
  id: 'audio-1',
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: 'background-music.mp3',
    volume: 1,
  },
  context: {
    timing: {
      start: 0,
      duration: 30,
    },
  },
}
```

### Audio with Trimming

```typescript
{
  id: 'audio-trimmed',
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: 'long-audio.mp3',
    startFrom: 30,  // Start from 30 seconds
    endAt: 90,      // End at 90 seconds
    volume: 0.8,
  },
  context: {
    timing: {
      start: 0,
      duration: 60,  // 60 seconds of audio (90-30)
    },
  },
}
```

### Audio with Playback Rate

```typescript
{
  id: 'audio-speed',
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: 'audio.mp3',
    playbackRate: 1.5,  // 1.5x speed
    volume: 1,
  },
  context: {
    timing: {
      start: 0,
      duration: 20,  // Will play faster, so effective duration is shorter
    },
  },
}
```

### Fully Muted Audio

```typescript
{
  id: 'audio-muted',
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: 'audio.mp3',
    muted: {
      type: 'full',
      value: true,
    },
    volume: 1,  // Volume is ignored when muted
  },
  context: {
    timing: {
      start: 0,
      duration: 30,
    },
  },
}
```

### Audio with Time Range Muting

```typescript
{
  id: 'audio-range-muted',
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: 'audio.mp3',
    volume: 1,
    muted: {
      type: 'range',
      values: [
        { start: 5, end: 10 },   // Mute from 5s to 10s
        { start: 20, end: 25 },   // Mute from 20s to 25s
      ],
    },
  },
  context: {
    timing: {
      start: 0,
      duration: 30,
    },
  },
}
```

### Audio Synchronized with Video

```typescript
{
  id: 'audio-sync',
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: 'background-music.mp3',
    volume: 0.7,
    startFrom: 0,
  },
  context: {
    timing: {
      start: 0,
      fitDurationTo: 'video-scene',  // Match video duration
    },
  },
}
```

## Real-World Examples from Presets

### From `media-track.ts`

Shows basic audio with volume and trimming:

```typescript
{
  id: sceneId,
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: mediaItem.src,
    volume: mediaItem.volume ?? 1,
    startFrom: mediaItem.startCropVideo ?? 0,
  } as AudioAtomDataProps,
  context: {
    timing: {
      ...(timeRange
        ? {
            start: timeRange.start,
            duration: timeRange.duration,
          }
        : {}),
      ...(mediaItem.duration && !timeRange
        ? { duration: mediaItem.duration }
        : {}),
    },
  },
}
```

### From `waveform.ts`

Shows audio for waveform visualization:

```typescript
{
  id: 'Audio',
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: audio?.src ?? '',
    volume: audio.volume || 1,
    startFrom: audio.start || 0,
  } as AudioAtomDataProps,
  context: audio.duration
    ? { timing: { duration: audio.duration } }
    : {},
}
```

### From `waveform-full.ts`

Shows audio with start offset:

```typescript
{
  id: 'Audio-xyz',
  componentId: 'AudioAtom',
  type: 'atom',
  data: {
    src: params.audio.src,
    volume: params.audio.volume,
    startFrom: params.audio.start ?? 0,
  } as AudioAtomDataProps,
}
```

### From `beatstitch.ts`

Shows audio with muted option:

```typescript
{
  id: `${trackName}-beatstitch-audio`,
  componentId: 'AudioAtom',
  type: 'atom' as const,
  data: {
    src: audio.src,
    muted: audio.muted ?? false,
    startFrom: audio.start ?? 0,
  },
  context: {
    timing: {},
  },
}
```

## Best Practices

1. **Use `startFrom` and `endAt`** for precise audio trimming instead of relying on duration alone
2. **Set appropriate volume levels** - background music typically uses `0.3` to `0.7`
3. **Use `fitDurationTo`** in context timing to sync audio with video duration
4. **Use range muting** to remove unwanted sections (like silence or profanity)
5. **Calculate effective duration** when using `playbackRate`:
   - Effective duration = (endAt - startFrom) / playbackRate
6. **Use `muted: { type: 'full', value: true }`** when you need audio data but no playback (e.g., for waveform analysis)
7. **Test audio synchronization** - use timing context to ensure audio aligns with visual elements
8. **Consider audio format** - MP3 is most compatible, WAV provides better quality

## Helper Functions

The `AudioAtom` exports `AudioDatahelper` with utility functions:

- `isMuted(data, options)`: Check if audio should be muted at a given timestamp

  ```typescript
  AudioDatahelper.isMuted(audioData, {
    timestamp: 12, // seconds
    fps: 30,
  });
  ```

- `getEffectiveDuration(data, originalDuration)`: Calculate effective duration after trimming and playback rate
  ```typescript
  AudioDatahelper.getEffectiveDuration(audioData, 120); // 120 seconds original
  ```

## Muting Strategies

### Full Mute

Use when you want to completely silence the audio:

```typescript
muted: { type: 'full', value: true }
```

### Range Mute

Use when you need to mute specific sections:

```typescript
muted: {
  type: 'range',
  values: [
    { start: 10, end: 15 },  // Silence from 10s to 15s
  ],
}
```

### Multiple Range Mutes

Mute multiple sections:

```typescript
muted: {
  type: 'range',
  values: [
    { start: 5, end: 10 },
    { start: 20, end: 25 },
    { start: 40, end: 45 },
  ],
}
```

## Volume Guidelines

- **Background music:** `0.3` - `0.7`
- **Sound effects:** `0.5` - `1.0`
- **Voice/narration:** `0.8` - `1.0`
- **Maximum (rare):** `1.5` - `2.0` (may cause distortion)

## Playback Rate Guidelines

- **Normal speed:** `1.0`
- **Slightly faster:** `1.1` - `1.25` (subtle speedup)
- **Fast:** `1.5` - `2.0` (noticeable speedup)
- **Slow motion:** `0.5` - `0.75` (slower playback)
- **Very slow:** `0.25` - `0.5` (dramatic slowdown)

Note: Extreme playback rates may affect audio quality.
