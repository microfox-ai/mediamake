import { atomBlockPresets } from "@/components/editor/presets/define-atom-preset";
import { defineSavedStylesAction } from "./choice-action";

/**
 * Default choice action for every generated atom preset. No built-in looks:
 * users save the current fields themselves. A preset can also have coded
 * choice actions beside this one.
 */
export const savedStylesActions = atomBlockPresets.map((preset) =>
  defineSavedStylesAction(preset.metadata.id),
);
