export const StudioConfig = {
  appName: 'Media Make',
  appDescription:
    'MediaMake is an opensource project for creating & rendering videos with AIrouter & datamotion which is built on top of remotion.',
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
        db:
          process.env.DATABASE_MONGODB_DB ||
          process.env.MONGODB_DB ||
          'mediamake',
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
    projectId: "4f360563-0f8c-4897-88dd-f87e8eb30922",
    publish: {
      subdomain: "mediamake",
      agentName: "mediamake",
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
        sparkboard: {
          includeNodeModules: true
        },
        ffmpeg: {
          includeNodeModules: true
        }
      }
    }
  },
};
