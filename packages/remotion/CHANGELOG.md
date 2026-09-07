# Changelog

## 2.0.0

### Major Changes

- b5ccd94: Replace the bespoke canvas components with a declarative CanvasPipeline.

  **Breaking changes**
  - Removed the `CanvasAtom` atom and its `CanvasAtomConfig` / `CanvasAtomDataProps`
    exports. A bare `<canvas>` is not drivable from preset JSON; use the
    `CanvasPipeline` atom instead.
  - Removed the bespoke canvas effects `CanvasReveal`, `CanvasWipeReveal`,
    `CanvasContentAwareReveal`, `CanvasGlitchEffect` and `CanvasParticleEffect`,
    along with their `registerEffect` registrations. The equivalent behaviour is now
    expressed as ops (`draw`, `clip`, `mask`, `particles`, `glitch`, `post`) composed
    through the `CanvasFx` effect.
  - Raised the `remotion` and `@remotion/*` peer dependency range from `>=4.0.355`
    to `>=4.0.496`, required by the stable `@remotion/web-renderer` API.

  **Added**
  - `CanvasPipeline` atom and `CanvasFx` effect, backed by a canvas op registry with
    runtime param resolution, seeded RNG, geometry helpers, asset loading and timing.
  - `useCanvasPipeline` hook and the `draw` / `clip` / `mask` / `particles` /
    `glitch` / `post` op standard library.

  **Migration**

  Saved layers referencing the removed component ids will not resolve against the
  registry and must be re-applied from an updated preset. Presets shipped in this
  repo have already been ported.

### Patch Changes

- 3d0c339: Changes from PR #404: after-editor-preset-refactor-merge
- a915df0: Changes from PR #399: editor-refactor

## 1.2.6

### Patch Changes

- 845bb98: Changes from PR #383: layers-preview-editor

## 1.2.5

### Patch Changes

- 4b2846e: Changes from PR #375: aws-rendering-configs
- d3fafd6: Changes from PR #377: agent-search-and-preset-sharing

## 1.2.4

### Patch Changes

- 320390f: Changes from PR #371: gen-images-sets

## 1.2.3

### Patch Changes

- fcbdf2f: Changes from PR #38: editor
- c735283: Changes from PR #32: pg_transcription_upgrades
- 7ebd522: Changes from PR #25: pg_importablepreset_0111

## 1.2.2

### Patch Changes

- 253b532: Changes from PR #23: pg_textatoms_3010

## 1.2.1

### Patch Changes

- 3ebccf0: Changes from PR #17: pg_presets_e11_1810
- ef8ed5a: Changes from PR #20: pg_newtwo_2210
- 5afec44: Changes from PR #21: mediamake-newstuff

## 1.2.0

### Minor Changes

- ff1c0de: errors fixed

## 1.1.0

### Minor Changes

- 4a75ab2: new features of remotion

## 1.0.2

### Patch Changes

- 5624da8: Triggered by issue #9: release @microfox/remotion

## 1.0.1

### Patch Changes

- b7b8bdf: Changes from PR #6: upgrades

## 1.0.2

### Patch Changes

- 4ab0a10: update dependencies

## 1.0.1

### Patch Changes

- 14ea00b: Triggered by issue #2: release @microfox/remotion patch

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

- **Complete recursive composition system** with unified component architecture
- **Core Components**:
  - `Composition` - Main composition component
  - `SimpleComposition` - Simplified composition for quick setup
  - `SceneFrame` and `OverlayFrame` - Frame components
  - `GridLayout`, `VerticalLayout`, `HorizontalLayout` - Basic layouts
  - `CircularLayout`, `OverlayLayout`, `FlexLayout` - Advanced layouts
  - `TextAtom`, `ImageAtom`, `VideoAtom`, `AudioAtom`, `ShapeAtom` - Atom components

- **Core System**:
  - `RenderableComponentData` interface for recursive component structure
  - `RenderableContext` for boundary and timing management
  - Component registry system for extensibility
  - Context-driven rendering with automatic boundary calculation

- **Hooks**:
  - `useRenderableContext` - Context and boundary management
  - `useComponentRegistry` - Registry management
  - `useBoundaryCalculation` - Boundary calculation utilities

- **Utilities**:
  - `createCompositionBuilder` - Programmatic composition creation
  - `createSimpleComposition` - Quick composition setup
  - Context utilities for boundary and timing management
  - Boundary calculation utilities for positioning

- **Documentation**:
  - Comprehensive API documentation
  - Usage examples and best practices
  - Architecture and implementation guides

### Features

- **Recursive Component Pattern**: Every component can contain other components
- **Context-Driven Rendering**: Automatic boundary and timing calculation
- **Remotion-Native Design**: Built entirely on Remotion's core components
- **Extensible Registry**: Support for external package integration
- **Type Safety**: Full TypeScript support with comprehensive interfaces

### Architecture

- **Three Pillars**: Recursive Component Pattern, Context-Driven Rendering, Remotion-Native Design
- **Unified Interface**: All components follow the same recursive pattern
- **Performance Optimized**: Built on Remotion's efficient rendering engine
- **Developer Friendly**: Simple APIs with powerful capabilities

---

This is the initial release of @microfox/remotion, providing a complete foundation for building complex video compositions with Remotion using a unified, recursive component architecture.
