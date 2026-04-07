import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { projectFilesCol } from '@/lib/db/collections';

const aiRouter = new AiRouter();

export const deleteFileAgent = aiRouter
  .agent('/', async (ctx) => {
    const { fileId } = ctx.request.params as { fileId: string };
    const projectId = ctx.state.projectId as string | undefined;
    if (!projectId) return { error: 'projectId not provided' };

    try {
      const col = await projectFilesCol();
      const file = await col.findOne({ _id: new ObjectId(fileId), projectId });
      if (!file) return { error: `File not found: ${fileId}` };

      const idsToDelete = [file._id];
      const queue = [fileId];
      while (queue.length) {
        const parentId = queue.shift()!;
        const children = await col.find({ projectId, parentId }).toArray();
        for (const child of children) {
          idsToDelete.push(child._id);
          if (child.type === 'folder') queue.push(child._id.toHexString());
        }
      }
      await col.deleteMany({ _id: { $in: idsToDelete } });
      return { success: true, fileName: file.name, deletedCount: idsToDelete.length };
    } catch (e) {
      return { error: String(e) };
    }
  })
  .actAsTool('/', {
    id: 'delete_file',
    name: 'Delete File',
    description:
      'Delete a file or folder (and all its descendants) from the project.',
    inputSchema: z.object({
      fileId: z.string().describe('fileId of the file or folder to delete'),
    }) as any,
    outputSchema: z.object({
      success: z.boolean().optional(),
      fileName: z.string().optional(),
      deletedCount: z.number().optional(),
      error: z.string().optional(),
    }) as any,
    metadata: { icon: '🗑️', title: 'Delete File', hideUI: false },
  });
