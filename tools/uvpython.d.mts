/** Types for tools/uvpython.mjs, which apps/studio/scripts/thumbs.ts imports. */
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
