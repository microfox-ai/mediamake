import type { Metadata } from 'next';
import { ThumbnailRevisionsWorkspace } from '@/components/thumbnail-revisions/ThumbnailRevisionsWorkspace';

export const metadata: Metadata = {
  title: 'Thumbnail Revisions · MediaMake',
  description: 'Pick finals, keep, drop and comment on local thumbnail renders, saved beside them for Claude',
};

export default function ThumbnailRevisionPage() {
  return <ThumbnailRevisionsWorkspace />;
}
