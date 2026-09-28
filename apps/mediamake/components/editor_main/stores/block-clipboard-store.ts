import { create } from 'zustand';
import { toast } from 'sonner';
import type { ReferenceItem } from '@/components/editor/presets/types';
import type { TimelineAction } from '@/components/editor/presets/actions/types';
import {
  confirmRemoveAction,
  removeTimelineAction,
} from '@/components/editor/presets/actions/engine/action-lifecycle';
import { useEditorStore, type Preset, type SelectedItem } from './editor-store';
import { useTimelineEditsStore } from './timeline-edits-store';
import type { Timeline } from './project-store';
import { useProjectStore } from './project-store';

export type ItemClipboard =
  | { kind: 'preset'; preset: Preset; actions: TimelineAction[] }
  | { kind: 'reference'; reference: ReferenceItem; actions: TimelineAction[] }
  | { kind: 'action'; action: TimelineAction };

export type PropsClipboard =
  | { kind: 'preset'; props: unknown }
  | { kind: 'reference'; props: unknown }
  | { kind: 'action'; props: Record<string, unknown> };

interface BlockClipboardState {
  itemClipboard: ItemClipboard | null;
  propsClipboard: PropsClipboard | null;
  setItemClipboard: (item: ItemClipboard | null) => void;
  setPropsClipboard: (props: PropsClipboard | null) => void;
}

export const useBlockClipboardStore = create<BlockClipboardState>((set) => ({
  itemClipboard: null,
  propsClipboard: null,
  setItemClipboard: (itemClipboard) => set({ itemClipboard }),
  setPropsClipboard: (propsClipboard) => set({ propsClipboard }),
}));

/** True when keyboard shortcuts must yield to native text editing / form widgets. */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  const node =
    target instanceof Node
      ? target
      : typeof document !== 'undefined'
        ? document.activeElement
        : null;
  if (!node) return false;

  const el =
    node instanceof Element
      ? node
      : node.parentElement;
  if (!el) return false;

  // Native controls + contenteditable hosts (incl. TipTap/ProseMirror children)
  if (
    el.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]',
    )
  ) {
    return true;
  }

  // SchemaForm (incl. Monaco JSON tab) — never steal ⌘/Ctrl+C/V while focused here
  if (el.closest('[data-schema-form]')) return true;

  // Monaco editor surface (textarea may not be the event target for all keys)
  if (el.closest('.monaco-editor, .monaco-mouse-cursor-text')) return true;

  // TipTap / ProseMirror root
  if (el.closest('.ProseMirror')) return true;

  return false;
}

export function modShortcutLabel(key: string): string {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return isMac ? `⌘${key}` : `Ctrl+${key}`;
}

export function altShortcutLabel(key: string): string {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return isMac ? `⌥${key}` : `Alt+${key}`;
}

