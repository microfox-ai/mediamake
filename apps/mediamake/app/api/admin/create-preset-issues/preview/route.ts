import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { folderPath, filePattern } = body;

    // Resolve folder path
    const resolvedPath = folderPath
      ? resolve(process.cwd(), folderPath)
      : join(process.cwd(), 'scripts', 'output');

    if (!existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `Folder not found: ${folderPath || 'scripts/output'}` },
        { status: 404 },
      );
    }

    // Read JSON files
    const files = readdirSync(resolvedPath).filter(file => {
      if (!file.endsWith('.json')) return false;
      // If filePattern is provided and not empty, check startsWith
      if (filePattern && filePattern.trim() !== '') {
        return file.startsWith(filePattern);
      }
      // If no pattern, return all .json files
      return true;
    });

    if (files.length === 0) {
      return NextResponse.json({
        filesFound: [],
        totalPrompts: 0,
        estimatedBatches: 0,
        titles: [],
      });
    }

    // Extract prompts and titles
    const allPrompts: any[] = [];
    const allTitles: string[] = [];

    for (const file of files) {
      try {
        const filePath = join(resolvedPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.result && Array.isArray(data.result)) {
          for (const resultItem of data.result) {
            if (resultItem.parts && Array.isArray(resultItem.parts)) {
              for (const part of resultItem.parts) {
                if (part.output && part.output.prompts) {
                  allTitles.push(part.output.title || 'Preset');
                  allPrompts.push(...part.output.prompts);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }

    const BATCH_SIZE = 30;
    const estimatedBatches = Math.ceil(allPrompts.length / BATCH_SIZE);

    return NextResponse.json({
      filesFound: files,
      totalPrompts: allPrompts.length,
      estimatedBatches,
      titles: allTitles,
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to preview folder' },
      { status: 500 },
    );
  }
}
