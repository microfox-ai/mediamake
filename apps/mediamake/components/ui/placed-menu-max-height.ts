"use client";

import * as React from "react";

/**
 * Cap a portaled menu to the space Radix measured, after it has been placed.
 *
 * The available-height CSS variable is updated while the menu is still parked
 * off-screen. Binding max-height to that live value collapses the menu and
 * makes positioning run again, which flickers and snaps menus shut when they
 * cross a panel or viewport edge.
 */
export function usePlacedMenuMaxHeight<T extends HTMLElement>() {
  const [node, setNode] = React.useState<T | null>(null);

  React.useLayoutEffect(() => {
    const wrapper = node?.parentElement;
    if (!node || !wrapper) return;

    const apply = () => {
      if (wrapper.style.transform.includes("-200%")) return;
      const raw = getComputedStyle(wrapper).getPropertyValue(
        "--radix-popper-available-height",
      );
      const next = Math.floor(Number.parseFloat(raw));
      if (!Number.isFinite(next) || next <= 0) return;
      const current = Math.floor(Number.parseFloat(node.style.maxHeight));
      if (Number.isFinite(current) && Math.abs(current - next) < 4) return;
      node.style.maxHeight = `${next}px`;
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(wrapper, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [node]);

  return setNode;
}
