'use client';

import React, { useState } from 'react';
import { ExternalLink, FileText, RotateCcw, Save, Wand2 } from 'lucide-react';

import { deleteSetting, getLegalDefaults, updateSetting, type SystemSetting } from '@/lib/api/settings';
import { useConfirm, useToast } from '@/components/ui/feedback-provider';

type Field = {
  key: string;
  label: string;
  help: string;
  placeholder: string;
  check?: (value: string) => string | null;
};

const FIELDS: Field[] = [
  {
    key: 'LEGAL_COMPANY_NAME',
    label: 'Company / developer name',
    help: 'Exactly as in your Google Play developer account.',
    placeholder: 'Visual Sage Agency',
  },
  {
    key: 'LEGAL_CONTACT_EMAIL',
    label: 'Contact email',
    help: 'Shown on both pages; users write here about privacy and account deletion.',
    placeholder: 'support@visualsage.agency',
    check: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address.'),
  },
  {
    key: 'LEGAL_WEBSITE',
    label: 'Website',
    help: 'Full address, starting with https://',
    placeholder: 'https://visualsage.agency',
    check: (v) => (/^https?:\/\/\S+\.\S+$/.test(v) ? null : 'Enter a full URL starting with https://'),
  },
  {
    key: 'LEGAL_ADDRESS',
    label: 'Postal address (optional)',
    help: 'Some stores and countries ask for it. Leave empty to hide.',
    placeholder: 'Street, City, Country',
  },
  {
    key: 'LEGAL_APP_NAME',
    label: 'App name in the texts',
    help: 'Used where the text says {{app}}.',
    placeholder: 'German A1',
  },
];

const TEXTS = [
  { key: 'PRIVACY_POLICY_TEXT', label: 'Privacy policy text', path: 'privacy', defaultKey: 'privacy' as const },
  { key: 'TERMS_OF_USE_TEXT', label: 'Terms of use text', path: 'terms', defaultKey: 'terms' as const },
];

