import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppliedNode } from "@/components/editor_main/timing/types";
import { VIRTUAL_ROOT_ID } from "@/components/editor_main/timing/load-instance-tree";
import {
  buildTimelineBreadcrumbs,
  presetBreadcrumbPath,
  type BreadcrumbModel,
} from "./timeline-breadcrumbs";

function node(
  partial: Pick<AppliedNode, "id"> & Partial<Omit<AppliedNode, "id">>,
): AppliedNode {
  return {
    presetId: partial.presetId ?? "media-track",
    name: partial.name ?? partial.id,
    role: partial.role ?? "track",
    input: partial.input ?? {},
    children: partial.children ?? [],
    id: partial.id,
    timing: partial.timing ?? { kind: "explicit", start: 0, duration: 1 },
  };
}

function labels(model: BreadcrumbModel): string[] {
  return buildTimelineBreadcrumbs(model).map((step) => step.label);
}

function targets(model: BreadcrumbModel): Array<string | undefined> {
  return buildTimelineBreadcrumbs(model).map((step) => step.target?.type);
}

describe("presetBreadcrumbPath", () => {
  const tree = node({
    id: "root",
    presetId: VIRTUAL_ROOT_ID,
    role: "scene",
    name: "root",
    children: [
      node({
        id: "base",
        presetId: "base-scene",
        role: "scene",
        name: "Base scene",
        children: [
          node({
            id: "intro",
            presetId: "scene",
            role: "scene",
            name: "intro",
            children: [node({ id: "title", name: "title" })],
          }),
          node({ id: "music", name: "music" }),
        ],
      }),
    ],
  });

  it("stops at the base scene", () => {
    assert.deepEqual(presetBreadcrumbPath(tree, "music"), [
      { id: "music", name: "music" },
    ]);
    assert.deepEqual(presetBreadcrumbPath(tree, "title"), [
      { id: "intro", name: "intro" },
      { id: "title", name: "title" },
    ]);
    assert.deepEqual(presetBreadcrumbPath(tree, "base"), []);
  });

  it("omits the root scene when that scene is the base", () => {
    const rooted = node({
      id: "root-scene",
      presetId: "scene",
      role: "scene",
      name: "Scene",
      children: [
        node({
          id: "inner",
          presetId: "scene",
          role: "scene",
          name: "Scene",
        }),
      ],
    });
    assert.deepEqual(presetBreadcrumbPath(rooted, "inner"), [
      { id: "inner", name: "Scene" },
    ]);
    assert.deepEqual(
      labels({
        selection: "preset",
        presetPath: presetBreadcrumbPath(rooted, "inner"),
      }),
      ["Base", "Scene"],
    );
  });
});

describe("buildTimelineBreadcrumbs", () => {
  it("shows Base for a timeline", () => {
    assert.deepEqual(labels({ selection: "timeline", presetPath: [] }), ["Base"]);
    assert.deepEqual(targets({ selection: "timeline", presetPath: [] }), [undefined]);
  });

  it("walks preset track names and keeps ancestors clickable", () => {
    const model: BreadcrumbModel = {
      selection: "preset",
      presetPath: [
        { id: "intro", name: "intro" },
        { id: "title", name: "title" },
      ],
    };
    assert.deepEqual(labels(model), ["Base", "intro", "title"]);
    assert.deepEqual(targets(model), ["timeline", "preset", undefined]);
  });

  it("puts a range under its preset, or directly under Base", () => {
    assert.deepEqual(
      labels({
        selection: "preset",
        presetPath: [{ id: "clips", name: "clips" }],
        leaf: { type: "block", label: "Image 2" },
      }),
      ["Base", "clips", "Image 2"],
    );
    assert.deepEqual(
      targets({
        selection: "preset",
        presetPath: [{ id: "clips", name: "clips" }],
        leaf: { type: "block", label: "Image 2" },
      }),
      ["timeline", "preset", undefined],
    );
    assert.deepEqual(
      labels({
        selection: "timeline",
        presetPath: [],
        leaf: { type: "block", label: "range" },
      }),
      ["Base", "range"],
    );
  });

  it("shows a reference, and a line for a line or word", () => {
    const reference = { index: 0, label: "captions" };
    assert.deepEqual(
      labels({ selection: "reference", presetPath: [], reference }),
      ["Base", "captions"],
    );
    const line = {
      selection: "reference" as const,
      presetPath: [],
      reference,
      leaf: { type: "line" as const, label: "hello", lineIdx: 1, word: false },
    };
    assert.deepEqual(labels(line), ["Base", "captions", "hello"]);
    assert.deepEqual(targets(line), ["timeline", "reference", undefined]);
    const word = {
      ...line,
      leaf: { type: "line" as const, label: "hello", lineIdx: 1, word: true },
    };
    assert.deepEqual(labels(word), ["Base", "captions", "hello"]);
    assert.deepEqual(targets(word), ["timeline", "reference", "line"]);
  });

  it("shows the action name under Base", () => {
    assert.deepEqual(
      labels({ selection: "action", presetPath: [], actionLabel: "Ken Burns" }),
      ["Base", "Ken Burns"],
    );
  });
});
