import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';

const aiRouter = new AiRouter();

export const readFileAgent = aiRouter
  .agent('/', async (ctx) => {
    const { fileId } = ctx.request.params as { fileId: string };
    const fileMap = ctx.state.fileMap as Map<string, any> | undefined;

    if (!fileMap) return { error: 'File map not initialized' };
    const file = fileMap.get(fileId);
    if (!file) return { error: `File not found: ${fileId}` };

    const lines: string[] = file.content.split('\n');
    const numbered = lines.map((l: string, i: number) => `${i + 1}: ${l}`).join('\n');

    return {
      fileId,
      fileName: file.fileName,
      lineCount: lines.length,
      content: numbered,
    };
  })
  .actAsTool('/', {
    id: 'read_file',
    name: 'Read File',
    description: 'Read the full numbered content of a project file.',
    inputSchema: z.object({
      fileId: z.string().describe('fileId of the file to read'),
    }) as any,
    outputSchema: z.object({
      fileId: z.string().optional(),
      fileName: z.string().optional(),
      lineCount: z.number().optional(),
      content: z.string().optional(),
      error: z.string().optional(),
    }) as any,
    metadata: { icon: '📄', title: 'Read File', hideUI: true },
  });
