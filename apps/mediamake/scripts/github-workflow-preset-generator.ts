#!/usr/bin/env tsx
/**
 * GitHub Workflow Preset Generator
 * 
 * This script is designed to run in GitHub Actions workflows.
 * It processes preset generation requests from GitHub issues by:
 * 1. Parsing the issue body for preset requests
 * 2. Creating a branch and PR first
 * 3. Calling the standalone generate-preset.ts script for each request
 * 4. Committing each preset immediately after generation
 * 5. Updating the PR with results and status
 * 
 * Usage (GitHub Actions):
 *   ISSUE_BODY="..." ISSUE_NUMBER="123" ISSUE_TITLE="New Presets" \
 *   GITHUB_TOKEN="..." npx tsx scripts/github-workflow-preset-generator.ts
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface PresetRequest {
  prompt: string;
  technicalSpecs: string;
}

interface PresetResult {
  index: number;
  success: boolean;
  presetId?: string;
  filepath?: string;
  metadata?: {
    id: string;
    title: string;
    description: string;
  };
  error?: string;
  retries: number;
  validationFailed?: boolean;
  wasAutoFixed?: boolean;
  validationWarnings?: string[];
  validationErrors?: string[];
  lintOutput?: string;
  hasLintIssues?: boolean;
  originalRequest?: PresetRequest;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 3; // Process 3 presets at a time
const MAX_RETRIES = 3; // Retry up to 3 times for failures
const RETRY_DELAY_BASE = 5000; // Base delay for exponential backoff (5s, 10s, 20s)

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse JSON from GitHub issue body
 */
function parseIssueBody(issueBody: string): PresetRequest[] {
  try {
    let jsonString = issueBody.trim();
    console.log('📄 Raw issue body preview:', jsonString.substring(0, 150).replace(/\n/g, ' ') + '...');
    console.log('📏 Body length:', jsonString.length, 'characters');
    
    // GitHub issue templates wrap content with markdown headers
    // Extract just the JSON array part
    const firstBracket = jsonString.indexOf('[');
    const lastBracket = jsonString.lastIndexOf(']');
    
    if (firstBracket === -1 || lastBracket === -1 || firstBracket >= lastBracket) {
      throw new Error('Could not find JSON array in issue body (missing [ or ])');
    }
    
    // Extract the JSON portion
    jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    console.log('📄 Extracted JSON preview:', jsonString.substring(0, 150).replace(/\n/g, ' ') + '...');
    
    const presetRequests = JSON.parse(jsonString);
    
    if (!Array.isArray(presetRequests)) {
      console.error('❌ Parsed content is not a JSON array');
      console.error('Received type:', typeof presetRequests);
      throw new Error('Issue body does not contain a valid JSON array');
    }
    
    console.log('✅ Successfully parsed', presetRequests.length, 'preset request(s)');
    return presetRequests;
  } catch (error: any) {
    console.error('❌ Failed to parse issue body as JSON:', error.message);
    console.error('Issue body preview:', issueBody.substring(0, 300));
    console.error('');
    console.error('💡 Tip: Make sure your issue contains a valid JSON array.');
    console.error('   Format: [{"prompt": "...", "technicalSpecs": "..."}]');
    console.error('   Validate at: https://jsonlint.com');
    throw error;
  }
}

/**
 * Create GitHub PR
 */
async function createPullRequest(
  branchName: string,
  prTitle: string,
  prBody: string,
  githubToken: string,
  repoOwner: string,
  repoName: string
): Promise<{ prUrl: string; prNumber: number }> {
  const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      title: prTitle,
      body: prBody,
      head: branchName,
      base: 'main',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create PR: ${response.status} ${error}`);
  }

  const data = await response.json();
  return { prUrl: data.html_url, prNumber: data.number };
}

/**
 * Update PR description
 */
async function updatePRDescription(
  prNumber: number,
  prBody: string,
  githubToken: string,
  repoOwner: string,
  repoName: string
): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ body: prBody }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update PR: ${response.status} ${error}`);
  }
}

/**
 * Generate PR body based on current results
 */
