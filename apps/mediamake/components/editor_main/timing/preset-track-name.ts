/**
 * A preset's name is its track name. Older timelines stored a separate
 * `label`; that value is only a fallback when `presetInputData.trackName` is empty.
 */

export function inputTrackName(input: unknown): string {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "";
  const name = (input as Record<string, unknown>).trackName;
  return typeof name === "string" ? name.trim() : "";
}

export function presetTrackName(
  preset:
    | {
        label?: string;
        presetId?: string;
        presetInputData?: unknown;
      }
    | null
    | undefined,
  fallback = "",
): string {
  const fromInput = inputTrackName(preset?.presetInputData);
  if (fromInput) return fromInput;
  if (typeof preset?.label === "string" && preset.label.trim()) return preset.label.trim();
  if (preset?.presetId) return preset.presetId;
  return fallback;
}

export function withTrackName(input: unknown, trackName: string): Record<string, unknown> {
  const next =
    input && typeof input === "object" && !Array.isArray(input)
      ? { ...(input as Record<string, unknown>) }
      : {};
  next.trackName = trackName;
  return next;
}

function takenTrackNames(
  presets: Array<{ label?: string; presetId?: string; presetInputData?: unknown }>,
): Set<string> {
  const taken = new Set<string>();
  for (const preset of presets) {
    const name = presetTrackName(preset);
    if (name) taken.add(name);
  }
  return taken;
}

/** First free name. `base` is kept when nothing else uses it; otherwise `base-2`, `base-3`, … */
export function uniqueTrackName(
  presets: Array<{ label?: string; presetId?: string; presetInputData?: unknown }>,
  base: string,
): string {
  const taken = takenTrackNames(presets);
  const root = base.trim() || "track";
  if (!taken.has(root)) return root;
  let index = 2;
  while (taken.has(`${root}-${index}`)) index += 1;
  return `${root}-${index}`;
}

/** Copy suffix that stays unique among the presets already on the timeline. */
export function copyTrackName(
  presets: Array<{ label?: string; presetId?: string; presetInputData?: unknown }>,
  sourceName: string,
): string {
  const taken = takenTrackNames(presets);
  const root = sourceName.trim() || "track";
  let name = `${root} (Copy)`;
  let index = 2;
  while (taken.has(name)) {
    name = `${root} (Copy ${index})`;
    index += 1;
  }
  return name;
}

/** Slug used when a preset schema has no default track name. */
export function defaultTrackName(title: string | undefined, presetId: string): string {
  const slug = (title ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || presetId || "track";
}
