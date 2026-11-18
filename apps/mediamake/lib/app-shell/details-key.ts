/**
 * The key each place an item is listed opens the item dialog by (./details,
 * components/app-shell/item-details). On its own so a page's client code
 * can name an item without loading how its details are worked out.
 */
export const detailsKey = {
  catalog: (id: string) => `catalog:${id}`,
  space: (spaceId: string, itemKey: string) => `space:${spaceId}:${itemKey}`,
  linked: (id: string) => `linked:${id}`,
  local: (name: string) => `local:${name}`,
};
