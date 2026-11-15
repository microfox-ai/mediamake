# Sign-in

How people sign in to MediaMake, and what a deployment needs for it. Code: `lib/auth/`, routes under
`app/api/auth/`, pages under `app/login/`, `app/signup/` and `app/core/login/`.

## The model

- **The client id is the account id.** API keys, sessions, devices, grants and memberships key on it, as before.
- A **user record** (MongoDB `users`, `lib/auth/users.ts`) adds how the person signs in: email, password hash,
  Google id, GitHub id and login, name, avatar. It holds an email only once the email is verified.
- **Sessions and devices are unchanged**: the `session_token` cookie and the Redis `sessions` store
  (`lib/auth/session.ts`). Every way of signing in ends in the same session for a client id.
- A new account gets a generated client id and one API key, because the MCP sign-in and the command line run on a key.

## Ways in

| Where | What |
|---|---|
| `/login` | Email and password, Continue with Google, Continue with GitHub. The MCP sign-in (`/oauth`) passes through here. |
| `/signup` | A new account. The address is confirmed by a mailed link before the account exists. |
| `/login/forgot`, `/login/reset` | A mailed link sets a new password and signs the other browsers out. Also sets a first password for a Google or GitHub account. |
| `/login/link` | After Google or GitHub, when no account has that identity: make a new account, or link an old one by its client id and key. |
| `/core/login` | Core's form: a client id and key, plus Google. Core pages send signed-out people here. |

## Old accounts (a client id and keys, no user record)

They keep working on `/core/login` and for scripts. They are linked in one of three ways:

1. The person signs in with Google or GitHub on `/login`, then proves the account with its client id and key.
2. The person signs in on `/core/login` and adds an email, password, Google or GitHub on the API Keys page ("How you sign in").
3. An admin names their email (API Keys page, "Link an old account", or `POST /api/admin/users { clientId, email }`).
   The person then signs in with a Google or GitHub account of that address, or uses "Forgot password".

## Sign-up is invite only until it is opened

`MEDIAMAKE_SIGNUP=open` lets anyone make an account. Until then a new account needs a live invite: invite links
lead to `/access?code=…`, and sign-in carries that address along as `redirectTo`. Existing accounts can always sign in.

## Environment

| Variable | For |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Continue with Google. Redirect URI: `<site>/api/auth/google/callback` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Continue with GitHub. Callback URL: `<site>/api/auth/github/callback` |
| `RESEND_API_KEY` | Verification and reset mail. Without it, production answers 503 and `next dev` prints the mail to the server log. |
| `MAIL_FROM` | Optional. Default `MediaMake <hello@mediamake.microfox.app>`; the domain must be verified in Resend. |
| `MEDIAMAKE_SIGNUP` | `open` to let anyone sign up. |
| `MEDIAMAKE_PUBLIC_URL` | Optional. The site's public origin, used in mailed links and callbacks. |

A provider whose variables are missing shows no button. Tests: `npx tsx --test lib/auth/accounts.test.ts`.
