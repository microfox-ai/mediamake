import type { Mail } from './send';

/**
 * The sign-in mails: one layout, one button, and the same words as plain text.
 * Sentence case and short sentences, as the brand guide asks.
 */

const escape = (value: string) =>
  value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Layout {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  button: { label: string; url: string };
  footer: string;
}

function layout({ to, subject, heading, lines, button, footer }: Layout): Mail {
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1917;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:12px;border:1px solid #e7e2d9;">
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 24px;font-size:15px;font-weight:600;letter-spacing:0.02em;">MediaMake</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;">${escape(heading)}</h1>
                ${lines.map(line => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escape(line)}</p>`).join('\n                ')}
                <p style="margin:24px 0;">
                  <a href="${escape(button.url)}" style="display:inline-block;padding:12px 20px;background:#1c1917;color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;">${escape(button.label)}</a>
                </p>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#78716c;">If the button does not work, open this link:</p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${escape(button.url)}" style="color:#57534e;">${escape(button.url)}</a></p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#78716c;">${escape(footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const text = [heading, '', ...lines, '', `${button.label}: ${button.url}`, '', footer].join('\n');
  return { to, subject, html, text };
}

export function verifyEmailMail(to: string, url: string, { adding = false } = {}): Mail {
  return layout({
    to,
    subject: 'Confirm your email for MediaMake',
    heading: 'Confirm your email',
    lines: [
      adding
        ? 'Confirm this address to add it to your MediaMake account. You can then sign in with it.'
        : 'Confirm this address to finish making your MediaMake account.',
    ],
    button: { label: 'Confirm email', url },
    footer: 'The link works once, for 24 hours. If you did not ask for this, ignore this mail and nothing happens.',
  });
}

export function resetPasswordMail(to: string, url: string): Mail {
  return layout({
    to,
    subject: 'Reset your MediaMake password',
    heading: 'Reset your password',
    lines: ['Choose a new password for your MediaMake account. Your other browsers are signed out when you do.'],
    button: { label: 'Choose a new password', url },
    footer: 'The link works once, for 1 hour. If you did not ask for this, ignore this mail and your password stays as it is.',
  });
}

export function existingAccountMail(to: string, url: string): Mail {
  return layout({
    to,
    subject: 'You already have a MediaMake account',
    heading: 'You already have an account',
    lines: [
      'Someone tried to sign up to MediaMake with this address, which already has an account.',
      'If that was you, sign in as usual, or choose a new password here.',
    ],
    button: { label: 'Choose a new password', url },
    footer: 'The link works once, for 1 hour. If it was not you, ignore this mail and nothing changes.',
  });
}
