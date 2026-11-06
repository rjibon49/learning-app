'use client';

import React, { useEffect, useState } from 'react';
import { X, Image as ImageIcon, FileAudio, Search } from 'lucide-react';
import { getMediaAssets, type MediaAsset, type MediaType } from '@/lib/api/media';

interface MediaPickerModalProps {
  appId: string;
  allowedTypes?: MediaType[];
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}

export function MediaPickerModal({ appId, allowedTypes, onSelect, onClose }: MediaPickerModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAssets();
  }, [appId]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const data = await getMediaAssets(appId);
      setAssets(data);
    } catch (err) {
      console.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(a => {
    if (allowedTypes && !allowedTypes.includes(a.type)) return false;
    if (search && !a.originalName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Select Media from Library</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by file name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {loading ? (
            <div className="text-center py-10 text-slate-500 text-sm">Loading media...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">No matching media found in library.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => onSelect(asset)}
                  className="group relative flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden cursor-pointer hover:border-indigo-500 hover:ring-2 hover:ring-indigo-200 transition-all"
                >
                  <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                    {asset.type === 'IMAGE' && asset.publicUrl ? (
                      <img src={asset.publicUrl} alt={asset.originalName || ''} className="h-full w-full object-cover" />
                    ) : asset.type === 'AUDIO' ? (
                      <FileAudio className="h-8 w-8 text-amber-500" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <div className="p-2 text-[10px] font-medium text-slate-700 truncate text-center bg-white border-t border-slate-100">
                    {asset.originalName || asset.objectKey}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}