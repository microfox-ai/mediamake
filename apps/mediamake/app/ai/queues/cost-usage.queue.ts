/**
 * Cost usage queue: AI cost calc → Remotion backfill → Rollup aggregates.
 * The CLI discovers this file and injects queue-aware wrappers at compile time.
 * When a request has __workerQueue context (from dispatchQueue or cron), the wrapper
 * dispatches the next worker in the sequence after the handler completes.
 */

import { defineWorkerQueue } from '@microfox/ai-worker';

export const costUsageQueue = defineWorkerQueue({
  id: 'cost-usage',
  steps: [
    { workerId: 'cost-usage-ai' },
    { workerId: 'cost-usage-remotion' },
    { workerId: 'cost-usage-rollup' },
  ],
  schedule: 'cron(0 3 * * ? *)',
});
