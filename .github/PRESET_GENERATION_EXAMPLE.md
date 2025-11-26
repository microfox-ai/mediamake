# Example: Creating Presets via GitHub Issues

This document provides a complete, ready-to-use example for generating presets using the automated workflow.

## Quick Start

1. Go to your repository's **Issues** tab
2. Click **"New Issue"**
3. Enter the following:

### Title
```
New Presets
```

### Description (Copy & Paste)

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

4. Click **"Submit new issue"**

## What Happens Next?

1. **Immediate**: The GitHub Actions workflow triggers automatically
2. **Within 2-5 minutes**: The workflow:
   - Parses your JSON array
   - Calls the MediaMake API for each preset
   - Generates TypeScript code
   - Creates files in the `generated/` directory
   - Creates Pull Requests for each preset
3. **Result**: You'll see:
   - A comment on your issue with the results
   - Individual PRs for each successfully generated preset

## Expected Output

### Issue Comment
```markdown
## 🤖 Preset Generation Results

**Total Requests:** 2
**Successful:** 2
**Failed:** 0

### ✅ Successfully Generated

- **Preset 1** (`cinematic-depth-parallax`) - PR #42: https://github.com/.../pull/42
- **Preset 2** (`vertical-scroll-parallax`) - PR #43: https://github.com/.../pull/43
```

### Pull Requests
Each PR will contain:
- **File**: `apps/mediamake/components/editor/presets/registry/generated/<preset-id>.ts`
- **Content**: Complete TypeScript preset implementation
- **Description**: Details about the generated preset

## Simpler Example (For Testing)

If you want to test with a simpler preset first:

### Title
```
New Presets
```

### Description
```json
[
  {
    "prompt": "Create a simple fade-in animation preset for text. The text should start invisible and gradually fade in over 1 second using opacity transitions. Use TextAtom component with smooth easing.",
    "technicalSpecs": "Use BaseLayout container with TextAtom child. Apply generic effect with opacity property: range from 0 to 1. Duration: 1 second. Easing: ease-in-out. Use Tailwind classes for base styling. Component should accept text content as a parameter."
  }
]
```

## Custom Configurations

You can customize the preset generation by modifying the prompt and technical specs:

### Elements to Include in Prompt
- **Animation Type**: fade, slide, zoom, rotate, parallax, etc.
- **Visual Style**: cinematic, modern, retro, minimalist, etc.
- **Components**: BaseLayout, TextAtom, ImageAtom, VideoAtom, ShapeAtom
- **Timing**: duration, delays, stagger effects
- **Interaction**: mouse-based, audio-reactive, time-based
- **Effects**: blur, glow, shadows, transforms

### Elements to Include in Technical Specs
- **Structure**: Component hierarchy and nesting
- **Styling**: Tailwind classes and inline styles
- **Effects**: Generic effects configuration (property, range, easing)
- **Parameters**: Zod schema for configurable values
- **Dependencies**: Other presets or internal effects to use
- **Performance**: GPU acceleration, will-change properties

## Advanced Examples

### Audio-Reactive Preset
```json
[
  {
    "prompt": "Build a REACTIVE AUDIO PARALLAX preset that synchronizes layer movement with audio beats. Background layers pulse and shift with the rhythm. Implement 3-5 BaseLayout layers responding to different frequency ranges (bass, mids, treble). Use waveform effects with audio analysis. Add color shifts that react to audio intensity. Include beat-synchronized position resets where layers snap to new positions on strong beats.",
    "technicalSpecs": "Structure: BaseLayout container 'relative w-full h-full overflow-hidden'. Create 3-5 layers with different waveform effect configurations. Use AudioAtom for audio source. Apply waveform effects: {type: 'translate', audioProperty: 'bass', sensitivity: 2, threshold: 0.3} for background, 'mid' for middle, 'treble' for foreground. Add color/brightness waveform effects: {type: 'brightness', audioProperty: 'intensity'}. Use internal effect presets for beat-zoom and beat-shake. Set proper z-index ordering and will-change: transform."
  }
]
```

### Typography Animation Preset
```json
[
  {
    "prompt": "Create a TYPOGRAPHY-DRIVEN PARALLAX where text layers move at different depths creating a kinetic typography effect. Think of title sequences in films where text floats in 3D space. Use TextAtom components with caption data, each word or line on different parallax layers. Implement word-by-word reveal with depth-based timing offsets. Add shadow layers that move opposite to text for depth illusion.",
    "technicalSpecs": "Container: BaseLayout 'relative w-full h-full overflow-hidden'. Parse caption data to create individual TextAtom components per word/phrase. Each TextAtom wrapped in BaseLayout with different z-index and parallax speed. Apply translateZ via transform3d for true 3D depth. Use perspective: 1000px on container. Implement word timing from caption data with staggered reveals. Add text-shadow that shifts based on position. Use generic effects for movement: [{property: 'translateY', range: based on word.impact}]."
  }
]
```

## Troubleshooting

### Workflow Doesn't Start
- Check that your title is exactly "New Presets" (any casing works)
- Go to Actions tab to see if the workflow is disabled
- Check if the workflow file exists at `.github/workflows/generate-presets-from-issue.yml`

### JSON Parse Error
- Validate your JSON using [jsonlint.com](https://jsonlint.com/)
- Ensure you have both `prompt` and `technicalSpecs` for each preset
- Check for missing commas, brackets, or quotes
- Don't add any text before or after the JSON array

### PR Not Created
- Check the Actions tab for detailed error logs
- Verify repository settings allow PRs from workflows
- Ensure the workflow has write permissions

### API Errors
- The API might be rate-limited or down
- Check the workflow logs for specific error messages
- Try again after a few minutes
- For persistent issues, contact the repository maintainers

## Tips for Best Results

1. **Be Specific**: Detailed prompts produce better results
2. **Reference Examples**: Mention similar presets or effects you've seen
3. **Include Use Cases**: Describe when/where the preset would be used
4. **Specify Components**: Name the exact atoms/layouts you want to use
5. **Define Parameters**: List what should be configurable
6. **Consider Performance**: Mention GPU acceleration, optimization needs
7. **Test Iteratively**: Start with simple presets, then increase complexity

## Need Help?

- 📖 Read the full documentation: `.github/PRESET_GENERATION_WORKFLOW.md`
- 💬 Comment on your issue if you have questions
- 🐛 Report bugs by creating a separate issue with the "bug" label
- 🔧 For modifications, edit `.github/workflows/generate-presets-from-issue.yml`

