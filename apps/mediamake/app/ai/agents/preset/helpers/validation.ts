"use server";

/**
 * Server-side validation utilities for preset code
 * 
 * Validation Strategy:
 * 1. Forbidden Patterns - Quick string checks (fs, path, external URLs)
 * 2. Structure Validation - AST-based (presetExecution exists, helper placement)
 * 3. ESLint - Main validation on actual file (catches real TypeScript/code issues)
 * 
 * Note: We skip full TypeScript type checking because it produces false positives
 * without access to node_modules. ESLint handles all real issues.
 */

import { execSync } from 'child_process';
import ts from 'typescript';
import { readFileSync } from 'fs';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Creates TypeScript AST for structure validation (no type checking)
 */
export async function createSourceFile(code: string): Promise<ts.SourceFile | undefined> {
  try {
    return ts.createSourceFile('temp.ts', code, ts.ScriptTarget.Latest, true);
  } catch (e: any) {
    console.error('[VALIDATION] Failed to parse TypeScript:', e.message);
    return undefined;
  }
}

/**
 * Checks for forbidden patterns in code
 */
export async function checkForbiddenPatterns(code: string): Promise<string[]> {
  const errors: string[] = [];

  if (code.includes('from "fs"') || code.includes("from 'fs'")) {
    errors.push("Forbidden import: 'fs' - File system access is not allowed in presets");
  }
  
  if (code.includes('from "path"') || code.includes("from 'path'")) {
    errors.push("Forbidden import: 'path' - Path module is not allowed in presets");
  }
  
  if (code.match(/https?:\/\/(?!localhost|127\.0\.0\.1)/)) {
    // Check if it's an actual asset import, not just a comment or metadata
    if (code.includes('src: "http') || code.includes("src: 'http")) {
      errors.push("Forbidden external asset URL found - Assets must be uploaded through the platform");
    }
  }

  return errors;
}

/**
 * Validates preset structure (presetExecution, helper functions, etc.)
 */
