"use server";
import fs from 'fs/promises';
import path from 'path';

const REGISTRY_PATH = path.join(process.cwd(), 'components/editor/presets/registry/generated');

export const savePresetToFile = async (id: string, code: string): Promise<string> => {
    try {
        // Ensure directory exists
        await fs.mkdir(REGISTRY_PATH, { recursive: true });

        // Filename convention: snake-case id.ts
        const filename = `${id}.ts`;
        const filepath = path.join(REGISTRY_PATH, filename);

        // Code from coder agent should already have the JSDoc at top
        // Just write it directly
        await fs.writeFile(filepath, code, 'utf-8');
        console.log(`✅ Saved preset to: ${filepath}`);
        return filepath;
    } catch (error) {
        console.error('Error saving preset to file:', error);
        throw new Error(`Failed to save preset file: ${error}`);
    }
};
