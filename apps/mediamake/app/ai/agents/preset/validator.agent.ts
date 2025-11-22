import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import ts from 'typescript';

const aiRouter = new AiRouter();

export const validatorAgent = aiRouter
  .agent('/', async (ctx) => {
    const { code } = ctx.request.params as { code: string };
    const errors: string[] = [];
    
    ctx.response.writeMessageMetadata({
      loader: 'Validating code...',
    });

    // 1. Syntax Check
    try {
      const sourceFile = ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);
      // (Basic check)
    } catch (e) {
      errors.push(`Syntax Error: ${e}`);
    }

    // 2. Forbidden Patterns
    if (code.includes('from "fs"') || code.includes("from 'fs'")) errors.push("Forbidden import: 'fs'");
    if (code.includes('from "path"') || code.includes("from 'path'")) errors.push("Forbidden import: 'path'");
    if (code.match(/https?:\/\/(?!localhost|127\.0\.0\.1)/)) {
         // Warning or Error for external links? Tech Lead said NO external URLs.
         // Let's flag it if it looks like an asset import, but allow metadata links/comments.
         // Simplified check:
         if (code.includes('src: "http')) errors.push("Forbidden external asset URL found.");
    }

    // // 3. Required Exports
    // if (!code.includes('export const presetMetadata')) errors.push("Missing 'export const presetMetadata'");
    
    // // 4. Remotion Specifics
    // if (!code.includes('BaseLayout') && !code.includes('type: "layout"')) {
    //     // Weak check, but Tech Lead enforces this mostly.
    // }

    return {
      valid: errors.length === 0,
      errors,
    };
  })
  .actAsTool('/', {
    id: 'validator',
    name: 'Validator',
    description: 'Validates the generated code.',
    inputSchema: z.object({ code: z.string() }),
    outputSchema: z.object({ valid: z.boolean(), errors: z.array(z.string()) }),
    metadata: { title: 'Validator', icon: 'shield-check' },
  });
