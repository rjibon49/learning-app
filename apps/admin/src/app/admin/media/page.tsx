'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Image, FileAudio, FileText, UploadCloud, Copy, Check, Trash2, Film, HardDrive } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getMediaAssets, uploadMedia, deleteMediaAsset, type MediaAsset } from '@/lib/api/media';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

function formatBytes(bytes?: number | null) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminMediaPage() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
    if (!selectedApp) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMediaAssets(selectedApp.id);
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media assets.');
    } finally {
      setLoading(false);
    }
  }, [selectedApp]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedApp) return;

    setUploading(true);
    try {
      const newAsset = await uploadMedia(file, selectedApp.id);
      setAssets((prev) => [newAsset, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    try {
      await deleteMediaAsset(id);
      setAssets((prev) => prev.filter(asset => asset.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete file.');
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'IMAGE': return <Image className="h-10 w-10 text-indigo-400" />;
      case 'AUDIO': return <FileAudio className="h-10 w-10 text-amber-400" />;
      case 'VIDEO': return <Film className="h-10 w-10 text-rose-400" />;
      case 'PDF': return <FileText className="h-10 w-10 text-emerald-400" />;
      default: return <HardDrive className="h-10 w-10 text-slate-400" />;
    }
  };

  if (isLoadingApps || !selectedApp) {
    return <LoadingState label="Loading environment..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Media Library — {selectedApp.name}</h1>
          <p className="text-sm text-slate-500">
            Upload images and audio for vocabulary. Images auto-convert to WebP.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,audio/*,application/pdf"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <UploadCloud className="h-4 w-4" />
            {uploading ? 'Uploading & Optimizing...' : 'Upload Media'}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading media assets..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadMedia} />
      ) : assets.length === 0 ? (
        <EmptyState
          title="No media uploaded yet"
          description={`Click "Upload Media" to add images or audio for ${selectedApp.level}.`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-colors">
              {/* Thumbnail Area */}
              <div className="relative flex aspect-square w-full items-center justify-center bg-slate-50 border-b border-slate-100 overflow-hidden">
                {asset.type === 'IMAGE' && asset.publicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.publicUrl} alt={asset.originalName || 'Image'} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  getFileIcon(asset.type)
                )}

                {/* Hover Action Buttons */}
                <div className="absolute inset-0 hidden flex-col items-center justify-center gap-2 bg-slate-900/60 group-hover:flex transition-all">
                  {asset.publicUrl && (
                    <button
                      onClick={() => copyToClipboard(asset.publicUrl!, asset.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    >
                      {copiedId === asset.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === asset.id ? 'Copied!' : 'Copy URL'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>

              {/* Details Area */}
              <div className="flex flex-col p-3 bg-white">
                <p className="truncate text-xs font-semibold text-slate-900" title={asset.originalName || asset.objectKey}>
                  {asset.originalName || 'unnamed_file'}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{asset.type}</span>
                  <span className="text-[10px] font-medium text-slate-500">{formatBytes(asset.fileSize)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}