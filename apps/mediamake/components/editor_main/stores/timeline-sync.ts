import type { Timeline } from './project-store';

export type UpdatedAtMap = Map<string, string>;

export function parseUpdatedAt(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isTimelineUnsyncedWithCloud(
  timelineId: string,
  cloudUpdatedAtByTimelineId: UpdatedAtMap,
  localEditUpdatedAtByTimelineId: UpdatedAtMap,
  cloudTimelineUpdatedAt?: string | null
): boolean {
  const localEditAt = localEditUpdatedAtByTimelineId.get(timelineId);
  if (!localEditAt) {
    return false;
  }

  const cloudAt =
    cloudUpdatedAtByTimelineId.get(timelineId) ?? cloudTimelineUpdatedAt ?? null;

  if (!cloudAt) {
    return true;
  }

  return parseUpdatedAt(localEditAt) > parseUpdatedAt(cloudAt);
}

export function getUnsyncedTimelineIds(
  timelines: Timeline[],
  cloudUpdatedAtByTimelineId: UpdatedAtMap,
  localEditUpdatedAtByTimelineId: UpdatedAtMap
): string[] {
  const ids = new Set<string>([
    ...localEditUpdatedAtByTimelineId.keys(),
    ...cloudUpdatedAtByTimelineId.keys(),
  ]);

  return Array.from(ids).filter((timelineId) => {
    const cloudTimelineUpdatedAt = timelines.find((t) => t.id === timelineId)?.updatedAt;
    return isTimelineUnsyncedWithCloud(
      timelineId,
      cloudUpdatedAtByTimelineId,
      localEditUpdatedAtByTimelineId,
      cloudTimelineUpdatedAt
    );
  });
}

export function mapFromEntries(entries?: [string, string][] | null): UpdatedAtMap {
  return new Map(entries ?? []);
}

export function mapToEntries(map: UpdatedAtMap): [string, string][] {
  return Array.from(map.entries());
}
