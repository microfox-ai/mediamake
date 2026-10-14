"use client";

import { createContext, useContext } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Sibling and parent track names, plus every child when the preset is a scene. */
export const LockTargetNamesContext = createContext<string[]>([]);

const NONE = "__none__";

export function LockTargetInput({
  value,
  onChange,
  className,
  size = "default",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "default";
}) {
  const names = useContext(LockTargetNamesContext);
  const options = value && !names.includes(value) ? [value, ...names] : names;

  return (
    <Select
      value={value || NONE}
      onValueChange={(next) => onChange(next === NONE ? "" : next)}
    >
      <SelectTrigger size={size} className={cn("w-full", className)}>
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>None</SelectItem>
        {options.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
