# Audio Data Fetching and Video Stylization Guide

This guide explains how to fetch audio analysis data and use it to create dynamic, audio-synchronized video effects in your presets. We'll reference the `beatstitch.ts` preset as a practical example.

## Table of Contents

1. [Fetching Audio Data](#fetching-audio-data)
2. [Understanding Audio Analysis Data](#understanding-audio-analysis-data)
3. [Stylizing Video Based on Audio](#stylizing-video-based-on-audio)
4. [Advanced Techniques](#advanced-techniques)
5. [Best Practices](#best-practices)

---

## Fetching Audio Data

### Step 1: Call the Audio Analysis API

The `/api/analyze-audio` endpoint analyzes audio files and returns comprehensive beat detection and frequency analysis data.

```typescript
const { analysis, durationInSeconds, summary } = await fetcher(
  '/api/analyze-audio',
  {
    audioSrc: audio.src, // URL to the audio file
  },
);
```

### Step 2: Handle the Response

The API returns three main pieces of data:

- **`analysis`**: Array of audio analysis results (detailed below)
- **`durationInSeconds`**: Total duration of the audio file
- **`summary`**: Aggregated statistics about the audio

```typescript
if (!analysis || analysis.length === 0) {
  // Handle case where no beats were detected
  return {
    output: {
      childrenData: [],
    },
    options: {},
  };
}
```

---

## Understanding Audio Analysis Data

Each item in the `analysis` array contains detailed information about a specific moment in the audio:

```typescript
interface AudioAnalysisResult {
  timestamp: number; // Time in seconds when this analysis window occurs
  intensity: number; // RMS intensity normalized to 0-1 scale
  frequency: number; // Dominant frequency in Hz
  beatType: 'low' | 'mid' | 'high'; // Frequency-based classification
  spectralCentroid: number; // "Brightness" of the sound (0-1)
  spectralRolloff: number; // Frequency below which 85% of energy lies (0-1)
  zeroCrossingRate: number; // Rate of sign changes (indicates noise vs tone)
  mfcc: number[]; // Mel-frequency cepstral coefficients for timbre analysis
}
```

### Key Properties Explained

- **`timestamp`**: Use this to synchronize visual elements with specific moments in the audio
- **`intensity`**: Higher values (closer to 1) indicate louder/more impactful moments
- **`frequency`**: The dominant frequency can help you match visual effects to musical elements
- **`beatType`**: Categorizes beats into low (bass), mid (midrange), or high (treble) frequencies
- **`spectralCentroid`**: Higher values indicate "brighter" sounds (more high-frequency content)
- **`spectralRolloff`**: Indicates where most of the energy is concentrated in the frequency spectrum

### Summary Object

The `summary` object provides high-level statistics:

```typescript
{
  totalBeats: number,        // Total number of detected beats
  averageIntensity: number,  // Average intensity across all beats
  lowBeats: number,         // Count of low-frequency beats
  midBeats: number,         // Count of mid-frequency beats
  highBeats: number         // Count of high-frequency beats
}
```

---

## Stylizing Video Based on Audio

### Basic Pattern: Beat-Synchronized Clips

The `beatstitch.ts` preset demonstrates a common pattern: synchronizing video clip changes with detected beats.

#### 1. Filter and Process Analysis Data

```typescript
// Filter beats based on time ranges or audio start/duration
const clippedAnalysis = analysis.filter(
  beat =>
    beat.timestamp >= audioStart &&
    beat.timestamp <= audioStart + audioDuration,
);

// Adjust timestamps to be relative to video start
const adjustedBeats = clippedAnalysis.map(beat => ({
  ...beat,
  timestamp: beat.timestamp - audioStart,
}));
```

#### 2. Select Impactful Beats

Not all beats are equally important. Use intensity and local peak detection to select the most impactful moments:

```typescript
const selectImpactfulBeats = (
  beats: AudioAnalysisResult[],
  maxBeatsCount: number = 30,
  minTimeDiff: number = 0.5,
) => {
  // Calculate local intensity peaks (beats significantly higher than neighbors)
  const beatsWithLocalPeaks = beats.map((beat, index) => {
    const windowSize = 10;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(beats.length, index + windowSize + 1);
    const neighbors = beats.slice(start, end);
    const avgNeighborIntensity =
      neighbors.reduce((sum, b) => sum + b.intensity, 0) / neighbors.length;

    const localPeakStrength = beat.intensity - avgNeighborIntensity;
    const isLocalPeak = localPeakStrength > 0.05;

    return {
      ...beat,
      localPeakStrength,
      isLocalPeak,
      avgNeighborIntensity,
    };
  });

  // Score beats based on multiple factors
  const scoredBeats = beatsWithLocalPeaks.map(beat => {
    const intensityScore = beat.intensity * 0.3;
    const peakScore = beat.isLocalPeak ? beat.localPeakStrength * 0.4 : 0;
    const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.2;
    const spectralScore = (beat.spectralCentroid || 0) * 0.1;

    const totalScore =
      intensityScore + peakScore + frequencyScore + spectralScore;

    return { ...beat, totalScore };
  });

  // Sort by score and select top beats respecting minimum time difference
  const sortedByImpact = scoredBeats.sort(
    (a, b) => b.totalScore - a.totalScore,
  );

  const selectedBeats: AudioAnalysisResult[] = [];
  const usedTimestamps = new Set<number>();

  for (const beat of sortedByImpact) {
    const tooClose = Array.from(usedTimestamps).some(
      usedTime => Math.abs(beat.timestamp - usedTime) < minTimeDiff,
    );

    if (!tooClose && selectedBeats.length < maxBeatsCount) {
      selectedBeats.push(beat);
      usedTimestamps.add(beat.timestamp);
    }
  }

  return selectedBeats.sort((a, b) => a.timestamp - b.timestamp);
};
```

#### 3. Create Beat-Synchronized Video Clips

Use the selected beats to create video clips that change at each beat:

```typescript
const beatSyncedClips = selectedBeats.map((beatData, index) => {
  const { timestamp } = beatData;
  const nextBeat = selectedBeats[index + 1];

  // Calculate duration until next beat (or end of audio)
  const baseDuration = nextBeat
    ? nextBeat.timestamp - timestamp
    : durationInSeconds - timestamp;

  // Add overlap for smooth transitions
  const overlapTime = 0.3;
  const duration = baseDuration + overlapTime;
  const startTime = timestamp - overlapTime / 2;

  // Select clip (repeat or use unique clips)
  const clipIndex = isRepeatClips
    ? index % clips.length
    : Math.min(index, clips.length - 1);
  const clip = clips[clipIndex];

  return {
    id: `beat-clip-${index}`,
    componentId: clip.type === 'image' ? 'ImageAtom' : 'VideoAtom',
    type: 'atom' as const,
    data: {
      src: clip.src,
      className: 'w-full h-full object-cover',
      fit: clip.fit || 'cover',
      // ... other clip properties
    },
    context: {
      timing: {
        start: startTime,
        duration,
      },
    },
    effects: [],
  };
});
```

#### 4. Apply Dynamic Effects Based on Audio Properties

Use audio properties to drive visual effects:

```typescript
// Intensity-based effects
const effects = [];

if (beatData.intensity > 0.7) {
  // High intensity = stronger shake effect
  effects.push({
    id: `shake-effect-${clip.id}`,
    componentId: 'shake',
    data: {
      amplitude: 5 + 10 * beatData.intensity,
      frequency: 0.3 + 0.5 * beatData.intensity,
      duration: 0.3,
      start: 0,
    },
  });
}

// Frequency-based color changes
const getColorFromBeatType = (beatType: 'low' | 'mid' | 'high') => {
  if (beatType === 'low') return '#ff6b6b'; // Red for bass
  if (beatType === 'mid') return '#4ecdc4'; // Teal for midrange
  return '#45b7d1'; // Blue for treble
};

// Spectral centroid-based brightness
const brightness = 0.7 + beatData.spectralCentroid * 0.3;
```

---

## Advanced Techniques

### 1. Time Range-Based Processing

Apply beat synchronization only to specific time ranges:

```typescript
const clipRanges = ['1:35-2:36', '3:45-4:20']; // Format: "MM:SS-MM:SS"

const parseTimeRange = (timeRange: string): { start: number; end: number } => {
  const [startStr, endStr] = timeRange.split('-');
  const parseTime = (timeStr: string): number => {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  };
  return {
    start: parseTime(startStr),
    end: parseTime(endStr),
  };
};

// Filter beats within ranges
const parsedRanges = clipRanges.map(parseTimeRange);
const beatsInRanges = analysis.filter(beat =>
  parsedRanges.some(
    range => beat.timestamp >= range.start && beat.timestamp <= range.end,
  ),
);
```

### 2. Tempo-Based Optimization

Calculate optimal beat count based on musical tempo:

```typescript
const calculateOptimalBeatCount = (
  beats: AudioAnalysisResult[],
  duration: number,
) => {
  if (beats.length === 0) return 10;

  // Calculate tempo (beats per minute)
  const tempo = (beats.length / duration) * 60;

  // Adjust beat count based on tempo
  let optimalBeats = 10; // Base number

  if (tempo > 140) {
    // Fast music - more frequent cuts
    optimalBeats = Math.min(25, Math.floor(duration * 1.5));
  } else if (tempo > 100) {
    // Medium tempo - balanced cuts
    optimalBeats = Math.min(20, Math.floor(duration * 1.2));
  } else {
    // Slow music - fewer, more impactful cuts
    optimalBeats = Math.min(15, Math.floor(duration * 0.8));
  }

  return Math.max(5, Math.min(optimalBeats, 30));
};
```

### 3. Continuous Scale Animation Based on Clip Duration

Create dynamic zoom effects that adapt to clip duration:

```typescript
const applyContinuousScale = (clip: any) => {
  const clipDuration = clip.context.timing.duration;
  const minScale = 1.1;
  const maxScale = 1.3;
  const minDuration = 0.5;
  const maxDuration = 2.0;

  const durationRatio =
    (clipDuration - minDuration) / (maxDuration - minDuration);
  const clampedRatio = Math.max(0, Math.min(1, durationRatio));
  const inverseRatio = 1 - clampedRatio;
  const scaleFactor = minScale + (maxScale - minScale) * inverseRatio;

  return {
    id: `continuous-scale-effect-${clip.id}`,
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [clip.id],
      type: 'spring',
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1 * scaleFactor, prog: 0.1 },
        { key: 'scale', val: 1.1 * scaleFactor, prog: 0.7 },
        { key: 'scale', val: 1.2 * scaleFactor, prog: 1 },
      ],
      duration: clipDuration,
      start: 0,
    },
  };
};
```

### 4. Beat Counter Overlay

Create visual beat counters synchronized with audio:

```typescript
const createBeatCounter = (
  beatData: AudioAnalysisResult,
  index: number,
  nextBeat?: AudioAnalysisResult,
) => {
  const { timestamp, intensity, beatType } = beatData;
  const duration = nextBeat ? nextBeat.timestamp - timestamp : 2; // Default duration if no next beat

  const color = getColorFromBeatType(beatType);
  const fontSize = Math.max(50, 100 + intensity * 100);

  return {
    id: `beat-text-${index}`,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: `${index + 1}`,
      style: {
        fontSize,
        fontWeight: 'bold',
        color,
        textAlign: 'center',
        opacity: 0.7 + intensity * 0.3,
      },
    },
    context: {
      timing: {
        start: timestamp,
        duration,
      },
    },
  };
};
```

---

## Best Practices

### 1. Error Handling

Always handle cases where audio analysis fails or returns no data:

```typescript
const { analysis, durationInSeconds, summary } = await fetcher(
  '/api/analyze-audio',
  { audioSrc: audio.src },
);

if (!analysis || analysis.length === 0) {
  return {
    output: {
      childrenData: [],
    },
    options: {},
  };
}
```

### 2. Performance Optimization

- Cache audio analysis results when possible (the API includes cache headers)
- Filter analysis data early to reduce processing overhead
- Use efficient algorithms for beat selection (avoid nested loops when possible)

### 3. Musical Context

- Consider tempo when determining clip change frequency
- Use local peak detection to find musically significant moments
- Respect minimum time differences to avoid jarring rapid cuts

### 4. Visual Consistency

- Maintain consistent transition durations across clips
- Use audio properties (intensity, frequency) to drive visual intensity
- Create smooth overlaps between clips for seamless transitions

### 5. Flexibility

- Allow users to specify time ranges for beat synchronization
- Provide options for clip repetition vs. unique clips
- Make effects configurable (impact levels, transition types)

---

## Example: Complete Pattern

Here's a simplified version of the pattern used in `beatstitch.ts`:

```typescript
const presetExecution = async (params, props) => {
  const { audio, clips } = params;
  const { fetcher } = props;

  // 1. Fetch audio analysis
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: audio.src,
  });

  if (!analysis || analysis.length === 0) {
    return { output: { childrenData: [] }, options: {} };
  }

  // 2. Filter and adjust timestamps
  const clippedAnalysis = analysis
    .filter(beat => beat.timestamp >= (audio.start || 0))
    .map(beat => ({
      ...beat,
      timestamp: beat.timestamp - (audio.start || 0),
    }));

  // 3. Select impactful beats
  const selectedBeats = selectImpactfulBeats(clippedAnalysis, 20, 0.5);

  // 4. Create beat-synchronized clips
  const beatSyncedClips = selectedBeats.map((beat, index) => {
    const nextBeat = selectedBeats[index + 1];
    const duration = nextBeat
      ? nextBeat.timestamp - beat.timestamp
      : durationInSeconds - beat.timestamp;

    const clip = clips[index % clips.length];

    return {
      id: `beat-clip-${index}`,
      componentId: clip.type === 'image' ? 'ImageAtom' : 'VideoAtom',
      type: 'atom' as const,
      data: { src: clip.src, fit: 'cover' },
      context: {
        timing: {
          start: beat.timestamp,
          duration,
        },
      },
      effects: [
        // Add effects based on beat properties
        createShakeEffect(beat.intensity),
        createScaleEffect(duration),
      ],
    };
  });

  // 5. Return composition
  return {
    output: {
      childrenData: [
        {
          id: 'beatstitch-track',
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: { className: 'absolute inset-0' },
            repeatChildrenProps: {
              className: 'absolute inset-0 flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: durationInSeconds,
            },
          },
          childrenData: [
            ...beatSyncedClips,
            {
              id: 'audio-track',
              componentId: 'AudioAtom',
              type: 'atom' as const,
              data: { src: audio.src },
              context: { timing: {} },
            },
          ],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};
```

---

## Reference

- **Audio Analysis API**: `/api/analyze-audio` (POST)
- **Example Preset**: `beatstitch.ts` - Full implementation of beat-synchronized video clips
- **Audio Analysis Types**: See `apps/mediamake/app/api/analyze-audio/route.ts` for complete type definitions

---

## Tips for Custom Presets

1. **Start Simple**: Begin with basic beat detection and clip synchronization
2. **Iterate**: Add more sophisticated beat selection algorithms gradually
3. **Test**: Try different audio tracks to ensure your preset works across genres
4. **Optimize**: Profile your beat selection algorithms for performance
5. **Document**: Clearly document which audio properties drive which visual effects

Happy preset building! 🎵🎬
