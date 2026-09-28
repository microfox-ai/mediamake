/**
 * Tracks which editor panel the user last focused / clicked so keyboard
 * shortcuts can be scoped (e.g. block ⌘C only in the left file tree, not
 * while editing the right-side SchemaForm).
 */

export type EditorFocusScope = "left" | "center" | "right" | "bottom";

const SCOPE_ATTR = "data-editor-scope";

let lastScope: EditorFocusScope | null = null;
let trackingInstalled = false;

function readScopeFromNode(node: EventTarget | null): EditorFocusScope | null {
  if (!(node instanceof Element)) {
    const parent = node instanceof Node ? node.parentElement : null;
    if (!parent) return null;
    return readScopeFromNode(parent);
  }
  const host = node.closest(`[${SCOPE_ATTR}]`);
  if (!host) return null;
  const value = host.getAttribute(SCOPE_ATTR);
  if (
    value === "left" ||
    value === "center" ||
    value === "right" ||
    value === "bottom"
  ) {
    return value;
  }
  return null;
}

function setScopeFromEvent(e: Event) {
  const scope = readScopeFromNode(e.target);
  if (scope) lastScope = scope;
}

/** Install once — pointerdown catches clicks on non-focusable rows; focusin covers tabbing. */
export function installEditorFocusScopeTracking() {
  if (typeof document === "undefined" || trackingInstalled) {
    return () => {};
  }
  trackingInstalled = true;
  document.addEventListener("pointerdown", setScopeFromEvent, true);
  document.addEventListener("focusin", setScopeFromEvent, true);
  return () => {
    document.removeEventListener("pointerdown", setScopeFromEvent, true);
    document.removeEventListener("focusin", setScopeFromEvent, true);
    trackingInstalled = false;
  };
}

/** Last panel the user interacted with (click or focus). */
export function getEditorFocusScope(): EditorFocusScope | null {
  // Prefer live DOM focus when it sits inside a scoped panel
  if (typeof document !== "undefined") {
    const live = readScopeFromNode(document.activeElement);
    if (live) return live;
  }
  return lastScope;
}

export function isEditorFocusScope(scope: EditorFocusScope): boolean {
  return getEditorFocusScope() === scope;
}
