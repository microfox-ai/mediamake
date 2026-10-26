import type { Metadata } from 'next';
import { SkillsBrowser } from '@/components/skills/SkillsBrowser';
import { parseSkillsMd, readSkillsMd } from '@/lib/skills/skills-md';

export const metadata: Metadata = {
  title: 'Skills · MediaMake',
  description: "The repo's Claude Code skills by category: public ones (committed) and private ones (on the owner's machine)",
};

// read at build time from the repo's SKILLS.md; in dev it is read on every request
export const dynamic = 'force-static';

export default function SkillsPage() {
  const text = readSkillsMd();
  return <SkillsBrowser index={text ? parseSkillsMd(text) : null} />;
}
