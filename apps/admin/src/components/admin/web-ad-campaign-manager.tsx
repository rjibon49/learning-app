
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import {
  Copy,
  ImageIcon,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { Pagination } from "@/components/ui/pagination";

import {
  getAllWebPlacements,
  getWebCampaigns,
  createWebCampaign,
  updateWebCampaign,
  archiveWebCampaign,
  type WebAdPlacement,
  type WebAdCampaign,
  type WebAdKind,
  type WebAdStatus,
  type WebAdPagination,
  type CampaignInput,
} from "@/lib/api/web-ads";

import {
  getMediaPage,
  type MediaAsset,
} from "@/lib/api/media";

type FormState = {
  placementId: string;
  name: string;
  kind: WebAdKind;
  status: "DRAFT" | "ACTIVE" | "PAUSED";
  mediaAssetId: string;
  destinationUrl: string;
  altText: string;
  providerClient: string;
  providerSlot: string;
  startsAt: string;
  endsAt: string;
  priority: number;
  weight: number;
  languageCode: string;
  pagePrefix: string;
};

const SITE_KEY = "learning-web";

const emptyPagination: WebAdPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

function blank(): FormState {
  return {
    placementId: "",
    name: "",
    kind: "LOCAL_IMAGE",
    status: "DRAFT",
    mediaAssetId: "",
    destinationUrl: "",
    altText: "",
    providerClient: "",
    providerSlot: "",
    startsAt: "",
    endsAt: "",
    priority: 10,
    weight: 1,
    languageCode: "",
    pagePrefix: "",
  };
}

function getError(error: unknown) {
  return error instanceof Error ? error.message : "Request failed.";
}

function isoDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date or time.");
  }
  return date.toISOString();
}

function localDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function validHttps(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}

function fromCampaign(item: WebAdCampaign): FormState {
  return {
    placementId: item.placementId,
    name: item.name,
    kind: item.kind,
    status: item.status === "ARCHIVED" ? "PAUSED" : item.status,
    mediaAssetId: item.mediaAssetId ?? "",
    destinationUrl: item.destinationUrl ?? "",
    altText: item.altText ?? "",
    providerClient: item.providerClient ?? "",
    providerSlot: item.providerSlot ?? "",
    startsAt: localDate(item.startsAt),
    endsAt: localDate(item.endsAt),
    priority: item.priority,
    weight: item.weight,
    languageCode: item.languageCode ?? "",
    pagePrefix: item.pagePrefix ?? "",
  };
}

// ==================================================
// PUBLIC / READY IMAGE PICKER
// ==================================================

