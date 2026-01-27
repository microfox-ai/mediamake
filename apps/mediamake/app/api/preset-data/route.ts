import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

interface PresetDataDocument {
  _id?: ObjectId;
  clientId?: string;
  name: string;
  /**
   * List of other clientIds that can access this preset.
   * The owner is always allowed (via clientId field).
   */
  sharedWithClientIds?: string[];
  presetData: {
    presets: Array<{
      presetId: string;
      presetType: string;
      presetInputData: any;
      disabled?: boolean;
    }>;
    defaultData?: {
      references: Array<{
        key: string;
        type: string;
        value: any;
      }>;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/preset-data
// - Without query: return only metadata (no presetData)
// - With ?id=...: return full document including presetData
export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const clientId = request.headers.get('x-client-id') || undefined;
    const collection = db.collection<PresetDataDocument>('presetData');

    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');

    // If id is provided, return the full document (including presetData)
    if (id) {
      try {
        const objectId = new ObjectId(id);
        // When fetching a single preset, allow access if:
        // - requester is the owner (clientId matches), OR
        // - requester is in the sharedWithClientIds list.
        const query: any = { _id: objectId };
        if (clientId) {
          query.$or = [
            { clientId },
            { sharedWithClientIds: clientId },
          ];
        }

        const doc = await collection.findOne(query);
        if (!doc) {
          return NextResponse.json(
            { error: 'Preset not found' },
            { status: 404 },
          );
        }
        // Include ownerClientId in response for frontend ownership checks
        const responseDoc: any = { ...doc };
        responseDoc.ownerClientId = doc.clientId;
        return NextResponse.json(responseDoc);
      } catch {
        return NextResponse.json(
          { error: 'Invalid preset ID' },
          { status: 400 },
        );
      }
    }

    // Otherwise, return only metadata without presetData.
    // If clientId is present, return:
    // - presets owned by this clientId
    // - presets shared with this clientId
    const metaQuery = clientId
      ? {
          $or: [
            { clientId },
            { sharedWithClientIds: clientId },
          ],
        }
      : {};

    const presetsMeta = await collection
      .find(metaQuery, {
        projection: {
          name: 1,
          createdAt: 1,
          updatedAt: 1,
          clientId: 1,
          sharedWithClientIds: 1,
        },
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Normalize _id to id for client
    const response = presetsMeta.map((d: any) => ({
      id: d._id,
      name: d.name,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      ownerClientId: d.clientId,
      sharedWithClientIds: d.sharedWithClientIds ?? [],
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching preset data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preset data' },
      { status: 500 },
    );
  }
}

// POST /api/preset-data - Save preset data
export async function POST(request: NextRequest) {
  try {
    const clientId = request.headers.get('x-client-id') || undefined;
    const db = await getDatabase();
    const collection = db.collection<PresetDataDocument>('presetData');

    const body = await request.json();
    const {
      name,
      presetData,
      overwriteId,
      sharedWithClientIds,
    } = body as {
      name: string;
      presetData: PresetDataDocument['presetData'];
      overwriteId?: string;
      sharedWithClientIds?: string[];
    };

    console.log(`💾 API: Saving preset data:`, {
      name: name,
      overwriteId: overwriteId,
      numberOfPresets: presetData?.presets?.length || 0,
      hasDefaultData: !!presetData?.defaultData,
      referencesCount: presetData?.defaultData?.references?.length || 0,
      clientId: clientId,
    });

    if (!name || !presetData) {
      return NextResponse.json(
        { error: 'Name and presetData are required' },
        { status: 400 },
      );
    }

    // If overwriteId is provided, update existing document
    if (overwriteId) {
      try {
        const objectId = new ObjectId(overwriteId);
        // Only the owner (matching clientId) is allowed to overwrite.
        const updateFilter: any = { _id: objectId };
        if (clientId) {
          updateFilter.clientId = clientId;
        }

        const updateResult = await collection.updateOne(
          updateFilter,
          {
            $set: {
              name,
              presetData,
              updatedAt: new Date(),
              sharedWithClientIds: sharedWithClientIds ?? [],
            },
          },
        );

        if (updateResult.matchedCount === 0) {
          console.log(
            `❌ API: Preset data not found for overwrite: ${overwriteId}`,
          );
          return NextResponse.json(
            { error: 'Preset not found' },
            { status: 404 },
          );
        }

        console.log(`✅ API: Successfully updated preset data:`, {
          presetDataId: overwriteId,
          name: name,
          numberOfPresets: presetData?.presets?.length || 0,
          hasDefaultData: !!presetData?.defaultData,
          referencesCount: presetData?.defaultData?.references?.length || 0,
        });

        return NextResponse.json({
          id: overwriteId,
          message: 'Preset data updated successfully',
        });
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid preset ID' },
          { status: 400 },
        );
      }
    }

    // Otherwise, create new document
    const document: Omit<PresetDataDocument, '_id'> = {
      clientId,
      name,
      presetData,
      sharedWithClientIds: sharedWithClientIds ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(document);

    console.log(`✅ API: Successfully created preset data:`, {
      presetDataId: result.insertedId.toString(),
      name: name,
      numberOfPresets: presetData?.presets?.length || 0,
      hasDefaultData: !!presetData?.defaultData,
      referencesCount: presetData?.defaultData?.references?.length || 0,
      clientId: clientId,
    });

    return NextResponse.json({
      id: result.insertedId,
      message: 'Preset data saved successfully',
    });
  } catch (error) {
    console.error('Error saving preset data:', error);
    return NextResponse.json(
      { error: 'Failed to save preset data' },
      { status: 500 },
    );
  }
}
