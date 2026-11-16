"use client";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api/client";

type Delivery = { id: string; status: string; channel: string; purpose: string; scheduledAt?: string; createdAt?: string; errorCode?: string | null };
type Paginated<T> = { data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export default function NotificationReportsPage() {
  const [items, setItems] = useState<Delivery[]>([]); const [total, setTotal] = useState(0);
  const [page,setPage] = useState(1); const [pages,setPages] = useState(1);
  const [revision,setRevision] = useState(0); const [error,setError] = useState(""); const [status,setStatus] = useState("");
  useEffect(()=>{
    let active=true;
    void apiRequest<Paginated<Delivery>>(`/admin/notification-queue?page=${page}&limit=50`)
      .then(r=>{if(active){setItems(r.data);setTotal(r.pagination.total);setPages(Math.max(1,r.pagination.totalPages));setError("");}})
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to retrieve report");});
    return ()=>{active=false};
  },[page,revision]);
  const shown=useMemo(()=>items.filter(x=>!status||x.status===status),[items,status]);
  const counts=useMemo(()=>items.reduce<Record<string,number>>((acc,x)=>{acc[x.status]=(acc[x.status]??0)+1;return acc;},{}),[items]);
  return <main className="mx-auto max-w-7xl space-y-5 pb-10"><header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Activity className="h-6 w-6 text-indigo-600"/>Notification Reports</h1><p className="mt-2 text-sm text-slate-500">Read-only delivery audit for the current queue page. Accurate global aggregates require a dedicated reporting API.</p></div><button type="button" className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm" onClick={()=>setRevision(v=>v+1)}><RefreshCw className="h-4 w-4"/>Refresh</button></header>
    {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{label:"Total queue records",value:total,icon:Activity},{label:"Sent on this page",value:counts.SENT??0,icon:CheckCircle2},{label:"Queued on this page",value:counts.QUEUED??0,icon:Clock3},{label:"Failed on this page",value:counts.FAILED??0,icon:AlertTriangle}].map(card=><div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4"><card.icon className="h-5 w-5 text-indigo-600"/><p className="mt-3 text-2xl font-bold">{card.value}</p><p className="text-xs text-slate-500">{card.label}</p></div>)}</div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Delivery records · page {page}/{pages}</h2><select aria-label="Filter loaded statuses" className="rounded-xl border border-slate-200 p-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses on this page</option>{["SENT","QUEUED","PROCESSING","FAILED","SKIPPED","CANCELLED"].map(s=><option key={s}>{s}</option>)}</select></div><div className="overflow-auto"><table className="min-w-full divide-y divide-slate-100 text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">ID</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3">Purpose</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Error / Reason</th></tr></thead><tbody className="divide-y divide-slate-100">{shown.map(item=><tr key={item.id}><td className="max-w-44 truncate px-3 py-3 font-mono text-xs" title={item.id}>{item.id}</td><td className="px-3 py-3">{item.channel}</td><td className="px-3 py-3">{item.purpose}</td><td className="px-3 py-3 font-semibold">{item.status}</td><td className="px-3 py-3 text-slate-500">{item.errorCode??"—"}</td></tr>)}{!shown.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-500">No matching records on this page</td></tr>}</tbody></table></div><div className="mt-4 flex justify-between"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Previous</button><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Next</button></div></section>
  </main>;
}
