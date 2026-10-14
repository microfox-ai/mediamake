import { z } from "zod";
import type { ActionDefinition, ActionExecuteResult } from "../types";

/**
 * A choice action shows a dropdown of named looks plus an impact slider (0-1).
 * Running it resolves the choice into concrete target fields and merges them in,
 * leaving every field the resolver does not return untouched.
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

interface ChoicePayload {
  choice: string;
  impact: number;
}

export function defineChoiceAction<Choice extends string>(
  config: ChoiceActionConfig<Choice>,
): ActionDefinition {
  const defaultImpact = config.defaultImpact ?? 0.5;
  const choiceList = config.choices
    .map((choice) => `${choice} (${config.choiceLabels[choice]})`)
    .join(", ");
  const inputSchema = z.object({
    choice: z
      .enum(config.choices)
      .default(config.defaultChoice)
      .describe(`Which look to apply: ${choiceList}.`),
    impact: z
      .number()
      .min(0)
      .max(1)
      .default(defaultImpact)
      .describe(
        `How hard the look reacts to the audio, from 0 (subtle) to 1 (strongest). Default: ${defaultImpact}.`,
      ),
  });

  return {
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
      const { choice, impact } = inputSchema.parse(ctx.inputData);
      const payload: ChoicePayload = { choice, impact };
      return {
        outputs: [
          {
            label: `${config.choiceLabels[choice]} · impact ${impact.toFixed(2)}`,
            isFavorite: true,
            payload,
          },
        ],
      };
    },
    applyOutput: ({ currentData, output }) => {
      const payload = output.payload as Partial<ChoicePayload> | undefined;
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
