import type { Caption } from '@/app/types/transcription';
import {
  captionsDocumentId,
  updateCaptionsDocument,
} from '@/lib/captions/captions-client';

/**
 * Caption lines live in the captions collection, separate from the timeline.
 * Local undo still needs the lines that belonged to each history step, so each
 * step keeps a snapshot beside the timeline and this module remembers which
 * documents this session owns.
 */

export interface LocalCaptionSnapshot {
  id: string;
  title: string;
  description: string;
  sourceTranscriptionId?: string;
  captions: unknown[];
}

type CaptionReference = {
  type?: string;
  value?: {
    _id?: unknown;
    title?: string;
    description?: string;
    sourceTranscriptionId?: unknown;
    captions?: unknown;
  } | null;
};

export type CaptionTimeline = {
  defaultData?: {
    references?: CaptionReference[];
  } | null;
};

const ownedKeys = new Map<string, string>();
const latestSnapshots = new Map<string, LocalCaptionSnapshot>();
const lastWrittenKeys = new Map<string, string>();
const pendingWriteIds = new Set<string>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let writeGeneration = 0;

export function captionValueKey(
  value: {
    _id?: unknown;
    title?: string;
    description?: string;
    captions?: unknown;
  } | null | undefined,
): string {
  return JSON.stringify({
    id: captionsDocumentId(value?._id),
    title: value?.title ?? '',
    description: value?.description ?? '',
    captions: Array.isArray(value?.captions) ? value.captions : [],
  });
}

export function captionSnapshotKey(snapshot: LocalCaptionSnapshot): string {
  return captionValueKey({
    _id: snapshot.id,
    title: snapshot.title,
    description: snapshot.description,
    captions: snapshot.captions,
  });
}

export function captionSnapshotsFromTimeline(
  timeline: CaptionTimeline | null | undefined,
): LocalCaptionSnapshot[] {
  const references = timeline?.defaultData?.references;
  if (!Array.isArray(references)) return [];
  const snapshots: LocalCaptionSnapshot[] = [];
  for (const reference of references) {
    if (reference?.type !== 'captions') continue;
    const value = reference.value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const id = captionsDocumentId(value._id);
    if (!id) continue;
    const sourceTranscriptionId = captionsDocumentId(value.sourceTranscriptionId);
    snapshots.push({
      id,
      title: value.title ?? '',
      description: value.description ?? '',
      ...(sourceTranscriptionId ? { sourceTranscriptionId } : {}),
      captions: Array.isArray(value.captions) ? value.captions : [],
    });
  }
  return snapshots;
}

export function captionIdsChanged(
  previous: CaptionTimeline | null | undefined,
  next: CaptionTimeline | null | undefined,
): string[] {
  const before = new Map(
    captionSnapshotsFromTimeline(previous).map((snapshot) => [
      snapshot.id,
      captionSnapshotKey(snapshot),
    ]),
  );
  const after = captionSnapshotsFromTimeline(next);
  const changed = new Set<string>();
  for (const snapshot of after) {
    if (before.get(snapshot.id) !== captionSnapshotKey(snapshot)) {
      changed.add(snapshot.id);
    }
    before.delete(snapshot.id);
  }
  for (const id of before.keys()) changed.add(id);
  return [...changed];
}

/** Drop caption line arrays that are kept in the history sidecar. Lines with no document id stay on the timeline. */
export function timelineWithoutCaptionBodies<T extends CaptionTimeline>(
  timeline: T,
  snapshots?: LocalCaptionSnapshot[],
): T {
  const references = timeline.defaultData?.references;
  if (!Array.isArray(references)) return timeline;
  const storedIds = new Set(
    (snapshots ?? captionSnapshotsFromTimeline(timeline)).map((snapshot) => snapshot.id),
  );
  let changed = false;
  const nextReferences = references.map((reference) => {
    if (reference?.type !== 'captions') return reference;
    const value = reference.value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return reference;
    const id = captionsDocumentId(value._id);
    if (!id || !storedIds.has(id) || !Array.isArray(value.captions)) return reference;
    changed = true;
    const { captions: _captions, ...rest } = value;
    return { ...reference, value: rest };
  });
  if (!changed) return timeline;
  return {
    ...timeline,
    defaultData: {
      ...(timeline.defaultData || {}),
      references: nextReferences,
    },
  };
}

