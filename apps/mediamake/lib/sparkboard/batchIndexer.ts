import { openPage, extractImages } from '@microfox/puppeteer-sls';
import { GoogleAiProvider } from '@microfox/ai-provider-google';
import type { RagImageMetadata } from '@/app/types/media';
import type { IndexRequest } from './types';
import { fillResponsiveImages, getImageUrl } from './mappers';
import { ragStocksearchVectorbase, indexPaginator, missedAnalysisStore, DEFAULT_STOCKSEARCH_NAMESPACE, toProjectNamespace, toTagNamespace } from './redis';
import { analyzeImageWithAI } from './analyzeImage';
import { uploadFile } from './upload';
import { webhookFetch } from './webhook';

function getMimeFromImageUrl(imageUrl: string): string | null {
  try {
    const ext = new URL(imageUrl).pathname.split('.').pop()?.toLowerCase() ?? '';
    const m: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
      tiff: 'image/tiff', tif: 'image/tiff',
    };
    return m[ext] ?? null;
  } catch {
    const ext = imageUrl.split('.').pop()?.toLowerCase() ?? '';
    const m: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
      tiff: 'image/tiff', tif: 'image/tiff',
    };
    return m[ext] ?? null;
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function aspectRatioType(width: number, height: number): string {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

export interface ProcessSiteLinkResult {
  newImageCount: number;
  processedDocs: { id: string; metadata: RagImageMetadata; doc: string }[];
}

export async function processSiteLink(
  indexRequest: IndexRequest,
): Promise<ProcessSiteLinkResult> {
  const hasIndexingTracking =
    Boolean(indexRequest.indexingId) && Boolean(indexRequest.indexingLimit);
  const limit = indexRequest.indexingLimit ?? 50;

  if (hasIndexingTracking && indexRequest.indexingId) {
    const paginator = indexPaginator(indexRequest.indexingId);
    const currentStatus = await paginator.getCurrentStatus();
    if (currentStatus?.progress) {
      const currentImageCount = currentStatus.progress.imageCount ?? 0;
      const maxSize = currentStatus.progress.maxSize ?? limit;
      if (currentImageCount >= maxSize) {
        await paginator.completeIndexing();
        return { newImageCount: 0, processedDocs: [] };
      }
    }
  }

  const isOffline =
    process.env.IS_OFFLINE != null || process.env.SERVERLESS_OFFLINE != null;

  const { page } = await openPage({
    url: indexRequest.siteLink,
    headless: true,
    isLocal: isOffline,
    waitUntil: 'networkidle2',
  });

  const images = await extractImages(page, { enableColorExtraction: true });
  await page.close();

  const googleAiProvider = new GoogleAiProvider({
    apiKey: process.env.GOOGLE_API_KEY ?? '',
  });
  const model = googleAiProvider.languageModel('gemini-2.5-flash-lite');

  const processImage = async (image: import('@microfox/puppeteer-sls').ExtractedImage) => {
    const filled = fillResponsiveImages(image as unknown as import('./types').ExtractedImage, indexRequest.platform);

    const hasValidDimensions =
      (!filled.width && !filled.height) ||
      (filled.width && filled.height && (filled.width > 100 || filled.height > 100)) ||
      (filled.width && !filled.height && filled.width > 100) ||
      (!filled.width && filled.height && filled.height > 100);
    const hasResponsiveImages =
      filled.responsiveImages != null && filled.responsiveImages.length > 0;
    if (!hasValidDimensions && !hasResponsiveImages) return null;

    const hasWidth = filled.width ? filled.width > 400 : false;
    const hasAltText = Boolean(filled.alt && filled.alt.length > 3);
    if (!hasWidth && !hasResponsiveImages && !hasAltText) return null;

    let imageUrl = getImageUrl(filled as unknown as import('./types').ExtractedImage);

    if (indexRequest.dbFolder) {
      try {
        let upscaleUrl = imageUrl;
        if (filled.responsiveImages?.length) {
          upscaleUrl = filled.responsiveImages[filled.responsiveImages.length - 1].url;
        }
        const response = await fetch(upscaleUrl);
        if (!response.ok) throw new Error(response.statusText);
        const imageBuffer = await response.arrayBuffer();
        const mimeType =
          response.headers.get('content-type') ||
          getMimeFromImageUrl(upscaleUrl) ||
          'image/jpeg';
        const s3Url = await uploadFile({
          id: `${indexRequest.platformId}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          buffer: imageBuffer,
          imageType: mimeType,
          folder: indexRequest.dbFolder,
        });
        if (s3Url) imageUrl = s3Url;
      } catch (err) {
        console.warn('Upload to S3 failed:', err);
      }
    }

    if (!imageUrl) return null;

    const mimeType = getMimeFromImageUrl(imageUrl);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- LanguageModelV2 from provider is compatible with generateObject
    const aiAnalysis = await analyzeImageWithAI(imageUrl, model as any);

    const id = `${indexRequest.platformId}:${filled.src ?? imageUrl}`;
    let aspectRatio: number | null = null;
    let aspectRatioTypeVal: string | null = null;
    if (
      filled.width != null &&
      filled.height != null &&
      filled.width > 0 &&
      filled.height > 0
    ) {
      aspectRatio = filled.width / filled.height;
      aspectRatioTypeVal = aspectRatioType(filled.width, filled.height);
    }

    const metadata: RagImageMetadata = {
      src: imageUrl,
      indexingId: indexRequest.indexingId,
      responsiveImages: filled.responsiveImages ?? null,
      description: aiAnalysis?.description ?? null,
      altText: filled.alt ?? null,
      imgPermalink: filled.imgPermalink ?? null,
      pagePermalink: filled.pagePermalink,
      width: filled.width ?? null,
      height: filled.height ?? null,
      palette: filled.palette ?? null,
      dominantColor: filled.dominantColor ?? null,
      secondaryColor: filled.secondaryColor ?? null,
      accentColor: filled.accentColor ?? null,
      aspectRatioType: aspectRatioTypeVal,
      aspectRatio,
      platform: indexRequest.platform,
      platformId: indexRequest.platformId,
      platformUrl: indexRequest.platformUrl,
      userTags: indexRequest.userTags ?? [],
      keywords: aiAnalysis?.keywords ?? [],
      artStyle: aiAnalysis?.artStyle ?? [],
      audienceKeywords: aiAnalysis?.audienceKeywords ?? [],
      mediaType: 'image',
      mimeType,
    };

    if (!aiAnalysis) {
      await missedAnalysisStore.set(id, {
        imageUrl,
        id,
        count: 0,
      });
    }

    const docContent = aiAnalysis
      ? `About: ${aiAnalysis.description}\n\nKeywords: ${aiAnalysis.keywords.join(', ')}\n\n${aiAnalysis.artStyle.join(', ')}\n\n${aiAnalysis.audienceKeywords.join(', ')}\n${indexRequest.platformId}`
      : JSON.stringify(metadata);

    return { id, metadata, doc: docContent };
  };

  // Enforce indexing limit so we don't over-index
  const limitedImages = images.slice(0, limit);

  const results = await Promise.all(
    limitedImages.map((img) => processImage(img)),
  );
  const processedDocs = results.filter(
    (r): r is { id: string; metadata: RagImageMetadata; doc: string } => r != null,
  );
  const newImageCount = processedDocs.length;

  if (processedDocs.length > 0 && ragStocksearchVectorbase) {
    const projectNs =
      indexRequest.projectId && indexRequest.projectId !== 'default'
        ? toProjectNamespace(indexRequest.projectId)
        : DEFAULT_STOCKSEARCH_NAMESPACE;
    await ragStocksearchVectorbase.feedDocsToRAG(processedDocs, projectNs);
    const userTags = indexRequest.userTags ?? [];
    for (const tag of userTags) {
      if (tag?.trim()) await ragStocksearchVectorbase.feedDocsToRAG(processedDocs, toTagNamespace(tag.trim()));
    }
  }

  if (
    indexRequest.webhookUrl &&
    indexRequest.webhookSecret &&
    processedDocs.length > 0
  ) {
    await webhookFetch(indexRequest.webhookUrl, indexRequest.webhookSecret, {
      docs: processedDocs,
      indexRequest,
    });
  }

  if (hasIndexingTracking && indexRequest.indexingId && newImageCount > 0) {
    const paginator = indexPaginator(indexRequest.indexingId);
    const currentStatus = await paginator.getCurrentStatus();
    if (currentStatus?.progress) {
      const currentImageCount = currentStatus.progress.imageCount ?? 0;
      const maxSize = currentStatus.progress.maxSize ?? limit;
      const newTotalCount = currentImageCount + newImageCount;
      await paginator.updateIndexingStatus({
        imageCount: newTotalCount,
        maxSize,
      });
      if (newTotalCount >= maxSize) {
        await paginator.completeIndexing();
      }
    }
  }

  return { newImageCount, processedDocs };
}
