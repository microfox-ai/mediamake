import Link from 'next/link';
import { ComingSoon } from '@/components/app-shell/app-page';

export const metadata = { title: 'Explore · MediaMake' };

/** /app/explore: every skill, MCP and app the person can open. Until it is built, the public lists stand in. */
export default function ExplorePage() {
  return (
    <ComingSoon
      title="Explore"
      about="Explore will list every skill, MCP and app you can open, with search, kind and field (music, anime, film and so on), and Beta and membership badges. Locked items will say which membership opens them."
    >
      <p className="text-sm">
        Until then, browse them on the site:{' '}
        {[
          ['Skills', '/?tab=skills'],
          ['MCPs', '/?tab=mcps'],
          ['Apps', '/?tab=apps'],
        ].map(([label, href], index) => (
          <span key={href}>
            {index > 0 && ', '}
            <Link href={href} className="font-medium underline underline-offset-4">
              {label}
            </Link>
          </span>
        ))}
        .
      </p>
    </ComingSoon>
  );
}
