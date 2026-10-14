import { Lock } from "lucide-react";

/** Sits on a timeline chip when that row is linked or packed in a sequence. */
export function BlockLockBadge() {
  return (
    <Lock className="pointer-events-none absolute left-0.5 top-0.5 z-20 size-2.5 text-foreground/80" />
  );
}
