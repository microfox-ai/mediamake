"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PORTALED_MENU_SELECTOR = [
  "[data-radix-popper-content-wrapper]",
  "[data-slot='popover-content']",
  "[data-slot='select-content']",
  "[data-slot='dropdown-menu-content']",
  "[data-slot='dropdown-menu-sub-content']",
  "[role='listbox']",
].join(",");

function isPortaledMenuTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(PORTALED_MENU_SELECTOR));
}

/** Edit panel that opens to the left of its field anchor instead of a centered dialog. */
export function AnchoredEditPopover({
  open,
  onOpenChange,
  anchor,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{anchor}</PopoverAnchor>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "z-50 w-[min(28rem,calc(100vw-1.5rem))] max-h-[min(70vh,36rem)] overflow-y-auto p-3",
          className,
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (isPortaledMenuTarget(event.target)) event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (isPortaledMenuTarget(event.target)) event.preventDefault();
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">{title}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        {children}
      </PopoverContent>
    </Popover>
  );
}
