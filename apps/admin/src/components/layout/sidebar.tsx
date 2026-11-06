'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Permissions } from '@/lib/auth/permissions';

interface NavItem {
  label: string;
  href: string;
  badge?: string;
  requiresBusiness?: boolean;
  requiresSuperAdmin?: boolean;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupLabel: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin/dashboard' }],
  },
  {
    groupLabel: 'Content Management',
    items: [
      { label: 'Vocabulary', href: '/admin/vocabulary' },
      { label: 'Categories', href: '/admin/vocabulary/categories' },
      { label: 'Courses', href: '/admin/courses' },
      { label: 'Modules', href: '/admin/modules' },
      { label: 'Lessons', href: '/admin/lessons' },
      { label: 'Flashcards', href: '/admin/flashcards' },
      { label: 'Quizzes', href: '/admin/quizzes' },
    ],
  },
  {
    groupLabel: 'Media',
    items: [{ label: 'Media Library (R2)', href: '/admin/media' }],
  },
  {
    groupLabel: 'Operations',
    items: [
      { label: 'Bulk Import', href: '/admin/imports' },
      { label: 'Audit Logs', href: '/admin/audit-logs', requiresBusiness: true },
    ],
  },
  {
    groupLabel: 'Administration & Security',
    items: [
      { label: 'Admins & Roles', href: '/admin/admins', requiresSuperAdmin: true },
      { label: 'Users', href: '/admin/users', requiresBusiness: true },
      { label: 'Settings', href: '/admin/settings', requiresSuperAdmin: true },
    ],
  },
  {
    groupLabel: 'Business & Monetization',
    items: [
      { label: 'Ads (AdMob)', href: '/admin/ads', requiresBusiness: true },
      { label: 'Subscriptions', href: '/admin/subscriptions', requiresBusiness: true },
      { label: 'Apps / Levels', href: '/admin/apps' },
    ],
  },
];

export function Sidebar({
  isOpenMobile,
  onCloseMobile,
}: {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { admin } = useAuth();
  const role = admin?.role;

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900">
              German CMS
            </span>
            <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-600">
              A1–C1
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAVIGATION_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.requiresSuperAdmin && !Permissions.canManageSystem(role)) {
                return false;
              }
              if (item.requiresBusiness && !Permissions.canManageBusiness(role)) {
                return false;
              }
              return true;
            });

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div key={group.groupLabel}>
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {group.groupLabel}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onCloseMobile}
                          className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <span>{item.label}</span>
                          {item.badge && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                isActive
                                  ? 'bg-slate-700 text-slate-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}