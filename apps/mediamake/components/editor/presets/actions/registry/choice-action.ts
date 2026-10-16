import { z } from "zod";
import { ATOM_PRESET_SHELL_KEYS } from "@/components/editor/presets/define-atom-preset";
import type { ActionDefinition, ActionExecuteResult, ChoiceActionInfo } from "../types";

/**
 * A choice action shows a set of named looks plus an impact slider (0-1).
 * Running it resolves the choice into concrete target fields and merges them in,
 * leaving every field the resolver does not return untouched.
 *
 * Users can also save the target's current values as a new choice. Only the
 * fields the resolver writes are captured, so `resolve` must return the same
 * keys for every choice, impact and target state.
 */
export interface ChoiceActionConfig<Choice extends string> {
  id: string;
  title: string;
  description?: string;
  supportedPresetIds: string[];
  tags?: string[];
  choices: readonly [Choice, ...Choice[]];
  choiceLabels: Record<Choice, string>;
  defaultChoice: Choice;
  defaultImpact?: number;
  resolve: (args: {
    choice: Choice;
    impact: number;
    currentData: Record<string, unknown>;
  }) => Record<string, unknown>;
}

export const SAVED_CHOICE_PREFIX = "saved:";

/** Snapshot of a saved choice, kept on the action's input data so runs stay self-contained. */
export interface SavedChoiceSnapshot {
  id: string;
  name: string;
  values: Record<string, unknown>;
}

interface ChoicePayload {
  choice: string;
  impact: number;
  /** Set for saved choices; applied as-is instead of resolving a built-in. */
  values?: Record<string, unknown>;
}

export function savedChoiceKey(id: string): string {
  return `${SAVED_CHOICE_PREFIX}${id}`;
}

export const SAVED_STYLES_TITLE = "Saved Styles";

export function savedStylesActionId(presetId: string): string {
  return `saved-styles:${presetId}`;
}

/**
 * Track timing and identity. A saved style can still keep `containerProps`,
 * which holds placement. The user removes any other field they don't want.
 */
const SAVED_STYLE_SKIP_KEYS = new Set<string>(
  ATOM_PRESET_SHELL_KEYS.filter((key) => key !== "containerProps"),
);

/** Keep only the fields a choice action writes, dropping unset ones. */
export function pickChoiceFields(
  data: Record<string, unknown>,
  fieldKeys: string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of fieldKeys) {
    if (data[key] !== undefined) picked[key] = data[key];
  }
  return picked;
}

function withoutTimingKeys(data: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || SAVED_STYLE_SKIP_KEYS.has(key)) continue;
    picked[key] = value;
  }
  return picked;
}

/**
 * Fields offered when saving a choice. Coded actions start from the fields they
 * write that are set now. Saved Styles starts from every field set on the block.
 */
export function fieldsPresentForChoice(
  data: Record<string, unknown>,
  choice: Pick<ChoiceActionInfo, "fieldKeys" | "openFields">,
): Record<string, unknown> {
  if (choice.openFields) return withoutTimingKeys(data);
  return pickChoiceFields(data, choice.fieldKeys);
}

/** Values a saved choice is allowed to write back. */
export function valuesForSavedChoice(
  values: Record<string, unknown>,
  choice: Pick<ChoiceActionInfo, "fieldKeys" | "openFields">,
): Record<string, unknown> {
  if (choice.openFields) return withoutTimingKeys(values);
  return pickChoiceFields(values, choice.fieldKeys);
}

const savedChoiceSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    values: z.record(z.string(), z.unknown()),
  })
  .optional();

/**
 * Choice action with no built-in looks. Users save the current fields themselves.
 * One action per preset id, so styles stay on the atom they were saved from.
 */
