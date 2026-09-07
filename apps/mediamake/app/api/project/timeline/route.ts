import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { DatabasePreset, Preset } from '@/components/editor/presets/types';

interface TimelinePreset {
  id: string;
  label: string;
  presetId: string;
  presetType: string;
  presetInfo?: Preset | DatabasePreset;
  presetInputData?: any;
  disabled?: boolean;
}

interface TimelineDocument {
  _id?: ObjectId;
  clientId?: string;
  projectId: string;
  displayName: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  configuration?: any;
  defaultData?: any;
  presets?: TimelinePreset[];
  /** Monotonically incrementing counter — used for optimistic locking on publish. */
  version?: number;
  /** clientId of the last user who published this timeline. */
  lastClientId?: string;
}

type ProjectRole = 'owner' | 'editor' | 'viewer';

// Returns the role of `clientId` on the given project, or null if no access.
async function getProjectRole(db: any, projectId: string, clientId: string): Promise<ProjectRole | null> {
  try {
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) return null;
    if (project.clientId === clientId) return 'owner';
    const member = (project.sharedWith ?? []).find((m: any) => m.clientId === clientId);
    return (member?.role as ProjectRole) ?? null;
  } catch {
    return null;
  }
}

function mapTimeline(d: any) {
  return {
    id: d._id.toString(),
    projectId: d.projectId,
    displayName: d.displayName,
    description: d.description,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    configuration: d.configuration,
    defaultData: d.defaultData,
    presets: d.presets,
    version: d.version ?? 0,
    lastClientId: d.lastClientId ?? 'unknown',
  };
}

// Helper to convert presetId to readable label with count
function formatPresetLabel(presetId: string, count: number): string {
  const words = presetId
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .filter(word => word.length > 0);
  const label = words.join(' ');
  return count > 1 ? `${label} (${count})` : label;
}

