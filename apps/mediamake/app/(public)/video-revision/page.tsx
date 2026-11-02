import type { Metadata } from 'next';
import { RevisionsWorkspace } from '@/components/revisions/RevisionsWorkspace';

export const metadata: Metadata = {
  title: 'Video Revision · MediaMake',
  description:
    'Review local renders shot by shot and leave revision notes beside the video',
};

export default function VideoRevisionPage() {
  return <RevisionsWorkspace />;
}
