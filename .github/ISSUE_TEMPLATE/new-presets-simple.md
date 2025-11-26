---
name: 🎬 New Presets (Simple)
about: Quick form for requesting automated preset generation
title: "New Presets"
labels: preset-generation, automation
assignees: ''
---

## 🎬 Preset Specifications

<!-- 
⚠️ IMPORTANT: Replace the content below with your JSON array.
Each preset needs "prompt" and "technicalSpecs" fields.
-->

```json
[
  {
    "prompt": "Your detailed preset description here. Describe what the preset should do, what components to use, animation style, timing, and visual effects.",
    "technicalSpecs": "Technical implementation details: component structure, Tailwind classes, generic effects configuration, parameters, dependencies, and performance considerations."
  }
]
```

---

## 📋 Quick Example

Replace the JSON above with something like this:

```json
[
  {
    "prompt": "Create a simple fade-in text animation preset. The text should start invisible and gradually fade in over 1 second using opacity transitions. Use TextAtom component with smooth easing.",
    "technicalSpecs": "Use BaseLayout container with TextAtom child. Apply generic effect with opacity property: range from 0 to 1. Duration: 1 second. Easing: ease-in-out. Use Tailwind classes for base styling."
  }
]
```

---

## ✅ Checklist

- [ ] My JSON is valid (tested at [jsonlint.com](https://jsonlint.com/))
- [ ] Each preset has both `prompt` and `technicalSpecs`
- [ ] I've provided detailed descriptions

---

**What happens next?**
1. ⚙️ GitHub Actions workflow triggers automatically
2. 🤖 AI generates TypeScript code for each preset
3. 📁 Files created in `generated/` directory
4. 🔀 Pull Requests created for review
5. 💬 Results posted as comment on this issue

**More examples:** See `.github/PRESET_GENERATION_EXAMPLE.md`

