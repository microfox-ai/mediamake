# Preset Generation Workflow

This document describes how to use the automated preset generation workflow via GitHub Issues.

## Overview

The `generate-presets-from-issue.yml` workflow automatically generates preset files from GitHub issues. When you create an issue with the title "New Presets" (case-insensitive), the workflow will:

1. Parse the issue description as a JSON array of preset requests
2. For each preset request:
   - Call the MediaMake preset generation API
   - Create a new file in `apps/mediamake/components/editor/presets/registry/generated/`
   - Commit the file to a new branch
   - Create a Pull Request

## How to Use

### 1. Create a GitHub Issue

Create a new issue with:
- **Title:** "New Presets" (can be any casing: "new presets", "NEW PRESETS", etc.)
- **Description:** A JSON array of preset requests

### 2. Format the Issue Description

The issue description must be a valid JSON array where each element has:
- `prompt` (string): A detailed description of what the preset should do
- `technicalSpecs` (string): Technical specifications and implementation details

#### Example Issue Description

```json
[
  {
    "prompt": "Create a CINEMATIC DEPTH parallax preset that mimics professional video production depth-of-field effects. Think of how a dolly zoom creates dimensionality - implement multiple BaseLayout layers (5-7 layers) each moving at calculated speed ratios (furthest: 0.1x, mid-ground: 0.5x, foreground: 1x speed). Use transform: translateX/Y with varying speeds based on mouse position or time progression. Each layer should have subtle blur filters that increase with distance (backdrop-filter or filter blur). Add atmospheric perspective by reducing opacity and saturation on distant layers. Implement smooth easing curves (cubic-bezier) that mirror camera movement in film. Consider adding particle effects or floating elements between layers for additional depth cues. Use z-index stacking with proper will-change properties for GPU acceleration.",
    "technicalSpecs": "Structure: BaseLayout container with position:relative and overflow:hidden (Tailwind: 'relative overflow-hidden w-full h-full'). Create 5-7 child BaseLayout layers with position:absolute (Tailwind: 'absolute inset-0'). Use generic effects array with translateX/Y animations at different speeds per layer. Apply CSS filters via style prop: filter: blur(0-8px) based on depth, opacity: 0.4-1 for atmospheric perspective. Set will-change: transform on each layer. Use fitDurationTo: 'scene' for continuous animation. Implement AnimationRange effects with easing: 'ease-in-out' and different animation durations per layer (back: 20s, mid: 10s, front: 5s). Consider using repeatChildrenProps for generating multiple layer instances with incrementing blur/opacity values."
  },
  {
    "prompt": "Design a VERTICAL SCROLL PARALLAX preset inspired by modern editorial video transitions. Visualize how vertical wipes work in video editing - create layers that scroll upward at different speeds, simulating a camera crane shot. Implement at least 4 BaseLayout layers with ImageAtom or VideoAtom content. Use transform: translateY with staggered timing (background: -10%, midground: -20%, foreground: -40% over duration). Add Ken Burns effect on static images using scale transforms. Include gradient overlays for depth separation. Implement intersection-based triggers if possible, or use continuous animation with loop points. Add subtle rotation (1-3 degrees) to some layers for dynamic movement. Consider text overlays that fade in/out at specific scroll positions.",
    "technicalSpecs": "Use BaseLayout with Tailwind 'flex flex-col relative h-screen w-full overflow-hidden'. Child layers: BaseLayout with 'absolute inset-0 w-full h-full'. Implement ImageAtom/VideoAtom with fit: 'cover'. Apply generic effects: [{property: 'translateY', range: [{time: 0, value: '0%'}, {time: 1, value: '-40%'}]}] with different percentages per layer. Add scale effect for Ken Burns: [{property: 'scale', range: [{time: 0, value: 1}, {time: 1, value: 1.2}]}]. Use gradient overlays via BaseLayout with 'bg-gradient-to-b from-transparent to-black/20'. Set animation duration relative to parent using fitDurationTo. Consider adding TextAtom overlays with opacity effects timed to appear at specific scroll positions."
  }
]
```

### 3. Submit the Issue

Once you submit the issue, the workflow will automatically:
1. Detect the issue creation
2. Validate the issue title
3. Process each preset request
4. Create a Pull Request for each successfully generated preset
5. Add a comment to the issue with the results

## Workflow Results

After the workflow completes, you'll see:

### Success Comment
The workflow will add a comment to the issue with:
- Total number of requests processed
- Number of successful generations
- Number of failed generations
- Links to the created Pull Requests

### Pull Requests
Each successfully generated preset will have its own PR with:
- Title: "Add [preset-name] preset"
- Description including:
  - The preset ID
  - Metadata (title, description)
  - Original request details
  - Reference to the source issue

## API Integration

The workflow calls the MediaMake API endpoint:
```
POST https://mediamake-mediamake.vercel.app/api/studio/chat/agent/preset
```

With the body:
```json
{
  "prompt": "<combined prompt + technicalSpecs>"
}
```

The API uses the AI-powered preset generation system to:
1. Search for relevant examples (RAG)
2. Design the component architecture
3. Generate the TypeScript code
4. Return the code and metadata

## File Locations

Generated preset files are saved to:
```
apps/mediamake/components/editor/presets/registry/generated/
```

With the filename format:
```
<preset-id>.ts
```

## Error Handling

If the workflow encounters errors:
- Individual preset failures won't stop processing of other presets
- Failed presets will be listed in the summary comment
- The workflow will exit with an error code if any preset fails
- A failure comment will be added to the issue

## Troubleshooting

### Issue Not Processing
- Check that the issue title contains "new presets" (case-insensitive)
- Verify the issue description is valid JSON
- Check the Actions tab for workflow runs

### Invalid JSON Error
- Ensure the issue description is a valid JSON array
- Each element must have both `prompt` and `technicalSpecs` fields
- Use a JSON validator to check your input

### API Errors
- Check the workflow logs in the Actions tab
- Verify the API endpoint is accessible
- Ensure the API is not rate-limiting requests

### PR Creation Failures
- Check that the GitHub token has appropriate permissions
- Verify the repository allows PR creation from workflows
- Check for branch name conflicts

## Configuration

The workflow can be customized by modifying `.github/workflows/generate-presets-from-issue.yml`:

- **API Base URL:** Change the `API_BASE_URL` environment variable
- **Target Branch:** Modify the `base` field in the PR creation
- **Node Version:** Update the `node-version` in the setup step
- **File Location:** Update the `generatedDir` path in the script

## Security

- The workflow uses the default `GITHUB_TOKEN` for API authentication
- No external credentials are required
- Generated code is not automatically merged - review via PR first
- The API endpoint should be configured with appropriate rate limiting

## Related Files

- Workflow: `.github/workflows/generate-presets-from-issue.yml`
- Documentation: `.github/PRESET_GENERATION_WORKFLOW.md`
- Generate Agent: `apps/mediamake/app/ai/agents/preset/generate.agent.ts`
- API Endpoint: `apps/mediamake/app/api/studio/chat/agent/[...slug]/route.ts`

## Example Issues

You can reference these example issue bodies for testing:

### Single Preset
```json
[
  {
    "prompt": "Create a simple fade-in text animation",
    "technicalSpecs": "Use TextAtom with opacity transition from 0 to 1 over 1 second"
  }
]
```

### Multiple Presets
```json
[
  {
    "prompt": "Create preset A",
    "technicalSpecs": "Technical specs for A"
  },
  {
    "prompt": "Create preset B",
    "technicalSpecs": "Technical specs for B"
  }
]
```

