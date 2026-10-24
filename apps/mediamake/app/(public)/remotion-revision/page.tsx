import type { Metadata } from 'next';
import { RevisionsWorkspace } from '@/components/revisions/RevisionsWorkspace';

export const metadata: Metadata = {
  title: 'Remotion Revisions · MediaMake',
  description:
    'Review local renders shot by shot and leave revision notes beside the video',
};

export default function RemotionRevisionPage() {
  return <RevisionsWorkspace />;
}
