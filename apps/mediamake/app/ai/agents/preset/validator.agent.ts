/**
 * Validator Agent - Enhanced with ESLint Integration
 * 
 * This agent orchestrates preset code validation using server-side helpers.
 * Validates saved preset files (not temporary files) for better integration.
 * 
 * All heavy validation logic (TypeScript, ESLint, file operations) is in
 * helpers/validation.ts with "use server" directive.
 */

import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { validatePresetFile } from './helpers/validation';

const aiRouter = new AiRouter();

export const validatorAgent = aiRouter
  .agent('/', async (ctx) => {
    const { filePath } = ctx.request.params as { filePath: string };
    
    ctx.response.writeMessageMetadata({
      loader: 'Validating preset file...',
    });

    console.log('[VALIDATOR] Validating file:', filePath);

    // Run comprehensive validation on the saved file
    ctx.response.writeMessageMetadata({
      loader: 'Running structure & ESLint checks...',
    });

    const result = await validatePresetFile(filePath);

    if (result.warnings.length > 0 && result.errors.length === 0) {
      console.log('[VALIDATOR] Warnings (non-blocking):', result.warnings);
    }

    if (result.errors.length > 0) {
      console.warn('[VALIDATOR] Validation errors:', result.errors);
    } else {
      console.log('[VALIDATOR] ✅ All validation checks passed');
    }

    return result;
  })
  .actAsTool('/', {
    id: 'validator',
    name: 'Validator',
    description: 'Validates a saved preset file: forbidden patterns (fs/path/external URLs), structure validation (presetExecution), and ESLint (code quality). No TypeScript type checking to avoid false positives.',
    inputSchema: z.object({ 
      filePath: z.string().describe('Absolute path to the preset file to validate')
    }),
    outputSchema: z.object({ 
      valid: z.boolean(), 
      errors: z.array(z.string()),
      warnings: z.array(z.string()),
    }),
    metadata: { title: 'Validator', icon: 'shield-check' },
  });
