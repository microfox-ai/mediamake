'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Lock, LogIn, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { copyInstallPrompt } from '@/lib/catalog/copy-install-prompt';
import type { CatalogVisibility, ViewerTier } from '@/lib/catalog/types';
import { cn } from '@/lib/utils';

const README = 'https://github.com/microfox-ai/mediamake/tree/main/packages/mediamake-mcp#readme';

type Stage = CatalogVisibility | 'vault';

const stageLabel: Record<Stage, string> = {
  vault: 'Admins only',
  private: 'In testing',
  network: 'Community',
  public: 'Public',
};

/** Where people go for their own projects: the tools that moved out of this MCP. */
const PROJECTSYNC = '/access?item=mcp/projectsync';

/** What the hosted connector offers, by area (packages/mediamake-mcp/src/tools). */
const TOOL_AREAS: { area: string; does: string; tools: string[] }[] = [
  {
    area: 'Catalog',
    does: 'Run releases from Claude: skills, MCPs, apps, tutorials and courses, their videos, and who can open them.',
    tools: ['catalog_items', 'catalog_item', 'catalog_archive', 'catalog_set_stage', 'catalog_add_third_party', 'catalog_invite', 'catalog_set_video', 'catalog_add_video_item', 'catalog_people', 'catalog_set_tier', 'catalog_versions'],
  },
  {
    area: 'Timelines',
    does: "Read how videos are built and make new timelines (the project ids come from ProjectSync's list_projects).",
    tools: ['list_timelines', 'get_timeline', 'survey_timelines', 'create_timeline', 'update_timeline', 'list_legacy_timelines', 'get_legacy_timeline'],
  },
  { area: 'Presets', does: 'Browse presets and add them to a timeline.', tools: ['list_presets', 'get_preset', 'add_preset_to_timeline'] },
  { area: 'Transcription', does: 'Transcribe a song and read its timed words.', tools: ['transcribe', 'list_transcriptions', 'get_transcription'] },
  { area: 'Suno takes', does: "A channel's song takes: read them and rate keeper, maybe or reject.", tools: ['list_generations', 'rate_generation'] },
  { area: 'Workers and agents', does: 'Run generation workers and agents.', tools: ['list_workers', 'get_worker_schema', 'run_worker', 'get_worker_job', 'list_agents', 'run_agent'] },
  { area: 'Renders', does: 'Plan, start and follow renders.', tools: ['plan_render', 'render', 'render_presets', 'render_status', 'list_renders', 'get_render_input_props'] },
];

interface McpGuideProps {
  mcpUrl: string;
  installPrompt: string;
  clientId: string | null;
  tier: ViewerTier;
  canConnect: boolean;
  stage: Stage;
}

