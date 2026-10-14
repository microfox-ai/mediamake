import React from 'react';
import {
  ComponentRegistry,
  ComponentRegistryEntry,
  PackageRegistry,
  ComponentConfig,
  RegistryComponentType,
} from '../types';

class ComponentRegistryManager {
  private registry: ComponentRegistry = {};
  private packageRegistry: PackageRegistry = {};

  registerComponent(
    name: string,
    component: React.ComponentType<any>,
    type: RegistryComponentType,
    config: ComponentConfig = { displayName: '' },
    packageName?: string
  ): void {
    this.registry[name] = { component, config, type };

    if (packageName) {
      if (!this.packageRegistry[packageName]) {
        this.packageRegistry[packageName] = {};
      }
      this.packageRegistry[packageName][name] = { component, config };
    }
  }

  registerEffect(
    name: string,
    component: React.ComponentType<any>,
    config: ComponentConfig = { displayName: '' },
    packageName?: string
  ): void {
    // Effects are registered as layout components since they use the same rendering logic
    this.registerComponent(
      name?.includes('effect-') ? name : `effect-${name}`,
      component,
      'layout',
      config,
      packageName
    );
  }

  getComponent(name: string): React.ComponentType<any> | undefined {
    return this.registry[name]?.component;
  }

  getComponentConfig(name: string): ComponentConfig | undefined {
    return this.registry[name]?.config;
  }

  getComponentWithConfig(name: string): ComponentRegistryEntry | undefined {
    return this.registry[name];
  }

  /** Atoms that should appear as addable blocks. Hidden when editorBlock is false. */
  listRegisteredAtoms(): RegisteredAtom[] {
    return Object.entries(this.registry)
      .filter(
        ([, entry]) =>
          entry.type === 'atom' && entry.config?.editorBlock !== false,
      )
      .map(([componentId, entry]) => ({
        componentId,
        displayName: entry.config?.displayName || componentId,
        inputSchema: entry.config?.inputSchema,
        category: entry.config?.category,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  registerPackage(
    packageName: string,
    components: Record<
      string,
      { component: React.ComponentType<any>; config: ComponentConfig }
    >
  ): void {
    this.packageRegistry[packageName] = components;

    // Register each component with package prefix
    Object.entries(components).forEach(([name, { component, config }]) => {
      this.registry[`${packageName}:${name}`] = { component, config };
    });
  }

  getPackageComponents(
    packageName: string
  ):
    | Record<
        string,
        { component: React.ComponentType<any>; config: ComponentConfig }
      >
    | undefined {
    return this.packageRegistry[packageName];
  }

  getAllComponents(): ComponentRegistry {
    return { ...this.registry };
  }

  /** Returns registered effect ids and display names for UI (effect type selector). */
  getRegisteredEffects(): { id: string; displayName: string }[] {
    return Object.entries(this.registry)
      .filter(([key]) => key.startsWith('effect-'))
      .map(([key, entry]) => ({
        id: key.replace(/^effect-/, ''),
        displayName: entry.config?.displayName || key.replace(/^effect-/, ''),
      }));
  }

  clear(): void {
    this.registry = {};
    this.packageRegistry = {};
  }
}

export const componentRegistry = new ComponentRegistryManager();

// Convenience functions
export interface RegisteredAtom {
  componentId: string;
  displayName: string;
  inputSchema?: ComponentConfig['inputSchema'];
  category?: string;
}

export const registerComponent = (
  name: string,
  component: React.ComponentType<any>,
  type: RegistryComponentType,
  config: ComponentConfig = { displayName: '' },
  packageName?: string
) => {
  componentRegistry.registerComponent(
    name,
    component,
    type,
    config,
    packageName
  );
};

export const registerEffect = (
  name: string,
  component: React.ComponentType<any>,
  config: ComponentConfig = { displayName: '' },
  packageName?: string
) => {
  componentRegistry.registerEffect(name, component, config, packageName);
};

export const registerPackage = (
  packageName: string,
  components: Record<
    string,
    { component: React.ComponentType<any>; config: ComponentConfig }
  >
) => {
  componentRegistry.registerPackage(packageName, components);
};

export const getComponent = (name: string) =>
  componentRegistry.getComponent(name);

export const getComponentConfig = (name: string) =>
  componentRegistry.getComponentConfig(name);

export const getComponentWithConfig = (name: string) =>
  componentRegistry.getComponentWithConfig(name);

export const getRegisteredEffects = () =>
  componentRegistry.getRegisteredEffects();

export const listRegisteredAtoms = () =>
  componentRegistry.listRegisteredAtoms();
