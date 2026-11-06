'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, Edit3, X, UserCheck, UserX } from 'lucide-react';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin, type AdminUser, type AdminRole } from '@/lib/api/admins';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback/state-views';

export default function AdminManagementPage() {
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
    setIsModalOpen(true);
  };

  const openEditModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEmail(admin.email);
    setDisplayName(admin.displayName || '');
    setPassword(''); // Leave blank unless changing
    setRole(admin.role);
    setIsActive(admin.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingAdmin) {
        const payload: any = { displayName, role, isActive };
        if (password) payload.password = password;
        await updateAdmin(editingAdmin.id, payload);
      } else {
        await createAdmin({ email, displayName, password, role });
      }
      await loadAdmins();
      setIsModalOpen(false);
    } catch (err) {
      alert('Failed to save administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this administrator?')) return;
    try {
      await deleteAdmin(id);
      setAdmins(admins.filter(a => a.id !== id));
    } catch (err) {
      alert('Failed to delete administrator');
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
                  <button onClick={() => openEditModal(admin)} className="p-2 text-slate-400 hover:text-indigo-600 rounded mr-1">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(admin.id)} className="p-2 text-slate-400 hover:text-rose-600 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
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
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address *</label>
                <input required type="email" disabled={!!editingAdmin} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm disabled:bg-slate-100" placeholder="admin@cms.com" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Display Name *</label>
                <input required type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm" placeholder="John Doe" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Password {editingAdmin ? '(Leave blank to keep current)' : '*'}
                </label>
                <input type="password" required={!editingAdmin} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm" placeholder="••••••••" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm">
                    <option value="CONTENT_EDITOR">Content Editor</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
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