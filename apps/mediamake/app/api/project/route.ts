import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

interface ProjectDocument {
  _id?: ObjectId;
  clientId?: string;
  displayName: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/project
// - With ?id=...: return specific project
// - With ?search=...&tag=...&page=...&limit=...: return paginated projects with search and tag filter
// - Without query: return all projects (metadata only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const tag = searchParams.get('tag');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  try {
    const db = await getDatabase();
    const clientId = request.headers.get('x-client-id') || undefined;
    const collection = db.collection<ProjectDocument>('projects');

    const id = searchParams.get('id');
    const skip = (page - 1) * limit;

    // If id is provided, return the specific project
    if (id) {
      try {
        const objectId = new ObjectId(id);
        const doc = await collection.findOne({
          _id: objectId,
          ...(clientId ? { clientId } : {}),
        });
        if (!doc) {
          return NextResponse.json(
            { error: 'Project not found' },
            { status: 404 },
          );
        }
        return NextResponse.json({
          id: doc._id?.toString(),
          displayName: doc.displayName,
          tags: doc.tags || [],
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
      } catch {
        return NextResponse.json(
          { error: 'Invalid project ID' },
          { status: 400 },
        );
      }
    }

    // Build query for search/list
    const query: any = {};
    if (clientId) {
      query.clientId = clientId;
    }
    if (search) {
      query.displayName = { $regex: search, $options: 'i' };
    }
    if (tag) {
      query.tags = tag; // MongoDB will match if tag exists in the tags array
    }

    // If search or tag is provided, return paginated results
    if (search || tag) {
      const [projects, total] = await Promise.all([
        collection
          .find(query, { projection: { displayName: 1, tags: 1, createdAt: 1, updatedAt: 1 } })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query),
      ]);

      const response = {
        projects: projects.map((d: any) => ({
          id: d._id.toString(),
          displayName: d.displayName,
          tags: d.tags || [],
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
    }

    // Otherwise, return all projects
    const projects = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const response = projects.map((d: any) => ({
      id: d._id.toString(),
      displayName: d.displayName,
      tags: d.tags || [],
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching projects:', error);
    const message = error instanceof Error ? error.message : String(error);
    const isDbConnectivityIssue =
      message.includes('ECONNREFUSED') ||
      message.includes('querySrv') ||
      message.includes('ENOTFOUND');

    if (isDbConnectivityIssue) {
      if (search || tag) {
        return NextResponse.json({
          projects: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
      return NextResponse.json([]);
    }

    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 },
    );
  }
}

// POST /api/project - Create new project
export async function POST(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id') || undefined;
    const db = await getDatabase();
    const collection = db.collection<ProjectDocument>('projects');

    const body = await request.json();
    const { displayName, tags } = body;

    if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 },
      );
    }

    const document: Omit<ProjectDocument, '_id'> = {
      clientId,
      displayName: displayName.trim(),
      tags: Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string' && t.trim() !== '') : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(document);

    console.log(`✅ API: Successfully created project:`, {
      projectId: result.insertedId.toString(),
      displayName: displayName,
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      displayName: document.displayName,
      tags: document.tags || [],
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 },
    );
  }
}

// PUT /api/project - Update project
export async function PUT(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id') || undefined;
    const db = await getDatabase();
    const collection = db.collection<ProjectDocument>('projects');

    const body = await request.json();
    const { id, displayName, tags } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 },
      );
    }

    if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 },
      );
    }

    try {
      const objectId = new ObjectId(id);
      const query: any = { _id: objectId };
      if (clientId) {
        query.clientId = clientId;
      }
      const updateData: any = {
        displayName: displayName.trim(),
        updatedAt: new Date(),
      };
      if (tags !== undefined) {
        updateData.tags = Array.isArray(tags) ? tags.filter((t: any) => typeof t === 'string' && t.trim() !== '') : [];
      }
      const updateResult = await collection.updateOne(
        query,
        {
          $set: updateData,
        },
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 },
        );
      }

      const updated = await collection.findOne({ _id: objectId });
      return NextResponse.json({
        id: updated?._id?.toString(),
        displayName: updated?.displayName,
        tags: updated?.tags || [],
        createdAt: updated?.createdAt,
        updatedAt: updated?.updatedAt,
      });
    } catch {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 },
    );
  }
}

// DELETE /api/project - Delete project
export async function DELETE(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id') || undefined;
    const db = await getDatabase();
    const collection = db.collection<ProjectDocument>('projects');
    const timelinesCollection = db.collection('timelines');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 },
      );
    }

    try {
      const objectId = new ObjectId(id);
      const query: any = { projectId: id };
      if (clientId) {
        query.clientId = clientId;
      }
      
      // Delete all timelines associated with this project
      await timelinesCollection.deleteMany(query);
      
      // Delete the project
      const projectQuery: any = { _id: objectId };
      if (clientId) {
        projectQuery.clientId = clientId;
      }
      const deleteResult = await collection.deleteOne(projectQuery);

      if (deleteResult.deletedCount === 0) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({ message: 'Project deleted successfully' });
    } catch {
      return NextResponse.json(
        { error: 'Invalid project ID' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 },
    );
  }
}
