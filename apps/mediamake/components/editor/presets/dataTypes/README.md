# Data Types Registry

`dataTypes` is a schema registry for timeline reference payloads (`defaultData.references`).

It is used to:

- describe the exact shape of reference values with Zod
- keep reference modeling consistent across editor surfaces
- enable timeline-adapted UI/behavior based on reference data type

## Structure

- `types.ts`: shared `DataTypeDefinition` interface
- `basic.ts`: built-in primitive/object/media data types
- `captions.ts`: caption-specific data type
- `registry/data-types-registry.ts`: runtime lookup helpers

## How to Register a New Data Type

1. Create `<data-type>.ts` that exports a `zod` schema and `DataTypeDefinition`.
2. Add the new definition to `predefinedDataTypes` in `registry/data-types-registry.ts`.
3. Use `getDataTypeById()` or `getReferenceSchemaForType()` in editor UI/runtime logic.

## Current Data Types

- `string`
- `number`
- `boolean`
- `object`
- `objects`
- `media`
- `medias`
- `captions`:
  - optional `_id` string
  - `captions` array (caption + nested words)

## Usage Example

```ts
import { getReferenceSchemaForType } from "@/components/editor/presets/dataTypes";
import { z } from "zod";

const schema = getReferenceSchemaForType("captions", "captions");
const jsonSchema = z.toJSONSchema(schema);
```

