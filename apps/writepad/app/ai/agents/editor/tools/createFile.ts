import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { projectFilesCol } from '@/lib/db/collections';

const aiRouter = new AiRouter();

export const createFileAgent = aiRouter
  .agent('/', async (ctx) => {
    const { name, type, parentId, initialContent = '' } = ctx.request.params as {
      name: string;
      type: 'file' | 'folder';
      parentId?: string | null;
      initialContent?: string;
    };
    const projectId = ctx.state.projectId as string | undefined;
    if (!projectId) return { error: 'projectId not provided' };

    const resolvedParentId =
      parentId && parentId !== 'null' && parentId !== '' ? parentId : null;

    try {
      const col = await projectFilesCol();
      const lastSibling = await col.findOne(
        { projectId, parentId: resolvedParentId },
        { sort: { order: -1 } },
      );
      const order = lastSibling ? lastSibling.order + 1 : 0;
      const now = new Date();
      const result = await col.insertOne({
        _id: new ObjectId(),
        projectId,
        name,
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
        fileName: name,
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
      'Create a new file or folder in the project. To create at root level omit parentId. To create inside a folder pass its fileId as parentId.',
    inputSchema: z.object({
      name: z
        .string()
        .describe('File or folder name (e.g. "chapter-02.md" or "scenes")'),
      type: z
        .enum(['file', 'folder'])
        .describe('"file" for text files, "folder" for directories'),
      parentId: z
        .string()
        .optional()
        .describe(
          'fileId of the parent folder. Omit or leave empty to create at the project root.',
        ),
      initialContent: z
        .string()
        .optional()
        .describe('Initial text content for files. Use full Markdown by default.'),
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
