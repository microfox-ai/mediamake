import { parseArrayItemFieldPath } from "./preset-range-utils";

export function imageItemPathFromRangePath(path: string | undefined): string | null {
  if (!path) return null;
  const field = parseArrayItemFieldPath(path);
  if (!field || field.fieldPath !== "rangeString") return null;
  return `${field.arrayPath}[${field.index}]`;
}
