import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';

const aiRouter = new AiRouter();

export const readFileAgent = aiRouter
  .agent('/', async (ctx) => {
    const { fileId, topLines } = ctx.request.params as { fileId: string; topLines?: number };
    const fileMap = ctx.state.fileMap as Map<string, any> | undefined;

    if (!fileMap) return { error: 'File map not initialized' };
    const file = fileMap.get(fileId);
    if (!file) return { error: `File not found: ${fileId}` };

    const lines: string[] = file.content.split('\n');
    const slice = topLines != null ? lines.slice(0, topLines) : lines;
    const numbered = slice.map((l: string, i: number) => `${i + 1}: ${l}`).join('\n');

    return {
      fileId,
      fileName: file.fileName,
      totalLines: lines.length,
      returnedLines: slice.length,
      content: numbered,
    };
  })
  .actAsTool('/', {
    id: 'read_file',
    name: 'Read File',
    description:
      'Read the numbered content of a project file. Use topLines to read only the first N lines of a large file instead of fetching the whole thing.',
    inputSchema: z.object({
      fileId: z.string().describe('fileId of the file to read'),
      topLines: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('If provided, return only the first N lines (useful for large files)'),
    }) as any,
    outputSchema: z.object({
      fileId: z.string().optional(),
      fileName: z.string().optional(),
      totalLines: z.number().optional(),
      returnedLines: z.number().optional(),
      content: z.string().optional(),
      error: z.string().optional(),
    }) as any,
    metadata: { icon: '📄', title: 'Read File', hideUI: true },
  });
