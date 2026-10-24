import type { Metadata } from 'next';
import '../globals.css';

/**
 * Pages that work without signing in. The revision screens (/remotion-revision,
 * /thumbnail-revision) only touch folders on the viewer's own computer, so they
 * need no session or API access. Each page sets its own title.
 */
export const metadata: Metadata = {
  title: 'MediaMake',
};

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
