# GitHub Issue Templates Guide

This document explains the issue templates available for preset generation requests.

## 📋 Available Templates

### 1. 🎬 New Presets Request
**File**: `.github/ISSUE_TEMPLATE/new-presets.yml`

**Best for:**
- All users (first-time and experienced)
- Complex preset requests with multiple presets
- Users who want guidance and examples

**Features:**
- ✅ Structured YAML form with validation
- ✅ Built-in examples (fade-in, parallax, audio-reactive, typography)
- ✅ Expandable sections with detailed examples
- ✅ Tips and best practices
- ✅ Validation checklist
- ✅ Automatic title setting
- ✅ Links to documentation

**How to use:**
1. Go to **Issues** tab
2. Click **New Issue**
3. Select **"🎬 New Presets Request"**
4. Fill in the preset specifications (or use one of the built-in examples)
5. Check the validation boxes
6. Submit

### 2. Template Configuration
**File**: `.github/ISSUE_TEMPLATE/config.yml`

**Purpose:**
- Provides links to helpful resources
- Shows documentation links in the issue creation page
- Links to bug reporting and discussions

## 🎯 What the Template Includes

### New Presets Request Template (new-presets.yml)

#### Form Fields
1. **Preset Specifications** (textarea)
   - Main input field for JSON array
   - Placeholder with example
   - Pre-filled with template structure

2. **Validation Checklist** (checkboxes)
   - JSON validation confirmation
   - Required fields confirmation
   - Documentation reading confirmation

#### Built-in Examples
The template includes 4 ready-to-use examples:

1. **Simple Fade-In Animation**
   - Basic opacity transition
   - Good for testing the workflow

2. **Parallax Effect**
   - Vertical scroll parallax
   - Multiple layers with different speeds
   - Ken Burns effect

3. **Audio-Reactive Animation**
   - Syncs with audio beats
   - Multiple frequency ranges
   - Waveform effects

4. **Typography Animation**
   - Kinetic text effects
   - 3D depth layers
   - Word-by-word reveals

#### Tips Sections
- **For Prompts**: What to include in descriptions
- **For Technical Specs**: How to structure implementation details
- **Best Practices**: How to get the best results

## 📝 How to Use the Template

### Using the New Presets Request Template

**Step 1: Select the Template**
```
Issues → New Issue → "🎬 New Presets Request"
```

**Step 2: Choose an Approach**

**Option A - Use an Example:**
1. Expand one of the example sections
2. Copy the JSON
3. Paste into the main field
4. Modify as needed

**Option B - Start from Scratch:**
1. Replace the placeholder JSON
2. Fill in your `prompt`
3. Fill in your `technicalSpecs`
4. Add more presets to the array if needed

