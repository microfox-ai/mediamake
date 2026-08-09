import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

const COLLECTION = "timelineLayerHistory";

/**
 * GET /api/project/timeline/layer-history
 * Query params: projectId, timelineId, limit (max 200, default 50), before (timestamp cursor)
 * Returns entries sorted newest-first.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const timelineId = searchParams.get("timelineId");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
    const before = searchParams.get("before"); // timestamp cursor for pagination

    if (!projectId || !timelineId) {
      return NextResponse.json(
        { error: "projectId and timelineId are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    const filter: Record<string, unknown> = { projectId, timelineId };
    if (before) {
      const beforeTs = Number(before);
      if (!isNaN(beforeTs)) filter.timestamp = { $lt: beforeTs };
    }

    const docs = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(docs);
  } catch (error) {
    console.error("Error fetching layer history:", error);
    return NextResponse.json(
      { error: "Failed to fetch layer history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project/timeline/layer-history
 * Appends one history entry. Idempotent — upserts on entryId so retries are safe.
 * Body: { projectId, timelineId, clientId, entryId, timestamp, description, changes }
 * NOTE: snapshots are NOT stored here (too large). DB history is an audit trail only.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, timelineId, clientId, entryId, timestamp, description, changes, snapshot } = body;

    if (!projectId || !timelineId || !entryId) {
      return NextResponse.json(
        { error: "projectId, timelineId, and entryId are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection(COLLECTION);

    // Upsert by entryId → idempotent if client retries after a network hiccup
    await collection.updateOne(
      { entryId },
      {
        $set: {
          projectId,
          timelineId,
          clientId: typeof clientId === "string" && clientId ? clientId : "unknown",
          entryId,
          timestamp: typeof timestamp === "number" ? timestamp : Date.now(),
          description: typeof description === "string" ? description : "",
          changes: Array.isArray(changes) ? changes : [],
          // Full state at this publish — enables team preview / revert to old states.
          ...(snapshot && typeof snapshot === "object" ? { snapshot } : {}),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving layer history entry:", error);
    return NextResponse.json(
      { error: "Failed to save layer history entry" },
      { status: 500 }
    );
  }
}
