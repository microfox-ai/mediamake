This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Development browser login. DEV_CLIENT_KEY (or the existing DEV_API_KEY) must be
# an API key stored in Redis. When it is set, /api/dev-session signs the local
# browser in automatically so Cursor and Claude can open the app. This route
# refuses to run outside development. The session uses the key's clientId.
# DEV_CLIENT_ID is optional and, when set, must match that clientId.
DEV_CLIENT_KEY=
DEV_CLIENT_ID=

# HeyGen API Key for video generation
HEYGEN_API_KEY=your_heygen_api_key_here

# MongoDB connection
MONGODB_URI=your_mongodb_connection_string

# S3/Spaces configuration for file uploads
SPACES_ENDPOINT=your_spaces_endpoint
SPACES_ACCESS_KEY_ID=your_access_key_id
SPACES_SECRET_ACCESS_KEY=your_secret_access_key
SPACES_BUCKET=your_bucket_name
SPACES_CDN_ENDPOINT=your_cdn_endpoint

# Other API keys as needed
# ASSEMBLY_AI_KEY=your_assembly_ai_key
# ELEVENLABS_API_KEY=your_elevenlabs_key
```

### HeyGen Integration

To use the video generation feature in the transcription page:

1. Sign up for a HeyGen account at https://www.heygen.com/
2. Get your API key from the HeyGen dashboard
3. Add `HEYGEN_API_KEY` to your `.env.local` file
4. The Video tab will appear in the transcription editor where you can generate AI avatar videos from your audio files

**Features:**

- Dynamic avatar loading (fetches current available avatars from your account)
- Multiple resolution options (720p, 1080p, 4K)
- Custom backgrounds (solid colors or images)
- **Webhook support** for real-time video completion notifications
- Automatic polling fallback for development environments
- Video history and management

**Free Tier Limits:**

- 720p resolution with watermark
- 10 API credits per month
- 3 videos per month, max 3 minutes each
- Some avatars may require paid subscription

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

With `DEV_CLIENT_KEY` or `DEV_API_KEY` set, the app signs the browser in on its own. Open a URL with `?manual=1` when you need the login form for a different account. To preview a video from JSON without opening a project, go to [http://localhost:3000/dev/preview](http://localhost:3000/dev/preview), paste a timeline input or a compiled composition, and press Apply.

API routes stay compiled for the dev session (`onDemandEntries` in `next.config.ts`). Restart `npm run dev` after pulling that change so the new buffer is picked up. `next dev --turbopack` is faster still, but this app's `webpack` hook (Remotion, mongodb, sharp) is not applied under Turbopack, so keep the default webpack dev server until those externals are mirrored.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Remotion Lambda

Rendering uses two AWS pieces. The **Lambda function** is the renderer. The **site** is the webpack bundle of `components/remotion`, stored in the Remotion S3 bucket. `deploy.mjs` deploys both, for every preset in `AWS_RENDER_CONFIGS` and every region in `AWS_REGIONS`.

### When to redeploy

Redeploy the **Lambda function** when:

- You upgrade Remotion. The function name includes the package version, so a bump makes `speculateFunctionName` look for a function that does not exist yet.
- You change memory, disk, or timeout on a preset in `config.mjs`. Each combination is its own function.
- You add a region to `AWS_REGIONS`.

Redeploy the **site** when:

- You change compositions, components, fonts, or assets the render uses.
- You change `components/remotion/webpack-override.mjs`.

Concurrency, frames per Lambda, codec, and input props are render-time settings. They do not need a redeploy.

Re-running deploy is safe. An existing function with the same Remotion version, memory, disk, and timeout is left in place. The site is uploaded again every time.

### How

From this directory, with `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or the `REMOTION_AWS_*` pair) in `.env`:

```bash
npm run deploy
```

That runs `node deploy.mjs`. For each region it:

1. Calls `deployFunction` once per preset.
2. Ensures the Remotion S3 bucket.
3. Calls `deploySite`. The site name is `mediamake` in the default region (`ap-south-1`) and `mediamake-<region>` everywhere else.

A function failure in one preset does not stop the site upload. The script prints which presets failed.

To deploy a single spec by hand, the memory, disk, and timeout must match what the render route passes to `speculateFunctionName`:

```bash
npx remotion lambda functions deploy --memory=<MB> --timeout=<s> --disk=<MB> --region=ap-south-1
```

### Automatic deploy

The site is deployed automatically, together with the Lambda functions. `.github/workflows/deploy-site.yml` runs `npm run deploy` on every push to `main` that changes `apps/mediamake/**`. It uses the `REMOTION_AWS_ACCESS_KEY_ID`, `REMOTION_AWS_SECRET_ACCESS_KEY`, and `REMOTION_AWS_REGION` GitHub secrets.

That name maps to an S3 object:
https://<remotion-bucket>.s3.<region>.amazonaws.com/sites/<site-name>/index.html

There is no separate site-only job. A composition change on `main` ships the site. A Remotion upgrade or a `config.mjs` preset change on `main` ships the matching functions in the same run.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
