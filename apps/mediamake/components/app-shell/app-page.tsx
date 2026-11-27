import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';

/** One page of the app: its title bar (with `header` beside the title, when given), then its content. */
export function AppPage({ title, header, children }: { title: string; header?: React.ReactNode; children: React.ReactNode }) {
  return (
    <SidebarInset>
      <SiteHeader title={title}>{header}</SiteHeader>
      {children}
    </SidebarInset>
  );
}

/**
 * A page whose content is still to be built: what it will be, in the
 * plan's words, so the shell can be walked end to end. `children` holds
 * anything the page can already show.
 */
export function ComingSoon({
  title,
  about,
  points,
  children,
}: {
  title: string;
  about: string;
  points?: string[];
  children?: React.ReactNode;
}) {
  return (
    <AppPage title={title}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 lg:px-6">
        {children}
        <div className="rounded-xl border border-dashed p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Being built</p>
          <p className="mt-2 text-sm">{about}</p>
          {points && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {points.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppPage>
  );
}
