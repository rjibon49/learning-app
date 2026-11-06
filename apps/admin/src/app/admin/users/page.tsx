'use client';

import React, { useEffect, useState } from 'react';
import { Ban, CheckCircle, Search } from 'lucide-react';
import { getUsers, toggleUserStatus, type User } from '@/lib/api/users';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
    } else {
      const lower = search.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.displayName?.toLowerCase().includes(lower) ||
            u.email?.toLowerCase().includes(lower)
        )
      );
    }
  }, [search, users]);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'block' : 'unblock'} this user?`)) return;
    
    setProcessingId(id);
    try {
      const updatedUser = await toggleUserStatus(id, !currentStatus);
      setUsers(users.map((u) => (u.id === id ? updatedUser : u)));
    } catch (err) {
      alert('Failed to update user status');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading users..." />;
  if (error) return <ErrorState message={error} onRetry={loadUsers} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users & Students</h1>
          <p className="text-sm text-slate-500">Manage registered students, track learning progress, and control access.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm max-w-md">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState title="No users found" description="No students match your search criteria." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-900">User Info</th>
                <th className="px-6 py-3 font-semibold text-slate-900">Dates</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-900">Progress Stats</th>
                <th className="px-6 py-3 text-center font-semibold text-slate-900">Status</th>
                <th className="px-6 py-3 text-right font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{user.displayName || 'Unnamed User'}</div>
                    <div className="text-xs text-slate-500">{user.email || 'No email provided'}</div>
                    <div className="mt-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900 font-medium">Joined: {new Date(user.createdAt).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-4 text-xs">
                      <div className="flex flex-col items-center bg-slate-50 rounded-md px-2 py-1 border border-slate-100">
                        <span className="font-bold text-slate-900">{user._count.lessonProgress}</span>
                        <span className="text-slate-500 text-[10px] uppercase">Lessons</span>
                      </div>
                      <div className="flex flex-col items-center bg-slate-50 rounded-md px-2 py-1 border border-slate-100">
                        <span className="font-bold text-slate-900">{user._count.vocabularyProgress}</span>
                        <span className="text-slate-500 text-[10px] uppercase">Vocab</span>
                      </div>
                      <div className="flex flex-col items-center bg-slate-50 rounded-md px-2 py-1 border border-slate-100">
                        <span className="font-bold text-slate-900">{user._count.quizAttempts}</span>
                        <span className="text-slate-500 text-[10px] uppercase">Quizzes</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        user.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleStatus(user.id, user.isActive)}
                      disabled={processingId === user.id}
                      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        user.isActive
                          ? 'text-rose-700 hover:bg-rose-50'
                          : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {user.isActive ? (
                        <><Ban className="h-3.5 w-3.5" /> Block</>
                      ) : (
                        <><CheckCircle className="h-3.5 w-3.5" /> Unblock</>
                      )}
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