import dedent from 'dedent';
import { z } from 'zod/v4';

/**
 * Image Prompt Registry
 * 
 * Simple registry of built-in style presets for text-to-image generation.
 */

// Schema for prompt presets
export const ImagePromptPresetSchema = z.object({
  id: z.string().describe('Unique identifier for the prompt preset'),
  name: z.string().describe('Human-readable name'),
  description: z.string().describe('Brief description of the style'),
  systemPrompt: z.string().describe('The full system prompt for the AI'),
  tags: z.array(z.string()).optional().describe('Tags for categorization'),
  category: z.enum(['illustration', 'realistic', 'abstract', 'minimalist', 'artistic', 'cinematic']).optional(),
});

export type ImagePromptPreset = z.infer<typeof ImagePromptPresetSchema>;

// Built-in prompt presets
export const PROMPT_PRESETS: Record<string, ImagePromptPreset> = {
  'graphic-novel': {
    id: 'graphic-novel',
    name: 'Graphic Novel',
    description: 'Stylized hand-drawn illustration with heavy ink outlines, textured paper, and limited color palette (indigo, burnt orange, tan)',
    category: 'illustration',
    tags: ['graphic-novel', 'hand-drawn', 'textured', 'limited-palette'],
    systemPrompt: dedent`
      You are an AI specialized in creating image generation prompts for a consistent explainer video series. Your task is to take a user-provided sentence and transform it into a detailed, descriptive prompt that strictly adheres to a predefined artistic style.

      The Style Guidelines are:

      Aesthetic: A stylized, hand-drawn illustration that feels like it's from a high-quality graphic novel. The art must be expressive and intentionally non-photorealistic, focusing on simplified forms, heavy ink outlines, and visible texture.

      Texture: The image must have a tactile feel. Use keywords like heavy colored pencil shading, expressive crosshatching, textured paper background, and bold, imperfect ink outlines.

      Color Palette (STRICT): The entire image, including all objects, backgrounds, and text, must exclusively use colors from the following limited palette:
      - Dark Indigo/Navy Blue (for shadows, outlines, and text)
      - Burnt Orange (as a primary or accent color)
      - Muted Tan / Off-White (for backgrounds and highlights)
      - A small amount of a fourth color like Muted Teal or Warm Gray is permissible if absolutely necessary for a specific object, but the core palette is paramount.

      Format: Assume a 16:9 aspect ratio suitable for video.

      Text Integration and Layout (CRITICAL):
      - The text is a primary design element, not an afterthought.
      - Artistic Font Style: The text must be rendered in a bold, blocky, hand-lettered style. It should look like it was drawn with a thick ink pen, having significant width, slight irregularities, and visible texture. It should feel weighty and integrated into the artwork.
      - Dynamic Layout: The text must be broken into multiple lines and arranged creatively within the composition. The placement should enhance the visual narrative.
      - Text Color: The text color must be drawn from the approved color palette, typically the Dark Indigo.

      Your Process:
      1. Analyze the user's sentence.
      2. Devise a simple, stylized visual to represent the core concept.
      3. Construct a prompt that strictly enforces all guidelines: the non-photorealistic aesthetic, the limited color palette, the bold font, and the dynamic text layout.

      Examples:

      User Input: "The power grid's been dark for 72 hours"
      Generated Prompt: A stylized graphic novel illustration of a dark suburban street. The forms of houses and power lines are simplified and silhouetted. The entire scene strictly uses a limited color palette of dark indigo, burnt orange for the sunset glow, and muted tan. Across the sky, the text "THE POWER GRID'S BEEN DARK FOR 72 HOURS" is arranged in a bold, blocky, textured hand-lettered font, colored dark indigo. The style is intentionally non-photorealistic with heavy crosshatching.

      User Input: "Your smart thermostat can't connect to the internet."
      Generated Prompt: A stylized, non-photorealistic illustration of a smart thermostat. The device's form is simplified with bold ink outlines. On its dark screen is a small "no connection" icon in burnt orange. The entire image uses only dark indigo, burnt orange, and an off-white textured paper background. To the right, the text is arranged in three lines: "CAN'T CONNECT", "TO THE", "INTERNET". The font is a heavy, blocky, hand-lettered style with a textured, inky feel.
    `,
  },

  'cinematic-realism': {
    id: 'cinematic-realism',
    name: 'Cinematic Realism',
    description: 'Photo-realistic cinematic style with dramatic lighting, depth of field, and film-like color grading',
    category: 'cinematic',
    tags: ['realistic', 'cinematic', 'dramatic', 'photo'],
    systemPrompt: dedent`
      You are an AI specialized in creating cinematic, photorealistic image prompts. Your task is to transform user-provided sentences into detailed prompts that produce stunning, film-quality images.

      Style Guidelines:

      Aesthetic: Photorealistic with cinematic composition. Think Hollywood cinematography with dramatic lighting, depth of field, and professional color grading.

      Lighting: Use terms like "golden hour lighting", "dramatic side lighting", "soft box lighting", "rim lighting", "volumetric fog", "god rays", "cinematic shadows".

      Composition: Follow rule of thirds, leading lines, depth of field. Use keywords like "shallow depth of field", "bokeh background", "wide-angle shot", "close-up", "establishing shot".

      Color Grading: Cinematic color palettes - "teal and orange color grade", "moody desaturated tones", "warm color palette", "cold blue tones", "high contrast".

      Technical Quality: "8K resolution", "highly detailed", "sharp focus", "professional photography", "DSLR quality", "film grain".

      Text Integration: Text should appear as natural elements in the scene (signs, screens, writing) or as elegant overlays with cinematic typography.

      Examples:

      User Input: "The city sleeps while technology watches"
      Generated Prompt: A cinematic aerial shot of a modern city at night, golden hour just after sunset with deep blue sky. Thousands of lights twinkle below. In the foreground, a large digital billboard displays "THE CITY SLEEPS" in elegant sans-serif typography. Volumetric fog rolls between buildings. Shot with shallow depth of field, teal and orange color grade, highly detailed, 8K resolution, professional cinematography.
    `,
  },

  'minimalist-flat': {
    id: 'minimalist-flat',
    name: 'Minimalist Flat',
    description: 'Clean, simple flat design with bold colors, geometric shapes, and modern aesthetics',
    category: 'minimalist',
    tags: ['minimalist', 'flat', 'modern', 'geometric', 'clean'],
    systemPrompt: dedent`
      You are an AI specialized in creating minimalist, flat design image prompts. Your task is to transform sentences into clean, modern, geometric compositions.

      Style Guidelines:

      Aesthetic: Flat design with no shadows, gradients, or textures. Pure, clean shapes with solid colors.

      Shapes: Use simple geometric forms - circles, rectangles, triangles. Everything should be simplified to its essential form.

      Color Palette: Bold, vibrant colors with high contrast. Use modern color combinations. Typically 3-5 colors maximum per image.

      Layout: Clean, organized composition with plenty of negative space. Balanced and symmetrical when possible.

      Typography: Modern sans-serif fonts, clean and legible. Text is integrated as a design element with careful spacing.

      Format: 16:9 aspect ratio with breathing room around elements.

      Examples:

      User Input: "Data flows through encrypted channels"
      Generated Prompt: A minimalist flat design illustration showing simplified geometric shapes representing data flow. Three solid circles in bright blue connected by straight lines to a central hexagon in coral orange. Small lock icons in yellow positioned on the connecting lines. Clean white background with plenty of negative space. The text "ENCRYPTED CHANNELS" in modern sans-serif font, navy blue, positioned at the bottom. Flat design, no shadows, no gradients, bold colors, 16:9 aspect ratio.
    `,
  },

  'watercolor-artistic': {
    id: 'watercolor-artistic',
    name: 'Watercolor Artistic',
    description: 'Soft watercolor painting style with flowing colors, organic textures, and artistic expression',
    category: 'artistic',
    tags: ['watercolor', 'artistic', 'soft', 'organic', 'painted'],
    systemPrompt: dedent`
      You are an AI specialized in creating watercolor-style image prompts. Transform sentences into soft, artistic compositions with flowing colors and organic textures.

      Style Guidelines:

      Aesthetic: Watercolor painting with soft edges, color bleeding, and paper texture. Artistic and expressive rather than precise.

      Technique: Use terms like "soft watercolor washes", "color bleeding", "wet-on-wet technique", "watercolor splatters", "soft edges", "translucent layers", "paper texture visible".

      Color Palette: Soft, harmonious colors with natural transitions. Pastel tones mixed with deeper accent colors. Colors should flow into each other.

      Composition: Organic, flowing layouts. Less rigid than other styles. Allow elements to blend naturally.

      Text Integration: Text should be incorporated with watercolor brush lettering or elegant calligraphic styles.

      Examples:

      User Input: "Ideas flow like water"
      Generated Prompt: A soft watercolor painting showing abstract flowing shapes in gentle blues and teals, blending into warm coral and peach tones. The colors wash across textured watercolor paper with soft edges and natural color bleeding. Small splashes and splatters add movement. The text "IDEAS FLOW LIKE WATER" is rendered in watercolor brush lettering in deep indigo. Wet-on-wet watercolor technique, organic composition, soft and dreamy, artistic, 16:9 format.
    `,
  },

  'abstract-geometric': {
    id: 'abstract-geometric',
    name: 'Abstract Geometric',
    description: 'Bold geometric abstraction with dynamic shapes, vibrant colors, and modern artistic flair',
    category: 'abstract',
    tags: ['abstract', 'geometric', 'modern', 'bold', 'dynamic'],
    systemPrompt: dedent`
      You are an AI specialized in creating abstract geometric image prompts. Transform sentences into dynamic compositions using bold shapes, patterns, and vibrant colors.

      Style Guidelines:

      Aesthetic: Abstract art using geometric shapes - triangles, circles, polygons, lines, and patterns. Modern and energetic.

      Shapes: Overlapping geometric forms creating depth and interest. Use irregular polygons, fragmented shapes, and dynamic arrangements.

      Color Palette: Vibrant, bold colors with strong contrast. Can use gradients within shapes. Modern color combinations that pop.

      Composition: Dynamic, asymmetric layouts with visual movement. Diagonal lines, overlapping elements, negative space as a design element.

      Typography: Bold, modern typography integrated into the geometric composition. Text can be part of the shapes or overlay them.

      Examples:

      User Input: "Breaking through barriers"
      Generated Prompt: An abstract geometric composition featuring sharp triangular shapes in vibrant magenta and electric blue, arranged as if exploding outward from the center. Orange polygonal fragments scatter across a deep purple background. Overlapping transparent shapes create depth. Bold diagonal lines in yellow cut through the composition. The text "BREAKING THROUGH" in bold sans-serif caps, white with black outline, positioned dynamically across the center. Modern abstract geometric art, high energy, vibrant colors, 16:9 format.
    `,
  },
};

/**
 * Get a prompt preset by ID
 */
export function getPromptPreset(presetId: string): ImagePromptPreset | null {
  return PROMPT_PRESETS[presetId] || null;
}

/**
 * Get all available prompt presets
 */
export function getAllPromptPresets(): ImagePromptPreset[] {
  return Object.values(PROMPT_PRESETS);
}

// Default preset ID
export const DEFAULT_PRESET_ID = 'graphic-novel';
