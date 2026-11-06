'use client';

import React from 'react';

export function LoadingState({ label = 'Loading data...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-12 text-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
      <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <h3 className="text-sm font-semibold text-red-900">Unable to load data</h3>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center rounded-md bg-red-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-800"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function ComingSoonModule({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8">
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
        {phase} • Coming Soon
      </span>
      <h1 className="mt-3 text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
    </div>
  );
}