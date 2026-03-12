import {
  deployFunction,
  deploySite,
  getOrCreateBucket,
} from '@remotion/lambda';
import dotenv from 'dotenv';
import path from 'path';
import {
  AWS_RENDER_CONFIGS,
  AWS_REGIONS,
  DEFAULT_REGION,
  REGION,
  SITE_NAME,
} from './config.mjs';
import { webpackOverride } from './components/remotion/webpack-override.mjs';

dotenv.config();

const envRegion = process.env.REMOTION_AWS_REGION;
const defaultRegion =
  envRegion && AWS_REGIONS.includes(envRegion) ? envRegion : DEFAULT_REGION;
const regions = AWS_REGIONS;

console.log(
  'Deploying Remotion Lambda to region(s):',
  regions.join(', '),
);

if (!process.env.AWS_ACCESS_KEY_ID && !process.env.REMOTION_AWS_ACCESS_KEY_ID) {
  console.log(
    'The environment variable "REMOTION_AWS_ACCESS_KEY_ID" is not set.',
  );
  console.log('Lambda renders were not set up.');
  console.log(
    'Complete the Lambda setup: at https://www.remotion.dev/docs/lambda/setup',
  );
  process.exit(0);
}
if (
  !process.env.AWS_SECRET_ACCESS_KEY &&
  !process.env.REMOTION_AWS_SECRET_ACCESS_KEY
) {
  console.log(
    'The environment variable "REMOTION_REMOTION_AWS_SECRET_ACCESS_KEY" is not set.',
  );
  console.log('Lambda renders were not set up.');
  console.log(
    'Complete the Lambda setup: at https://www.remotion.dev/docs/lambda/setup',
  );
  process.exit(0);
}
const configEntries = Object.entries(AWS_RENDER_CONFIGS);
console.log(
  `\nDeploying ${configEntries.length} Lambda function preset(s) to ${regions.length} region(s) in parallel...\n`,
);

await Promise.all(
  regions.map(async (region) => {
    console.log('========================================');
    console.log(
      `Deploying infrastructure for region: ${
        region === defaultRegion ? `${region} (default)` : region
      }`,
    );
    console.log('========================================\n');

    // Deploy Lambda function for each configuration (failures don't block site deployment)
    const functionFailures = [];
    for (const [configKey, config] of configEntries) {
      console.log(`[${region}] [${configKey}] Deploying Lambda function...`);
      console.log(
        `  Memory: ${config.memory}MB, Disk: ${config.disk}MB, Timeout: ${config.timeout}s`,
      );

      try {
        const { functionName, alreadyExisted: functionAlreadyExisted } =
          await deployFunction({
            createCloudWatchLogGroup: true,
            memorySizeInMb: config.memory,
            region: region,
            timeoutInSeconds: config.timeout,
            diskSizeInMb: config.disk,
          });

        console.log(
          `  ✓ ${functionName} ${
            functionAlreadyExisted ? '(already existed)' : '(created)'
          }\n`,
        );
      } catch (err) {
        console.log(`  ✗ Failed: ${err.message}\n`);
        functionFailures.push({ configKey, error: err });
      }
    }

    // Ensure bucket (shared across all configs)
    process.stdout.write(`[${region}] Ensuring bucket... `);
    const { bucketName, alreadyExisted: bucketAlreadyExisted } =
      await getOrCreateBucket({
        region: region,
      });
    console.log(
      bucketName,
      bucketAlreadyExisted ? '(already existed)' : '(created)',
    );

    // Deploy site (shared across all configs)
    const siteNameForRegion =
      region === defaultRegion ? SITE_NAME : `${SITE_NAME}-${region}`;

    process.stdout.write(
      `[${region}] Deploying site (${siteNameForRegion})... `,
    );
    const { siteName } = await deploySite({
      bucketName,
      entryPoint: path.join(
        process.cwd(),
        'components',
        'remotion',
        'index.ts',
      ),
      siteName: siteNameForRegion,
      region: region,
      options: { webpackOverride: webpackOverride },
    });

    console.log(siteName);

    if (functionFailures.length > 0) {
      console.log(
        `⚠ [${region}] ${
          configEntries.length - functionFailures.length
        }/${configEntries.length} Lambda function(s) deployed (${functionFailures.length} failed):`,
      );
      configEntries.forEach(([key, config]) => {
        const failed = functionFailures.find((f) => f.configKey === key);
        const status = failed ? '✗ FAILED' : '✓';
        console.log(
          `  - ${key}: ${config.memory}MB RAM, ${config.disk}MB disk, ${config.timeout}s timeout [${status}]`,
        );
      });
    } else {
      console.log(
        `✓ [${region}] Deployed ${configEntries.length} Lambda function(s) for all configurations:`,
      );
      configEntries.forEach(([key, config]) => {
        console.log(
          `  - ${key}: ${config.memory}MB RAM, ${config.disk}MB disk, ${config.timeout}s timeout`,
        );
      });
    }

    console.log();
  }),
);

console.log('✓ Multi-region deployment complete!');
console.log('You now have everything you need to render videos!');
console.log('Re-run this command when:');
console.log('  1) you changed the video template');
console.log('  2) you changed config.mjs');
console.log('  3) you upgraded Remotion to a newer version');
