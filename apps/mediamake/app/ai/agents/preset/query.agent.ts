import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { queryRagPresets } from './helpers/rag';
import { getRegistryFiles, readRegistryFile } from './helpers/guides';

const aiRouter = new AiRouter();

export const queryAgent = aiRouter
  .agent('/', async (ctx) => {
    const { queryType, targetId } = ctx.request.params as {
      queryType: 'all' | 'search' | 'by-id' | 'by-tag' | 'internal-only';
      targetId?: string;
    };

    console.log(`[QUERY] Starting query (type=${queryType}, target=${targetId})`);

    try {
      if (queryType === 'all') {
        // Return all available presets metadata from BOTH sources
        const presets = [];

        // First, fetch database presets
        try {
          const { getDatabase } = await import('@/lib/mongodb');
          const db = await getDatabase();
          const collection = db.collection('presets');
          const dbPresets = await collection.find({}).toArray();

          for (const doc of dbPresets) {
            presets.push({
              id: doc.metadata?.id || doc._id.toString(),
              title: doc.metadata?.title || 'Untitled',
              description: doc.metadata?.description || '',
              tags: doc.metadata?.tags || [],
              internalPreset: false,
              source: 'db',
              presetType: doc.metadata?.presetType,
            });
          }

          console.log(`[QUERY] Found ${dbPresets.length} database presets`);
        } catch (dbError) {
          console.warn('[QUERY] Could not fetch database presets:', dbError);
        }

        // Then, fetch file system presets
        const files = await getRegistryFiles();

        for (const file of files) {
          const content = await readRegistryFile(file);
          const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
          const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
          const descriptionMatch = content.match(/description:\s*['"]([^'"]+)['"]/);
          const tagsMatch = content.match(/tags:\s*\[([\s\S]*?)\]/);
          const internalMatch = content.match(/_internalPreset:\s*(true|false)/);
          const presetTypeMatch = content.match(/presetType:\s*['"]([^'"]+)['"]/);

          if (idMatch && titleMatch) {
            const tags = tagsMatch
              ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t)
              : [];
            
            presets.push({
              id: idMatch[1],
              title: titleMatch[1],
              description: descriptionMatch ? descriptionMatch[1] : '',
              tags,
              internalPreset: internalMatch ? internalMatch[1] === 'true' : false,
              source: 'file',
              file,
              presetType: presetTypeMatch ? presetTypeMatch[1] : 'unknown',
            });
          }
        }

        console.log(`[QUERY] Total presets found: ${presets.length} (combined from db and file system)`);
        return { presets, count: presets.length, source: 'mixed' };
      } else if (queryType === 'search' && targetId) {
        // Semantic search using RAG (includes both file system and database presets)
        console.log(`[QUERY] Performing RAG semantic search for: "${targetId}"`);
        
        const results = await queryRagPresets(targetId, undefined, 10);
        const presets = results.map(r => ({
          id: r.metadata?.id,
          title: r.metadata?.title,
          description: r.metadata?.description,
          tags: r.metadata?.tags,
          internalPreset: r.metadata?.internalPreset,
          source: r.metadata?.source, // 'file' or 'db'
          score: r.score,
        }));

        console.log(`[QUERY] RAG search results: ${presets.length} matches (from both file system and database)`);
        return { presets, count: presets.length, source: 'mixed' };
      } else if (queryType === 'by-id' && targetId) {
        // Find specific preset by ID - check database first, then file system
        
        // Check database
        try {
          const { getDatabase } = await import('@/lib/mongodb');
          const db = await getDatabase();
          const collection = db.collection('presets');
          
          // Try by metadata.id or _id
          const dbPreset = await collection.findOne({
            $or: [
              { 'metadata.id': targetId },
              { _id: targetId as any } // ObjectId conversion might be needed
            ]
          });

          if (dbPreset) {
            console.log(`[QUERY] Found preset by ID in database: ${targetId}`);
            return {
              presets: [{
                id: dbPreset.metadata?.id || dbPreset._id.toString(),
                title: dbPreset.metadata?.title || '',
                description: dbPreset.metadata?.description || '',
                tags: dbPreset.metadata?.tags || [],
                source: 'db',
                presetData: dbPreset,
              }],
              count: 1,
              source: 'db',
            };
          }
        } catch (dbError) {
          console.warn('[QUERY] Database search failed:', dbError);
        }

        // Check file system
        const files = await getRegistryFiles();
        
        for (const file of files) {
          const content = await readRegistryFile(file);
          const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
          
          if (idMatch && idMatch[1] === targetId) {
            const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
            const descriptionMatch = content.match(/description:\s*['"]([^'"]+)['"]/);
            const tagsMatch = content.match(/tags:\s*\[([\s\S]*?)\]/);
            
            const tags = tagsMatch
              ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t)
              : [];

            console.log(`[QUERY] Found preset by ID in file system: ${targetId}`);
            return {
              presets: [{
                id: idMatch[1],
                title: titleMatch?.[1] || '',
                description: descriptionMatch?.[1] || '',
                tags,
                source: 'file',
                file,
                code: content,
              }],
              count: 1,
              source: 'file',
            };
          }
        }

        return { presets: [], count: 0, message: `Preset '${targetId}' not found.` };
      } else if (queryType === 'internal-only') {
        // Return only internal presets from file system (database presets cannot be internal by design)
        console.log('[QUERY] Searching for internal presets in file system');
        
        const files = await getRegistryFiles();
        const presets = [];

        for (const file of files) {
          const content = await readRegistryFile(file);
          const internalMatch = content.match(/_internalPreset:\s*(true)/);
          
          if (internalMatch) {
            const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
            const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
            const descriptionMatch = content.match(/description:\s*['"]([^'"]+)['"]/);
            const tagsMatch = content.match(/tags:\s*\[([\s\S]*?)\]/);

            if (idMatch && titleMatch) {
              const tags = tagsMatch
                ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t)
                : [];

              presets.push({
                id: idMatch[1],
                title: titleMatch[1],
                description: descriptionMatch?.[1] || '',
                tags,
                source: 'file',
                file,
              });
            }
          }
        }

        console.log(`[QUERY] Found ${presets.length} internal presets`);
        return { presets, count: presets.length, source: 'file' };
      } else if (queryType === 'by-tag' && targetId) {
        // Search by tag in both database and file system
        const presets = [];

        // Search database
        try {
          const { getDatabase } = await import('@/lib/mongodb');
          const db = await getDatabase();
          const collection = db.collection('presets');
          
          // Query for presets with matching tag (case-insensitive)
          const dbPresets = await collection.find({
            'metadata.tags': { $regex: targetId, $options: 'i' }
          }).toArray();

          for (const doc of dbPresets) {
            presets.push({
              id: doc.metadata?.id || doc._id.toString(),
              title: doc.metadata?.title || '',
              description: doc.metadata?.description || '',
              tags: doc.metadata?.tags || [],
              source: 'db',
            });
          }

          console.log(`[QUERY] Found ${dbPresets.length} database presets with tag '${targetId}'`);
        } catch (dbError) {
          console.warn('[QUERY] Database tag search failed:', dbError);
        }

        // Search file system
        const files = await getRegistryFiles();
        for (const file of files) {
          const content = await readRegistryFile(file);
          const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
          const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
          const descriptionMatch = content.match(/description:\s*['"]([^'"]+)['"]/);
          const tagsMatch = content.match(/tags:\s*\[([\s\S]*?)\]/);

          if (idMatch && titleMatch && tagsMatch) {
            const tags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t);
            
            // Check if any tag matches
            if (tags.some(t => t.toLowerCase().includes(targetId.toLowerCase()))) {
              presets.push({
                id: idMatch[1],
                title: titleMatch[1],
                description: descriptionMatch?.[1] || '',
                tags,
                source: 'file',
                file,
              });
            }
          }
        }

        console.log(`[QUERY] Found ${presets.length} total presets with tag '${targetId}'`);
        return { presets, count: presets.length, source: 'mixed' };
      }

      return { presets: [], count: 0 };
    } catch (error) {
      console.error('[QUERY] Error:', error);
      return { presets: [], count: 0, error: String(error) };
    }
  })
  .actAsTool('/', {
    id: 'presetQuery',
    name: 'Query Presets',
    description: 'Query information about available presets.',
    inputSchema: z.object({
      queryType: z.enum(['all', 'search', 'by-id', 'by-tag', 'internal-only'])
        .describe('Type of query: "all" (list all), "search" (semantic), "by-id" (exact match), "by-tag" (filter by tag), "internal-only" (internal effects only).'),
      targetId: z.string().optional()
        .describe('Query parameter: search term, preset ID, or tag name (required for search/by-id/by-tag).'),
    }),
    outputSchema: z.object({
      presets: z.array(z.any()),
      count: z.number(),
      source: z.enum(['db', 'file', 'mixed']).optional(),
      message: z.string().optional(),
      error: z.string().optional(),
    }),
    metadata: { title: 'Query Presets', icon: 'search' },
  });