export function applyCaptionSnapshots<T extends CaptionTimeline>(
  timeline: T,
  snapshots: LocalCaptionSnapshot[] | undefined,
): T {
  if (!snapshots?.length) return timeline;
  const references = timeline.defaultData?.references;
  if (!Array.isArray(references)) return timeline;
  const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
  let changed = false;
  const nextReferences = references.map((reference) => {
    if (reference?.type !== 'captions') return reference;
    const id = captionsDocumentId(reference.value?._id);
    const snapshot = id ? byId.get(id) : undefined;
    if (!snapshot) return reference;
    const currentKey = captionValueKey(reference.value);
    if (currentKey === captionSnapshotKey(snapshot)) return reference;
    changed = true;
    return {
      ...reference,
      value: {
        ...(reference.value || {}),
        _id: snapshot.id,
        title: snapshot.title,
        description: snapshot.description,
        ...(snapshot.sourceTranscriptionId
          ? { sourceTranscriptionId: snapshot.sourceTranscriptionId }
          : {}),
        captions: snapshot.captions,
      },
    };
  });
  if (!changed) return timeline;
  return {
    ...timeline,
    defaultData: {
      ...(timeline.defaultData || {}),
      references: nextReferences,
    },
  };
}

/** Remember caption documents this session has edited, so a later fetch cannot replace them. */
export function rememberLocalCaptions(
  timeline: CaptionTimeline | null | undefined,
  ids?: ReadonlySet<string>,
) {
  for (const snapshot of captionSnapshotsFromTimeline(timeline)) {
    if (ids && !ids.has(snapshot.id)) continue;
    ownedKeys.set(snapshot.id, captionSnapshotKey(snapshot));
  }
}

export function localCaptionMatches(id: string, key: string): boolean {
  return ownedKeys.get(id) === key;
}

export function clearLocalCaptionOwnership() {
  ownedKeys.clear();
  pendingWriteIds.clear();
  latestSnapshots.clear();
  writeGeneration += 1;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
}

/**
 * Documents touched by local history up to the cursor. Their current lines
 * stay owned after a reload so opening the reference does not reload the server copy.
 */
export function seedCaptionOwnershipFromHistory(
  history: Array<{ captionEditIds?: string[]; timelineId?: string; timeline?: CaptionTimeline; captions?: LocalCaptionSnapshot[] }>,
  historyIndex: number,
  editedTimelines: Map<string, CaptionTimeline>,
) {
  if (historyIndex < 0) return;
  const idsByTimeline = new Map<string, Set<string>>();
  for (let index = 0; index <= historyIndex && index < history.length; index++) {
    const entry = history[index];
    const timelineId = entry?.timelineId;
    if (!timelineId || !entry.captionEditIds?.length) continue;
    const ids = idsByTimeline.get(timelineId) ?? new Set<string>();
    for (const id of entry.captionEditIds) ids.add(id);
    idsByTimeline.set(timelineId, ids);
  }
  for (const [timelineId, ids] of idsByTimeline) {
    const edited = editedTimelines.get(timelineId);
    if (edited) {
      rememberLocalCaptions(edited, ids);
      continue;
    }
    for (let index = Math.min(historyIndex, history.length - 1); index >= 0; index--) {
      const entry = history[index];
      if (entry?.timelineId !== timelineId) continue;
      rememberLocalCaptions(applyCaptionSnapshots(entry.timeline ?? {}, entry.captions), ids);
      break;
    }
  }
}

/** Write locally restored caption lines back to the captions collection. */
export function scheduleCaptionWriteBack(
  timeline: CaptionTimeline | null | undefined,
  ids: ReadonlySet<string>,
) {
  if (typeof window === 'undefined' || ids.size === 0) return;
  for (const snapshot of captionSnapshotsFromTimeline(timeline)) {
    if (!ids.has(snapshot.id)) continue;
    pendingWriteIds.add(snapshot.id);
    latestSnapshots.set(snapshot.id, snapshot);
  }
  if (pendingWriteIds.size === 0) return;
  if (writeTimer) clearTimeout(writeTimer);
  const generation = ++writeGeneration;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    if (generation !== writeGeneration) return;
    const due = [...pendingWriteIds];
    pendingWriteIds.clear();
    for (const id of due) {
      const snapshot = latestSnapshots.get(id);
      if (!snapshot) continue;
      const key = captionSnapshotKey(snapshot);
      if (lastWrittenKeys.get(id) === key) continue;
      void updateCaptionsDocument(id, {
        title: snapshot.title,
        description: snapshot.description,
        captions: snapshot.captions as Caption[],
      })
        .then(() => {
          if (generation !== writeGeneration) return;
          lastWrittenKeys.set(id, key);
        })
        .catch((error) => {
          console.error('Failed to write restored captions', error);
        });
    }
  }, 400);
}