**Step 3: Validate**
- Check the validation boxes
- Use [jsonlint.com](https://jsonlint.com/) to validate JSON
- Ensure all required fields are filled

**Step 4: Submit**
- Click "Submit new issue"
- Wait 2-5 minutes for results
- Check for PR links in the comment

## 🎨 Template Examples

### Example 1: Single Simple Preset

```json
[
  {
    "prompt": "Create a bounce-in animation for text that starts small and bounces to full size. Use elastic easing for a playful effect. The text should overshoot slightly before settling. Duration: 0.8 seconds.",
    "technicalSpecs": "BaseLayout with TextAtom. Apply scale effect from 0 to 1.1 to 1. Use elastic-out easing. Implement via generic effects: [{property: 'scale', range: [{time: 0, value: 0}, {time: 0.7, value: 1.1}, {time: 1, value: 1}]}]. Add slight rotation for extra dynamism."
  }
]
```

### Example 2: Multiple Related Presets

```json
[
  {
    "prompt": "Create a slide-in-left text animation. Text enters from the left edge and settles in the center.",
    "technicalSpecs": "BaseLayout with TextAtom. TranslateX from -100% to 0. Duration: 0.6s. Easing: ease-out."
  },
  {
    "prompt": "Create a slide-in-right text animation. Text enters from the right edge and settles in the center.",
    "technicalSpecs": "BaseLayout with TextAtom. TranslateX from 100% to 0. Duration: 0.6s. Easing: ease-out."
  },
  {
    "prompt": "Create a slide-in-top text animation. Text enters from the top and settles in the center.",
    "technicalSpecs": "BaseLayout with TextAtom. TranslateY from -100% to 0. Duration: 0.6s. Easing: ease-out."
  }
]
```

### Example 3: Complex Preset with Dependencies

```json
[
  {
    "prompt": "Create a cinematic title reveal preset. Combines multiple effects: starts with a blur that sharpens, text slides up while fading in, and includes a subtle glow that pulses. The animation should feel premium and polished, like a movie title card. Background should have animated grain texture for film aesthetic.",
    "technicalSpecs": "Use BaseLayout container with backdrop grain effect. TextAtom with multiple stacked effects: 1) Blur from 10px to 0 (0-0.5s), 2) TranslateY from 50px to 0 (0.2-0.8s), 3) Opacity from 0 to 1 (0.2-0.8s), 4) Text-shadow glow pulsing (1-2s loop). Add ShapeAtom for subtle light streak that wipes across. Use beat-exposure internal effect for final accent. All effects should have cubic-bezier easing for smooth motion."
  }
]
```

## 🔍 Template Validation

### What Gets Validated

#### By GitHub (Form Template)
- ✅ Required fields must be filled
- ✅ Checkboxes must be checked (if required)
- ✅ Title is automatically set

#### By Workflow
- ✅ Issue title contains "new presets"
- ✅ Body is valid JSON array
- ✅ Each preset has `prompt` field
- ✅ Each preset has `technicalSpecs` field

### Common Validation Errors

**Error 1: Invalid JSON**
```
❌ Failed to parse issue body as JSON
```
**Fix:** Validate your JSON at [jsonlint.com](https://jsonlint.com/)

**Error 2: Missing Fields**
```
❌ Preset 1 missing required fields (prompt, technicalSpecs)
```
**Fix:** Ensure both `prompt` and `technicalSpecs` are present

**Error 3: Wrong Issue Title**
```
❌ Workflow not triggered
```
**Fix:** Use the templates (they set the title automatically)

## 🎯 Best Practices

### For Prompts
1. **Be Specific**: "Create a fade-in" → "Create a smooth fade-in over 1 second with ease-in-out"
2. **Reference Styles**: Mention video editing techniques, film effects, or design patterns
3. **Describe Motion**: Explain how things should move, not just what they look like
4. **Include Timing**: Specify durations, delays, and sequencing
5. **Mention Components**: Name the atoms/layouts you want (TextAtom, BaseLayout, etc.)

### For Technical Specs
1. **Structure First**: Start with component hierarchy
2. **Styling Second**: List Tailwind classes and CSS properties
3. **Effects Third**: Define generic effects with property, range, easing
4. **Parameters Fourth**: What should be configurable
5. **Performance Last**: GPU acceleration, optimization notes

### For Multiple Presets
1. **Group Related**: Put similar presets in one issue
2. **Order by Complexity**: Simple first, complex later
3. **Reuse Specs**: Similar technical specs can be abbreviated
4. **Test Incrementally**: Start with one, add more if successful

## 📊 Template Features

The New Presets Request template provides:

| Feature | Details |
|---------|---------|
| **Form Type** | YAML (structured form) |
| **Built-in Examples** | 4 detailed examples |
| **Tips & Guidance** | Extensive inline help |
| **Validation** | Required checkboxes |
| **Best For** | All users |
| **Setup Time** | ~5 minutes |
| **Learning Curve** | Easy |
| **Flexibility** | High (can modify JSON directly) |

## 🔗 Related Documentation

- **Workflow Documentation**: `.github/PRESET_GENERATION_WORKFLOW.md`
- **Examples Collection**: `.github/PRESET_GENERATION_EXAMPLE.md`
- **Implementation Details**: `PRESET_WORKFLOW_IMPLEMENTATION.md`
- **Quick Start**: `README_WORKFLOW.md`

## 🆘 Getting Help

### If Templates Don't Appear
1. Check that template files exist in `.github/ISSUE_TEMPLATE/`
2. Ensure files have correct YAML/Markdown syntax
3. Refresh the issues page

### If Validation Fails
1. Copy your JSON to [jsonlint.com](https://jsonlint.com/)
2. Check for missing commas, quotes, or brackets
3. Ensure each preset has both required fields

### If Workflow Doesn't Trigger
1. Verify issue title is "New Presets"
2. Check Actions tab for workflow status
3. Review workflow logs for errors

## 💡 Tips for Template Maintainers

### Updating Examples
Edit `.github/ISSUE_TEMPLATE/new-presets.yml`:
- Examples are in the `placeholder` field
- Use `\n` for newlines in YAML
- Test with JSON validator after changes

### Adding New Examples
1. Create new `<details>` section in markdown
2. Add descriptive title
3. Include complete JSON example
4. Test the example works

### Modifying Validation
Edit the `checkboxes` section:
- Set `required: true` for mandatory checks
- Set `required: false` for optional checks
- Update labels for clarity

---

**Last Updated**: November 2025
**Template Version**: 1.0.0
**Status**: ✅ Production Ready

