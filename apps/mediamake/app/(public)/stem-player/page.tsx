import type { Metadata } from 'next';
import { StemPlayerWorkspace } from '@/components/stem-player/StemPlayerWorkspace';

export const metadata: Metadata = {
  title: 'Stem Player · MediaMake',
  description:
    "Hear a song's stems or versions from one playhead: move between tracks with the arrow keys, select several to play them together, loop a part, and for versions match their levels, pick the final and leave notes for Claude",
};

export default function StemPlayerPage() {
  return <StemPlayerWorkspace />;
}
