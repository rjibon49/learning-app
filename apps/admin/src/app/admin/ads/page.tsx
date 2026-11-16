
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  BadgeCheck,
  Ban,
  CircleHelp,
  Copy,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";
import { Pagination } from "@/components/ui/pagination";

import {
  getAdsConfigsPage,
  createAdConfig,
  updateAdConfig,
  deleteAdConfig,
  type AdConfig,
  type AdProvider,
  type AdPlatform,
  type AdConfigInput,
  type AdsPage,
} from "@/lib/api/ads";

type FormState = {
  provider: AdProvider;
  platform: AdPlatform;
  appAdId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  nativeAdUnitId: string;
  isEnabled: boolean;
};

const PAGE_SIZE = 10;

const EMPTY_PAGINATION: AdsPage["pagination"] = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

function emptyForm(): FormState {
  return {
    provider: "ADMOB",
    platform: "android",
    appAdId: "",
    bannerAdUnitId: "",
    interstitialAdUnitId: "",
    rewardedAdUnitId: "",
    nativeAdUnitId: "",
    isEnabled: false,
  };
}

function toForm(config: AdConfig): FormState {
  return {
    provider: config.provider,
    platform:
      config.platform === "ios" ? "ios" : "android",
    appAdId: config.appAdId ?? "",
    bannerAdUnitId: config.bannerAdUnitId ?? "",
    interstitialAdUnitId:
      config.interstitialAdUnitId ?? "",
    rewardedAdUnitId: config.rewardedAdUnitId ?? "",
    nativeAdUnitId: config.nativeAdUnitId ?? "",
    isEnabled: config.isEnabled,
  };
}

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Request failed. Please try again.";
}

function createPayload(
  appId: string,
  form: FormState,
): AdConfigInput {
  return {
    appId,
    provider: form.provider,
    platform: form.platform,
    appAdId: form.appAdId.trim() || null,
    bannerAdUnitId:
      form.bannerAdUnitId.trim() || null,
    interstitialAdUnitId:
      form.interstitialAdUnitId.trim() || null,
    rewardedAdUnitId:
      form.rewardedAdUnitId.trim() || null,
    nativeAdUnitId:
      form.nativeAdUnitId.trim() || null,
    isEnabled: form.isEnabled,
  };
}

