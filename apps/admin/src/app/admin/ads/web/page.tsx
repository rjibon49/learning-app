
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  LayoutGrid,
  Megaphone,
  BarChart3,
  ArrowRight,
} from "lucide-react";

import {
  getWebPlacements,
  getWebCampaigns,
  getWebAdsReport,
} from "@/lib/api/web-ads";

export default function WebAdsDashboard() {
  const [stats, setStats] = useState({
    placements: 0,
    campaigns: 0,
    impressions: 0,
    clicks: 0,
  });

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void Promise.all([
      getWebPlacements({
        siteKey: "learning-web",
        page: 1,
        limit: 1,
      }),
      getWebCampaigns({
        siteKey: "learning-web",
        page: 1,
        limit: 1,
      }),
      getWebAdsReport("learning-web", 30),
    ])
      .then(([placements, campaigns, report]) => {
        if (!active) return;

        setStats({
          placements: placements.pagination.total,
          campaigns: campaigns.pagination.total,
          impressions: report.totals.impressions,
          clicks: report.totals.clicks,
        });
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load dashboard.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const sections = [
    {
      title: "Placements",
      description: "Create and manage website ad slots.",
      href: "/admin/ads/web/placements",
      icon: LayoutGrid,
    },
    {
      title: "Campaigns",
      description: "Local images, AdSense and GAM campaigns.",
      href: "/admin/ads/web/campaigns",
      icon: Megaphone,
    },
    {
      title: "Reporting",
      description: "Impressions, clicks and click-through rates.",
      href: "/admin/ads/web/reports",
      icon: BarChart3,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          Website Ads Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Global website advertising · learning-web
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Placements", stats.placements],
          ["Campaigns", stats.campaigns],
          ["Impressions (30 days)", stats.impressions],
          ["Clicks (30 days)", stats.clicks],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">
              {Number(value).toLocaleString("en-US")}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-xl border bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
            >
              <Icon className="h-7 w-7 text-indigo-600"/>
              <h2 className="mt-4 font-bold">{section.title}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {section.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                Open <ArrowRight className="h-4 w-4"/>
              </span>
            </Link>
          );
        })}
      </div>

      <Link
        href="/admin/ads"
        className="inline-block text-sm font-semibold text-indigo-600"
      >
        Back to Mobile Ads
      </Link>
    </div>
  );
}
