import { type VcsFileSnapshot } from '@/lib/db/collections';

export interface MergePreview {
  autoMergedFiles: Array<{ fileId: string; source: VcsFileSnapshot | null; target: VcsFileSnapshot | null }>;
  conflicts: Array<{ fileId: string; source: VcsFileSnapshot | null; target: VcsFileSnapshot | null }>;
}

/**
 * Compare two snapshots for equality.
 * Both null/undefined = equal (both absent).
 * null and non-null = not equal (one absent, one present).
 */
function equalSnapshot(
  a: VcsFileSnapshot | null | undefined,
  b: VcsFileSnapshot | null | undefined,
): boolean {
  const aAbsent = a === null || a === undefined;
  const bAbsent = b === null || b === undefined;
  if (aAbsent && bAbsent) return true;
  if (aAbsent !== bAbsent) return false;
  // Both non-null
  return (
    a!.name === b!.name &&
    a!.type === b!.type &&
    a!.parentId === b!.parentId &&
    a!.content === b!.content
  );
}

/**
 * 3-way merge preview.
 *
 * Rules (matching git's semantics at whole-file granularity):
 *   - Source unchanged from ancestor → skip (target is already correct)
 *   - Source changed, target unchanged → auto-merge (apply source)
 *   - Both changed identically → skip (already in sync)
 *   - Both changed differently → conflict
 *
 * The `ancestorMap` comes from `getSnapshotAtCommit(commonAncestor)`.
 * When branches have no common ancestor (unrelated histories), pass an empty Map
 * which degrades gracefully to a 2-way diff.
 */
export function buildMergePreview(
  sourceMap: Map<string, VcsFileSnapshot | null>,
  targetMap: Map<string, VcsFileSnapshot | null>,
  ancestorMap: Map<string, VcsFileSnapshot | null>,
): MergePreview {
  const autoMergedFiles: MergePreview['autoMergedFiles'] = [];
  const conflicts: MergePreview['conflicts'] = [];

  // Helper: get value distinguishing "not in map" (undefined) from "deleted" (null)
  const get = (map: Map<string, VcsFileSnapshot | null>, id: string) =>
    map.has(id) ? map.get(id) : undefined;

  const allFileIds = new Set<string>([
    ...sourceMap.keys(),
    ...targetMap.keys(),
    ...ancestorMap.keys(),
  ]);

  for (const fileId of allFileIds) {
    const source = get(sourceMap, fileId);   // undefined = never in source
    const target = get(targetMap, fileId);   // undefined = never in target
    const ancestor = get(ancestorMap, fileId); // undefined = never in ancestor

    const srcChanged = !equalSnapshot(source, ancestor);
    const tgtChanged = !equalSnapshot(target, ancestor);

    // Source didn't change from ancestor → nothing from source to bring in
    if (!srcChanged) continue;

    // Only source changed → auto-merge (apply source to target)
    if (!tgtChanged) {
      // Only record if source differs from current target (prevents no-op entries)
      if (!equalSnapshot(source, target)) {
        autoMergedFiles.push({ fileId, source: source ?? null, target: target ?? null });
      }
      continue;
    }

    // Both changed from ancestor in the same way → no conflict needed
    if (equalSnapshot(source, target)) continue;

    // Both changed from ancestor differently → conflict
    conflicts.push({ fileId, source: source ?? null, target: target ?? null });
  }

  return { autoMergedFiles, conflicts };
}
