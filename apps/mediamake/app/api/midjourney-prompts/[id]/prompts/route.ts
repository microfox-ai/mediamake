import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { MidjourneyPromptRecord } from '@/app/ai/agents/midjourney/helpers';

// GET /api/midjourney-prompts/[id]/prompts
// Query params:
// - alsoGenerated: 'true' | 'false' (default: false) -> include already generated prompts or not
// - mode: 'all' | 'indexRange' | 'variation' (default: 'all')
// - startIndex: number (for indexRange)
// - endIndex: number (for indexRange)
// - variationCount: number (for variation, default: 1)
// - includeTag: 'true' | 'false' (default: true) -> include first tag as `tag` field
//
// Special case: if id === 'random', a random record will be selected.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(req.url);
    const { id } = await params;

    const alsoGenerated = searchParams.get('alsoGenerated') === 'true';
    const mode =
      (searchParams.get('mode') as 'all' | 'indexRange' | 'variation') || 'all';
    const includeTag =
      searchParams.get('includeTag') === null
        ? true
        : searchParams.get('includeTag') === 'true';

    const db = await getDatabase();
    const collection =
      db.collection<MidjourneyPromptRecord>('midjourneyPrompts');

    // Fetch record: if id === 'random', pick a random record
    let record: MidjourneyPromptRecord | null = null;

    if (id === 'random') {
      const [randomRecord] = await collection
        .aggregate<MidjourneyPromptRecord>([{ $sample: { size: 1 } }])
        .toArray();
      record = randomRecord || null;
    } else {
      const objectId = new ObjectId(id);
      record = await collection.findOne({ _id: objectId });
    }

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const prompts = record.prompts || [];
    const generatedIndexes = record.generatedIndexes || [];
    const totalPrompts = prompts.length;

    if (totalPrompts === 0) {
      return NextResponse.json({
        recordId: record._id?.toString() || null,
        prompts: [],
        totalPrompts,
      });
    }

    // Helper: build base index list
    let availableIndexes: number[] = Array.from(
      { length: totalPrompts },
      (_, i) => i,
    );

    // By default (alsoGenerated=false) remove already generated prompts
    if (!alsoGenerated) {
      const generatedSet = new Set(generatedIndexes);
      availableIndexes = availableIndexes.filter(i => !generatedSet.has(i));
    }

    const firstTag = includeTag ? record.tags?.[0] : undefined;

    let selectedPrompts: any[] = [];

    if (mode === 'variation') {
      // Variation mode: always skip generated prompts, regardless of alsoGenerated
      const variationCount = parseInt(
        searchParams.get('variationCount') || '1',
        10,
      );
      const safeVariationCount = isNaN(variationCount)
        ? 1
        : Math.max(1, variationCount);

      const generatedSet = new Set(generatedIndexes);

      // Group prompts by shotIndex, only unprocessed
      const promptsByShot: {
        [shotIndex: number]: Array<{ prompt: any; index: number }>;
      } = {};

      prompts.forEach((prompt, index) => {
        if (!generatedSet.has(index)) {
          const shotIndex = prompt.shotIndex ?? 0;
          if (!promptsByShot[shotIndex]) {
            promptsByShot[shotIndex] = [];
          }
          promptsByShot[shotIndex].push({ prompt, index });
        }
      });

      Object.keys(promptsByShot)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(shotIndexStr => {
          const shotPrompts = promptsByShot[parseInt(shotIndexStr)];
          const selected = shotPrompts.slice(0, safeVariationCount);
          selected.forEach(({ prompt, index }) => {
            selectedPrompts.push({
              ...prompt,
              pIndex: index,
              ...(firstTag ? { tag: firstTag } : {}),
            });
          });
        });
    } else if (mode === 'indexRange') {
      const startIndexParam = parseInt(
        searchParams.get('startIndex') || '0',
        10,
      );
      const endIndexParam = parseInt(
        searchParams.get('endIndex') || String(totalPrompts - 1),
        10,
      );

      const startIndex = isNaN(startIndexParam)
        ? 0
        : Math.max(0, Math.min(startIndexParam, totalPrompts - 1));
      const endIndex = isNaN(endIndexParam)
        ? totalPrompts - 1
        : Math.max(0, Math.min(endIndexParam, totalPrompts - 1));

      if (startIndex > endIndex) {
        return NextResponse.json(
          { error: 'startIndex must be less than or equal to endIndex' },
          { status: 400 },
        );
      }

      const indexSet = new Set(availableIndexes);
      const indices: number[] = [];
      for (let i = startIndex; i <= endIndex; i++) {
        if (indexSet.has(i)) indices.push(i);
      }

      selectedPrompts = indices.map(i => ({
        ...prompts[i],
        pIndex: i,
        ...(firstTag ? { tag: firstTag } : {}),
      }));
    } else {
      // mode === 'all'
      selectedPrompts = availableIndexes.map(i => ({
        ...prompts[i],
        pIndex: i,
        ...(firstTag ? { tag: firstTag } : {}),
      }));
    }

    return NextResponse.json({
      recordId: record._id?.toString() || null,
      prompts: selectedPrompts,
      totalPrompts,
      returnedCount: selectedPrompts.length,
      mode,
      alsoGenerated,
    });
  } catch (error) {
    console.error(
      'Error fetching midjourney prompts via prompts route:',
      error,
    );
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 },
    );
  }
}
