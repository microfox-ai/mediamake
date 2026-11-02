/** Types for what the media CLI imports from skills.mjs (apps/lyrics_videos/scripts/library/sync.ts). */
export const TEXT_FILE: RegExp;
export function frontmatter(file: string): { name?: string; description?: string; version?: string; metadata: Record<string, string> };
export function checks(skill: { name: string; frontName?: string; dir: string; dependsOn: string[] }): { problems: string[]; notes: string[] };
