import type { OnScreen, SelectedInfo } from './store';

/*
 * Reading the marked elements (`data-edit-*`, written by the kit's editable()) out of the Player's
 * DOM. The composition renders in this document, so its elements can be measured directly.
 */

export type Box = { left: number; top: number; width: number; height: number };

const isLayerId = (id: string) => id.startsWith('layer:');

export const elementsById = (root: ParentNode, id: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(`[data-edit-id="${CSS.escape(id)}"]`));

/** Hidden by opacity 0 or visibility on itself or an ancestor (Chrome's checkVisibility). */
const isVisible = (el: Element) => {
  const check = (el as Element & { checkVisibility?: (o: object) => boolean }).checkVisibility;
  return check
    ? check.call(el, {
        opacityProperty: true,
        visibilityProperty: true,
        checkOpacity: true,
        checkVisibilityCSS: true,
      })
    : true;
};

/** Union of the elements' rectangles, relative to `origin` (screen coordinates when omitted). */
export function unionBox(els: Element[], origin?: DOMRect): Box | null {
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const el of els) {
    const rect = el.getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    l = Math.min(l, rect.left);
    t = Math.min(t, rect.top);
    r = Math.max(r, rect.right);
    b = Math.max(b, rect.bottom);
  }
  if (l === Infinity) return null;
  const ox = origin?.left ?? 0;
  const oy = origin?.top ?? 0;
  return { left: l - ox, top: t - oy, width: r - l, height: b - t };
}

export const contains = (box: Box | null, x: number, y: number) =>
  !!box && x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height;

const textOf = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) ?? '';

export function infoFor(el: Element): SelectedInfo {
  const id = el.getAttribute('data-edit-id') ?? '';
  const props = el.getAttribute('data-edit-props');
  const fields = el.getAttribute('data-edit-fields');
  const text = textOf(el);
  return {
    id,
    label: el.getAttribute('data-edit-label') || text || id,
    text,
    layer: el.closest('[data-edit-layer]')?.getAttribute('data-edit-layer') ?? null,
    propsPath: props,
    fields: fields ? fields.split(',').filter(Boolean) : [],
  };
}

export type Hit = { id: string; el: Element; area: number };

/**
 * The visible marked elements under a screen point, smallest first: the most specific thing is
 * picked, and Alt-click walks outwards. Whole layers aren't picked by clicking; the layers list
 * selects those.
 */
export function hitTest(root: ParentNode, x: number, y: number): Hit[] {
  const best = new Map<string, Hit>();
  for (const el of root.querySelectorAll<HTMLElement>('[data-edit-id]')) {
    const id = el.getAttribute('data-edit-id')!;
    if (isLayerId(id)) continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
    if (!isVisible(el)) continue;
    const area = rect.width * rect.height;
    if (area < (best.get(id)?.area ?? Infinity)) best.set(id, { id, el, area });
  }
  return [...best.values()].sort((a, b) => a.area - b.area);
}

/** The marked elements visible now, once each, in drawing order. */
export function scanOnScreen(root: ParentNode): OnScreen[] {
  const seen = new Set<string>();
  const out: OnScreen[] = [];
  for (const el of root.querySelectorAll<HTMLElement>('[data-edit-id]')) {
    const id = el.getAttribute('data-edit-id')!;
    if (isLayerId(id) || seen.has(id)) continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height || !isVisible(el)) continue;
    seen.add(id);
    const info = infoFor(el);
    out.push({ id, label: info.label, layer: info.layer });
  }
  return out;
}

/**
 * Screen pixels per CSS pixel of the element's parent: the Player's scale times any scale the
 * scene applies above the element. A drag divides by it to get a translate in the parent's space.
 * Inside an <svg>, its width attribute plays the part of offsetWidth.
 */
export function parentScale(el: Element, fallback: number) {
  const parent = el.parentElement;
  if (parent?.offsetWidth) {
    return parent.getBoundingClientRect().width / parent.offsetWidth || fallback;
  }
  const svg = el instanceof SVGElement ? el.ownerSVGElement : null;
  const width = svg?.width.baseVal.value;
  if (svg && width) return svg.getBoundingClientRect().width / width || fallback;
  return fallback;
}
