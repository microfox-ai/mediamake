"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JsonEditor } from "@/components/editor/player/json-editor";
import { MediasGroupField } from "@/components/editor/presets/form/inputs/medias-group-field";
import { readMediaStatic } from "@/components/editor/presets/dataTypes/media";

/**
 * Reference editor for `media` and `medias`.
 * Media tab is the identity gallery (src, type, name, thumbnail). JSON edits the raw value.
 */
export function MediaReferencePanel({
  value,
  singular,
  onChange,
}: {
  value: unknown;
  singular: boolean;
  onChange: (next: unknown) => void;
}) {
  const [tab, setTab] = useState<"media" | "json">("media");
  const items = singular
    ? value && typeof value === "object" && !Array.isArray(value)
      ? [value]
      : []
    : Array.isArray(value)
      ? value
      : [];

  const commitItems = (next: any[]) => {
    const identity = next.map((item) => readMediaStatic(item));
    if (singular) onChange(identity[0] ?? { src: "" });
    else onChange(identity);
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(next) => setTab(next as "media" | "json")}
      className="w-full"
    >
      <TabsList className="grid grid-cols-2">
        <TabsTrigger value="media" className="text-xs">
          Media
        </TabsTrigger>
        <TabsTrigger value="json" className="text-xs">
          JSON
        </TabsTrigger>
      </TabsList>
      <TabsContent value="media" className="mt-3">
        <MediasGroupField
          value={items}
          singular={singular}
          identityOnly
          onChange={commitItems}
        />
      </TabsContent>
      <TabsContent value="json" className="mt-3">
        <JsonEditor
          value={value ?? (singular ? { src: "" } : [])}
          onChange={(next) => onChange(next)}
          height="420px"
          className="border rounded-md"
        />
      </TabsContent>
    </Tabs>
  );
}
