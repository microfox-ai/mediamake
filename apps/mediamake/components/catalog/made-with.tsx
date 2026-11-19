import { Badge } from '@/components/ui/badge';
import { MadeGallery } from '@/components/catalog/made-members';
import { galleryTiles } from '@/lib/catalog/gallery';
import type { MadeShown } from '@/lib/catalog/made';
import { levelInfo, proofOf, RULE, type ReadinessMark, type Readiness } from '@/lib/catalog/types';

/**
 * "Made with this": the proof behind the rule (RULE), on every item's page,
 * laid out like a store listing: the finished productions made with it, as
 * an admin recorded them with the Ready mark (pictures, clips, YouTube links,
 * links), then what members who use it added themselves (lib/catalog/made,
 * Add yours). The item's trailer is not one of them: it plays above the
 * README. With nothing yet it says so, whatever its level: an admin may take
 * an item to Production before a production is on record.
 */
export function MadeWithThis({
  itemId,
  itemKey,
  title,
  mark,
  members = [],
  loginHref,
}: {
  itemId: string;
  /** Its details key (`catalog:<id>`): what members' entries are kept by. */
  itemKey: string;
  title: string;
  mark: ReadinessMark | null;
  /** What members added, as the page was built with them. */
  members?: MadeShown[];
  loginHref?: string;
}) {
  const proof = proofOf(mark);
  const level: Readiness = mark?.readiness === 'ready' ? 'ready' : mark?.readiness === 'alpha' ? 'alpha' : 'beta';
  return (
    <section id="made-with-this" className="flex scroll-mt-6 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Made with this</h2>
        <Badge variant={level === 'ready' ? 'default' : 'secondary'} title={levelInfo(level).about}>
          {levelInfo(level).label}
        </Badge>
        <p className="ml-auto text-xs font-medium text-muted-foreground">{RULE}</p>
      </div>
      <MadeGallery itemKey={itemKey} itemId={itemId} title={title} proof={galleryTiles(proof)} initial={members} loginHref={loginHref} empty="No production on record yet." />
    </section>
  );
}
