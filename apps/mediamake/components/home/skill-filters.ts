/**
 * The homepage Skills tab's filters and what it filters by, shared by the page (server) and the tab
 * (client): see SkillsTab in ./skills-tab.
 */
import type { RegistrySkill } from '@/lib/library/types';

/** What the tab filters a skill card by, from skills.json (made on the server, see skillFacets). */
export interface SkillFacet {
  category: string;
  internal?: boolean;
  variantOf?: string;
  /** Name, title, summary, description and MCPs, lower case: what the search looks in. */
  text: string;
  /** Its MCP ids (`mcp/<slug>`). */
  mcps: string[];
}

export interface SkillCategoryInfo {
  id: string;
  about: string;
  internal?: boolean;
}

/** The tab's filters, as they are kept in the URL (`/?tab=skills&q=…&category=…&mcp=…&show=internal,archived&variants=0`). */
export interface SkillFilters {
  q: string;
  category: string | null;
  mcp: string | null;
  internal: boolean;
  variants: boolean;
  archived: boolean;
}

export const SKILL_FILTER_PARAMS = ['q', 'category', 'mcp', 'show', 'variants'] as const;

export function skillFiltersFrom(params: Record<string, string | string[] | undefined>): SkillFilters {
  const one = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v) || null;
  };
  const show = new Set((one('show') ?? '').split(','));
  return {
    q: one('q') ?? '',
    category: one('category'),
    mcp: one('mcp'),
    internal: show.has('internal'),
    archived: show.has('archived'),
    variants: one('variants') !== '0',
  };
}

/** The registry's skills as the tab filters them, by card id (`skill/<name>`). */
export function skillFacets(skills: RegistrySkill[]): Record<string, SkillFacet> {
  return Object.fromEntries(
    skills.map(skill => {
      const mcps = (skill.mcps ?? []).map(mcp => mcp.id);
      const text = [skill.name, skill.title, skill.summary, skill.description, skill.category, skill.variantOf, skill.variantRef, ...mcps]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return [`skill/${skill.name}`, { category: skill.category, ...(skill.internal && { internal: true }), ...(skill.variantOf && { variantOf: skill.variantOf }), text, mcps }];
    }),
  );
}
