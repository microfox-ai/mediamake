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
  lintOutput?: string;
  fixedCode?: string;
  wasAutoFixed?: boolean;
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
 * Runs ESLint validation on a file with TypeScript type checking
 * @param filePath - Absolute path to the TypeScript file to validate
 */
export async function runESLintValidation(filePath: string): Promise<{
  errors: string[];
  warnings: string[];
  fullOutput?: string;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let fullOutput = '';

  try {
    // Run TypeScript compiler for type checking with strict implicit any checking
    const tscOutput = execSync(
      `npx tsc "${filePath}" --noEmit --noImplicitAny --strictNullChecks --skipLibCheck --pretty false`,
      {
        stdio: 'pipe',
        cwd: process.cwd(),
        encoding: 'utf-8',
      }
    ).toString();
    
    if (tscOutput) {
      fullOutput += `TypeScript Output:\n${tscOutput}\n\n`;
    }
  } catch (tscError: any) {
    // TypeScript errors found
    const tscOutput = (tscError.stdout || tscError.stderr || '').toString();
    if (tscOutput) {
      fullOutput += `TypeScript Errors:\n${tscOutput}\n\n`;
      
      // Parse and categorize TypeScript errors
      const lines = tscOutput.split('\n');
      const typeErrors = lines.filter((line: string) => 
        line.includes('error TS') && 
        !line.includes('Cannot find module') &&
        !line.includes('Cannot find name \'React\'') &&
        !line.includes('JSX element implicitly') &&
        !line.includes('Cannot find name \'console\'') &&
        !line.includes('Cannot find name \'Math\'')
      );
      
      if (typeErrors.length > 0) {
        errors.push(`TypeScript type errors:\n${typeErrors.slice(0, 10).join('\n')}`);
      }
    }
  }

  try {
    // Run eslint with TypeScript support
    const eslintOutput = execSync(
      `npx eslint "${filePath}" --format compact --rule "@typescript-eslint/no-explicit-any: off" --rule "@typescript-eslint/no-unused-vars: warn" --max-warnings 999`,
      {
        stdio: 'pipe',
        cwd: process.cwd(),
        encoding: 'utf-8',
      }
    ).toString();
    
    if (eslintOutput) {
      fullOutput += `ESLint Output:\n${eslintOutput}\n`;
    }
    // If we get here, eslint passed
  } catch (lintError: any) {
    const eslintOutput = (lintError.stdout || lintError.stderr || '').toString();
    if (eslintOutput) {
      fullOutput += `ESLint Output:\n${eslintOutput}\n`;
    }
    
    // ESLint failed, check if it's real errors or just warnings
    if (lintError.status === 1) {
      const output = eslintOutput;
      const errorLines = output.split('\n').filter((line: string) => 
        line.includes(' error ') || line.includes('✖')
      );
      
      if (errorLines.length > 0) {
        warnings.push(`ESLint issues found:\n${errorLines.slice(0, 5).join('\n')}`);
      } else {
        warnings.push('ESLint warnings found (not blocking)');
      }
    } else if (lintError.status === 2) {
      // ESLint configuration error
      const output = eslintOutput;
      console.warn('[VALIDATION] ESLint configuration error:', output.substring(0, 500));
      warnings.push('ESLint check skipped (configuration issue) - relying on TypeScript checks only');
    }
  }

  return { errors, warnings, fullOutput };
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
    // Run all validations on the temp file (with auto-fix enabled)
    const result = await validatePresetFile(tempFilePath, true);
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
 * Attempts to auto-fix ESLint issues in a file
 * @param filePath - Absolute path to the file
 * @returns true if fixes were applied
 */
export async function autoFixLintIssues(filePath: string): Promise<boolean> {
  try {
    console.log(`[VALIDATION] Attempting auto-fix on: ${filePath}`);
    execSync(
      `npx eslint "${filePath}" --fix --rule "@typescript-eslint/no-explicit-any: off"`,
      {
        stdio: 'pipe',
        cwd: process.cwd(),
        encoding: 'utf-8',
      }
    );
    console.log(`[VALIDATION] ✅ Auto-fix completed`);
    return true;
  } catch (e: any) {
    // eslint --fix still exits with error code if there are unfixable issues
    // but it will have fixed what it could
    console.log(`[VALIDATION] Auto-fix ran (some issues may remain unfixable)`);
    return true;
  }
}

/**
 * Validates a preset file (ESLint + basic checks only)
 * @param filePath - Absolute path to the preset file
 * @param attemptAutoFix - Whether to attempt auto-fixing lint issues
 */
export async function validatePresetFile(
  filePath: string, 
  attemptAutoFix: boolean = true
): Promise<ValidationResult> {
  let errors: string[] = [];
  const warnings: string[] = [];
  let wasAutoFixed = false;

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

  const originalCode = code;

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
  let eslintResult = await runESLintValidation(filePath);
  errors.push(...eslintResult.errors);
  warnings.push(...eslintResult.warnings);
  
  // Store full lint output for reporting (even if only warnings)
  let fullLintOutput = eslintResult.fullOutput || '';

  // 4. Auto-fix if there are lint errors and auto-fix is enabled
  if (attemptAutoFix && (eslintResult.errors.length > 0 || eslintResult.warnings.length > 0)) {
    console.log('[VALIDATION] Lint issues found, attempting auto-fix...');
    const fixed = await autoFixLintIssues(filePath);
    
    if (fixed) {
      // Re-read the file to get the fixed code
      try {
        const fixedCode = readFileSync(filePath, 'utf-8');
        
        // Check if code actually changed
        if (fixedCode !== originalCode) {
          wasAutoFixed = true;
          code = fixedCode;
          console.log('[VALIDATION] ✅ Code was auto-fixed');
          
          // Re-run validation on fixed code
          console.log('[VALIDATION] Re-validating fixed code...');
          errors = [];
          warnings.length = 0; // Clear warnings array
          
          // Re-run forbidden patterns check
          const forbiddenErrors2 = await checkForbiddenPatterns(code);
          errors.push(...forbiddenErrors2);
          
          // Re-run structure validation
          const sourceFile2 = await createSourceFile(code);
          if (sourceFile2) {
            const structureResult2 = await validatePresetStructure(sourceFile2);
            errors.push(...structureResult2.errors);
            warnings.push(...structureResult2.warnings);
          }
          
          // Re-run ESLint and update fullLintOutput
          eslintResult = await runESLintValidation(filePath);
          errors.push(...eslintResult.errors);
          warnings.push(...eslintResult.warnings);
          fullLintOutput = eslintResult.fullOutput || '';
          
          console.log(`[VALIDATION] After auto-fix: ${errors.length} errors, ${warnings.length} warnings`);
        } else {
          console.log('[VALIDATION] Auto-fix ran but no changes were made');
        }
      } catch (e: any) {
        console.warn('[VALIDATION] Failed to read fixed code:', e.message);
      }
    }
  }

  // 5. Filter out any false-positive TypeScript errors (safety net)
  // errors = filterTypeScriptFalsePositives(errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    lintOutput: fullLintOutput,
    fixedCode: wasAutoFixed ? code : undefined,
    wasAutoFixed,
  };
}

