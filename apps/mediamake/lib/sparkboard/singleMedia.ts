import sharp from 'sharp';
import { ColorPicker } from '@microfox/coloruse';
import { GoogleAiProvider } from '@microfox/ai-provider-google';
import type { RagImageMetadata } from '@/app/types/media';
import { ragStocksearchVectorbase, DEFAULT_STOCKSEARCH_NAMESPACE, toProjectNamespace, toTagNamespace } from './redis';
import { analyzeImageWithAI } from './analyzeImage';
import type { PlatformId } from './types';

const colorPicker = new ColorPicker();

function getMimeFromUrl(src: string, kind: 'image' | 'video' | 'audio'): string | null {
  let ext: string;
  try {
    ext = new URL(src).pathname.split('.').pop()?.toLowerCase() ?? '';
  } catch {
    ext = src.split('.').pop()?.toLowerCase() ?? '';
  }
  if (kind === 'image') {
    const m: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
      tiff: 'image/tiff', tif: 'image/tiff',
    };
    return m[ext] ?? null;
  }
  if (kind === 'video') {
    const m: Record<string, string> = {
      mp4: 'video/mp4', webm: 'video/webm', avi: 'video/avi', mov: 'video/quicktime',
      mkv: 'video/x-matroska', flv: 'video/x-flv', wmv: 'video/x-ms-wmv',
      '3gp': 'video/3gpp', ogv: 'video/ogg',
    };
    return m[ext] ?? null;
  }
  const m: Record<string, string> = {
    mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac',
    ogg: 'audio/ogg', wma: 'audio/x-ms-wma', m4a: 'audio/mp4', opus: 'audio/opus',
  };
  return m[ext] ?? null;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function aspectRatioType(width: number, height: number): string {
  const divisor = gcd(width, height);
  const w = Math.round(width / divisor);
  const h = Math.round(height / divisor);
  return `${w}:${h}`;
}

export interface IndexSingleMediaParams {
  src: string;
  srcType: 'image' | 'video' | 'audio';
  /** When set, used for RAG project namespace; when absent, default stocksearch namespace is used */
  projectId?: string;
  projectDisplayName?: string;
  platform?: string;
  platformId?: string;
  platformUrl?: string;
  pageLink?: string;
  imageLink?: string;
  indexingId?: string;
  promptUsed?: string;
  tags?: string[];
  metadata?: Partial<RagImageMetadata>;
  analyzeImage?: boolean;
  generateDescription?: boolean;
  generateKeywords?: boolean;
}

export interface IndexSingleMediaResult {
  doc: {
    id: string;
    metadata: RagImageMetadata;
    doc: string;
  };
}

