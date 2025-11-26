/**
 * Generate Agent - Orchestrates Preset Generation Workflow
 * 
 * This agent coordinates the complete preset generation pipeline:
 * 1. RAG Search - Find relevant examples from existing presets
 * 2. Architecture - Design the component structure
 * 3. Tech Lead Review - Validate the architectural plan
 * 4. Coding + Validation Loop (with ESLint integration):
 *    - Coder generates code
 *    - Validator runs comprehensive checks (creates temp file, validates, cleans up)
 *    - If errors found, feedback is sent back to coder for fixes
 *    - Loop continues up to 3 attempts
 * 5. Save - Write validated preset to filesystem
 * 
 * The validation feedback loop ensures all generated code meets
 * quality standards before being saved. The file is saved by this agent,
 * and external workflows (like GitHub Actions) just commit the saved file.
 */

import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { PresetGeneratorInputSchema, PresetGeneratorOutputSchema } from './helpers/schema';
import { ragAgent } from './rag.agent';
import { architectAgent } from './architect.agent';
import { techLeadAgent } from './tech-lead.agent';
import { coderAgent } from './coder.agent';
import { validatorAgent } from './validator.agent';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const aiRouter = new AiRouter();

export const generateAgent = aiRouter
  .agent('/rag', ragAgent)
  .agent('/architect', architectAgent)
  .agent('/tech-lead', techLeadAgent)
  .agent('/coder', coderAgent)
  .agent('/validator', validatorAgent)
  .agent('/', async (ctx) => {
    const { prompt, metadata, clientId } = ctx.request.params as {
      prompt: string;
      metadata?: any;
      clientId?: string;
    };

    // --- 0. ENRICHMENT (Optional) ---
    // If prompt is too short, enrich it? For now, assume prompt is okay or rely on architect.
    
    ctx.response.writeMessageMetadata({ text: `🤖 Generator Started: "${prompt}"` });

    // --- 1. RAG SEARCH ---
    // Use RAG to understand existing presets/effects for better reuse,
    // but we still generate exactly ONE preset per request.
    ctx.response.writeMessageMetadata({ text: '🔍 Researching component library...' });
    console.log('[GENERATE] Step 1: RAG Search started');
    const ragResult = await ctx.next.callAgent('/rag', { query: prompt });
    const ragItems = (ragResult as any).ok ? (ragResult as any).data || [] : [];
    console.log(`[GENERATE] Step 1 Complete: Found ${ragItems.length} RAG results`);

    // --- 2. ARCHITECTURAL DESIGN ---
    ctx.response.writeMessageMetadata({ text: '🏗️ Architecting component structure...' });
    console.log('[GENERATE] Step 2: Architect started');
    let planResult = await ctx.next.callAgent('/architect', { prompt, ragResults: ragItems });
    if (!(planResult as any).ok) throw new Error('Architecture planning failed');
    
    let plan = (planResult as any).data;
    console.log(`[GENERATE] Step 2 Complete: Plan created with ${plan.structure?.length || 0} components, ${plan.dependencies?.length || 0} dependencies`);

    // --- 3. TECH LEAD REVIEW ---
    ctx.response.writeMessageMetadata({ text: '🧐 Tech Lead reviewing plan...' });
    console.log('[GENERATE] Step 3: Tech Lead review started');
    let attempts = 0;
    let reviewPassed = false;
    
    while (!reviewPassed && attempts < 2) {
        const reviewResult = await ctx.next.callAgent('/tech-lead', { plan });
        if (!(reviewResult as any).ok) break;

        const review = (reviewResult as any).data;
        console.log(`[GENERATE] Tech Lead Review (Attempt ${attempts + 1}): Approved=${review.approved}`);
        
        if (review.approved) {
            reviewPassed = true;
            if (review.revisedPlan) {
                plan = review.revisedPlan;
                console.log('[GENERATE] Plan revised by Tech Lead');
                ctx.response.writeMessageMetadata({ text: '✅ Plan approved with improvements.' });
            } else {
                ctx.response.writeMessageMetadata({ text: '✅ Plan approved.' });
            }
        } else {
            console.warn(`[GENERATE] Plan rejected: ${review.critique}`);
            ctx.response.writeMessageMetadata({ text: `⚠️ Plan rejected: ${review.critique}. Re-architecting...` });
            const refineResult = await ctx.next.callAgent('/architect', { 
                prompt: `${prompt}\n\nCRITICAL FEEDBACK: ${review.critique}\nSUGGESTIONS: ${review.suggestions.join(', ')}`,
                ragResults: ragItems
            });
            if ((refineResult as any).ok) {
                plan = (refineResult as any).data;
            }
            attempts++;
        }
    }
    console.log('[GENERATE] Step 3 Complete: Review passed');

    // --- 4. CODING & VALIDATION LOOP ---
    let code = '';
    let codingAttempts = 0;
    const maxCodingAttempts = 3;
    let lastErrors: string[] = [];
    let success = false;
    let generatedMeta = null;
    const presetId = plan.metadata.idProposal || `preset-${Date.now()}`;

    console.log('[GENERATE] Step 4: Coding & Validation Loop started');
    while (codingAttempts < maxCodingAttempts) {
        ctx.response.writeMessageMetadata({ text: `💻 Coding preset (Attempt ${codingAttempts + 1})...` });
        console.log(`[GENERATE] Coding Attempt ${codingAttempts + 1}/${maxCodingAttempts}`);
        
        // Generate code
        const coderResult = await ctx.next.callAgent('/coder', {
            prompt,
            plan,
            ragResults: ragItems,
            feedback: lastErrors
        });

        if (!(coderResult as any).ok) throw new Error('Coding failed');
        const output = (coderResult as any).data;
        code = output.code;
        generatedMeta = output.metadata;
        console.log(`[GENERATE] Code generated (${code.length} chars). Metadata: ${JSON.stringify(generatedMeta)}`);

        // Validate the code (validator will handle temp file creation and cleanup)
        ctx.response.writeMessageMetadata({ text: '🛡️ Validating code (TypeScript, structure, ESLint)...' });
        const validatorResult = await ctx.next.callAgent('/validator', { 
            code, 
            presetId 
        });
        
        if ((validatorResult as any).ok && (validatorResult as any).data.valid) {
            success = true;
            const warnings = (validatorResult as any).data.warnings || [];
            console.log('[GENERATE] Validation passed');
            
            if (warnings.length > 0) {
                console.log('[GENERATE] Warnings (non-blocking):', warnings);
                ctx.response.writeMessageMetadata({ text: `✅ Validation passed (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` });
            } else {
                ctx.response.writeMessageMetadata({ text: '✅ All validation checks passed!' });
            }
            ctx.response.writeMessageMetadata({ text: '🎉 Preset Validated!' });
            break;
        }

        const errors = (validatorResult as any).data.errors || ['Unknown validation error'];
        console.warn('[GENERATE] Validation Errors:', errors);
        ctx.response.writeMessageMetadata({ text: `❌ Validation failed (${errors.length} error${errors.length > 1 ? 's' : ''}). Fixing & retrying...` });
        lastErrors = errors;
        codingAttempts++;
    }
    console.log(`[GENERATE] Step 4 Complete: Success=${success}`);

    if (!success) {
        const errorSummary = lastErrors.slice(0, 3).join('; ');
        ctx.response.writeMessageMetadata({ 
            text: `❌ Failed after ${maxCodingAttempts} attempts. Last errors: ${errorSummary}` 
        });
        throw new Error(
            `Failed to generate valid code after ${maxCodingAttempts} attempts. ` +
            `Validation errors: ${lastErrors.join(' | ')}`
        );
    }
    
    // --- 5. SAVE VALIDATED CODE ---
    ctx.response.writeMessageMetadata({ text: '💾 Saving validated preset...' });
    console.log('[GENERATE] Step 5: Saving validated code');
    
    let finalFilePath = '';
    try {
        const { savePresetToFile } = await import('./helpers/fs-writer');
        finalFilePath = await savePresetToFile(presetId, code);
        console.log(`[GENERATE] Saved to: ${finalFilePath}`);
        ctx.response.writeMessageMetadata({ text: `✅ Saved to ${finalFilePath}` });
    } catch (e) {
        console.error('[GENERATE] Save error:', e);
        throw new Error(`Failed to save validated preset: ${e}`);
    }
    console.log('[GENERATE] Step 5 Complete');
    
    // Return the validated code and file path
    return {
        code,
        metadata: {
            id: presetId,
            title: generatedMeta?.title || 'Generated Preset',
            description: generatedMeta?.description || 'Preset generated via API',
            filePath: finalFilePath,
        }
    };
  })
  .actAsTool('/', {
    id: 'presetGeneratorExecutor',
    name: 'Generate Preset',
    description: 'Executes the preset generation workflow (Plan -> Code -> Save).',
    inputSchema: PresetGeneratorInputSchema,
    outputSchema: PresetGeneratorOutputSchema,
    metadata: { title: 'Generate Preset', icon: 'film' },
  });

