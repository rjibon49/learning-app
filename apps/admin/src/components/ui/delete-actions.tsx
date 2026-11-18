'use client';

import { useState, type ReactNode } from 'react';
import { Archive, Loader2, Trash2 } from 'lucide-react';

import { useAuth } from '@/lib/auth/auth-context';
import { errorMessage, useConfirm, useToast } from './feedback-provider';

type Props = {
  /** Shown in the dialog, e.g. the word or course title. */
  itemName: string;
  /** e.g. "word", "lesson", "deck". */
  entity: string;
  /** Calls the API. permanent=true adds ?permanent=true. */
  onDelete: (permanent: boolean) => Promise<unknown>;
  /** Called after success (refresh the list, navigate away...). */
  onDone?: (permanent: boolean) => void;

  /** Hide the safe-delete button (e.g. row is already archived). */
  hideArchive?: boolean;
  /** Can the current admin use safe delete? Defaults to true. */
  canArchive?: boolean;
  archiveLabel?: string;
  /** What safe delete does, in plain words. */
  archiveHelp?: ReactNode;
  /** What permanent delete removes, in plain words. */
  permanentHelp?: ReactNode;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Icon-only buttons for dense tables. */
  compact?: boolean;
};

/**
 * Two buttons following the API delete rule:
 *  - "Archive" (everyone allowed): reversible, learners keep progress.
 *  - "Delete permanently" (Super Admin only): asks the user to type DELETE.
 */
export function DeleteActions({
  itemName,
  entity,
  onDelete,
  onDone,
  hideArchive,
  canArchive = true,
  archiveLabel = 'Archive',
  archiveHelp,
  permanentHelp,
  size = 'sm',
  disabled,
  compact,
}: Props) {
  const { admin } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState<'archive' | 'permanent' | null>(null);
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  async function run(permanent: boolean) {
    const ok = await confirm(
      permanent
        ? {
            title: `Permanently delete this ${entity}?`,
            message: (
              <>
                <p>
                  <strong className="break-words text-slate-900">{itemName}</strong> will be removed
                  forever. This cannot be undone.
                </p>
                {permanentHelp && <p className="mt-2">{permanentHelp}</p>}
                {!hideArchive && canArchive && (
                  <p className="mt-2 text-slate-500">
                    Not sure? Use <em>{archiveLabel}</em> instead — it can be restored.
                  </p>
                )}
              </>
            ),
            confirmLabel: 'Delete permanently',
            tone: 'danger',
            requireText: 'DELETE',
          }
        : {
            title: `${archiveLabel} this ${entity}?`,
            message: (
              <>
                <p>
                  <strong className="break-words text-slate-900">{itemName}</strong>
                </p>
                <p className="mt-2">
                  {archiveHelp ??
                    'It will be hidden from learners. Nothing is lost and you can restore it later by changing its status.'}
                </p>
              </>
            ),
            confirmLabel: archiveLabel,
            tone: 'default',
          },
    );
    if (!ok) return;

    setBusy(permanent ? 'permanent' : 'archive');
    try {
      await onDelete(permanent);
      toast.success(
        permanent ? `"${itemName}" was permanently deleted.` : `"${itemName}" — ${archiveLabel.toLowerCase()} done.`,
      );
      onDone?.(permanent);
    } catch (e) {
      toast.error(errorMessage(e, 'Delete failed.'));
    } finally {
      setBusy(null);
    }
  }

  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const showArchive = !hideArchive && canArchive;

  if (!showArchive && !isSuperAdmin) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {showArchive && (
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void run(false)}
          title={archiveLabel}
          aria-label={`${archiveLabel} ${itemName}`}
          className={`inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 ${pad}`}
        >
          {busy === 'archive' ? <Loader2 className={`${icon} animate-spin`} /> : <Archive className={icon} />}
          {!compact && archiveLabel}
        </button>
      )}
      {isSuperAdmin && (
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void run(true)}
          title="Delete permanently (Super Admin)"
          aria-label={`Delete ${itemName} permanently`}
          className={`inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 ${pad}`}
        >
          {busy === 'permanent' ? <Loader2 className={`${icon} animate-spin`} /> : <Trash2 className={icon} />}
          {!compact && 'Delete permanently'}
        </button>
      )}
    </span>
  );
}
