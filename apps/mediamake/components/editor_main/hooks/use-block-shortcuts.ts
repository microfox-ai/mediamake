"use client";

import { useEffect } from "react";
import { useEditorStore } from "../stores/editor-store";
import { useEditorUIStore } from "../stores/editor-ui-store";
import {
  copySelectedItem,
  copySelectedProps,
  deleteSelectedItem,
  duplicateSelectedItem,
  isBlockLikeSelection,
  isEditableKeyboardTarget,
  moveSelectedItem,
  pasteClipboardItem,
  pasteSelectedProps,
  useBlockClipboardStore,
} from "../stores/block-clipboard-store";
import { isBottomTimelineSelectionActive } from "../stores/bottom-selection-gate";
import { getEditorFocusScope } from "../stores/editor-focus-scope";
import { groupSelectedBlocks } from "../panels/left/editor/group-selection";

/**
 * Keyboard shortcuts for selected blocks / references / actions.
 * Scoped to the left file-tree panel only so SchemaForm / props editing
 * on the right keeps native copy/paste (no duplicate block paste).
 *
 * - ⌘/Ctrl+↑ / ↓  move
 * - ⌘/Ctrl+D      duplicate
 * - ⌘/Ctrl+C      copy
 * - ⌘/Ctrl+V      paste
 * - ⌥/Alt+C       copy props
 * - ⌥/Alt+V       paste props
 * - ⌘/Ctrl+G      group same-parent blocks into a scene
 * - Delete / ⌫    delete
 */
export function useBlockShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const scope = getEditorFocusScope();
      const mod = e.metaKey || e.ctrlKey;
      const grouping =
        mod &&
        !e.shiftKey &&
        !e.altKey &&
        (e.key.toLowerCase() === "g" || e.code === "KeyG");
      if (scope !== "left" && !(grouping && scope === "bottom")) return;

      if (
        isEditableKeyboardTarget(e.target) ||
        isEditableKeyboardTarget(document.activeElement)
      ) {
        return;
      }
      if (useEditorUIStore.getState().filePanelTab !== "timelines") return;
      // Yield to segment / caption selection shortcuts in the bottom panel
      if (isBottomTimelineSelectionActive()) return;

      const selected = useEditorStore.getState().selectedItem;
      const isBlockLike = isBlockLikeSelection(selected);
      const canPasteOnTimeline = selected?.type === "timeline";
      if (!isBlockLike && !canPasteOnTimeline) return;

      const alt = e.altKey && !e.metaKey && !e.ctrlKey;
      const code = e.code;
      const key = e.key;

      if (grouping) {
        if (selected?.type !== "preset") return;
        const ids =
          useEditorStore.getState().selectedPresetIds.length > 0
            ? useEditorStore.getState().selectedPresetIds
            : [selected.item.id];
        e.preventDefault();
        e.stopImmediatePropagation();
        groupSelectedBlocks(selected.timeline, ids);
        return;
      }

      if (scope !== "left") return;

      // Paste works on timeline selection too (insert into that timeline)
      if (mod && !e.shiftKey && (key.toLowerCase() === "v" || code === "KeyV")) {
        const hasItem = !!useBlockClipboardStore.getState().itemClipboard;
        if (!hasItem) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        pasteClipboardItem();
        return;
      }

      // Remaining shortcuts require a block / reference / action selection
      if (!isBlockLike) return;

      // Alt+C / Alt+V — props clipboard (use code: Alt changes `key` on some layouts)
      if (alt && code === "KeyC") {
        e.preventDefault();
        e.stopImmediatePropagation();
        void copySelectedProps();
        return;
      }
      if (alt && code === "KeyV") {
        e.preventDefault();
        e.stopImmediatePropagation();
        void pasteSelectedProps();
        return;
      }

      if (mod && (key === "ArrowUp" || key === "Up")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        moveSelectedItem("up");
        return;
      }
      if (mod && (key === "ArrowDown" || key === "Down")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        moveSelectedItem("down");
        return;
      }
      if (mod && (key.toLowerCase() === "d" || code === "KeyD")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        duplicateSelectedItem();
        return;
      }
      if (mod && !e.shiftKey && (key.toLowerCase() === "c" || code === "KeyC")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        copySelectedItem();
        return;
      }
      if (key === "Delete" || key === "Backspace") {
        e.preventDefault();
        e.stopImmediatePropagation();
        deleteSelectedItem();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
