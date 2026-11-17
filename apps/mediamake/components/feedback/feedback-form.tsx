'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FEEDBACK_MAX_CHARS, type OwnFeedback } from '@/lib/feedback/feedback';

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** What came of one feedback, in a few words, for its writer. */
export function outcomeOf(feedback: OwnFeedback): { label: string; tone: 'done' | 'moving' | 'quiet' } {
  if (feedback.status === 'shipped') return { label: feedback.shipped?.version ? `Fixed in v${feedback.shipped.version.replace(/^v/, '')}` : 'Fixed', tone: 'done' };
  if (feedback.pr?.state === 'open' || feedback.pr?.state === 'requested') return { label: 'A fix is being made', tone: 'moving' };
  if (feedback.status === 'answered') return { label: 'Answered', tone: 'moving' };
  if (feedback.status === 'dismissed') return { label: 'Closed', tone: 'quiet' };
  return { label: 'Received', tone: 'quiet' };
}

const TONE = {
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  moving: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  quiet: 'bg-muted text-muted-foreground',
};

/**
 * The feedback form on an item's page, and under it what the viewer sent
 * before with what came of it. Signed out, it asks them to sign in.
 */
export function FeedbackForm({ itemId, title, version }: { itemId: string; title: string; version?: string }) {
  const pathname = usePathname();
  const [mine, setMine] = useState<OwnFeedback[] | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [text, setText] = useState('');
  const [used, setUsed] = useState(version ?? '');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback?item=${encodeURIComponent(itemId)}`);
      if (res.status === 401) return setSignedOut(true);
      if (res.ok) setMine(((await res.json()) as { feedback: OwnFeedback[] }).feedback);
    } catch {
      // the form still works without the list
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, itemId, version: used.trim() || undefined, source: 'web' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Could not send it (${res.status})`);
      setText('');
      toast.success('Sent. Thank you', { description: 'We read every one. You get a mail when a fix for it ships.' });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div>
        <h2 className="text-sm font-semibold">Feedback</h2>
        <p className="text-xs text-muted-foreground">A bug, something that got in your way, an idea, or what worked. Only you and the MediaMake team see it.</p>
      </div>
      {signedOut ? (
        <p className="text-sm text-muted-foreground">
          <Link href={`/login?redirectTo=${encodeURIComponent(`${pathname}#feedback`)}`} className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>{' '}
          to send feedback on {title}.
        </p>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={event => {
            event.preventDefault();
            void send();
          }}
        >
          <Textarea
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder={`What happened when you used ${title}? Say the step and what you saw. Leave out file paths and keys.`}
            maxLength={FEEDBACK_MAX_CHARS}
            className="min-h-24"
            aria-label="Your feedback"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Version you used
              <Input value={used} onChange={event => setUsed(event.target.value)} placeholder="e.g. 1.2.0" maxLength={80} className="h-8 w-28 font-mono text-xs" />
            </label>
            <Button type="submit" size="sm" className="ml-auto" disabled={sending || text.trim().length < 3}>
              {sending ? 'Sending…' : 'Send feedback'}
            </Button>
          </div>
        </form>
      )}
      {mine && mine.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What you sent</h3>
          <ul className="flex flex-col gap-2">
            {mine.map(feedback => {
              const outcome = outcomeOf(feedback);
              return (
                <li key={feedback.feedbackId} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${TONE[outcome.tone]}`}>{outcome.label}</span>
                    <time dateTime={feedback.createdAt}>{day(feedback.createdAt)}</time>
                    {feedback.version && <span className="font-mono">v{feedback.version.replace(/^v/, '')}</span>}
                  </div>
                  <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm">{feedback.text}</p>
                  {feedback.answer && (
                    <p className="mt-2 whitespace-pre-line border-l-2 pl-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">MediaMake: </span>
                      {feedback.answer.text}
                    </p>
                  )}
                  {feedback.shipped?.note && <p className="mt-2 text-sm text-muted-foreground">{feedback.shipped.note}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
