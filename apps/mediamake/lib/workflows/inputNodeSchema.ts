import { z } from 'zod';
import type { InputNodeData } from './types';

/**
 * Creates a Zod schema dynamically from InputNode fields
 * This allows InputNode to use SchemaForm for rendering
 */
export function createSchemaFromInputFields(fields: InputNodeData['fields']): z.ZodObject<any> {
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  
  if (!fields || fields.length === 0) {
    return z.object({});
  }

  fields.forEach(field => {
    switch (field.type) {
      case 'text':
        schemaFields[field.name] = z.string().optional().describe(`Text field for ${field.name}`);
        break;
      case 'number':
        schemaFields[field.name] = z.number().optional().describe(`Number field for ${field.name}`);
        break;
      case 'boolean':
        schemaFields[field.name] = z.boolean().optional().describe(`Boolean field for ${field.name}`);
        break;
      case 'array':
        schemaFields[field.name] = z.array(z.any()).optional().describe(`Array field for ${field.name}`);
        break;
      case 'media':
        schemaFields[field.name] = z.string().optional().describe(`Media URL field for ${field.name}`);
        break;
      default:
        schemaFields[field.name] = z.string().optional().describe(`Field for ${field.name}`);
    }
  });
  
  return z.object(schemaFields);
}

/**
 * Converts InputNode fields array to a flat object for SchemaForm
 */
export function fieldsToConfigObject(fields: InputNodeData['fields']): Record<string, any> {
  const config: Record<string, any> = {};
  
  if (!fields) return config;
  
  fields.forEach(field => {
    config[field.name] = field.value || '';
  });
  
  return config;
}

/**
 * Converts SchemaForm config object back to InputNode fields array
 */
export function configObjectToFields(
  config: Record<string, any>,
  existingFields: InputNodeData['fields']
): InputNodeData['fields'] {
  if (!existingFields) return [];
  
  return existingFields.map(field => ({
    ...field,
    value: config[field.name] !== undefined ? config[field.name] : field.value,
  }));
}

