
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileAudio,
  FileText,
  FileVideo,
  ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";
import { Pagination } from "@/components/ui/pagination";

import {
  getMediaPage,
  getMediaAccess,
  uploadMedia,
  deleteMediaAsset,
  type MediaAsset,
  type MediaType,
  type MediaVisibility,
  type MediaPagination,
} from "@/lib/api/media";

// ======================================================
// CONFIGURATION
// ======================================================

const PAGE_SIZE = 30;
const MAX_UPLOAD_MB = 25;

const EMPTY_PAGINATION: MediaPagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

type LibraryScope = "ALL" | "APP";
type FilterType = "ALL" | MediaType;

type MediaPreview = {
  asset: MediaAsset;
  url: string;
};

function getError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Media request failed.";
}

function readableSize(
  bytes: number | null | undefined,
): string {
  if (bytes == null) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isSafeMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

// ======================================================
// MEDIA TYPE ICON
// ======================================================

function MediaTypeIcon({
  type,
  className = "h-9 w-9",
}: {
  type: MediaType;
  className?: string;
}) {
  switch (type) {
    case "IMAGE":
      return (
        <ImageIcon
          className={`${className} text-indigo-500`}
        />
      );

    case "AUDIO":
      return (
        <FileAudio
          className={`${className} text-amber-500`}
        />
      );

    case "VIDEO":
      return (
        <FileVideo
          className={`${className} text-purple-500`}
        />
      );

    default:
      return (
        <FileText
          className={`${className} text-emerald-500`}
        />
      );
  }
}

// ======================================================
// PRIVATE IMAGE THUMBNAIL
// ======================================================

function MediaThumbnail({
  asset,
  refreshKey,
  onOpen,
}: {
  asset: MediaAsset;
  refreshKey: number;
  onOpen: () => void;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(
    asset.type === "IMAGE" &&
    asset.status === "READY",
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (
      asset.type !== "IMAGE" ||
      asset.status !== "READY"
    ) {
      return;
    }

    async function fetchThumbnail() {
      try {
        const response = await getMediaAccess(asset.id);

        if (!isSafeMediaUrl(response.url)) {
          throw new Error("Invalid signed media URL.");
        }

        if (!cancelled) {
          setImageUrl(response.url);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchThumbnail();

    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.type, asset.status, refreshKey]);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={asset.status !== "READY"}
      title={`Preview ${asset.originalName ?? "media"}`}
      aria-label={`Preview ${asset.originalName ?? "media"}`}
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100 transition hover:bg-slate-200 disabled:cursor-not-allowed"
    >
      {asset.type === "IMAGE" &&
      imageUrl &&
      !failed ? (
        // Private signed R2 URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={asset.originalName ?? "Media thumbnail"}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      ) : (
        <MediaTypeIcon type={asset.type} />
      )}

      {asset.status !== "READY" && (
        <span className="absolute bottom-1 rounded bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-semibold text-white">
          {asset.status}
        </span>
      )}

      {asset.type === "IMAGE" &&
        failed &&
        asset.status === "READY" && (
          <span className="absolute bottom-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-red-600">
            Preview unavailable
          </span>
        )}
    </button>
  );
}

// ======================================================
// SINGLE MEDIA CARD
// ======================================================

function MediaCard({
  asset,
  refreshKey,
  canDelete,
  onPreview,
  onCopy,
  onDelete,
}: {
  asset: MediaAsset;
  refreshKey: number;
  canDelete: boolean;
  onPreview: (asset: MediaAsset) => void;
  onCopy: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(asset.id);
      setCopied(true);
      onCopy(asset);
    } catch {
      onCopy(asset);
    }
  }

  return (
    <div className="group flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 transition hover:border-indigo-300 hover:shadow-sm">
      <MediaThumbnail
        asset={asset}
        refreshKey={refreshKey}
        onOpen={() => onPreview(asset)}
      />

      <div className="min-w-0 space-y-1">
        <p
          title={asset.originalName ?? asset.objectKey}
          className="truncate text-[11px] font-semibold text-slate-800"
        >
          {asset.originalName ??
            asset.objectKey ??
            "Unnamed media"}
        </p>

        <p className="truncate text-[10px] text-slate-500">
          {asset.type} · {readableSize(asset.fileSize)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
        {/* <span
          title={`${asset.status} · ${asset.visibility}`}
          className={
            "inline-flex h-6 items-center rounded px-1.5 text-[9px] font-semibold " +
            (asset.status === "READY"
              ? "bg-emerald-50 text-emerald-700"
              : asset.status === "FAILED"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700")
          }
        >
          {asset.status === "READY"
            ? "Ready"
            : asset.status}
        </span> */}

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={asset.status !== "READY"}
            title="Preview"
            aria-label="Preview media"
            onClick={() => onPreview(asset)}
            className="rounded-md p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-30"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            title="Copy Asset ID"
            aria-label="Copy asset ID"
            onClick={() => void copy()}
            className="rounded-md p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {canDelete && (
            <button
              type="button"
              title="Delete Media"
              aria-label="Delete media"
              onClick={() => onDelete(asset)}
              className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// MAIN MEDIA PAGE
// ======================================================

export default function AdminMediaPage() {
  const { admin } = useAuth();
  const { selectedApp } = useAppLevel();

  const fileRef = useRef<HTMLInputElement>(null);

  const canWrite = [
    "SUPER_ADMIN",
    "ADMIN",
    "CONTENT_EDITOR",
  ].includes(admin?.role ?? "");

  const canDelete = [
    "SUPER_ADMIN",
    "ADMIN",
  ].includes(admin?.role ?? "");

  // Library filters
  const [scope, setScope] =
    useState<LibraryScope>("ALL");

  const [filterType, setFilterType] =
    useState<FilterType>("ALL");

  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [pagination, setPagination] =
    useState<MediaPagination>(EMPTY_PAGINATION);

  // Data
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Upload
  const [visibility, setVisibility] =
    useState<MediaVisibility>("PRIVATE");

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Feedback
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Preview
  const [preview, setPreview] =
    useState<MediaPreview | null>(null);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const currentAppId =
    scope === "APP"
      ? selectedApp?.id
      : undefined;

  // ==================================================
  // LOAD MEDIA
  // ==================================================

  const loadMedia = useCallback(async () => {
    if (scope === "APP" && !selectedApp) {
      setAssets([]);
      setPagination(EMPTY_PAGINATION);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getMediaPage({
        appId: currentAppId,
        page,
        limit,
      });

      setAssets(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [scope, selectedApp, currentAppId, page, limit]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  // ==================================================
  // CLIENT-SIDE FILTER FOR CURRENT PAGE
  // ==================================================

  const visibleAssets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assets.filter((asset) => {
      if (
        filterType !== "ALL" &&
        asset.type !== filterType
      ) {
        return false;
      }

      if (!query) return true;

      const name = (
        asset.originalName ??
        asset.objectKey ??
        ""
      ).toLowerCase();

      return name.includes(query);
    });
  }, [assets, filterType, search]);

  // ==================================================
  // FILE SELECTION
  // ==================================================

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
    setMessage("");
  }

  // ==================================================
  // UPLOAD FILE
  // ==================================================

  async function handleUpload() {
    if (!canWrite) return;

    if (!file) {
      setError("Please select a file.");
      return;
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(
        `File exceeds ${MAX_UPLOAD_MB} MB limit.`,
      );
      return;
    }

    if (scope === "APP" && !selectedApp) {
      setError("Select an app before uploading.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const uploaded = await uploadMedia(
        file,
        currentAppId,
        visibility,
      );

      setMessage(
        `${uploaded.originalName ?? file.name} uploaded successfully.`,
      );

      setFile(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      setPage(1);
      setRefreshKey((previous) => previous + 1);

      await loadMedia();
    } catch (err) {
      setError(getError(err));
    } finally {
      setUploading(false);
    }
  }

  // ==================================================
  // PRIVATE MEDIA PREVIEW
  // ==================================================

  async function openPreview(asset: MediaAsset) {
    if (asset.status !== "READY") {
      setError("Media is not ready for preview.");
      return;
    }

    setPreviewLoading(true);
    setError("");

    try {
      const response = await getMediaAccess(asset.id);

      if (!isSafeMediaUrl(response.url)) {
        throw new Error(
          "Media access API returned an invalid URL.",
        );
      }

      setPreview({
        asset,
        url: response.url,
      });
    } catch (err) {
      setError(getError(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  // ==================================================
  // COPY MEDIA ID
  // ==================================================

  function onMediaCopied() {
    setMessage("Media Asset ID copied.");
  }

  // ==================================================
  // DELETE MEDIA
  // ==================================================

  async function handleDelete(asset: MediaAsset) {
    if (!canDelete) return;

    const confirmed = window.confirm(
      `Delete "${asset.originalName ?? asset.id}"?\n\nThis cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteMediaAsset(asset.id);

      setMessage("Media deleted successfully.");

      await loadMedia();
    } catch (err) {
      setError(getError(err));
    }
  }

  // ==================================================
  // REFRESH MEDIA
  // ==================================================

  function refreshMedia() {
    setRefreshKey((previous) => previous + 1);
    void loadMedia();
  }

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      {/* PAGE HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Media Library
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Cloudflare R2 storage · Image, Audio & Documents
          </p>
        </div>

        <button
          type="button"
          onClick={refreshMedia}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      {/* FEEDBACK */}

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
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}

      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]">

        {/* =======================================
            LEFT: UPLOAD MEDIA
        ======================================= */}

        <aside className="rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-5">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900">
              Upload Media
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Upload to Cloudflare R2 securely.
            </p>
          </div>

          <div className="space-y-4">
            {/* File Drop-like Input */}

            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-3 py-7 text-center transition hover:border-indigo-400">
              <UploadCloud className="h-9 w-9 text-indigo-500" />

              <div className="max-w-full space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Choose File
                </p>

                <p className="text-xs text-slate-500">
                  Images, Audio or PDF
                </p>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/tiff,audio/mpeg,audio/wav,audio/ogg,audio/flac,application/pdf"
                onChange={chooseFile}
                className="hidden"
                disabled={!canWrite || uploading}
              />
            </label>

            {file && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                <p className="break-all text-xs font-semibold text-indigo-800">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-indigo-600">
                  {readableSize(file.size)}
                </p>
              </div>
            )}

            {/* Scope */}

            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold text-slate-700">
                Library Scope
              </span>

              <select
                value={scope}
                onChange={(event) => {
                  setScope(
                    event.target.value as LibraryScope,
                  );
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm"
              >
                <option value="ALL">
                  Global / Shared
                </option>

                <option
                  value="APP"
                  disabled={!selectedApp}
                >
                  {selectedApp
                    ? `App: ${selectedApp.name}`
                    : "Select App"}
                </option>
              </select>
            </label>

            {/* Visibility */}

            <label className="block space-y-1.5 text-sm">
              <span className="font-semibold text-slate-700">
                Access
              </span>

              <select
                value={visibility}
                onChange={(event) =>
                  setVisibility(
                    event.target.value as MediaVisibility,
                  )
                }
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm"
              >
                <option value="PRIVATE">
                  Private
                </option>

                <option value="PUBLIC">
                  Public
                </option>
              </select>
            </label>

            {/* Upload Button */}

            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={!file || uploading || !canWrite}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}

              {uploading
                ? "Uploading..."
                : "Upload File"}
            </button>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                Images are optimized to WebP automatically.
              </p>

              <p className="text-xs text-slate-500">
                Files are scanned using ClamAV before storage.
              </p>

              <p className="text-xs text-slate-500">
                Private media uses temporary signed URLs for preview.
              </p>

              <p className="text-xs text-slate-500">
                Maximum upload size: {MAX_UPLOAD_MB} MB
                (subject to backend file-type limits).
              </p>
            </div>
          </div>
        </aside>

        {/* =======================================
            RIGHT: MEDIA LIBRARY
        ======================================= */}

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {/* Toolbar */}

          <div className="space-y-3 border-b border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">
                  All Media Assets
                </h2>

                <p className="text-xs text-slate-500">
                  {pagination.total} files · {PAGE_SIZE} default per page
                </p>
              </div>

              <button
                type="button"
                title="Refresh Library"
                aria-label="Refresh library"
                onClick={refreshMedia}
                className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Search & Filters */}

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search files on this page..."
                  aria-label="Search media filenames"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm"
                />
              </div>

              <select
                value={filterType}
                onChange={(event) =>
                  setFilterType(
                    event.target.value as FilterType,
                  )
                }
                aria-label="Filter media type"
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm"
              >
                <option value="ALL">All Types</option>
                <option value="IMAGE">Images</option>
                <option value="AUDIO">Audio</option>
                <option value="PDF">PDF</option>
                <option value="DOCUMENT">Documents</option>
                <option value="VIDEO">Videos</option>
              </select>
            </div>
          </div>

          {/* Media Grid */}

          <div className="min-h-[330px] p-3 sm:p-4">
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading media...
              </div>
            ) : visibleAssets.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-500">
                <ImageIcon className="h-10 w-10 text-slate-300" />

                <p className="text-sm">
                  {assets.length > 0
                    ? "No files match these filters on this page."
                    : "No media uploaded yet."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {visibleAssets.map((asset) => (
                  <MediaCard
                    key={asset.id}
                    asset={asset}
                    refreshKey={refreshKey}
                    canDelete={canDelete}
                    onPreview={(item) =>
                      void openPreview(item)
                    }
                    onCopy={onMediaCopied}
                    onDelete={(item) =>
                      void handleDelete(item)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}

          <div className="border-t border-slate-200 p-3 sm:p-4">
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

      {/* =======================================
          MEDIA PREVIEW MODAL
      ======================================= */}

      {previewLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50">
          <div className="flex items-center gap-2 rounded-xl bg-white p-5 text-sm shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Loading preview...
          </div>
        </div>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Media Preview"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 p-3"
        >
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b p-4">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold sm:text-base">
                  {preview.asset.originalName ??
                    "Media Preview"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {preview.asset.type}
                  {" · "}
                  {readableSize(preview.asset.fileSize)}
                  {" · "}
                  {preview.asset.visibility}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreview(null)}
                title="Close Preview"
                aria-label="Close preview"
                className="rounded-lg border p-2 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex min-h-36 flex-1 items-center justify-center overflow-auto bg-slate-50 p-4">
              {preview.asset.type === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={
                    preview.asset.originalName ??
                    "Image preview"
                  }
                  className="max-h-[72vh] max-w-full rounded-lg object-contain"
                  onError={() => setError(
                    "Image preview failed. Verify signed URL access and R2 configuration.",
                  )}
                />
              ) : preview.asset.type === "AUDIO" ? (
                <audio
                  controls
                  preload="metadata"
                  src={preview.url}
                  className="w-full max-w-xl"
                />
              ) : preview.asset.type === "VIDEO" ? (
                <video
                  controls
                  preload="metadata"
                  src={preview.url}
                  className="max-h-[70vh] max-w-full"
                />
              ) : (
                <div className="space-y-3 text-center">
                  <FileText className="mx-auto h-12 w-12 text-indigo-500" />

                  <p className="text-sm text-slate-600">
                    Document preview
                  </p>

                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Document
                  </a>
                </div>
              )}
            </div>

            <footer className="border-t p-3 text-xs text-slate-500">
              Private media links are temporary and must not
              be stored permanently in Quiz or Lesson records.
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
