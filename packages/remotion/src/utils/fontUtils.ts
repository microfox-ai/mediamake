// Dynamic font loading utilities for Remotion
// Note: This utility provides a framework for font loading
// Specific font loading should be done using @remotion/google-fonts/{FontName}
//
// IMPORTANT: Make sure the font you're trying to load is available in @remotion/google-fonts
// Font names are automatically normalized (spaces to hyphens, lowercase)
// For example: "WaterBrush" becomes "waterbrush", "Open Sans" becomes "open-sans"
// Use isFontAvailable() to check if a font is supported before loading
//
// Do NOT use import(`@remotion/google-fonts/${name}`) — webpack treats that as a
// context over the whole package (including LICENSE.md) and fails to parse it.
import * as fontUtils from '@remotion/google-fonts';

// Dynamic import to avoid bundling issues with peer dependencies
let availableFonts: any[] = [];

const getAvailableFonts = async () => {
  if (availableFonts.length === 0) {
    try {
      availableFonts = fontUtils.getAvailableFonts();
    } catch (error) {
      console.warn('Failed to load @remotion/google-fonts:', error);
      availableFonts = [];
    }
  }
  return availableFonts;
};

const normalizeFontKey = (name: string): string =>
  name.trim().toLowerCase().replace(/[\s_-]+/g, '');

const findAvailableFont = (fonts: any[], fontFamily: string) => {
  const exact = fonts.find((font) => font.importName === fontFamily);
  if (exact) return exact;

  const target = normalizeFontKey(fontFamily);
  return fonts.find(
    (font) =>
      normalizeFontKey(font.importName || '') === target ||
      normalizeFontKey(font.fontFamily || '') === target
  );
};

export interface FontConfig {
  family: string;
  weights?: string[];
  subsets?: string[];
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  preload?: boolean;
}

export interface FontLoadingOptions {
  subsets?: string[];
  weights?: string[];
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  preload?: boolean;
}

// Key map for loaded fonts - stores fontFamily CSS values directly
const loadedFonts = new Map<string, string>();

/**
 * Load a Google Font dynamically using getAvailableFonts().load()
 * @param fontFamily - The font family name (e.g., 'Inter', 'Roboto')
 * @param options - Font loading options
 * @returns Promise that resolves with the fontFamily CSS value
 */
export const loadGoogleFont = async (
  fontFamily: string,
  options: FontLoadingOptions = {}
): Promise<string> => {
  // Validate input
  if (!fontFamily || typeof fontFamily !== 'string' || fontFamily === '') {
    console.warn('Invalid fontFamily provided:', fontFamily);
    return 'sans-serif';
  }

  const fontKey = `${fontFamily}-${JSON.stringify(options)}`;

  // Return cached fontFamily if already loaded
  if (loadedFonts.has(fontKey)) {
    return loadedFonts.get(fontKey)!;
  }

  try {
    const fonts = await getAvailableFonts();
    const thisFont = findAvailableFont(fonts, fontFamily);

    if (thisFont?.load) {
      const fontPackage = await thisFont.load();

      const allFontStuff = fontPackage.loadFont('normal', {
        subsets: options.subsets || ['latin'],
        weights: options.weights || ['400'],
      });

      await allFontStuff.waitUntilDone();

      // Store the fontFamily CSS value in the map
      loadedFonts.set(fontKey, allFontStuff.fontFamily);
      return allFontStuff.fontFamily;
    }

    throw new Error(
      `Font Package @remotion/google-fonts/${fontFamily} does not have loadFont method`
    );
  } catch (error) {
    console.warn(`Failed to load font ${fontFamily}:`, error);

    // Fallback to system fonts
    const fallbackFontFamily = `"${fontFamily}"`;
    loadedFonts.set(fontKey, fallbackFontFamily);
    return fallbackFontFamily;
  }
};

/**
 * Load multiple fonts in parallel
 * @param fonts - Array of font configurations
 * @returns Promise that resolves with a map of font family names to CSS values
 */
export const loadMultipleFonts = async (
  fonts: Array<{ family: string; options?: FontLoadingOptions }>
): Promise<Map<string, string>> => {
  const loadPromises = fonts.map(async ({ family, options }) => {
    const fontFamily = await loadGoogleFont(family, options);
    return { family, fontFamily };
  });

  const results = await Promise.all(loadPromises);
  const fontMap = new Map<string, string>();

  results.forEach(({ family, fontFamily }) => {
    fontMap.set(family, fontFamily);
  });

  return fontMap;
};

/**
 * Get font family CSS value from cache
 * @param fontFamily - The font family name
 * @param options - Font loading options
 * @returns CSS font-family value or undefined if not loaded
 */
export const getLoadedFontFamily = (
  fontFamily: string,
  options: FontLoadingOptions = {}
): string | undefined => {
  const fontKey = `${fontFamily}-${JSON.stringify(options)}`;
  return loadedFonts.get(fontKey);
};

/**
 * Preload common fonts for better performance
 */
export const preloadCommonFonts = async (): Promise<Map<string, string>> => {
  const commonFonts = [
    { family: 'Inter', options: { weights: ['400', '500', '600', '700'] } },
    { family: 'Roboto', options: { weights: ['400', '500', '700'] } },
    { family: 'Open Sans', options: { weights: ['400', '600', '700'] } },
    { family: 'Lato', options: { weights: ['400', '700'] } },
  ];

  return await loadMultipleFonts(commonFonts);
};

/**
 * Check if a font is already loaded
 * @param fontFamily - The font family name
 * @param options - Font loading options
 * @returns boolean indicating if font is loaded
 */
export const isFontLoaded = (
  fontFamily: string,
  options: FontLoadingOptions = {}
): boolean => {
  const fontKey = `${fontFamily}-${JSON.stringify(options)}`;
  return loadedFonts.has(fontKey);
};

/**
 * Clear font cache (useful for testing or memory management)
 */
export const clearFontCache = (): void => {
  loadedFonts.clear();
};

/**
 * Get all loaded fonts
 * @returns Map of loaded fonts
 */
export const getLoadedFonts = (): Map<string, string> => {
  return new Map(loadedFonts);
};

/**
 * Check if a font is available in @remotion/google-fonts
 * @param fontFamily - The font family name to check
 * @returns Promise that resolves to boolean indicating if font is available
 */
export const isFontAvailable = async (fontFamily: string): Promise<boolean> => {
  if (!fontFamily || typeof fontFamily !== 'string') {
    return false;
  }

  try {
    const fonts = await getAvailableFonts();
    return !!findAvailableFont(fonts, fontFamily);
  } catch (error) {
    return false;
  }
};

/**
 * Get normalized font name for import
 * @param fontFamily - The font family name
 * @returns Normalized font name suitable for import
 */
export const getNormalizedFontName = (fontFamily: string): string => {
  if (!fontFamily || typeof fontFamily !== 'string') {
    return '';
  }

  return fontFamily.trim().replace(/\s+/g, '-').toLowerCase();
};