export function McpGuide({ mcpUrl, installPrompt, clientId, tier, canConnect, stage }: McpGuideProps) {
  const addCommand = `claude mcp add --transport http --scope user mediamake ${mcpUrl}`;
  const projectJson = JSON.stringify({ mcpServers: { mediamake: { type: 'http', url: mcpUrl } } }, null, 2);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">MCP</Badge>
          <Badge variant="secondary">{stageLabel[stage]}</Badge>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Connect MediaMake to Claude</h2>
        <p className="text-muted-foreground">
          The MediaMake MCP is for MediaMake admins. It runs the catalog from Claude (skill, MCP, app and tutorial
          releases) and works with timelines, presets, transcriptions, Suno takes, workers and renders. It runs here on
          MediaMake, so there is nothing to install: add this address to Claude and sign in with your MediaMake account.
        </p>
        <p className="text-sm text-muted-foreground">
          Projects, brand kits, productions, releases and media are in{' '}
          <Link href={PROJECTSYNC} className="underline">
            ProjectSync
          </Link>
          , a local MCP for everyone on a project.
        </p>
        <CopyBlock text={mcpUrl} label="Copy address" />
      </header>

      <AccessNote clientId={clientId} tier={tier} canConnect={canConnect} stage={stage} />

      {canConnect && (
        <Section title="The quick way: one prompt">
          <p>
            Paste this into Claude Code. Claude adds the connector and tells you how to sign in. The copy has an install
            code in it, so Claude won&apos;t ask for your API key.
          </p>
          <CopyBlock text={installPrompt} label="Copy setup prompt" onCopy={() => copyInstallPrompt('mcp/mediamake', installPrompt)} />
        </Section>
      )}

      <Section title={canConnect ? 'Or add it by hand' : 'How to add it'}>
        <Tabs defaultValue="code" className="gap-4">
          <TabsList>
            <TabsTrigger value="code">Claude Code</TabsTrigger>
            <TabsTrigger value="apps">Claude apps</TabsTrigger>
            <TabsTrigger value="other">Other apps</TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="flex flex-col gap-4">
            <Steps>
              <li>
                Add it for all your projects, in a terminal:
                <CopyBlock text={addCommand} label="Copy command" className="mt-2" />
              </li>
              <li>
                Start Claude Code, type <Kbd>/mcp</Kbd>, pick <b>mediamake</b> and choose <b>Authenticate</b>.
              </li>
              <li>
                A browser window opens: sign in to MediaMake and click <b>Allow</b>. Back in Claude Code, mediamake shows
                as connected.
              </li>
            </Steps>
            <p className="text-sm text-muted-foreground">
              To share it with everyone who opens a project, put it in the project&apos;s <Kbd>.mcp.json</Kbd> instead
              (each person still signs in as themselves):
            </p>
            <CopyBlock text={projectJson} label="Copy" />
            <p className="text-sm text-muted-foreground">
              No browser handy? Connect with an API key from <Link href="/core/api-keys" className="underline">API keys</Link>{' '}
              instead of signing in: add <Kbd>--header &quot;Authorization: Bearer YOUR_API_KEY&quot;</Kbd> to the command. A key
              is a password: keep it out of chats and repos.
            </p>
          </TabsContent>

          <TabsContent value="apps" className="flex flex-col gap-4">
            <p>In Claude Desktop or on claude.ai:</p>
            <Steps>
              <li>
                Open <b>Settings → Connectors</b> and click <b>Add custom connector</b>.
              </li>
              <li>
                Name it <b>MediaMake</b>, paste the address and click <b>Add</b>:
                <CopyBlock text={mcpUrl} label="Copy address" className="mt-2" />
              </li>
              <li>
                Click <b>Connect</b>. MediaMake&apos;s sign-in opens: sign in and click <b>Allow</b>.
              </li>
              <li>In a chat, open the tools menu and check MediaMake is on.</li>
            </Steps>
            <p className="text-sm text-muted-foreground">
              A connector added on claude.ai shows up in Claude Desktop and the mobile app too, under the same Claude
              account. On a Team or Enterprise plan, an owner may have to add it for the organization first.
            </p>
          </TabsContent>

          <TabsContent value="other" className="flex flex-col gap-4">
            <p>
              Any MCP client that speaks Streamable HTTP connects to the same address. It signs in with OAuth: the client
              registers itself, then you sign in to MediaMake and click <b>Allow</b>. A client without OAuth can send an
              API key instead, as the header <Kbd>Authorization: Bearer YOUR_API_KEY</Kbd>.
            </p>
            <CopyBlock text={mcpUrl} label="Copy address" />
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Check it works">
        <p>
          Ask Claude: <i>&ldquo;List the MediaMake catalog&apos;s MCPs.&rdquo;</i> It calls <Kbd>catalog_items</Kbd> and shows
          them with their release pages. If it says MediaMake isn&apos;t connected, see{' '}
          <a href="#trouble" className="underline">Trouble</a> below.
        </p>
      </Section>

      <Section title="What Claude can do with it">
        <div className="divide-y rounded-lg border">
          {TOOL_AREAS.map(({ area, does, tools }) => (
            <div key={area} className="flex flex-col gap-1.5 p-4">
              <div className="text-sm">
                <span className="font-medium">{area}</span>
                <span className="text-muted-foreground"> · {does}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tools.map(tool => (
                  <code key={tool} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {tool}
                  </code>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">There are no delete tools, on purpose.</p>
      </Section>

      <Section title="Good to know">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <b>It acts as you.</b> Claude sees what your account sees, with your tier and access.
          </li>
          <li>
            <b>It can&apos;t see your computer.</b> It runs on MediaMake&apos;s servers, so bring media in by a public https
            link. To upload files from your computer (brand kits, productions, release kits, media), use{' '}
            <Link href={PROJECTSYNC} className="underline">
              ProjectSync
            </Link>
            .
          </li>
          <li>
            <b>Renders and workers cost money.</b> Claude should check with you before a big batch. A render Claude waits
            on stops waiting after about four and a half minutes; <Kbd>render_status</Kbd> picks it up from there.
          </li>
          <li>
            <b>Need Claude to read or write files on your computer?</b> Use the local version (an .mcpb for Claude Desktop,
            or the stdio server) with an API key: see the{' '}
            <a href={README} target="_blank" rel="noopener noreferrer" className="underline">
              README
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="Disconnect">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Remove the connector in Claude, or sign out of it there: its sign-in ends at once.</li>
          <li>
            Or sign it out on <Link href="/core/devices" className="underline">Signed-in devices</Link>, where it is listed
            with your apps.
          </li>
          <li>
            Disabling the API key it uses on <Link href="/core/api-keys" className="underline">API keys</Link> cuts it off
            too (a signed-in connector within the hour).
          </li>
        </ul>
      </Section>

      <Section title="Trouble" id="trouble">
        <dl className="flex flex-col gap-4">
          <Trouble q="The Allow screen says the MCP is for admins, or Claude gets a 403.">
            Only MediaMake admins (and people an admin granted it to by name) can connect. For your own projects, use{' '}
            <Link href={PROJECTSYNC} className="underline">
              ProjectSync
            </Link>
            .
          </Trouble>
          <Trouble q="No browser window opened in Claude Code.">
            Type <Kbd>/mcp</Kbd>, pick mediamake and choose Authenticate again, or connect with an API key.
          </Trouble>
          <Trouble q="It worked, then stopped.">
            A sign-in renews itself while you use it and ends after 30 days unused. Reconnect: <Kbd>/mcp</Kbd> → mediamake →
            Authenticate in Claude Code, or Connect in Settings → Connectors.
          </Trouble>
          <Trouble q="It signed in as the wrong account.">
            Remove the connector, sign out of MediaMake in the browser, then add it again and sign in as the right
            account.
          </Trouble>
        </dl>
      </Section>

      {tier === 'admin' && (
        <Section title="Who can connect">
          <p>
            Admins, and anyone granted <Kbd>mcp/mediamake</Kbd> by name (Releases → its access sheet). It is in the vault,
            so private testers and the community don&apos;t get it. Who can connect follows the item:{' '}
            <Link href="/core/releases/mcp/mediamake" className="underline">
              mcp/mediamake
            </Link>
            .
          </p>
        </Section>
      )}
    </div>
  );
}

function AccessNote({ clientId, tier, canConnect, stage }: Pick<McpGuideProps, 'clientId' | 'tier' | 'canConnect' | 'stage'>) {
  if (!clientId) {
    return (
      <Alert>
        <LogIn />
        <AlertTitle>Sign in to connect</AlertTitle>
        <AlertDescription>
          <p>
            The MCP signs in with your MediaMake account.{' '}
            <Link href="/login?redirectTo=/core/mediamake-mcp" className="underline">
              Sign in
            </Link>{' '}
            to see whether it is open to you.
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  if (canConnect) {
    const why = tier === 'admin' ? "You're an admin." : 'An admin granted it to you.';
    return (
      <Alert>
        <ShieldCheck />
        <AlertTitle>You can connect</AlertTitle>
        <AlertDescription>
          <p>
            {why} You&apos;re signed in as <span className="font-mono">{clientId}</span>: sign in as the same account when
            Claude asks.
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert>
      <Lock />
      <AlertTitle>{stageLabel[stage]}</AlertTitle>
      <AlertDescription>
        <p>
          The MediaMake MCP runs MediaMake&apos;s releases, so only admins can connect (you&apos;re signed in as{' '}
          <span className="font-mono">{clientId}</span>). For your projects, brand kits, productions, releases and media,
          install{' '}
          <Link href={PROJECTSYNC} className="underline">
            ProjectSync
          </Link>
          .
        </p>
      </AlertDescription>
    </Alert>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-16 flex-col gap-3 text-sm leading-relaxed">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm leading-relaxed">{children}</ol>;
}

function Trouble({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium">{q}</dt>
      <dd className="text-muted-foreground">{children}</dd>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

/** Text to copy, shown whole, with its copy button. `onCopy` replaces the plain clipboard write. */
function CopyBlock({ text, label, onCopy, className }: { text: string; label: string; onCopy?: () => Promise<void>; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn('flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-start', className)}>
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">{text}</pre>
      <Button
        variant="secondary"
        size="sm"
        className="shrink-0 self-end sm:self-start"
        onClick={async () => {
          try {
            await (onCopy ? onCopy() : navigator.clipboard.writeText(text));
          } catch {
            return; // no clipboard access: the text is right there to copy by hand
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? 'Copied' : label}
      </Button>
    </div>
  );
}
