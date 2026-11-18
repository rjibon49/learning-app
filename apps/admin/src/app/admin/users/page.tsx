'use client';

import React, { useEffect, useState } from 'react';
import { Ban, CheckCircle, Search, Users, Flame } from 'lucide-react';
import { getUsers, toggleUserStatus, USERS_PAGE_SIZE, type User } from '@/lib/api/users';
import { deleteResource } from '@/lib/api/delete';
import { DeleteActions } from '@/components/ui/delete-actions';
import { useConfirm, useToast } from '@/components/ui/feedback-provider';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminUsersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  // Debounce typing, then search on the server (the list is no longer limited
  // to the first 100 learners that happened to be loaded).
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let live = true;
    void getUsers({ search: query })
      .then((data) => {
        if (!live) return;
        setUsers(data);
        setHasMore(data.length === USERS_PAGE_SIZE);
        setError(null);
      })
      .catch((err: unknown) => {
        if (live) setError(err instanceof Error ? err.message : 'Failed to load users');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [query, revision]);

  const loadUsers = () => setRevision((n) => n + 1);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await getUsers({ search: query, skip: users.length });
      setUsers((current) => [...current, ...data.filter((u) => !current.some((c) => c.id === u.id))]);
      setHasMore(data.length === USERS_PAGE_SIZE);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load more users');
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredUsers = users;

  const handleToggleStatus = async (user: User) => {
    const blocking = user.isActive;
    const ok = await confirm({
      title: `${blocking ? 'Block' : 'Unblock'} ${user.email ?? user.displayName ?? 'this learner'}?`,
      message: blocking
        ? 'They are signed out on every device and cannot log in. Progress is kept.'
        : 'They can sign in again.',
      confirmLabel: blocking ? 'Block' : 'Unblock',
      tone: blocking ? 'danger' : 'default',
    });
    if (!ok) return;

    setProcessingId(user.id);
    try {
      const updatedUser = await toggleUserStatus(user.id, !blocking);
      setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, ...updatedUser } : u)));
      toast.success(blocking ? 'Learner blocked.' : 'Learner unblocked.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading users..." />;
  if (error && users.length === 0) return <ErrorState message={error} onRetry={loadUsers} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" /> Users & Students
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage registered students, track learning progress, and control access.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 shadow-sm max-w-md">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState 
          title={search ? "No matches found" : "No users found"} 
          description={search ? "Try adjusting your search term." : "No students have registered yet."} 
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-slate-500 text-xs">User Info</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-slate-500 text-xs">Dates</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-slate-500 text-xs">Progress Stats</th>
                <th className="px-6 py-4 text-center font-semibold uppercase tracking-wider text-slate-500 text-xs">App Usage & Streak</th>
                <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-slate-500 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => {
                const isAdFree = Boolean(user.adFreeUntil && new Date(user.adFreeUntil) > new Date());
                
                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-base">{user.displayName || 'Unnamed User'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{user.email || 'No email provided'}</div>
                      <div className="mt-2 flex gap-2 items-center">
                        <span className="inline-block rounded bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                          {user.role}
                        </span>
                        {user.referralCode && (
                          <span className="inline-block rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 font-mono">
                            Ref: {user.referralCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium text-sm">Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-3 text-xs">
                        <div className="flex flex-col items-center bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200 w-16 shadow-sm">
                          <span className="font-bold text-slate-900 text-sm">{user._count?.lessonProgress || 0}</span>
                          <span className="text-slate-500 text-[10px] uppercase font-medium">Lessons</span>
                        </div>
                        <div className="flex flex-col items-center bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200 w-16 shadow-sm">
                          <span className="font-bold text-slate-900 text-sm">{user._count?.vocabularyProgress || 0}</span>
                          <span className="text-slate-500 text-[10px] uppercase font-medium">Vocab</span>
                        </div>
                        <div className="flex flex-col items-center bg-slate-50 rounded-md px-3 py-1.5 border border-slate-200 w-16 shadow-sm">
                          <span className="font-bold text-slate-900 text-sm">{user._count?.quizAttempts || 0}</span>
                          <span className="text-slate-500 text-[10px] uppercase font-medium">Quizzes</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs shadow-sm">
                          <Flame className="h-3.5 w-3.5" /> {user.currentStreak || 0} Day Streak
                        </div>
                        {isAdFree ? (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shadow-sm">
                            Ad-Free till: {new Date(user.adFreeUntil ?? '').toLocaleDateString()}
                          </div>
                        ) : (
                          <div className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Regular Ads
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(user)}
                        disabled={processingId === user.id}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors shadow-sm disabled:opacity-50 border ${
                          user.isActive
                            ? 'bg-white text-rose-600 border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                            : 'bg-white text-emerald-600 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700'
                        }`}
                      >
                        {user.isActive ? (
                          <><Ban className="h-4 w-4" /> Block Access</>
                        ) : (
                          <><CheckCircle className="h-4 w-4" /> Unblock Access</>
                        )}
                      </button>
                      <DeleteActions
                        itemName={user.email ?? user.displayName ?? user.id}
                        entity="learner account"
                        hideArchive
                        permanentHelp="Their account and personal data are deleted. If they have payments, the account is anonymised instead so billing records stay valid."
                        onDelete={(permanent) => deleteResource(`/users/${encodeURIComponent(user.id)}`, permanent)}
                        onDone={() => setUsers((current) => current.filter((u) => u.id !== user.id))}
                      />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hasMore && (
            <div className="border-t border-slate-100 p-4 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : `Load more (showing ${users.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}