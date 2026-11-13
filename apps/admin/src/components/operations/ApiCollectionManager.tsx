'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/api/client';

type Field = { key: string; label: string; kind?: 'text' | 'number' | 'checkbox' | 'textarea' | 'json'; required?: boolean; placeholder?: string };
type ListResult = unknown[] | { data?: unknown[]; pagination?: { page: number; totalPages: number; total: number } };
export type CollectionConfig = {
  title: string; description: string; endpoint: string; fields: Field[];
  actions?: { label: string; suffix: string; method?: 'POST' | 'PATCH'; confirm?: boolean }[];
  canCreate?: boolean; canEdit?: boolean;
};
function record(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
function stringify(v: unknown) { if (typeof v === 'string') return v; if (v == null) return ''; return JSON.stringify(v, null, 2); }
function normalize(input: string, field: Field): unknown {
  if (field.kind === 'number') { const n = Number(input); if (!Number.isFinite(n)) throw new Error(`${field.label}: invalid number`); return n; }
  if (field.kind === 'json') { try { return JSON.parse(input); } catch { throw new Error(`${field.label}: invalid JSON`); } }
  if (field.kind === 'checkbox') return input === 'true';
  return input;
}
export function ApiCollectionManager({ config }: { config: CollectionConfig }) {
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const separator = config.endpoint.includes('?') ? '&' : '?';
      const result = await apiRequest<ListResult>(`${config.endpoint}${separator}page=${page}&limit=20`);
      setRecords((Array.isArray(result) ? result : result.data ?? []).map(record));
      setTotalPages(Array.isArray(result) ? 1 : (result.pagination?.totalPages ?? 1));
      setMessage('');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Request failed'); }
    finally { setBusy(false); }
  }, [config.endpoint, page]);
  useEffect(() => { void refresh(); }, [refresh]);
  function begin(row?: Record<string, unknown>) {
    const value: Record<string, string> = {};
    for (const field of config.fields) {
      value[field.key] = row ? stringify(row[field.key]) : field.kind === 'checkbox' ? 'false' : field.kind === 'json' ? '[]' : '';
    }
    setEditing(row ? String(row.id) : null); setForm(value); setMessage('');
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      for (const field of config.fields) {
        const raw = form[field.key] ?? '';
        if (!raw.trim() && !field.required) continue;
        body[field.key] = normalize(raw, field);
      }
      await apiRequest(`${config.endpoint}${editing ? `/${encodeURIComponent(editing)}` : ''}`, {
        method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body),
      });
      setMessage('Saved'); setEditing(null); setForm({}); await refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }
  async function action(row: Record<string, unknown>, name: string, suffix: string, method: 'POST'|'PATCH', confirm: boolean) {
    if (confirm && !window.confirm(`${name}: are you sure?`)) return;
    setBusy(true);
    try { await apiRequest(`${config.endpoint}/${encodeURIComponent(String(row.id))}/${suffix}`, { method }); await refresh(); setMessage(`${name} requested`); }
    catch(e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  }
  const visible = records.filter(r => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()));
  return <div className="mx-auto max-w-[1600px] space-y-5 p-4">
    <div><h1 className="text-2xl font-bold">{config.title}</h1><p className="text-sm text-slate-500">{config.description}</p></div>
    {message && <p role="status" className="rounded border px-3 py-2 text-sm">{message}</p>}
    <div className="grid gap-5 lg:grid-cols-[350px_minmax(0,1fr)]">
      <section className="rounded-xl border bg-white p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{editing ? 'Edit' : 'Create'}</h2><button type="button" onClick={() => begin()} className="rounded border px-3 py-1 text-sm">New</button></div>
        {config.canCreate !== false && <form onSubmit={e => void save(e)} className="space-y-3">
          {config.fields.map(f => <label key={f.key} className="block text-sm"><span className="mb-1 block font-medium">{f.label}</span>
            {f.kind === 'textarea' || f.kind === 'json' ?
              <textarea rows={f.kind === 'json' ? 5 : 3} className="w-full rounded border p-2 font-mono text-xs" required={f.required} placeholder={f.placeholder} value={form[f.key] ?? ''} onChange={e => setForm(v => ({...v,[f.key]:e.target.value}))}/> :
              f.kind === 'checkbox' ?
              <input type="checkbox" checked={form[f.key] === 'true'} onChange={e => setForm(v => ({...v,[f.key]:String(e.target.checked)}))}/> :
              <input className="w-full rounded border p-2" type={f.kind === 'number' ? 'number' : 'text'} required={f.required} placeholder={f.placeholder} value={form[f.key] ?? ''} onChange={e => setForm(v => ({...v,[f.key]:e.target.value}))}/>}
            </label>)}
          <button type="submit" disabled={busy} className="rounded bg-indigo-700 px-4 py-2 text-white disabled:opacity-50">{busy?'Saving...':'Save'}</button>
        </form>}
      </section>
      <section className="min-w-0 rounded-xl border bg-white p-4">
        <div className="mb-4 flex gap-2"><input aria-label="Search current page" placeholder="Search current page" className="min-w-0 flex-1 rounded border p-2 text-sm" value={filter} onChange={e=>setFilter(e.target.value)}/><button className="rounded border px-3" onClick={()=>void refresh()}>Refresh</button></div>
        <div className="space-y-3">{visible.map((row,i)=><article className="rounded border p-3" key={String(row.id ?? i)}>
          <div className="text-sm font-semibold">{stringify(row.name ?? row.title ?? row.templateKey ?? row.segmentKey ?? row.version ?? row.id)}</div>
          <div className="mt-1 break-all text-xs text-slate-500">ID: {stringify(row.id)}</div>
          <div className="mt-2 flex flex-wrap gap-2">{config.canEdit !== false && <button type="button" className="rounded border px-3 py-1 text-xs" onClick={()=>begin(row)}>Edit</button>}
          {config.actions?.map(a=><button key={a.suffix} className="rounded border px-3 py-1 text-xs" disabled={busy} onClick={()=>void action(row,a.label,a.suffix,a.method??'POST',a.confirm??true)}>{a.label}</button>)}</div>
          <details className="mt-2"><summary className="cursor-pointer text-xs text-indigo-700">Details</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(row, null, 2)}</pre></details>
        </article>)} {!busy && !visible.length && <p className="text-sm text-slate-500">No records found</p>}</div>
        <div className="mt-4 flex items-center gap-3"><button disabled={page===1||busy} onClick={()=>setPage(v=>v-1)} className="rounded border px-3 py-1">Previous</button><span className="text-sm">{page} / {totalPages}</span><button disabled={page>=totalPages||busy} onClick={()=>setPage(v=>v+1)} className="rounded border px-3 py-1">Next</button></div>
      </section>
    </div>
  </div>;
}
