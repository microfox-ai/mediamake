import type { Metadata } from 'next';
import { TranscriptCleanerWorkspace } from '@/components/transcript-cleaner/TranscriptCleanerWorkspace';

export const metadata: Metadata = {
  title: 'Transcript Cleaner · MediaMake',
  description:
    "Clean a song's timed words by ear: play it with the words lit, mark, rewrite, delete or re-line words, drag their times on a timeline and mark the song clean, saved beside the transcript for Claude",
};

export default function TranscriptCleanerPage() {
  return <TranscriptCleanerWorkspace />;
}
