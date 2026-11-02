import { toast } from 'sonner';
import type { ImageSetIndex } from './types';

/**
 * "Show in Finder" for the image revisions screen. Browsers can't see real
 * paths or open the file manager, so the set's index.json records its absolute
 * path, and the dev server (on this same computer) reveals it via
 * /api/dev-reveal. Elsewhere (the deployed app, another computer) the path is
 * copied instead.
 */

/** Absolute path of the set's folder, or of one of its files; null when the set didn't record one. */
export function absolutePath(index: ImageSetIndex | null | undefined, file?: string): string | null {
  if (!index?.path) return null;
  return file ? `${index.path.replace(/\/$/, '')}/${file}` : index.path;
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Copies the path (or, without one, the folder's name with a note why). */
export async function copyPath(abs: string | null, fallbackName: string): Promise<void> {
  if (abs) {
    if (await copy(abs)) toast.success('Path copied', { description: abs });
    else toast.message(abs, { description: 'Could not reach the clipboard: copy it from here' });
    return;
  }
  await copy(fallbackName);
  toast.message(`Copied "${fallbackName}"`, {
    description: "This folder's full path isn't known: it has no index.json from its workflow (`npm run image-index -w lyrics_videos -- <folder>` writes one).",
    duration: 7000,
  });
}

/** Shows the file or folder in Finder through the dev server, or copies its path when that isn't possible. */
export async function revealOrCopy(abs: string | null, fallbackName: string): Promise<void> {
  if (abs) {
    try {
      const res = await fetch('/api/dev-reveal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: abs }) });
      if (res.ok) {
        toast.success('Shown in Finder');
        return;
      }
    } catch {
      // not the dev server, or offline: copy instead
    }
    if (await copy(abs)) toast.message('Path copied (Finder can only be opened from the local dev server)', { description: `${abs}  ·  in Finder: ⌘⇧G, paste`, duration: 7000 });
    else toast.message(abs, { description: 'Could not open Finder or reach the clipboard: copy it from here' });
    return;
  }
  await copyPath(null, fallbackName);
}
