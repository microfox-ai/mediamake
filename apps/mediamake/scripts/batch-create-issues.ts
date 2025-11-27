#!/usr/bin/env node

/**
 * Script to batch process JSON output files and create GitHub issues
 * Usage: npm run batch-create-issues
 */

import { config } from 'dotenv';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { Octokit } from '@octokit/rest';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface Prompt {
  prompt: string;
  technicalSpecs: string;
}

interface JsonOutput {
  result: Array<{
    parts: Array<{
      output: {
        title: string;
        prompts: Prompt[];
      };
    }>;
  }>;
}

interface IssueBatch {
  title: string;
  prompts: Array<{ prompt: string; technicalSpecs: string }>;
  sourceFiles: string[];
}

const BATCH_SIZE = 50;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'microfox-ai';
const GITHUB_REPO = process.env.GITHUB_REPO || 'mediamake';

async function processOutputFolder(folderPath: string): Promise<IssueBatch[]> {
  console.log(`📂 Reading output folder: ${folderPath}`);

  if (!existsSync(folderPath)) {
    throw new Error(`Output folder not found: ${folderPath}`);
  }

  // Read all JSON files
  const files = readdirSync(folderPath).filter(
    (file) => file.endsWith('.json') && file.startsWith('data_run_'),
  );

  if (files.length === 0) {
    console.log('⚠️  No data_run_*.json files found');
    return [];
  }

  console.log(`✅ Found ${files.length} JSON file(s)`);

  // Extract all prompts and titles
  const allPrompts: Prompt[] = [];
  const allTitles: string[] = [];
  const fileMap: Map<number, string> = new Map(); // Track which file each prompt came from

  for (const file of files) {
    try {
      const filePath = join(folderPath, file);
      const content = readFileSync(filePath, 'utf-8');
      const data: JsonOutput = JSON.parse(content);

      // Navigate the nested structure
      if (data.result && Array.isArray(data.result)) {
        for (const resultItem of data.result) {
          if (resultItem.parts && Array.isArray(resultItem.parts)) {
            for (const part of resultItem.parts) {
              if (part.output && part.output.prompts) {
                const title = part.output.title || 'Preset';
                const prompts = part.output.prompts;

                allTitles.push(title);
                prompts.forEach((p) => {
                  const currentIndex = allPrompts.length;
                  allPrompts.push(p);
                  fileMap.set(currentIndex, file);
                });

                console.log(
                  `   📄 ${file}: Found "${title}" with ${prompts.length} prompts`,
                );
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log(
    `\n📊 Total: ${allPrompts.length} prompts from ${allTitles.length} titles`,
  );

  // Create batches of up to 50 prompts
  const batches: IssueBatch[] = [];
  for (let i = 0; i < allPrompts.length; i += BATCH_SIZE) {
    const batchPrompts = allPrompts.slice(i, i + BATCH_SIZE);
    const batchIndices = Array.from(
      { length: batchPrompts.length },
      (_, idx) => i + idx,
    );

    // Get unique titles for this batch
    const batchTitles = [
      ...new Set(
        batchIndices.map((idx) => {
          const fileIndex = Math.floor(idx / 10); // Approximate which title
          return allTitles[fileIndex] || 'Preset';
        }),
      ),
    ];

    // Get source files for this batch
    const sourceFiles = [
      ...new Set(batchIndices.map((idx) => fileMap.get(idx)).filter(Boolean)),
    ] as string[];

    // Combine titles intelligently
    let combinedTitle = 'Batch Preset Request';
    if (batchTitles.length === 1) {
      combinedTitle = batchTitles[0];
    } else if (batchTitles.length <= 3) {
      combinedTitle = batchTitles.join(' + ');
    } else {
      // Extract common keywords
      const keywords = batchTitles
        .flatMap((t) => t.split(' '))
        .filter((w) => w.length > 4); // Get meaningful words
      const uniqueKeywords = [...new Set(keywords)].slice(0, 5);
      combinedTitle = uniqueKeywords.join(' ') || 'Mixed Preset Batch';
    }

    batches.push({
      title: combinedTitle.substring(0, 100), // Limit title length
      prompts: batchPrompts,
      sourceFiles,
    });
  }

  console.log(
    `\n✅ Created ${batches.length} batch(es) of ${BATCH_SIZE} prompts each`,
  );
  return batches;
}

async function createGitHubIssue(
  octokit: Octokit,
  batch: IssueBatch,
  batchIndex: number,
  totalBatches: number,
): Promise<{ number: number; url: string }> {
  const title = `New Presets - ${batch.title} (Batch ${batchIndex}/${totalBatches})`;
  const body = JSON.stringify(batch.prompts, null, 2);

  console.log(`\n📝 Creating issue: ${title}`);
  console.log(`   Prompts: ${batch.prompts.length}`);
  console.log(`   Source files: ${batch.sourceFiles.join(', ')}`);

  const response = await octokit.issues.create({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    title,
    body,
    labels: ['preset-generation', 'automated'],
  });

  console.log(`✅ Issue created: #${response.data.number}`);
  console.log(`   URL: ${response.data.html_url}`);

  return {
    number: response.data.number,
    url: response.data.html_url,
  };
}

async function main() {
  try {
    const scriptsDir = resolve(process.cwd(), 'scripts');
    const outputDir = join(scriptsDir, 'output');

    // Initialize Octokit
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN not found in environment variables');
    }

    const octokit = new Octokit({ auth: token });

    console.log('🚀 Starting batch issue creation...\n');

    // Process output folder
    const batches = await processOutputFolder(outputDir);

    if (batches.length === 0) {
      console.log('⏭️  No batches to process');
      return;
    }

    console.log(`\n📤 Creating ${batches.length} GitHub issue(s)...\n`);

    const createdIssues: Array<{
      number: number;
      url: string;
      title: string;
    }> = [];

    // Create issues sequentially with delay to avoid rate limiting
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        const issue = await createGitHubIssue(
          octokit,
          batch,
          i + 1,
          batches.length,
        );
        createdIssues.push({
          ...issue,
          title: batch.title,
        });

        // Add delay between requests to avoid rate limiting
        if (i < batches.length - 1) {
          console.log('   ⏳ Waiting 2 seconds before next issue...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        console.error(
          `❌ Failed to create issue for batch ${i + 1}:`,
          error.message,
        );
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total batches: ${batches.length}`);
    console.log(`   Issues created: ${createdIssues.length}`);
    console.log(`   Failed: ${batches.length - createdIssues.length}`);
    console.log('\n✅ Created issues:');
    createdIssues.forEach((issue) => {
      console.log(`   • #${issue.number}: ${issue.title}`);
      console.log(`     ${issue.url}`);
    });
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { processOutputFolder, createGitHubIssue };

