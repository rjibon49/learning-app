'use client';

import React, { useEffect, useState } from 'react';
import { DollarSign, Plus, Trash2, Edit3, X, CheckCircle, XCircle } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getAdsConfigs, createAdConfig, updateAdConfig, deleteAdConfig, type AdConfig, type AdProvider } from '@/lib/api/ads';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminAdsPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [adsConfigs, setAdsConfigs] = useState<AdConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AdConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [provider, setProvider] = useState<AdProvider>('ADMOB');
  const [platform, setPlatform] = useState('android');
  const [appAdId, setAppAdId] = useState('');
  const [bannerAdUnitId, setBannerAdUnitId] = useState('');
  const [interstitialAdUnitId, setInterstitialAdUnitId] = useState('');
  const [rewardedAdUnitId, setRewardedAdUnitId] = useState('');
  const [nativeAdUnitId, setNativeAdUnitId] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (selectedApp) loadAds();
  }, [selectedApp]);

  const loadAds = async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const data = await getAdsConfigs(selectedApp.id);
      setAdsConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ad configurations');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingConfig(null);
    setProvider('ADMOB');
    setPlatform('android');
    setAppAdId('');
    setBannerAdUnitId('');
    setInterstitialAdUnitId('');
    setRewardedAdUnitId('');
    setNativeAdUnitId('');
    setIsEnabled(true);
    setIsModalOpen(true);
  };

  const openEditModal = (config: AdConfig) => {
    setEditingConfig(config);
    setProvider(config.provider);
    setPlatform(config.platform);
    setAppAdId(config.appAdId || '');
    setBannerAdUnitId(config.bannerAdUnitId || '');
    setInterstitialAdUnitId(config.interstitialAdUnitId || '');
    setRewardedAdUnitId(config.rewardedAdUnitId || '');
    setNativeAdUnitId(config.nativeAdUnitId || '');
    setIsEnabled(config.isEnabled);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setSubmitting(true);

    const payload = {
      appId: selectedApp.id,
      provider,
      platform,
      appAdId: appAdId.trim() || null,
      bannerAdUnitId: bannerAdUnitId.trim() || null,
      interstitialAdUnitId: interstitialAdUnitId.trim() || null,
      rewardedAdUnitId: rewardedAdUnitId.trim() || null,
      nativeAdUnitId: nativeAdUnitId.trim() || null,
      isEnabled,
    };

    try {
      if (editingConfig) {
        await updateAdConfig(editingConfig.id, payload);
      } else {
        await createAdConfig(payload);
      }
      await loadAds();
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed to save ad configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad configuration?')) return;
    try {
      await deleteAdConfig(id);
      setAdsConfigs(adsConfigs.filter(a => a.id !== id));
    } catch (err) {
      alert('Failed to delete ad configuration');
    }
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading..." />;
  if (error) return <ErrorState message={error} onRetry={loadAds} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-indigo-600" /> Ads Management (AdMob) — {selectedApp.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure banner, interstitial, and rewarded ad unit IDs for mobile apps.</p>
        </div>
        <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> Add Ad Config
        </button>
      </div>

      {adsConfigs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No ad configurations found for this app. Click "Add Ad Config" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adsConfigs.map((config) => (
            <div key={config.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-lg">{config.provider}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">{config.platform}</span>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  config.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {config.isEnabled ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {config.isEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono">
                <div><span className="text-slate-400">App ID:</span> {config.appAdId || 'Not Set'}</div>
                <div><span className="text-slate-400">Banner:</span> {config.bannerAdUnitId || 'Not Set'}</div>
                <div><span className="text-slate-400">Interstitial:</span> {config.interstitialAdUnitId || 'Not Set'}</div>
                <div><span className="text-slate-400">Rewarded:</span> {config.rewardedAdUnitId || 'Not Set'}</div>
                <div><span className="text-slate-400">Native:</span> {config.nativeAdUnitId || 'Not Set'}</div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => openEditModal(config)} className="p-2 text-slate-400 hover:text-indigo-600 rounded border border-slate-200">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(config.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded border border-slate-200">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editingConfig ? 'Edit Ad Config' : 'Create Ad Config'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Provider</label>
                  <select value={provider} onChange={(e) => setProvider(e.target.value as AdProvider)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm">
                    <option value="ADMOB">AdMob</option>
                    <option value="FACEBOOK">Facebook Audience</option>
                    <option value="STARTAPP">StartApp</option>
                    <option value="UNITY">Unity Ads</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Platform</label>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm">
                    <option value="android">Android</option>
                    <option value="ios">iOS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">App Ad ID (Optional)</label>
                <input type="text" value={appAdId} onChange={(e) => setAppAdId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm font-mono" placeholder="ca-app-pub-xxxxxxxx~xxxxxxxx" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Banner Unit ID</label>
                  <input type="text" value={bannerAdUnitId} onChange={(e) => setBannerAdUnitId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm font-mono" placeholder="ca-app-pub-..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Interstitial Unit ID</label>
                  <input type="text" value={interstitialAdUnitId} onChange={(e) => setInterstitialAdUnitId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm font-mono" placeholder="ca-app-pub-..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Rewarded Unit ID</label>
                  <input type="text" value={rewardedAdUnitId} onChange={(e) => setRewardedAdUnitId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm font-mono" placeholder="ca-app-pub-..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Native Unit ID</label>
                  <input type="text" value={nativeAdUnitId} onChange={(e) => setNativeAdUnitId(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm font-mono" placeholder="ca-app-pub-..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                <select value={isEnabled ? 'true' : 'false'} onChange={(e) => setIsEnabled(e.target.value === 'true')} className="w-full rounded-md border border-slate-300 p-2.5 text-sm">
                  <option value="true">Enabled (Show Ads)</option>
                  <option value="false">Disabled (Hide Ads)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500">
                  {submitting ? 'Saving...' : editingConfig ? 'Save Changes' : 'Create Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}