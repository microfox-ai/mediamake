import { itemPagePath } from '@/lib/catalog/paths';
import type { CatalogEntry } from '@/lib/catalog/types';

/** One store item as the homepage shows it. */
export type ShelfItem = {
  id: string;
  title: string;
  kind: 'Skill' | 'MCP' | 'App';
  level: 'Alpha' | 'Beta' | 'Ready';
  href: string;
  headshot?: string;
};

/** What the homepage takes from the live catalog: how much is on the shelf, and the items it shows. */
export type HomeShelf = {
  counts: { skill: number; mcp: number; app: number };
  /** The pictures in the store chapter (the one place the homepage shows headshots). */
  shelf: ShelfItem[];
  /** The plain list beside them. */
  ledger: ShelfItem[];
};

/**
 * The items the homepage leads with, in the order they were chosen for it. Both lists are only an
 * order: an item that is archived, advised against or gone from the store drops out, and another
 * listed item takes its place, so the page never shows what the store no longer stands behind.
 */
const SHELF = [
  'mcp/figcraft',
  'mcp/blender',
  'app/transcript-cleaner',
  'skill/use-mac-recorder',
  'mcp/fal',
  'skill/use-figcraft',
  'mcp/comfy-mcp',
  'mcp/elevenlabs',
  'mcp/soundcraft',
  'skill/use-comfy',
  'skill/make-music-remix',
  'mcp/mm-use',
];
const LEDGER = [
  'mcp/figcraft',
  'skill/pack-brand-kit',
  'skill/make-video-music-remix',
  'mcp/blender',
  'skill/make-kinetictype',
  'skill/create-thumbnail',
  'app/transcript-cleaner',
  'mcp/fal',
  'skill/make-lyrics-video',
  'mcp/elevenlabs',
  'skill/use-mac-recorder',
];

const KIND = { skill: 'Skill', mcp: 'MCP', app: 'App' } as const;
const LEVEL = { alpha: 'Alpha', beta: 'Beta', ready: 'Ready' } as const;

type StoreKind = keyof typeof KIND;
const isStoreKind = (kind: string): kind is StoreKind => kind in KIND;

export function homeShelf(cards: CatalogEntry[]): HomeShelf {
  const listed = cards.filter((card) => !card.archivedAt && isStoreKind(card.kind));
  const counts = { skill: 0, mcp: 0, app: 0 };
  for (const card of listed) counts[card.kind as StoreKind] += 1;

  const shown = listed.filter((card) => !card.advice);
  const byId = new Map(shown.map((card) => [card.id, card]));
  const pick = (order: string[], fits: (card: CatalogEntry) => boolean): ShelfItem[] => {
    const chosen = order.map((id) => byId.get(id)).filter((card): card is CatalogEntry => !!card && fits(card));
    // a gap left by an item that dropped out: Ready items first, then as the catalog lists them
    const spare = shown
      .filter((card) => fits(card) && !chosen.includes(card))
      .sort((a, b) => Number(b.readiness === 'ready') - Number(a.readiness === 'ready'));
    return [...chosen, ...spare].slice(0, order.length).map((card) => ({
      id: card.id,
      title: card.title,
      kind: KIND[card.kind as StoreKind],
      level: LEVEL[card.readiness ?? 'beta'],
      href: itemPagePath(card.id),
      headshot: card.headshot,
    }));
  };

  return { counts, shelf: pick(SHELF, (card) => !!card.headshot), ledger: pick(LEDGER, () => true) };
}