function resolveTimeline(timelineId: string): Timeline | null {
  const edited = useTimelineEditsStore.getState().getEditedTimeline(timelineId);
  if (edited) return edited;
  const project = useProjectStore.getState();
  if (project.loadedTimeline?.id === timelineId) return project.loadedTimeline;
  return project.timelines.find((t) => t.id === timelineId) ?? null;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Copy the currently selected block / reference / action. */
export function copySelectedItem(): boolean {
  const selected = useEditorStore.getState().selectedItem;
  if (!selected || selected.type === 'timeline') return false;

  const timeline = resolveTimeline(selected.timeline.id);
  if (!timeline) return false;

  if (selected.type === 'preset') {
    const preset = timeline.presets?.find((p) => p.id === selected.item.id);
    if (!preset) return false;
    const actions = (timeline.actions || []).filter(
      (a) =>
        a.target?.type === 'preset' &&
        a.target.presetInstanceId === preset.id,
    );
    useBlockClipboardStore.getState().setItemClipboard({
      kind: 'preset',
      preset: cloneJson(preset),
      actions: cloneJson(actions),
    });
    toast.success('Block copied');
    return true;
  }

  if (selected.type === 'reference') {
    const reference = (timeline.defaultData?.references || [])[
      selected.referenceIndex
    ] as ReferenceItem | undefined;
    if (!reference) return false;
    const actions = (timeline.actions || []).filter(
      (a) =>
        a.target?.type === 'reference' &&
        a.target.referenceKey === reference.key,
    );
    useBlockClipboardStore.getState().setItemClipboard({
      kind: 'reference',
      reference: cloneJson(reference),
      actions: cloneJson(actions),
    });
    toast.success('Reference copied');
    return true;
  }

  if (selected.type === 'action') {
    const action = (timeline.actions || []).find(
      (a) => a.id === selected.item.id,
    );
    if (!action) return false;
    useBlockClipboardStore.getState().setItemClipboard({
      kind: 'action',
      action: cloneJson(action),
    });
    toast.success('Action copied');
    return true;
  }

  return false;
}

/** Paste a previously copied item into the selected item's timeline. */
export function pasteClipboardItem(): boolean {
  const clipboard = useBlockClipboardStore.getState().itemClipboard;
  if (!clipboard) {
    toast.error('Nothing to paste');
    return false;
  }

  const selected = useEditorStore.getState().selectedItem;
  if (!selected) return false;

  const timelineId =
    selected.type === 'timeline' ? selected.item.id : selected.timeline.id;
  const timeline = resolveTimeline(timelineId);
  if (!timeline) return false;

  const { updateTimeline } = useTimelineEditsStore.getState();
  const { selectPreset, selectReference, selectAction } =
    useEditorStore.getState();

  if (clipboard.kind === 'preset') {
    const presets = [...(timeline.presets || [])];
    const selectedPresetIndex =
      selected.type === 'preset'
        ? presets.findIndex((p) => p.id === selected.item.id)
        : -1;
    const insertAt =
      selectedPresetIndex >= 0 ? selectedPresetIndex + 1 : presets.length;

    const newPreset: Preset = {
      ...cloneJson(clipboard.preset),
      id: newId('preset'),
      label: `${clipboard.preset.label} (Copy)`,
    };
    presets.splice(insertAt, 0, newPreset);

    const duplicatedActions = clipboard.actions.map((a, i) => ({
      ...cloneJson(a),
      id: newId(`action-${i}`),
      target: { type: 'preset' as const, presetInstanceId: newPreset.id },
    }));

    updateTimeline(timelineId, {
      presets,
      ...(duplicatedActions.length > 0
        ? { actions: [...(timeline.actions || []), ...duplicatedActions] }
        : {}),
    });
    const nextTimeline = resolveTimeline(timelineId) || timeline;
    selectPreset(newPreset, nextTimeline);
    toast.success('Block pasted');
    return true;
  }

  if (clipboard.kind === 'reference') {
    const references = [
      ...((timeline.defaultData?.references || []) as ReferenceItem[]),
    ];
    const insertAt =
      selected.type === 'reference'
        ? selected.referenceIndex + 1
        : references.length;
    const sourceKey = clipboard.reference.key || 'reference';
    const duplicate: ReferenceItem = {
      ...cloneJson(clipboard.reference),
      key: `${sourceKey}_copy`,
    };
    references.splice(insertAt, 0, duplicate);

    const duplicatedActions = clipboard.actions.map((a, i) => ({
      ...cloneJson(a),
      id: newId(`action-${i}`),
      target: { type: 'reference' as const, referenceKey: duplicate.key },
    }));

    updateTimeline(timelineId, {
      defaultData: {
        ...(timeline.defaultData || {}),
        references,
      },
      ...(duplicatedActions.length > 0
        ? { actions: [...(timeline.actions || []), ...duplicatedActions] }
        : {}),
    });
    const nextTimeline = resolveTimeline(timelineId) || timeline;
    selectReference(duplicate, nextTimeline, insertAt);
    toast.success('Reference pasted');
    return true;
  }

  if (clipboard.kind === 'action') {
    const actions = [...(timeline.actions || [])];
    const selectedActionIndex =
      selected.type === 'action'
        ? actions.findIndex((a) => a.id === selected.item.id)
        : -1;
    const insertAt =
      selectedActionIndex >= 0 ? selectedActionIndex + 1 : actions.length;
    const duplicate: TimelineAction = {
      ...cloneJson(clipboard.action),
      id: newId('action'),
      label: `${clipboard.action.label} (Copy)`,
      status: 'idle',
      error: undefined,
    };
    actions.splice(insertAt, 0, duplicate);
    updateTimeline(timelineId, { actions });
    const nextTimeline = resolveTimeline(timelineId) || timeline;
    selectAction(duplicate, nextTimeline);
    toast.success('Action pasted');
    return true;
  }

  return false;
}

/** Copy input props / value of the selected item. */
export async function copySelectedProps(): Promise<boolean> {
  const selected = useEditorStore.getState().selectedItem;
  if (!selected || selected.type === 'timeline') return false;

  const timeline = resolveTimeline(selected.timeline.id);
  if (!timeline) return false;

  let payload: PropsClipboard | null = null;
  let json = '';

  if (selected.type === 'preset') {
    const preset = timeline.presets?.find((p) => p.id === selected.item.id);
    if (!preset) return false;
    const props = cloneJson(preset.presetInputData ?? {});
    payload = { kind: 'preset', props };
    json = JSON.stringify(props, null, 2);
  } else if (selected.type === 'reference') {
    const reference = (timeline.defaultData?.references || [])[
      selected.referenceIndex
    ] as ReferenceItem | undefined;
    if (!reference) return false;
    const props = cloneJson(reference.value ?? null);
    payload = { kind: 'reference', props };
    json = JSON.stringify(props, null, 2);
  } else if (selected.type === 'action') {
    const action = (timeline.actions || []).find(
      (a) => a.id === selected.item.id,
    );
    if (!action) return false;
    const props = cloneJson(action.inputData ?? {});
    payload = { kind: 'action', props };
    json = JSON.stringify(props, null, 2);
  }

  if (!payload) return false;
  useBlockClipboardStore.getState().setPropsClipboard(payload);
  try {
    await navigator.clipboard.writeText(json);
  } catch {
    // Internal clipboard still works without system clipboard access
  }
  toast.success('Props copied');
  return true;
}

/** Paste props onto the selected item (must match kind). */
export async function pasteSelectedProps(): Promise<boolean> {
  const selected = useEditorStore.getState().selectedItem;
  if (!selected || selected.type === 'timeline') return false;

  const timeline = resolveTimeline(selected.timeline.id);
  if (!timeline) return false;

  let clipboard = useBlockClipboardStore.getState().propsClipboard;

  // Fall back to system clipboard JSON when kinds match / no internal clipboard
  if (!clipboard || clipboard.kind !== selected.type) {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      clipboard = {
        kind: selected.type,
        props: parsed,
      } as PropsClipboard;
    } catch {
      toast.error('No matching props to paste');
      return false;
    }
  }

  if (clipboard.kind !== selected.type) {
    toast.error('Props type does not match selection');
    return false;
  }

  const edits = useTimelineEditsStore.getState();

  if (selected.type === 'preset' && clipboard.kind === 'preset') {
    edits.updatePresetInputData(
      selected.timeline.id,
      selected.item.id,
      cloneJson(clipboard.props),
    );
    toast.success('Props pasted');
    return true;
  }

  if (selected.type === 'reference' && clipboard.kind === 'reference') {
    const references = [
      ...((timeline.defaultData?.references || []) as ReferenceItem[]),
    ];
    const current = references[selected.referenceIndex];
    if (!current) return false;
    references[selected.referenceIndex] = {
      ...current,
      value: cloneJson(clipboard.props),
    };
    edits.updateTimeline(selected.timeline.id, {
      defaultData: {
        ...(timeline.defaultData || {}),
        references,
      },
    });
    const nextTimeline =
      resolveTimeline(selected.timeline.id) || timeline;
    useEditorStore
      .getState()
      .selectReference(
        references[selected.referenceIndex],
        nextTimeline,
        selected.referenceIndex,
      );
    toast.success('Props pasted');
    return true;
  }

  if (selected.type === 'action' && clipboard.kind === 'action') {
    edits.updateAction(selected.timeline.id, selected.item.id, {
      inputData: cloneJson(clipboard.props),
    });
    toast.success('Props pasted');
    return true;
  }

  return false;
}

