import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { PresetGeneratorInputSchema, PresetGeneratorOutputSchema } from './helpers/schema';
import { ragAgent } from './rag.agent';
import { architectAgent } from './architect.agent';
import { techLeadAgent } from './tech-lead.agent';
import { coderAgent } from './coder.agent';
import { validatorAgent } from './validator.agent';
import { savePresetToFile } from './helpers/fs-writer';
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

    // --- 4. CODING ---
    let code = '';
    let codingAttempts = 0;
    const maxCodingAttempts = 3;
    let lastErrors: string[] = [];
    let success = false;
    let generatedMeta = null;

    console.log('[GENERATE] Step 4: Coding started');
    while (codingAttempts < maxCodingAttempts) {
        ctx.response.writeMessageMetadata({ text: `💻 Coding preset (Attempt ${codingAttempts + 1})...` });
        console.log(`[GENERATE] Coding Attempt ${codingAttempts + 1}/${maxCodingAttempts}`);
        
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

        ctx.response.writeMessageMetadata({ text: '🛡️ Validating code...' });
        const validatorResult = await ctx.next.callAgent('/validator', { code });
        
        if ((validatorResult as any).ok && (validatorResult as any).data.valid) {
            success = true;
            console.log('[GENERATE] Validation passed');
            break;
        }

        const errors = (validatorResult as any).data.errors || ['Unknown validation error'];
        console.warn('[GENERATE] Validation Errors:', errors);
        lastErrors = errors;
        codingAttempts++;
    }
    console.log(`[GENERATE] Step 4 Complete: Success=${success}`);

    if (!success) {
        throw new Error(`Failed to generate valid code after ${maxCodingAttempts} attempts.`);
    }

    // --- 5. SAVE ---
    const presetId = plan.metadata.idProposal || `preset-${Date.now()}`;
    ctx.response.writeMessageMetadata({ text: `💾 Saving preset '${presetId}' to disk...` });
    console.log(`[GENERATE] Step 5: Saving preset ID='${presetId}'`);
    
    try {
        const filepath = await savePresetToFile(presetId, code);
        console.log(`[GENERATE] Saved successfully to ${filepath}`);
        ctx.response.writeMessageMetadata({ text: '🎉 Preset Saved!' });
    } catch (e) {
        console.error('[GENERATE] Save error:', e);
        ctx.response.writeMessageMetadata({ text: '⚠️ Saved to disk failed.' });
    }
    
    return {
        code,
        metadata: {
            id: presetId,
            title: generatedMeta.title,
            description: generatedMeta.description,
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

