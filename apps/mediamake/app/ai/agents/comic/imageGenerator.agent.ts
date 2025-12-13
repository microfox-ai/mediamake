import { AiRouter } from '@microfox/ai-router';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ImageGeneratorInputSchema,
  ImageGeneratorOutputSchema,
} from './zod';

/**
 * Image Generator Agent - Agent 5
 * Generates actual comic panel images using Gemini (Nano Banana/Pro) or DALL-E 3
 * Supports panel-to-panel continuity using image-to-image generation
 * Supports aspect ratios, resolutions, and style reference images
 */

const aiRouter = new AiRouter();

const imageGeneratorAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Initializing image generation...',
      });

      const { 
        panels, 
        artStyle,
        provider = 'gemini-flash',
        aspectRatio = '1:1',
        resolution = '1K',
        quality = 'standard',
        styleReferenceImages,
        styleStrength = 0.7
      } = ctx.request.params as any;

      if (!panels || panels.length === 0) {
        throw new Error('Panels with prompts are required');
      }

      // Log generation config
      ctx.response.writeMessageMetadata({
        loader: `Using ${provider} with ${aspectRatio} aspect ratio at ${resolution} resolution`,
      });

      const generatedPanels = [];
      const imageCache: Record<number, string> = {}; // Cache generated image URLs

      // Process panels sequentially to maintain continuity
      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        const { panelNumber, prompt, continuesFromPanel, changeDescription } = panel;

        ctx.response.writeMessageMetadata({
          loader: `Generating panel ${panelNumber}/${panels.length}...`,
        });

        let imageUrl: string;
        let generationMethod: 'text-to-image' | 'image-to-image';

        // Check if this panel continues from a previous one (for continuity)
        if (continuesFromPanel && imageCache[continuesFromPanel]) {
          // Use image-to-image for micro-changes (like eyes moving up)
          ctx.response.writeMessageMetadata({
            loader: `Panel ${panelNumber}: Creating variation (${changeDescription || 'subtle change'})...`,
          });

          imageUrl = await generateImageVariation({
            baseImageUrl: imageCache[continuesFromPanel],
            prompt: prompt,
            changeDescription: changeDescription || 'subtle variation',
            provider,
            aspectRatio,
            resolution,
          });
          
          generationMethod = 'image-to-image';
        } else {
          // Text-to-image for new scenes
          ctx.response.writeMessageMetadata({
            loader: `Panel ${panelNumber}: Generating new scene...`,
          });

          imageUrl = await generateImageFromPrompt({
            prompt: `${artStyle}. ${prompt}`,
            provider,
            aspectRatio,
            resolution,
            quality,
            styleReferenceImages,
            styleStrength,
          });
          
          generationMethod = 'text-to-image';
        }

        // Cache the generated image URL for potential continuity
        imageCache[panelNumber] = imageUrl;

        generatedPanels.push({
          panelNumber,
          imageUrl,
          prompt,
          continuesFromPanel,
          generationMethod,
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      ctx.response.writeMessageMetadata({
        loader: `All ${panels.length} panels generated! ✨`,
      });

      return {
        success: true,
        panels: generatedPanels,
        artStyle,
        totalPanels: panels.length,
      };
    } catch (error) {
      console.error('Error generating images:', error);
      
      return {
        success: false,
        panels: [],
        artStyle: '',
        totalPanels: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })
  .actAsTool('/', {
    id: 'comicImageGenerator',
    name: 'Comic Image Generator',
    description:
      'Generates actual comic panel images using Gemini (Nano Banana/Pro 🍌) or DALL-E 3. Supports panel-to-panel continuity using image-to-image generation for micro-changes (like eye movements, subtle expressions). Offers customizable aspect ratios (1:1, 16:9, 9:16, etc.), resolutions (1K, 2K, 4K), and optional style reference images. Takes prompts from Art Director and produces final images.',
    inputSchema: ImageGeneratorInputSchema,
    outputSchema: ImageGeneratorOutputSchema,
    metadata: {
      category: 'comic',
      tags: ['comic', 'image-generation', 'gemini', 'nano-banana', 'dall-e', 'continuity', 'micro-expressions', 'style-reference'],
      icon: '🖼️',
      title: 'Comic Image Generator',
    },
  });

/**
 * Helper: Generate image from text prompt
 * Supports Gemini (Nano Banana/Pro) and DALL-E 3
 */
async function generateImageFromPrompt({ 
  prompt,
  provider,
  aspectRatio,
  resolution,
  quality,
  styleReferenceImages,
  styleStrength,
}: { 
  prompt: string;
  provider: string;
  aspectRatio: string;
  resolution: string;
  quality: string;
  styleReferenceImages?: string[];
  styleStrength?: number;
}): Promise<string> {
  
  if (provider === 'gemini-flash' || provider === 'gemini-pro') {
    return generateWithGemini({
      prompt,
      model: provider === 'gemini-flash' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview',
      aspectRatio,
      resolution,
      styleReferenceImages,
      styleStrength,
    });
  } else {
    return generateWithDallE({
      prompt,
      aspectRatio,
      quality,
    });
  }
}

/**
 * Generate image using Gemini SDK (Nano Banana or Nano Banana Pro)
 * Reference: https://ai.google.dev/gemini-api/docs/image-generation
 */
async function generateWithGemini({
  prompt,
  model,
  aspectRatio,
  resolution,
  styleReferenceImages,
  styleStrength,
}: {
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  styleReferenceImages?: string[];
  styleStrength?: number;
}): Promise<string> {
  const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured in environment variables');
  }

  // Initialize Gemini SDK
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const geminiModel = genAI.getGenerativeModel({ model });

  // Build the generation config
  const generationConfig: any = {
    responseModalities: ['TEXT', 'IMAGE'],
  };

  // Map aspect ratio to Gemini format
  if (aspectRatio !== '1:1') {
    generationConfig.imageGenerationConfig = {
      aspectRatio: aspectRatio,
    };
  }

  // Build contents array
  const parts: any[] = [{ text: prompt }];
  
  // Add style reference images if provided
  if (styleReferenceImages && styleReferenceImages.length > 0) {
    const stylePrompt = `Use the following image(s) as style reference with strength ${styleStrength || 0.7}:`;
    parts.unshift({ text: stylePrompt });
    
    for (const imageUrl of styleReferenceImages) {
      // Check if it's a URL or base64
      if (imageUrl.startsWith('http')) {
        // Download and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const buffer = await imageBlob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: base64,
          },
        });
      } else {
        // Assume it's already base64
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: imageUrl,
          },
        });
      }
    }
  }

  try {
    // Generate content using SDK
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig,
    });

    const response = result.response;
    
    // Extract image from response
    const candidates = response.candidates || [];
    for (const candidate of candidates) {
      const candidateParts = candidate.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData) {
          // Convert base64 to data URL
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('No image generated in response');
  } catch (error) {
    console.error('Gemini generation error:', error);
    throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate image using DALL-E 3
 */
async function generateWithDallE({
  prompt,
  aspectRatio,
  quality,
}: {
  prompt: string;
  aspectRatio: string;
  quality: string;
}): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured in environment variables');
  }

  // Map aspect ratio to DALL-E size
  let size = '1024x1024';
  if (aspectRatio === '16:9') {
    size = '1792x1024';
  } else if (aspectRatio === '9:16') {
    size = '1024x1792';
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: quality,
      style: 'natural',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`DALL-E generation failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.data[0].url;
}

/**
 * Helper: Generate image variation using image-to-image
 * For continuity effects (same frame, slight changes)
 * 
 * Note: DALL-E 3 doesn't support image-to-image directly.
 * Options:
 * 1. Use DALL-E 2 edits endpoint (lower quality but works)
 * 2. Use Stability AI img2img (better for continuity)
 * 3. Use Replicate with models like SDXL
 * 
 * Current implementation: Falls back to text-to-image with enhanced prompt
 * TODO: Implement proper image-to-image when available
 */
async function generateImageVariation({
  baseImageUrl,
  prompt,
  changeDescription,
  provider,
  aspectRatio,
  resolution,
}: {
  baseImageUrl: string;
  prompt: string;
  changeDescription: string;
  provider: string;
  aspectRatio: string;
  resolution: string;
}): Promise<string> {
  
  // Gemini supports image-to-image natively!
  if (provider === 'gemini-flash' || provider === 'gemini-pro') {
    return generateWithGeminiImgToImg({
      baseImageUrl,
      prompt,
      changeDescription,
      model: provider === 'gemini-flash' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview',
      aspectRatio,
      resolution,
    });
  }
  
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
  
  // Option 1: Try Stability AI if available
  if (STABILITY_API_KEY) {
    try {
      return await generateWithStabilityImgToImg({
        baseImageUrl,
        prompt,
        changeDescription,
        apiKey: STABILITY_API_KEY,
      });
    } catch (error) {
      console.warn('Stability AI img2img failed, falling back:', error);
    }
  }
  
  // Option 2: Try Replicate if available
  if (REPLICATE_API_TOKEN) {
    try {
      return await generateWithReplicateImgToImg({
        baseImageUrl,
        prompt,
        changeDescription,
        apiToken: REPLICATE_API_TOKEN,
      });
    } catch (error) {
      console.warn('Replicate img2img failed, falling back:', error);
    }
  }
  
  // Fallback: Use text-to-image with enhanced prompt
  console.log('Using fallback: text-to-image for continuity');
  const enhancedPrompt = `${prompt}\n\nIMPORTANT: This is a continuation of the previous panel. The only change is: ${changeDescription}. Keep everything else exactly the same as before.`;
  
  return generateImageFromPrompt({ 
    prompt: enhancedPrompt,
    provider,
    aspectRatio,
    resolution,
    quality: 'standard',
  });
}

/**
 * Gemini SDK image-to-image for continuity (text-and-image-to-image)
 * Reference: https://ai.google.dev/gemini-api/docs/image-generation#image-editing
 */
async function generateWithGeminiImgToImg({
  baseImageUrl,
  prompt,
  changeDescription,
  model,
  aspectRatio,
  resolution,
}: {
  baseImageUrl: string;
  prompt: string;
  changeDescription: string;
  model: string;
  aspectRatio: string;
  resolution: string;
}): Promise<string> {
  const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
  }

  // Initialize Gemini SDK
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const geminiModel = genAI.getGenerativeModel({ model });

  // Download base image and convert to base64
  let imageBase64: string;
  let mimeType: string = 'image/png';
  
  if (baseImageUrl.startsWith('data:image')) {
    // Already base64 data URL
    const match = baseImageUrl.match(/data:(image\/\w+);base64,(.+)/);
    if (match) {
      mimeType = match[1];
      imageBase64 = match[2];
    } else {
      throw new Error('Invalid data URL format');
    }
  } else {
    const imageResponse = await fetch(baseImageUrl);
    const imageBlob = await imageResponse.blob();
    mimeType = imageBlob.type || 'image/png';
    const buffer = await imageBlob.arrayBuffer();
    imageBase64 = Buffer.from(buffer).toString('base64');
  }

  // Build generation config
  const generationConfig: any = {
    responseModalities: ['TEXT', 'IMAGE'],
  };

  if (aspectRatio !== '1:1') {
    generationConfig.imageGenerationConfig = {
      aspectRatio: aspectRatio,
    };
  }

  // Build prompt for micro-change
  const editPrompt = `${prompt}\n\nMake this specific change to the image: ${changeDescription}. Keep everything else exactly the same.`;

  try {
    // Generate content using SDK with image editing
    const result = await geminiModel.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: editPrompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64,
            },
          },
        ],
      }],
      generationConfig,
    });

    const response = result.response;
    const candidates = response.candidates || [];
    
    for (const candidate of candidates) {
      const candidateParts = candidate.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error('No image generated in img2img response');
  } catch (error) {
    console.error('Gemini img2img error:', error);
    throw new Error(`Gemini img2img failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Generate with Stability AI img2img
 */
async function generateWithStabilityImgToImg({
  baseImageUrl,
  prompt,
  changeDescription,
  apiKey,
}: {
  baseImageUrl: string;
  prompt: string;
  changeDescription: string;
  apiKey: string;
}): Promise<string> {
  // Download the base image
  const imageResponse = await fetch(baseImageUrl);
  const imageBlob = await imageResponse.blob();
  
  // Create form data
  const formData = new FormData();
  formData.append('image', imageBlob);
  formData.append('prompt', `${prompt}. Focus on this change: ${changeDescription}`);
  formData.append('strength', '0.3'); // Low strength = keeps original structure
  formData.append('cfg_scale', '7');
  formData.append('samples', '1');
  
  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Stability AI failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.artifacts[0].base64; // Return base64 or URL
}

/**
 * Helper: Generate with Replicate img2img
 */
async function generateWithReplicateImgToImg({
  baseImageUrl,
  prompt,
  changeDescription,
  apiToken,
}: {
  baseImageUrl: string;
  prompt: string;
  changeDescription: string;
  apiToken: string;
}): Promise<string> {
  // Use Replicate SDXL img2img
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b', // SDXL img2img
      input: {
        image: baseImageUrl,
        prompt: `${prompt}. Focus on: ${changeDescription}`,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        strength: 0.35, // Low strength = keeps original image structure
      },
    }),
  });

  const prediction = await response.json();
  
  // Poll for completion
  let output = prediction.output;
  let pollUrl = prediction.urls.get;
  
  while (!output) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const statusResponse = await fetch(pollUrl, {
      headers: { 'Authorization': `Token ${apiToken}` },
    });
    const status = await statusResponse.json();
    output = status.output;
    if (status.status === 'failed') {
      throw new Error('Replicate prediction failed');
    }
  }

  return Array.isArray(output) ? output[0] : output;
}

export default imageGeneratorAgent;

