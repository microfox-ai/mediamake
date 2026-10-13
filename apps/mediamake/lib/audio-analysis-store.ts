/**
 * Mongo collection for analyze-audio results.
 * The worker (and the local API runner) write the full frame list here and
 * return only `analysisId` on the job, so status polls stay small.
 */

import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "./mongodb";
import type {
  AudioAnalysisFrame,
  AudioAnalysisSummary,
} from "./audio-analysis-types";

export const AUDIO_ANALYSES_COLLECTION = "audioAnalyses";

export interface AudioAnalysisRecord {
  _id: ObjectId;
  audioSrc: string;
  durationInSeconds: number;
  summary: AudioAnalysisSummary;
  analysis: AudioAnalysisFrame[];
  frameCount: number;
  sampleRate?: number;
  source: "worker" | "browser";
  createdAt: Date;
}

let indexReady: Promise<void> | null = null;

async function ensureIndexes(db: Db) {
  if (!indexReady) {
    indexReady = db
      .collection(AUDIO_ANALYSES_COLLECTION)
      .createIndex({ audioSrc: 1, createdAt: -1 })
      .then(() => undefined)
      .catch((err) => {
        indexReady = null;
        console.warn("[audioAnalyses] index create failed", err);
      });
  }
  await indexReady;
}

export async function saveAudioAnalysis(doc: {
  audioSrc: string;
  durationInSeconds: number;
  summary: AudioAnalysisSummary;
  analysis: AudioAnalysisFrame[];
  sampleRate?: number;
  source: "worker" | "browser";
}): Promise<string> {
  const db = await getDatabase();
  await ensureIndexes(db);
  const _id = new ObjectId();
  await db.collection(AUDIO_ANALYSES_COLLECTION).insertOne({
    _id,
    audioSrc: doc.audioSrc,
    durationInSeconds: doc.durationInSeconds,
    summary: doc.summary,
    analysis: doc.analysis,
    frameCount: doc.analysis.length,
    sampleRate: doc.sampleRate,
    source: doc.source,
    createdAt: new Date(),
  });
  return _id.toHexString();
}

export async function getAudioAnalysis(
  id: string,
): Promise<AudioAnalysisRecord | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDatabase();
  const doc = await db
    .collection(AUDIO_ANALYSES_COLLECTION)
    .findOne({ _id: new ObjectId(id) });
  return (doc as AudioAnalysisRecord | null) ?? null;
}

/** Latest non-empty analysis for this URL, if one was stored before. */
export async function findLatestAudioAnalysis(
  audioSrc: string,
): Promise<AudioAnalysisRecord | null> {
  const db = await getDatabase();
  const doc = await db
    .collection(AUDIO_ANALYSES_COLLECTION)
    .find({ audioSrc, frameCount: { $gt: 0 } })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  return (doc as AudioAnalysisRecord | null) ?? null;
}

export function toAudioAnalysisClientJson(doc: AudioAnalysisRecord) {
  const id = doc._id.toHexString();
  return {
    id,
    analysisId: id,
    audioSrc: doc.audioSrc,
    durationInSeconds: doc.durationInSeconds,
    summary: doc.summary,
    analysis: doc.analysis,
    frameCount: doc.frameCount ?? doc.analysis?.length ?? 0,
    sampleRate: doc.sampleRate,
    source: doc.source,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

/** Slim fields safe to put on a worker job (no frame list). */
export function toAudioAnalysisJobOutput(doc: AudioAnalysisRecord) {
  const id = doc._id.toHexString();
  return {
    analysisId: id,
    durationInSeconds: doc.durationInSeconds,
    frameCount: doc.frameCount ?? doc.analysis?.length ?? 0,
    summary: doc.summary,
    cached: true as const,
  };
}
