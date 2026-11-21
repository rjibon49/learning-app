'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, Save, ServerCog } from 'lucide-react';
import { getSettings, updateSetting, deleteSetting, type SystemSetting } from '@/lib/api/settings';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';
import { useConfirm, useToast } from '@/components/ui/feedback-provider';
import { LegalSettings } from '@/components/admin/legal-settings';

/**
 * Only the keys the API accepts (apps/api/src/settings/settings.schemas.ts).
 * Secrets (API keys, R2 credentials) must stay in server environment
 * variables — never in this table, which every Super Admin can read.
 */
type SettingDef = {
  key: string;
  label: string;
  help: string;
  kind: 'boolean' | 'integer' | 'locale';
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
};

const SETTINGS: SettingDef[] = [
  { key: 'MAINTENANCE_MODE', label: 'Maintenance mode', help: 'When on, apps show a maintenance screen.', kind: 'boolean' },
  { key: 'REGISTRATION_ENABLED', label: 'New registrations', help: 'Allow new learners to sign up.', kind: 'boolean' },
  { key: 'DEFAULT_LOCALE', label: 'Default app language', help: 'Locale code, e.g. en, bn, ja, pt-BR.', kind: 'locale', placeholder: 'en' },
  { key: 'DAILY_MINUTES_REQUIRED', label: 'Daily goal', help: 'Minutes of study that count as an active day.', kind: 'integer', min: 1, max: 240, unit: 'minutes' },
  { key: 'STREAK_REQUIRED_DAYS', label: 'Streak target', help: 'Days in a row needed to earn the streak reward.', kind: 'integer', min: 1, max: 365, unit: 'days' },
  { key: 'STREAK_REWARD_DAYS', label: 'Streak reward', help: 'Ad-free days given when the streak target is reached.', kind: 'integer', min: 0, max: 30, unit: 'days' },
  { key: 'SUBSCRIPTION_MONTHLY_USD_CENTS', label: 'Monthly price', help: 'In US cents: 499 = $4.99.', kind: 'integer', min: 1, max: 100000000, unit: 'cents' },
  { key: 'SUBSCRIPTION_YEARLY_USD_CENTS', label: 'Yearly price', help: 'In US cents: 3999 = $39.99.', kind: 'integer', min: 1, max: 100000000, unit: 'cents' },
];

function validate(def: SettingDef, value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter a value.';
  if (def.kind === 'boolean') return v === 'true' || v === 'false' ? null : 'Must be on or off.';
  if (def.kind === 'locale') return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(v) ? null : 'Use a locale code like en or pt-BR.';
  if (!/^\d+$/.test(v)) return 'Whole numbers only.';
  const n = Number(v);
  if (def.min !== undefined && n < def.min) return `Minimum is ${def.min}.`;
  if (def.max !== undefined && n > def.max) return `Maximum is ${def.max}.`;
  return null;
}

function money(cents: string): string | null {
  return /^\d+$/.test(cents) ? `$${(Number(cents) / 100).toFixed(2)}` : null;
}

export default function AdminSettingsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [saved, setSaved] = useState<Record<string, SystemSetting>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await getSettings();
      const byKey = Object.fromEntries(data.map((s) => [s.key, s]));
      setSaved(byKey);
      setDraft(Object.fromEntries(data.map((s) => [s.key, s.value])));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const save = async (def: SettingDef, value: string) => {
    const problem = validate(def, value);
    setErrors((e) => ({ ...e, [def.key]: problem ?? '' }));
    if (problem) return;

    setProcessingKey(def.key);
    try {
      await updateSetting(def.key, value.trim());
      await loadData();
      toast.success(`${def.label} saved.`);
    } catch (err) {
      setErrors((e) => ({ ...e, [def.key]: err instanceof Error ? err.message : 'Save failed' }));
    } finally {
      setProcessingKey(null);
    }
  };

  const reset = async (def: SettingDef) => {
    const ok = await confirm({
      title: `Reset "${def.label}"?`,
      message: 'The saved value is removed and the app falls back to its built-in default.',
      confirmLabel: 'Reset to default',
      tone: 'danger',
    });
    if (!ok) return;

    setProcessingKey(def.key);
    try {
      await deleteSetting(def.key);
      await loadData();
      setDraft((d) => {
        const next = { ...d };
        delete next[def.key];
        return next;
      });
      toast.success(`${def.label} reset to default.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setProcessingKey(null);
    }
  };

  if (loading) return <LoadingState label="Loading system settings..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => void loadData()} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <ServerCog className="h-6 w-6 text-indigo-600" />
          Global System Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Feature switches, rewards and prices. API keys and other secrets are set as server environment
          variables, not here.
        </p>
      </div>

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {SETTINGS.map((def) => {
          const current = saved[def.key];
          const value = draft[def.key] ?? '';
          const dirty = value !== (current?.value ?? '');
          const busy = processingKey === def.key;
          const error = errors[def.key];
          const inputId = `setting-${def.key}`;

          return (
            <div key={def.key} className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] sm:items-start">
              <div>
                <label htmlFor={inputId} className="text-sm font-bold text-slate-900">
                  {def.label}
                </label>
                <p className="mt-0.5 text-xs text-slate-500">{def.help}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">
                  {def.key} · {current ? `saved ${new Date(current.updatedAt).toLocaleString()}` : 'using default'}
                </p>
              </div>

              <div className="space-y-2">
                {def.kind === 'boolean' ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={value === 'true'}
                      disabled={busy}
                      onChange={(e) => void save(def, String(e.target.checked))}
                      className="h-4 w-4"
                    />
                    {value === 'true' ? 'On' : current ? 'Off' : 'Off (default)'}
                  </label>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        id={inputId}
                        inputMode={def.kind === 'integer' ? 'numeric' : 'text'}
                        value={value}
                        placeholder={def.placeholder ?? 'default'}
                        aria-invalid={Boolean(error)}
                        onChange={(e) => {
                          setDraft((d) => ({ ...d, [def.key]: e.target.value }));
                          if (error) setErrors((x) => ({ ...x, [def.key]: '' }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void save(def, value);
                        }}
                        className={`w-full rounded-md border p-2.5 pr-16 font-mono text-sm outline-none focus:ring-2 ${
                          error ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-indigo-200'
                        }`}
                      />
                      {def.unit && (
                        <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-400">{def.unit}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void save(def, value)}
                      disabled={!dirty || busy}
                      className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 text-xs font-bold text-white disabled:opacity-40"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {busy ? 'Saving' : 'Save'}
                    </button>
                  </div>
                )}

                {error ? (
                  <p className="text-xs font-medium text-rose-600">{error}</p>
                ) : def.unit === 'cents' && money(value) ? (
                  <p className="text-xs text-slate-500">= {money(value)}</p>
                ) : dirty && def.kind !== 'boolean' ? (
                  <p className="text-xs text-amber-700">Not saved yet — press Save or Enter.</p>
                ) : null}

                {current && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void reset(def)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset to default
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LegalSettings saved={saved} onChanged={loadData} />
    </div>
  );
}
