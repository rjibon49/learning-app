
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

import {
  getWebAdsReport,
  type WebAdReport,
} from "@/lib/api/web-ads";

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function WebAdReportManager() {
  const [siteKey, setSiteKey] = useState("learning-web");
  const [days, setDays] = useState(30);
  const [report, setReport] =
    useState<WebAdReport | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!siteKey.trim()) return;

    setLoading(true);
    setError("");

    try {
      const result = await getWebAdsReport(
        siteKey.trim(),
        days,
      );
      setReport(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load report.",
      );
    } finally {
      setLoading(false);
    }
  }, [siteKey, days]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const ctr = useMemo(() => {
    if (!report || report.totals.impressions === 0) return 0;

    return (
      (report.totals.clicks / report.totals.impressions) *
      100
    );
  }, [report]);

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Website Ad Reporting
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Local campaign impressions, clicks and CTR.
          </p>
        </div>
        <Link
          href="/admin/ads/web"
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Dashboard
        </Link>
      </header>

      <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Website Key</span>
          <input
            value={siteKey}
            onChange={(e) => setSiteKey(e.target.value)}
            className="block rounded-lg border p-2.5"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Date Range</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="block rounded-lg border p-2.5"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => void reload()}
          className="self-end rounded-lg border p-2.5"
          title="Refresh report"
        >
          <RefreshCw className="h-4 w-4"/>
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Impressions",
            value: formatCount(report?.totals.impressions ?? 0),
          },
          {
            label: "Clicks",
            value: formatCount(report?.totals.clicks ?? 0),
          },
          {
            label: "CTR",
            value: `${ctr.toFixed(2)}%`,
          },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4">
          <h2 className="font-bold">Campaign Performance</h2>
          <p className="text-xs text-slate-500">
            {loading ? "Loading..." : `${report?.rows.length ?? 0} campaigns`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Placement</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">CTR</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {report?.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.kind}</p>
                  </td>
                  <td className="px-4 py-3">{row.placement.key}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCount(row.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCount(row.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.ctr.toFixed(2)}%
                  </td>
                </tr>
              ))}

              {!loading && (!report || report.rows.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500">
                    No campaign data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        These figures use the Website Ads API's own event records.
        AdSense and Google Ad Manager revenue and provider-verified
        impressions must be checked in those providers' reports.
      </p>
    </div>
  );
}
