/**
 * Validator Agent - Enhanced with ESLint Integration
 * 
 * This agent orchestrates preset code validation using server-side helpers.
 * Creates temp files for validation, runs checks, and cleans up automatically.
 * 
 * All heavy validation logic (TypeScript, ESLint, file operations) is in
 * helpers/validation.ts with "use server" directive.
 */

import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { validatePresetCode } from './helpers/validation';

const aiRouter = new AiRouter();

export const validatorAgent = aiRouter
  .agent('/', async (ctx) => {
    const { code, presetId } = ctx.request.params as { code: string; presetId: string };
    
    ctx.response.writeMessageMetadata({
      loader: 'Validating preset code...',
    });

    console.log(`[VALIDATOR] Validating preset: ${presetId}`);

    // Run comprehensive validation (creates temp file, validates, cleans up)
    ctx.response.writeMessageMetadata({
      loader: 'Running structure & ESLint checks...',
    });

    const result = await validatePresetCode(code, presetId);

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
    description: 'Validates preset code: forbidden patterns (fs/path/external URLs), structure validation (presetExecution), and ESLint (code quality). Creates temp file for validation and cleans up automatically.',
    inputSchema: z.object({ 
      code: z.string().describe('The preset TypeScript code to validate'),
      presetId: z.string().describe('ID of the preset (used for temp filename)')
    }),
    outputSchema: z.object({ 
      valid: z.boolean(), 
      errors: z.array(z.string()),
      warnings: z.array(z.string()),
    }),
    metadata: { title: 'Validator', icon: 'shield-check' },
  });
