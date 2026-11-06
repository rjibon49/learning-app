'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Trash2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import { getSubscriptions, deleteSubscription, type Subscription } from '@/lib/api/subscriptions';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminSubscriptionsPageManagement() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedApp) loadSubscriptions();
  }, [selectedApp]);

  const loadSubscriptions = async () => {
    if (!selectedApp) return;
    setLoading(true);
    try {
      const data = await getSubscriptions(selectedApp.id);
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this subscription record?')) return;
    try {
      await deleteSubscription(id);
      setSubscriptions(subscriptions.filter(s => s.id !== id));
    } catch (err) {
      alert('Failed to delete subscription');
    }
  };

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading..." />;
  if (error) return <ErrorState message={error} onRetry={loadSubscriptions} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-indigo-600" /> Subscriptions — {selectedApp.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Monitor user subscriptions and billing statuses.</p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No active subscriptions found for this app.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">User Email</th>
                <th className="px-6 py-3">Platform / Product</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3">Started / Expires</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {sub.user?.email || 'Unknown User'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{sub.platform}</div>
                    <div className="text-xs text-slate-500">Product: {sub.productId}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                      sub.status === 'TRIALING' ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {sub.status === 'ACTIVE' && <CheckCircle className="h-3 w-3" />}
                      {sub.status === 'TRIALING' && <Clock className="h-3 w-3" />}
                      {sub.status !== 'ACTIVE' && sub.status !== 'TRIALING' && <XCircle className="h-3 w-3" />}
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    <div>Start: {new Date(sub.startedAt).toLocaleDateString()}</div>
                    {sub.expiresAt ? (
                      <div className="text-slate-500">Expires: {new Date(sub.expiresAt).toLocaleDateString()}</div>
                    ) : (
                      <div className="text-emerald-600 font-medium">Lifetime / No Expiry</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(sub.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}