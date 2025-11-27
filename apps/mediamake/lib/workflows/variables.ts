import type { WorkflowVariable, SubstitutionContext } from './types';

/**
 * Variable Manager
 * Handles variable substitution and validation
 */
export class VariableManager {
  private variables: Map<string, WorkflowVariable>;

  constructor(variables: WorkflowVariable[]) {
    this.variables = new Map(variables.map(v => [v.name, v]));
  }

  /**
   * Substitute variables in a string
   * Replaces {{variableName}} with actual values
   */
  substitute(text: string, context?: SubstitutionContext): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let result = text;

    // Replace workflow variables
    this.variables.forEach((variable, name) => {
      const pattern = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
      result = result.replace(pattern, String(variable.value));
    });

    // Replace context variables (from node results)
    if (context?.nodeResults) {
      Object.entries(context.nodeResults).forEach(([key, value]) => {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(pattern, String(value));
      });
    }

    // Replace context-specific variables
    if (context?.variables) {
      Object.entries(context.variables).forEach(([key, value]) => {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(pattern, String(value));
      });
    }

    return result;
  }

  /**
   * Substitute variables in an object
   */
  substituteInObject(obj: any, context?: SubstitutionContext): any {
    if (typeof obj === 'string') {
      return this.substitute(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.substituteInObject(item, context));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteInObject(value, context);
      }
      return result;
    }

    return obj;
  }

  /**
   * Validate variables
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicate names
    const names = new Set<string>();
    this.variables.forEach((variable, name) => {
      if (names.has(name)) {
        errors.push(`Duplicate variable name: ${name}`);
      }
      names.add(name);
    });

    // Check for invalid names (should be alphanumeric + underscore)
    this.variables.forEach((variable, name) => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        errors.push(
          `Invalid variable name: ${name} (must start with letter or underscore, contain only alphanumeric characters and underscores)`,
        );
      }
    });

    // Check for empty names
    this.variables.forEach((variable, name) => {
      if (!name || name.trim() === '') {
        errors.push('Variable name cannot be empty');
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get a variable by name
   */
  get(name: string): WorkflowVariable | undefined {
    return this.variables.get(name);
  }

  /**
   * Get all variables
   */
  getAll(): WorkflowVariable[] {
    return Array.from(this.variables.values());
  }

  /**
   * Set a variable value
   */
  set(name: string, value: any): void {
    const variable = this.variables.get(name);
    if (variable) {
      variable.value = value;
    }
  }

  /**
   * Check if a string contains variable references
   */
  hasVariables(text: string): boolean {
    return /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/.test(text);
  }

  /**
   * Extract variable names from a string
   */
  extractVariableNames(text: string): string[] {
    const matches = text.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g);
    if (!matches) return [];

    return matches.map(match => {
      // Remove {{ and }}
      return match.slice(2, -2);
    });
  }
}

/**
 * Helper function to create a variable manager
 */
export function createVariableManager(
  variables: WorkflowVariable[],
): VariableManager {
  return new VariableManager(variables);
}

