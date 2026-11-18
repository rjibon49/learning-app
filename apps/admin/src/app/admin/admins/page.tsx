'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Plus, Edit3, X, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { DeleteActions } from '@/components/ui/delete-actions';
import { useToast } from '@/components/ui/feedback-provider';
import { apiFieldErrors } from '@/components/ui/form-field';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin, type AdminUser, type AdminRole } from '@/lib/api/admins';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminManagementPage() {
  const { admin: currentAdmin } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('CONTENT_EDITOR');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load administrators');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAdmin(null);
    setEmail('');
    setDisplayName('');
    setPassword('');
    setRole('CONTENT_EDITOR');
    setIsActive(true);
    setFormError('');
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEmail(admin.email);
    setDisplayName(admin.displayName || '');
    setPassword(''); // Leave blank unless changing
    setRole(admin.role);
    setIsActive(admin.isActive);
    setFormError('');
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const problems: Record<string, string> = {};
    if (!editingAdmin && !/^\S+@\S+\.\S+$/.test(email.trim())) problems.email = 'Enter a valid email address.';
    if (displayName.trim().length < 2) problems.displayName = 'Enter a display name (at least 2 characters).';
    if (!editingAdmin && !password) problems.password = 'Set a password for the new admin.';
    if (password && password.length < 12) problems.password = 'Use at least 12 characters.';
    if (editingAdmin && editingAdmin.id === currentAdmin?.id && (role !== editingAdmin.role || !isActive)) {
      problems.role = 'You cannot change your own role or block yourself.';
    }
    setFieldErrors(problems);
    setFormError('');
    if (Object.keys(problems).length) return;

    setSubmitting(true);

    try {
      if (editingAdmin) {
        const payload: { displayName: string; role: AdminRole; isActive: boolean; password?: string } = {
          displayName: displayName.trim(), role, isActive,
        };
        if (password) payload.password = password;
        await updateAdmin(editingAdmin.id, payload);
      } else {
        await createAdmin({ email: email.trim().toLowerCase(), displayName: displayName.trim(), password, role });
      }
      await loadAdmins();
      setIsModalOpen(false);
      setPassword('');
      toast.success(editingAdmin ? 'Administrator updated.' : 'Administrator created. Share the password with them securely.');
    } catch (err) {
      // Show the real reason (duplicate email, weak password...) instead of a generic alert.
      setFieldErrors(apiFieldErrors(err));
      setFormError(err instanceof Error ? err.message : 'Failed to save administrator');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading administrators..." />;
  if (error) return <ErrorState message={error} onRetry={loadAdmins} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" /> Admin & Role Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage system administrators, editors, and access controls. (Super Admin Only)</p>
        </div>
        <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
          <Plus className="h-4 w-4" /> Add New Admin
        </button>
      </div>

      {/* ADMINS TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">Admin Info</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3">Last Login</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{admin.displayName || 'Unnamed Admin'}</div>
                  <div className="text-xs text-slate-500">{admin.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                    admin.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                    admin.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {admin.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    admin.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {admin.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                    {admin.isActive ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-1">
                  <button type="button" aria-label={`Edit ${admin.email}`} onClick={() => openEditModal(admin)} className="p-2 text-slate-400 hover:text-indigo-600 rounded mr-1">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {admin.id !== currentAdmin?.id && (
                    <DeleteActions
                      compact
                      itemName={admin.email}
                      entity="administrator"
                      archiveLabel="Deactivate"
                      hideArchive={!admin.isActive}
                      archiveHelp="They are signed out and cannot log in. Their audit history stays. You can activate them again from Edit."
                      permanentHelp={admin.isActive
                        ? 'Deactivate first — the API only permanently deletes admins that are already deactivated.'
                        : 'Their audit-log entries are kept, but no longer linked to an admin account.'}
                      onDelete={(permanent) => deleteAdmin(admin.id, permanent)}
                      onDone={() => void loadAdmins()}
                    />
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">{editingAdmin ? 'Edit Administrator' : 'Create New Administrator'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              {formError && (
                <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address *</label>
                <input required type="email" disabled={!!editingAdmin} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" className="w-full rounded-md border border-slate-300 p-2.5 text-sm disabled:bg-slate-100" placeholder="admin@cms.com" />
                {fieldErrors.email && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Display Name *</label>
                <input required type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm" placeholder="John Doe" />
                {fieldErrors.displayName && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.displayName}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Password {editingAdmin ? '(Leave blank to keep current)' : '*'}
                </label>
                <input type="password" autoComplete="new-password" required={!editingAdmin} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm" placeholder="At least 12 characters" />
                {fieldErrors.password && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm">
                    <option value="CONTENT_EDITOR">Content Editor</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                  {fieldErrors.role && <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.role}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')} className="w-full rounded-md border border-slate-300 p-2.5 text-sm">
                    <option value="true">Active</option>
                    <option value="false">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500">
                  {submitting ? 'Saving...' : editingAdmin ? 'Save Changes' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}