/**
 * Privacy policy and terms of use for the learning apps, served as plain
 * HTML pages (the store listings and the app link here).
 *
 * Edit the text below and deploy to change them; bump UPDATED when you do.
 * The contact address comes from LEGAL_CONTACT_EMAIL.
 */
export const LEGAL_UPDATED = '21 November 2026';
const OPERATOR = 'Mochiflix';

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function page(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · ${OPERATOR}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #F5F6FA; color: #14161F; font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
  article { background: #fff; border-radius: 20px; padding: 28px 24px; box-shadow: 0 1px 2px rgba(20,22,31,.06); }
  h1 { font-size: 28px; line-height: 1.2; margin: 0 0 4px; }
  h2 { font-size: 19px; margin: 28px 0 8px; }
  p, li { color: #2B2F3D; }
  .muted { color: #5B6072; font-size: 14px; }
  a { color: #2747E0; }
  nav { margin-bottom: 16px; font-size: 14px; }
</style>
</head>
<body><main>
<nav><a href="privacy">Privacy policy</a> · <a href="terms">Terms of use</a></nav>
<article>${body}</article>
</main></body>
</html>`;
}

export function privacyPage(contactEmail: string) {
  const email = escape(contactEmail);
  return page(
    'Privacy policy',
    `
<h1>Privacy policy</h1>
<p class="muted">Last updated: ${LEGAL_UPDATED}</p>

<p>This policy explains what information ${OPERATOR} collects when you use our language learning apps (for example "German A1"), why we collect it, and the choices you have. Questions: <a href="mailto:${email}">${email}</a>.</p>

<h2>Information you give us</h2>
<ul>
  <li><strong>Account:</strong> your email address, display name and password. Passwords are stored only as a secure hash.</li>
  <li><strong>Support messages:</strong> anything you write to us by email.</li>
</ul>

<h2>Information created while you learn</h2>
<ul>
  <li>Lessons you finish, quiz answers and scores, words you review, streaks and other learning progress.</li>
  <li>Settings such as your explanation language and notification choices.</li>
</ul>

<h2>Information collected automatically</h2>
<ul>
  <li><strong>Technical data:</strong> app version, device type, operating system and basic error logs, so we can keep the service running and fix problems.</li>
  <li><strong>Analytics:</strong> we may use Google Analytics for Firebase to understand how the app is used (for example which screens are opened and which lessons are finished). We do not send your email or name to analytics.</li>
  <li><strong>Advertising:</strong> if the free version shows ads, they are delivered by Google AdMob. AdMob may use your device's advertising identifier and similar data to show and measure ads. Where the law requires it, we ask for your consent first. You can reset or limit the advertising identifier in your device settings.</li>
</ul>

<h2>How we use information</h2>
<ul>
  <li>To create your account, sign you in and keep it secure.</li>
  <li>To save your progress and show you the right lessons and reviews.</li>
  <li>To send messages you asked for, such as verification codes and password resets.</li>
  <li>To improve our content and the app, and to fix errors.</li>
  <li>To show ads in the free version, and to provide Premium if you buy it.</li>
</ul>
<p>We do not sell your personal information.</p>

<h2>Payments</h2>
<p>If you buy Premium, the payment is processed by Google Play or the Apple App Store. We receive confirmation of the purchase, not your card details.</p>

<h2>Sharing</h2>
<p>We share information only with service providers that help us run the apps (hosting, email delivery, analytics, advertising, app stores), only as much as they need, or when the law requires it.</p>

<h2>Storage and security</h2>
<p>Your data is stored on secured servers. We keep it while your account exists. When you delete your account, your personal data and learning progress are deleted; some records may be kept for a limited time where the law requires it.</p>

<h2>Your choices and rights</h2>
<ul>
  <li><strong>Delete your account:</strong> in the app under Settings → Delete account, or by writing to us.</li>
  <li>You can ask for a copy of your data or ask us to correct it.</li>
  <li>You can turn notifications off in the app or in your device settings.</li>
</ul>

<h2>Children</h2>
<p>Our apps are not directed at children under 13. If you believe a child has given us personal data, contact us and we will delete it.</p>

<h2>Changes</h2>
<p>If we change this policy, we update the date above and, for important changes, tell you in the app.</p>

<h2>Contact</h2>
<p>${OPERATOR} · <a href="mailto:${email}">${email}</a></p>
`,
  );
}

export function termsPage(contactEmail: string) {
  const email = escape(contactEmail);
  return page(
    'Terms of use',
    `
<h1>Terms of use</h1>
<p class="muted">Last updated: ${LEGAL_UPDATED}</p>

<p>These terms apply when you use the language learning apps of ${OPERATOR}. By creating an account or using the apps, you agree to them.</p>

<h2>Your account</h2>
<ul>
  <li>Give a valid email address and keep your password private. You are responsible for what happens in your account.</li>
  <li>One account per person. Do not share or sell accounts.</li>
  <li>You can delete your account at any time in the app (Settings → Delete account).</li>
</ul>

<h2>Using the apps</h2>
<ul>
  <li>The lessons, texts, audio, quizzes and other content are for your personal learning. Do not copy, publish or sell them.</li>
  <li>Do not misuse the service, for example by trying to break its security or overload it.</li>
</ul>

<h2>Premium</h2>
<p>Some features may need a paid Premium subscription. Prices and billing are shown in the app store before you buy. Subscriptions renew automatically unless you cancel them in Google Play or the App Store; refunds follow the store's rules.</p>

<h2>Ads</h2>
<p>The free version may show ads from third parties. We are not responsible for the content of external websites you open from an ad.</p>

<h2>Content and availability</h2>
<p>We work hard to make the content correct and helpful, but we cannot promise that it is free of mistakes, or that the apps are always available. Passing an exam depends on you; our exam practice does not guarantee a result.</p>

<h2>Ending use</h2>
<p>We may suspend accounts that break these terms. You may stop using the apps at any time.</p>

<h2>Changes</h2>
<p>We may update these terms. If we make important changes, we tell you in the app. Using the apps after a change means you accept the new terms.</p>

<h2>Contact</h2>
<p>${OPERATOR} · <a href="mailto:${email}">${email}</a></p>
`,
  );
}
