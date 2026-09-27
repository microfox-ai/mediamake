/** Pure helpers for collecting / editing preset range tracks. */

export type RangeKind = "data-reference" | "plain-range";

export interface RawRange {
  path: string;
  key: string;
  range: string;
  kind: RangeKind;
}

export interface TrackGroup {
  templatePath: string;
  label: string;
  kind: RangeKind;
  key: string;
  concretePaths: string[];
  currentRanges: string[];
}

export type SegmentKind = "time" | "index";

export interface ParsedSegment {
  kind: SegmentKind;
  start: number;
  end: number;
}

export function parseReferenceRange(
  value: unknown,
): { key: string; range: string } | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^data:\[([^\]]+)\](?:\[([^\]]*)\])?$/);
  if (!m) return null;
  return { key: m[1]!, range: m[2] ?? "" };
}

export function parseTimeToSeconds(v: string): number | null {
  const s = v.trim();
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => p.trim());
    if (parts.some((p) => !p)) return null;
    const nums = parts.map(Number);
    if (nums.some(Number.isNaN)) return null;
    if (nums.length === 2) return nums[0]! * 60 + nums[1]!;
    if (nums.length === 3) return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
    return null;
  }
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

export function formatSeconds(v: number): string {
  const safe = Math.max(0, v);
  const m = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${String(m).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`;
}

export function parseSingleSegment(raw: string): ParsedSegment | null {
  const trimmed = raw.trim();
  let dashIdx = -1;
  for (let i = 1; i < trimmed.length; i++) {
    if (trimmed[i] === "-") {
      dashIdx = i;
      break;
    }
  }
  if (dashIdx === -1) return null;
  const rawStart = trimmed.slice(0, dashIdx).trim();
  const rawEnd = trimmed.slice(dashIdx + 1).trim();
  if (!rawStart || !rawEnd) return null;
  const isTimeLike = rawStart.includes(":") || rawEnd.includes(":");
  const start = parseTimeToSeconds(rawStart);
  const end = parseTimeToSeconds(rawEnd);
  if (start === null || end === null) return null;
  return {
    kind: isTimeLike ? "time" : "index",
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function parseEditableSegments(range: string): ParsedSegment[] {
  return range
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseSingleSegment)
    .filter((s): s is ParsedSegment => s !== null);
}

export function serializeSegment(seg: ParsedSegment): string {
  if (seg.kind === "time")
    return `${formatSeconds(seg.start)}-${formatSeconds(seg.end)}`;
  return `${Math.round(seg.start)}-${Math.round(seg.end)}`;
}

const RANGE_FIELD_NAMES = new Set([
  "range",
  "ranges",
  "rangestring",
  "timerange",
  "rangestr",
  "timerangestring",
]);

export function isRangeLikeName(name: string): boolean {
  const n = name.toLowerCase().replace(/[-_]/g, "");
  return (
    RANGE_FIELD_NAMES.has(n) ||
    n.endsWith("range") ||
    n.endsWith("ranges") ||
    n.startsWith("rangestr")
  );
}

export function collectRawRanges(
  input: unknown,
  path = "",
  fieldName = "",
): RawRange[] {
  if (Array.isArray(input)) {
    return input.flatMap((item, i) =>
      collectRawRanges(item, `${path}[${i}]`, fieldName),
    );
  }
  if (input && typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).flatMap(([k, v]) =>
      collectRawRanges(v, path ? `${path}.${k}` : k, k),
    );
  }
  if (typeof input === "string" && input.length > 0) {
    const ref = parseReferenceRange(input);
    if (ref)
      return [
        { path, key: ref.key, range: ref.range, kind: "data-reference" },
      ];
    if (isRangeLikeName(fieldName) && parseEditableSegments(input).length > 0) {
      return [{ path, key: fieldName, range: input, kind: "plain-range" }];
    }
  }
  return [];
}

export function toTemplatePath(path: string): string {
  return path.replace(/\[\d+\]/g, "[]");
}

export function buildTrackGroups(raw: RawRange[]): TrackGroup[] {
  const groups = new Map<string, TrackGroup>();

  for (const r of raw) {
    const tp = toTemplatePath(r.path);

    if (r.kind === "data-reference") {
      const existing = groups.get(r.path);
      if (existing) {
        existing.currentRanges[0] = r.range;
      } else {
        groups.set(r.path, {
          templatePath: r.path,
          label: r.path,
          kind: "data-reference",
          key: r.key,
          concretePaths: [r.path],
          currentRanges: [r.range],
        });
      }
    } else if (r.range.includes(",")) {
      groups.set(r.path, {
        templatePath: r.path,
        label: r.path.replace(/\[\d+\]/g, "[ ]"),
        kind: "plain-range",
        key: r.key,
        concretePaths: [r.path],
        currentRanges: [r.range],
      });
    } else {
      const existing = groups.get(tp);
      if (existing) {
        existing.concretePaths.push(r.path);
        existing.currentRanges.push(r.range);
      } else {
        groups.set(tp, {
          templatePath: tp,
          label: tp.replace(/\[\]/g, "[ ]"),
          kind: "plain-range",
          key: r.key,
          concretePaths: [r.path],
          currentRanges: [r.range],
        });
      }
    }
  }

  return Array.from(groups.values());
}

export function setAtPath(
  source: any,
  path: string,
  nextValue: string | undefined,
): any {
  const tokens: string[] = [];
  path.split(".").forEach((chunk) => {
    const [head, ...rest] = chunk.split("[");
    if (head) tokens.push(head);
    rest.forEach((part) => tokens.push(part.replace("]", "")));
  });
  const clone = structuredClone(source);
  let cursor = clone;
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i]!;
    const nextToken = tokens[i + 1];
    if (cursor[token] === undefined)
      cursor[token] = /^\d+$/.test(nextToken ?? "") ? [] : {};
    cursor = cursor[token];
  }
  const lastKey = tokens[tokens.length - 1]!;
  if (nextValue === undefined) delete cursor[lastKey];
  else cursor[lastKey] = nextValue;
  return clone;
}

export function segsFromTrackGroup(group: TrackGroup): ParsedSegment[] {
  if (group.kind === "data-reference") {
    return parseEditableSegments(group.currentRanges[0] ?? "");
  }
  if (group.concretePaths.length === 1) {
    return parseEditableSegments(group.currentRanges[0] ?? "");
  }
  return group.currentRanges
    .map((r) => parseSingleSegment(r) ?? parseEditableSegments(r)[0] ?? null)
    .filter((s): s is ParsedSegment => s !== null);
}

export function applySegsToInputData(
  inputData: any,
  group: TrackGroup,
  segs: ParsedSegment[],
  changedSegIdx?: number,
): any {
  let next = structuredClone(inputData);

  if (group.kind === "data-reference") {
    const path = group.concretePaths[0]!;
    const rangeStr = segs.map(serializeSegment).join(",");
    const newVal = rangeStr
      ? `data:[${group.key}][${rangeStr}]`
      : `data:[${group.key}]`;
    return setAtPath(next, path, newVal);
  }

  if (group.concretePaths.length === 1) {
    const path = group.concretePaths[0]!;
    const rangeStr = segs.map(serializeSegment).join(",");
    return setAtPath(next, path, rangeStr || undefined);
  }

  if (changedSegIdx !== undefined) {
    const path = group.concretePaths[changedSegIdx];
    const seg = segs[changedSegIdx];
    if (path && seg) next = setAtPath(next, path, serializeSegment(seg));
    return next;
  }

  segs.forEach((seg, i) => {
    const path = group.concretePaths[i];
    if (path) next = setAtPath(next, path, serializeSegment(seg));
  });
  return next;
}
