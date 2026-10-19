import { captureVideoThumbnailBlob } from '@/lib/video-thumbnail-upload';
import type { LocalMediaContentType, LocalMediaRecord } from './types';

const THUMB_WIDTH = 320;
const PROBE_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms = PROBE_TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function probeVideo(file: File): Promise<LocalMediaRecord['metadata']> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    video.src = url;
    const loaded = await withTimeout(
      new Promise<boolean>((resolve) => {
        video.addEventListener('loadedmetadata', () => resolve(true), { once: true });
        video.addEventListener('error', () => resolve(false), { once: true });
      }),
    );
    const meta: LocalMediaRecord['metadata'] = {};
    if (loaded) {
      if (Number.isFinite(video.duration)) meta.duration = video.duration;
      if (video.videoWidth) meta.width = video.videoWidth;
      if (video.videoHeight) meta.height = video.videoHeight;
    }
    video.removeAttribute('src');
    video.load();
    // captureVideoThumbnailBlob only accepts video/* types; .mkv etc. can
    // report an empty type, so give it one.
    const typed = file.type ? file : new File([file], file.name, { type: 'video/mp4' });
    const blob = await withTimeout(captureVideoThumbnailBlob(typed, 1, THUMB_WIDTH));
    if (blob) meta.thumbnail = await blobToDataUrl(blob);
    return meta;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function probeAudio(file: File): Promise<LocalMediaRecord['metadata']> {
  const url = URL.createObjectURL(file);
  try {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;
    const loaded = await withTimeout(
      new Promise<boolean>((resolve) => {
        audio.addEventListener('loadedmetadata', () => resolve(true), { once: true });
        audio.addEventListener('error', () => resolve(false), { once: true });
      }),
    );
    return loaded && Number.isFinite(audio.duration) ? { duration: audio.duration } : {};
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function probeImage(file: File): Promise<LocalMediaRecord['metadata']> {
  try {
    const bitmap = await createImageBitmap(file);
    const meta: LocalMediaRecord['metadata'] = { width: bitmap.width, height: bitmap.height };
    const scale = Math.min(1, THUMB_WIDTH / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // WebP keeps transparency and stays small (Chromium-only feature anyway).
      meta.thumbnail = canvas.toDataURL('image/webp', 0.8);
    }
    bitmap.close();
    return meta;
  } catch {
    // SVG and some formats can't be decoded to a bitmap; the gallery falls
    // back to loading the file itself.
    return {};
  }
}

/** Duration / dimensions / a small thumbnail. Never throws. */
export async function probeLocalMedia(
  file: File,
  contentType: LocalMediaContentType,
): Promise<LocalMediaRecord['metadata']> {
  try {
    if (contentType === 'video') return await probeVideo(file);
    if (contentType === 'audio') return await probeAudio(file);
    if (contentType === 'image') return await probeImage(file);
  } catch (err) {
    console.warn('[local-media] probe failed for', file.name, err);
  }
  return {};
}