export async function indexSingleMedia(
  params: IndexSingleMediaParams,
): Promise<IndexSingleMediaResult> {
  const {
    src,
    srcType,
    projectId: paramProjectId,
    platform = 'upload',
    platformId = 'upload',
    platformUrl = 'upload',
    pageLink,
    imageLink,
    indexingId,
    promptUsed,
    tags = [],
    metadata: extraMetadata,
    analyzeImage = true,
    generateDescription = true,
    generateKeywords = true,
  } = params;

  const id = `${platformId}:${src}`;
  const pagePermalink = pageLink ?? src;
  const imgPermalink = imageLink ?? src;

  if (srcType === 'image') {
    const response = await fetch(encodeURI(src.trim()), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Lambda-Image-Processor/1.0)' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const imageMeta = await sharp(imageBuffer).metadata();
    const width = imageMeta.width ?? null;
    const height = imageMeta.height ?? null;

    let palette: { palette?: string[]; dominantColor?: string; secondaryColor?: string; accentColor?: string } | null = null;
    try {
      const { data, info } = await sharp(imageBuffer)
        .toColorspace('srgb')
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      palette = await colorPicker.extractPaletteFromImageData(
        new Uint8ClampedArray(data),
        { enableLogs: false, deltaEThreshold: 0.5, paletteSize: 12 },
      );
    } catch {
      // continue without palette
    }

    const mimeType = getMimeFromUrl(src, 'image');

    // Optionally perform AI analysis; indexing into RAG does not depend on this.
    let aiAnalysis: Awaited<ReturnType<typeof analyzeImageWithAI>> | null = null;
    if (analyzeImage) {
      const googleAiProvider = new GoogleAiProvider({
        apiKey: process.env.GOOGLE_API_KEY ?? '',
      });
      const model = googleAiProvider.languageModel('gemini-2.5-flash-lite');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- LanguageModelV2 from provider is compatible with generateObject
      aiAnalysis = await analyzeImageWithAI(src, model as any);
    }

    let aspectRatio: number | null = null;
    let aspectRatioTypeVal: string | null = null;
    if (width != null && height != null && width > 0 && height > 0) {
      aspectRatio = width / height;
      aspectRatioTypeVal = aspectRatioType(width, height);
    }

    const effectiveDescription =
      generateDescription && aiAnalysis?.description
        ? aiAnalysis.description
        : extraMetadata?.description ?? null;

    const shouldUseKeywords = generateKeywords && !!aiAnalysis;

    const metadata: RagImageMetadata = {
      src,
      indexingId: indexingId ?? undefined,
      responsiveImages: null,
      description: effectiveDescription,
      altText: null,
      imgPermalink,
      pagePermalink,
      width,
      height,
      palette: palette?.palette ?? null,
      dominantColor: palette?.dominantColor ?? null,
      secondaryColor: palette?.secondaryColor ?? null,
      accentColor: palette?.accentColor ?? null,
      aspectRatioType: aspectRatioTypeVal,
      aspectRatio,
      platform: platform ?? null,
      platformId: platformId as PlatformId,
      platformUrl: platformUrl ?? 'upload',
      keywords: shouldUseKeywords ? aiAnalysis!.keywords : extraMetadata?.keywords ?? [],
      artStyle: shouldUseKeywords ? aiAnalysis!.artStyle : extraMetadata?.artStyle ?? [],
      audienceKeywords: shouldUseKeywords
        ? aiAnalysis!.audienceKeywords
        : extraMetadata?.audienceKeywords ?? [],
      mediaType: 'image',
      mimeType,
      promptUsed: promptUsed ?? null,
      userTags: tags.length ? tags : null,
    };

    const docContent = aiAnalysis
      ? `About: ${aiAnalysis.description}\n\nKeywords: ${aiAnalysis.keywords.join(', ')}, ${aiAnalysis.artStyle.join(', ')}, ${aiAnalysis.audienceKeywords.join(', ')}, ${platformId}`
      : JSON.stringify(metadata);

    const doc = { id, metadata, doc: docContent };
    const projectNs = paramProjectId ? toProjectNamespace(paramProjectId) : DEFAULT_STOCKSEARCH_NAMESPACE;
    if (ragStocksearchVectorbase) {
      await ragStocksearchVectorbase.feedDocsToRAG([doc], projectNs);
      for (const tag of tags) {
        if (tag?.trim()) await ragStocksearchVectorbase.feedDocsToRAG([doc], toTagNamespace(tag.trim()));
      }
    }
    return { doc };
  }

  if (srcType === 'video' || srcType === 'audio') {
    const mimeType = getMimeFromUrl(src, srcType);
    const metadata: RagImageMetadata = {
      src,
      indexingId: indexingId ?? undefined,
      responsiveImages: null,
      description: extraMetadata?.description ?? null,
      altText: null,
      imgPermalink,
      pagePermalink,
      width: null,
      height: null,
      palette: null,
      dominantColor: null,
      secondaryColor: null,
      accentColor: null,
      aspectRatioType: null,
      aspectRatio: null,
      platform: platform ?? null,
      platformId: platformId as PlatformId,
      platformUrl: platformUrl ?? 'upload',
      keywords: extraMetadata?.keywords ?? [],
      artStyle: extraMetadata?.artStyle ?? [],
      audienceKeywords: extraMetadata?.audienceKeywords ?? [],
      mediaType: srcType,
      mimeType,
      promptUsed: promptUsed ?? null,
      userTags: tags.length ? tags : null,
      ...extraMetadata,
    };

    const docContent = metadata.description
      ? `About: ${metadata.description}\n\nKeywords: ${metadata.keywords?.join(', ') ?? ''}\n\nArt Style: ${metadata.artStyle?.join(', ') ?? ''}\n\nAudience: ${metadata.audienceKeywords?.join(', ') ?? ''}\n\nPlatform: ${platformId}`
      : JSON.stringify(metadata);

    const doc = { id, metadata, doc: docContent };
    const projectNs = paramProjectId ? toProjectNamespace(paramProjectId) : DEFAULT_STOCKSEARCH_NAMESPACE;
    if (ragStocksearchVectorbase) {
      await ragStocksearchVectorbase.feedDocsToRAG([doc], projectNs);
      for (const tag of tags) {
        if (tag?.trim()) await ragStocksearchVectorbase.feedDocsToRAG([doc], toTagNamespace(tag.trim()));
      }
    }
    return { doc };
  }

  throw new Error(`Unsupported srcType: ${(params as { srcType: string }).srcType}`);
}
