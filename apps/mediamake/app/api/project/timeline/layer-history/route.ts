import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getClientId } from "@/lib/auth-utils";
import { getProjectRole, canWrite } from "@/lib/editor/project-access";

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

    const clientId = getClientId(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();

    // History is project-scoped: any role on the project may read it.
    const role = await getProjectRole(db, projectId, clientId);
    if (!role) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 403 }
      );
    }

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
    const { projectId, timelineId, entryId, timestamp, description, changes, snapshot } = body;

    if (!projectId || !timelineId || !entryId) {
      return NextResponse.json(
        { error: "projectId, timelineId, and entryId are required" },
        { status: 400 }
      );
    }

    // Attribution comes from the session, never from the request body.
    const clientId = getClientId(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();

    const role = await getProjectRole(db, projectId, clientId);
    if (!canWrite(role)) {
      return NextResponse.json(
        { error: "Viewers cannot write history entries" },
        { status: 403 }
      );
    }

    const collection = db.collection(COLLECTION);

    // Upsert by entryId → idempotent if client retries after a network hiccup
    await collection.updateOne(
      { entryId, projectId, timelineId },
      {
        $set: {
          projectId,
          timelineId,
          clientId,
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
