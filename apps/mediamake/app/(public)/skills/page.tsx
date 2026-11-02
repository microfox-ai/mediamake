import type { Metadata } from 'next';
import { SkillsBrowser } from '@/components/skills/SkillsBrowser';
import { namingRules, registry } from '@/lib/skills/registry';

export const metadata: Metadata = {
  title: 'Skills · MediaMake',
  description: "The repo's Claude Code skills by category, all public and committed",
};

// skills.json is bundled at build time (lib/skills/registry.ts)
export const dynamic = 'force-static';

export default function SkillsPage() {
  return <SkillsBrowser registry={registry} naming={registry ? namingRules(registry) : []} />;
}