export function defineSavedStylesAction(presetId: string): ActionDefinition {
  const choiceInfo: ChoiceActionInfo = {
    fieldKeys: [],
    openFields: true,
    builtInChoices: [],
    defaultImpact: 0.5,
  };
  const inputSchema = z.object({
    choice: z.string().default("").describe("saved:<id> of a saved style."),
    impact: z.number().min(0).max(1).default(0.5),
    savedChoice: savedChoiceSchema.describe("Values of the selected saved style."),
  });

  return {
    choice: choiceInfo,
    metadata: {
      id: savedStylesActionId(presetId),
      title: SAVED_STYLES_TITLE,
      description:
        "Save the current look and apply it again. Only the fields you keep are written back.",
      supportedPresetIds: [presetId],
      tags: ["choice", "saved-styles"],
    },
    inputSchema,
    defaultInputParams: { choice: "", impact: 0.5 },
    execute: async (ctx): Promise<ActionExecuteResult> => {
      const { choice, savedChoice } = inputSchema.parse(ctx.inputData);
      if (
        !choice.startsWith(SAVED_CHOICE_PREFIX) ||
        !savedChoice ||
        savedChoiceKey(savedChoice.id) !== choice
      ) {
        throw new Error("Pick a saved style.");
      }
      const payload: ChoicePayload = {
        choice,
        impact: 0,
        values: valuesForSavedChoice(savedChoice.values, choiceInfo),
      };
      return { outputs: [{ label: savedChoice.name, isFavorite: true, payload }] };
    },
    applyOutput: ({ currentData, output }) => {
      const payload = output.payload as Partial<ChoicePayload> | undefined;
      if (!payload?.values) return currentData;
      return { ...currentData, ...valuesForSavedChoice(payload.values, choiceInfo) };
    },
  };
}

export function defineChoiceAction<Choice extends string>(
  config: ChoiceActionConfig<Choice>,
): ActionDefinition {
  const defaultImpact = config.defaultImpact ?? 0.5;
  const fieldKeys = Array.from(
    new Set(
      config.choices.flatMap((choice) =>
        [0, 1].flatMap((impact) =>
          Object.keys(config.resolve({ choice, impact, currentData: {} })),
        ),
      ),
    ),
  );
  const choiceInfo: ChoiceActionInfo = {
    fieldKeys,
    builtInChoices: config.choices.map((id) => ({ id, label: config.choiceLabels[id] })),
    defaultImpact,
  };
  const choiceList = config.choices
    .map((choice) => `${choice} (${config.choiceLabels[choice]})`)
    .join(", ");
  const inputSchema = z.object({
    choice: z
      .string()
      .default(config.defaultChoice)
      .describe(
        `Which look to apply: ${choiceList}, or ${SAVED_CHOICE_PREFIX}<id> for a saved choice.`,
      ),
    impact: z
      .number()
      .min(0)
      .max(1)
      .default(defaultImpact)
      .describe(
        `How hard a built-in look reacts to the audio, from 0 (subtle) to 1 (strongest). Saved choices ignore it. Default: ${defaultImpact}.`,
      ),
    savedChoice: z
      .object({
        id: z.string(),
        name: z.string(),
        values: z.record(z.string(), z.unknown()),
      })
      .optional()
      .describe("Values of the selected saved choice."),
  });

  return {
    choice: choiceInfo,
    metadata: {
      id: config.id,
      title: config.title,
      description: config.description,
      supportedPresetIds: config.supportedPresetIds,
      tags: ["choice", ...(config.tags ?? [])],
    },
    inputSchema,
    defaultInputParams: { choice: config.defaultChoice, impact: defaultImpact },
    execute: async (ctx): Promise<ActionExecuteResult> => {
      const { choice, impact, savedChoice } = inputSchema.parse(ctx.inputData);
      if (choice.startsWith(SAVED_CHOICE_PREFIX)) {
        if (!savedChoice || savedChoiceKey(savedChoice.id) !== choice) {
          throw new Error("The selected saved choice is missing. Pick it again.");
        }
        const payload: ChoicePayload = {
          choice,
          impact,
          values: pickChoiceFields(savedChoice.values, fieldKeys),
        };
        return { outputs: [{ label: savedChoice.name, isFavorite: true, payload }] };
      }
      const builtIn = config.choices.find((c) => c === choice);
      if (!builtIn) throw new Error(`Unknown choice: ${choice}`);
      const payload: ChoicePayload = { choice: builtIn, impact };
      return {
        outputs: [
          {
            label: `${config.choiceLabels[builtIn]} · impact ${impact.toFixed(2)}`,
            isFavorite: true,
            payload,
          },
        ],
      };
    },
    applyOutput: ({ currentData, output }) => {
      const payload = output.payload as Partial<ChoicePayload> | undefined;
      if (payload?.values) {
        return { ...currentData, ...pickChoiceFields(payload.values, fieldKeys) };
      }
      const choice = config.choices.find((c) => c === payload?.choice);
      if (!choice) return currentData;
      const impact = Math.min(1, Math.max(0, Number(payload?.impact ?? defaultImpact)));
      return {
        ...currentData,
        ...config.resolve({ choice, impact, currentData }),
      };
    },
  };
}
