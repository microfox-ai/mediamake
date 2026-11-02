import type { Metadata } from 'next';
import { FileRevisionsWorkspace } from '@/components/file-revisions/FileRevisionsWorkspace';

export const metadata: Metadata = {
  title: 'File Revisions · MediaMake',
  description: 'Pick finals, keep, drop and comment on any set of local files (thumbnails, posters, generated images, videos), saved beside them for Claude',
};

export default function FileRevisionPage() {
  return <FileRevisionsWorkspace />;
}
