import { ProofGallery } from '@/components/catalog/proof-gallery';
import { listingTiles, type ListingMedia } from '@/lib/catalog/listing';

/**
 * An item's screenshots on its own page, like an app store listing's: the
 * pictures and videos of the item an admin added by link on its release page
 * (see ItemListing), in the same gallery as "Made with this". Nothing when
 * it has none.
 */
export function ListingScreenshots({ itemId, media }: { itemId: string; media?: ListingMedia[] | null }) {
  if (!media?.length) return null;
  return (
    <section id="screenshots" className="flex scroll-mt-6 flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Screenshots</h2>
      <ProofGallery itemId={itemId} tiles={listingTiles(media)} />
    </section>
  );
}

/** The tags an admin added to an item's listing, as small chips; nothing when it has none. */
export function ListingTags({ tags }: { tags?: string[] | null }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => (
        <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tag}
        </span>
      ))}
    </div>
  );
}
