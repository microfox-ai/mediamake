# Text-to-Image Agent Usage Guide

## Overview

The Text-to-Image Agent is a powerful tool that automatically generates stylized graphic novel images for each caption in a transcription. It transforms caption text into detailed image generation prompts using AI, then calls the text-to-image API to create consistent, high-quality images.

## Features

- **AI Prompt Transformation**: Uses Gemini 2.5 Pro to transform captions into detailed image prompts
- **Consistent Art Style**: Generates images in a stylized graphic novel aesthetic with a strict color palette
- **Automatic Processing**: Handles the entire workflow from prompt generation to image creation
- **Database Integration**: Automatically saves generated images to caption metadata
- **Batch Processing**: Processes all captions in a transcription with progress tracking

## Art Style

The generated images follow these guidelines:

- **Aesthetic**: Hand-drawn, graphic novel illustration style
- **Color Palette**: Dark Indigo, Burnt Orange, Muted Tan/Off-White
- **Text Integration**: Bold, blocky, hand-lettered font integrated into the artwork
- **Format**: 16:9 aspect ratio (configurable)
- **Texture**: Heavy colored pencil shading, crosshatching, textured paper background

## How to Use

### Method 1: Via AI Router (Programmatic)

```typescript
import { aiMainRouter } from '@/app/ai';

// Call the text-to-image agent
const response = await aiMainRouter.toAwaitResponse('/script-meta/text-to-image', {
  request: {
    messages: [],
    params: {
      transcriptionId: 'your-transcription-id',
      imageSize: 'landscape_16_9', // optional
      imageResolution: '2K', // optional
      userRequest: 'Focus on dramatic lighting', // optional
    },
  },
});

// Parse the response
const responseData = await response.json();
const message = responseData[0];
const toolPart = message.parts.find((p: any) => p.type.startsWith('tool-'));
const result = toolPart.output;

console.log('Generated images:', result.sentences);
```

### Method 2: Via API Endpoint

Create a new API endpoint at `app/api/transcriptions/[id]/generate-images/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { aiMainRouter } from '@/app/ai';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid transcription ID' },
        { status: 400 }
      );
    }

    const response = await aiMainRouter.toAwaitResponse('/script-meta/text-to-image', {
      request: {
        messages: [],
        params: {
          transcriptionId: id,
          imageSize: body.imageSize || 'landscape_16_9',
          imageResolution: body.imageResolution || '1K',
          userRequest: body.userRequest,
        },
      },
    });

    const responseData = await response.json();
    const message = responseData[0];
    const toolPart = message.parts.find((p: any) => p.type.startsWith('tool-'));
    const result = toolPart.output;

    if (!result) {
      throw new Error('Failed to get result from agent');
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Error generating images:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

Then call it from your frontend or any HTTP client:

```bash
curl -X POST http://localhost:3000/api/transcriptions/YOUR_ID/generate-images \
  -H "Content-Type: application/json" \
  -d '{
    "imageSize": "landscape_16_9",
    "imageResolution": "2K",
    "userRequest": "Make the images more dramatic"
  }'
```

### Method 3: Via Frontend Component

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function GenerateImagesButton({ transcriptionId }: { transcriptionId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generateImages = async () => {
    setLoading(true);
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
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={generateImages} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Images'}
      </Button>
      
      {result && (
        <div className="mt-4">
          <h3>Generated {result.data.sentences.length} images</h3>
          <p>Success rate: {(result.data.confidence * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}
```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `transcriptionId` | string | Yes | - | The MongoDB ObjectId of the transcription |
| `imageSize` | string | No | `landscape_16_9` | Image aspect ratio (see options below) |
| `imageResolution` | string | No | `1K` | Image resolution: `1K`, `2K`, or `4K` |
| `userRequest` | string | No | - | Additional instructions for image generation |

### Image Size Options

- `square` - 1:1 aspect ratio
- `square_hd` - 1:1 HD aspect ratio
- `portrait_4_3` - 4:3 portrait
- `portrait_3_2` - 3:2 portrait
- `portrait_16_9` - 16:9 portrait
- `landscape_4_3` - 4:3 landscape
- `landscape_3_2` - 3:2 landscape
- `landscape_16_9` - 16:9 landscape (recommended for videos)
- `landscape_21_9` - 21:9 ultrawide

