'use client';

import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { getAuditLogs, type AuditLogPage } from '@/lib/api/audit-logs';
import { ErrorState, LoadingState } from '@/components/feedback/state-views';
import { Pagination } from '@/components/ui/pagination';

const ACTION_FILTERS = [
  { value: '', label: 'All actions' },
  { value: 'PERMANENT_DELETE', label: 'Permanent deletes' },
];

export default function AuditLogsPage() {
  const [result, setResult] = useState<AuditLogPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityQuery, setEntityQuery] = useState('');
  const [revision, setRevision] = useState(0);

  // Debounce the free-text entity filter.
  useEffect(() => {
    const timer = window.setTimeout(() => setEntityQuery(entityType.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [entityType]);

  useEffect(() => {
    let live = true;
    void getAuditLogs({ page, limit, action, entityType: entityQuery })
      .then((data) => {
        if (!live) return;
        setResult(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      });
    return () => {
      live = false;
    };
  }, [page, limit, action, entityQuery, revision]);

  if (error && !result) return <ErrorState message={error} onRetry={() => setRevision((n) => n + 1)} />;
  if (!result) return <LoadingState label="Loading audit logs..." />;

  const logs = result.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <History className="h-6 w-6 text-indigo-600" /> System Audit Logs
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administrator activity, including every permanent delete. (Super Admin only)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Filter by action"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 bg-white p-2 text-sm"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <input
            aria-label="Filter by entity type"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            placeholder="Entity type, e.g. Vocabulary"
            className="rounded-md border border-slate-300 bg-white p-2 text-sm"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      )}

      {logs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          No audit logs match these filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Admin</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity</th>
                  <th className="px-6 py-3">Details</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{log.admin?.displayName || log.admin?.email || 'Deleted admin'}</div>
                      <div className="text-xs text-slate-500">{log.admin?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded px-2 py-1 text-xs font-bold ${
                          log.action === 'PERMANENT_DELETE' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {log.entityType || '—'}
                      {log.entityId && <div className="font-mono text-[10px] text-slate-400">{log.entityId}</div>}
                    </td>
                    <td className="max-w-xs px-6 py-4 text-xs text-slate-600">
                      {log.metadata ? (
                        <details>
                          <summary className="cursor-pointer truncate">{JSON.stringify(log.metadata)}</summary>
                          <pre className="mt-2 whitespace-pre-wrap break-all rounded bg-slate-50 p-2">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
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
