# Local Rendering API

The local rendering API allows you to render Remotion compositions locally on your server without using AWS Lambda. This is useful for development, testing, or when you want to keep rendering in-house.

## Endpoint

```
POST /api/remotion/render/local
```

## Request Body

```typescript
interface LocalRenderRequest {
  compositionId: string; // Required: ID of the composition to render
  inputProps?: Record<string, any>; // Optional: Props to pass to the composition
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores'; // Optional: Video codec (default: 'h264')
  audioCodec?: 'aac' | 'mp3' | 'pcm-16' | 'opus'; // Optional: Audio codec (default: 'aac')
  renderType?: 'video' | 'audio' | 'still'; // Optional: Type of render (default: 'video')
  outputLocation?: string; // Optional: Output directory (default: './out')
  fileName?: string; // Optional: Output filename (default: '{compositionId}-{timestamp}')
  concurrency?: number | 'auto'; // Optional: Parallel rendering threads (default: 'auto')
  quality?: 'fast' | 'balanced' | 'high'; // Optional: Quality preset (default: 'balanced')
  resumeFrom?: string; // Optional: Path to checkpoint file to resume from
}
```

### Performance Parameters

- **`concurrency`**: Controls how many frames are rendered in parallel
  - `'auto'` (default): Automatically detects optimal concurrency based on CPU cores (75% of available cores)
  - `number`: Specific number of parallel threads (e.g., `4`, `8`)
  - Higher values = faster rendering but more CPU/memory usage

- **`quality`**: Quality/speed tradeoff preset
  - `'fast'`: Fastest rendering, lower quality (CRF 28, 2M bitrate, 80% JPEG quality)
  - `'balanced'` (default): Good balance (CRF 23, 4M bitrate, 90% JPEG quality)
  - `'high'`: Highest quality, slower rendering (CRF 18, 8M bitrate, 100% JPEG quality)

- **`resumeFrom`**: Path to checkpoint file to resume a failed render
  - When a render fails or is interrupted, a checkpoint file is saved
  - Use this parameter to continue from where it left off instead of starting over

## Available Compositions

- `DataMotion` - Data visualization composition
- `ExampleDataMotion` - Example data motion with test data
- `Ripple` - Ripple animation composition
- `Waveform` - Audio waveform visualization

## Render Types

### Video Rendering

Renders a complete video with both video and audio tracks.

```json
{
  "compositionId": "DataMotion",
  "codec": "h264",
  "audioCodec": "aac",
  "renderType": "video",
  "fileName": "my-video"
}
```

### Audio Rendering

Renders only the audio track from the composition.

```json
{
  "compositionId": "Waveform",
  "codec": "h264",
  "audioCodec": "mp3",
  "renderType": "audio",
  "fileName": "my-audio"
}
```

### Still Rendering

Renders a single frame as a PNG image.

```json
{
  "compositionId": "Ripple",
  "renderType": "still",
  "fileName": "my-still"
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "video render completed successfully",
  "result": {
    "type": "video",
    "outputPath": "./out/DataMotion-1234567890.mp4",
    "fileName": "DataMotion-1234567890.mp4",
    "composition": {
      "id": "DataMotion",
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "durationInFrames": 600,
      "durationInSeconds": 20
    }
  }
}
```

### Error Response

```json
{
  "error": "Local render failed",
  "message": "Composition with ID 'NonExistent' not found",
  "stack": "Error stack trace (development only)",
  "checkpointAvailable": true,
  "checkpointPath": "./out/my-video-1234567890.checkpoint.json",
  "resumeInstructions": "To resume rendering, include \"resumeFrom\": \"./out/my-video-1234567890.checkpoint.json\" in your next request"
}
```

**Note**: When a render fails, the response includes checkpoint information if available, allowing you to resume the render from where it failed.

## Usage Examples

### Basic Video Render