## Output Structure

The agent returns detailed results for each caption:

```typescript
{
  sentences: [
    {
      sentenceIndex: 0,
      originalText: "The power grid's been dark for 72 hours",
      metadata: {
        imagePrompt: "A stylized graphic novel illustration...",
        taskId: "task-123",
        imageUrl: "https://...",
        status: "completed",
        imageSize: "landscape_16_9",
        imageResolution: "2K"
      },
      usage: {
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200
      }
    },
    // ... more sentences
  ],
  totalSentences: 10,
  confidence: 0.9, // Success rate (0-1)
  dominantFeel: {
    completed: 9,
    failed: 1
  }
}
```

## Metadata Added to Captions

Each caption in the database will have the following metadata added:

```typescript
{
  imagePrompt: string;      // The AI-generated image prompt
  taskId: string;           // The text-to-image task ID
  imageUrl: string;         // The generated image URL
  status: 'completed' | 'failed';
  imageSize: string;        // The image size used
  imageResolution: string;  // The resolution used
  error?: string;           // Error message if failed
}
```

## Environment Setup

Make sure you have the following environment variable set:

```bash
MEDIA_HELPER_URL=http://localhost:8080
# Or your production URL
MEDIA_HELPER_URL=https://your-media-helper-api.com
```

## Error Handling

The agent handles errors gracefully:

- **Missing Environment Variable**: Throws error if `MEDIA_HELPER_URL` is not set
- **API Failures**: Individual caption failures don't stop the entire process
- **Timeout Handling**: Images that take too long (default: 60 seconds) are marked as failed
- **Database Updates**: Only successful captions update the database

## Performance Considerations

- **Processing Time**: Each caption takes ~5-10 seconds (prompt generation + image creation)
- **Parallel Processing**: All captions are processed in parallel for efficiency
- **API Limits**: Be aware of rate limits on the text-to-image API
- **Cost**: Uses Gemini 2.5 Pro for prompt generation (higher quality, higher cost)

## Customization

### Modify the System Prompt

Edit the `IMAGE_GENERATION_SYSTEM_PROMPT` constant in `textToImageAgent.ts` to change the art style:

```typescript
const IMAGE_GENERATION_SYSTEM_PROMPT = dedent`
  Your custom system prompt here...
`;
```

### Change the AI Model

Replace `google('gemini-2.5-pro')` with a different model:

```typescript
const promptResult = await generateText({
  model: google('gemini-2.5-flash'), // Faster, cheaper
  // or
  model: anthropic('claude-3-sonnet-20240229'), // Different provider
  system: IMAGE_GENERATION_SYSTEM_PROMPT,
  prompt: '...',
});
```

### Adjust Polling Settings

Modify the polling parameters in the agent:

```typescript
const { imageUrl, status, error } = await pollImageGenerationStatus(
  taskId,
  60, // maxRetries (default: 30)
  1000 // delayMs (default: 2000)
);
```

## Example Workflow

1. **Upload Audio**: User uploads audio file
2. **Transcribe**: Audio is transcribed into captions
3. **Generate Images**: Call the text-to-image agent
4. **Review Results**: Check generated images in the transcription metadata
5. **Render Video**: Use the images in your video rendering pipeline

## Troubleshooting

### Images Not Generating

- Check that `MEDIA_HELPER_URL` is correctly set
- Verify the text-to-image API is running and accessible
- Check the console logs for specific error messages

### Low Success Rate

- Increase the polling timeout
- Check your API rate limits
- Verify the image generation service has sufficient resources

### Unexpected Art Style

- Review the system prompt and examples
- Ensure the text-to-image API is using the correct model
- Check if the prompt transformation is working as expected

## Next Steps

- **Custom Styles**: Create multiple agents with different art styles
- **Batch Processing**: Process multiple transcriptions at once
- **Image Caching**: Cache generated images to avoid regeneration
- **Quality Control**: Add manual review step before finalizing
- **Video Integration**: Use generated images in your Remotion compositions

## Related Agents

- `/script-meta/music/keyword` - Keyword extraction and emotion analysis
- `/script-meta/music/rag-image-attacher` - Attach images from a RAG database
- `/script-meta/clear-metadata` - Clear metadata from transcriptions

