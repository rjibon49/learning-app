
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  FileStack,
  FolderOpen,
  Globe2,
  GraduationCap,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Monitor,
  Settings,
  ShieldCheck,
  Smartphone,
  Tags,
  TicketPercent,
  UploadCloud,
  Users,
  Volume2,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { Permissions } from "@/lib/auth/permissions";

type NavigationPermission =
  | "DEFAULT"
  | "BUSINESS"
  | "SUPER_ADMIN";

interface NavItem {
  label: string;
  href: string;
  permission?: NavigationPermission;
  icon: React.ComponentType<{
    className?: string;
  }>;
  exact?: boolean;
  badge?: string;
}

interface NavGroup {
  groupLabel: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupLabel: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    groupLabel: "Languages & Applications",
    items: [
      {
        label: "Languages & Levels",
        href: "/admin/languages",
        icon: Languages,
      },
      {
        label: "Apps / Levels",
        href: "/admin/apps",
        icon: Globe2,
      },
    ],
  },
  {
    groupLabel: "Content Management",
    items: [
      {
        label: "Vocabulary",
        href: "/admin/vocabulary",
        icon: BookOpen,
        exact: true,
      },
      {
        label: "Categories",
        href: "/admin/vocabulary/categories",
        icon: Tags,
      },
      {
        label: "Courses",
        href: "/admin/courses",
        icon: GraduationCap,
      },
      {
        label: "Modules",
        href: "/admin/modules",
        icon: FolderOpen,
      },
      {
        label: "Lessons",
        href: "/admin/lessons",
        icon: FileStack,
      },
      {
        label: "Flashcards",
        href: "/admin/flashcards",
        icon: LayoutGrid,
      },
      {
        label: "Quizzes",
        href: "/admin/quizzes",
        icon: ShieldCheck,
      },
    ],
  },
  {
    groupLabel: "Media & Imports",
    items: [
      {
        label: "Media Library (R2)",
        href: "/admin/media",
        icon: Volume2,
      },
      {
        label: "Bulk Import",
        href: "/admin/imports",
        icon: UploadCloud,
      },
    ],
  },
  {
    groupLabel: "Business & Monetization",
    items: [
      {
        label: "Mobile Ads (AdMob)",
        href: "/admin/ads",
        permission: "BUSINESS",
        icon: Smartphone,
        exact: true,
      },
      {
        label: "Website Ads",
        href: "/admin/ads/web",
        permission: "BUSINESS",
        icon: Monitor,
        exact: true,
      },
      {
        label: "Ad Placements",
        href: "/admin/ads/web/placements",
        permission: "BUSINESS",
        icon: LayoutGrid,
      },
      {
        label: "Ad Campaigns",
        href: "/admin/ads/web/campaigns",
        permission: "BUSINESS",
        icon: Megaphone,
      },
      {
        label: "Ad Reports",
        href: "/admin/ads/web/reports",
        permission: "BUSINESS",
        icon: ChartNoAxesCombined,
      },
      {
        label: "Subscriptions",
        href: "/admin/subscriptions",
        permission: "BUSINESS",
        icon: TicketPercent,
      },
      {
        label: "Promotions & Discounts",
        href: "/admin/promotions",
        permission: "BUSINESS",
        icon: Tags,
      },
    ],
  },
  {
    groupLabel: "Administration & Security",
    items: [
      {
        label: "Admins & Roles",
        href: "/admin/admins",
        permission: "SUPER_ADMIN",
        icon: ShieldCheck,
      },
      {
        label: "Users",
        href: "/admin/users",
        permission: "BUSINESS",
        icon: Users,
      },
      {
        label: "Audit Logs",
        href: "/admin/audit-logs",
        permission: "BUSINESS",
        icon: FileStack,
      },
      {
        label: "Settings",
        href: "/admin/settings",
        permission: "SUPER_ADMIN",
        icon: Settings,
      },
    ],
  },
];

// ==========================================
// PERMISSION CHECK
// ==========================================

function canView(
  permission: NavigationPermission | undefined,
  role: NonNullable<ReturnType<typeof useAuth>["admin"]>["role"] | undefined,
): boolean {
  if (permission === "SUPER_ADMIN") {
    return Permissions.canManageSystem(role);
  }

  if (permission === "BUSINESS") {
    return Permissions.canManageBusiness(role);
  }

  return true;
}

// ==========================================
// ACTIVE ROUTE CHECK
// ==========================================

function isRouteActive(
  pathname: string,
  item: NavItem,
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`)
  );
}

// ==========================================
// SIDEBAR COMPONENT
// ==========================================

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
      {/* Mobile overlay */}

      {isOpenMobile && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          isOpenMobile
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <Link
            href="/admin/dashboard"
            onClick={onCloseMobile}
            className="flex min-w-0 items-center gap-2"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900">
                Global Learning
              </p>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                Admin CMS
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}

        <nav
          aria-label="Admin navigation"
          className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
        >
          {NAVIGATION_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => canView(item.permission, role),
            );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <section key={group.groupLabel}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {group.groupLabel}
                </p>

                <ul className="mt-1.5 space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isRouteActive(
                      pathname,
                      item,
                    );

                    const Icon = item.icon;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onCloseMobile}
                          aria-current={
                            active ? "page" : undefined
                          }
                          className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                            active
                              ? "bg-slate-900 text-white shadow-sm"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 shrink-0 ${
                              active
                                ? "text-indigo-300"
                                : "text-slate-400 group-hover:text-indigo-600"
                            }`}
                          />

                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>

                          {item.badge && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                active
                                  ? "bg-slate-700 text-white"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}

                          {active && (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>

        {/* Sidebar Footer */}

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <div>
              <p className="text-[11px] font-semibold text-slate-700">
                Global Multi-Language Platform
              </p>

              <p className="text-[10px] text-slate-500">
                Content · Apps · Websites
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
