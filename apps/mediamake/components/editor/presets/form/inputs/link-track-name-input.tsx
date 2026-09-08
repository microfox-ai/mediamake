"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X } from "lucide-react";

/**
 * Combobox: pick an existing track name or type a custom string.
 */
export function LinkTrackNameInput({
  value,
  onChange,
  trackNames = [],
  placeholder = "Select or type a track name",
}: {
  value: string;
  onChange: (value: string) => void;
  trackNames?: string[];
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const uniqueNames = Array.from(
    new Set(trackNames.filter((n) => typeof n === "string" && n.trim())),
  ).sort((a, b) => a.localeCompare(b));

  const filtered = uniqueNames.filter((name) =>
    name.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const commit = (next: string) => {
    setInputValue(next);
    onChange(next);
  };

  return (
    <div className="flex gap-1.5">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Input
            value={inputValue}
            onChange={(e) => commit(e.target.value)}
            placeholder={placeholder}
            className="flex-1"
            onFocus={() => setIsOpen(true)}
          />
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tracks..."
              value={inputValue}
              onValueChange={commit}
            />
            <CommandList>
              <CommandEmpty>
                {uniqueNames.length === 0
                  ? "No tracks on this timeline yet."
                  : "No matching track."}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => {
                      commit(name);
                      setIsOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <span className="font-mono text-xs">{name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {inputValue ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => commit("")}
          title="Clear"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
