import type { Metadata } from 'next';
import { SkillLibraryWorkspace } from '@/components/skill-library/SkillLibraryWorkspace';

export const metadata: Metadata = {
  title: 'Skill Library · MediaMake',
  description:
    'Browse the Claude Code skills on this computer with thumbnails, their variants, and the projects that used them',
};

export default function SkillLibraryPage() {
  return <SkillLibraryWorkspace />;
}
