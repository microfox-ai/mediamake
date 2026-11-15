/**
 * Mail through Resend's HTTP API. On when RESEND_API_KEY is set; the sender is
 * MAIL_FROM, or mediamake@reply-bots.com (that domain must be verified in
 * Resend). Without a key, `next dev` prints the mail to the server log so a
 * link can still be followed, and production refuses.
 */

export const DEFAULT_MAIL_FROM = 'MediaMake <mediamake@reply-bots.com>';

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super('Mail is not set up yet');
  }
}

export const mailConfigured = () => !!process.env.RESEND_API_KEY?.trim();

export async function sendMail(mail: Mail): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new MailNotConfiguredError();
    console.log(`[mail] RESEND_API_KEY is not set. To ${mail.to}: ${mail.subject}\n${mail.text}`);
    return { sent: false };
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM?.trim() || DEFAULT_MAIL_FROM,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend refused the mail (${response.status}): ${detail.slice(0, 300)}`);
  }
  return { sent: true };
}
