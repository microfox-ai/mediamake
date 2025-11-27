import { z } from 'zod';
import type { SchemaField, WorkflowDataType } from './types';

/**
 * Parse Zod schema to extract field definitions
 */
export function parseZodSchema(schema: any): SchemaField[] {
  // Handle both _def (standard Zod) and def (arctype/other schema libs)
  const def = schema?._def || schema?.def;
  
  if (!schema || !def) {
    return [];
  }

  const fields: SchemaField[] = [];

  try {
    // Handle ZodObject or object type
    const typeName = def.typeName || schema?.type;
    const isObjectType = typeName === 'ZodObject' || typeName === 'object';
    
    if (isObjectType) {
      // Get shape from either shape() method or direct shape property
      const shape = typeof def.shape === 'function' ? def.shape() : def.shape || schema?.shape;
      
      if (!shape) {
        return [];
      }
      
      for (const [key, value] of Object.entries(shape)) {
        const fieldType = zodTypeToWorkflowType(value as z.ZodType);
        const field: SchemaField = {
          name: key,
          type: fieldType,
          required: !isOptional(value as z.ZodType),
          description: getDescription(value as z.ZodType),
          default: getDefault(value as z.ZodType),
        };
        fields.push(field);
      }
    }
  } catch (error) {
    console.error('Failed to parse schema:', error);
  }

  return fields;
}

/**
 * Convert Zod type to workflow data type
 */
export function zodTypeToWorkflowType(zodType: any): WorkflowDataType {
  const def = zodType?._def || zodType?.def;
  
  if (!zodType || !def) {
    return 'any';
  }

  const typeName = def.typeName || zodType?.type;

  switch (typeName) {
    case 'ZodString':
    case 'string':
      return 'text';
    case 'ZodNumber':
    case 'number':
      return 'number';
    case 'ZodBoolean':
    case 'boolean':
      return 'boolean';
    case 'ZodArray':
    case 'array':
      return 'array';
    case 'ZodObject':
    case 'object':
      // Check if it's a media object (has url field)
      if (hasUrlField(zodType)) {
        return 'media';
      }
      return 'object';
    case 'ZodOptional':
    case 'optional':
      return zodTypeToWorkflowType(def.innerType || zodType?.innerType);
    case 'ZodNullable':
    case 'nullable':
      return zodTypeToWorkflowType(def.innerType || zodType?.innerType);
    case 'ZodDefault':
    case 'default':
      return zodTypeToWorkflowType(def.innerType || zodType?.innerType);
    case 'ZodEnum':
    case 'enum':
      return 'text'; // Treat enums as text
    case 'ZodUnion':
    case 'ZodIntersection':
    case 'union':
    case 'intersection':
      return 'any';
    default:
      return 'any';
  }
}

/**
 * Check if a Zod object has a url field (indicates media type)
 */
function hasUrlField(zodType: any): boolean {
  try {
    const def = zodType?._def || zodType?.def;
    const typeName = def?.typeName || zodType?.type;
    
    if (typeName === 'ZodObject' || typeName === 'object') {
      const shape = typeof def?.shape === 'function' ? def.shape() : def?.shape || zodType?.shape;
      return shape && 'url' in shape;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Check if a Zod type is optional
 */
function isOptional(zodType: any): boolean {
  const def = zodType?._def || zodType?.def;
  
  if (!zodType || !def) {
    return false;
  }

  const typeName = def.typeName || zodType?.type;

  return (
    typeName === 'ZodOptional' ||
    typeName === 'optional' ||
    typeName === 'ZodNullable' ||
    typeName === 'nullable' ||
    typeName === 'ZodDefault' ||
    typeName === 'default'
  );
}

/**
 * Get description from Zod type
 */
function getDescription(zodType: any): string | undefined {
  try {
    const def = zodType?._def || zodType?.def;
    return def?.description || zodType?.description;
  } catch {
    return undefined;
  }
}

/**
 * Get default value from Zod type
 */
function getDefault(zodType: any): any {
  try {
    const def = zodType?._def || zodType?.def;
    const typeName = def?.typeName || zodType?.type;
    
    if (typeName === 'ZodDefault' || typeName === 'default') {
      const defaultValue = def?.defaultValue;
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Generate input handles from schema
 */
export function generateInputHandles(schema: any) {
  const fields = parseZodSchema(schema);
  return fields.map(field => ({
    id: field.name,
    label: field.name,
    type: field.type,
    required: field.required,
  }));
}

/**
 * Generate output handles from schema
 */
export function generateOutputHandles(schema: any) {
  const fields = parseZodSchema(schema);
  return fields.map(field => ({
    id: field.name,
    label: field.name,
    type: field.type,
  }));
}

