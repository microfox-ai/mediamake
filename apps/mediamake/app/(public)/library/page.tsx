import type { Metadata } from 'next';
import { LibraryWorkspace } from '@/components/library/LibraryWorkspace';
import { registry } from '@/lib/skills/registry';

export const metadata: Metadata = {
  title: 'Library · MediaMake',
  description: 'Your channels, productions, skills and media library in one place: what each skill made, what each production used and where it was delivered',
};

// the skill registry (skills.json) is bundled at build time
export const dynamic = 'force-static';

export default function LibraryPage() {
  return <LibraryWorkspace registry={registry} />;
}
