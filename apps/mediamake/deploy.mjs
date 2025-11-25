import {
  deployFunction,
  deploySite,
  getOrCreateBucket,
} from '@remotion/lambda';
import dotenv from 'dotenv';
import path from 'path';
import { AWS_RENDER_CONFIGS, REGION, SITE_NAME } from './config.mjs';
import { webpackOverride } from './components/remotion/webpack-override.mjs';

console.log('Selected region:', process.env.REMOTION_AWS_REGION || REGION);
dotenv.config();

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

const region = process.env.REMOTION_AWS_REGION || REGION;
const configEntries = Object.entries(AWS_RENDER_CONFIGS);

console.log(`\nDeploying ${configEntries.length} Lambda function(s)...\n`);

// Deploy Lambda function for each configuration
for (const [configKey, config] of configEntries) {
  console.log(`[${configKey}] Deploying Lambda function...`);
  console.log(
    `  Memory: ${config.memory}MB, Disk: ${config.disk}MB, Timeout: ${config.timeout}s`,
  );

  const { functionName, alreadyExisted: functionAlreadyExisted } =
    await deployFunction({
      createCloudWatchLogGroup: true,
      memorySizeInMb: config.memory,
      region: region,
      timeoutInSeconds: config.timeout,
      diskSizeInMb: config.disk,
    });

  console.log(
    `  ✓ ${functionName} ${functionAlreadyExisted ? '(already existed)' : '(created)'}\n`,
  );
}

// Ensure bucket (shared across all configs)
process.stdout.write('Ensuring bucket... ');
const { bucketName, alreadyExisted: bucketAlreadyExisted } =
  await getOrCreateBucket({
    region: region,
  });
console.log(
  bucketName,
  bucketAlreadyExisted ? '(already existed)' : '(created)',
);

// Deploy site (shared across all configs)
process.stdout.write('Deploying site... ');
const { siteName } = await deploySite({
  bucketName,
  entryPoint: path.join(process.cwd(), 'components', 'remotion', 'index.ts'),
  siteName: SITE_NAME,
  region: region,
  options: { webpackOverride: webpackOverride },
});

console.log(siteName);

console.log();
console.log('✓ Deployment complete!');
console.log(
  `✓ Deployed ${configEntries.length} Lambda function(s) for all configurations:`,
);
configEntries.forEach(([key, config]) => {
  console.log(
    `  - ${key}: ${config.memory}MB RAM, ${config.disk}MB disk, ${config.timeout}s timeout`,
  );
});
console.log();
console.log('You now have everything you need to render videos!');
console.log('Re-run this command when:');
console.log('  1) you changed the video template');
console.log('  2) you changed config.mjs');
console.log('  3) you upgraded Remotion to a newer version');
