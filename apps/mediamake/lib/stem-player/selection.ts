/*
 * What is selected in the sidebar, and so what is heard. `order` is every track the sidebar shows,
 * top to bottom. The rules are a file list's: a click selects one, ⌘/Ctrl-click adds or removes,
 * Shift-click and Shift-arrows select a range from where it started. Once something is selected
 * the selection is never empty.
 */

export interface Selection {
  /** Selected tracks, in the sidebar's order. */
  selected: string[];
  /** The track the arrow keys move from: its folder is the current project. */
  focus: string | null;
  /** Where a range starts. */
  anchor: string | null;
}

export const EMPTY: Selection = { selected: [], focus: null, anchor: null };

const sorted = (ids: Iterable<string>, order: string[]) => {
  const wanted = new Set(ids);
  const inOrder = order.filter(id => wanted.has(id));
  // tracks the sidebar no longer shows (their folder is folded) stay selected, after the shown ones
  return [...inOrder, ...[...wanted].filter(id => !inOrder.includes(id))];
};

function range(order: string[], from: string, to: string): string[] {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0) return [to];
  return order.slice(Math.min(a, b), Math.max(a, b) + 1);
}

/** A click on a track: alone, with ⌘/Ctrl (`toggle`) or with Shift (`range`). */
export function click(sel: Selection, order: string[], id: string, mods: { toggle?: boolean; range?: boolean } = {}): Selection {
  if (mods.range && (sel.anchor || sel.focus)) {
    const anchor = sel.anchor ?? sel.focus!;
    return { selected: range(order, anchor, id), focus: id, anchor };
  }
  if (mods.toggle && sel.selected.length) {
    if (!sel.selected.includes(id)) return { selected: sorted([...sel.selected, id], order), focus: id, anchor: id };
    if (sel.selected.length === 1) return sel;
    const selected = sel.selected.filter(s => s !== id);
    const focus = sel.focus === id ? selected[selected.length - 1] : sel.focus;
    return { selected, focus, anchor: focus };
  }
  return { selected: [id], focus: id, anchor: id };
}

/** ↑ or ↓: the previous or next track, alone, or (with Shift, `extend`) the range grown or shrunk to it. */
export function move(sel: Selection, order: string[], delta: 1 | -1, extend = false): Selection {
  if (!order.length) return sel;
  const at = sel.focus ? order.indexOf(sel.focus) : -1;
  // from a track that isn't shown (or none): the first one going down, the last going up
  const next = at < 0 ? (delta > 0 ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, at + delta));
  const id = order[next];
  if (extend && sel.focus && at >= 0) {
    const anchor = sel.anchor && order.includes(sel.anchor) ? sel.anchor : sel.focus;
    return { selected: range(order, anchor, id), focus: id, anchor };
  }
  return { selected: [id], focus: id, anchor: id };
}

/** Every track of one folder (⌘/Ctrl A); the focus stays when it is one of them. */
export function selectAll(sel: Selection, ids: string[]): Selection {
  if (!ids.length) return sel;
  const focus = sel.focus && ids.includes(sel.focus) ? sel.focus : ids[0];
  return { selected: [...ids], focus, anchor: ids[0] };
}

/** The selection without tracks that are gone (a root was closed). */
export function prune(sel: Selection, exists: (id: string) => boolean): Selection {
  const selected = sel.selected.filter(exists);
  if (selected.length === sel.selected.length && (!sel.focus || exists(sel.focus))) return sel;
  const focus = sel.focus && exists(sel.focus) ? sel.focus : (selected[0] ?? null);
  return { selected, focus, anchor: sel.anchor && exists(sel.anchor) ? sel.anchor : focus };
}
