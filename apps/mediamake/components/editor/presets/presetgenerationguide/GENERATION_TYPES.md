# Preset Types Reference (from `../../types`)

This guide mirrors the core TypeScript types used by presets so the generator
knows exactly what it can import from `../../types` and how to shape outputs.

```ts
'use client';

import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';

import { ObjectId } from 'mongodb';

export interface PresetMetadata {
  id: string;
  title: string;
  description?: string;
  type: 'predefined' | 'database';
  presetType: 'children' | 'data' | 'context' | 'effects' | 'full';
  targetId?: string; // For inserting into specific component
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  defaultInputParams?: any;
  dependencies?: {
    presets?: string[]; // IDs of other presets to inject
    helpers?: string[]; // Names of helper functions from stdlib to inject
  };
  // NEW: Preset selector configuration for dynamic schema loading
  presetSelector?: {
    field: string; // The field name that acts as the selector (e.g., 'animationStyle')
    mapping: Record<string, string>; // Maps selector value to preset ID
  };
  // Internal preset metadata - only used by other presets, not via insertPresetToComposition
  _internalPreset?: boolean; // Marks preset as internal-only (used as helper function)
  _internalPresetOutput?: 'effects' | 'children' | 'data'; // What to extract from internal preset output
}

export interface Preset {
  metadata: PresetMetadata;
  presetFunction: string; // Stringified function
  presetParams: any; // JSON schema
}

export interface PresetInputData {
  [key: string]: any;
}

export interface PresetPassedProps {
  config: InputCompositionProps['config'];
  style?: InputCompositionProps['style'];
  clip?: {
    start?: number;
    duration?: number;
  };
  fetcher?: (url: string, data?: any) => Promise<any>;
  baseData?: Record<string, any>; // Base data containing references for data:[key] replacement
  // Injected dependencies (populated at runtime by runPreset)
  helpers?: Record<string, Function>;
  presets?: Record<
    string,
    (params: any, props?: Partial<PresetPassedProps>) => Promise<PresetOutput>
  >;
}

export interface PresetOutput {
  output: Partial<InputCompositionProps>;
  options?: Partial<{
    attachedToId?: string;
    attachedContainers?: any;
    clip?: {
      start?: number;
      duration?: number;
    };
  }>;
}

export interface PresetConfiguration {
  style?: any;
  config?: any;
  [key: string]: any;
}

export interface PresetEditorState {
  selectedPreset: Preset | null;
  inputData: PresetInputData;
  configuration: PresetConfiguration;
  generatedOutput: InputCompositionProps | null;
  activeTab: 'input' | 'config' | 'output';
}

export interface PresetTab {
  id: 'input' | 'config' | 'output';
  label: string;
  description: string;
}

// MongoDB-specific types
export interface DatabasePreset {
  _id?: ObjectId;
  clientId?: string;
  metadata: PresetMetadata;
  presetFunction: string;
  presetParams: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePresetRequest {
  clientId?: string;
  metadata: Omit<PresetMetadata, 'id' | 'type' | 'createdAt' | 'updatedAt'>;
  presetFunction: string;
  presetParams: any;
}

export interface UpdatePresetRequest {
  metadata?: Partial<
    Omit<PresetMetadata, 'id' | 'type' | 'createdAt' | 'updatedAt'>
  >;
  presetFunction?: string;
  presetParams?: any;
}

export interface PresetListResponse {
  presets: DatabasePreset[];
  total: number;
  page: number;
  limit: number;
}

export interface PresetFilters {
  clientId?: string;
  type?: 'predefined' | 'database';
  presetType?: 'children' | 'data' | 'context' | 'effects' | 'full';
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface AppliedPreset {
  id: string;
  preset: Preset | DatabasePreset;
  inputData: PresetInputData;
  isExpanded: boolean;
  disabled?: boolean;
}

export interface AppliedPresetsState {
  presets: AppliedPreset[];
  activePresetId: string | null;
}
// --- Transcription Schemas ---

export const TranscriptionWordSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number(),
  absoluteStart: z.number(),
  end: z.number(),
  absoluteEnd: z.number(),
  duration: z.number(),
  confidence: z.number(),
});

export type TranscriptionWord = z.infer<typeof TranscriptionWordSchema>;

export const TranscriptionSentenceSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number(),
  absoluteStart: z.number(),
  end: z.number(),
  absoluteEnd: z.number(),
  duration: z.number(),
  words: z.array(TranscriptionWordSchema),
});

export type TranscriptionSentence = z.infer<typeof TranscriptionSentenceSchema>;

// --- Reference Types for Data Mutation ---

export interface ReferenceItem {
  key: string;
  type:
    | 'media'
    | 'medias'
    | 'captions'
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'objects';
  value: any;
}

export interface DefaultPresetData {
  references: ReferenceItem[];
}
```

**Imports the generator can use from `../../types`:**

- `PresetMetadata`, `PresetOutput`, `PresetPassedProps`
- `TranscriptionWord`, `TranscriptionSentence`
- Database-related types when needed (`DatabasePreset`, etc.)


