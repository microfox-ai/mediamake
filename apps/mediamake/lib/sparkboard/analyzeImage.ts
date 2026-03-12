import { generateObject } from '@microfox/ai';
import { z } from 'zod';

const ImageAnalysisSchema = z.object({
  description: z
    .string()
    .describe("A detailed, descriptive summary of what's in the image"),
  keywords: z
    .array(z.string())
    .describe(
      'General keywords that describe the image content, objects, themes, colors, etc.',
    ),
  artStyle: z
    .array(z.string())
    .describe(
      'Art style keywords like: cgi, anime, photo-realistic, ghibli, digital art, watercolor, oil painting, minimalist, abstract, etc. Include artist names if recognizable',
    ),
  audienceKeywords: z
    .array(z.string())
    .describe(
      'Target audience keywords like: youngsters, anime-fans, gameOfThrones fans, corporate, designers, entrepreneurs, kids, gamers, professionals, etc.',
    ),
});

export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>;

const SYSTEM_PROMPT = `You are an expert in Image analysis & Human Psychology.
You have a deep grasp on design, and how images are used & what each artStyle is, and what audience they are targeted to.

Analyze the given image and provide:
1. A detailed description of what you see (minimum 100 words)
2. General keywords that describe the content, objects, themes, colors, mood, etc.
3. Art style keywords (cgi, anime, photo-realistic, ghibli, digital-art, watercolor, oil painting, minimalist, abstract, etc. Include artist names if recognizable. Include the artStyle of the image in the keywords)
4. Target audience keywords (youngsters, anime-fans, gameOfThrones fans, corporate, designers, entrepreneurs, kids, gamers, professionals, etc. Include the audience of the image in the keywords)

All the keywords, artstyle keywords, target audience keywords should be in lowercase, spaceless, use hypen(-) for multi word  if needed.

IMPORTANT: Return ONLY valid JSON. Do not wrap your response in markdown code blocks or any other formatting. Return the raw JSON object directly.

Be specific and comprehensive in your analysis.`;

const USER_TEXT = `Analyze this image and provide:
1. A detailed description of what you see
2. General keywords that describe the content, objects, themes, colors, mood, etc.
3. Art style keywords (cgi, anime, photo-realistic, ghibli, digital art, watercolor, oil painting, minimalist, abstract, etc. Include artist names if recognizable)
4. Target audience keywords (youngsters, anime-fans, gameOfThrones fans, corporate, designers, entrepreneurs, kids, gamers, professionals, etc.)

Be specific and comprehensive in your analysis.`;

function getMediaTypeFromUrl(imageUrl: string): string {
  const url = new URL(imageUrl);
  const extension = url.pathname.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'gif') return 'image/gif';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'svg') return 'image/svg+xml';
  return 'image/jpeg';
}

function repairText(text: string): string {
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```json') && cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(7, -3).trim();
  } else if (cleanedText.startsWith('```') && cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(3, -3).trim();
  }
  cleanedText = cleanedText
    .replace(/^```json\s*/, '')
    .replace(/\s*```$/, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  const jsonStart = cleanedText.indexOf('{');
  const jsonEnd = cleanedText.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
  }
  return cleanedText;
}

export async function analyzeImageWithAI(
  image: string | Buffer,
  model: any,
  maxRetries: number = 2,
): Promise<ImageAnalysis | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let imageBuffer: Buffer;
      let mediaType = 'image/jpeg';

      if (typeof image === 'string') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetch(image, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Lambda-Image-Processor/1.0)',
            },
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          imageBuffer = Buffer.from(await response.arrayBuffer());
          mediaType = getMediaTypeFromUrl(image);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error('Image download timed out after 30 seconds');
          }
          throw fetchError;
        }
      } else {
        imageBuffer = image;
      }

      const analysisPromise = (async () => {
        try {
          return await generateObject({
            model,
            schema: ImageAnalysisSchema,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: USER_TEXT },
                  {
                    type: 'file',
                    data: imageBuffer,
                    mediaType,
                  },
                ],
              },
            ],
            experimental_repairText: async ({ text }) => repairText(text),
            maxRetries: 2,
          });
        } catch (error: unknown) {
          const err = error as { cause?: { text?: string } };
          if (err?.cause?.text) {
            const errorText = err.cause.text;
            const jsonStart = errorText.indexOf('{');
            const jsonEnd = errorText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
              const jsonString = errorText.substring(jsonStart, jsonEnd + 1);
              try {
                const parsedJson = JSON.parse(jsonString);
                return { object: parsedJson as ImageAnalysis };
              } catch {
                // fall through to throw
              }
            }
          }
          throw error;
        }
      })();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('AI analysis timed out after 60 seconds')),
          60000,
        );
      });

      const result = await Promise.race([analysisPromise, timeoutPromise]);
      return result.object;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // Log only the essential error message to avoid noisy logs
  console.error(
    'analyzeImageWithAI: all retries failed:',
    lastError?.message ?? lastError,
  );
  return null;
}
