import { Badge } from '@/components/ui/badge';
import { ProofGallery } from '@/components/catalog/proof-gallery';
import { galleryTiles } from '@/lib/catalog/gallery';
import { proofOf, RULE, type ReadinessMark } from '@/lib/catalog/types';

/**
 * "Made with this": the proof behind the rule (RULE), on every item's page,
 * laid out like a store listing. The item's trailer (its intro video) is the
 * big first tile, then the finished productions made with it, as an admin
 * recorded them with the Ready mark (pictures, clips, YouTube links, links).
 * A Beta item shows its trailer when it has one and says that no production
 * is on record yet, so nobody takes it for proven.
 */
export function MadeWithThis({
  itemId,
  mark,
  video,
}: {
  itemId: string;
  mark: ReadinessMark | null;
  /** The item's intro video: the trailer. */
  video?: { youtubeId?: string; title: string; description?: string; thumbnail?: string } | null;
}) {
  const proof = proofOf(mark);
  const ready = proof.length > 0;
  const tiles = galleryTiles(video, proof);
  return (
    <section id="made-with-this" className="flex scroll-mt-6 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">Made with this</h2>
        <Badge variant={ready ? 'default' : 'secondary'} title={ready ? 'Proven: a finished production was made with it' : 'Not proven yet: no finished production is on record'}>
          {ready ? 'Ready' : 'Beta'}
        </Badge>
        <p className="ml-auto text-xs font-medium text-muted-foreground">{RULE}</p>
      </div>
      {tiles.length > 0 && <ProofGallery itemId={itemId} tiles={tiles} />}
      {ready ? (
        mark?.at && (
          <p className="text-xs text-muted-foreground">
            {proof.length === 1 ? '1 production' : `${proof.length} productions`} made with it. Ready since{' '}
            <time dateTime={mark.at}>{new Date(mark.at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</time>.
          </p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">No production on record yet. It stays Beta until a finished production made with it is shown here.</p>
      )}
    </section>
  );
}
