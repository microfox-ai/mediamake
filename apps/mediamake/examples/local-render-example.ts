/**
 * Example usage of the local rendering API route
 *
 * This file demonstrates how to use the /api/remotion/render/local endpoint
 * to render Remotion compositions locally with different codecs and render types.
 */

// Example 1: Render a video with default settings
export const renderVideoExample = async () => {
  const response = await fetch('/api/remotion/render/local', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositionId: 'DataMotion',
      codec: 'h264',
      audioCodec: 'aac',
      renderType: 'video',
      fileName: 'my-video',
    }),
  });

  const result = await response.json();
  console.log('Video render result:', result);
};

// Example 2: Render audio only
export const renderAudioExample = async () => {
  const response = await fetch('/api/remotion/render/local', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositionId: 'Waveform',
      codec: 'h264', // Still required for audio rendering
      audioCodec: 'mp3',
      renderType: 'audio',
      fileName: 'my-audio',
    }),
  });

  const result = await response.json();
  console.log('Audio render result:', result);
};

// Example 3: Render a still image
export const renderStillExample = async () => {
  const response = await fetch('/api/remotion/render/local', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositionId: 'Ripple',
      renderType: 'still',
      fileName: 'my-still',
    }),
  });

  const result = await response.json();
  console.log('Still render result:', result);
};

// Example 4: Render with custom input props
export const renderWithPropsExample = async () => {
  const response = await fetch('/api/remotion/render/local', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositionId: 'DataMotion',
      inputProps: {
        title: 'Custom Title',
        backgroundColor: 'blue',
        duration: 10,
      },
      codec: 'h265',
      audioCodec: 'opus',
      renderType: 'video',
      outputLocation: './custom-output',
      fileName: 'custom-video',
    }),
  });

  const result = await response.json();
  console.log('Custom render result:', result);
};

// Example 5: Available compositions
export const availableCompositions = [
  'DataMotion', // Data visualization composition
  'ExampleDataMotion', // Example data motion with test data
  'Ripple', // Ripple animation composition
  'Waveform', // Audio waveform visualization
];

// Example 6: Supported codecs and audio codecs
export const supportedCodecs = {
  video: ['h264', 'h265', 'vp8', 'vp9', 'prores'],
  audio: ['aac', 'mp3', 'pcm-16', 'opus'],
  renderTypes: ['video', 'audio', 'still'],
};

// Example 7: Error handling
export const renderWithErrorHandling = async () => {
  try {
    const response = await fetch('/api/remotion/render/local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compositionId: 'NonExistentComposition',
        renderType: 'video',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Render failed:', error);
      return;
    }

    const result = await response.json();
    console.log('Render successful:', result);
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Example 8: Fast rendering with performance optimization
export const renderFastExample = async () => {
  const response = await fetch('/api/remotion/render/local', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositionId: 'DataMotion',
      codec: 'h264',
      renderType: 'video',
      fileName: 'fast-render',
      // Performance optimizations
      quality: 'fast', // Use fast quality preset
      concurrency: 8, // Render 8 frames in parallel
    }),
  });

  const result = await response.json();
  console.log('Fast render result:', result);
  console.log('Expected speedup: 3-10x faster depending on CPU cores');
};

// Example 9: Auto-optimized rendering (recommended)
export const renderAutoOptimizedExample = async () => {
  const response = await fetch('/api/remotion/render/local', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositionId: 'DataMotion',
      codec: 'h264',
      renderType: 'video',
      fileName: 'auto-optimized',
      quality: 'balanced', // Good balance of quality and speed
      concurrency: 'auto', // Auto-detect optimal concurrency based on CPU
    }),
  });

  const result = await response.json();
  console.log('Auto-optimized render result:', result);
};

// Example 10: High quality rendering
export const renderHighQualityExample = async () => {
  const response = await fetch('/api/remotion/render/local', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositionId: 'DataMotion',
      codec: 'h264',
      renderType: 'video',
      fileName: 'high-quality',
      quality: 'high', // Highest quality preset
      concurrency: 'auto',
    }),
  });

  const result = await response.json();
  console.log('High quality render result:', result);
};

// Example 11: Resumable rendering with error recovery
export const renderWithResumeExample = async () => {
  let checkpointPath: string | undefined;

  // First attempt
  try {
    const response = await fetch('/api/remotion/render/local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compositionId: 'DataMotion',
        fileName: 'resumable-video',
        quality: 'balanced',
        concurrency: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Render failed:', error.message);

      // Check if checkpoint is available
      if (error.checkpointAvailable) {
        checkpointPath = error.checkpointPath;
        console.log('✅ Checkpoint saved at:', checkpointPath);
        console.log('📍 Resume instructions:', error.resumeInstructions);

        // Resume from checkpoint
        console.log('\n🔄 Attempting to resume render...\n');
        const resumeResponse = await fetch('/api/remotion/render/local', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            compositionId: 'DataMotion',
            fileName: 'resumable-video',
            resumeFrom: checkpointPath, // Resume from where it failed
            quality: 'balanced',
            concurrency: 'auto',
          }),
        });

        const result = await resumeResponse.json();
        console.log('✅ Render resumed and completed:', result);
      } else {
        console.log('❌ No checkpoint available, render must start from scratch');
      }
    } else {
      const result = await response.json();
      console.log('✅ Render completed on first attempt:', result);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Example 12: Quality presets comparison
export const qualityPresets = {
  fast: {
    description: 'Fastest rendering, lower quality',
    settings: { quality: 'fast', crf: 28, bitrate: '2M', jpegQuality: 80 },
    useCase: 'Previews, drafts, quick iterations',
    speedup: '~2x faster than balanced',
  },
  balanced: {
    description: 'Good balance of quality and speed',
    settings: { quality: 'balanced', crf: 23, bitrate: '4M', jpegQuality: 90 },
    useCase: 'Most production use cases (default)',
    speedup: 'Baseline',
  },
  high: {
    description: 'Highest quality, slower rendering',
    settings: { quality: 'high', crf: 18, bitrate: '8M', jpegQuality: 100 },
    useCase: 'Final deliverables, archive quality',
    speedup: '~2x slower than balanced',
  },
};