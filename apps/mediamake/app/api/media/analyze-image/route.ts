import { NextRequest, NextResponse } from 'next/server';
import { GoogleAiProvider } from '@microfox/ai-provider-google';
import { z } from 'zod';
import { analyzeImageWithAI } from '@/lib/sparkboard/analyzeImage';
import { getClientId } from '@/lib/auth-utils';

const RequestSchema = z.object({
  imageUrl: z.string().url(),
  pageUrl: z.string().url().optional(),
  prompt: z.string().optional(),
  imageAlt: z.string().optional(),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-id',
};

function normalizeTags(tags?: string[]): string[] {
  const clean = (tags ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return clean.length > 0 ? Array.from(new Set(clean)) : ['image'];
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const { imageUrl, pageUrl, prompt, imageAlt, projectId, tags } =
      parsed.data;
    const resolvedClientId = getClientId(req) || 'default';

    const googleAiProvider = new GoogleAiProvider({
      apiKey: process.env.GOOGLE_API_KEY ?? '',
    });
    const model = googleAiProvider.languageModel('gemini-2.5-flash-lite');
    const analysis = await analyzeImageWithAI(imageUrl, model as any);

    if (!analysis) {
      return NextResponse.json(
        { error: 'AI analysis failed for this image' },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          clientId: resolvedClientId,
          projectId: projectId ?? null,
          imageUrl,
          pageUrl: pageUrl || imageUrl,
          prompt: prompt || imageAlt || '',
          tags: normalizeTags(tags),
          analysis,
        },
      },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error('[media][analyze-image] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
