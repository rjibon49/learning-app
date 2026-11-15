"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Bell, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Globe2, Loader2, Megaphone, Pencil, Plus, RefreshCw, Save, Search, ShieldAlert, Trash2, X } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";

type Translation = { locale: string; title: string; message: string; actionLabel?: string | null };
type Placement = { channel: "WEBSITE_BANNER" | "IN_APP" | "NOTIFICATION_BELL"; placementKey: string; isEnabled: boolean };
type Audience = { id: string; name: string; segmentKey: string; isActive: boolean };
type Announcement = {
  id: string; slug: string; kind: string; purpose: string; status: string; priority: number;
  isDismissible: boolean; startsAt: string | null; endsAt: string | null;
  actionType: "INTERNAL_PATH" | "EXTERNAL_URL" | null; actionValue: string | null;
  imageAssetId?: string | null;
  translations: Array<Translation & { id?: string }>;
  placements: Placement[];
  promotions?: Array<{ promoCodeId: string }>;
  targets?: Array<{ segmentId: string; exclude: boolean }>;
};
type Editor = {
  slug: string; kind: string; purpose: string; priority: number; isDismissible: boolean;
  startsAt: string; endsAt: string; actionType: "" | "INTERNAL_PATH" | "EXTERNAL_URL";
  actionValue: string; imageAssetId: string; translations: Translation[]; placements: Placement[];
  promoCodeIds: string;
};
type ListResponse<T> = { data: T[]; pagination: { total: number; page: number; totalPages: number } };
const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100";
const fresh = (): Editor => ({ slug: "", kind: "GENERAL", purpose: "SYSTEM", priority: 0, isDismissible: true, startsAt: "", endsAt: "", actionType: "", actionValue: "", imageAssetId: "", translations: [{ locale: "en", title: "", message: "", actionLabel: "" }], placements: [{ channel: "NOTIFICATION_BELL", placementKey: "home_top", isEnabled: true }], promoCodeIds: "" });
function toDatetime(value: string | null | undefined): string { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function toEditor(value: Announcement): Editor { return { slug: value.slug, kind: value.kind, purpose: value.purpose, priority: value.priority, isDismissible: value.isDismissible, startsAt: toDatetime(value.startsAt), endsAt: toDatetime(value.endsAt), actionType: value.actionType ?? "", actionValue: value.actionValue ?? "", imageAssetId: value.imageAssetId ?? "", translations: value.translations.map(t=>({locale:t.locale,title:t.title,message:t.message,actionLabel:t.actionLabel??""})), placements: value.placements.map(p=>({channel:p.channel,placementKey:p.placementKey,isEnabled:p.isEnabled})), promoCodeIds: (value.promotions??[]).map(p=>p.promoCodeId).join(", ") }; }
const msg = (e: unknown) => e instanceof Error ? e.message : "Operation failed";
export default function AnnouncementsPage() {
  const { admin } = useAuth();
  const canEdit = admin?.role === "ADMIN" || admin?.role === "SUPER_ADMIN";
  const canPublish = admin?.role === "SUPER_ADMIN";
  const [rows,setRows] = useState<Announcement[]>([]); const [audiences,setAudiences] = useState<Audience[]>([]);
  const [page,setPage] = useState(1); const [pages,setPages] = useState(1); const [total,setTotal] = useState(0);
  const [refresh,setRefresh] = useState(0); const [search,setSearch] = useState(""); const [status,setStatus] = useState("");
  const [form,setForm] = useState<Editor>(fresh); const [editId,setEditId] = useState<string|null>(null);
  const [open,setOpen] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState(""); const [notice,setNotice] = useState("");
  const [targetIds,setTargetIds] = useState<string[]>([]); const [excludedIds,setExcludedIds] = useState<string[]>([]);
  useEffect(()=>{
    let live=true; const q = new URLSearchParams({page:String(page),limit:"20"}); if(status)q.set("status",status);
    void apiRequest<ListResponse<Announcement>>(`/admin/announcements?${q}`).then(r=>{if(live){setRows(r.data);setPages(Math.max(1,r.pagination.totalPages));setTotal(r.pagination.total);setError("");}}).catch(e=>{if(live)setError(msg(e));});
    return ()=>{live=false};
  },[page,status,refresh]);
  useEffect(()=>{
    let live=true;
    void apiRequest<ListResponse<Audience>>("/admin/audiences?page=1&limit=100").then(r=>{if(live)setAudiences(r.data);}).catch(()=>{});
    return ()=>{live=false};
  },[]);
  const visible=useMemo(()=>rows.filter(r=>!search.trim()||`${r.slug} ${r.kind} ${r.status} ${r.translations?.map(t=>t.title).join(" ")}`.toLowerCase().includes(search.toLowerCase())),[rows,search]);
  function update<K extends keyof Editor>(key:K, value:Editor[K]) {setForm(old=>({...old,[key]:value}));}
  function create(){setOpen(true);setEditId(null);setForm(fresh());setTargetIds([]);setExcludedIds([]);setError("");setNotice("");}
  async function edit(id:string){setBusy(true);setError("");try{const detail=await apiRequest<Announcement>(`/admin/announcements/${encodeURIComponent(id)}`);setForm(toEditor(detail));setTargetIds((detail.targets??[]).filter(x=>!x.exclude).map(x=>x.segmentId));setExcludedIds((detail.targets??[]).filter(x=>x.exclude).map(x=>x.segmentId));setEditId(id);setOpen(true);}catch(e){setError(msg(e));}finally{setBusy(false);}}
  async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!canEdit||busy)return;setBusy(true);setError("");setNotice("");
    try{
      if(!/^[a-z0-9][a-z0-9-]{2,159}$/.test(form.slug))throw new Error("Slug: lowercase letters, numbers and hyphens (3+ characters)");
      if(!form.translations.length||form.translations.some(t=>!t.locale||t.title.trim().length<2||t.message.trim().length<2))throw new Error("Every translation needs locale, title and message");
      if(!form.placements.length||form.placements.some(p=>!p.placementKey.trim()))throw new Error("Add a valid placement channel and key");
      const date=(v:string)=>v?new Date(v).toISOString():null;
      const startsAt=date(form.startsAt),endsAt=date(form.endsAt);
      if(startsAt&&endsAt&&endsAt<=startsAt)throw new Error("End time must be after start time");
      const promoCodeIds=[...new Set(form.promoCodeIds.split(",").map(x=>x.trim()).filter(Boolean))];
      const payload={slug:form.slug,kind:form.kind,purpose:form.purpose,priority:form.priority,isDismissible:form.isDismissible,startsAt,endsAt,actionType:form.actionType||null,actionValue:form.actionValue.trim()||null,...(form.imageAssetId?{imageAssetId:form.imageAssetId}:{}),translations:form.translations.map(t=>({locale:t.locale.trim(),title:t.title.trim(),message:t.message.trim(),actionLabel:t.actionLabel?.trim()||null})),placements:form.placements.map(p=>({channel:p.channel,placementKey:p.placementKey.trim(),isEnabled:p.isEnabled})),promoCodeIds};
      const record=await apiRequest<Announcement>(`/admin/announcements${editId?`/${encodeURIComponent(editId)}`:""}`,{method:editId?"PATCH":"POST",body:JSON.stringify(payload)});
      // Targeting is a separate, SUPER_ADMIN-only endpoint; never claim it was saved for Admin.
      if(canPublish){
        const targets=[...targetIds.map(segmentId=>({segmentId,exclude:false})),...excludedIds.map(segmentId=>({segmentId,exclude:true}))];
        try {
          await apiRequest(`/admin/announcements/${encodeURIComponent(record.id??editId??"")}/targets`,{method:"PATCH",body:JSON.stringify({targets})});
        } catch (targetError) {
          // The announcement already exists; preserve its ID so a retry updates, never duplicates.
          setEditId(record.id??editId);
          setError(`Announcement saved, but audience targeting was not saved: ${msg(targetError)}`);
          setRefresh(n=>n+1);
          return;
        }
      }
      setOpen(false);setEditId(null);setNotice("Announcement saved successfully.");setRefresh(n=>n+1);
    }catch(e){setError(msg(e));}finally{setBusy(false);}
  }
  async function changeStatus(id:string,action:"publish"|"pause"|"archive") {if(!canPublish||!window.confirm(`Confirm ${action} announcement?`))return;setBusy(true);setError("");try{await apiRequest(`/admin/announcements/${encodeURIComponent(id)}/${action}`,{method:"POST"});setNotice(`Announcement ${action} completed`);setRefresh(n=>n+1);}catch(e){setError(msg(e));}finally{setBusy(false);}}
  return <main className="mx-auto max-w-[1500px] space-y-5 pb-10">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Global Communication</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold"><Megaphone className="h-6 w-6 text-indigo-600"/>Announcements</h1><p className="mt-2 text-sm text-slate-500">Multilingual messages, placements, targeting and scheduling.</p></div><div className="flex gap-2"><button type="button" className="rounded-xl border px-3 py-2 text-sm" onClick={()=>setRefresh(n=>n+1)}><RefreshCw className="inline h-4 w-4"/> Refresh</button>{canEdit&&<button type="button" onClick={create} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"><Plus className="inline h-4 w-4"/> Create announcement</button>}</div></header>
    {notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4"/>{notice}</p>}
    {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><ShieldAlert className="mr-1 inline h-4 w-4"/>{error}</p>}
    <div className={`grid items-start gap-5 ${open?"xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]":"grid-cols-1"}`}>
      {open&&<section className="min-w-0 overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm"><div className="flex justify-between border-b p-4"><h2 className="font-bold">{editId?"Edit announcement":"Create announcement"}</h2><button type="button" onClick={()=>setOpen(false)} aria-label="Close"><X className="h-5 w-5"/></button></div>
        <form onSubmit={e=>void save(e)} className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Slug *<input required className={input} value={form.slug} onChange={e=>update("slug",e.target.value)}/></label><label className="text-sm font-semibold">Priority<input type="number" min="0" max="1000" className={input} value={form.priority} onChange={e=>update("priority",Number(e.target.value))}/></label>
            <label className="text-sm font-semibold">Kind<select className={input} value={form.kind} onChange={e=>update("kind",e.target.value)}>{["GENERAL","PROMOTION","COURSE_UPDATE","SUBSCRIPTION","MAINTENANCE","SECURITY"].map(x=><option key={x} value={x}>{x.replaceAll("_"," ")}</option>)}</select></label>
            <label className="text-sm font-semibold">Purpose<select className={input} value={form.purpose} onChange={e=>update("purpose",e.target.value)}>{["SYSTEM","TRANSACTIONAL","MARKETING"].map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="text-sm font-semibold">Start (local time)<input className={input} type="datetime-local" value={form.startsAt} onChange={e=>update("startsAt",e.target.value)}/></label><label className="text-sm font-semibold">End (local time)<input className={input} type="datetime-local" value={form.endsAt} onChange={e=>update("endsAt",e.target.value)}/></label>
            <label className="text-sm font-semibold">Action type<select className={input} value={form.actionType} onChange={e=>update("actionType",e.target.value as Editor["actionType"])}><option value="">No action</option><option value="INTERNAL_PATH">Internal path</option><option value="EXTERNAL_URL">HTTPS external URL</option></select></label><label className="text-sm font-semibold">Action destination<input className={input} value={form.actionValue} onChange={e=>update("actionValue",e.target.value)} placeholder="/course or https://..."/></label>
            <label className="text-sm font-semibold">Image asset ID (PUBLIC + READY)<input className={input} value={form.imageAssetId} onChange={e=>update("imageAssetId",e.target.value)}/></label><label className="text-sm font-semibold">Promotion code IDs (comma-separated)<input className={input} value={form.promoCodeIds} onChange={e=>update("promoCodeIds",e.target.value)}/></label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isDismissible} onChange={e=>update("isDismissible",e.target.checked)}/>User can dismiss</label>
          </div>
          <div className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between"><h3 className="flex gap-2 text-sm font-bold"><Globe2 className="h-4 w-4"/>Translations</h3><button type="button" onClick={()=>update("translations",[...form.translations,{locale:"",title:"",message:"",actionLabel:""}])} className="text-xs font-bold text-indigo-600">+ Language</button></div>{form.translations.map((tr,i)=><div key={i} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"><label className="text-xs">Locale<input required className={input} value={tr.locale} placeholder="en" onChange={e=>update("translations",form.translations.map((x,j)=>j===i?{...x,locale:e.target.value}:x))}/></label><label className="text-xs">Action label<input className={input} value={tr.actionLabel??""} onChange={e=>update("translations",form.translations.map((x,j)=>j===i?{...x,actionLabel:e.target.value}:x))}/></label><label className="text-xs sm:col-span-2">Title<input required className={input} value={tr.title} onChange={e=>update("translations",form.translations.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/></label><label className="text-xs sm:col-span-2">Message<textarea required rows={3} className={input} value={tr.message} onChange={e=>update("translations",form.translations.map((x,j)=>j===i?{...x,message:e.target.value}:x))}/></label>{form.translations.length>1&&<button type="button" className="text-left text-xs text-rose-600" onClick={()=>update("translations",form.translations.filter((_,j)=>i!==j))}>Remove translation</button>}</div>)}</div>
          <div className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex justify-between"><h3 className="flex gap-2 text-sm font-bold"><Bell className="h-4 w-4"/>Placements</h3><button type="button" className="text-xs font-bold text-indigo-600" onClick={()=>update("placements",[...form.placements,{channel:"NOTIFICATION_BELL",placementKey:"",isEnabled:true}])}>+ Placement</button></div>{form.placements.map((pl,i)=><div key={i} className="grid items-end gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2"><label className="text-xs">Channel<select className={input} value={pl.channel} onChange={e=>update("placements",form.placements.map((x,j)=>j===i?{...x,channel:e.target.value as Placement["channel"]}:x))}>{["NOTIFICATION_BELL","IN_APP","WEBSITE_BANNER"].map(x=><option key={x}>{x}</option>)}</select></label><label className="text-xs">Placement key<input required className={input} value={pl.placementKey} onChange={e=>update("placements",form.placements.map((x,j)=>j===i?{...x,placementKey:e.target.value}:x))}/></label><label className="text-xs"><input type="checkbox" checked={pl.isEnabled} onChange={e=>update("placements",form.placements.map((x,j)=>j===i?{...x,isEnabled:e.target.checked}:x))}/> Enabled</label>{form.placements.length>1&&<button type="button" className="text-left text-xs text-rose-600" onClick={()=>update("placements",form.placements.filter((_,j)=>i!==j))}><Trash2 className="mr-1 inline h-3 w-3"/>Remove</button>}</div>)}</div>
          {canPublish&&<div className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="text-sm font-bold">Audience targeting (Super Admin)</h3><p className="text-xs text-slate-500">Include and exclude segments. No selection means broad distribution subject to placement rules and consent.</p><div className="grid gap-2 sm:grid-cols-2">{audiences.map(a=><div key={a.id} className="rounded-lg bg-slate-50 p-2 text-xs"><p className="font-semibold">{a.name}</p><div className="mt-2 flex gap-3">{(["include","exclude"] as const).map(mode=><label key={mode} className="flex items-center gap-1"><input type="checkbox" checked={(mode==="include"?targetIds:excludedIds).includes(a.id)} onChange={e=>{setTargetIds(old=>mode==="include"?(e.target.checked?[...old,a.id]:old.filter(x=>x!==a.id)):old.filter(x=>x!==a.id));setExcludedIds(old=>mode==="exclude"?(e.target.checked?[...old,a.id]:old.filter(x=>x!==a.id)):old.filter(x=>x!==a.id));}}/>{mode}</label>)}</div></div>)}</div></div>}
          <button disabled={busy||!canEdit} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Save announcement</button>
        </form></section>}
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input aria-label="Search loaded announcements" className={`${input} pl-9`} placeholder="Filter current page..." value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Filter by status" className={input} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">All statuses</option>{["DRAFT","SCHEDULED","PUBLISHED","PAUSED","ARCHIVED"].map(x=><option key={x}>{x}</option>)}</select></div>
        <p className="mb-3 text-xs text-slate-500">{total} total announcements · Page {page}/{pages}</p><div className="grid gap-3 md:grid-cols-2">{visible.map(r=><article key={r.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-2"><h3 className="break-words text-sm font-bold">{r.translations?.find(t=>t.locale==="en")?.title??r.translations?.[0]?.title??r.slug}</h3><span className="rounded-md bg-white px-2 py-1 text-xs font-semibold">{r.status}</span></div><p className="mt-1 text-xs text-slate-500">{r.slug} · {r.kind.replaceAll("_"," ")}</p><p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.translations?.[0]?.message}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><CalendarClock className="h-3.5 w-3.5"/>{r.startsAt?new Date(r.startsAt).toLocaleString():"No start restriction"}</p><div className="mt-4 flex flex-wrap gap-2">{canEdit&&<button type="button" disabled={busy} onClick={()=>void edit(r.id)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold"><Pencil className="mr-1 inline h-3 w-3"/>Edit</button>}{canPublish&&(["publish","pause","archive"] as const).map(a=><button key={a} type="button" disabled={busy} onClick={()=>void changeStatus(r.id,a)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold capitalize">{a}</button>)}</div></article>)}{visible.length===0&&<p className="py-8 text-center text-sm text-slate-500">No announcements found on this page</p>}</div><div className="mt-5 flex justify-between border-t pt-4"><button disabled={page<=1} onClick={()=>setPage(v=>v-1)} className="rounded-lg border px-3 py-2 text-sm"><ChevronLeft className="mr-1 inline h-4 w-4"/>Previous</button><button disabled={page>=pages} onClick={()=>setPage(v=>v+1)} className="rounded-lg border px-3 py-2 text-sm">Next<ChevronRight className="ml-1 inline h-4 w-4"/></button></div>
      </section>
    </div>
  </main>;
}