export function duplicateSelectedItem(): boolean {
  const selected = useEditorStore.getState().selectedItem;
  if (!selected || selected.type === 'timeline') return false;

  if (selected.type === 'preset') {
    // Don't duplicate the base timeline preset (index 0)
    const timeline = resolveTimeline(selected.timeline.id);
    const index =
      timeline?.presets?.findIndex((p) => p.id === selected.item.id) ?? -1;
    if (index === 0) {
      toast.error('Cannot duplicate the base timeline preset');
      return false;
    }
    useTimelineEditsStore
      .getState()
      .duplicatePreset(selected.timeline.id, selected.item.id);
    const next = resolveTimeline(selected.timeline.id);
    const sourceIndex =
      next?.presets?.findIndex((p) => p.id === selected.item.id) ?? -1;
    const dup =
      sourceIndex >= 0 ? next?.presets?.[sourceIndex + 1] : undefined;
    if (dup && next) {
      useEditorStore.getState().selectPreset(dup, next);
    }
    toast.success('Block duplicated');
    return true;
  }

  if (selected.type === 'reference') {
    const timeline = resolveTimeline(selected.timeline.id);
    if (!timeline) return false;
    const references = [
      ...((timeline.defaultData?.references || []) as ReferenceItem[]),
    ];
    const source = references[selected.referenceIndex];
    if (!source) return false;
    const duplicate: ReferenceItem = {
      ...cloneJson(source),
      key: source.key ? `${source.key}_copy` : `reference_${selected.referenceIndex + 1}_copy`,
    };
    references.splice(selected.referenceIndex + 1, 0, duplicate);
    const duplicatedActions = (timeline.actions || [])
      .filter(
        (a: TimelineAction) =>
          a.target?.type === 'reference' &&
          a.target.referenceKey === source.key,
      )
      .map((a: TimelineAction, i: number) => ({
        ...cloneJson(a),
        id: newId(`action-${i}`),
        target: { type: 'reference' as const, referenceKey: duplicate.key },
      }));
    useTimelineEditsStore.getState().updateTimeline(selected.timeline.id, {
      defaultData: {
        ...(timeline.defaultData || {}),
        references,
      },
      ...(duplicatedActions.length > 0
        ? { actions: [...(timeline.actions || []), ...duplicatedActions] }
        : {}),
    });
    const nextTimeline =
      resolveTimeline(selected.timeline.id) || timeline;
    useEditorStore
      .getState()
      .selectReference(duplicate, nextTimeline, selected.referenceIndex + 1);
    toast.success('Reference duplicated');
    return true;
  }

  if (selected.type === 'action') {
    const timeline = resolveTimeline(selected.timeline.id);
    if (!timeline) return false;
    const actions = [...(timeline.actions || [])];
    const index = actions.findIndex((a) => a.id === selected.item.id);
    if (index < 0) return false;
    const duplicate: TimelineAction = {
      ...cloneJson(actions[index]),
      id: newId('action'),
      label: `${actions[index].label} (Copy)`,
      status: 'idle',
      error: undefined,
    };
    actions.splice(index + 1, 0, duplicate);
    useTimelineEditsStore
      .getState()
      .updateTimeline(selected.timeline.id, { actions });
    const nextTimeline =
      resolveTimeline(selected.timeline.id) || timeline;
    useEditorStore.getState().selectAction(duplicate, nextTimeline);
    toast.success('Action duplicated');
    return true;
  }

  return false;
}