/** Legal pages: company details and the editable Markdown texts. */
export function LegalSettings({
  saved,
  onChanged,
}: {
  saved: Record<string, SystemSetting>;
  onChanged: () => Promise<void>;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const valueOf = (key: string) => draft[key] ?? saved[key]?.value ?? '';

  const save = async (key: string, label: string, check?: (v: string) => string | null) => {
    const value = valueOf(key).trim();
    const problem = !value ? 'Enter a value (or use Reset).' : check?.(value) ?? null;
    setErrors((e) => ({ ...e, [key]: problem ?? '' }));
    if (problem) return;
    setBusy(key);
    try {
      await updateSetting(key, value);
      await onChanged();
      setDraft((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      toast.success(`${label} saved.`);
    } catch (err) {
      setErrors((e) => ({ ...e, [key]: err instanceof Error ? err.message : 'Save failed' }));
    } finally {
      setBusy(null);
    }
  };

  const reset = async (key: string, label: string) => {
    const ok = await confirm({
      title: `Reset "${label}"?`,
      message: 'The saved value is removed and the page uses the built-in default again.',
      confirmLabel: 'Reset to default',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(key);
    try {
      await deleteSetting(key);
      await onChanged();
      setDraft((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      toast.success(`${label} reset to default.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusy(null);
    }
  };

  const loadDefault = async (key: string, which: 'privacy' | 'terms') => {
    if (valueOf(key).trim()) {
      const ok = await confirm({
        title: 'Replace the text in the editor?',
        message: 'The built-in default text is put into the editor. Nothing is saved until you press Save.',
        confirmLabel: 'Replace',
      });
      if (!ok) return;
    }
    try {
      const defaults = await getLegalDefaults();
      setDraft((d) => ({ ...d, [key]: defaults[which] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load the default text');
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <FileText className="h-5 w-5 text-indigo-600" />
          Legal pages
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Privacy policy and terms of use for the apps and the store listings. Public links:{' '}
          <code className="rounded bg-slate-100 px-1">…/api/legal/privacy</code> and{' '}
          <code className="rounded bg-slate-100 px-1">…/api/legal/terms</code> on the API domain. Without your own text, a
          built-in text is used with the details below.
        </p>
      </div>

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {FIELDS.map((f) => {
          const value = valueOf(f.key);
          const current = saved[f.key];
          const dirty = value !== (current?.value ?? '');
          const error = errors[f.key];
          const id = `legal-${f.key}`;
          return (
            <div key={f.key} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] sm:items-start">
              <div>
                <label htmlFor={id} className="text-sm font-bold text-slate-900">{f.label}</label>
                <p className="mt-0.5 text-xs text-slate-500">{f.help}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  {f.key} · {current ? `saved ${new Date(current.updatedAt).toLocaleString()}` : 'using default'}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    id={id}
                    value={value}
                    placeholder={f.placeholder}
                    aria-invalid={Boolean(error)}
                    onChange={(e) => {
                      setDraft((d) => ({ ...d, [f.key]: e.target.value }));
                      if (error) setErrors((x) => ({ ...x, [f.key]: '' }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void save(f.key, f.label, f.check);
                    }}
                    className={`w-full flex-1 rounded-md border p-2.5 text-sm outline-none focus:ring-2 ${
                      error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => void save(f.key, f.label, f.check)}
                    disabled={!dirty || busy === f.key}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {busy === f.key ? 'Saving' : 'Save'}
                  </button>
                </div>
                {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
                {current ? (
                  <button
                    type="button"
                    disabled={busy === f.key}
                    onClick={() => void reset(f.key, f.label)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset to default
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {TEXTS.map((t) => {
        const value = valueOf(t.key);
        const current = saved[t.key];
        const dirty = value !== (current?.value ?? '');
        const error = errors[t.key];
        const id = `legal-${t.key}`;
        return (
          <div key={t.key} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <label htmlFor={id} className="text-sm font-bold text-slate-900">{t.label}</label>
                <p className="mt-0.5 text-xs text-slate-500">
                  Markdown: <code># Title</code>, <code>## Heading</code>, <code>- list item</code>, <code>**bold**</code>,{' '}
                  <code>[link](https://…)</code>. Placeholders: <code>{'{{company}}'}</code> <code>{'{{email}}'}</code>{' '}
                  <code>{'{{website}}'}</code> <code>{'{{address}}'}</code> <code>{'{{app}}'}</code> <code>{'{{updated}}'}</code>
                </p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  {t.key} · {current ? `saved ${new Date(current.updatedAt).toLocaleString()}` : 'using the built-in text'}
                </p>
              </div>
              <a
                href={`/api/backend/legal/${t.path}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View live page
              </a>
            </div>

            <textarea
              id={id}
              value={value}
              rows={14}
              placeholder="Empty: the built-in text is used. Press “Start from default text” to edit it."
              aria-invalid={Boolean(error)}
              onChange={(e) => {
                setDraft((d) => ({ ...d, [t.key]: e.target.value }));
                if (error) setErrors((x) => ({ ...x, [t.key]: '' }));
              }}
              className={`w-full rounded-md border p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 ${
                error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'
              }`}
            />
            {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
            {dirty ? <p className="text-xs text-amber-700">Not saved yet.</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void save(t.key, t.label)}
                disabled={!dirty || busy === t.key}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                {busy === t.key ? 'Saving' : 'Save text'}
              </button>
              <button
                type="button"
                onClick={() => void loadDefault(t.key, t.defaultKey)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Wand2 className="h-3.5 w-3.5" /> Start from default text
              </button>
              {current ? (
                <button
                  type="button"
                  disabled={busy === t.key}
                  onClick={() => void reset(t.key, t.label)}
                  className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-slate-500 hover:text-rose-600"
                >
                  <RotateCcw className="h-3 w-3" /> Reset to built-in text
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
