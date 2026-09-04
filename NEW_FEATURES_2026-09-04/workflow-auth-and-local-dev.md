# Workflow Auth and Local Dev Store

Locking down the workflow HTTP routes, and a job store that talks to an
`ai-worker dev` server running on your machine.

Applies to both `apps/mediamake` and `apps/writepad` — they each have their own
copy of these files.

---

## The problem

The workflow routes queue jobs, kick off worker steps, and resume
human-in-the-loop pipelines using input a reviewer typed in. They were open to
anyone.

That meant anyone who could reach the deployment could add jobs, push a pipeline
forward, or feed in their own review input.

---

## `authorizeWorkflowRequest`

Lives in `app/api/workflows/auth.ts`. A request is allowed if **any one** of
three things is true, checked in this order:

### 1. A real logged-in user

```ts
export async function getClientId(req: NextRequest): Promise<string | undefined> {
  const sessionId = req.cookies.get('session_token')?.value;
  if (sessionId) {
    const session = await sessionStore.get(sessionId);
    if (session && session.expires > Date.now()) return session.clientId;
  }
}
```

Sessions are kept in Upstash Redis under the `sessions` hash, and each one has
an `expires` time that is checked on every request. Returns
`{ ok: true, userId, via: 'user' }`, and that `userId` gets attached to the
worker job.

The function is written to be swapped out — its comment shows the NextAuth
version — so another app can plug in its own auth without touching the guard.

### 2. A shared secret

For trusted calls from Lambda back into the app (webhooks, step updates), which
have no user session:

```
x-workflow-secret: <WORKFLOW_INTERNAL_SECRET>
```

If `WORKFLOW_INTERNAL_SECRET` is not set it falls back to `WORKERS_API_KEY`, so
one secret can cover both. The deployed worker sends this header when the
variable is set.

The comparison is **timing-safe** (`timingSafeEqualStr`, using `node:crypto`).
A plain `===` on a secret leaks its first characters to anyone patient enough to
measure.

### 3. Turning auth off on purpose

`WORKFLOW_ALLOW_PUBLIC=true` lets anyone through and logs a warning on every
request. For local demos only. Never set it in production.

If none of these apply: **401**, with an error message that names all three ways
to fix it.

### Routes behind the guard

- `app/api/workflows/queues/[...slug]/route.ts`
- `app/api/workflows/workers/[...slug]/route.ts`

Plus the queue, worker and config routes in both apps.

---

## Local dev job store

`app/api/workflows/stores/localDevAdapter.ts`

Workflow jobs normally save to Upstash Redis or MongoDB. Neither is handy when
you are working on a worker locally — you want the job state in the
`ai-worker dev` server you already have running.

Set the store type to `local`:

```bash
WORKER_DATABASE_TYPE=local
WORKER_BASE_URL=http://localhost:4100
```

`jobStore.ts` picks the backend from `workflowSettings.jobStore.type` in
`microfox.config.ts`, falling back to `WORKER_DATABASE_TYPE`, and defaulting to
`upstash-redis`. When it lands on `local` it loads `localDevJobStore`, which
sends every operation over HTTP to the dev server:

```
setJob · getJob · updateJob · appendInternalJob · listJobsByWorker
createQueueJobLocal · updateQueueStepLocal · appendQueueStepLocal
updateQueueJobLocal · getQueueJobLocal
```

It throws a clear error if `WORKER_BASE_URL` is missing, rather than quietly
falling back to something else. And it logs
`[JobStore] Ready (local ai-worker dev server via WORKER_BASE_URL)` so you can
see which backend is actually live.

---

## Other workflow changes

**Redis reads are batched.** Listing jobs for a worker used to make one request
per job. They are now sent in a single pipelined call. This makes a big
difference on workers with a lot of jobs, because every Upstash call is a full
HTTPS request.

**Step config resolved locally.** Step retry settings and human-in-the-loop
input schemas are worked out locally instead of needing a remote fetch.

**One poll timer per run.** `useWorkflowJob` tied its timer to the hook, so
starting a second run left the first run's timer alive. That meant two timers
polling, with the old one still writing into shared state. Timers are now keyed
per run and cleaned up when that run finishes.

**`@microfox/ai-worker` went 1.0.5 → 1.1.2.**

**A Usage worker group** was added, reading the project id from the environment.

---

## Environment variables

| Variable | What it is for |
|---|---|
| `WORKFLOW_INTERNAL_SECRET` | Shared secret for internal callbacks. Preferred. |
| `WORKERS_API_KEY` | Fallback for the above. Also protects the deployed endpoints. |
| `WORKFLOW_ALLOW_PUBLIC` | `true` turns auth off. Local only. |
| `WORKER_DATABASE_TYPE` | `mongodb`, `upstash-redis`, or `local`. |
| `WORKER_BASE_URL` | Required when the type is `local`. |
| `WORKERS_TRIGGER_API_URL` / `WORKERS_TRIGGER_API_KEY` | Trigger endpoint for the deployed worker. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Session store and the Redis job store. |