export function deleteSelectedItem(): boolean {
  const selected = useEditorStore.getState().selectedItem;
  if (!selected || selected.type === 'timeline') return false;

  const timeline = resolveTimeline(selected.timeline.id);
  if (!timeline) return false;

  if (selected.type === 'preset') {
    const index =
      timeline.presets?.findIndex((p) => p.id === selected.item.id) ?? -1;
    if (index === 0) {
      toast.error('Cannot delete the base timeline preset');
      return false;
    }
    const label = selected.item.label || 'block';
    if (!confirm(`Are you sure you want to delete "${label}"?`)) return false;
    useTimelineEditsStore
      .getState()
      .removePreset(selected.timeline.id, selected.item.id);
    useEditorStore.getState().selectTimeline(timeline);
    return true;
  }

  if (selected.type === 'reference') {
    const references = [
      ...((timeline.defaultData?.references || []) as ReferenceItem[]),
    ];
    const source = references[selected.referenceIndex];
    if (!source) return false;
    const label = source.key || 'reference';
    if (!confirm(`Are you sure you want to delete "${label}"?`)) return false;
    const nextReferences = references.filter(
      (_, i) => i !== selected.referenceIndex,
    );
    const nextActions = (timeline.actions || []).filter(
      (a) =>
        !(
          a.target?.type === 'reference' &&
          a.target.referenceKey === source.key
        ),
    );
    useTimelineEditsStore.getState().updateTimeline(selected.timeline.id, {
      defaultData: {
        ...(timeline.defaultData || {}),
        references: nextReferences,
      },
      actions: nextActions,
    });
    useEditorStore.getState().selectTimeline(timeline);
    return true;
  }

  if (selected.type === 'action') {
    const { proceed, deleteOutputs } = confirmRemoveAction(selected.item.label);
    if (!proceed) return false;
    removeTimelineAction(selected.timeline.id, selected.item.id, {
      deleteOutputs,
    });
    useEditorStore.getState().selectTimeline(timeline);
    return true;
  }

  return false;
}