function generatePRBody(
  issueNumber: string,
  results: PresetResult[],
  totalCount: number,
  isComplete: boolean
): string {
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  
  let prBody = `This PR was automatically generated from issue #${issueNumber}\n\n`;
  
  if (isComplete) {
    prBody += `## ✅ Generation Complete\n\n`;
    prBody += `**Final Status:** ${successCount}/${totalCount} presets successfully generated\n\n`;
    
    if (failedCount > 0) {
      prBody += `⚠️ ${failedCount} preset(s) failed - see details below\n\n`;
    }
  } else {
    prBody += `## 🚀 Generation In Progress\n\n`;
    prBody += `**Status:** ${successCount}/${totalCount} presets generated\n\n`;
  }
  
  // Check for validation issues
  const presetsWithValidationFailures = results.filter(r => r.success && r.validationFailed);
  const presetsAutoFixed = results.filter(r => r.success && r.wasAutoFixed);
  const presetsWithRetries = results.filter(r => r.success && r.retries > 0);
  
  if (presetsWithValidationFailures.length > 0) {
    prBody += `## 🔴 Validation Failed\n\n`;
    prBody += `⚠️ **${presetsWithValidationFailures.length} preset(s) failed validation after 3 attempts but were saved for review:**\n`;
    presetsWithValidationFailures.forEach(r => {
      prBody += `- **${r.metadata?.title || r.presetId}** - ⚠️ **Requires manual fixes**\n`;
      if (r.validationErrors && r.validationErrors.length > 0) {
        prBody += `  - Error: ${r.validationErrors[0]}\n`;
      }
    });
    prBody += `\n_❗ These presets have validation errors and should be reviewed and fixed before merging._\n\n`;
  }
  
  if (presetsAutoFixed.length > 0) {
    prBody += `## ✨ Auto-Fixed Presets\n\n`;
    prBody += `${presetsAutoFixed.length} preset(s) were automatically fixed by ESLint:\n`;
    presetsAutoFixed.forEach(r => {
      prBody += `- **${r.metadata?.title || r.presetId}** ✅\n`;
    });
    prBody += `\n`;
  }
  
  // Check for presets with lint issues (but not validation failures)
  const presetsWithLintIssues = results.filter(r => r.success && r.hasLintIssues && !r.validationFailed);
  if (presetsWithLintIssues.length > 0) {
    prBody += `## ⚠️ Lint Check Notice\n\n`;
    prBody += `${presetsWithLintIssues.length} preset(s) have lint warnings that may need attention:\n`;
    presetsWithLintIssues.forEach(r => {
      prBody += `- **${r.metadata?.title || r.presetId}** - Check details below\n`;
    });
    prBody += `\n_These are informational warnings. ESLint auto-fix was attempted. Please review before merging._\n\n`;
  }
  
  if (presetsWithRetries.length > 0) {
    prBody += `## 🔄 Retry Information\n\n`;
    prBody += `${presetsWithRetries.length} preset(s) required retries:\n`;
    presetsWithRetries.forEach(r => {
      prBody += `- **${r.metadata?.title || r.presetId}** - Succeeded after ${r.retries} ${r.retries === 1 ? 'retry' : 'retries'}\n`;
    });
    prBody += `\n`;
  }
  
  if (successCount > 0) {
    prBody += `## 📦 Generated Presets (${successCount})\n\n`;
    results.filter(r => r.success).forEach((result, idx) => {
      prBody += `### ${idx + 1}. ${result.metadata?.title || result.presetId}\n\n`;
      prBody += `**ID:** \`${result.presetId}\`\n`;
      prBody += `**Description:** ${result.metadata?.description || 'N/A'}\n`;
      prBody += `**File:** \`${result.filepath}\`\n`;
      
      if (result.validationFailed) {
        prBody += `**Status:** 🔴 **Validation Failed - Requires Manual Fixes**\n`;
      } else if (result.wasAutoFixed) {
        prBody += `**Status:** ✨ Auto-fixed by ESLint\n`;
      } else {
        prBody += `**Status:** ✅ Validated\n`;
      }
      
      prBody += `\n`;
      
      if (result.validationFailed && result.validationErrors && result.validationErrors.length > 0) {
        prBody += `**❌ Validation Errors:**\n`;
        result.validationErrors.slice(0, 3).forEach(error => {
          prBody += `- ${error}\n`;
        });
        if (result.validationErrors.length > 3) {
          prBody += `- ... and ${result.validationErrors.length - 3} more error(s)\n`;
        }
        prBody += `\n`;
      }
      
      if (result.validationWarnings && result.validationWarnings.length > 0) {
        prBody += `**⚠️ Validation Warnings:**\n`;
        result.validationWarnings.forEach(warning => {
          prBody += `- ${warning}\n`;
        });
        prBody += `\n`;
      }
      
      // Add lint output if there are issues
      if (result.hasLintIssues && result.lintOutput) {
        prBody += `<details>\n<summary>🔍 Lint Check Results (click to expand)</summary>\n\n`;
        prBody += `\`\`\`\n${result.lintOutput.substring(0, 2000)}\n\`\`\`\n\n`;
        if (result.lintOutput.length > 2000) {
          prBody += `_(Output truncated - see full output in workflow logs)_\n\n`;
        }
        prBody += `</details>\n\n`;
      }
      
      const prompt = result.originalRequest?.prompt;
      if (prompt) {
        const truncatedPrompt = prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt;
        prBody += `**Original Prompt:** ${truncatedPrompt}\n\n`;
      }
      
      prBody += `---\n\n`;
    });
  }
  
  if (failedCount > 0) {
    prBody += `\n## ❌ Failed Presets (${failedCount})\n\n`;
    results.filter(r => !r.success).forEach((r, idx) => {
      prBody += `${idx + 1}. **Preset ${r.index}** - ${r.error}\n`;
      if (r.retries > 0) {
        prBody += `   - Failed after ${r.retries} ${r.retries === 1 ? 'retry' : 'retries'}\n`;
      }
    });
    prBody += `\n`;
  }
  
  if (!isComplete) {
    prBody += `_Generation in progress... This description will be updated as more presets complete._\n\n`;
  }
  
  prBody += `\nCloses #${issueNumber}`;
  
  return prBody;
}

