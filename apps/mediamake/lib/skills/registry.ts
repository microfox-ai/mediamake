/**
 * The repo's skill registry, skills.json (mediamake.skills/v1, written by `node tools/skills.mjs
 * index`), for /skills, /library, the catalog and the releases dashboard. It is imported, so every
 * build (pages and server routes alike) carries the copy it was built with; nothing in the app
 * parses SKILL.md or SKILLS.md: the registry is the one list of skills.
 */
import registryJson from '../../../../skills.json';
import { REGISTRY_SCHEMA, type SkillsRegistry } from '@/lib/library/types';

/** skills.json at the repo root, or null when it isn't a registry this code understands. */
export const registry: SkillsRegistry | null =
  (registryJson as { schema?: string }).schema === REGISTRY_SCHEMA ? (registryJson as unknown as SkillsRegistry) : null;

/** The naming rules: each category's prefix or suffix. */
export function namingRules(registry: SkillsRegistry): { pattern: string; about: string }[] {
  return registry.categories.filter(c => c.prefix || c.suffix).map(c => ({ pattern: c.prefix ? `${c.prefix}*` : `*${c.suffix}`, about: c.about }));
}
