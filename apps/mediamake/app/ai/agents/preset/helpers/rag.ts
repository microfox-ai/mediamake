"use server";
import { RagUpstashSdk } from "@microfox/rag-upstash";
import { getRegistryFiles, readRegistryFile } from './guides';
import { getDatabase } from '@/lib/mongodb';
import { execSync } from 'child_process';
import path from 'path';
import { DatabasePreset } from "@/components/editor/presets/types";

// Metadata type for RAG
export interface PresetRagMetadata {
    id: string;
    title: string;
    description: string;
    tags: string[];
    type: string;
    internalPreset: boolean;
    version?: string;
    source: 'file' | 'db';
}

export const queryRagPresets = async (query: string, filterString?: string, topK?: number) => {
    // Initialize RAG SDK
    const ragSDK = new RagUpstashSdk({
        upstashUrl: process.env.UPSTASH_VECTOR_REST_URL!,
        upstashToken: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
    const results = await ragSDK.queryDocsFromRAG<PresetRagMetadata>({
        data: query,
        topK: topK || 5,
        filter: filterString || undefined,
        includeData: true,
        includeMetadata: true,
    });

    return results;
};

export const addPresetToRag = async (docsToFeed: {
    doc: string;
    metadata: PresetRagMetadata;
}[]) => {
    // Initialize RAG SDK
    const ragSDK = new RagUpstashSdk({
        upstashUrl: process.env.UPSTASH_VECTOR_REST_URL!,
        upstashToken: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
    return await ragSDK.feedDocsToRAG(docsToFeed);
};

export type IndexingScope = 'all' | 'changes' | 'fs' | 'db' | 'file' | 'db-id';

interface IndexingOptions {
    scope: IndexingScope;
    targetId?: string; // For 'file' (partial path/id) or 'db-id' (exact _id)
}

export const indexPresetsFunction = async (options: IndexingOptions) => {
    const { scope, targetId } = options;
    console.log(`Starting Preset Indexing (Scope: ${scope}, Target: ${targetId})...`);

    const docsToFeed: { metadata: PresetRagMetadata; doc: string }[] = [];
    const REGISTRY_PREFIX = 'components/editor/presets/registry/';

    // --- 1. Determine Files to Index ---
    let filesToIndex: string[] = [];

    if (scope === 'all' || scope === 'fs') {
        filesToIndex = await getRegistryFiles();
    } else if (scope === 'changes') {
        try {
            // Try git diff against main
            const diffOutput = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf-8' });
            const changedFiles = diffOutput.split('\n').filter(Boolean);
            filesToIndex = changedFiles
                .filter(file => file.startsWith(REGISTRY_PREFIX) && file.endsWith('.ts') && !file.endsWith('index.ts'))
                .map(file => path.relative(REGISTRY_PREFIX, file)); // Assuming getRegistryFiles returns relative paths? 
            // Wait, getRegistryFiles returns what glob returns relative to REGISTRY_PATH. 
            // git diff returns repo-relative paths.
            // We need to normalize.

            // Re-map git paths to registry relative paths if they match the prefix
            filesToIndex = changedFiles
                .filter(f => f.includes('components/editor/presets/registry/') && f.endsWith('.ts') && !f.endsWith('index.ts'))
                .map(f => {
                    const parts = f.split('components/editor/presets/registry/');
                    return parts[1];
                });
        } catch (e) {
            console.warn('Git diff failed, falling back to indexing nothing for "changes" scope.', e);
        }
    } else if (scope === 'file' && targetId) {
        const allFiles = await getRegistryFiles();
        filesToIndex = allFiles.filter(f => f.includes(targetId) || f === targetId);
    }

    // --- 2. Process Files ---
    for (const file of filesToIndex) {
        try {
            const content = await readRegistryFile(file);
            // Extract metadata
            const idMatch = content.match(/id:\s*['"]([^'"]+)['"]/);
            const titleMatch = content.match(/title:\s*['"]([^'"]+)['"]/);
            const descriptionMatch = content.match(/description:\s*['"]([^'"]+)['"]/);
            const tagsMatch = content.match(/tags:\s*\[([\s\S]*?)\]/);
            const internalMatch = content.match(/_internalPreset:\s*(true|false)/);

            // Extract Top Comment Block (JSDoc style /** ... */)
            const topCommentMatch = content.match(/^\s*\/\*\*[\s\S]*?\*\//);
            const topComment = topCommentMatch ? topCommentMatch[0] : '';

            if (idMatch && titleMatch) {
                const tags = tagsMatch
                    ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t)
                    : [];

                const internalPreset = internalMatch ? internalMatch[1] === 'true' : false;

                const markdownDoc = `
 # Preset: ${titleMatch[1]} (ID: ${idMatch[1]})
 
 ## Description
 ${descriptionMatch ? descriptionMatch[1] : 'No description'}
 
 ## Metadata
 - **Tags**: ${tags.join(', ')}
 - **Type**: File Preset
 - **Internal**: ${internalPreset}
 
 ## Documentation
 ${topComment}
 `;

                docsToFeed.push({
                    metadata: {
                        id: idMatch[1],
                        title: titleMatch[1],
                        description: descriptionMatch ? descriptionMatch[1] : '',
                        tags: tags,
                        type: 'file-preset',
                        internalPreset,
                        source: 'file',
                    },
                    doc: markdownDoc,
                });
            }
        } catch (e) {
            console.error(`Failed to process file ${file}`, e);
        }
    }

    // --- 3. Determine DB Presets to Index ---
    if (scope === 'all' || scope === 'db' || scope === 'db-id') {
        try {
            const db = await getDatabase();
            const collection = db.collection<DatabasePreset>('presets'); // Correct collection name
            let query = {};

            if (scope === 'db-id' && targetId) {
                // Filter by specific ID after fetch
            }

            const presets = await collection.find(query).toArray();

            let dbPresetsToProcess = presets;
            if (scope === 'db-id' && targetId) {
                dbPresetsToProcess = presets.filter(p =>
                    p._id.toString() === targetId || p.metadata?.id === targetId
                );
            }

            console.log(`[RAG] Processing ${dbPresetsToProcess.length} database presets for indexing`);

            for (const doc of dbPresetsToProcess) {
                // Format according to the actual database structure from route.ts
                const presetId = doc.metadata?.id || doc._id.toString();
                const presetTitle = doc.metadata?.title || 'Untitled';
                const presetDescription = doc.metadata?.description || 'Database preset';
                const presetTags = doc.metadata?.tags || [];

                const markdownDoc = `
# Preset: ${presetTitle} (ID: ${presetId})

## Description
${presetDescription}

## Metadata
- **Tags**: ${presetTags.join(', ')}
- **Type**: Database Preset
- **Preset Type**: ${doc.metadata?.presetType || 'unknown'}
- **Created**: ${doc.metadata?.createdAt || doc.createdAt}

## Database Structure
\`\`\`json
{
  "metadata": ${JSON.stringify(doc.metadata, null, 2)},
  "presetParams": ${JSON.stringify(doc.presetParams, null, 2)}
}
\`\`\`
`;

                docsToFeed.push({
                    metadata: {
                        id: presetId,
                        title: presetTitle,
                        description: presetDescription,
                        tags: presetTags,
                        type: 'db-preset',
                        internalPreset: false,
                        source: 'db',
                    },
                    doc: markdownDoc,
                });
            }
        } catch (error) {
            console.error('Error indexing from DB:', error);
        }
    }

    // --- 4. Feed to RAG ---
    if (docsToFeed.length > 0) {
        await addPresetToRag(docsToFeed);
        console.log(`Indexed ${docsToFeed.length} presets.`);
        return { message: `Successfully indexed ${docsToFeed.length} presets.`, count: docsToFeed.length };
    } else {
        return { message: 'No presets found to index.', count: 0 };
    }
};
