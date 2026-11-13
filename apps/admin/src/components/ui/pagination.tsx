'use client';

import React from 'react';
import type { PaginationMeta } from '@/types/pagination';

type Props = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  pageSizes?: number[];
};

export function Pagination({ pagination, onPageChange, onPageSizeChange,
  isLoading = false, pageSizes = [10, 20, 50, 100] }: Props) {
  const total = Math.max(0, pagination.total);
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pagination.limit)));
  const current = Math.min(pages, Math.max(1, pagination.page));
  const first = total === 0 ? 0 : (current - 1) * pagination.limit + 1;
  const last = Math.min(total, current * pagination.limit);
  const start = Math.max(1, Math.min(current - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  const common = 'rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="text-sm text-slate-500">Showing {first}–{last} of {total}</p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Rows per page
            <select aria-label="Rows per page" value={pagination.limit} disabled={isLoading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
              {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <button type="button" className={common} disabled={isLoading || current === 1}
          onClick={() => onPageChange(current - 1)}>Previous</button>
        {numbers.map(n => <button key={n} type="button" disabled={isLoading}
          aria-label={`Page ${n}`} aria-current={n === current ? 'page' : undefined}
          onClick={() => onPageChange(n)}
          className={`${common} ${n === current ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{n}</button>)}
        <button type="button" className={common} disabled={isLoading || current >= pages}
          onClick={() => onPageChange(current + 1)}>Next</button>
      </div>
    </nav>
  );
}
