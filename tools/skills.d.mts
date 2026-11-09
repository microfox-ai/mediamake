/** Types for what the media CLI imports from skills.mjs (apps/studio/scripts/library/sync.ts). */
export type SkillInfo = {
  name: string;
  dir: string;
  moved?: boolean;
  linked?: boolean;
  category: string;
  title?: string;
  variantOf?: string;
  variantRef?: string;
  forkedFrom?: string;
  forked?: string;
  dependsOn: string[];
  mcps: { id: string; need: string; for: string; without: string }[];
  mcpErrors: string[];
  version?: string;
  description: string;
  frontName?: string;
};
export const TEXT_FILE: RegExp;
export function frontmatter(file: string): { name?: string; description?: string; version?: string; metadata: Record<string, string> };
export function skillAt(name: string, dir: string, where?: { moved?: boolean; linked?: boolean; upstream?: unknown }): SkillInfo;
export function checks(skill: SkillInfo): { problems: string[]; notes: string[] };
