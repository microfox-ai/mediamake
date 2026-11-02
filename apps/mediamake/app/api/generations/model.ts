import { getDatabase } from '@/lib/mongodb';
import type { GenerationDoc, GenerationPresetDoc } from '@/lib/generations/db';

// Indexes are created once per server process; a failed attempt is retried on the next call.
let generationIndexes: Promise<unknown> | undefined;
let presetIndexes: Promise<unknown> | undefined;

export async function getGenerationsCollection() {
  const db = await getDatabase();
  const collection = db.collection<GenerationDoc>('generations');

  generationIndexes ??= collection
    .createIndexes([
      { key: { tool: 1, ref: 1 }, name: 'generations_by_tool_ref', unique: true },
      { key: { projectId: 1, createdAt: -1 }, name: 'generations_by_project_createdAt' },
      // Whole words in any language: no stemming or stop words.
      { key: { title: 'text', styles: 'text', lyrics: 'text' }, name: 'generations_text', default_language: 'none' },
    ])
    .catch(error => {
      generationIndexes = undefined;
      throw error;
    });
  await generationIndexes;

  return collection;
}

export async function getGenerationPresetsCollection() {
  const db = await getDatabase();
  const collection = db.collection<GenerationPresetDoc>('generationPresets');

  presetIndexes ??= collection
    .createIndexes([{ key: { projectId: 1, tool: 1, name: 1 }, name: 'generation_presets_by_project_tool_name', unique: true }])
    .catch(error => {
      presetIndexes = undefined;
      throw error;
    });
  await presetIndexes;

  return collection;
}
