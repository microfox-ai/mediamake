# MediaMake

> **⚠️ Work in Progress:** This project is currently under development. Please contact [karcreativeworks](https://github.com/karcreativeworks) if you want access, have requests, or wish to contribute.

A comprehensive AI-driven video generation tools & libraries built on top of Remotion, designed to create professional videos & edits through data-driven components and automated workflows.

## Overview

MediaMake is a complete ecosystem for AI-powered video creation that transforms complex video editing into simple, data-driven processes. The platform consists of multiple interconnected components that work together to enable AI agents to generate professional videos through structured JSON data.

## Core Architecture

### 1. DataMotion Package

The foundational package that hosts core configurations and provides data-based components with predefined AI configurations. DataMotion enables AI systems to generate video content on-the-fly by:

- Helper tools/agents with predefined zods to generate the edits.
- Hosting a large set of configurable effects, transitions, and layouts
- Enabling multiple video variations from the same data input
- Supporting dynamic component generation for future scalability

### 2. MediaMek Application (Next.js App)

A comprehensive platform that combines:

- **Player Component**: Real-time video preview and testing with JSON input
- **Editor Component**: Visual editing interface (exportable as react package in future for react based AI agent builders)
- **Uploader**: Git workflow-based code publishing
- **Registry System**: Component and project management

JSON => REMOTION => VIDEO
<img width="1510" height="767" alt="image" src="https://github.com/user-attachments/assets/8742dd70-8e7e-4261-a552-c670acc69a43" />

Render History With Billing Details
<img width="1500" height="770" alt="image" src="https://github.com/user-attachments/assets/62714a8d-90f3-4071-b2e8-1cad33c0881b" />




### 3. @microfox/remotion

A wrapper library around Remotion that provides:

- Converting simple JSON data into complex Remotion components
- Type-safe component registry for easy coding
- Helper functions for building videos
- Pre-configured base settings and compositions
- Layout management with timing controls
- Scene, Layout, and Atom component architecture

## Catalog: releases, access and installs

MediaMake hands out MCPs, skills, apps and tutorials as catalog items. The
code for this is here; the packages themselves live in private storage.

- **Install an item**: open its card on the MediaMake homepage (or
  `/access?item=<kind>/<name>`), copy the install prompt and paste it into
  Claude. [`install.md`](install.md) is what Claude follows.
- **Release and share** (admins): `npm run catalog` in `apps/mediamake`.
  Who has access to what is recorded in the database (grants, groups,
  invites, requests), and `npm run catalog -- list` prints it. See
  [docs/catalog-releases.md](apps/mediamake/docs/catalog-releases.md).
- **Related code**: the [Get into zone extension and its MCP](https://github.com/microfox-ai/extensions).

## Contributing

MediaMek is designed to be extensible. The modular architecture allows for easy addition of new components, effects, and data structures.

## License

This project builds upon Remotion and requires appropriate licensing for production use. See Remotion's licensing terms for details.
