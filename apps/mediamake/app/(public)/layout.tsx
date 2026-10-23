import type { Metadata } from 'next';
import '../globals.css';

/**
 * Pages that work without signing in. Revisions only touches folders on the
 * viewer's own computer, so it needs no session or API access.
 */
export const metadata: Metadata = {
  title: 'Revisions · MediaMake',
  description:
    'Review local renders shot by shot and leave revision notes beside the video',
};

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
