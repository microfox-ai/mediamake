import type { IndexRequest, PlatformId, ExtractedImage } from './types';

export function mapSiteLinkToPlatform(
  siteLink: string,
): Omit<IndexRequest, 'query' | 'projectId'> {
  const url = new URL(siteLink);
  const hostname = url.hostname;

  let platform: string = 'unknown';
  let platformId: PlatformId = 'unknown';
  const platformUrl = siteLink;

  if (hostname.includes('pinterest')) {
    platform = 'pinterest';
    platformId = 'pinterest';
  } else if (hostname.includes('instagram')) {
    platform = 'instagram';
    platformId = 'instagram';
  } else if (hostname.includes('unsplash')) {
    platform = 'unsplash';
    platformId = 'unsplash';
  } else if (hostname.includes('pixabay')) {
    platform = 'pixabay';
    platformId = 'pixabay';
  } else if (hostname.includes('pexels')) {
    platform = 'pexels';
    platformId = 'pexels';
  } else if (hostname.includes('midjourney')) {
    platform = 'midjourney';
    platformId = 'midjourney';
  } else if (hostname.includes('lummi')) {
    platform = 'lummi';
    platformId = 'lummi';
  } else if (hostname.includes('lexica')) {
    platform = 'lexica';
    platformId = 'lexica';
  } else if (hostname.includes('dalle')) {
    platform = 'dalle';
    platformId = 'dalle';
  } else if (hostname.includes('playground')) {
    platform = 'playground';
    platformId = 'playground';
  }

  return {
    platform,
    platformId,
    platformUrl,
    siteLink,
  };
}

export function fillResponsiveImages(
  im: ExtractedImage,
  platform: string,
): ExtractedImage {
  const output = { ...im };
  if (platform === 'lexica') {
    if (!im.responsiveImages || im.responsiveImages.length === 0) {
      if (im.src) {
        const urlParts = im.src.split('/');
        const imageId = urlParts[urlParts.length - 1];
        output.responsiveImages = [
          { url: `https://image.lexica.art/sm2_webp/${imageId}`, size: 'sm' },
          { url: `https://image.lexica.art/md2_webp/${imageId}`, size: 'md' },
          { url: `https://image.lexica.art/full_webp/${imageId}`, size: 'full' },
        ];
      }
    }
  } else if (platform === 'lummi') {
    if (!im.responsiveImages || im.responsiveImages.length === 0) {
      if (im.src) {
        const baseUrl = im.src.split('?')[0];
        output.responsiveImages = [
          { url: `${baseUrl}?auto=format&w=240`, size: 'sm' },
          { url: `${baseUrl}?auto=format&w=640`, size: 'md' },
          { url: `${baseUrl}?auto=format&w=1200`, size: 'lg' },
          { url: baseUrl, size: 'full' },
        ];
      }
    }
  }
  return output;
}

export function getFollowUpUrl(imgLink: string, platform: string): string {
  if (platform === 'lexica' && imgLink.startsWith('https://lexica.art/prompt/')) {
    return imgLink.replace('https://lexica.art/prompt/', 'https://lexica.art/?q=');
  }
  return imgLink;
}

export function getImageUrl(image: ExtractedImage): string {
  const src = image.responsiveImages?.[0]?.url || image.src;
  if (src?.startsWith('http')) return src;
  const domain = image.pagePermalink.split('/')[2];
  return domain ? `https://${domain}${src || ''}` : src || '';
}
