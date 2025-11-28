import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  try {
    // Check authentication (implement your auth logic)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { folderPath, githubOwner, githubRepo, filePattern } = body;

    if (!githubOwner || !githubRepo) {
      return NextResponse.json(
        { error: 'Missing GitHub owner or repo' },
        { status: 400 },
      );
    }

    // Use provided path or default
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
      const patternText =
        filePattern && filePattern.trim() !== ''
          ? `${filePattern}*.json`
          : '*.json';
      return NextResponse.json(
        { error: `No ${patternText} files found` },
        { status: 404 },
      );
    }

    // Extract prompts
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

    // Create batches
    const batches = [];
    for (let i = 0; i < allPrompts.length; i += BATCH_SIZE) {
      const batchPrompts = allPrompts.slice(i, i + BATCH_SIZE);
      const startTitleIdx = Math.floor(i / 10);
      const endTitleIdx = Math.min(
        Math.floor((i + BATCH_SIZE) / 10) + 1,
        allTitles.length,
      );
      const batchTitles = [
        ...new Set(allTitles.slice(startTitleIdx, endTitleIdx)),
      ];

      let combinedTitle = 'Batch Preset Request';
      if (batchTitles.length === 1) {
        combinedTitle = batchTitles[0];
      } else if (batchTitles.length <= 3) {
        combinedTitle = batchTitles.join(' + ');
      } else {
        // Extract common keywords
        const keywords = batchTitles
          .flatMap(t => t.split(' '))
          .filter(w => w.length > 4);
        const uniqueKeywords = [...new Set(keywords)].slice(0, 5);
        combinedTitle = uniqueKeywords.join(' ') || 'Mixed Preset Batch';
      }

      batches.push({
        title: combinedTitle.substring(0, 100),
        prompts: batchPrompts,
      });
    }

    // Create GitHub issues
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 },
      );
    }

    const octokit = new Octokit({ auth: token });
    const createdIssues = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const title = `New Presets - ${batch.title} (Batch ${i + 1}/${batches.length})`;
      const body = JSON.stringify(batch.prompts, null, 2);

      const response = await octokit.issues.create({
        owner: githubOwner,
        repo: githubRepo,
        title,
        body,
        labels: ['preset-generation', 'automated'],
      });

      createdIssues.push({
        number: response.data.number,
        url: response.data.html_url,
        title: batch.title,
        promptCount: batch.prompts.length,
      });

      // Delay between requests
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      totalPrompts: allPrompts.length,
      batchesCreated: batches.length,
      issues: createdIssues,
    });
  } catch (error: any) {
    console.error('Error creating issues:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
