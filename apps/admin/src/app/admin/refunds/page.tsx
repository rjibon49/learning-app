'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api/client';
type Refund = { id: string; paymentId: string; userId: string; status: string; amountMinor: string; currency: string; reason: string; adminNote?: string|null };
export default function RefundsPage() {
  const [rows, setRows] = useState<Refund[]>([]); const [page, setPage] = useState(1);
  const [note, setNote] = useState<Record<string,string>>({}); const [message, setMessage] = useState('');
  const refresh = useCallback(async()=>{ try { const result = await apiRequest<{data:Refund[]}>(`/admin/billing/refunds?page=${page}&limit=20`); setRows(result.data); } catch(e){ setMessage(e instanceof Error?e.message:'Request failed'); } },[page]);
  useEffect(()=>{ void refresh(); },[refresh]);
  async function review(id: string, decision: 'APPROVE'|'REJECT') {
    if (!window.confirm(`Confirm ${decision}? This is only an internal review; no provider refund will be sent.`)) return;
    try { await apiRequest(`/admin/billing/refunds/${encodeURIComponent(id)}/review`, {method:'PATCH', body:JSON.stringify({decision,note:note[id]??''})}); await refresh(); setMessage(`Review ${decision.toLowerCase()} recorded`); }
    catch(e){setMessage(e instanceof Error?e.message:'Review failed');}
  }
  return <main className="mx-auto max-w-6xl space-y-4 p-5"><h1 className="text-2xl font-bold">Refund Requests</h1>
    <p className="text-sm text-slate-600">Approval does not return money. An actual refund requires payment-provider execution and verified webhook reconciliation.</p>
    {message&&<p role="status" className="rounded border p-3">{message}</p>}
    {rows.map(row=><section key={row.id} className="rounded-xl border p-4"><h2 className="font-semibold">{row.currency} {row.amountMinor} minor units — {row.status}</h2>
      <p className="text-xs text-slate-500">Payment: {row.paymentId}</p><p className="my-2 text-sm">{row.reason}</p>
      {['REQUESTED','UNDER_REVIEW'].includes(row.status)&&<div className="flex flex-wrap gap-2">
        <input aria-label="Admin note" placeholder="Review note" className="min-w-0 flex-1 rounded border p-2" value={note[row.id]??''} onChange={e=>setNote(v=>({...v,[row.id]:e.target.value}))}/>
        <button onClick={()=>void review(row.id,'APPROVE')} className="rounded border px-3 py-2">Approve review</button>
        <button onClick={()=>void review(row.id,'REJECT')} className="rounded border px-3 py-2">Reject</button>
      </div>}
    </section>)}
    <div className="flex gap-3"><button disabled={page===1} onClick={()=>setPage(v=>v-1)} className="rounded border px-3 py-1">Previous</button><span>Page {page}</span><button disabled={rows.length<20} onClick={()=>setPage(v=>v+1)} className="rounded border px-3 py-1">Next</button></div>
  </main>;
}
