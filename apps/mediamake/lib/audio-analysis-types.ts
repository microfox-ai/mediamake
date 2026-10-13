/**
 * Shared audio-analysis shapes.
 * Safe to import from the browser — no MongoDB driver.
 */

export interface AudioAnalysisFrame {
  timestamp: number;
  intensity: number;
  frequency: number;
  beatType: "low" | "mid" | "high";
  spectralCentroid?: number;
  spectralRolloff?: number;
  zeroCrossingRate?: number;
  mfcc?: number[];
}

export interface AudioAnalysisSummary {
  totalBeats: number;
  averageIntensity: number;
  lowBeats: number;
  midBeats: number;
  highBeats: number;
}

/** Document the browser receives from GET /api/audio-analyses/:id */
export interface AudioAnalysisClientDoc {
  id: string;
  analysisId: string;
  audioSrc: string;
  durationInSeconds: number;
  summary: AudioAnalysisSummary;
  analysis: AudioAnalysisFrame[];
  frameCount: number;
  sampleRate?: number;
  source: "worker" | "browser";
  createdAt?: string;
}
