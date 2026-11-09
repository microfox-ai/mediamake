/** Types for scripts/generated.mjs (the studio's built files: the mediamake presets). */
export const PRESETS_OUT: string[];
export const PRESETS_INPUTS: string;
export function sha(file: string): string;
export function presetsStale(app?: string): string | null;
export function ensurePresets(app?: string, opts?: { soft?: boolean; quiet?: boolean }): { built: boolean; why?: string; failed?: boolean };
