'use client';
import { useEffect, useState } from 'react';

type Announcement = { id:string; title:string; message:string; imageUrl?:string|null; actionValue?:string|null; actionLabel?:string|null; actionType?:string|null; isDismissible:boolean };
/** This component renders only the PUBLIC contextual delivery endpoint. */
export function PublicAnnouncements({ apiBase, placementKey, locale = 'en', platform = 'WEB' }: {
  apiBase: string; placementKey: string; locale?: string; platform?: 'WEB'|'ANDROID'|'IOS';
}) {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({ channel: 'WEBSITE_BANNER', placementKey, locale, platform });
    fetch(`${apiBase.replace(/\/$/,'')}/announcements/delivery?${params}`, { signal: abort.signal, cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Announcement API failed'); return r.json() as Promise<{ data: Announcement[] }> })
      .then(r => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]));
    return () => abort.abort();
  }, [apiBase, placementKey, locale, platform]);
  return <div aria-label="Announcements" className="space-y-3">{rows.filter(r => !dismissed.includes(r.id)).map(item =>
    <section key={item.id} className="relative rounded-lg border p-4" aria-label={item.title}>
      {item.isDismissible && <button type="button" aria-label={`Dismiss ${item.title}`} onClick={()=>setDismissed(v=>[...v,item.id])} className="absolute right-2 top-2 rounded border px-2">×</button>}
      <h2 className="pr-8 font-semibold">{item.title}</h2><p className="my-2 text-sm">{item.message}</p>
      {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" className="max-h-48 max-w-full object-contain"/>}
      {item.actionValue && ((item.actionType === 'INTERNAL_PATH' && item.actionValue.startsWith('/') && !item.actionValue.startsWith('//')) || (item.actionType === 'EXTERNAL_URL' && item.actionValue.startsWith('https://'))) &&
        <a href={item.actionValue} rel="noopener noreferrer" className="text-sm font-medium underline">{item.actionLabel || 'Learn more'}</a>}
    </section>)}</div>;
}
