"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BASE_SCENE = "BaseScene";

/** Parent a preset inserts into. BaseScene is always offered. */
export function AttachTargetInput({
  value,
  onChange,
  names,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  names: string[];
  className?: string;
}) {
  const selected = value.trim() || BASE_SCENE;
  const options = [BASE_SCENE, ...names.filter((name) => name && name !== BASE_SCENE)];
  const list = options.includes(selected) ? options : [selected, ...options];

  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={BASE_SCENE} />
      </SelectTrigger>
      <SelectContent>
        {list.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
