// import { z } from 'zod/v4';
// import { ObjectId } from 'mongodb';

// /**
//  * Custom Image Prompt Model
//  * 
//  * Manages user-created custom prompts for text-to-image generation.
//  * Custom prompts can override built-in presets or create entirely new ones.
//  */

// // Zod schema for validation
// export const CustomImagePromptSchema = z.object({
//   id: z.string().min(1).describe('Unique identifier for the prompt preset (e.g., "my-custom-style")'),
//   name: z.string().min(1).describe('Human-readable name for display'),
//   description: z.string().describe('Brief description of the visual style'),
//   systemPrompt: z.string().min(10).describe('The full system prompt text for the AI'),
//   category: z
//     .enum(['illustration', 'realistic', 'abstract', 'minimalist', 'artistic', 'cinematic'])
//     .optional()
//     .describe('Category for organization'),
//   tags: z.array(z.string()).optional().describe('Tags for searching and filtering'),
//   thumbnailExample: z.string().optional().describe('Example image URL or description'),
//   isBuiltInOverride: z.boolean().optional().describe('Whether this overrides a built-in preset'),
//   originalPresetId: z.string().optional().describe('ID of the preset this was based on'),
//   userId: z.string().optional().describe('User ID who created this prompt'),
//   clientId: z.string().optional().describe('Client ID for multi-tenant systems'),
// });

// // MongoDB document type (includes database fields)
// export interface CustomImagePromptDocument extends z.infer<typeof CustomImagePromptSchema> {
//   _id?: ObjectId;
//   isCustom: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// // Response type (for API responses)
// export interface CustomImagePromptResponse {
//   id: string;
//   name: string;
//   description: string;
//   systemPrompt: string;
//   category?: string;
//   tags?: string[];
//   thumbnailExample?: string;
//   isCustom: boolean;
//   isBuiltInOverride?: boolean;
//   originalPresetId?: string;
//   userId?: string;
//   clientId?: string;
//   createdAt?: string;
//   updatedAt?: string;
// }

// /**
//  * Convert database document to API response format
//  */
// export function customPromptDocumentToResponse(
//   doc: CustomImagePromptDocument
// ): CustomImagePromptResponse {
//   return {
//     id: doc.id,
//     name: doc.name,
//     description: doc.description,
//     systemPrompt: doc.systemPrompt,
//     category: doc.category,
//     tags: doc.tags,
//     thumbnailExample: doc.thumbnailExample,
//     isCustom: doc.isCustom,
//     isBuiltInOverride: doc.isBuiltInOverride,
//     originalPresetId: doc.originalPresetId,
//     userId: doc.userId,
//     clientId: doc.clientId,
//     createdAt: doc.createdAt?.toISOString(),
//     updatedAt: doc.updatedAt?.toISOString(),
//   };
// }

// /**
//  * Create indexes for the customImagePrompts collection
//  * Call this during database initialization
//  */
// export async function createCustomImagePromptIndexes(db: any) {
//   const collection = db.collection('customImagePrompts');
  
//   await collection.createIndex({ id: 1 }, { unique: true });
//   await collection.createIndex({ userId: 1 });
//   await collection.createIndex({ clientId: 1 });
//   await collection.createIndex({ category: 1 });
//   await collection.createIndex({ tags: 1 });
//   await collection.createIndex({ createdAt: -1 });
  
//   console.log('CustomImagePrompt indexes created successfully');
// }

