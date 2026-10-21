type LinkedAction = {
  target?: { type?: string; referenceKey?: string };
  outputs?: unknown[];
  selectedOutputId?: string;
  status?: "idle" | "running" | "done" | "error";
  error?: string;
  progressMessage?: string;
  lastRunAt?: string;
};

function hasGeneratedOutput(action: LinkedAction) {
  return (action.outputs?.length ?? 0) > 0 || !!action.selectedOutputId;
}

/**
 * Drop generated variants on actions attached to one reference.
 * The action itself stays, so it can be run again on the new captions.
 */
export function clearLinkedActionOutputs<T extends LinkedAction>(
  actions: T[],
  referenceKey: string,
): T[] {
  if (!referenceKey) return actions;
  let changed = false;
  const next = actions.map((action) => {
    if (
      action.target?.type !== "reference" ||
      action.target.referenceKey !== referenceKey
    ) {
      return action;
    }
    if (!hasGeneratedOutput(action)) return action;
    changed = true;
    return {
      ...action,
      outputs: [],
      selectedOutputId: undefined,
      lastRunAt: undefined,
      error: undefined,
      progressMessage: undefined,
      status: "idle",
    };
  });
  return changed ? next : actions;
}