/**
 * Call the generate-preset script
 */
async function generatePreset(
  request: PresetRequest,
  index: number,
  totalCount: number,
  retryCount: number = 0
): Promise<PresetResult> {
  try {
    const combinedPrompt = `${request.prompt}\n\nTechnical Specifications:\n${request.technicalSpecs}`;
    
    const retryInfo = retryCount > 0 ? ` (Retry ${retryCount}/${MAX_RETRIES})` : '';
    console.log(`\n📤 [${index}/${totalCount}] Generating preset...${retryInfo}`);
    console.log(`   Prompt length: ${combinedPrompt.length} characters`);
    
    // Call the standalone script
    const scriptPath = path.join(process.cwd(), 'apps/mediamake/scripts/generate-preset.ts');
    const command = `npx tsx "${scriptPath}" "${combinedPrompt.replace(/"/g, '\\"')}"`;
    
    console.log(`   🔧 Running: npx tsx generate-preset.ts`);
    
    // Execute script and capture output
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    console.log(`✅ [${index}/${totalCount}] Script completed successfully`);
    
    // Parse the structured JSON output from the script
    // The script outputs JSON between __PRESET_RESULT_JSON_START__ and __PRESET_RESULT_JSON_END__ markers
    const jsonStartMarker = '__PRESET_RESULT_JSON_START__';
    const jsonEndMarker = '__PRESET_RESULT_JSON_END__';
    
    const jsonStartIndex = output.indexOf(jsonStartMarker);
    const jsonEndIndex = output.indexOf(jsonEndMarker);
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error('Script output missing JSON markers. Unable to parse result.');
    }
    
    const jsonString = output.substring(jsonStartIndex + jsonStartMarker.length, jsonEndIndex).trim();
    
    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError: any) {
      console.error(`❌ Failed to parse JSON output:`, parseError.message);
      console.error(`JSON string preview:`, jsonString.substring(0, 200));
      throw new Error(`Failed to parse script output: ${parseError.message}`);
    }
    
    // Extract and normalize file path
    let filePath = result.filePath;
    if (filePath) {
      // Extract relative path from absolute path
      const appsMediamakeIndex = filePath.indexOf('apps\\mediamake\\');
      if (appsMediamakeIndex !== -1) {
        filePath = filePath.substring(appsMediamakeIndex + 'apps\\mediamake\\'.length);
      } else {
        const appsMediamakeIndexForward = filePath.indexOf('apps/mediamake/');
        if (appsMediamakeIndexForward !== -1) {
          filePath = filePath.substring(appsMediamakeIndexForward + 'apps/mediamake/'.length);
        }
      }
      filePath = filePath.replace(/\\/g, '/');
    }
    
    return {
      index,
      success: true,
      presetId: result.presetId,
      filepath: filePath,
      metadata: {
        id: result.metadata.id,
        title: result.metadata.title,
        description: result.metadata.description,
      },
      retries: retryCount,
      validationFailed: result.metadata.validationFailed || false,
      validationErrors: result.metadata.validationErrors || [],
      validationWarnings: result.metadata.validationWarnings || [],
      wasAutoFixed: result.metadata.wasAutoFixed || false,
      lintOutput: result.metadata.lintOutput || '',
      hasLintIssues: (result.metadata.lintOutput && 
                      (result.metadata.lintOutput.includes('error') || 
                       result.metadata.lintOutput.includes('warning'))) || false,
      originalRequest: request,
    };
    
  } catch (error: any) {
    console.error(`❌ [${index}/${totalCount}] Generation failed:`, error.message);
    
    // Check if error is retryable
    const isRetryableError = 
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('Command failed');
    
    // Retry if possible
    if (isRetryableError && retryCount < MAX_RETRIES) {
      const waitTime = Math.pow(2, retryCount) * RETRY_DELAY_BASE;
      console.log(`🔄 Retrying in ${waitTime / 1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return generatePreset(request, index, totalCount, retryCount + 1);
    }
    
    // Max retries exceeded or non-retryable error
    if (retryCount >= MAX_RETRIES) {
      console.error(`   ❌ Max retries (${MAX_RETRIES}) exceeded`);
    }
    
    return {
      index,
      success: false,
      error: error.message,
      retries: retryCount,
    };
  }
}

/**
 * Commit and push a preset file
 */
function commitAndPushPreset(
  filePath: string,
  presetTitle: string,
  branchName: string,
  issueNumber: string,
  validationFailed: boolean,
  wasAutoFixed: boolean,
  retryCount: number
): void {
  try {
    // Determine correct file path
    let relativeFilePath = filePath;
    if (!relativeFilePath.startsWith('apps/mediamake/')) {
      relativeFilePath = `apps/mediamake/${relativeFilePath}`;
    }
    
    console.log(`   📁 Adding file: ${relativeFilePath}`);
    
    // Check if file exists and add it
    if (!fs.existsSync(relativeFilePath)) {
      // Try alternate path
      const alternatePath = filePath;
      if (fs.existsSync(alternatePath)) {
        console.log(`   ✅ Found at alternate path: ${alternatePath}`);
        relativeFilePath = alternatePath;
      } else {
        throw new Error(`File not found: ${relativeFilePath} or ${alternatePath}`);
      }
    }
    
    execSync(`git add "${relativeFilePath}"`);
    
    // Create commit message
    let commitMsg = `feat: add ${presetTitle}`;
    if (validationFailed) {
      commitMsg += ' (validation failed - needs review)';
    } else if (wasAutoFixed) {
      commitMsg += ' (auto-fixed)';
    }
    if (retryCount > 0) {
      commitMsg += `\n\nSucceeded after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'}`;
    }
    commitMsg += `\n\nGenerated from issue #${issueNumber}`;
    
    // Commit
    execSync(`git commit -m "${commitMsg}"`);
    console.log(`   ✅ Committed: ${presetTitle}`);
    
    // Push
    execSync(`git push origin ${branchName}`);
    console.log(`   🚀 Pushed - progress saved!`);
    
  } catch (error: any) {
    console.error(`   ❌ Git commit/push failed:`, error.message);
    throw error;
  }
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

async function main() {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🤖 GITHUB WORKFLOW PRESET GENERATOR');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Get environment variables
  const issueBody = process.env.ISSUE_BODY;
  const issueNumber = process.env.ISSUE_NUMBER;
  const issueTitle = process.env.ISSUE_TITLE;
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepository = process.env.GITHUB_REPOSITORY; // format: "owner/repo"
  
  if (!issueBody || !issueNumber || !issueTitle || !githubToken || !githubRepository) {
    console.error('❌ Missing required environment variables');
    console.error('Required: ISSUE_BODY, ISSUE_NUMBER, ISSUE_TITLE, GITHUB_TOKEN, GITHUB_REPOSITORY');
    process.exit(1);
  }
  
  const [repoOwner, repoName] = githubRepository.split('/');
  
  // Validate issue title
  if (!issueTitle.toLowerCase().startsWith('new presets')) {
    console.log('⏭️  Skipping: Issue title does not start with "new presets" (case-insensitive)');
    process.exit(0);
  }
  
  console.log('✅ Issue title validated');
  
  // Parse issue body
  console.log('📋 Parsing issue body...');
  const presetRequests = parseIssueBody(issueBody);
  console.log(`✅ Found ${presetRequests.length} preset request(s)`);
  
  // Configure git
  execSync('git config user.name "github-actions[bot]"');
  execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
  
  // ==========================================
  // STEP 1: CREATE BRANCH AND PR
  // ==========================================
  console.log('\n🌿 Step 1: Creating branch and PR...');
  const step1Start = Date.now();
  
  const timestamp = Date.now();
  const branchName = `presets/batch-${issueNumber}-${timestamp}`;
  console.log(`🌿 Creating branch: ${branchName}`);
  execSync(`git checkout -b ${branchName}`);
  
  // Extract descriptive title from issue title
  let descriptiveTitle = 'Preset Request';
  if (issueTitle) {
    const match = issueTitle.match(/new\s+presets?\s*[-:]\s*(.+)/i);
    if (match && match[1]) {
      descriptiveTitle = match[1].trim();
    } else {
      const simpleMatch = issueTitle.match(/new\s+presets?\s+(.+)/i);
      if (simpleMatch && simpleMatch[1]) {
        descriptiveTitle = simpleMatch[1].trim();
      }
    }
  }
  
  // Create initial PR
  const presetCount = presetRequests.length;
  const presetWord = presetCount === 1 ? 'preset' : 'presets';
  const prTitle = `add ${presetCount} ${presetWord} from issue #${issueNumber} - ${descriptiveTitle}`;
  
  const initialPrBody = generatePRBody(issueNumber, [], presetCount, false);
  
  console.log(`📝 Creating initial PR: ${prTitle}`);
  
  // Create empty initial commit
  execSync('git commit --allow-empty -m "chore: initialize preset generation"');
  execSync(`git push -u origin ${branchName}`);
  
  const { prUrl, prNumber } = await createPullRequest(
    branchName,
    prTitle,
    initialPrBody,
    githubToken,
    repoOwner,
    repoName
  );
  
  console.log(`✅ PR created: ${prUrl}`);
  
  const step1Duration = ((Date.now() - step1Start) / 1000).toFixed(2);
  console.log(`✅ Branch and PR created (${step1Duration}s)`);
  
  // ==========================================
  // STEP 2: GENERATE PRESETS ONE BY ONE
  // ==========================================
  console.log('\n🚀 Step 2: Generating presets with immediate commits...');
  const step2Start = Date.now();
  
  const allResults: PresetResult[] = [];
  
  // Process in batches
  for (let i = 0; i < presetRequests.length; i += BATCH_SIZE) {
    const batch = presetRequests.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(presetRequests.length / BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} presets)...`);
    
    const batchPromises = batch.map((request, batchIndex) => {
      const index = i + batchIndex + 1;
      return generatePreset(request, index, presetRequests.length);
    });
    
    // Process batch in parallel
    const batchResults = await Promise.all(batchPromises);
    
    // Commit each successful preset
    for (const result of batchResults) {
      if (result.success && result.filepath && result.metadata) {
        try {
          commitAndPushPreset(
            result.filepath,
            result.metadata.title,
            branchName,
            issueNumber,
            result.validationFailed || false,
            result.wasAutoFixed || false,
            result.retries
          );
        } catch (error: any) {
          console.error(`   ⚠️  Failed to commit preset ${result.index}:`, error.message);
          // Continue with other presets
        }
      }
      
      allResults.push(result);
    }
    
    // Update PR after each batch
    const successCount = allResults.filter(r => r.success).length;
    const prBody = generatePRBody(issueNumber, allResults, presetRequests.length, false);
    
    try {
      await updatePRDescription(prNumber, prBody, githubToken, repoOwner, repoName);
      console.log(`✅ Updated PR: ${successCount}/${presetRequests.length} complete`);
    } catch (error: any) {
      console.warn(`⚠️  Failed to update PR:`, error.message);
    }
    
    // Small delay between batches
    if (i + BATCH_SIZE < presetRequests.length) {
      console.log(`⏳ Waiting 5 seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  const step2Duration = ((Date.now() - step2Start) / 1000).toFixed(2);
  const successCount = allResults.filter(r => r.success).length;
  const failureCount = allResults.filter(r => !r.success).length;
  
  console.log(`\n📊 All presets processed!`);
  console.log(`📊 Results: ${successCount} successful, ${failureCount} failed (${step2Duration}s)`);
  
  // ==========================================
  // STEP 3: FINAL PR UPDATE
  // ==========================================
  console.log('\n📝 Step 3: Finalizing Pull Request...');
  const step3Start = Date.now();
  
  const finalPrBody = generatePRBody(issueNumber, allResults, presetRequests.length, true);
  
  try {
    await updatePRDescription(prNumber, finalPrBody, githubToken, repoOwner, repoName);
    console.log(`✅ PR #${prNumber} updated with final results`);
  } catch (error: any) {
    console.error(`❌ Failed to update PR:`, error.message);
  }
  
  const step3Duration = ((Date.now() - step3Start) / 1000).toFixed(2);
  console.log(`✅ PR update complete (${step3Duration}s)`);
  
  // ==========================================
  // STEP 4: ISSUE COMMENT
  // ==========================================
  console.log('\n📊 Step 4: Creating summary comment on issue...');
  
  let commentBody = `## 🤖 Preset Generation Complete\n\n`;
  commentBody += `**Total Requests:** ${presetRequests.length}\n`;
  commentBody += `**Successful:** ${successCount} ✅\n`;
  commentBody += `**Failed:** ${failureCount} ❌\n\n`;
  
  if (successCount > 0) {
    commentBody += `### ✅ Successfully Generated\n\n`;
    commentBody += `**Pull Request:** [#${prNumber}](${prUrl})\n\n`;
    commentBody += `**Presets included:**\n`;
    allResults.filter(r => r.success).forEach(r => {
      commentBody += `- **${r.metadata?.title || r.presetId}**`;
      if (r.retries > 0) {
        commentBody += ` 🔄 (succeeded after ${r.retries} ${r.retries === 1 ? 'retry' : 'retries'})`;
      }
      commentBody += `\n`;
      commentBody += `  - File: \`${r.filepath}\`\n`;
    });
  }
  
  if (failureCount > 0) {
    commentBody += `\n### ❌ Failed Presets\n\n`;
    allResults.filter(r => !r.success).forEach(r => {
      commentBody += `- **Preset ${r.index}** - ${r.error}`;
      if (r.retries > 0) {
        commentBody += ` (failed after ${r.retries} ${r.retries === 1 ? 'retry' : 'retries'})`;
      }
      commentBody += `\n`;
    });
  }
  
  // Post comment
  await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ body: commentBody }),
  });
  
  // ==========================================
  // SUMMARY
  // ==========================================
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✨ WORKFLOW COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📊 Final Results:`);
  console.log(`   Total: ${presetRequests.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   🔗 PR: ${prUrl}`);
  console.log(`\n⏱️  Timing:`);
  console.log(`   Step 1 (Branch & PR): ${step1Duration}s`);
  console.log(`   Step 2 (Generation): ${step2Duration}s`);
  console.log(`   Step 3 (PR update): ${step3Duration}s`);
  console.log(`   Total: ${totalDuration}s`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Exit with error if all presets failed
  if (failureCount > 0 && successCount === 0) {
    console.log(`\n❌ All presets failed. Exiting with error.`);
    process.exit(1);
  } else if (failureCount > 0) {
    console.log(`\n⚠️  ${failureCount} preset(s) failed, but ${successCount} succeeded.`);
    console.log(`   The workflow continues with partial success.`);
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

main().catch(error => {
  console.error('\n═══════════════════════════════════════════════════════════════');
  console.error('❌ FATAL ERROR');
  console.error('═══════════════════════════════════════════════════════════════');
  console.error(error);
  process.exit(1);
});

