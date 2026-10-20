import React from 'react';

type MergeableProperties =
  | 'transform'
  | 'filter'
  | 'opacity'
  | 'transformOrigin'
  | 'color'
  | 'backgroundColor';

// Parses a string of CSS functions (e.g., "scale(1.2) rotate(10deg)") into a map.
// Handles nested functions like drop-shadow(0 0 864px rgba(255,68,15,0.65))
const parseFunctionsString = (
  functions: string | undefined
): Map<string, string> => {
  const result = new Map<string, string>();
  if (!functions) {
    return result;
  }

  // Handle nested parentheses by counting them
  let i = 0;
  while (i < functions.length) {
    // Skip whitespace
    while (i < functions.length && /\s/.test(functions[i])) {
      i++;
    }
    if (i >= functions.length) break;

    // Match function name (word characters, hyphens, underscores)
    const nameStart = i;
    while (i < functions.length && /[\w-]/.test(functions[i])) {
      i++;
    }
    if (i === nameStart) break; // No function name found

    const functionName = functions.substring(nameStart, i);

    // Skip whitespace
    while (i < functions.length && /\s/.test(functions[i])) {
      i++;
    }

    // Expect opening parenthesis
    if (i >= functions.length || functions[i] !== '(') {
      break; // Invalid syntax, skip
    }
    i++; // Skip '('

    // Find matching closing parenthesis, handling nested parentheses
    let depth = 1;
    const contentStart = i;
    while (i < functions.length && depth > 0) {
      if (functions[i] === '(') {
        depth++;
      } else if (functions[i] === ')') {
        depth--;
      }
      if (depth > 0) {
        i++;
      }
    }

    if (depth === 0) {
      // Found matching closing parenthesis
      const content = functions.substring(contentStart, i);
      const fullFunction = `${functionName}(${content})`;
      result.set(functionName, fullFunction);
      i++; // Skip ')'
    } else {
      // Unmatched parentheses, skip this function
      break;
    }
  }

  return result;
};

interface MergeOptions {
  // When true, if both parent and child define the same property/function at progress boundary,
  // prefer the parent's value over the child's (useful when child progress is 0)
  preferParentOnOverlap?: boolean;
}

/** Keep both transform lists, parent first. CSS applies the list right to left. */
export function joinCssTransform(
  base: string | undefined,
  extra: string | undefined,
): string | undefined {
  const clean = (value: string | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed === 'none') return undefined;
    return trimmed;
  };
  const parent = clean(base);
  const child = clean(extra);
  if (parent && child) return `${parent} ${child}`;
  return parent ?? child;
}

// Merge CSS functions (like transform/filter) preserving parent order and resolving overlaps
const mergeFunctionStrings = (
  parentValue: string | undefined,
  childValue: string | undefined,
  preferParentOnOverlap: boolean
): string => {
  const parentFunctions = parseFunctionsString(parentValue);
  const childFunctions = parseFunctionsString(childValue);

  // Build final map while preserving the order of parent's functions
  const orderedFunctionNames: string[] = [];
  parentFunctions.forEach((_v, k) => orderedFunctionNames.push(k));
  childFunctions.forEach((_v, k) => {
    if (!orderedFunctionNames.includes(k)) {
      orderedFunctionNames.push(k);
    }
  });

  const finalFunctions = orderedFunctionNames.map((name) => {
    if (preferParentOnOverlap && parentFunctions.has(name)) {
      return parentFunctions.get(name)!;
    }
    // Default: child overrides when present, otherwise use parent
    return (childFunctions.get(name) ?? parentFunctions.get(name))!;
  });

  return finalFunctions.join(' ').trim();
};

// A smarter CSS style merging function
export const mergeCSSStyles = (
  parent: React.CSSProperties = {},
  child: React.CSSProperties = {},
  options: MergeOptions = {}
): React.CSSProperties => {
  const result: React.CSSProperties = { ...parent };
  const preferParentOnOverlap = Boolean(options.preferParentOnOverlap);

  for (const key in child) {
    if (Object.prototype.hasOwnProperty.call(child, key)) {
      const pValue = result[key as keyof React.CSSProperties];
      const cValue = child[key as keyof React.CSSProperties];

      // If child value is undefined or null, we keep the parent value (i.e., do nothing)
      if (cValue === undefined || cValue === null) {
        continue;
      }

      switch (key as MergeableProperties) {
        case 'transform': {
          // Same function names must both run. Replacing translateX drops the
          // positioning transform as soon as an effect adds another translateX.
          result.transform = preferParentOnOverlap
            ? mergeFunctionStrings(
                pValue as string | undefined,
                cValue as string | undefined,
                true,
              )
            : joinCssTransform(
                pValue as string | undefined,
                cValue as string | undefined,
              );
          break;
        }
        case 'filter': {
          result.filter = mergeFunctionStrings(
            pValue as string | undefined,
            cValue as string | undefined,
            preferParentOnOverlap
          );
          break;
        }

        case 'opacity':
          // At overlap preference, keep parent's opacity if both define it
          if (
            preferParentOnOverlap &&
            pValue !== undefined &&
            cValue !== undefined
          ) {
            const parentOpacity =
              typeof pValue === 'number' && !isNaN(pValue as number)
                ? (pValue as number)
                : 1;
            result.opacity = Math.max(0, Math.min(1, parentOpacity));
          } else {
            // Multiply opacities, ensuring they are within the 0-1 range
            const parentOpacity =
              typeof pValue === 'number' && !isNaN(pValue as number)
                ? (pValue as number)
                : 1;
            const childOpacity =
              typeof cValue === 'number' && !isNaN(cValue as number)
                ? (cValue as number)
                : 1;
            result.opacity = Math.max(
              0,
              Math.min(1, parentOpacity * childOpacity)
            );
          }
          break;

        case 'transformOrigin':
          result.transformOrigin = cValue;
          break;

        case 'color':
        case 'backgroundColor':
          result[key] = cValue;
          break;

        default:
          // For other properties, allow preferring parent on overlap
          if (preferParentOnOverlap && pValue !== undefined) {
            (result as any)[key] = pValue as any;
          } else {
            // Child overrides parent.
            (result as any)[key] = cValue as any;
          }
          break;
      }
    }
  }

  // Clean up empty transform/filter strings
  if (result.transform === '') {
    delete result.transform;
  }
  if (result.filter === '') {
    delete result.filter;
  }

  return result;
};

export default mergeCSSStyles;
