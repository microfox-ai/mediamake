import type { Metadata } from 'next';
import { RemotionEditorWorkspace } from '@/components/remotion-editor/RemotionEditorWorkspace';

export const metadata: Metadata = {
  title: 'Remotion editor · MediaMake',
  description:
    'Open a lyric video from apps/lyrics_videos, move, re-font and retype what is on screen, and save the edits beside the project',
};

export default function RemotionEditorPage() {
  return <RemotionEditorWorkspace />;
}
