import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import type { LayerStateSnapshot } from "@/components/editor_main/stores/layer-state-store";

const COLLECTION = "timelineLayerState";

interface LayerStateDocument {
  _id?: string;
  projectId: string;
  timelineId: string;
  /** Layer structure only (no baked overrides). */
  childrenData?: unknown[];
  /** Serialized override map, applied over the live timeline output at render. */
  overrides?: [string, unknown][];
  trackStates: Record<string, unknown>;
  hiddenLayerIds: string[];
  lockedLayerIds: string[];
  updatedAt: Date;
  /** Monotonically incrementing counter — used for optimistic locking. */
  version: number;
  /** clientId of the last user who successfully saved. */
  lastClientId: string;
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
    const snapshot: LayerStateSnapshot & { version: number; lastClientId: string } = {
      ...(Array.isArray(doc.childrenData) && doc.childrenData.length > 0
        ? { childrenData: doc.childrenData as LayerStateSnapshot["childrenData"] }
        : {}),
      // Return overrides only when present so legacy (baked) docs stay legacy.
      ...(Array.isArray(doc.overrides)
        ? { overrides: doc.overrides as LayerStateSnapshot["overrides"] }
        : {}),
      trackStates: (doc.trackStates ?? {}) as LayerStateSnapshot["trackStates"],
      hiddenLayerIds: doc.hiddenLayerIds ?? [],
      lockedLayerIds: doc.lockedLayerIds ?? [],
      version: doc.version ?? 0,
      lastClientId: doc.lastClientId ?? "unknown",
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

/**
 * PUT /api/project/timeline/layer-state
 * Body: { projectId, timelineId, version?, clientId?, ...LayerStateSnapshot }
 *
 * Optimistic locking:
 *   - If `version` is provided and a document already exists, the stored version
 *     must match. If it doesn't, returns 409 with `currentVersion` and `lastClientId`
 *     so the client can tell the user who saved it last.
 *   - On success, the stored version is incremented by 1 and returned.
 *   - First-time saves (no existing document) always succeed regardless of `version`.
 */
export async function PUT(request: NextRequest) {
  try {
    const requestClientId = request.headers.get("x-client-id") || undefined;
    const body = await request.json();
    const {
      projectId,
      timelineId,
      childrenData,
      overrides,
      trackStates,
      hiddenLayerIds,
      lockedLayerIds,
      version: clientVersion,
      clientId,
    } = body;

    if (!projectId || !timelineId) {
      return NextResponse.json(
        { error: "projectId and timelineId are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Block viewers from publishing layer state
    if (requestClientId) {
      try {
        const project = await db.collection("projects").findOne({ _id: new ObjectId(projectId) });
        if (project) {
          const isOwner = project.clientId === requestClientId;
          const member = (project.sharedWith ?? []).find((m: any) => m.clientId === requestClientId);
          const canWrite = isOwner || member?.role === "editor";
          if (!canWrite) {
            return NextResponse.json(
              { error: "Viewers cannot publish layer state" },
              { status: 403 }
            );
          }
        }
      } catch {
        // invalid projectId — fall through and let the upsert fail naturally
      }
    }

    const collection = db.collection<LayerStateDocument>(COLLECTION);

    // Read current document to check version
    const existing = await collection.findOne(
      { projectId, timelineId },
      { projection: { version: 1, lastClientId: 1 } }
    );

    const storedVersion = existing?.version ?? 0;

    // Optimistic lock check — only applies when a document already exists
    if (existing && typeof clientVersion === "number" && clientVersion !== storedVersion) {
      return NextResponse.json(
        {
          error: "Version conflict: another client saved this layer state after you loaded it.",
          code: "VERSION_CONFLICT",
          currentVersion: storedVersion,
          lastClientId: existing.lastClientId ?? "unknown",
        },
        { status: 409 }
      );
    }

    const newVersion = storedVersion + 1;

    const doc: LayerStateDocument = {
      projectId,
      timelineId,
      ...(Array.isArray(childrenData) && childrenData.length > 0 ? { childrenData } : {}),
      // Always persist overrides (even empty) so this save is recognised as the
      // new non-baked format on the next load.
      overrides: Array.isArray(overrides) ? overrides : [],
      trackStates: trackStates && typeof trackStates === "object" ? trackStates : {},
      hiddenLayerIds: Array.isArray(hiddenLayerIds) ? hiddenLayerIds : [],
      lockedLayerIds: Array.isArray(lockedLayerIds) ? lockedLayerIds : [],
      updatedAt: new Date(),
      version: newVersion,
      lastClientId: typeof clientId === "string" && clientId ? clientId : "unknown",
    };

    await collection.updateOne(
      { projectId, timelineId },
      { $set: doc },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, version: newVersion });
  } catch (error) {
    console.error("Error saving layer state:", error);
    return NextResponse.json(
      { error: "Failed to save layer state" },
      { status: 500 }
    );
  }
}
