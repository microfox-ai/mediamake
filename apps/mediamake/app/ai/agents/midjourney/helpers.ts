import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface MidjourneyPromptRecord {
  _id?: ObjectId;
  title?: string | null;
  prompts: Array<{
    shotIndex?: number;
    captionIndex?: number;
    shotDescription?: string;
    captionText?: string;
    prompt: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  inputParams: Record<string, any>;
  tags: string[];
  isGenerated: boolean;
  generationProgress: number;
  generatedIndexes: number[];
}

/**
 * Saves generated prompts array to the database
 * @param prompts - Array of generated prompts
 * @param inputParams - Input parameters used to generate the prompts (JSON)
 * @param tags - Array of tags for querying (optional)
 * @param title - Optional title for this batch (optional)
 * @returns The created record with _id
 */
export async function saveMidjourneyPrompts(
  prompts: MidjourneyPromptRecord['prompts'],
  inputParams: Record<string, any>,
  tags: string[] = [],
  title?: string | null,
): Promise<MidjourneyPromptRecord> {
  const db = await getDatabase();
  const collection = db.collection<MidjourneyPromptRecord>('midjourneyPrompts');

  const now = new Date();
  const record: Omit<MidjourneyPromptRecord, '_id'> = {
    prompts,
    title: title || null,
    createdAt: now,
    updatedAt: now,
    inputParams,
    tags: tags || [],
    isGenerated: false,
    generationProgress: 0,
    generatedIndexes: [],
  };

  const result = await collection.insertOne(record as any);
  return {
    ...record,
    _id: result.insertedId,
  };
}

/**
 * Updates the generation progress for a prompt record
 * @param _id - The MongoDB _id of the record
 * @param generatedIndexes - Array of indexes that have been generated
 * @param tags - Optional array of tags to update
 * @returns The updated record
 */
export async function updateGenerationProgress(
  _id: string | ObjectId,
  generatedIndexes: number[],
  tags?: string[],
): Promise<MidjourneyPromptRecord | null> {
  const db = await getDatabase();
  const collection = db.collection<MidjourneyPromptRecord>('midjourneyPrompts');

  const objectId = typeof _id === 'string' ? new ObjectId(_id) : _id;

  // Get the current record to calculate progress
  const currentRecord = await collection.findOne({ _id: objectId });
  if (!currentRecord) {
    throw new Error(`Record with _id ${_id} not found`);
  }

  const totalPrompts = currentRecord.prompts.length;
  const uniqueGeneratedIndexes = Array.from(new Set(generatedIndexes));
  const generationProgress =
    totalPrompts > 0
      ? Math.round((uniqueGeneratedIndexes.length / totalPrompts) * 100)
      : 0;
  const isGenerated = uniqueGeneratedIndexes.length === totalPrompts;

  const updateData: any = {
    generatedIndexes: uniqueGeneratedIndexes,
    generationProgress,
    isGenerated,
    updatedAt: new Date(),
  };

  // Update tags if provided
  if (tags !== undefined) {
    updateData.tags = tags;
  }

  await collection.updateOne(
    { _id: objectId },
    {
      $set: updateData,
    },
  );

  // Fetch the updated record
  const updatedRecord = await collection.findOne({ _id: objectId });
  return updatedRecord;
}

/**
 * Gets a prompt record by _id
 * @param _id - The MongoDB _id of the record
 * @returns The record or null if not found
 */
export async function getMidjourneyPromptRecord(
  _id: string | ObjectId,
): Promise<MidjourneyPromptRecord | null> {
  const db = await getDatabase();
  const collection = db.collection<MidjourneyPromptRecord>('midjourneyPrompts');

  const objectId = typeof _id === 'string' ? new ObjectId(_id) : _id;
  return await collection.findOne({ _id: objectId });
}
