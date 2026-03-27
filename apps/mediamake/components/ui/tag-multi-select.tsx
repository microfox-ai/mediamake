"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { Tag } from "@/app/types/media";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TagMultiSelectProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  label?: string;
  required?: boolean;
  showCreateNew?: boolean;
  placeholder?: string;
  className?: string;
}

export function TagMultiSelect({
  selectedTags,
  onTagsChange,
  label = "Tags",
  required = false,
  showCreateNew = true,
  placeholder = "Search or select tags...",
  className,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: allTags, isLoading, mutate } = useSWR<Tag[]>("/api/tags", fetcher);
  const tags = allTags ?? [];

  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const q = search.toLowerCase();
    return tags.filter(
      (t) =>
        t.displayName.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }, [tags, search]);

  const exactMatch = useMemo(
    () =>
      tags.some(
        (t) =>
          t.displayName.toLowerCase() === search.trim().toLowerCase() ||
          t.id.toLowerCase() === search.trim().toLowerCase()
      ),
    [tags, search]
  );

  const toggle = useCallback(
    (tagId: string) => {
      onTagsChange(
        selectedTags.includes(tagId)
          ? selectedTags.filter((id) => id !== tagId)
          : [...selectedTags, tagId]
      );
    },
    [selectedTags, onTagsChange]
  );

  const remove = useCallback(
    (tagId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onTagsChange(selectedTags.filter((id) => id !== tagId));
    },
    [selectedTags, onTagsChange]
  );

  const createTag = useCallback(async () => {
    const name = search.trim();
    if (!name || isCreating) return;

    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    setIsCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, displayName: name }),
      });
      if (res.ok) {
        const newTag: Tag = await res.json();
        await mutate();
        onTagsChange([...selectedTags, newTag.id]);
        setSearch("");
      }
    } catch {
      // silently fail — tag creation is best-effort
    } finally {
      setIsCreating(false);
    }
  }, [search, isCreating, mutate, selectedTags, onTagsChange]);

  const getDisplayName = useCallback(
    (tagId: string) => {
      return tags.find((t) => t.id === tagId)?.displayName ?? tagId;
    },
    [tags]
  );

  const canCreate =
    showCreateNew && search.trim().length > 0 && !exactMatch && !isCreating;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && selectedTags.length === 0 && (
            <span className="text-destructive text-sm ml-2">(Required)</span>
          )}
        </Label>
      )}

      {/* Selected tags badges */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tagId) => (
            <Badge
              key={tagId}
              variant="secondary"
              className="flex items-center gap-1 pr-1 text-xs"
            >
              {getDisplayName(tagId)}
              <button
                type="button"
                onClick={(e) => remove(tagId, e)}
                className="rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                aria-label={`Remove tag ${getDisplayName(tagId)}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground"
          >
            {selectedTags.length === 0
              ? placeholder
              : `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && filteredTags.length === 0 && !canCreate && (
                <CommandEmpty>No tags found.</CommandEmpty>
              )}

              {filteredTags.length > 0 && (
                <CommandGroup>
                  {filteredTags.map((tag) => {
                    const selected = selectedTags.includes(tag.id);
                    return (
                      <CommandItem
                        key={tag.id}
                        value={tag.id}
                        onSelect={() => toggle(tag.id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4 shrink-0",
                            selected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tag.displayName}
                        {tag.displayName !== tag.id && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            #{tag.id}
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {canCreate && (
                <>
                  {filteredTags.length > 0 && <CommandSeparator />}
                  <CommandGroup>
                    <CommandItem
                      value={`__create__${search}`}
                      onSelect={createTag}
                      className="cursor-pointer text-muted-foreground"
                    >
                      {isCreating ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 size-4" />
                      )}
                      Create &quot;{search.trim()}&quot;
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
