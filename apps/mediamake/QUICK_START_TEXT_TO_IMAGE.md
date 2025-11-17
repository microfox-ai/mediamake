# Quick Start: Text-to-Image for Captions

This guide will help you generate stylized graphic novel images for your transcription captions in just a few steps.

## Prerequisites

1. ✅ A transcription with captions in your database
2. ✅ `MEDIA_HELPER_URL` environment variable set
3. ✅ Text-to-image API running at that URL

## Setup (One-Time)

### 1. Set Environment Variable

Add to your `.env` file:

```bash
MEDIA_HELPER_URL=http://localhost:8080
# or your production URL
```

### 2. Verify the API is Running

```bash
curl $MEDIA_HELPER_URL/health
# Should return 200 OK
```

## Usage

### Method 1: HTTP API (Recommended for Frontend)

```bash
# Replace YOUR_TRANSCRIPTION_ID with actual ID
curl -X POST http://localhost:3000/api/transcriptions/YOUR_TRANSCRIPTION_ID/generate-images \
  -H "Content-Type: application/json" \
  -d '{
    "imageSize": "landscape_16_9",
    "imageResolution": "2K"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSentences": 10,
    "summary": {
      "completed": 9,
      "failed": 1,
      "successRate": "90.0%"
    }
  }
}
```

### Method 2: From React Component

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function GenerateImagesButton({ transcriptionId }: { transcriptionId: string }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setStatus('Generating images...');
    
    try {
      const response = await fetch(
        `/api/transcriptions/${transcriptionId}/generate-images`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageSize: 'landscape_16_9',
            imageResolution: '2K',
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setStatus(`✅ Generated ${data.data.summary.completed} images!`);
      } else {
        setStatus('❌ Failed to generate images');
      }
    } catch (error) {
      setStatus('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Images'}
      </Button>
      {status && <p className="mt-2">{status}</p>}
    </div>
  );
}
```

### Method 3: From Node.js Script

```typescript
import { aiMainRouter } from '@/app/ai';

async function generateImages(transcriptionId: string) {
  const response = await aiMainRouter.toAwaitResponse('/script-meta/text-to-image', {
    request: {
      messages: [],
      params: {
        transcriptionId,
        imageSize: 'landscape_16_9',
        imageResolution: '2K',
      },
    },
  });

  const data = await response.json();
  console.log('Images generated:', data);
}

generateImages('your-transcription-id');
```

## Options

### Image Size Options

```typescript
imageSize: 'landscape_16_9'  // 16:9 widescreen (recommended for videos)
imageSize: 'square_hd'        // Square format
imageSize: 'portrait_16_9'    // Portrait format
imageSize: 'landscape_21_9'   // Ultrawide
// ... see docs for all options
```

### Resolution Options

```typescript
imageResolution: '1K'  // Fast, lower quality
imageResolution: '2K'  // Balanced (recommended)
imageResolution: '4K'  // Highest quality, slower
```

### Custom Instructions

```typescript
{
  "userRequest": "Make the images more dramatic with high contrast"
}
```

## Check Status

Get the current status of generated images:

```bash
curl http://localhost:3000/api/transcriptions/YOUR_TRANSCRIPTION_ID/generate-images
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCaptions": 10,
    "captionsWithImages": 9,
    "progress": "9/10",
    "captions": [
      {
        "captionIndex": 0,
        "text": "The power grid's been dark...",
        "hasImage": true,
        "imageUrl": "https://...",
        "status": "completed"
      }
      // ... more captions
    ]
  }
}
```

## View Generated Images

After generation, each caption will have metadata with the image URL:

```typescript
// In your database or API response
caption.metadata.imageUrl  // "https://..."
caption.metadata.imagePrompt  // The AI-generated prompt
caption.metadata.status  // "completed" or "failed"
```

## Common Issues

### Issue: "MEDIA_HELPER_URL environment variable not set"

**Solution:** Add `MEDIA_HELPER_URL` to your `.env` file

```bash
MEDIA_HELPER_URL=http://localhost:8080
```

### Issue: "Transcription not found"

**Solution:** Verify the transcription ID is correct

```bash
# Check in MongoDB
db.transcriptions.find({ "_id": ObjectId("your-id") })
```

### Issue: Low success rate

**Solution:** 
1. Check if text-to-image API is running
2. Verify API has sufficient resources
3. Try lower resolution (1K instead of 4K)

## Performance

- **Processing Time:** ~7-13 seconds per caption
- **Parallel Processing:** All captions processed simultaneously
- **Success Rate:** Typically 80-95%

## Next Steps

1. ✅ Generate images for a transcription
2. ✅ Check the generated images in caption metadata
3. ✅ Use images in your video rendering pipeline
4. ✅ Customize the art style (see full documentation)

## Full Documentation

- **Usage Guide:** `app/ai/agents/scriptMeta/TEXT_TO_IMAGE_USAGE.md`
- **Implementation Details:** `TEXT_TO_IMAGE_IMPLEMENTATION.md`
- **Example Script:** `examples/text-to-image-example.ts`

## Need Help?

1. Check the console logs for detailed error messages
2. Review the full documentation
3. Test with a small transcription first
4. Verify environment configuration

## Art Style Preview

The generated images will have:
- ✅ Graphic novel, hand-drawn style
- ✅ Limited color palette (Dark Indigo, Burnt Orange, Muted Tan)
- ✅ Bold, hand-lettered text integrated into the image
- ✅ 16:9 aspect ratio (or your chosen size)
- ✅ Non-photorealistic, expressive aesthetic

---

**That's it!** You're ready to generate images for your captions. Start with a small transcription to test, then scale up to larger projects.



