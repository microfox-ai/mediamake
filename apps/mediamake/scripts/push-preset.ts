#!/usr/bin/env node

/**
 * Script to push a preset from private registry to database
 * Usage: npm run push <presetname>
 */

import { config } from 'dotenv';
import { resolve, join, dirname } from 'path';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import * as ts from 'typescript';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function pushPreset(presetName: string) {
  try {
    // Construct path to the preset file
    const presetPath = join(
      process.cwd(),
      'components',
      'editor',
      'presets',
      'registry',
      'private',
      `${presetName}.ts`,
    );

    console.log(`📂 Looking for preset file: ${presetPath}`);

    if (!existsSync(presetPath)) {
      console.error(`❌ Error: Preset file not found at ${presetPath}`);
      console.error(
        `   Make sure the file exists in components/editor/presets/registry/private/`,
      );
      process.exit(1);
    }

    // Compile TypeScript to JavaScript first to get clean output without build-time helpers
    console.log(`🔨 Compiling TypeScript to JavaScript...`);

    const fileContent = readFileSync(presetPath, 'utf-8');

    // Create a temporary output file path
    const tempJsPath = join(dirname(presetPath), `.${presetName}.temp.js`);

    // Compile TypeScript to JavaScript
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      skipLibCheck: true,
      strict: false,
      allowJs: true,
      declaration: false,
      sourceMap: false,
    };

    const result = ts.transpileModule(fileContent, {
      compilerOptions,
      fileName: presetPath,
    });

    // Write compiled JavaScript to temp file
    writeFileSync(tempJsPath, result.outputText, 'utf-8');

    let compiledPresetFunction: string | undefined;

    try {
      // Read the compiled JavaScript source
      const compiledJs = readFileSync(tempJsPath, 'utf-8');

      // Extract the presetExecution function definition directly from the compiled source
      // This avoids any runtime transformations that might add __name() calls
      // Pattern: const presetExecution = (params, props) => { ... };

      const presetExecutionIdx = compiledJs.indexOf('const presetExecution');
      if (presetExecutionIdx === -1) {
        console.warn(`⚠️  Could not find presetExecution in compiled code`);
      } else {
        // Find the = sign after presetExecution
        const equalsIdx = compiledJs.indexOf('=', presetExecutionIdx);
        if (equalsIdx === -1) {
          console.warn(`⚠️  Could not find = in presetExecution definition`);
        } else {
          // Start after the = sign, skip whitespace
          let startPos = equalsIdx + 1;
          while (
            startPos < compiledJs.length &&
            /\s/.test(compiledJs[startPos])
          ) {
            startPos++;
          }

          // Now find the end by balancing braces
          // The function ends when we find the matching closing brace for the function body
          let pos = startPos;
          let braceDepth = 0;
          let parenDepth = 0;
          let inString = false;
          let stringChar = '';
          let foundArrow = false;

          // First, skip to the arrow function body (after =>)
          while (pos < compiledJs.length) {
            const char = compiledJs[pos];
            if (!inString) {
              if (char === '"' || char === "'" || char === '`') {
                inString = true;
                stringChar = char;
              } else if (char === '(') {
                parenDepth++;
              } else if (char === ')') {
                parenDepth--;
              } else if (
                char === '=' &&
                pos + 1 < compiledJs.length &&
                compiledJs[pos + 1] === '>'
              ) {
                // Found =>
                foundArrow = true;
                pos += 2; // Skip =>
                // Skip whitespace after =>
                while (pos < compiledJs.length && /\s/.test(compiledJs[pos])) {
                  pos++;
                }
                break;
              }
            } else {
              if (char === stringChar && compiledJs[pos - 1] !== '\\') {
                inString = false;
              }
            }
            pos++;
          }

          if (!foundArrow) {
            console.warn(
              `⚠️  Could not find arrow function in presetExecution`,
            );
          } else {
            // Now find the matching closing brace
            braceDepth = 0;
            inString = false;
            const bodyStart = pos;

            while (pos < compiledJs.length) {
              const char = compiledJs[pos];
              if (!inString) {
                if (char === '"' || char === "'" || char === '`') {
                  inString = true;
                  stringChar = char;
                } else if (char === '{') {
                  if (braceDepth === 0) {
                    // This is the opening brace of the function body
                  }
                  braceDepth++;
                } else if (char === '}') {
                  braceDepth--;
                  if (braceDepth === 0) {
                    // Found the end of the function
                    const endPos = pos + 1;
                    compiledPresetFunction = compiledJs
                      .substring(startPos, endPos)
                      .trim();
                    // Remove trailing semicolon if present
                    compiledPresetFunction = compiledPresetFunction.replace(
                      /;\s*$/,
                      '',
                    );
                    console.log(
                      `✅ Extracted compiled function from JavaScript source`,
                    );
                    break;
                  }
                }
              } else {
                if (char === stringChar && compiledJs[pos - 1] !== '\\') {
                  inString = false;
                }
              }
              pos++;
            }

            if (!compiledPresetFunction) {
              console.warn(
                `⚠️  Could not find end of presetExecution function`,
              );
            }
          }
        }
      }

      if (!compiledPresetFunction) {
        // Fallback: try regex (less reliable for nested functions)
        const presetExecutionMatch = compiledJs.match(
          /const\s+presetExecution\s*=\s*((?:async\s+)?\([^)]*\)\s*=>\s*\{[\s\S]*?\});?\s*(?=const\s+presetFunction)/,
        );

        if (presetExecutionMatch && presetExecutionMatch[1]) {
          compiledPresetFunction = presetExecutionMatch[1].trim();
          compiledPresetFunction = compiledPresetFunction.replace(/;\s*$/, '');
          console.log(`✅ Extracted compiled function using regex fallback`);
        } else {
          console.warn(
            `⚠️  Could not extract presetExecution from compiled code`,
          );
          console.warn(`   Falling back to original module`);
        }
      }

      // Strip any __name() calls that might still be present
      // Pattern: __name(functionExpression, "name") -> functionExpression
      if (compiledPresetFunction) {
        // Function to strip __name() calls by properly parsing the code
        function stripNameCalls(code: string): string {
          let result = code;
          let changed = true;

          // Keep stripping until no more changes
          while (changed) {
            changed = false;
            const nameCallRegex = /__name\s*\(/g;
            let match;

            while ((match = nameCallRegex.exec(result)) !== null) {
              const startPos = match.index;
              let pos = match.index + match[0].length;
              let parenDepth = 1;
              let inString = false;
              let stringChar = '';
              let firstArgStart = pos; // Start of first argument (after opening paren)
              let firstArgEnd = -1;

              // Skip whitespace at start
              while (pos < result.length && /\s/.test(result[pos])) {
                pos++;
                firstArgStart = pos;
              }

              // Find the end of the first argument (either comma or closing paren at depth 1)
              while (pos < result.length && parenDepth > 0) {
                const char = result[pos];

                if (!inString) {
                  if (char === '"' || char === "'" || char === '`') {
                    inString = true;
                    stringChar = char;
                  } else if (char === '(') {
                    parenDepth++;
                  } else if (char === ')') {
                    parenDepth--;
                    if (parenDepth === 0 && firstArgEnd === -1) {
                      // Reached the end of __name() call without finding comma
                      // This means there's only one argument or malformed
                      firstArgEnd = pos;
                    }
                  } else if (
                    char === ',' &&
                    parenDepth === 1 &&
                    firstArgEnd === -1
                  ) {
                    // Found the comma separating first and second argument
                    firstArgEnd = pos;
                    break;
                  } else if (char === '{') {
                    // Track braces to handle nested functions
                    let braceDepth = 1;
                    pos++;
                    while (pos < result.length && braceDepth > 0) {
                      if (!inString) {
                        if (
                          result[pos] === '"' ||
                          result[pos] === "'" ||
                          result[pos] === '`'
                        ) {
                          inString = true;
                          stringChar = result[pos];
                        } else if (result[pos] === '{') {
                          braceDepth++;
                        } else if (result[pos] === '}') {
                          braceDepth--;
                        }
                      } else {
                        if (
                          result[pos] === stringChar &&
                          result[pos - 1] !== '\\'
                        ) {
                          inString = false;
                        }
                      }
                      pos++;
                    }
                    pos--; // Adjust for the loop increment
                    continue;
                  }
                } else {
                  if (char === stringChar && result[pos - 1] !== '\\') {
                    inString = false;
                  }
                }

                pos++;
              }

              // If we found the first argument, replace __name(...) with just the argument
              if (firstArgEnd !== -1 && firstArgEnd > firstArgStart) {
                const firstArg = result
                  .substring(firstArgStart, firstArgEnd)
                  .trim();
                // Find the closing paren of __name()
                let closePos = firstArgEnd;
                while (closePos < result.length && result[closePos] !== ')') {
                  closePos++;
                }
                if (closePos < result.length) {
                  closePos++; // Include the closing paren
                  const before = result.substring(0, startPos);
                  const after = result.substring(closePos);
                  result = before + firstArg + after;
                  changed = true;
                  // Reset regex to start from beginning since we modified the string
                  nameCallRegex.lastIndex = 0;
                  break;
                }
              }
            }
          }

          return result;
        }

        compiledPresetFunction = stripNameCalls(compiledPresetFunction);
        console.log(`🧹 Cleaned any remaining __name() calls from function`);
      }
    } catch (compileError: any) {
      console.warn(
        `⚠️  Failed to extract function from compiled code: ${compileError.message}`,
      );
      console.warn(`   Falling back to original module`);
    } finally {
      // Clean up temp file
      if (existsSync(tempJsPath)) {
        unlinkSync(tempJsPath);
      }
    }

    // Load the original module to get metadata and schema
    const fileUrl = `file://${resolve(presetPath)}`;
    let presetModule: any;
    try {
      presetModule = await import(fileUrl);
    } catch (importError: any) {
      try {
        const resolvedPath = resolve(presetPath);
        delete require.cache[resolvedPath];
        presetModule = require(resolvedPath);
      } catch (requireError: any) {
        throw new Error(
          `Failed to import preset file. Make sure it exports 'presetData'. Import error: ${importError.message}, Require error: ${requireError.message}`,
        );
      }
    }

    if (!presetModule.presetData) {
      console.error(`❌ Error: Preset file does not export 'presetData'`);
      console.error(`   The file should export: export { presetData }`);
      process.exit(1);
    }

    // Use metadata and params from original module, but use compiled function if available
    const presetData = {
      ...presetModule.presetData,
      presetFunction:
        compiledPresetFunction || presetModule.presetData.presetFunction,
    };

    // Validate presetData structure
    if (
      !presetData.metadata ||
      !presetData.presetFunction ||
      !presetData.presetParams
    ) {
      console.error(`❌ Error: Invalid presetData structure`);
      console.error(
        `   presetData must contain: metadata, presetFunction, presetParams`,
      );
      process.exit(1);
    }

    console.log(`✅ Loaded preset: ${presetData.metadata.title}`);
    console.log(`   ID: ${presetData.metadata.id}`);
    console.log(`   Type: ${presetData.metadata.presetType}`);

    // Run lint check (ignoring common preset file issues)
    console.log(`🔍 Running lint check...`);
    try {
      // Run eslint on the file, ignoring specific rules that are common in preset files
      // Ignore @typescript-eslint/no-explicit-any and @typescript-eslint/no-unused-vars
      execSync(
        `npx eslint "${presetPath}" --rule "@typescript-eslint/no-explicit-any: off" --rule "@typescript-eslint/no-unused-vars: warn" --max-warnings 999`,
        {
          stdio: 'inherit',
          cwd: process.cwd(),
          env: { ...process.env },
        },
      );
      console.log(`✅ Lint check passed`);
    } catch (lintError: any) {
      // Only fail on non-error status codes (actual ESLint errors, not warnings)
      if (lintError.status === 1) {
        // Check if there are actual errors (not just warnings)
        // Re-run with stricter check to see if there are real errors
        try {
          execSync(
            `npx eslint "${presetPath}" --rule "@typescript-eslint/no-explicit-any: off" --rule "@typescript-eslint/no-unused-vars: off"`,
            {
              stdio: 'pipe',
              cwd: process.cwd(),
              env: { ...process.env },
            },
          );
          // If we get here, there are no real errors, just warnings
          console.log(`✅ Lint check passed (warnings ignored)`);
        } catch (realError: any) {
          console.error(`❌ Lint check failed`);
          console.error(`   Fix linting errors before pushing the preset`);
          process.exit(1);
        }
      } else {
        // ESLint command failed (not installed, config issue, etc.)
        console.error(`❌ Lint check failed`);
        console.error(
          `   ESLint error (code ${lintError.status || 'unknown'}): ${lintError.message}`,
        );
        process.exit(1);
      }
    }

    // Validate that helper functions are inside presetExecution
    console.log(`🔍 Validating preset structure...`);
    // Reuse fileContent from earlier
    const sourceFile = ts.createSourceFile(
      presetPath,
      fileContent,
      ts.ScriptTarget.Latest,
      true,
    );

    const allowedTopLevelNames = [
      'presetParams',
      'presetExecution',
      'presetMetadata',
      'presetFunction',
      'presetParamsSchema',
      'presetData',
      'Effect',
    ];

    const errors: string[] = [];
    let presetExecutionNode: ts.Node | null = null;

    // First pass: find presetExecution
    function findPresetExecution(node: ts.Node) {
      // Check for function declaration: const presetExecution = async (...) => {...}
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (
            ts.isIdentifier(decl.name) &&
            decl.name.text === 'presetExecution' &&
            decl.initializer
          ) {
            if (
              ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer)
            ) {
              presetExecutionNode = decl.initializer;
              return;
            }
          }
        }
      }

      // Check for function declaration: async function presetExecution(...) {...}
      if (
        ts.isFunctionDeclaration(node) &&
        node.name?.text === 'presetExecution'
      ) {
        presetExecutionNode = node;
        return;
      }

      ts.forEachChild(node, findPresetExecution);
    }

    findPresetExecution(sourceFile);

    if (!presetExecutionNode) {
      errors.push('presetExecution function not found in the file');
    }

    // Second pass: check for helper functions outside presetExecution at top level
    function checkTopLevelDeclarations(node: ts.Node) {
      // Only check direct children of SourceFile (top-level declarations)
      if (!ts.isSourceFile(node)) {
        ts.forEachChild(node, checkTopLevelDeclarations);
        return;
      }

      // Check all top-level statements
      for (const statement of node.statements) {
        let name: string | null = null;

        if (ts.isVariableStatement(statement)) {
          // Check if it's presetExecution assignment
          for (const decl of statement.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              if (decl.name.text === 'presetExecution') {
                continue; // Skip presetExecution itself
              }
              name = decl.name.text;
            }
          }
        } else if (ts.isFunctionDeclaration(statement)) {
          if (statement.name?.text === 'presetExecution') {
            continue; // Skip presetExecution itself
          }
          name = statement.name?.text || null;
        } else if (ts.isClassDeclaration(statement)) {
          if (statement.name?.text === 'presetExecution') {
            continue; // Skip presetExecution itself
          }
          name = statement.name?.text || null;
        }

        // Check if this is an allowed top-level name
        if (name && !allowedTopLevelNames.includes(name)) {
          const lineAndChar = sourceFile.getLineAndCharacterOfPosition(
            statement.getStart(),
          );
          errors.push(
            `Helper function/const '${name}' found at line ${lineAndChar.line + 1}:${lineAndChar.character + 1}. All helper functions must be defined inside presetExecution.`,
          );
        }
      }
    }

    checkTopLevelDeclarations(sourceFile);

    if (errors.length > 0) {
      console.error(`❌ Preset structure validation failed:`);
      errors.forEach(error => {
        console.error(`   - ${error}`);
      });
      console.error(
        `   All helper functions must be defined inside the presetExecution function body.`,
      );
      process.exit(1);
    }

    console.log(`✅ Preset structure validation passed`);

    // Get the base URL from environment or default to localhost
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ||
      'http://localhost:3000';

    const url = `${baseUrl}/api/presets/push`;

    console.log(`🚀 Pushing preset to database...`);
    console.log(`📍 URL: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.DEV_API_KEY}`,
      },
      body: JSON.stringify({ presetData }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Error: ${data.error}`);
      if (data.details) {
        console.error(`   Details: ${data.details}`);
      }
      process.exit(1);
    }

    console.log(`✅ Success: ${data.message}`);
    console.log(`📦 Database ID: ${data.preset._id}`);
    console.log(`📝 Title: ${data.preset.metadata.title}`);
    console.log(`🏷️  Type: ${data.preset.metadata.presetType}`);
  } catch (error: any) {
    console.error(`❌ Failed to push preset:`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Make sure the Next.js server is running (npm run dev)`);
    }
    process.exit(1);
  }
}

// Get preset name from command line arguments
const presetName = process.argv[2];

if (!presetName) {
  console.error('❌ Error: preset name is required');
  console.error('   Usage: npm run push <presetname>');
  console.error('   Example: npm run push broll-clone');
  process.exit(1);
}

// Helper function to get the name of a declaration node
function getNodeName(
  node: ts.VariableStatement | ts.FunctionDeclaration | ts.ClassDeclaration,
): string | null {
  if (ts.isFunctionDeclaration(node)) {
    return node.name?.text || null;
  }
  if (ts.isClassDeclaration(node)) {
    return node.name?.text || null;
  }
  if (ts.isVariableStatement(node)) {
    if (
      node.declarationList.declarations.length > 0 &&
      ts.isIdentifier(node.declarationList.declarations[0].name)
    ) {
      return node.declarationList.declarations[0].name.text;
    }
  }
  return null;
}

pushPreset(presetName);
