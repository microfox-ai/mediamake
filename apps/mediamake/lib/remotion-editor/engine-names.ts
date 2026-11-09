/**
 * The studio's engine by name, as the editor compiles it: what `@mediamake/engine` and
 * `@mediamake/engine/<name>/…` mean, from the studio's engine.json. The same rule as
 * apps/studio/scripts/engine.ts (engineTarget), which its tests check.
 */
export const ENGINE = '@mediamake/engine';

export type EngineNames = { entry: string; names: Record<string, string> };

/** engine.json's text → its names, or null (a studio from before them, or not engine.json). */
export const parseEngineNames = (text: string | null | undefined): EngineNames | null => {
  try {
    const t = text ? (JSON.parse(text) as Partial<EngineNames> & { name?: string }) : null;
    return t?.name === ENGINE && typeof t.entry === 'string' && t.names && typeof t.names === 'object'
      ? { entry: t.entry, names: t.names }
      : null;
  } catch {
    return null;
  }
};

export const isEngineImport = (spec: string) => spec === ENGINE || spec.startsWith(`${ENGINE}/`);

/** What an import of the engine by name means, as a path in the studio before extensions are tried, or null. */
export const engineTarget = (spec: string, engine: EngineNames | null): string | null => {
  if (!engine) return null;
  if (spec === ENGINE) return engine.entry;
  if (!spec.startsWith(`${ENGINE}/`)) return null;
  const [name, ...rest] = spec.slice(ENGINE.length + 1).split('/');
  const dir = engine.names[name];
  return dir === undefined ? null : [dir, ...rest].filter(Boolean).join('/');
};
