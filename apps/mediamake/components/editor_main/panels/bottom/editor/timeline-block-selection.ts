/**
 * Exclusive block selection across clubbed timeline sections.
 * Selecting in one section clears selection in any other.
 */

type ClearFn = () => void;

let activeOwnerId: string | null = null;
let activeClear: ClearFn | null = null;

/** Claim exclusive selection for `ownerId`. Clears any other section's selection. */
export function claimBlockSelection(ownerId: string, clear: ClearFn) {
  if (activeOwnerId && activeOwnerId !== ownerId) {
    const prev = activeClear;
    activeOwnerId = ownerId;
    activeClear = clear;
    prev?.();
    return;
  }
  activeOwnerId = ownerId;
  activeClear = clear;
}

/** Release claim when this section deselects or unmounts. */
export function releaseBlockSelection(ownerId: string) {
  if (activeOwnerId !== ownerId) return;
  activeOwnerId = null;
  activeClear = null;
}
