import { resolveWritepadMongoDbName } from './lib/db/mongoDbName';

export const StudioConfig = {
  appName: 'Writepad',
  appDescription:
    'AI-powered creative writing studio for scripts, screenplays, ideas, and any creative writing with intelligent workflows, auto-correction, and contextual suggestions.',
  projectInfo: {
    framework: 'next-js',
  },
  studioSettings: {
    protection: {
      enabled: false,
      credentials: {
        email: process.env.MICROFOX_PROTECTION_EMAIL,
        password: process.env.MICROFOX_PROTECTION_PASSWORD,
      },
    },
    database: {
      type: 'local', // local | upstash-redis | supabase
      fileUpload: {
        enabled: true,
        apiKey: process.env.SERVER_SECRET_API_KEY,
      },
    },
  },
  // Workflow + worker runtime configuration (job store, etc.)
  workflowSettings: {
    jobStore: {
      // 'mongodb' | 'upstash-redis'
      type:
        (process.env.WORKER_DATABASE_TYPE as
          | 'mongodb'
          | 'upstash-redis') || 'upstash-redis',
      mongodb: {
        uri: process.env.DATABASE_MONGODB_URI || process.env.MONGODB_URI,
        db: resolveWritepadMongoDbName(
          process.env.DATABASE_MONGODB_URI || process.env.MONGODB_URI || '',
        ),
        workerJobsCollection:
          process.env.MONGODB_WORKER_JOBS_COLLECTION || 'worker_jobs',
        workflowStatusCollection:
          process.env.MONGODB_WORKFLOW_STATUS_COLLECTION || 'workflow_status',
      },
      redis: {
        url:
          process.env.WORKER_UPSTASH_REDIS_REST_URL ||
          process.env.UPSTASH_REDIS_REST_URL,
        token:
          process.env.WORKER_UPSTASH_REDIS_REST_TOKEN ||
          process.env.UPSTASH_REDIS_REST_TOKEN,
        keyPrefix:
          process.env.WORKER_UPSTASH_REDIS_JOBS_PREFIX ||
          'worker:jobs:',
        ttlSeconds:
          Number(process.env.WORKER_JOBS_TTL_SECONDS ?? 60 * 60 * 24 * 7),
      },
    },
  },
  deploymentConfig: {
    projectId: "90697d26-eedd-4049-a767-40290396740f",
    publish: {
      subdomain: "writepad",
      agentName: "writepad",
      handles: {
        agent: "/agent",
        openapi: "/docs.json",
        public: "/public"
      }
    },
    deployment: {
      apiMode: 'staging',
      apiVersion: 'v2',
      ignorePatterns: ['.build/**', 'package-lock.json'],
    },
    worker: {
      externalDeps: ["@microfox/puppeteer-sls", "@sparticuz/chromium", "sharp"],
      includeNodeModules: false,
      groups: {
        scraper: {
          includeNodeModules: true
        },
        // Continuity-check workers — heavier memory + longer timeout to handle
        // large projects analyzed via long-context models (Gemini 2.5 Pro, etc.)
        continuity: {
          memorySize: 2048,
          timeout: 900,
          includeNodeModules: true
        }
      }
    }
  },
};
