## Midjourney Prompts API

This folder contains API routes for working with `MidjourneyPromptRecord` documents.

### Types

```ts
type MidjourneyPrompt = {
  shotIndex?: number;
  captionIndex?: number;
  shotDescription?: string;
  captionText?: string;
  prompt: string;
};

type MidjourneyPromptRecord = {
  _id?: string; // Mongo ObjectId as string in responses
  title?: string | null;
  prompts: MidjourneyPrompt[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  inputParams: Record<string, any>;
  tags: string[];
  isGenerated: boolean;
  generationProgress: number; // 0–100
  generatedIndexes: number[];
};
```

---

### `POST /api/midjourney-prompts/[id]/mark-processed`

Mark a single prompt within a record as processed. This appends the given `promptIndex` to `generatedIndexes` (if not already present) and recalculates `generationProgress` and `isGenerated` using the helper `updateGenerationProgress`.

#### Request

- **Path params**
  - `id`: `string` — MongoDB ObjectId of the `MidjourneyPromptRecord`.

- **Body**

```ts
type MarkProcessedRequest = {
  promptIndex: number; // zero-based index into record.prompts
};
```

#### Responses

- **200 OK**

```ts
type MarkProcessedSuccessResponse = MidjourneyPromptRecord;
```

- **400 Bad Request**

```ts
type MarkProcessedBadRequest = {
  error: "Invalid promptIndex";
};
```

- **404 Not Found**

```ts
type MarkProcessedNotFound = {
  error: "Record not found";
};
```

- **500 Internal Server Error**

```ts
type MarkProcessedErrorResponse = {
  error: "Failed to mark prompt as processed" | "Failed to update record";
};
```

---

### `GET /api/midjourney-prompts/[id]/prompts`

Returns prompts from a `MidjourneyPromptRecord` with server-side filtering that mirrors the copy functionality in `midjourney-dialog.tsx`.

Special case: if `id === "random"`, a random record is selected.

#### Request

- **Path params**
  - `id`: `string` — MongoDB ObjectId, or the literal `"random"` to pick a random record.

- **Query params**

```ts
type PromptsQuery = {
  // Include already-generated prompts or not (default: false)
  alsoGenerated?: "true" | "false";

  // Selection mode (default: "all")
  // "all"         -> all (or all ungenerated) prompts
  // "indexRange"  -> slice of indices
  // "variation"   -> N ungenerated prompts per shotIndex
  mode?: "all" | "indexRange" | "variation";

  // For mode=indexRange (defaults if missing: 0 and lastIndex)
  startIndex?: string; // parseInt; clamped to [0, prompts.length-1]
  endIndex?: string;   // parseInt; clamped to [0, prompts.length-1]

  // For mode=variation (default: 1)
  variationCount?: string; // parseInt; >= 1

  // Include first tag as `tag` field on each prompt (default: true)
  includeTag?: "true" | "false";
};
```

Notes:

- When `alsoGenerated` is **false** (default), generated prompts (indices in `generatedIndexes`) are removed from the result for `mode="all"` and `mode="indexRange"`.
- For `mode="variation"`, generated prompts are **always** excluded, regardless of `alsoGenerated`, just like the dialog behavior.

#### Responses

- **200 OK**

```ts
type PromptWithMetadata = MidjourneyPrompt & {
  pIndex: number;      // original index in record.prompts
  tag?: string;        // first tag from record.tags if includeTag=true and tags exist
};

type PromptsSuccessResponse = {
  recordId: string | null;
  prompts: PromptWithMetadata[];
  totalPrompts: number;   // total prompts in the record
  returnedCount: number;  // prompts.length after filtering
  mode: "all" | "indexRange" | "variation";
  alsoGenerated: boolean;
};
```

- **404 Not Found**

```ts
type PromptsNotFound = {
  error: "Record not found";
};
```

- **400 Bad Request** (e.g. invalid index range)

```ts
type PromptsBadRequest = {
  error: string; // e.g. "startIndex must be less than or equal to endIndex"
};
```

- **500 Internal Server Error**

```ts
type PromptsErrorResponse = {
  error: "Failed to fetch prompts";
};
```