export function moveSelectedItem(direction: 'up' | 'down'): boolean {
  const selected = useEditorStore.getState().selectedItem;
  if (!selected || selected.type === 'timeline') return false;

  const timeline = resolveTimeline(selected.timeline.id);
  if (!timeline) return false;

  const delta = direction === 'up' ? -1 : 1;

  if (selected.type === 'preset') {
    const presets = timeline.presets || [];
    const index = presets.findIndex((p) => p.id === selected.item.id);
    if (index < 0) return false;
    const newIndex = index + delta;
    // Index 0 is the base timeline preset — never move into/out of it
    if (index === 0 || newIndex <= 0 || newIndex >= presets.length) return false;
    useTimelineEditsStore
      .getState()
      .reorderPresets(selected.timeline.id, index, newIndex);
    return true;
  }

  if (selected.type === 'reference') {
    const references = [
      ...((timeline.defaultData?.references || []) as ReferenceItem[]),
    ];
    const index = selected.referenceIndex;
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= references.length) return false;
    const [moved] = references.splice(index, 1);
    references.splice(newIndex, 0, moved);
    useTimelineEditsStore.getState().updateTimeline(selected.timeline.id, {
      defaultData: {
        ...(timeline.defaultData || {}),
        references,
      },
    });
    const nextTimeline =
      resolveTimeline(selected.timeline.id) || timeline;
    useEditorStore
      .getState()
      .selectReference(moved, nextTimeline, newIndex);
    return true;
  }

  if (selected.type === 'action') {
    const actions = [...(timeline.actions || [])];
    const index = actions.findIndex((a) => a.id === selected.item.id);
    if (index < 0) return false;
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= actions.length) return false;
    const [moved] = actions.splice(index, 1);
    actions.splice(newIndex, 0, moved);
    useTimelineEditsStore
      .getState()
      .updateTimeline(selected.timeline.id, { actions });
    const nextTimeline =
      resolveTimeline(selected.timeline.id) || timeline;
    useEditorStore.getState().selectAction(moved, nextTimeline);
    return true;
  }

  return false;
}

export function canMoveSelected(direction: 'up' | 'down'): boolean {
  const selected = useEditorStore.getState().selectedItem;
  if (!selected || selected.type === 'timeline') return false;
  const timeline = resolveTimeline(selected.timeline.id);
  if (!timeline) return false;
  const delta = direction === 'up' ? -1 : 1;

  if (selected.type === 'preset') {
    const index =
      timeline.presets?.findIndex((p) => p.id === selected.item.id) ?? -1;
    const newIndex = index + delta;
    return index > 0 && newIndex > 0 && newIndex < (timeline.presets?.length ?? 0);
  }
  if (selected.type === 'reference') {
    const len = (timeline.defaultData?.references || []).length;
    const newIndex = selected.referenceIndex + delta;
    return newIndex >= 0 && newIndex < len;
  }
  if (selected.type === 'action') {
    const index =
      (timeline.actions || []).findIndex((a) => a.id === selected.item.id) ?? -1;
    const newIndex = index + delta;
    return newIndex >= 0 && newIndex < (timeline.actions?.length ?? 0);
  }
  return false;
}

export function isBlockLikeSelection(
  selected: SelectedItem | null,
): selected is Exclude<SelectedItem, { type: 'timeline' }> {
  return (
    !!selected &&
    (selected.type === 'preset' ||
      selected.type === 'reference' ||
      selected.type === 'action')
  );
}
