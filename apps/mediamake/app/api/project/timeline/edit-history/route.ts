import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getClientId } from "@/lib/auth-utils";
import { getProjectRole, canWrite } from "@/lib/editor/project-access";

const COLLECTION = "timelineEditHistory";

/**
 * GET /api/project/timeline/edit-history?projectId=...&timelineId=...&limit=...
 * Returns append-only timeline publish audit entries, newest first.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const timelineId = searchParams.get("timelineId");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
    const before = searchParams.get("before");

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
    console.error("Error fetching timeline edit history:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline edit history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/project/timeline/edit-history
 * Appends one audit entry per publish. Idempotent (upsert on entryId).
 * Body: { projectId, timelineId, clientId, entryId, timestamp, description, changes }
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
          // Full published timeline — enables team preview / revert to old states.
          ...(snapshot && typeof snapshot === "object" ? { snapshot } : {}),
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving timeline edit history entry:", error);
    return NextResponse.json(
      { error: "Failed to save timeline edit history entry" },
      { status: 500 }
    );
  }
}