// GET /api/project/timeline
// - With ?projectId=...: return all timelines for a project (access-checked)
// - With ?id=...: return specific timeline (access-checked via its project)
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const clientId = request.headers.get('x-client-id') || undefined;
    const collection = db.collection<TimelineDocument>('timelines');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');
    const summary = searchParams.get('summary') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Fetch a specific timeline by ID
    if (id) {
      try {
        const objectId = new ObjectId(id);
        const doc = await collection.findOne({ _id: objectId });
        if (!doc) {
          return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
        }
        // Check project-level access (clientId comes from authenticated session)
        if (clientId) {
          const role = await getProjectRole(db, doc.projectId, clientId);
          if (!role) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
          }
        }
        return NextResponse.json(mapTimeline(doc));
      } catch {
        return NextResponse.json({ error: 'Invalid timeline ID' }, { status: 400 });
      }
    }

    // List timelines for a project
    if (projectId) {
      // Verify project access before returning any timeline data
      if (clientId) {
        const role = await getProjectRole(db, projectId, clientId);
        if (!role) {
          return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
        }
      }

      const query: any = { projectId };
      if (search) {
        query.displayName = { $regex: search, $options: 'i' };
      }

      // Non-paginated full list (legacy callers that don't pass summary=true)
      if (!search && !summary) {
        const timelines = await collection.find(query).sort({ createdAt: -1 }).toArray();
        return NextResponse.json(timelines.map(mapTimeline));
      }

      // Paginated summary list
      const [timelines, total] = await Promise.all([
        collection
          .find(query, {
            projection: { displayName: 1, createdAt: 1, updatedAt: 1, description: 1, projectId: 1 },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query),
      ]);

      return NextResponse.json({
        timelines: timelines.map((d: any) => ({
          id: d._id.toString(),
          projectId: d.projectId,
          displayName: d.displayName,
          description: d.description,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // General search without projectId — scope to the requesting user's own timelines
    const query: any = {};
    if (clientId) {
      query.clientId = clientId;
    }
    if (search) {
      query.displayName = { $regex: search, $options: 'i' };
    }

    const [timelines, total] = await Promise.all([
      collection
        .find(query, {
          projection: { displayName: 1, createdAt: 1, updatedAt: 1, description: 1, projectId: 1 },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      timelines: timelines.map((d: any) => ({
        id: d._id.toString(),
        projectId: d.projectId,
        displayName: d.displayName,
        description: d.description,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching timelines:', error);
    return NextResponse.json({ error: 'Failed to fetch timelines' }, { status: 500 });
  }
}

// POST /api/project/timeline - Create new timeline
export async function POST(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id') || undefined;
    const db = await getDatabase();
    const collection = db.collection<TimelineDocument>('timelines');

    const body = await request.json();
    const { projectId, displayName, description, template, legacyId, sourceTimelineId, configuration, defaultData, presets } = body;

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project exists and user has editor-or-owner access
    const projectsCollection = db.collection('projects');
    try {
      const projectObjectId = new ObjectId(projectId);
      const project = await projectsCollection.findOne({ _id: projectObjectId });
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      if (clientId) {
        const role = await getProjectRole(db, projectId, clientId);
        if (!role || role === 'viewer') {
          return NextResponse.json({ error: 'Viewers cannot create timelines' }, { status: 403 });
        }
      }
    } catch {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Handle legacy timeline import
    if (legacyId) {
      try {
        const presetDataCollection = db.collection('presetData');
        const legacyObjectId = new ObjectId(legacyId);
        const legacyQuery: any = { _id: legacyObjectId };
        if (clientId) {
          legacyQuery.clientId = clientId;
        }
        const legacyData = await presetDataCollection.findOne(legacyQuery);

        if (!legacyData) {
          return NextResponse.json({ error: 'Legacy timeline not found' }, { status: 404 });
        }

        const presetCounts: Record<string, number> = {};
        legacyData.presetData?.presets?.forEach((preset: any) => {
          presetCounts[preset.presetId] = (presetCounts[preset.presetId] || 0) + 1;
        });

        const convertedPresets = legacyData.presetData?.presets?.map((preset: any, index: number) => {
          const count = presetCounts[preset.presetId];
          const occurrenceIndex = legacyData.presetData.presets
            .slice(0, index)
            .filter((p: any) => p.presetId === preset.presetId).length;
          return {
            id: `${preset.presetId}-${occurrenceIndex}`,
            label: formatPresetLabel(preset.presetId, count),
            presetId: preset.presetId,
            presetType: preset.presetType,
            presetInputData: preset.presetInputData,
            disabled: preset.disabled || false,
          };
        });

        const timelineDocument: Omit<TimelineDocument, '_id'> = {
          clientId,
          projectId,
          displayName: legacyData.name || displayName?.trim() || 'Imported Timeline',
          description: description?.trim() || `Imported from legacy timeline: ${legacyData.name}`,
          configuration: {},
          defaultData: legacyData.presetData?.defaultData || { references: [] },
          presets: convertedPresets || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await collection.insertOne(timelineDocument);

        console.log(`✅ API: Successfully imported legacy timeline:`, {
          timelineId: result.insertedId.toString(),
          legacyId,
          projectId,
          displayName: timelineDocument.displayName,
          numberOfPresets: convertedPresets?.length || 0,
        });

        return NextResponse.json({
          id: result.insertedId.toString(),
          projectId: timelineDocument.projectId,
          displayName: timelineDocument.displayName,
          description: timelineDocument.description,
          createdAt: timelineDocument.createdAt,
          updatedAt: timelineDocument.updatedAt,
          configuration: timelineDocument.configuration,
          defaultData: timelineDocument.defaultData,
          presets: timelineDocument.presets,
        });
      } catch (error) {
        console.error('Error importing legacy timeline:', error);
        return NextResponse.json({ error: 'Failed to import legacy timeline' }, { status: 500 });
      }
    }

    // Handle timeline duplication
    if (sourceTimelineId) {
      try {
        const sourceObjectId = new ObjectId(sourceTimelineId);
        const sourceTimeline = await collection.findOne({ _id: sourceObjectId });

        if (!sourceTimeline) {
          return NextResponse.json({ error: 'Source timeline not found' }, { status: 404 });
        }

        const timelineDocument: Omit<TimelineDocument, '_id'> = {
          clientId,
          projectId,
          displayName: displayName?.trim() || `${sourceTimeline.displayName} (Copy)`,
          description: description?.trim() || sourceTimeline.description,
          configuration: sourceTimeline.configuration,
          defaultData: sourceTimeline.defaultData,
          presets: sourceTimeline.presets,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await collection.insertOne(timelineDocument);

        console.log(`✅ API: Successfully duplicated timeline:`, {
          timelineId: result.insertedId.toString(),
          sourceTimelineId,
          projectId,
          displayName: timelineDocument.displayName,
          numberOfPresets: sourceTimeline.presets?.length || 0,
        });

        const created = await collection.findOne({ _id: result.insertedId });
        return NextResponse.json(mapTimeline(created));
      } catch (error) {
        console.error('Error duplicating timeline:', error);
        return NextResponse.json({ error: 'Failed to duplicate timeline' }, { status: 500 });
      }
    }

    // Regular timeline creation
    if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    let timelineData: Partial<TimelineDocument> = {
      projectId,
      displayName: displayName.trim(),
      description: description?.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (configuration !== undefined) {
      timelineData.configuration = configuration;
    }
    if (defaultData !== undefined) {
      timelineData.defaultData = defaultData;
    }
    if (presets !== undefined) {
      timelineData.presets = presets;
    }

    if (template === 'blank' && configuration === undefined && defaultData === undefined && presets === undefined) {
      timelineData = {
        ...timelineData,
        configuration: {
          config: { fps: 30, width: 1080, height: 1920, duration: 0, fitDurationTo: 'BaseScene' },
          style: { backgroundColor: 'black' },
        },
        defaultData: { references: [] },
        presets: [
          {
            id: `preset-${Date.now()}`,
            label: 'Base Scene',
            presetId: 'base-scene',
            presetType: 'full',
            presetInputData: {
              backgroundColor: 'black',
              fitDurationTo: 'audio-track',
              aspectRatio: '16:9',
              clip: { start: 0, duration: 0 },
              resolution: 1080,
              duration: 0,
            },
            disabled: false,
          },
        ],
      };
    }

    const document: Omit<TimelineDocument, '_id'> = {
      ...timelineData,
      clientId,
      projectId,
      displayName: timelineData.displayName || displayName.trim(),
      description: timelineData.description,
      createdAt: timelineData.createdAt || new Date(),
      updatedAt: timelineData.updatedAt || new Date(),
      configuration: timelineData.configuration,
      defaultData: timelineData.defaultData,
      presets: timelineData.presets,
    };

    const result = await collection.insertOne(document);

    console.log(`✅ API: Successfully created timeline:`, {
      timelineId: result.insertedId.toString(),
      projectId,
      displayName,
      template,
    });

    const created = await collection.findOne({ _id: result.insertedId });
    return NextResponse.json(mapTimeline(created));
  } catch (error) {
    console.error('Error creating timeline:', error);
    return NextResponse.json({ error: 'Failed to create timeline' }, { status: 500 });
  }
}

// PUT /api/project/timeline - Update timeline
export async function PUT(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id') || undefined;
    const db = await getDatabase();
    const collection = db.collection<TimelineDocument>('timelines');

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Timeline ID is required' }, { status: 400 });
    }

    try {
      const objectId = new ObjectId(id);

      // Fetch the timeline first (no clientId filter — access is project-based)
      const timeline = await collection.findOne({ _id: objectId });
      if (!timeline) {
        return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
      }

      // Verify user is owner or editor on the project
      if (clientId) {
        const role = await getProjectRole(db, timeline.projectId, clientId);
        if (!role || role === 'viewer') {
          return NextResponse.json({ error: 'Viewers cannot edit timelines' }, { status: 403 });
        }
      }

      // Optimistic locking — only enforced when the client passes a `version`.
      const storedVersion = timeline.version ?? 0;
      const clientVersion = updates.version;
      if (typeof clientVersion === 'number' && clientVersion !== storedVersion) {
        return NextResponse.json(
          {
            error: 'Version conflict: another client published this timeline after you loaded it.',
            code: 'VERSION_CONFLICT',
            currentVersion: storedVersion,
            lastClientId: timeline.lastClientId ?? 'unknown',
          },
          { status: 409 }
        );
      }

      const updateData: any = { updatedAt: new Date() };
      if (updates.displayName !== undefined) updateData.displayName = updates.displayName.trim();
      if (updates.description !== undefined) updateData.description = updates.description?.trim();
      if (updates.configuration !== undefined) updateData.configuration = updates.configuration;
      if (updates.defaultData !== undefined) updateData.defaultData = updates.defaultData;
      if (updates.presets !== undefined) updateData.presets = updates.presets;
      // Bump version + record publisher only when a version was supplied (i.e. a
      // managed publish). Legacy callers that omit `version` keep last-write-wins.
      if (typeof clientVersion === 'number') {
        updateData.version = storedVersion + 1;
        updateData.lastClientId = updates.clientId ?? clientId ?? 'unknown';
      }

      await collection.updateOne({ _id: objectId }, { $set: updateData });

      const updated = await collection.findOne({ _id: objectId });
      return NextResponse.json(mapTimeline(updated));
    } catch {
      return NextResponse.json({ error: 'Invalid timeline ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating timeline:', error);
    return NextResponse.json({ error: 'Failed to update timeline' }, { status: 500 });
  }
}

// DELETE /api/project/timeline - Delete timeline
export async function DELETE(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id') || undefined;
    const db = await getDatabase();
    const collection = db.collection<TimelineDocument>('timelines');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Timeline ID is required' }, { status: 400 });
    }

    try {
      const objectId = new ObjectId(id);

      // Fetch the timeline first (no clientId filter — access is project-based)
      const timeline = await collection.findOne({ _id: objectId });
      if (!timeline) {
        return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
      }

      // Only owner or editor can delete timelines
      if (clientId) {
        const role = await getProjectRole(db, timeline.projectId, clientId);
        if (!role || role === 'viewer') {
          return NextResponse.json({ error: 'Viewers cannot delete timelines' }, { status: 403 });
        }
      }

      const deleteResult = await collection.deleteOne({ _id: objectId });
      if (deleteResult.deletedCount === 0) {
        return NextResponse.json({ error: 'Timeline not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Timeline deleted successfully' });
    } catch {
      return NextResponse.json({ error: 'Invalid timeline ID' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error deleting timeline:', error);
    return NextResponse.json({ error: 'Failed to delete timeline' }, { status: 500 });
  }
}
