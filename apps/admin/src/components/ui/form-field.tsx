'use client';

import { useId, type ReactNode } from 'react';

export const inputClass =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-4 disabled:bg-slate-100';

export function inputTone(error?: string | null): string {
  return error
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
    : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10';
}

/**
 * Label + input + hint + error, laid out the same everywhere.
 * Pass a render function to get the id / aria props for the input.
 */
export function FormField({
  label,
  required,
  hint,
  error,
  className = '',
  children,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
    className: string;
  }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`min-w-0 space-y-1.5 text-sm ${className}`}>
      <label htmlFor={id} className="block font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      {children({
        id,
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
        className: `${inputClass} ${inputTone(error)}`,
      })}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Field errors from an API 400 response (empty object for other errors). */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (error && typeof error === 'object' && 'fieldErrors' in error) {
    const value = (error as { fieldErrors?: unknown }).fieldErrors;
    if (value && typeof value === 'object') return value as Record<string, string>;
  }
  return {};
}