export default function AdminAdsPage() {
  const { admin } = useAuth();
  const { selectedApp, isLoadingApps } = useAppLevel();

  const canManage =
    admin?.role === "SUPER_ADMIN" ||
    admin?.role === "ADMIN";

  const [configs, setConfigs] = useState<AdConfig[]>([]);

  const [pagination, setPagination] =
    useState<AdsPage["pagination"]>(
      EMPTY_PAGINATION,
    );

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState<FormState>(
    emptyForm,
  );

  const [editing, setEditing] =
    useState<AdConfig | null>(null);

  const [editorOpen, setEditorOpen] = useState(true);

  const appId = selectedApp?.id ?? "";

  const reload = useCallback(async () => {
    if (!appId) {
      setConfigs([]);
      setPagination(EMPTY_PAGINATION);
      return;
    }

    setLoading(true);

    try {
      const response = await getAdsConfigsPage({
        appId,
        page,
        limit,
      });

      setConfigs(response.data);
      setPagination(response.pagination);
      setError("");
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [appId, page, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredConfigs = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return configs;

    return configs.filter((config) => {
      const content = [
        config.provider,
        config.platform,
        config.appAdId,
        config.bannerAdUnitId,
        config.interstitialAdUnitId,
        config.rewardedAdUnitId,
        config.nativeAdUnitId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(query);
    });
  }, [configs, search]);

  const enabledCount = configs.filter(
    (config) => config.isEnabled,
  ).length;

  function startCreate() {
    setEditing(null);
    setForm(emptyForm());
    setEditorOpen(true);
    setError("");
    setMessage("");
  }

  function startEdit(config: AdConfig) {
    setEditing(config);
    setForm(toForm(config));
    setEditorOpen(true);
    setError("");
    setMessage("");
  }

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((old) => ({
      ...old,
      [key]: value,
    }));
  }

  async function saveConfig(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canManage || !appId) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = createPayload(
        editing?.appId ?? appId,
        form,
      );

      const hasAdUnit = [
        payload.bannerAdUnitId,
        payload.interstitialAdUnitId,
        payload.rewardedAdUnitId,
        payload.nativeAdUnitId,
      ].some(Boolean);

      if (
        payload.isEnabled &&
        !hasAdUnit
      ) {
        throw new Error(
          "Add at least one ad unit before enabling this configuration.",
        );
      }

      if (editing) {
        const {
          appId: _appId,
          ...changes
        } = payload;

        void _appId;

        await updateAdConfig(
          editing.id,
          changes,
        );
      } else {
        await createAdConfig(payload);
      }

      setMessage(
        editing
          ? "Ad configuration updated successfully."
          : "Ad configuration created successfully.",
      );

      setEditing(null);
      setForm(emptyForm());
      await reload();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleConfig(
    config: AdConfig,
  ) {
    if (!canManage) return;

    const next = !config.isEnabled;

    if (
      next &&
      !window.confirm(
        "Enable this ad configuration? Ads may appear after the client SDK is integrated.",
      )
    ) {
      return;
    }

    setProcessingId(config.id);
    setError("");
    setMessage("");

    try {
      await updateAdConfig(config.id, {
        isEnabled: next,
      });

      setMessage(
        next
          ? "Ad configuration enabled."
          : "Ad configuration disabled.",
      );

      await reload();
    } catch (err) {
      setError(getError(err));
    } finally {
      setProcessingId(null);
    }
  }

  async function disableConfig(config: AdConfig) {
    if (!canManage) return;

    if (
      !window.confirm(
        `Disable ${config.provider} configuration for ${config.platform}?`,
      )
    ) {
      return;
    }

    setProcessingId(config.id);
    setError("");

    try {
      await deleteAdConfig(config.id);
      setMessage("Ad configuration disabled.");

      if (editing?.id === config.id) {
        setEditing(null);
        setForm(emptyForm());
      }

      await reload();
    } catch (err) {
      setError(getError(err));
    } finally {
      setProcessingId(null);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Ad unit ID copied.");
    } catch {
      setError("Unable to copy the ID.");
    }
  }

  if (isLoadingApps) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Loading applications...
      </p>
    );
  }

  if (!selectedApp) {
    return (
      <div className="rounded-xl border bg-white p-6">
        Select an application from the top navigation.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-indigo-600" />

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Ads Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {selectedApp.name} · Android & iOS
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500">
            Configurations on this page
          </p>
          <p className="mt-1 text-2xl font-bold">
            {configs.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500">
            Enabled on this page
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {enabledCount}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-slate-500">
            Total configurations
          </p>
          <p className="mt-1 text-2xl font-bold">
            {pagination.total}
          </p>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-xl border bg-white p-4 lg:sticky lg:top-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">
              {editing
                ? "Edit Ad Configuration"
                : "Ad Configuration"}
            </h2>

            {canManage && (
              <button
                type="button"
                onClick={startCreate}
                title="New configuration"
                className="rounded-lg border p-2"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {!editorOpen ? (
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="mt-4 rounded-lg border px-4 py-2 text-sm"
            >
              Open Editor
            </button>
          ) : (
            <form
              onSubmit={(event) => void saveConfig(event)}
              className="mt-4 space-y-4"
            >
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Provider</span>
                <select
                  value={form.provider}
                  disabled={Boolean(editing) || !canManage}
                  onChange={(event) =>
                    setField(
                      "provider",
                      event.target.value as AdProvider,
                    )
                  }
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="ADMOB">Google AdMob</option>
                  <option value="OTHER">Other Provider</option>
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-medium">Platform</span>
                <select
                  value={form.platform}
                  disabled={Boolean(editing) || !canManage}
                  onChange={(event) =>
                    setField(
                      "platform",
                      event.target.value as AdPlatform,
                    )
                  }
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                </select>
              </label>

              {(
                [
                  ["appAdId", "Application Ad ID"],
                  ["bannerAdUnitId", "Banner Ad Unit ID"],
                  ["interstitialAdUnitId", "Interstitial Ad Unit ID"],
                  ["rewardedAdUnitId", "Rewarded Ad Unit ID"],
                  ["nativeAdUnitId", "Native Ad Unit ID"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="block space-y-1 text-sm"
                >
                  <span className="font-medium">
                    {label}
                  </span>

                  <input
                    value={form[key]}
                    disabled={!canManage}
                    onChange={(event) =>
                      setField(key, event.target.value)
                    }
                    placeholder={
                      key === "appAdId"
                        ? "App-level identifier"
                        : "Enter ad unit ID"
                    }
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>
              ))}

              <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isEnabled}
                  disabled={!canManage}
                  onChange={(event) =>
                    setField(
                      "isEnabled",
                      event.target.checked,
                    )
                  }
                />
                <span className="font-medium">
                  Enable ad configuration
                </span>
              </label>

              <div className="flex items-start gap-2 text-xs text-slate-500">
                <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Keep configurations disabled until
                  ad unit IDs and the mobile SDK have
                  been tested.
                </p>
              </div>

              {canManage && (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Configuration"
                      : "Create Configuration"}
                </button>
              )}
            </form>
          )}
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-bold">
                Ad Configurations
              </h2>
              <p className="text-xs text-slate-500">
                Manage advertising IDs for the selected app.
              </p>
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search on this page..."
                className="w-full rounded-lg border p-2.5 pl-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 p-4">
            {loading && (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading configurations...
              </p>
            )}

            {!loading &&
              filteredConfigs.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-500">
                  No ad configurations found.
                </div>
              )}

            {filteredConfigs.map((config) => (
              <div
                key={config.id}
                className="space-y-3 rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">
                        {config.provider === "ADMOB"
                          ? "Google AdMob"
                          : "Other Provider"}
                      </h3>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase">
                        {config.platform}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {config.isEnabled
                        ? "Enabled"
                        : "Disabled"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          title="Edit"
                          aria-label="Edit ad configuration"
                          onClick={() => startEdit(config)}
                          className="rounded-lg border p-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          title={
                            config.isEnabled
                              ? "Disable"
                              : "Enable"
                          }
                          aria-label="Toggle ad configuration"
                          disabled={
                            processingId === config.id
                          }
                          onClick={() =>
                            void toggleConfig(config)
                          }
                          className="rounded-lg border p-2 disabled:opacity-40"
                        >
                          {config.isEnabled ? (
                            <Ban className="h-4 w-4 text-amber-600" />
                          ) : (
                            <BadgeCheck className="h-4 w-4 text-emerald-600" />
                          )}
                        </button>

                        <button
                          type="button"
                          title="Disable configuration"
                          aria-label="Disable ad configuration"
                          disabled={
                            processingId === config.id
                          }
                          onClick={() =>
                            void disableConfig(config)
                          }
                          className="rounded-lg border p-2 text-red-600 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["appAdId", "App"],
                      ["bannerAdUnitId", "Banner"],
                      ["interstitialAdUnitId", "Interstitial"],
                      ["rewardedAdUnitId", "Rewarded"],
                      ["nativeAdUnitId", "Native"],
                    ] as const
                  ).map(([key, label]) => {
                    const value = config[key];

                    return (
                      <div
                        key={key}
                        className="min-w-0 rounded-lg bg-slate-50 p-3"
                      >
                        <p className="text-xs font-semibold text-slate-500">
                          {label}
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <p
                            title={value ?? ""}
                            className="min-w-0 flex-1 truncate font-mono text-xs"
                          >
                            {value || "Not configured"}
                          </p>

                          {value && (
                            <button
                              type="button"
                              title={`Copy ${label} ID`}
                              aria-label={`Copy ${label} ID`}
                              onClick={() =>
                                void copyValue(value)
                              }
                              className="rounded p-1 text-slate-500 hover:text-indigo-600"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-4">
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPage(1);
                setLimit(size);
              }}
              isLoading={loading}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
