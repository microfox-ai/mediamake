import Link from 'next/link';
import { ComingSoon } from '@/components/app-shell/app-page';
import { navFor } from '@/lib/app-shell/nav';
import { getAppViewer } from '@/lib/app-shell/viewer';

export const metadata = { title: 'Home · MediaMake' };

/** /app: Home. For now, the way into every page the person can open. */
export default async function AppHomePage() {
  const { tier } = await getAppViewer();
  const sections = navFor(tier).filter(section => section.label);

  return (
    <ComingSoon
      title="Home"
      about="Home will show three columns, Skills, MCPs and Apps: what you use most, then what you installed recently, with open, copy prompt and update on each row."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map(section => (
          <div key={section.label} className="rounded-xl border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.label}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {section.items.map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="underline-offset-4 hover:underline">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ComingSoon>
  );
}
