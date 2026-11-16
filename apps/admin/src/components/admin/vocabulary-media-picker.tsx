
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FileAudio,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";

import {
  getMediaAssets,
  uploadMedia,
  type MediaAsset,
  type MediaType,
} from "@/lib/api/media";

type PickerType = "IMAGE" | "AUDIO";

type Props = {
  type: PickerType;
  appId: string;
  selectedId?: string;
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
};

const PAGE_SIZE = 50;

export function VocabularyMediaPicker({
  type,
  appId,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (
    targetPage: number,
  ) => {
    setLoading(true);
    setError("");

    try {
      // Global media library; this also permits
      // selecting assets without an appId.
      const result = await getMediaAssets(
        undefined,
        targetPage,
        PAGE_SIZE,
      );

      setAssets(result);
      setPage(targetPage);
      setHasNext(result.length === PAGE_SIZE);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load media library.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const filtered = assets.filter((asset) => {
    if (asset.type !== type) return false;
    if (asset.status !== "READY") return false;

    if (!search.trim()) return true;

    return (
      asset.originalName ??
      asset.objectKey ??
      ""
    ).toLowerCase().includes(search.toLowerCase());
  });

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const uploaded = await uploadMedia(
        file,
        appId,
        "PRIVATE",
      );

      if (
        uploaded.type !== type ||
        uploaded.status !== "READY"
      ) {
        setError(
          "Upload received, but the asset is not READY yet. Refresh the library after processing.",
        );
        await load(1);
        return;
      }

      onSelect(uploaded);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Media upload failed.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Select ${type.toLowerCase()}`}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 p-3"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-bold">
              Select {type === "IMAGE" ? "Image" : "Audio"}
            </h2>
            <p className="text-xs text-slate-500">
              Only processed READY media can be attached.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close media picker"
            className="rounded-lg border p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media by filename..."
              className="min-w-0 flex-1 rounded-lg border p-2.5 text-sm"
            />

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload from PC"}

              <input
                type="file"
                className="hidden"
                disabled={uploading}
                accept={
                  type === "IMAGE"
                    ? "image/jpeg,image/png,image/webp,image/avif,image/tiff"
                    : "audio/*"
                }
                onChange={(event) => void handleUpload(event)}
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="min-h-48 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Loading media...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No matching READY media on this page.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((asset) => {
                const isSelected =
                  selectedId === asset.id;

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelect(asset)}
                    className={
                      "flex min-h-32 flex-col items-center justify-center gap-3 rounded-lg border p-4 text-center hover:border-indigo-500 " +
                      (
                        isSelected
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-slate-200 bg-slate-50"
                      )
                    }
                  >
                    {type === "IMAGE" ? (
                      <ImageIcon className="h-8 w-8 text-indigo-600" />
                    ) : (
                      <FileAudio className="h-8 w-8 text-amber-600" />
                    )}

                    <span className="w-full break-words text-xs font-medium text-slate-700">
                      {asset.originalName || "Unnamed media"}
                    </span>

                    {isSelected && (
                      <span className="text-xs font-bold text-indigo-600">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t p-4">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => void load(page - 1)}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-slate-500">
            Page {page}
          </span>

          <button
            type="button"
            disabled={loading || !hasNext}
            onClick={() => void load(page + 1)}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </footer>
      </div>
    </div>
  );
}
