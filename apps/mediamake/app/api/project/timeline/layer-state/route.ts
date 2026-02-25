import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import type { LayerStateSnapshot } from "@/components/editor_main/stores/layer-state-store";

const COLLECTION = "timelineLayerState";

interface LayerStateDocument {
  _id?: string;
  projectId: string;
  timelineId: string;
  childrenData?: unknown[];
  trackStates: Record<string, unknown>;
  hiddenLayerIds: string[];
  lockedLayerIds: string[];
  updatedAt: Date;
}

/** GET /api/project/timeline/layer-state?projectId=...&timelineId=... */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const timelineId = searchParams.get("timelineId");
    if (!projectId || !timelineId) {
      return NextResponse.json(
        { error: "projectId and timelineId are required" },
        { status: 400 }
      );
    }
    const db = await getDatabase();
    const collection = db.collection<LayerStateDocument>(COLLECTION);
    const doc = await collection.findOne({ projectId, timelineId });
    if (!doc) {
      return NextResponse.json(null);
    }
    const snapshot: LayerStateSnapshot = {
      ...(Array.isArray(doc.childrenData) && doc.childrenData.length > 0
        ? { childrenData: doc.childrenData as LayerStateSnapshot["childrenData"] }
        : {}),
      trackStates: (doc.trackStates ?? {}) as LayerStateSnapshot["trackStates"],
      hiddenLayerIds: doc.hiddenLayerIds ?? [],
      lockedLayerIds: doc.lockedLayerIds ?? [],
    };
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Error fetching layer state:", error);
    return NextResponse.json(
      { error: "Failed to fetch layer state" },
      { status: 500 }
    );
  }
}

/** PUT /api/project/timeline/layer-state - body: { projectId, timelineId, ...LayerStateSnapshot }. Saves whole state. */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, timelineId, childrenData, trackStates, hiddenLayerIds, lockedLayerIds } = body;
    if (!projectId || !timelineId) {
      return NextResponse.json(
        { error: "projectId and timelineId are required" },
        { status: 400 }
      );
    }
    const db = await getDatabase();
    const collection = db.collection<LayerStateDocument>(COLLECTION);
    const doc: LayerStateDocument = {
      projectId,
      timelineId,
      ...(Array.isArray(childrenData) && childrenData.length > 0 ? { childrenData } : {}),
      trackStates: trackStates && typeof trackStates === "object" ? trackStates : {},
      hiddenLayerIds: Array.isArray(hiddenLayerIds) ? hiddenLayerIds : [],
      lockedLayerIds: Array.isArray(lockedLayerIds) ? lockedLayerIds : [],
      updatedAt: new Date(),
    };
    await collection.updateOne(
      { projectId, timelineId },
      { $set: doc },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving layer state:", error);
    return NextResponse.json(
      { error: "Failed to save layer state" },
      { status: 500 }
    );
  }
}
