import React from 'react';
import type { ZodType } from 'zod';
import { ComponentType } from './renderable.types';
import { BaseRenderableProps } from './renderable.types';

export type RegistryComponentType = 'frame' | 'layout' | 'atom';

export interface ComponentConfig {
  displayName: string;
  type?: ComponentType;
  isInnerSequence?: boolean;
  /**
   * Zod schema of this atom's `data`. The editor turns it into the atom
   * block's form. Omit it and the block gets one raw JSON data field.
   */
  inputSchema?: ZodType;
  /** When false, the atom is hidden from Add Atoms. Defaults to shown. */
  editorBlock?: boolean;
  // Component-specific configuration
  [key: string]: any;
}

export interface ComponentRegistryEntry {
  component: React.ComponentType<BaseRenderableProps>;
  config: ComponentConfig;
  /** Stored from registerComponent. Package entries may omit it. */
  type?: RegistryComponentType;
}

export interface ComponentRegistry {
  [key: string]: ComponentRegistryEntry;
}

export interface RegistryEntry {
  type: ComponentType;
  component: React.ComponentType<BaseRenderableProps>;
  config: ComponentConfig;
  package?: string;
}

export interface PackageRegistry {
  [packageName: string]: {
    [componentName: string]: {
      component: React.ComponentType<BaseRenderableProps>;
      config: ComponentConfig;
    };
  };
}
