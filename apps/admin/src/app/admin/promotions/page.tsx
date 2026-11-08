'use client';

import React, { useEffect, useState } from 'react';
import { Ticket, Plus, Ban, CheckCircle, Percent, Edit2, Trash2 } from 'lucide-react';
import { getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, togglePromoCodeStatus, type PromoCode } from '@/lib/api/promotions';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '', discountPct: 10, description: '', maxUses: '', validFrom: '', validUntil: ''
  });

  const loadPromos = async () => {
    try {
      setPromos(await getPromoCodes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPromos(); }, []);

  const openModal = (promo?: PromoCode) => {
    if (promo) {
      setEditingId(promo.id);
      setFormData({
        code: promo.code,
        discountPct: promo.discountPct,
        description: promo.description || '',
        maxUses: promo.maxUses ? promo.maxUses.toString() : '',
        validFrom: promo.validFrom ? new Date(promo.validFrom).toISOString().slice(0, 16) : '',
        validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().slice(0, 16) : '',
      });
    } else {
      setEditingId(null);
      setFormData({ code: '', discountPct: 10, description: '', maxUses: '', validFrom: '', validUntil: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().replace(/\s+/g, ''),
        discountPct: Number(formData.discountPct),
        description: formData.description || null,
        maxUses: formData.maxUses ? Number(formData.maxUses) : null,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : null,
      };

      if (editingId) await updatePromoCode(editingId, payload);
      else await createPromoCode(payload);
      
      setIsModalOpen(false);
      await loadPromos();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save promo code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promo code permanently?')) return;
    try {
      await deletePromoCode(id);
      setPromos(promos.filter((p) => p.id !== id));
    } catch (err) { alert('Failed to delete'); }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setProcessingId(id);
    try {
      const updated = await togglePromoCodeStatus(id, !currentStatus);
      setPromos(promos.map(p => p.id === id ? updated : p));
    } catch (err) { alert('Failed to update status'); } 
    finally { setProcessingId(null); }
  };

  if (loading) return <LoadingState label="Loading Promotions..." />;
  if (error) return <ErrorState message={error} onRetry={loadPromos} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="h-6 w-6 text-indigo-600" /> Promotions & Discounts
          </h1>
        </div>
        <button onClick={() => openModal()} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> Add Promo
        </button>
      </div>

      {promos.length === 0 ? <EmptyState title="No Promo Codes" description="Create a discount promo code." /> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-500 text-xs">Code Details</th>
                <th className="px-6 py-4 text-center font-semibold text-slate-500 text-xs">Discount</th>
                <th className="px-6 py-4 text-center font-semibold text-slate-500 text-xs">Usage</th>
                <th className="px-6 py-4 text-center font-semibold text-slate-500 text-xs">Status</th>
                <th className="px-6 py-4 text-right font-semibold text-slate-500 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {promos.map((promo) => (
                <tr key={promo.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded inline-block">{promo.code}</div>
                    {promo.description && <div className="text-xs text-slate-500 mt-1">{promo.description}</div>}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-emerald-700 bg-emerald-50 rounded-lg">{promo.discountPct}%</td>
                  <td className="px-6 py-4 text-center">{promo.currentUses} / {promo.maxUses || '∞'}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleToggleStatus(promo.id, promo.isActive)} disabled={processingId === promo.id} className={`px-3 py-1 rounded-full text-xs font-bold border ${promo.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {promo.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openModal(promo)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(promo.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden p-6">
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Promo' : 'New Promo Code'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-700">Code *</label><input required type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full border p-2 rounded text-sm font-mono uppercase" /></div>
                <div><label className="block text-xs font-bold text-slate-700">Discount % *</label><input required type="number" min="1" max="100" value={formData.discountPct} onChange={e => setFormData({ ...formData, discountPct: Number(e.target.value) })} className="w-full border p-2 rounded text-sm" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-700">Description</label><input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border p-2 rounded text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-700">Valid From</label><input type="datetime-local" value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} className="w-full border p-2 rounded text-sm" /></div>
                <div><label className="block text-xs font-bold text-slate-700">Valid Until</label><input type="datetime-local" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} className="w-full border p-2 rounded text-sm" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-700">Max Uses (Empty = ∞)</label><input type="number" value={formData.maxUses} onChange={e => setFormData({ ...formData, maxUses: e.target.value })} className="w-full border p-2 rounded text-sm" /></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-sm font-semibold">Cancel</button><button type="submit" disabled={submitting} className="bg-indigo-600 text-white px-6 py-2 rounded text-sm font-bold">{submitting ? 'Saving...' : 'Save'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}