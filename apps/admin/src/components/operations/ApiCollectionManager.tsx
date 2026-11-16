"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

type Field = {
  key: string; label: string;
  kind?: "text" | "number" | "checkbox" | "textarea" | "json" | "select";
  required?: boolean; placeholder?: string; options?: string[]; initial?: string;
};
type ListResult = unknown[] | { data?: unknown[]; pagination?: { page: number; totalPages: number; total: number } };
export type CollectionConfig = {
  title: string; description: string; endpoint: string; fields: Field[];
  actions?: { label: string; suffix: string; method?: "POST" | "PATCH"; confirm?: boolean }[];
  canCreate?: boolean; canEdit?: boolean; editOmit?: string[];
};
const inputStyle = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100";
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function display(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value, null, 2);
}
function parseValue(value: string, field: Field): unknown {
  if (field.kind === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`${field.label}: enter a valid number`);
    return n;
  }
  if (field.kind === "json") {
    try { return JSON.parse(value); }
    catch { throw new Error(`${field.label}: JSON syntax is invalid`); }
  }
  if (field.kind === "checkbox") return value === "true";
  return value.trim();
}
function rowValue(field: Field, row: Record<string, unknown>, endpoint: string): unknown {
  if (endpoint.endsWith("/audiences") && field.key === "rules") return row.rulesJson;
  if (endpoint.endsWith("/notification-providers") && field.key === "settings") return row.settingsJson;
  if (endpoint.endsWith("/announcements")) {
    if (field.key === "promoCodeIds") {
      const links = Array.isArray(row.promotions) ? row.promotions : [];
      return links.map(link => record(link).promoCodeId).filter(x => typeof x === "string");
    }
    if (field.key === "translations") {
      return (Array.isArray(row.translations) ? row.translations : []).map(t => {
        const r = record(t);
        return { locale: r.locale, title: r.title, message: r.message, actionLabel: r.actionLabel ?? null };
      });
    }
    if (field.key === "placements") {
      return (Array.isArray(row.placements) ? row.placements : []).map(t => {
        const r = record(t);
        return { channel: r.channel, placementKey: r.placementKey, isEnabled: r.isEnabled !== false };
      });
    }
  }
  if (endpoint.endsWith("/notification-templates") && field.key === "parameters") return row.parametersJson;
  if (endpoint.endsWith("/notification-templates") && field.key === "translations") {
    return (Array.isArray(row.translations) ? row.translations : []).map(t => {
      const r = record(t);
      return { locale: r.locale, title: r.title ?? null, body: r.body };
    });
  }
  return row[field.key];
}
function initialForm(fields: Field[], endpoint: string, row?: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(fields.map(field => [field.key,
    row ? display(rowValue(field, row, endpoint)) : (field.initial ?? (field.kind === "checkbox" ? "false" : "")),
  ]));
}
export function ApiCollectionManager({ config }: { config: CollectionConfig }) {
  const { admin } = useAuth();
  const isAdmin = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";
  const isSuperAdmin = admin?.role === "SUPER_ADMIN";
  const requiresSuperAdmin = config.endpoint === "/admin/notification-providers";
  const mayWrite = isAdmin && (!requiresSuperAdmin || isSuperAdmin);
  const mayRunActions = isSuperAdmin;
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(config.fields, config.endpoint));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const endpoint = config.endpoint;
  const canCreate = config.canCreate !== false && mayWrite;
  const canEdit = config.canEdit !== false && mayWrite;

  // Fetch reactions happen only in async callbacks. Cleanup avoids stale page results.
  useEffect(() => {
    let live = true;
    const separator = endpoint.includes("?") ? "&" : "?";
    void apiRequest<ListResult>(`${endpoint}${separator}page=${page}&limit=20`)
      .then((result) => {
        if (!live) return;
        const list = Array.isArray(result) ? result : (result.data ?? []);
        setRows(list.map(record));
        setPages(Array.isArray(result) ? 1 : Math.max(1, result.pagination?.totalPages ?? 1));
        setTotal(Array.isArray(result) ? result.length : result.pagination?.total ?? null);
        setError("");
      })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : "Unable to load records"); });
    return () => { live = false; };
  }, [endpoint, page, revision]);

  const refresh = useCallback(() => setRevision((current) => current + 1), []);
  const visible = useMemo(() => rows.filter(row =>
    !search.trim() || JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase())), [rows, search]);

  function begin(row?: Record<string, unknown>) {
    setForm(initialForm(config.fields, config.endpoint, row));
    setEditingId(row ? String(row.id) : null);
    setShowForm(true);
    setError(""); setNotice("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !mayWrite) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const payload: Record<string, unknown> = {};
      for (const field of config.fields) {
        if (editingId && config.editOmit?.includes(field.key)) continue;
        const raw = form[field.key] ?? "";
        if (!raw.trim() && field.kind !== "checkbox") {
          if (field.required) throw new Error(`${field.label} is required`);
          continue;
        }
        payload[field.key] = parseValue(raw, field);
      }
      await apiRequest(`${endpoint}${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, {
        method: editingId ? "PATCH" : "POST", body: JSON.stringify(payload),
      });
      setShowForm(false); setEditingId(null); setForm(initialForm(config.fields, config.endpoint));
      setNotice("Saved successfully."); refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  }
  async function action(row: Record<string, unknown>, entry: NonNullable<CollectionConfig["actions"]>[number]) {
    if (!row.id || !mayRunActions) return;
    if (entry.confirm !== false && !window.confirm(`Confirm ${entry.label.toLowerCase()} for this record?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await apiRequest(`${endpoint}/${encodeURIComponent(String(row.id))}/${entry.suffix}`, { method: entry.method ?? "POST" });
      setNotice(`${entry.label} completed.`); refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Action failed"); }
    finally { setBusy(false); }
  }
  return (
    <main className="mx-auto max-w-[1500px] space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-indigo-600">Global Learning / Management</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{config.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{config.description}</p></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><RefreshCw className="h-4 w-4"/>Refresh</button>
          {canCreate && <button type="button" onClick={() => begin()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4"/>New</button>}
        </div>
      </header>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0"/>{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4 shrink-0"/>{notice}</div>}
      <div className={`grid items-start gap-5 ${showForm ? "xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]" : "grid-cols-1"}`}>
        {showForm && <section className="min-w-0 rounded-2xl border border-indigo-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">{editingId ? "Edit record" : "Create record"}</h2><p className="text-xs text-slate-500">Required fields are marked *</p></div><button type="button" aria-label="Close editor" disabled={busy} onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4"/></button></div>
          <form onSubmit={(e) => void save(e)} className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {config.fields.filter(f => !(editingId && config.editOmit?.includes(f.key))).map(field => <label key={field.key} className={`block min-w-0 space-y-1.5 text-sm ${field.kind === "json" || field.kind === "textarea" ? "sm:col-span-2 xl:col-span-1 2xl:col-span-2" : ""}`}>
              <span className="font-semibold text-slate-700">{field.label}{field.required && <span className="text-rose-600"> *</span>}</span>
              {field.kind === "json" || field.kind === "textarea" ?
                <textarea rows={field.kind === "json" ? 6 : 3} value={form[field.key] ?? ""} required={field.required} placeholder={field.placeholder} onChange={e=>setForm(v=>({...v,[field.key]:e.target.value}))} className={`${inputStyle} resize-y ${field.kind === "json" ? "font-mono text-xs" : ""}`}/> :
               field.kind === "select" ?
                <select value={form[field.key] ?? ""} required={field.required} onChange={e=>setForm(v=>({...v,[field.key]:e.target.value}))} className={inputStyle}><option value="">Select...</option>{(field.options ?? []).map(opt=><option key={opt} value={opt}>{opt.replaceAll("_", " ")}</option>)}</select> :
               field.kind === "checkbox" ?
                <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><input type="checkbox" checked={form[field.key] === "true"} onChange={e=>setForm(v=>({...v,[field.key]:String(e.target.checked)}))}/><span>{form[field.key] === "true" ? "Enabled" : "Disabled"}</span></span> :
                <input type={field.kind === "number" ? "number" : "text"} step={field.kind === "number" ? "1" : undefined} required={field.required} value={form[field.key] ?? ""} placeholder={field.placeholder} onChange={e=>setForm(v=>({...v,[field.key]:e.target.value}))} className={inputStyle}/>}
            </label>)}
            <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1 2xl:col-span-2"><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{busy ? "Saving..." : "Save record"}</button><button type="button" disabled={busy} onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium">Cancel</button></div>
          </form>
        </section>}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5"><div><h2 className="font-bold text-slate-900">Records</h2><p className="text-xs text-slate-500">{total === null ? "Paginated records" : `${total} total records`}</p></div><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input type="search" aria-label="Search loaded records" placeholder="Filter current page..." value={search} onChange={e=>setSearch(e.target.value)} className={`${inputStyle} pl-9`}/></div></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-2">{visible.map((row,i)=><article key={String(row.id ?? i)} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="break-words text-sm font-bold text-slate-900">{display(row.name ?? row.title ?? row.templateKey ?? row.segmentKey ?? row.slug ?? row.version ?? row.id) || "Untitled"}</h3>
            <p className="mt-1 truncate text-xs text-slate-500">ID: {display(row.id)}</p>
            {typeof row.status === "string" && <span className="mt-2 inline-block rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">{row.status}</span>}
            <div className="mt-4 flex flex-wrap gap-2">{canEdit && <button type="button" onClick={()=>begin(row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-indigo-300"><Pencil className="h-3.5 w-3.5"/>Edit</button>}
              {mayRunActions && config.actions?.map(a=><button key={a.suffix} disabled={busy} type="button" onClick={()=>void action(row,a)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-indigo-300 disabled:opacity-50">{a.label}</button>)}</div>
            <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-indigo-700">Details</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-xs text-slate-600">{JSON.stringify(row,null,2)}</pre></details>
          </article>)}{visible.length === 0 && <p className="col-span-full p-6 text-center text-sm text-slate-500">No records on this page.</p>}</div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4"><button disabled={busy||page<=1} type="button" onClick={()=>setPage(v=>v-1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Previous</button><span className="text-xs font-semibold text-slate-600">Page {page} / {pages}</span><button disabled={busy||page>=pages} type="button" onClick={()=>setPage(v=>v+1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Next<ChevronRight className="h-4 w-4"/></button></div>
        </section>
      </div>
    </main>
  );
}
