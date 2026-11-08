'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Save, Trash2, Plus, ServerCog } from 'lucide-react';
import { getSettings, updateSetting, deleteSetting, type SystemSetting } from '@/lib/api/settings';
import { LoadingState } from '@/components/feedback/state-views';

const PREDEFINED_KEYS = [
  'MAINTENANCE_MODE',
  'OPENAI_API_KEY',
  'CLOUDFلاRE_R2_ACCESS_KEY', // আপনার সঠিক কী থাকলে সেটি রাখবেন
  'CLOUDFLARE_R2_SECRET_KEY',
  'DEFAULT_USER_POINTS',
  'REFERRAL_REWARD_DAYS',
  'STREAK_REQUIRED_DAYS',
  'STREAK_REWARD_DAYS',
  'DAILY_MINUTES_REQUIRED',
  'AD_FREE_MONTHLY_PRICE',
  'AD_FREE_YEARLY_PRICE',
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState<string | null>(null);

  // Form State
  const [newKey, setNewKey] = useState(PREDEFINED_KEYS[0]);
  const [customKey, setCustomKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadData = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (key: string, value: string, desc?: string) => {
    if (!value.trim()) return alert('Value cannot be empty');
    setProcessingKey(key);
    try {
      await updateSetting(key, value, desc);
      await loadData();
      setNewValue('');
      setCustomKey('');
    } catch (err) {
      alert('Failed to save setting');
    } finally {
      setProcessingKey(null);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete the configuration for ${key}?`)) return;
    try {
      await deleteSetting(key);
      setSettings(settings.filter((s) => s.key !== key));
    } catch (err) {
      alert('Failed to delete setting');
    }
  };

  if (loading) return <LoadingState label="Loading System Settings..." />;

  const activeKey = newKey === 'CUSTOM' ? customKey : newKey;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ServerCog className="h-6 w-6 text-indigo-600" />
          Global System Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage environment variables, feature flags, referral rewards, and global configuration.
        </p>
      </div>

      {/* Add New Setting Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Plus className="h-5 w-5 text-indigo-500" /> Add or Update Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Config Key</label>
            <select
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2.5 text-sm bg-slate-50 focus:border-indigo-500 focus:outline-none mb-3 font-medium"
            >
              {PREDEFINED_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
              <option value="CUSTOM">-- Custom Key --</option>
            </select>
            {newKey === 'CUSTOM' && (
              <input
                type="text"
                placeholder="e.g. STRIPE_SECRET_KEY"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                className="w-full rounded-md border border-slate-300 p-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              placeholder="What is this used for?"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full rounded-md border border-slate-300 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Configuration Value</label>
          <textarea
            rows={3}
            placeholder="Enter the value (e.g. 7, true, sk_test_12345...)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-full rounded-md border border-slate-300 p-3 text-sm font-mono focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => handleSave(activeKey, newValue, newDesc)}
            disabled={!activeKey || !newValue.trim() || processingKey === activeKey}
            className="rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <Save className="h-4 w-4" /> 
            {processingKey === activeKey ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Existing Settings List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Settings className="h-5 w-5 text-slate-500" /> Active Configurations
        </h2>
        
        {settings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-sm font-medium text-slate-500">
            No system settings configured yet. Add your first key above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {settings.map((setting) => (
              <div key={setting.id} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 group">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-mono text-sm font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded inline-block">
                      {setting.key}
                    </div>
                    {setting.description && (
                      <p className="mt-2 text-xs font-medium text-slate-500">{setting.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(setting.key)}
                    className="text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 p-2 rounded transition-colors"
                    title="Delete Key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4">
                  <textarea
                    defaultValue={setting.value}
                    onBlur={(e) => {
                      if (e.target.value !== setting.value) {
                        handleSave(setting.key, e.target.value, setting.description);
                      }
                    }}
                    className="w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-700 focus:bg-white focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    rows={setting.value.length > 60 ? 2 : 1}
                  />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    Click outside to auto-save changes
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}