```javascript
const response = await fetch('/api/remotion/render/local', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    compositionId: 'DataMotion',
    renderType: 'video',
  }),
});

const result = await response.json();
console.log('Output file:', result.result.outputPath);
```

### Custom Props and Settings

```javascript
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
```

### Audio-Only Render

```javascript
const response = await fetch('/api/remotion/render/local', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    compositionId: 'Waveform',
    audioCodec: 'mp3',
    renderType: 'audio',
    fileName: 'my-audio',
  }),
});
```

### Fast Rendering (Optimized for Speed)

```javascript
const response = await fetch('/api/remotion/render/local', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    compositionId: 'DataMotion',
    quality: 'fast', // Use fast quality preset
    concurrency: 8, // Use 8 parallel threads
    renderType: 'video',
  }),
});
```

**Expected speedup**: 3-10x faster depending on CPU cores (e.g., 3 hours → 18-60 minutes for a 10-minute video)

### High Quality Rendering

```javascript
const response = await fetch('/api/remotion/render/local', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    compositionId: 'DataMotion',
    quality: 'high', // Use high quality preset
    concurrency: 'auto', // Auto-detect optimal concurrency
    renderType: 'video',
  }),
});
```

### Resuming a Failed Render

```javascript
// First attempt (may fail due to error)
try {
  const response = await fetch('/api/remotion/render/local', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      compositionId: 'DataMotion',
      fileName: 'my-video',
      quality: 'balanced',
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Render failed:', error.message);
    
    if (error.checkpointAvailable) {
      console.log('Checkpoint saved at:', error.checkpointPath);
      console.log('Resume instructions:', error.resumeInstructions);
      
      // Resume from checkpoint
      const resumeResponse = await fetch('/api/remotion/render/local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compositionId: 'DataMotion',
          fileName: 'my-video',
          resumeFrom: error.checkpointPath, // Resume from where it failed
          quality: 'balanced',
        }),
      });
      
      const result = await resumeResponse.json();
      console.log('Render resumed and completed:', result);
    }
  }
} catch (err) {
  console.error('Request failed:', err);
}
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `500` - Internal Server Error (rendering failed)

Always check the response status and handle errors appropriately:

```javascript
const response = await fetch('/api/remotion/render/local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody),
});

if (!response.ok) {
  const error = await response.json();
  console.error('Render failed:', error.message);
  return;
}

const result = await response.json();
console.log('Render successful:', result);
```

## Performance Considerations

### Speed Optimization

- **Concurrency**: The API now supports parallel frame rendering
  - Default: Auto-detects and uses 75% of available CPU cores
  - Example: 8-core CPU → uses 6 threads → ~6x faster than single-threaded
  - 10-minute video that took 3 hours → now takes 30-60 minutes with proper concurrency
  
- **GPU Acceleration**: Automatically enabled for faster rendering
  - Uses hardware acceleration for video encoding
  - Significantly reduces CPU load and improves speed

- **Quality Presets**: Choose based on your needs
  - `fast`: Best for previews, drafts, or when speed is critical
  - `balanced`: Good for most production use cases
  - `high`: Best for final deliverables where quality is paramount

### Resumable Rendering

- **Checkpoint System**: Renders are automatically checkpointed every 100 frames
- **Error Recovery**: If a render fails, you can resume from the last checkpoint
- **Benefits**: 
  - No need to re-render already completed frames
  - Save hours on long videos
  - Robust against intermittent errors or interruptions

### Resource Management

- Local rendering uses your server's CPU and memory resources
- Memory limit automatically increased to 8GB for better performance
- Monitor server resources during rendering operations
- For very long videos (>30 minutes), consider using AWS Lambda rendering instead

## File Output

- Videos are saved as `.mp4` files
- Audio files use the appropriate extension based on codec (`.m4a` for AAC, `.mp3` for MP3, etc.)
- Still images are saved as `.png` files
- Files are saved to the specified `outputLocation` or `./out` by default
