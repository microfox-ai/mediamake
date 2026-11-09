/**
 * The repo's skill registry, skills.json (mediamake.skills/v1), for the skill pages, /library, the
 * catalog and the releases dashboard. It is built, never committed: this app's `build` and `dev`
 * scripts write it first (`node tools/skills.mjs index`, from .agents/skills). It is imported, so every
 * build (pages and server routes alike) carries the copy it was built with. The registry is the one
 * list of skills; a skill's own page (/skills/<name>) only shows its SKILL.md text, read from GitHub.
 *
 * On Vercel the build runs through turbo (`turbo build`), whose cache can hand back the last .next
 * without running the build script. Its traces still name this file, so turbo.json runs the
 * `skills-index` task before every build and never caches it: the file is there either way. A change to
 * a skill (.agents/skills, tools/skills.mjs) is in turbo.json's globalDependencies, so it builds again
 * instead of reusing a .next made from the old list.
 */
import registryJson from '../../../../skills.json';
import { REGISTRY_SCHEMA, type RegistrySkill, type SkillsRegistry } from '@/lib/library/types';

/** skills.json at the repo root, or null when it isn't a registry this code understands. */
export const registry: SkillsRegistry | null =
  (registryJson as { schema?: string }).schema === REGISTRY_SCHEMA ? (registryJson as unknown as SkillsRegistry) : null;

/** The naming rules: each category's prefix or suffix. */
export function namingRules(registry: SkillsRegistry): { pattern: string; about: string }[] {
  return registry.categories.filter(c => c.prefix || c.suffix).map(c => ({ pattern: c.prefix ? `${c.prefix}*` : `*${c.suffix}`, about: c.about }));
}

/** One registry skill by its name, or null. */
export function skillNamed(name: string): RegistrySkill | null {
  return registry?.skills.find(skill => skill.name === name) ?? null;
}

/** How one skill sits among the others: what it builds on and what builds on it. */
export function skillRelations(skill: RegistrySkill) {
  const all = registry?.skills ?? [];
  return {
    /** Its variants (forks made with `skills.mjs fork`). */
    variants: all.filter(other => other.variantOf === skill.name),
    /** Skills that run this one as a step (their `depends-on`). */
    usedBy: all.filter(other => other.dependsOn?.includes(skill.name)),
  };
}

/** Where a skill's SKILL.md is on GitHub, and its raw text. */
export const SKILLS_GITHUB = 'https://github.com/microfox-ai/mediamake';
export const skillMdUrl = (skill: RegistrySkill) => `${SKILLS_GITHUB}/blob/main/${skill.path}/SKILL.md`;
export const skillRawUrl = (skill: RegistrySkill) => `https://raw.githubusercontent.com/microfox-ai/mediamake/main/${skill.path}/SKILL.md`;
