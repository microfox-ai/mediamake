/** Types for tools/uvpython.mjs, which apps/studio/scripts/thumbs.ts, amv.ts and remix.ts import. */
export type Found = { python: string; how: 'found' | 'path' | 'installed' | 'missing' };
export const STUDIO_PYTHON: string;
export function managedPythons(
  dir: string,
  version?: string,
  o?: {
    platform?: string;
    arch?: string;
    exists?: (file: string) => boolean;
    list?: (dir: string) => string[];
  },
): string[];
export function findPython(
  version?: string,
  o?: {
    install?: boolean;
    run?: (args: string[]) => { status: number | null; stdout: string };
    platform?: string;
    arch?: string;
    exists?: (file: string) => boolean;
    list?: (dir: string) => string[];
  },
): Found;
export function pythonArgs(version?: string): string[];
export function cappedPython(text: string): string | null;
export function scriptArgs(
  file: string,
  o?: {
    read?: (file: string) => string;
    run?: (args: string[]) => { status: number | null; stdout: string };
    platform?: string;
    arch?: string;
    exists?: (file: string) => boolean;
    list?: (dir: string) => string[];
  },
): string[];
export function runScript(file: string | undefined, args?: string[]): never;
