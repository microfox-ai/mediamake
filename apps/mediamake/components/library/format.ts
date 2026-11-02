import { toast } from 'sonner';
import type { Library, MediaItem } from '@/lib/library/types';

export function bytes(n: number): string {
  if (!n) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1000)));
  const v = n / 1000 ** i;
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function duration(s?: number): string | null {
  if (s === undefined || !Number.isFinite(s)) return null;
  if (s < 10) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

/** "3 days ago", "just now"; the date itself after a month. */
export function ago(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} day${s < 86400 * 2 ? '' : 's'} ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** /Users/<you>/Downloads/AMZ → ~/Downloads/AMZ. */
export const tilde = (p: string) => p.replace(/^\/Users\/[^/]+(?=\/|$)/, '~').replace(/^\/home\/[^/]+(?=\/|$)/, '~');

/** An item's path on disk when the export says where the library is, else its path inside the library. */
export function itemPath(lib: Library, m: Pick<MediaItem, 'path'>): { abs: string | null; shown: string } {
  if (m.path.startsWith('/')) return { abs: m.path, shown: tilde(m.path) };
  const root = lib.meta?.root?.replace(/\/$/, '');
  return root ? { abs: `${root}/${m.path}`, shown: tilde(`${root}/${m.path}`) } : { abs: null, shown: m.path };
}

export async function copy(text: string, what = 'Copied'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(what, { description: text });
  } catch {
    toast.message(text, { description: 'Could not reach the clipboard: copy it from here' });
  }
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
