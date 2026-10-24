import type { Metadata } from 'next';
import { ImageRevisionsWorkspace } from '@/components/image-revisions/ImageRevisionsWorkspace';

export const metadata: Metadata = {
  title: 'Image Revisions · MediaMake',
  description: 'Pick finals, keep, drop and comment on any set of local images (thumbnails, posters, generated images), saved beside them for Claude',
};

export default function ImageRevisionPage() {
  return <ImageRevisionsWorkspace />;
}
