/**
 * Module-level blob-URL registry for multi-file GLTF imports.
 * Maps cacheKey → (filename → blob URL) so GltfInner's URLModifier
 * can resolve external .bin buffers and texture files.
 *
 * Intentionally NOT persisted — blob URLs die with the page session.
 */
export const gltfFileCache = new Map<string, Map<string, string>>()
