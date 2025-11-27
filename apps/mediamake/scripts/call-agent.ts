#!/usr/bin/env node

/**
 * Script to process agent queue from JSON file
 * Usage: npm run callAgent <que_name>
 */

import { config } from 'dotenv';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'fs';
import { join, resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface QueueItem {
  [key: string]: any;
}

interface QueueConfig {
  agentPath: string;
  defaultParams: Record<string, any>;
  queue: QueueItem[];
}

const BASE_URL = 'http://localhost:3000';

async function callAgentAPI(
  agentPath: string,
  params: Record<string, any>,
): Promise<any> {
  // Remove leading slash if present
  const cleanPath = agentPath.startsWith('/') ? agentPath.slice(1) : agentPath;
  const url = `${BASE_URL}/api/studio/chat/agent/${cleanPath}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEV_API_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP error! status: ${response.status}, message: ${errorText}`,
    );
  }

  return await response.json();
}

async function processQueue(queName: string) {
  try {
    const scriptsDir = resolve(process.cwd(), 'scripts');
    const jsonDir = join(scriptsDir, 'json');
    const jsonPath = join(jsonDir, `${queName}.json`);

    // Ensure json directory exists
    if (!existsSync(jsonDir)) {
      mkdirSync(jsonDir, { recursive: true });
      console.log(`📁 Created json directory: ${jsonDir}`);
    }

    console.log(`📂 Reading queue file: ${jsonPath}`);

    if (!existsSync(jsonPath)) {
      const error = new Error(`Queue file not found at ${jsonPath}`);
      console.error(`❌ Error: ${error.message}`);
      console.error(`   Create a JSON file with the following structure:`);
      console.error(`   {`);
      console.error(`     "agentPath": "/midjourney/pipeline1",`);
      console.error(`     "defaultParams": {},`);
      console.error(`     "queue": [{ ...inputParams }, ...]`);
      console.error(`   }`);
      throw error;
    }

    // Read and parse JSON
    const fileContent = readFileSync(jsonPath, 'utf-8');
    const config: QueueConfig = JSON.parse(fileContent);

    if (!config.agentPath) {
      throw new Error(`Missing 'agentPath' in JSON file`);
    }

    if (!config.queue || !Array.isArray(config.queue)) {
      throw new Error(`Missing or invalid 'queue' array in JSON file`);
    }

    if (config.queue.length === 0) {
      console.log(`✅ Queue is empty. Nothing to process.`);
      return;
    }

    console.log(`🚀 Processing queue: ${queName}`);
    console.log(`   Agent Path: ${config.agentPath}`);
    console.log(
      `   Default Params:`,
      JSON.stringify(config.defaultParams, null, 2),
    );
    console.log(`   Queue Items: ${config.queue.length}`);
    console.log(``);

    const processed: QueueItem[] = [];
    const failed: QueueItem[] = [];
    let currentIndex = 0;
    let remainingQueue = [...config.queue];

    // Process each item sequentially
    for (const item of config.queue) {
      currentIndex++;
      console.log(
        `[${currentIndex}/${config.queue.length}] Processing item...`,
      );
      console.log(`   Params:`, JSON.stringify(item, null, 2));

      try {
        // Merge defaultParams with item params
        const mergedParams = {
          ...config.defaultParams,
          ...item,
        };

        console.log(`   Calling agent API...`);
        const result = await callAgentAPI(config.agentPath, mergedParams);
        console.log(`   ✅ Success!`);
        const resultPreview = JSON.stringify(result, null, 2);
        console.log(
          `   Result:`,
          resultPreview.length > 200
            ? resultPreview.substring(0, 200) + '...'
            : resultPreview,
        );
        processed.push(item);
        // Remove from remaining queue
        remainingQueue = remainingQueue.filter(q => q !== item);

        // Update JSON file after each successful call
        const updatedConfig: QueueConfig = {
          ...config,
          queue: remainingQueue,
        };
        writeFileSync(
          jsonPath,
          JSON.stringify(updatedConfig, null, 2),
          'utf-8',
        );
        console.log(`   💾 Updated queue file (removed processed item)`);
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}`);
        failed.push(item);
        // Keep failed items in queue (don't update file)
      }

      console.log(``);
    }

    // Final summary
    console.log(`📊 Summary:`);
    console.log(`   ✅ Processed: ${processed.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log(
      `   📝 Remaining in queue: ${config.queue.length - processed.length}`,
    );

    if (failed.length > 0) {
      console.log(``);
      console.log(`⚠️  Failed items remain in the queue for retry.`);
      throw new Error(
        `Queue processing completed with ${failed.length} failed item(s)`,
      );
    }
  } catch (error: any) {
    console.error(`❌ Failed to process queue:`, error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('fetch failed')
    ) {
      console.error(
        `   Make sure the Next.js server is running at ${BASE_URL}`,
      );
    }
    throw error;
  }
}

// Get queue name from command line arguments
const queName = process.argv[2];

if (!queName) {
  console.error('❌ Error: queue name is required');
  console.error('   Usage: npm run callAgent <que_name>');
  console.error('   Example: npm run callAgent midjourney-batch-1');
  console.error('   Or: npm run callAgent all (processes all JSON files)');
  process.exit(1);
}

async function processAllQueues() {
  const scriptsDir = resolve(process.cwd(), 'scripts');
  const jsonDir = join(scriptsDir, 'json');

  // Ensure json directory exists
  if (!existsSync(jsonDir)) {
    mkdirSync(jsonDir, { recursive: true });
    console.log(`📁 Created json directory: ${jsonDir}`);
  }

  // Read all JSON files from the directory
  const files = readdirSync(jsonDir).filter(
    file => file.endsWith('.json') && file !== 'example.json',
  );

  if (files.length === 0) {
    console.log(
      `✅ No queue files found in ${jsonDir} (excluding example.json)`,
    );
    return;
  }

  console.log(`🚀 Processing ${files.length} queue file(s)...`);
  console.log(`   Files: ${files.join(', ')}`);
  console.log(``);

  let totalProcessed = 0;
  let totalFailed = 0;
  const failedFiles: string[] = [];

  // Process each file sequentially
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const queName = file.replace('.json', '');
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 [${i + 1}/${files.length}] Processing file: ${file}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      await processQueue(queName);
      totalProcessed++;
    } catch (error: any) {
      console.error(`❌ Failed to process ${file}:`, error.message);
      totalFailed++;
      failedFiles.push(file);
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Overall Summary:`);
  console.log(`   ✅ Successfully processed: ${totalProcessed} file(s)`);
  console.log(`   ❌ Failed: ${totalFailed} file(s)`);
  if (failedFiles.length > 0) {
    console.log(`   Failed files: ${failedFiles.join(', ')}`);
  }
  console.log(`${'='.repeat(60)}\n`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

if (queName === 'all') {
  processAllQueues().catch(error => {
    console.error('❌ Fatal error processing all queues:', error.message);
    process.exit(1);
  });
} else {
  processQueue(queName).catch(error => {
    process.exit(1);
  });
}
