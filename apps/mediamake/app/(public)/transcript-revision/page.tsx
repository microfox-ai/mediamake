import type { Metadata } from 'next';
import { TranscriptRevisionsWorkspace } from '@/components/transcript-revisions/TranscriptRevisionsWorkspace';

export const metadata: Metadata = {
  title: 'Transcript Revisions · MediaMake',
  description: "Review a song's timed words by ear: play it with the words lit, mark wrong words and timings, drag word times on a timeline, saved beside the transcript for Claude",
};

export default function TranscriptRevisionPage() {
  return <TranscriptRevisionsWorkspace />;
}
