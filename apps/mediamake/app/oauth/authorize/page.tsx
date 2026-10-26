import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SCOPE, apiKeyForClient, getClient, saveAuthorizeRequest, sessionClientId } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';

/**
 * The OAuth consent screen for the hosted MCP endpoint. Signed-out users go
 * through /login first and come back here; signed-in users choose whether the
 * MCP client may act as them.
 */

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{children}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function backWithError(redirectUri: string, error: string, description: string, state?: string): never {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error);
  url.searchParams.set('error_description', description);
  if (state) url.searchParams.set('state', state);
  redirect(url.toString());
}

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const clientId = one(params.client_id);
  const state = one(params.state);

  // Until the client and redirect_uri check out, errors are shown here and
  // never sent to the redirect_uri (it could be anyone's).
  const client = clientId ? await getClient(clientId) : null;
  if (!client) {
    return <Message title="Unknown app">This app is not registered with Mediamake. Remove the connector and add it again.</Message>;
  }
  const requested = one(params.redirect_uri);
  const redirectUri =
    requested ?? (client.redirectUris.length === 1 ? client.redirectUris[0] : undefined);
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    return <Message title="Invalid redirect">The app asked to return to an address it did not register.</Message>;
  }

  if (one(params.response_type) !== 'code')
    backWithError(redirectUri, 'unsupported_response_type', 'Only response_type=code is supported', state);
  const codeChallenge = one(params.code_challenge);
  if (!codeChallenge || one(params.code_challenge_method) !== 'S256')
    backWithError(redirectUri, 'invalid_request', 'PKCE with code_challenge_method=S256 is required', state);

  const viewer = { clientId: await sessionClientId() };
  const here = `/oauth/authorize?${new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (v === undefined ? [] : [[k, one(v)!]])),
  )}`;
  if (!viewer.clientId) redirect(`/login?redirectTo=${encodeURIComponent(here)}`);

  if ((await apiKeyForClient(viewer.clientId)) === null) {
    return (
      <Message title="No working API key">
        Your Mediamake account ({viewer.clientId}) has no enabled API key, and the connector runs with one. Ask an admin to
        enable or create a key for you, then try again.
      </Message>
    );
  }

  const pending = await saveAuthorizeRequest({
    oauthClientId: client.id,
    redirectUri,
    codeChallenge: codeChallenge!,
    state,
    scope: SCOPE,
    resource: one(params.resource),
    clientId: viewer.clientId,
  });
  const switchAccount = `/login?manual=1&redirectTo=${encodeURIComponent(here)}`;

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Connect {client.clientName} to Mediamake</CardTitle>
          <CardDescription>
            {client.clientName} will be able to use Mediamake as <strong>{viewer.clientId}</strong>: read and create
            projects, timelines and media, transcribe, run workers and agents, and start renders. It gets the same access
            as your account, and workers and renders it starts can cost credits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            You will return to <span className="font-mono break-all">{new URL(redirectUri).host || redirectUri}</span>.
            Not {viewer.clientId}?{' '}
            <a href={switchAccount} className="text-primary hover:underline">
              Sign in as someone else
            </a>
            .
          </p>
          <form method="post" action="/oauth/authorize/decision" className="flex gap-2">
            <input type="hidden" name="request_id" value={pending.id} />
            <Button type="submit" name="decision" value="allow" className="flex-1">
              Allow
            </Button>
            <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
