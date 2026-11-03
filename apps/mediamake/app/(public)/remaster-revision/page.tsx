import type { Metadata } from 'next';
import { RemasterRevisionsWorkspace } from '@/components/remaster-revisions/RemasterRevisionsWorkspace';

export const metadata: Metadata = {
  title: 'Remaster Revisions · MediaMake',
  description: 'Compare the versions of a remaster by ear from one shared playhead, loop a part, pick the final and leave notes, saved beside the files for Claude',
};

export default function RemasterRevisionPage() {
  return <RemasterRevisionsWorkspace />;
}
