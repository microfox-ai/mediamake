import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { projectFilesCol } from '@/lib/db/collections';

const aiRouter = new AiRouter();

export const createFileAgent = aiRouter
  .agent('/', async (ctx) => {
    const { name, type, parentId, initialContent = '', path } = ctx.request.params as {
      name?: string;
      type: 'file' | 'folder';
      parentId?: string | null;
      initialContent?: string;
      /** Full slash-separated path, e.g. ".writepad/wiki/aethelgard.md" */
      path?: string;
    };
    const projectId = ctx.state.projectId as string | undefined;
    if (!projectId) return { error: 'projectId not provided' };

    const col = await projectFilesCol();

    let resolvedName: string;
    let resolvedParentId: string | null;

    if (path && path.trim()) {
      // ── Path-based resolution ─────────────────────────────────────────────
      // Split ".writepad/wiki/aethelgard.md" → ['.writepad', 'wiki', 'aethelgard.md']
      // Walk (or create) each folder segment, then create the final file/folder.
      const segments = path
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
      if (segments.length === 0) return { error: 'Invalid path: no segments found.' };

      const fileSegment = segments[segments.length - 1];
      const folderSegments = segments.slice(0, -1);

      resolvedName = fileSegment;
      resolvedParentId = null;

      for (const seg of folderSegments) {
        // Find existing folder with this name at the current level
        const existing = await col.findOne({
          projectId,
          name: seg,
          type: 'folder',
          parentId: resolvedParentId,
        });

        if (existing) {
          resolvedParentId = existing._id.toHexString();
        } else {
          // Create the missing intermediate folder
          const lastSibling = await col.findOne(
            { projectId, parentId: resolvedParentId },
            { sort: { order: -1 } },
          );
          const order = lastSibling ? lastSibling.order + 1 : 0;
          const now = new Date();
          const result = await col.insertOne({
            _id: new ObjectId(),
            projectId,
            name: seg,
            type: 'folder',
            parentId: resolvedParentId,
            content: '',
            draft: null,
            order,
            createdAt: now,
            updatedAt: now,
          });
          resolvedParentId = result.insertedId.toHexString();
        }
      }
    } else {
      // ── Legacy name + parentId mode ───────────────────────────────────────
      if (!name) return { error: 'Either "path" or "name" must be provided.' };
      resolvedName = name;
      resolvedParentId =
        parentId && parentId !== 'null' && parentId !== '' ? parentId : null;
    }

    try {
      const lastSibling = await col.findOne(
        { projectId, parentId: resolvedParentId },
        { sort: { order: -1 } },
      );
      const order = lastSibling ? lastSibling.order + 1 : 0;
      const now = new Date();
      const result = await col.insertOne({
        _id: new ObjectId(),
        projectId,
        name: resolvedName,
        type,
        parentId: resolvedParentId,
        content: type === 'file' ? initialContent : '',
        draft: null,
        order,
        createdAt: now,
        updatedAt: now,
      });
      return {
        success: true,
        fileId: result.insertedId.toHexString(),
        fileName: resolvedName,
        type,
        parentId: resolvedParentId,
      };
    } catch (e) {
      return { error: String(e) };
    }
  })
  .actAsTool('/', {
    id: 'create_file',
    name: 'Create File',
    description:
      'Create a new file or folder in the project. Use "path" to place a file at a specific location (e.g. ".writepad/wiki/aethelgard.md") — intermediate folders are created automatically. Alternatively, supply "name" + optional "parentId" when you already know the parent folder\'s fileId.',
    inputSchema: z.object({
      path: z
        .string()
        .optional()
        .describe(
          'Full slash-separated path from the project root, e.g. ".writepad/wiki/aethelgard.md" or "scenes/act-1/opening.md". Missing intermediate folders are created automatically. Prefer this over name+parentId for any nested location.',
        ),
      name: z
        .string()
        .optional()
        .describe(
          'Bare file or folder name (e.g. "chapter-02.md"). Only use this when NOT providing "path". Must not contain slashes.',
        ),
      type: z
        .enum(['file', 'folder'])
        .describe('"file" for text files, "folder" for directories'),
      parentId: z
        .string()
        .optional()
        .describe(
          'fileId of the parent folder. Only needed when using "name" instead of "path". Omit or leave empty to create at the project root.',
        ),
      initialContent: z
        .string()
        .optional()
        .describe('Initial text content for the file. Use full Markdown by default.'),
    }) as any,
    outputSchema: z.object({
      success: z.boolean().optional(),
      fileId: z.string().optional(),
      fileName: z.string().optional(),
      type: z.string().optional(),
      parentId: z.string().nullable().optional(),
      error: z.string().optional(),
    }) as any,
    metadata: { icon: '📝', title: 'Create File', hideUI: false },
  });
