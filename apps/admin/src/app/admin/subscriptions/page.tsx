'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAppLevel } from '@/lib/auth/app-level-context';
import {
  getSubscriptions,
  type Subscription,
  type SubscriptionPage,
  type SubscriptionStatus,
} from '@/lib/api/subscriptions';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';
import { Pagination } from '@/components/ui/pagination';

const STATUSES: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'PENDING', 'EXPIRED', 'CANCELLED', 'REFUNDED'];

function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function AdminSubscriptionsPageManagement() {
  const { selectedApp, isLoadingApps } = useAppLevel();
  const [result, setResult] = useState<SubscriptionPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<SubscriptionStatus | ''>('');
  const [revision, setRevision] = useState(0);
  const selectedAppId = selectedApp?.id;

  useEffect(() => {
    if (!selectedAppId) return;
    let live = true;
    void getSubscriptions({ appId: selectedAppId, status: status || undefined, page, limit })
      .then((data) => {
        if (!live) return;
        setResult(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
      });
    return () => {
      live = false;
    };
  }, [selectedAppId, status, page, limit, revision]);

  if (isLoadingApps || !selectedApp) return <LoadingState label="Loading..." />;
  if (error) return <ErrorState message={error} onRetry={() => setRevision((n) => n + 1)} />;
  if (!result) return <LoadingState label="Loading subscriptions..." />;

  const subscriptions: Subscription[] = result.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <CreditCard className="h-6 w-6 text-indigo-600" /> Subscriptions — {selectedApp.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Billing records are read-only here. Use Cancellations and Refunds for changes.
          </p>
        </div>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SubscriptionStatus | '');
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white p-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No subscriptions found for this app{status ? ` with status ${status}` : ''}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Learner</th>
                  <th className="px-6 py-3">Platform / Product</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3">Started / Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {sub.user?.email || sub.user?.displayName || 'Unknown learner'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{sub.platform} · {sub.provider}</div>
                      <div className="text-xs text-slate-500">Product: {sub.productId}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.status === 'TRIAL' || sub.status === 'PENDING'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sub.status === 'ACTIVE' && <CheckCircle className="h-3 w-3" />}
                        {(sub.status === 'TRIAL' || sub.status === 'PENDING') && <Clock className="h-3 w-3" />}
                        {!['ACTIVE', 'TRIAL', 'PENDING'].includes(sub.status) && <XCircle className="h-3 w-3" />}
                        {sub.status}
                      </span>
                      {sub.cancelAtPeriodEnd && (
                        <div className="mt-1 text-[10px] font-semibold text-amber-700">Cancels at period end</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      <div>Start: {formatDate(sub.startedAt)}</div>
                      <div className="text-slate-500">
                        {sub.expiresAt ? `Expires: ${formatDate(sub.expiresAt)}` : 'No expiry date'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 p-4">
            <Pagination
              pagination={result.pagination}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
