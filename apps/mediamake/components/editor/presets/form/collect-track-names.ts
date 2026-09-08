/**
 * Collect track-name strings from timeline preset input data.
 * Walks objects looking for `trackName` keys (fields annotated with
 * paramMetaTypes.trackName typically use this key).
 */
export function collectTrackNamesFromPresets(
  presets: Array<{ presetInputData?: unknown }> | undefined | null,
): string[] {
  if (!presets?.length) return [];

  const names = new Set<string>();

  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    const obj = value as Record<string, unknown>;
    if (typeof obj.trackName === "string" && obj.trackName.trim()) {
      names.add(obj.trackName.trim());
    }
    for (const child of Object.values(obj)) {
      walk(child);
    }
  };

  for (const preset of presets) {
    walk(preset.presetInputData);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

/**
 * Collect track names from the current form by scanning schema fields
 * marked with paramMetaTypes.trackName.
 */
export function collectTrackNamesFromSchemaFields(
  fields: Array<{ key: string; meta?: Record<string, unknown> }>,
  formData: Record<string, unknown> | undefined | null,
  trackNameMetaKey: string,
): string[] {
  if (!formData) return [];
  const names: string[] = [];
  for (const field of fields) {
    if (field.meta?.[trackNameMetaKey] !== true) continue;
    const val = formData[field.key];
    if (typeof val === "string" && val.trim()) {
      names.push(val.trim());
    }
  }
  return names;
}
