export const BASE_ATOMS_CATEGORY = 'BaseAtoms';

/**
 * Category for an atom block.
 * An explicit category wins. Otherwise the folder name is the category,
 * and atoms defined in an `atoms` folder are BaseAtoms.
 */
export function atomCategory(folder: string, category?: string): string {
  const explicit = category?.trim();
  if (explicit) return explicit;
  return folder === 'atoms' ? BASE_ATOMS_CATEGORY : folder;
}