function WebAdImagePicker({
  selectedId,
  onSelect,
  onClose,
}: {
  selectedId: string;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await getMediaPage({
        page: targetPage,
        limit: 30,
      });
      setAssets(result.data);
      setPage(targetPage);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const available = useMemo(() => assets.filter((asset) => {
    if (
      asset.type !== "IMAGE" ||
      asset.visibility !== "PUBLIC" ||
      asset.status !== "READY" ||
      !asset.publicUrl ||
      !validHttps(asset.publicUrl)
    ) return false;

    return (
      !search.trim() ||
      (asset.originalName ?? asset.objectKey)
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
  }), [assets, search]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose public image"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 p-3"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="font-bold">Choose Banner Image</h2>
            <p className="text-xs text-slate-500">
              READY + PUBLIC images only
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="rounded-lg border p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filenames on this page..."
            className="w-full rounded-lg border p-2.5 text-sm"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="min-h-44 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p>Loading images...</p>
          ) : available.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No public, ready images found on this page.
              Upload an image with PUBLIC access in Media Library.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {available.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelect(asset)}
                  className={
                    "space-y-2 rounded-lg border p-2 text-left " +
                    (selectedId === asset.id
                      ? "border-indigo-600 bg-indigo-50"
                      : "hover:border-indigo-400")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.publicUrl!}
                    alt={asset.originalName ?? "Ad image"}
                    className="aspect-square w-full rounded object-cover"
                  />
                  <p className="truncate text-xs">
                    {asset.originalName ?? "Image"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t p-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm">Page {page}</span>
          <button
            type="button"
            disabled={assets.length < 30 || loading}
            onClick={() => void load(page + 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// MAIN CAMPAIGN MANAGER
// ==================================================

export function WebAdCampaignManager() {
  const { admin } = useAuth();

  const canManage = [
    "SUPER_ADMIN",
    "ADMIN",
  ].includes(admin?.role ?? "");

  const [siteKey, setSiteKey] = useState(SITE_KEY);
  const [placements, setPlacements] =
    useState<WebAdPlacement[]>([]);
  const [items, setItems] =
    useState<WebAdCampaign[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [placementFilter, setPlacementFilter] = useState("");
  const [pagination, setPagination] =
    useState<WebAdPagination>(emptyPagination);

  const [form, setForm] = useState<FormState>(blank);
  const [editing, setEditing] =
    useState<WebAdCampaign | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<MediaAsset | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPlacements = useCallback(async () => {
    try {
      setPlacements(await getAllWebPlacements(siteKey));
    } catch (err) {
      setError(getError(err));
    }
  }, [siteKey]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getWebCampaigns({
        siteKey,
        placementId: placementFilter || undefined,
        page,
        limit,
      });
      setItems(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [siteKey, placementFilter, page, limit]);

  useEffect(() => {
    void loadPlacements();
  }, [loadPlacements]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) =>
      !q ||
      `${item.name} ${item.kind} ${item.status}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  function newCampaign() {
    setEditing(null);
    setSelectedImage(null);
    setForm({
      ...blank(),
      placementId: placements.find((p) => p.isActive)?.id ?? "",
    });
    setError("");
  }

  function editCampaign(item: WebAdCampaign) {
    setEditing(item);
    setForm(fromCampaign(item));
    setSelectedImage(null);
    setError("");
  }

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!form.placementId) {
        throw new Error("Choose a placement.");
      }
      if (
        form.status === "ACTIVE" &&
        form.kind === "LOCAL_IMAGE" &&
        (!form.mediaAssetId || !validHttps(form.destinationUrl))
      ) {
        throw new Error(
          "Active local ads require a public image and HTTPS destination.",
        );
      }
      if (
        form.status === "ACTIVE" &&
        form.kind !== "LOCAL_IMAGE" &&
        (!form.providerClient.trim() || !form.providerSlot.trim())
      ) {
        throw new Error(
          "Publisher/Network ID and Slot ID are required.",
        );
      }

      const input: CampaignInput = {
        placementId: form.placementId,
        name: form.name.trim(),
        kind: form.kind,
        status: form.status,
        mediaAssetId:
          form.kind === "LOCAL_IMAGE"
            ? form.mediaAssetId || null
            : null,
        destinationUrl:
          form.kind === "LOCAL_IMAGE"
            ? form.destinationUrl.trim() || null
            : null,
        altText:
          form.kind === "LOCAL_IMAGE"
            ? form.altText.trim() || null
            : null,
        providerClient:
          form.kind !== "LOCAL_IMAGE"
            ? form.providerClient.trim() || null
            : null,
        providerSlot:
          form.kind !== "LOCAL_IMAGE"
            ? form.providerSlot.trim() || null
            : null,
        startsAt: isoDate(form.startsAt),
        endsAt: isoDate(form.endsAt),
        priority: form.priority,
        weight: form.weight,
        languageCode: form.languageCode.trim() || null,
        pagePrefix: form.pagePrefix.trim() || null,
      };

      if (editing) {
        const { placementId: _placementId, ...changes } = input;
        void _placementId;
        await updateWebCampaign(editing.id, changes);
      } else {
        await createWebCampaign(input);
      }

      setMessage("Campaign saved successfully.");
      setEditing(null);
      setForm(blank());
      setSelectedImage(null);
      await reload();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(
    item: WebAdCampaign,
    status: "ACTIVE" | "PAUSED",
  ) {
    if (!canManage) return;
    try {
      await updateWebCampaign(item.id, { status });
      setMessage(`Campaign ${status.toLowerCase()}.`);
      await reload();
    } catch (err) {
      setError(getError(err));
    }
  }

  async function archive(item: WebAdCampaign) {
    if (!canManage) return;
    if (!window.confirm(`Archive "${item.name}"?`)) return;
    try {
      await archiveWebCampaign(item.id);
      setMessage("Campaign archived.");
      await reload();
    } catch (err) {
      setError(getError(err));
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Website Ad Campaigns</h1>
          <p className="mt-1 text-sm text-slate-500">
            Local banners, Google AdSense and Google Ad Manager.
          </p>
        </div>
        <Link
          href="/admin/ads/web/placements"
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Manage Placements
        </Link>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-xl border bg-white p-4 lg:sticky lg:top-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              {editing ? "Edit Campaign" : "Create Campaign"}
            </h2>
            <button
              type="button"
              title="New campaign"
              onClick={newCampaign}
              className="rounded-lg border p-2 text-xs"
            >
              New
            </button>
          </div>

          <form onSubmit={(e) => void save(e)} className="mt-4 space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Placement</span>
              <select
                required
                value={form.placementId}
                disabled={!canManage || Boolean(editing)}
                onChange={(e) => setField("placementId", e.target.value)}
                className="w-full rounded-lg border p-2.5"
              >
                <option value="">Choose Placement</option>
                {placements
                  .filter((p) => p.isActive || p.id === form.placementId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span>Campaign Name</span>
              <input
                required
                minLength={2}
                maxLength={180}
                value={form.name}
                disabled={!canManage}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm">
                <span>Creative Type</span>
                <select
                  value={form.kind}
                  disabled={!canManage}
                  onChange={(e) =>
                    setField("kind", e.target.value as WebAdKind)
                  }
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="LOCAL_IMAGE">Local Image</option>
                  <option value="ADSENSE">Google AdSense</option>
                  <option value="GAM">Google Ad Manager</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span>Status</span>
                <select
                  value={form.status}
                  disabled={!canManage}
                  onChange={(e) =>
                    setField(
                      "status",
                      e.target.value as FormState["status"],
                    )
                  }
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                </select>
              </label>
            </div>

            {form.kind === "LOCAL_IMAGE" ? (
              <section className="space-y-3 rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-semibold">Banner Creative</p>

                {selectedImage?.publicUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedImage.publicUrl}
                    alt="Selected banner"
                    className="max-h-32 w-full rounded object-contain"
                  />
                )}

                <p className="break-all text-xs text-slate-500">
                  {selectedImage?.originalName ??
                    (form.mediaAssetId
                      ? "Previously selected image"
                      : "No image selected")}
                </p>

                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  <ImageIcon className="h-4 w-4"/>
                  Choose from Media Library
                </button>

                <label className="block space-y-1 text-sm">
                  <span>Destination HTTPS URL</span>
                  <input
                    type="url"
                    value={form.destinationUrl}
                    disabled={!canManage}
                    onChange={(e) =>
                      setField("destinationUrl", e.target.value)
                    }
                    placeholder="https://example.com/landing-page"
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>

                <label className="block space-y-1 text-sm">
                  <span>Image Alt Text</span>
                  <input
                    value={form.altText}
                    disabled={!canManage}
                    onChange={(e) => setField("altText", e.target.value)}
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>
              </section>
            ) : (
              <section className="space-y-3 rounded-lg bg-slate-50 p-3">
                <p className="text-sm font-semibold">
                  {form.kind === "ADSENSE"
                    ? "Google AdSense"
                    : "Google Ad Manager"}
                </p>

                <label className="block space-y-1 text-sm">
                  <span>
                    {form.kind === "ADSENSE"
                      ? "Publisher ID (ca-pub-...)"
                      : "Network / Client ID"}
                  </span>
                  <input
                    value={form.providerClient}
                    disabled={!canManage}
                    onChange={(e) =>
                      setField("providerClient", e.target.value)
                    }
                    placeholder={
                      form.kind === "ADSENSE"
                        ? "ca-pub-1234567890123456"
                        : "Network identifier"
                    }
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>

                <label className="block space-y-1 text-sm">
                  <span>Ad Slot / Unit ID</span>
                  <input
                    value={form.providerSlot}
                    disabled={!canManage}
                    onChange={(e) =>
                      setField("providerSlot", e.target.value)
                    }
                    className="w-full rounded-lg border p-2.5"
                  />
                </label>

                <p className="text-xs text-slate-500">
                  Provider scripts will be loaded only by approved
                  website integration, not from raw CMS HTML.
                </p>
              </section>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm">
                <span>Start Date</span>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setField("startsAt", e.target.value)}
                  className="w-full rounded-lg border p-2"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>End Date</span>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setField("endsAt", e.target.value)}
                  className="w-full rounded-lg border p-2"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm">
                <span>Priority</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={form.priority}
                  onChange={(e) =>
                    setField("priority", Number(e.target.value))
                  }
                  className="w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Weight</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.weight}
                  onChange={(e) =>
                    setField("weight", Number(e.target.value))
                  }
                  className="w-full rounded-lg border p-2.5"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm">
                <span>Language (optional)</span>
                <input
                  value={form.languageCode}
                  onChange={(e) =>
                    setField("languageCode", e.target.value)
                  }
                  placeholder="de"
                  className="w-full rounded-lg border p-2.5"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Page Path (optional)</span>
                <input
                  value={form.pagePrefix}
                  onChange={(e) =>
                    setField("pagePrefix", e.target.value)
                  }
                  placeholder="/lessons"
                  className="w-full rounded-lg border p-2.5"
                />
              </label>
            </div>

            {canManage && (
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : editing
                  ? "Update Campaign"
                  : "Create Campaign"}
              </button>
            )}
          </form>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="space-y-3 border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Campaign List</h2>
              <button
                type="button"
                onClick={() => void reload()}
                title="Refresh"
                className="rounded-lg border p-2"
              >
                <RefreshCw className="h-4 w-4"/>
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={siteKey}
                onChange={(e) => {
                  setSiteKey(e.target.value);
                  setPage(1);
                  setPlacementFilter("");
                }}
                placeholder="Site key"
                className="rounded-lg border p-2.5 text-sm"
              />
              <select
                value={placementFilter}
                onChange={(e) => {
                  setPlacementFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border p-2.5 text-sm"
              >
                <option value="">All Placements</option>
                {placements.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search current page..."
                  className="w-full rounded-lg border p-2.5 pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.kind}</p>
                    </td>
                    <td className="px-4 py-3">
                      {item.placement?.name ?? item.placementId}
                    </td>
                    <td className="px-4 py-3">{item.priority}</td>
                    <td className="px-4 py-3">{item.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canManage && (
                          <>
                            {item.status !== "ARCHIVED" && (
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => editCampaign(item)}
                                className="rounded-lg border p-2"
                              >
                                <Pencil className="h-4 w-4"/>
                              </button>
                            )}
                            {item.status !== "ARCHIVED" && (
                              <button
                                type="button"
                                title={item.status === "ACTIVE"
                                  ? "Pause" : "Activate"}
                                onClick={() => void setStatus(
                                  item,
                                  item.status === "ACTIVE"
                                    ? "PAUSED" : "ACTIVE",
                                )}
                                className="rounded-lg border px-2 text-xs"
                              >
                                {item.status === "ACTIVE"
                                  ? "Pause" : "Activate"}
                              </button>
                            )}
                            {item.status !== "ARCHIVED" && (
                              <button
                                type="button"
                                title="Archive"
                                onClick={() => void archive(item)}
                                className="rounded-lg border p-2 text-red-600"
                              >
                                <Trash2 className="h-4 w-4"/>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">
                      No campaigns found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t p-4">
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setLimit(size);
                setPage(1);
              }}
              isLoading={loading}
            />
          </div>
        </section>
      </div>

      {pickerOpen && (
        <WebAdImagePicker
          selectedId={form.mediaAssetId}
          onSelect={(asset) => {
            setSelectedImage(asset);
            setField("mediaAssetId", asset.id);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
