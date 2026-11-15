import Link from 'next/link';
import { TriangleAlertIcon } from 'lucide-react';
import { APP_HOME } from '@/lib/app-shell/nav';

/**
 * The strip across the top of every Core page: Core is deprecated. Its
 * pages still work for the people who have them, but nothing on the site or
 * in the app links here any more, and nothing new is built here.
 */
export function CoreDeprecatedBanner() {
  return (
    <div
      role="note"
      className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      <TriangleAlertIcon className="size-3.5 shrink-0" />
      <p>
        <span className="font-semibold">MediaMake Core is deprecated.</span> These pages still work, but nothing new is
        built here. Projects, releases, API keys and devices are now in{' '}
        <Link href={APP_HOME} className="font-medium underline underline-offset-2">
          the app
        </Link>
        .
      </p>
    </div>
  );
}
