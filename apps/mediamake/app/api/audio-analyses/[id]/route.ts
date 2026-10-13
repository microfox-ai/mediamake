/**
 * GET /api/audio-analyses/:id
 *
 * Loads one stored audio-analysis document. The analyze-audio worker returns
 * only this id; the frame list is read here.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAudioAnalysis,
  toAudioAnalysisClientJson,
} from "@/lib/audio-analysis-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const doc = await getAudioAnalysis(id);
    if (!doc) {
      return NextResponse.json(
        { error: "Audio analysis not found" },
        { status: 404 },
      );
    }
    const response = NextResponse.json(toAudioAnalysisClientJson(doc));
    response.headers.set("Cache-Control", "private, max-age=86400");
    return response;
  } catch (error: any) {
    console.error("[audio-analyses] GET failed:", error);
    return NextResponse.json(
      {
        error: "Failed to load audio analysis",
        message: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
