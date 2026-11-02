import type { Metadata } from 'next';
import { SkillsBrowser } from '@/components/skills/SkillsBrowser';
import { installPromptFor } from '@/lib/catalog/install-prompt';
import { catalogArchiveDB } from '@/lib/catalog/store';
import { namingRules, registry } from '@/lib/skills/registry';

export const metadata: Metadata = {
  title: 'Skills · MediaMake',
  description: "The repo's Claude Code skills by category, all public and committed",
};

// skills.json is bundled at build time (lib/skills/registry.ts); which ones are archived is
// read from the catalog again every few minutes
export const revalidate = 300;

export default async function SkillsPage() {
  const installPrompts = Object.fromEntries((registry?.skills ?? []).map(skill => [skill.name, installPromptFor(`skill/${skill.name}`)]));
  const archived = await catalogArchiveDB.list().catch(error => {
    console.error('[skills] Could not read archived skills:', error);
    return [];
  });
  return (
    <SkillsBrowser
      registry={registry}
      naming={registry ? namingRules(registry) : []}
      installPrompts={installPrompts}
      archived={archived.filter(mark => mark.id.startsWith('skill/')).map(mark => mark.id.slice('skill/'.length))}
    />
  );
}
