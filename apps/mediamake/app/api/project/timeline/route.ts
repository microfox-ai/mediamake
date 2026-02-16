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
}

// GET /api/project/timeline
// - With ?projectId=...: return all timelines for a project
// - With ?id=...: return specific timeline
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const clientId = request.headers.get('x-client-id') || undefined;
    const collection = db.collection<TimelineDocument>('timelines');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const projectId = searchParams.get('projectId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // If id is provided, return the specific timeline
    if (id) {
      try {
        const objectId = new ObjectId(id);
        const query: any = { _id: objectId };
        if (clientId) {
          query.clientId = clientId;
        }
        const doc = await collection.findOne(query);
        if (!doc) {
          return NextResponse.json(
            { error: 'Timeline not found' },
            { status: 404 },
          );
        }
        return NextResponse.json({
          id: doc._id?.toString(),
          projectId: doc.projectId,
          displayName: doc.displayName,
          description: doc.description,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          configuration: doc.configuration,
          defaultData: doc.defaultData,
          presets: doc.presets,
        });
      } catch {
        return NextResponse.json(
          { error: 'Invalid timeline ID' },
          { status: 400 },
        );
      }
    }

    // Build query for search/list
    const query: any = {};
    if (clientId) {
      query.clientId = clientId;
    }
    if (projectId) {
      query.projectId = projectId;
    }
    if (search) {
      query.displayName = { $regex: search, $options: 'i' };
    }

    // If projectId is provided, return all timelines for that project
    if (projectId && !search) {
      const timelines = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      const response = timelines.map((d: any) => ({
        id: d._id.toString(),
        projectId: d.projectId,
        displayName: d.displayName,
        description: d.description,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        configuration: d.configuration,
        defaultData: d.defaultData,
        presets: d.presets,
      }));

      return NextResponse.json(response);
    }

    // Search/list mode with pagination
    const [timelines, total] = await Promise.all([
      collection
        .find(query, { projection: { displayName: 1, createdAt: 1, updatedAt: 1, description: 1 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    const response = {
      timelines: timelines.map((d: any) => ({
        id: d._id.toString(),
        displayName: d.displayName,
        description: d.description,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching timelines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timelines' },
      { status: 500 },
    );
  }
}

// Helper to convert presetId to readable label with count
function formatPresetLabel(presetId: string, count: number): string {
  // Convert camelCase/kebab-case to Title Case
  const words = presetId
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .filter(word => word.length > 0);
  
  const label = words.join(' ');
  return count > 1 ? `${label} (${count})` : label;
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
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 },
      );
    }

    // Verify project exists
    const projectsCollection = db.collection('projects');
    try {
      const projectObjectId = new ObjectId(projectId);
      const project = await projectsCollection.findOne({ _id: projectObjectId });
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 },
      );
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
          return NextResponse.json(
            { error: 'Legacy timeline not found' },
            { status: 404 },
          );
        }

        // Convert legacy preset-data to new timeline format
        const presetCounts: Record<string, number> = {};
        legacyData.presetData?.presets?.forEach((preset: any) => {
          presetCounts[preset.presetId] = (presetCounts[preset.presetId] || 0) + 1;
        });

        const convertedPresets = legacyData.presetData?.presets?.map((preset: any, index: number) => {
          const count = presetCounts[preset.presetId];
          // Find the occurrence index (0-based) for this presetId
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
          legacyId: legacyId,
          projectId: projectId,
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
        return NextResponse.json(
          { error: 'Failed to import legacy timeline' },
          { status: 500 },
        );
      }
    }

    // Handle timeline duplication (copy from existing timeline)
    if (sourceTimelineId) {
      try {
        const sourceObjectId = new ObjectId(sourceTimelineId);
        const sourceQuery: any = { _id: sourceObjectId };
        if (clientId) {
          sourceQuery.clientId = clientId;
        }
        const sourceTimeline = await collection.findOne(sourceQuery);
        
        if (!sourceTimeline) {
          return NextResponse.json(
            { error: 'Source timeline not found' },
            { status: 404 },
          );
        }

        // Copy all data from source timeline
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
          sourceTimelineId: sourceTimelineId,
          projectId: projectId,
          displayName: timelineDocument.displayName,
          numberOfPresets: sourceTimeline.presets?.length || 0,
        });

        const created = await collection.findOne({ _id: result.insertedId });
        return NextResponse.json({
          id: created?._id?.toString(),
          projectId: created?.projectId,
          displayName: created?.displayName,
          description: created?.description,
          createdAt: created?.createdAt,
          updatedAt: created?.updatedAt,
          configuration: created?.configuration,
          defaultData: created?.defaultData,
          presets: created?.presets,
        });
      } catch (error) {
        console.error('Error duplicating timeline:', error);
        return NextResponse.json(
          { error: 'Failed to duplicate timeline' },
          { status: 500 },
        );
      }
    }

    // Regular timeline creation
    if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 },
      );
    }

    // Get template data
    let timelineData: Partial<TimelineDocument> = {
      projectId,
      displayName: displayName.trim(),
      description: description?.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If configuration, defaultData, or presets are provided in the body (for duplication/import),
    // use them instead of template defaults
    if (configuration !== undefined) {
      timelineData.configuration = configuration;
    }
    if (defaultData !== undefined) {
      timelineData.defaultData = defaultData;
    }
    if (presets !== undefined) {
      timelineData.presets = presets;
    }

    // Apply template only if no data was provided (i.e., creating a new blank timeline)
    if (template === 'blank' && configuration === undefined && defaultData === undefined && presets === undefined) {
      timelineData = {
        ...timelineData,
        configuration: {
          config: {
            fps: 30,
            width: 1080,
            height: 1920,
            duration: 0,
            fitDurationTo: 'BaseScene',
          },
          style: {
            backgroundColor: 'black',
          },
        },
        defaultData: {
          references: [],
        },
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
              clip: {
                start: 0,
                duration: 0,
              },
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
      projectId: projectId,
      displayName: displayName,
      template: template,
    });

    const created = await collection.findOne({ _id: result.insertedId });
    return NextResponse.json({
      id: created?._id?.toString(),
      projectId: created?.projectId,
      displayName: created?.displayName,
      description: created?.description,
      createdAt: created?.createdAt,
      updatedAt: created?.updatedAt,
      configuration: created?.configuration,
      defaultData: created?.defaultData,
      presets: created?.presets,
    });
  } catch (error) {
    console.error('Error creating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to create timeline' },
      { status: 500 },
    );
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
      return NextResponse.json(
        { error: 'Timeline ID is required' },
        { status: 400 },
      );
    }

    try {
      const objectId = new ObjectId(id);
      const query: any = { _id: objectId };
      if (clientId) {
        query.clientId = clientId;
      }
      
      // Remove undefined fields and prepare update
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.displayName !== undefined) {
        updateData.displayName = updates.displayName.trim();
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description?.trim();
      }
      if (updates.configuration !== undefined) {
        updateData.configuration = updates.configuration;
      }
      if (updates.defaultData !== undefined) {
        updateData.defaultData = updates.defaultData;
      }
      if (updates.presets !== undefined) {
        updateData.presets = updates.presets;
      }

      const updateResult = await collection.updateOne(
        query,
        { $set: updateData },
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Timeline not found' },
          { status: 404 },
        );
      }

      const updated = await collection.findOne({ _id: objectId });
      return NextResponse.json({
        id: updated?._id?.toString(),
        projectId: updated?.projectId,
        displayName: updated?.displayName,
        description: updated?.description,
        createdAt: updated?.createdAt,
        updatedAt: updated?.updatedAt,
        configuration: updated?.configuration,
        defaultData: updated?.defaultData,
        presets: updated?.presets,
      });
    } catch {
      return NextResponse.json(
        { error: 'Invalid timeline ID' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error updating timeline:', error);
    return NextResponse.json(
      { error: 'Failed to update timeline' },
      { status: 500 },
    );
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
      return NextResponse.json(
        { error: 'Timeline ID is required' },
        { status: 400 },
      );
    }

    try {
      const objectId = new ObjectId(id);
      const query: any = { _id: objectId };
      if (clientId) {
        query.clientId = clientId;
      }
      const deleteResult = await collection.deleteOne(query);

      if (deleteResult.deletedCount === 0) {
        return NextResponse.json(
          { error: 'Timeline not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({ message: 'Timeline deleted successfully' });
    } catch {
      return NextResponse.json(
        { error: 'Invalid timeline ID' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error deleting timeline:', error);
    return NextResponse.json(
      { error: 'Failed to delete timeline' },
      { status: 500 },
    );
  }
}
