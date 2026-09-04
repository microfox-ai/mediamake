# Workflow Auth & Local Dev Store

Authentication for the workflow HTTP surface, and a job store adapter that
proxies to a locally running `ai-worker dev` server.

Applies to both `apps/mediamake` and `apps/writepad` — the two apps carry
parallel copies of these files.

---

## The problem

The workflow routes queue jobs, dispatch worker steps, and resume human-in-the-loop
pipelines with reviewer-supplied input. They were open to anonymous callers.
Anyone who could reach the deployment could enqueue work, drive a pipeline
forward, or inject HITL input.

---

## `authorizeWorkflowRequest`

`app/api/workflows/auth.ts`. A request is authorized when **any** of three
conditions hold, checked in order:

### 1. A real user session

```ts
export async function getClientId(req: NextRequest): Promise<string | undefined> {
  const sessionId = req.cookies.get('session_token')?.value;
  if (sessionId) {
    const session = await sessionStore.get(sessionId);
    if (session && session.expires > Date.now()) return session.clientId;
  }
}
```

Sessions live in Upstash Redis under the `sessions` hash and carry an explicit
`expires` timestamp, checked on every call. Returns `{ ok: true, userId, via: 'user' }`
and the `userId` is attached to the worker job.

The function is written as a replaceable stub — its docblock shows the NextAuth
equivalent — so another app can swap in its own auth without touching the guard.

### 2. The internal shared secret

For trusted Lambda → app callbacks (webhooks, step updates), which have no user
session:

```
x-workflow-secret: <WORKFLOW_INTERNAL_SECRET>
```

Falls back to `WORKERS_API_KEY` when `WORKFLOW_INTERNAL_SECRET` is unset, so a
single shared secret can cover both surfaces. The deployed worker runtime sends
this header when the env var is set.

Comparison is **timing-safe** (`timingSafeEqualStr`, backed by
`node:crypto`) — a plain `===` on a secret leaks its prefix to a patient
attacker.

### 3. Explicit public opt-out

`WORKFLOW_ALLOW_PUBLIC=true` allows anonymous access and logs a warning on every
request. For local demos only — never set it in production.

Otherwise: **401**, with an error message that names all three ways to fix it.

### Guarded routes

- `app/api/workflows/queues/[...slug]/route.ts`
- `app/api/workflows/workers/[...slug]/route.ts`

Plus the queue, worker and config routes in both apps.

---

## Local dev job store

`app/api/workflows/stores/localDevAdapter.ts`

Workflow jobs normally persist to Upstash Redis or MongoDB. Neither is
convenient when you are iterating on a worker locally — you want the job state
in the `ai-worker dev` server you already have running.

Set the store type to `local`:

```bash
WORKER_DATABASE_TYPE=local
WORKER_BASE_URL=http://localhost:4100
```

`jobStore.ts` resolves the backend from `workflowSettings.jobStore.type` in
`microfox.config.ts`, falling back to `WORKER_DATABASE_TYPE`, defaulting to
`upstash-redis`. When it resolves to `local` it loads `localDevJobStore`, which
proxies every operation over HTTP to the dev server:

```ts
setJob · getJob · updateJob · appendInternalJob · listJobsByWorker
createQueueJobLocal · updateQueueStepLocal · appendQueueStepLocal
updateQueueJobLocal · getQueueJobLocal
```

It throws a directive error if `WORKER_BASE_URL` is unset rather than silently
falling back, and logs `[JobStore] Ready (local ai-worker dev server via WORKER_BASE_URL)`
so it is obvious which backend is live.

---

## Other workflow changes

**Pipelined Redis reads.** Listing jobs by worker previously issued one round
trip per job. Reads are now pipelined into a single call — the difference is
large on workers with many jobs, since each round trip to Upstash is a full HTTPS
request.

**Local resolution of step config.** Step retry configuration and HITL input
schemas resolve locally instead of requiring a remote fetch.

**Per-run poll timers.** `useWorkflowJob` scoped its poll timer to the hook
instance, so starting a second run left the first run's timer alive — two timers
polling, and the stale one writing into shared state. Timers are now keyed per
run and cleaned up when that run ends.

**`@microfox/ai-worker` 1.0.5 → 1.1.2.**

**Usage worker group**, with the project id read from the environment.

---

## Environment variables

| Variable | Purpose |
|---|---|
| `WORKFLOW_INTERNAL_SECRET` | Shared secret for internal callbacks. Preferred. |
| `WORKERS_API_KEY` | Fallback for the above; also gates the deployed endpoints. |
| `WORKFLOW_ALLOW_PUBLIC` | `true` disables auth. Local only. |
| `WORKER_DATABASE_TYPE` | `mongodb` \| `upstash-redis` \| `local`. |
| `WORKER_BASE_URL` | Required when the type is `local`. |
| `WORKERS_TRIGGER_API_URL` / `WORKERS_TRIGGER_API_KEY` | Trigger endpoint for the deployed worker. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Session store and Redis job store. |
