import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';

const aiRouter = new AiRouter();

export const searchFileAgent = aiRouter
  .agent('/', async (ctx) => {
    const { fileId, query, caseSensitive = false } = ctx.request.params as {
      fileId: string;
      query: string;
      caseSensitive?: boolean;
    };
    const fileMap = ctx.state.fileMap as Map<string, any> | undefined;

    if (!fileMap) return { error: 'File map not initialized' };
    const file = fileMap.get(fileId);
    if (!file) return { error: `File not found: ${fileId}` };

    const matches = file.content
      .split('\n')
      .map((line: string, i: number) => ({ lineNumber: i + 1, line }))
      .filter(({ line }: { line: string }) =>
        caseSensitive
          ? line.includes(query)
          : line.toLowerCase().includes(query.toLowerCase()),
      );

    return { fileId, fileName: file.fileName, query, matchCount: matches.length, matches };
  })
  .actAsTool('/', {
    id: 'search_file',
    name: 'Search File',
    description: 'Search for text in a project file. Returns matching lines with line numbers.',
    inputSchema: z.object({
      fileId: z.string().describe('fileId of the file to search'),
      query: z.string().describe('Text to search for'),
      caseSensitive: z
        .boolean()
        .optional()
        .describe('Whether the search is case-sensitive (default false)'),
    }) as any,
    outputSchema: z.object({
      fileId: z.string().optional(),
      fileName: z.string().optional(),
      query: z.string().optional(),
      matchCount: z.number().optional(),
      matches: z
        .array(z.object({ lineNumber: z.number(), line: z.string() }))
        .optional(),
      error: z.string().optional(),
    }) as any,
    metadata: { icon: '🔍', title: 'Search File', hideUI: true },
  });