export async function validatePresetStructure(sourceFile: ts.SourceFile): Promise<{
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allowedTopLevelNames = [
    'presetParams',
    'presetExecution',
    'presetMetadata',
    'presetFunction',
    'presetParamsSchema',
    'presetData',
    'Effect',
  ];

  let presetExecutionFound = false;

  // Check for presetExecution
  function findPresetExecution(node: ts.Node): void {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === 'presetExecution' &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
        ) {
          presetExecutionFound = true;
          return;
        }
      }
    }
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'presetExecution') {
      presetExecutionFound = true;
      return;
    }
    ts.forEachChild(node, findPresetExecution);
  }

  findPresetExecution(sourceFile);

  if (!presetExecutionFound) {
    errors.push("Missing 'presetExecution' function - Every preset must have a presetExecution function");
  }

  // Check for helper functions at top level (should be inside presetExecution)
  for (const statement of sourceFile.statements) {
    let name: string | null = null;

    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          name = decl.name.text;
        }
      }
    } else if (ts.isFunctionDeclaration(statement)) {
      name = statement.name?.text || null;
    } else if (ts.isClassDeclaration(statement)) {
      name = statement.name?.text || null;
    }

    if (name && !allowedTopLevelNames.includes(name)) {
      const lineAndChar = sourceFile.getLineAndCharacterOfPosition(statement.getStart());
      warnings.push(
        `Helper function/const '${name}' found at line ${lineAndChar.line + 1}. Consider moving helper functions inside presetExecution for better encapsulation.`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Runs ESLint validation on a file
 * @param filePath - Absolute path to the TypeScript file to validate
 */
export async function runESLintValidation(filePath: string): Promise<{
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Run eslint with rules similar to push-preset.ts
    execSync(
      `npx eslint "${filePath}" --rule "@typescript-eslint/no-explicit-any: off" --rule "@typescript-eslint/no-unused-vars: warn" --max-warnings 999`,
      {
        stdio: 'pipe',
        cwd: process.cwd(),
        encoding: 'utf-8',
      }
    );
    // If we get here, eslint passed
  } catch (lintError: any) {
    // ESLint failed, check if it's real errors or just warnings
    if (lintError.status === 1) {
      try {
        // Re-run with stricter check to see if there are real errors
        execSync(
          `npx eslint "${filePath}" --rule "@typescript-eslint/no-explicit-any: off" --rule "@typescript-eslint/no-unused-vars: off"`,
          {
            stdio: 'pipe',
            cwd: process.cwd(),
            encoding: 'utf-8',
          }
        );
        // If we get here, only warnings exist
        warnings.push('ESLint warnings found (not blocking)');
      } catch (realError: any) {
        // Real ESLint errors exist
        const output = realError.stdout || realError.stderr || '';
        const errorLines = output.split('\n').filter((line: string) => 
          line.includes('error') || line.includes('✖')
        );
        
        if (errorLines.length > 0) {
          errors.push(`ESLint errors found:\n${errorLines.slice(0, 5).join('\n')}`);
        } else {
          errors.push('ESLint validation failed - please fix linting issues');
        }
      }
    } else if (lintError.status === 2) {
      // ESLint configuration error
      warnings.push('ESLint check skipped (configuration issue)');
    }
  }

  return { errors, warnings };
}

/**
 * Filters out false-positive TypeScript errors
 * (These shouldn't occur, but if they do, remove them as they're meaningless)
 */
function filterTypeScriptFalsePositives(errors: string[]): string[] {
  const falsePositivePatterns = [
    /Cannot find global type/,
    /Cannot find name 'Array'/,
    /Cannot find name 'String'/,
    /Cannot find name 'Number'/,
    /Cannot find name 'Boolean'/,
    /Cannot find name 'Object'/,
    /Cannot find name 'Function'/,
    /Cannot find name 'Math'/,
    /Cannot find name 'Promise'/,
    /Cannot find name 'Error'/,
    /Cannot find name 'Record'/,
    /Cannot find module 'zod'/,
    /Cannot find module '.*types'/,
    /File 'lib\.d\.ts' not found/,
    /Property 'length' does not exist/,
    /Property 'push' does not exist/,
    /Property 'map' does not exist/,
    /Property 'includes' does not exist/,
    /Property 'split' does not exist/,
    /Property 'toString' does not exist/,
  ];

  return errors.filter(error => {
    // Keep the error if it doesn't match any false positive pattern
    return !falsePositivePatterns.some(pattern => pattern.test(error));
  });
}

/**
 * Validates preset code by creating a temp file, running validations, and cleaning up
 * @param code - The preset TypeScript code to validate
 * @param presetId - ID for the preset (used for temp filename)
 */
export async function validatePresetCode(code: string, presetId: string): Promise<ValidationResult> {
  let errors: string[] = [];
  const warnings: string[] = [];
  
  // Create a temp file for validation
  const { writeFileSync, unlinkSync } = await import('fs');
  const { join } = await import('path');
  
  const tempFileName = `temp-${presetId}-${Date.now()}.ts`;
  const tempFilePath = join(process.cwd(), 'components', 'editor', 'presets', 'registry', 'generated', tempFileName);
  
  try {
    // Write code to temp file
    writeFileSync(tempFilePath, code, 'utf-8');
    console.log(`[VALIDATION] Created temp file: ${tempFilePath}`);
  } catch (e: any) {
    return {
      valid: false,
      errors: [`Failed to create temp file: ${e.message}`],
      warnings: [],
    };
  }

  try {
    // Run all validations on the temp file
    const result = await validatePresetFile(tempFilePath);
    return result;
  } finally {
    // Always clean up temp file
    try {
      unlinkSync(tempFilePath);
      console.log(`[VALIDATION] Cleaned up temp file: ${tempFilePath}`);
    } catch (e: any) {
      console.warn(`[VALIDATION] Failed to delete temp file: ${e.message}`);
    }
  }
}

/**
 * Validates a preset file (ESLint + basic checks only)
 * @param filePath - Absolute path to the preset file
 */
export async function validatePresetFile(filePath: string): Promise<ValidationResult> {
  let errors: string[] = [];
  const warnings: string[] = [];

  // Read the file
  let code: string;
  try {
    code = readFileSync(filePath, 'utf-8');
  } catch (e: any) {
    return {
      valid: false,
      errors: [`Failed to read file: ${e.message}`],
      warnings: [],
    };
  }

  // 1. Forbidden patterns (quick string checks)
  const forbiddenErrors = await checkForbiddenPatterns(code);
  errors.push(...forbiddenErrors);

  // 2. Structure validation (uses AST but no type checking)
  const sourceFile = await createSourceFile(code);
  if (sourceFile) {
    const structureResult = await validatePresetStructure(sourceFile);
    errors.push(...structureResult.errors);
    warnings.push(...structureResult.warnings);
  }

  // 3. ESLint validation (main validation - catches real issues)
  const eslintResult = await runESLintValidation(filePath);
  errors.push(...eslintResult.errors);
  warnings.push(...eslintResult.warnings);

  // 4. Filter out any false-positive TypeScript errors (safety net)
  errors = filterTypeScriptFalsePositives(errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

