/**
 * Privacy policy and terms of use for the learning apps.
 *
 * The texts are Markdown with placeholders. Super Admins edit everything in
 * the CMS (Settings → Legal pages): company name, contact email, website,
 * address, and — if they want — the whole text. Without a saved text the
 * defaults below are used, filled in with the company details.
 *
 * Placeholders: {{company}} {{email}} {{website}} {{address}} {{updated}} {{app}}
 */

export type LegalContext = {
  company: string;
  email: string;
  website: string;
  address: string;
  updated: string;
  app: string;
};

export const DEFAULT_PRIVACY_MD = `# Privacy policy

Last updated: {{updated}}

This policy explains what information {{company}} ("we") collects when you use our language learning apps (for example "{{app}}"), why we collect it, and the choices you have. Questions: {{email}}.

## Information you give us

- **Account:** your email address, display name and password. Passwords are stored only as a secure hash.
- **Support messages:** anything you write to us by email.

## Information created while you learn

- Lessons you finish, quiz answers and scores, words you review, streaks and other learning progress.
- Settings such as your explanation language and notification choices.

## Information collected automatically

- **Technical data:** app version, device type, operating system and basic error logs, so we can keep the service running and fix problems.
- **Analytics:** we use Google Analytics for Firebase to understand how the app is used (for example which screens are opened and which lessons are finished). We do not send your email or name to analytics.
- **Advertising:** the app is free and shows ads delivered by Google AdMob. AdMob may use your device's advertising identifier and similar data to show and measure ads. Where the law requires it, we ask for your consent first. You can reset or limit the advertising identifier in your device settings.

## How we use information

- To create your account, sign you in and keep it secure.
- To save your progress and show you the right lessons and reviews.
- To send messages you asked for, such as verification codes and password resets.
- To improve our content and the app, and to fix errors.
- To show ads in the app.

We do not sell your personal information.

## Sharing

We share information only with service providers that help us run the apps (hosting, email delivery, analytics, advertising), only as much as they need, or when the law requires it.

## Storage and security

Your data is stored on secured servers. We keep it while your account exists. When you delete your account, your personal data and learning progress are deleted; some records may be kept for a limited time where the law requires it.

## Your choices and rights

- **Delete your account:** in the app under Settings → Delete account, or by writing to {{email}}.
- You can ask for a copy of your data or ask us to correct it.
- You can turn notifications off in the app or in your device settings.

## Children

Our apps are not directed at children under 13. If you believe a child has given us personal data, contact us and we will delete it.

## Changes

If we change this policy, we update the date above and, for important changes, tell you in the app.

## Contact

{{company}}
{{address}}
Email: {{email}}
Website: {{website}}
`;

export const DEFAULT_TERMS_MD = `# Terms of use

Last updated: {{updated}}

These terms apply when you use the language learning apps of {{company}} (for example "{{app}}"). By creating an account or using the apps, you agree to them.

## Your account

- Give a valid email address and keep your password private. You are responsible for what happens in your account.
- One account per person. Do not share or sell accounts.
- You can delete your account at any time in the app (Settings → Delete account).

## Using the apps

- The lessons, texts, audio, quizzes and other content are for your personal learning. Do not copy, publish or sell them.
- Do not misuse the service, for example by trying to break its security or overload it.

## Free with ads

The app is free to use. It shows ads from third parties, for example Google AdMob. We are not responsible for the content of external websites you open from an ad.

## Content and availability

We work hard to make the content correct and helpful, but we cannot promise that it is free of mistakes, or that the apps are always available. Passing an exam depends on you; our exam practice does not guarantee a result.

## Ending use

We may suspend accounts that break these terms. You may stop using the apps at any time.

## Changes

We may update these terms. If we make important changes, we tell you in the app. Using the apps after a change means you accept the new terms.

## Contact

{{company}}
{{address}}
Email: {{email}}
Website: {{website}}
`;

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function fill(markdown: string, ctx: LegalContext) {
  return markdown.replace(/\{\{\s*(company|email|website|address|updated|app)\s*\}\}/g, (_m, key: keyof LegalContext) => ctx[key] ?? '');
}

/** Inline Markdown on already escaped text: **bold**, [text](url), bare emails and links. */
function inline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>')
    .replace(/(^|[\s(])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, '$1<a href="mailto:$2">$2</a>');
}

/**
 * A small, safe Markdown renderer: headings (#, ##, ###), bullet lists (- or *),
 * numbered lists, paragraphs (single line breaks kept). All text is escaped
 * first, so no HTML from the CMS reaches the page.
 */
export function renderMarkdown(markdown: string) {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };

  for (const raw of escape(markdown.replace(/\r\n?/g, '\n')).split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.+)$/.exec(line);

    if (!line.trim()) {
      flushPara();
      closeList();
    } else if (heading) {
      flushPara();
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      flushPara();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
    } else {
      closeList();
      para.push(line.trim());
    }
  }
  flushPara();
  closeList();
  return out.join('\n');
}

export function legalPage(title: string, markdown: string, ctx: LegalContext) {
  const body = renderMarkdown(fill(markdown, ctx))
    // Lines left empty by unset placeholders (e.g. no address).
    .replace(/(<br>){2,}/g, '<br>')
    .replace(/<p><br>|<br><\/p>/g, (m) => (m.startsWith('<p>') ? '<p>' : '</p>'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · ${escape(ctx.company)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #F5F6FA; color: #14161F; font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
  article { background: #fff; border-radius: 20px; padding: 28px 24px; box-shadow: 0 1px 2px rgba(20,22,31,.06); }
  h1 { font-size: 28px; line-height: 1.2; margin: 0 0 8px; }
  h2 { font-size: 19px; margin: 28px 0 8px; }
  h3 { font-size: 16px; margin: 20px 0 6px; }
  p, li { color: #2B2F3D; }
  a { color: #2747E0; }
  nav { margin-bottom: 16px; font-size: 14px; }
</style>
</head>
<body><main>
<nav><a href="privacy">Privacy policy</a> · <a href="terms">Terms of use</a></nav>
<article>
${body}
</article>
</main></body>
</html>`;
}
