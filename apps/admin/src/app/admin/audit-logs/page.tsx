'use client';

import React, { useEffect, useState } from 'react';
import { History, ShieldAlert } from 'lucide-react';
import { getAuditLogs, type AuditLog } from '@/lib/api/audit-logs';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading audit logs..." />;
  if (error) return <ErrorState message={error} onRetry={loadLogs} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <History className="h-6 w-6 text-indigo-600" /> System Audit Logs
        </h1>
        <p className="text-sm text-slate-500 mt-1">Track administrator activities and system operations. (Super Admin Only)</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No audit logs recorded yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Admin</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Entity</th>
                <th className="px-6 py-3">Details</th>
                <th className="px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{log.admin?.displayName || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{log.admin?.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{log.entityType || '—'}</td>
<td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
  {log.metadata ? JSON.stringify(log.metadata) : '—'}
</td>
<td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
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