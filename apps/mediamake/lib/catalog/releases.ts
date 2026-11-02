import type { CatalogVersion } from './types';

/** One published version as people and installers see it. */
export interface Release {
  version: string;
  publishedAt: string;
  notes?: string;
}

/** An item's releases, newest first, with their notes. */
export function releasesOf(versions: CatalogVersion[], limit = 10): Release[] {
  return versions
    .slice(-Math.max(1, limit))
    .reverse()
    .map(({ version, publishedAt, notes }) => ({ version, publishedAt, ...(notes?.trim() ? { notes: notes.trim() } : {}) }));
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The notes for `version` from a CHANGELOG.md: the lines under its heading
 * (`## 1.2.0`, `## v1.2.0`, `## [1.2.0] - 2026-11-02`, any heading level)
 * up to the next heading of the same level or higher.
 */
export function notesFromChangelog(changelog: string, version: string): string | undefined {
  const lines = changelog.split(/\r?\n/);
  const heading = new RegExp(`^(#{1,6})\\s+\\[?v?${escape(version)}\\]?(?:\\s|$)`);
  const start = lines.findIndex(line => heading.test(line));
  if (start < 0) return undefined;
  const level = heading.exec(lines[start])![1].length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => /^(#{1,6})\s/.test(line) && line.match(/^#+/)![0].length <= level);
  const notes = (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
  return notes || undefined;
}
