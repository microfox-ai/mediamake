
"use server";
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

const WRITING_GUIDES_PATH = path.join(
  process.cwd(),
  'components/editor/presets/presetwritingguide',
);

const GENERATION_GUIDES_PATH = path.join(
  process.cwd(),
  'components/editor/presets/presetgenerationguide',
);

const TYPES_FILE_PATH = path.join(
  process.cwd(),
  'components/editor/presets/types.ts',
);

/**
 * Read a guide file used by preset authoring/generation.
 *
 * Resolution order (non-breaking):
 * 1. Look in `presetgenerationguide` (new, generation-specific docs)
 * 2. Fallback to `presetwritingguide` (existing core docs: BASICS, LAYOUT, MEDIA, TYPOGRAPHY, etc.)
 */
export const readGuide = async (filename: string) => {
  // 1) Prefer dedicated generation guides if present
  try {
    const genPath = path.join(GENERATION_GUIDES_PATH, filename);
    const genContent = await fs.readFile(genPath, 'utf-8');
    return genContent;
  } catch {
    // ignore and fall back
  }

  // 2) Fallback to existing writing guides (legacy location)
  try {
    return await fs.readFile(path.join(WRITING_GUIDES_PATH, filename), 'utf-8');
  } catch (e) {
    console.error(`Failed to read guide ${filename}`, e);
    return '';
  }
};

/**
 * Read the main preset types file (`components/editor/presets/types.ts`),
 * returning at most `maxLines` lines to avoid huge prompts.
 */
export const readTypesFile = async (maxLines: number = 1000) => {
  try {
    const raw = await fs.readFile(TYPES_FILE_PATH, 'utf-8');
    const lines = raw.split('\n');
    return lines.slice(0, maxLines).join('\n');
  } catch (e) {
    console.error('Failed to read types.ts file', e);
    return '';
  }
};

const REGISTRY_PATH = path.join(process.cwd(), 'components/editor/presets/registry');

export const getRegistryFiles = async () => {
    try {
        return await glob('**/*.ts', { cwd: REGISTRY_PATH, ignore: ['**/index.ts'] });
    } catch (e) {
        console.error(`Failed to read registry files`, e);
        return [];
    }
}

export const readRegistryFile = async (filename: string) => {
    try {
        return await fs.readFile(path.join(REGISTRY_PATH, filename), 'utf-8');
    } catch (e) {
        console.error(`Failed to read registry file`, e);
        return '';
    }
};
