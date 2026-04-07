'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SessionProvider, useSession } from '@/components/session-provider';
import { FileText, MessageSquare, GitBranch } from 'lucide-react';

function LandingContent() {
  const router = useRouter();
  const sessionCtx = useSession();
  const isLoggedIn = sessionCtx?.session?.isAuthenticated === true;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">
            write<span className="text-violet-600 dark:text-violet-400">pad</span>
          </span>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Button
                size="sm"
                className="bg-violet-600 text-white hover:bg-violet-500"
                onClick={() => router.push('/projects')}
              >
                Open Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => router.push('/login')}
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  className="bg-violet-600 text-white hover:bg-violet-500"
                  onClick={() => router.push('/login')}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="mb-4 text-sm text-muted-foreground">AI writing studio</p>
        <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
          A focused place to write.
          <br />
          <span className="text-violet-600 dark:text-violet-400">With AI in the loop.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground">
          Writepad is an IDE-style editor for writers — screenplays, novels, scripts, blogs.
          Organize your project, write in markdown, and use AI chat with full file context.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {isLoggedIn ? (
            <Button
              size="lg"
              className="bg-violet-600 px-8 text-white hover:bg-violet-500"
              onClick={() => router.push('/projects')}
            >
              Open Dashboard
            </Button>
          ) : (
            <>
              <Button
                size="lg"
                className="bg-violet-600 px-8 text-white hover:bg-violet-500"
                onClick={() => router.push('/login')}
              >
                Start Writing
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8"
                onClick={() => router.push('/login')}
              >
                Sign In
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Features — three columns */}
      <section className="border-t border-border py-20">
        <div className="mx-auto grid max-w-4xl gap-8 px-6 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <FileText size={18} />
            </div>
            <h3 className="font-semibold">Project workspace</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Organize files in a tree — scripts, notes, characters, research. All in one structured
              project, saved to the cloud.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <MessageSquare size={18} />
            </div>
            <h3 className="font-semibold">Context-aware AI chat</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Select text, press Ctrl+L, and attach it to your AI conversation. The AI sees your
              entire project and can edit files directly.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <GitBranch size={18} />
            </div>
            <h3 className="font-semibold">Diff-based editing</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              AI edits land as drafts. Review exactly what changed, accept or decline each
              suggestion, and stay in control of every word.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          write<span className="text-violet-600 dark:text-violet-400">pad</span>
        </span>
        {' '}— AI creative writing studio
      </footer>
    </div>
  );
}

export default function WritePadLandingPage() {
  return (
    <SessionProvider>
      <LandingContent />
    </SessionProvider>
  );
}
