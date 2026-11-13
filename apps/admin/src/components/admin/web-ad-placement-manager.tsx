
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
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { Pagination } from "@/components/ui/pagination";

import {
  getWebPlacements,
  createWebPlacement,
  updateWebPlacement,
  disableWebPlacement,
  type WebAdPlacement,
  type WebAdPagination,
} from "@/lib/api/web-ads";

const DEFAULT_SITE = "learning-web";

type FormState = {
  siteKey: string;
  key: string;
  name: string;
  width: string;
  height: string;
  isActive: boolean;
};

function blank(): FormState {
  return {
    siteKey: DEFAULT_SITE,
    key: "",
    name: "",
    width: "",
    height: "",
    isActive: true,
  };
}

function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Request failed.";
}

export function WebAdPlacementManager() {
  const { admin } = useAuth();

  const canManage = [
    "SUPER_ADMIN",
    "ADMIN",
  ].includes(admin?.role ?? "");

  const [siteKey, setSiteKey] =
    useState(DEFAULT_SITE);

  const [items, setItems] =
    useState<WebAdPlacement[]>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const [pagination, setPagination] =
    useState<WebAdPagination>({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

  const [form, setForm] = useState<FormState>(blank);
  const [editing, setEditing] =
    useState<WebAdPlacement | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getWebPlacements({
        siteKey,
        page,
        limit,
      });

      setItems(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [siteKey, page, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) =>
      !q ||
      `${item.name} ${item.key}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

  function newPlacement() {
    setEditing(null);
    setForm({
      ...blank(),
      siteKey,
    });
    setError("");
  }

  function editPlacement(item: WebAdPlacement) {
    setEditing(item);
    setForm({
      siteKey: item.siteKey,
      key: item.key,
      name: item.name,
      width: item.width?.toString() ?? "",
      height: item.height?.toString() ?? "",
      isActive: item.isActive,
    });
    setError("");
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const dimensions = {
        width: form.width ? Number(form.width) : null,
        height: form.height ? Number(form.height) : null,
      };

      if (
        (dimensions.width !== null &&
          (!Number.isInteger(dimensions.width) ||
            dimensions.width < 1)) ||
        (dimensions.height !== null &&
          (!Number.isInteger(dimensions.height) ||
            dimensions.height < 1))
      ) {
        throw new Error("Enter valid positive dimensions.");
      }

      if (editing) {
        await updateWebPlacement(editing.id, {
          name: form.name.trim(),
          ...dimensions,
          isActive: form.isActive,
        });
      } else {
        await createWebPlacement({
          siteKey: form.siteKey.trim().toLowerCase(),
          key: form.key.trim().toLowerCase(),
          name: form.name.trim(),
          ...dimensions,
          isActive: form.isActive,
        });
      }

      setMessage("Placement saved successfully.");
      setEditing(null);
      setForm({ ...blank(), siteKey });
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function disable(item: WebAdPlacement) {
    if (!canManage) return;
    if (!window.confirm(`Disable "${item.name}"?`)) return;

    try {
      await disableWebPlacement(item.id);
      setMessage("Placement disabled.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Website Ad Placements
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create reusable ad slots for your websites.
          </p>
        </div>

        <Link
          href="/admin/ads/web"
          className="rounded-lg border bg-white px-4 py-2 text-sm"
        >
          Website Ads Dashboard
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

      <div className="grid items-start gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border bg-white p-4 lg:sticky lg:top-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              {editing ? "Edit Placement" : "New Placement"}
            </h2>
            <button
              type="button"
              onClick={newPlacement}
              title="New placement"
              className="rounded-lg border p-2"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={(e) => void save(e)} className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>Website Key</span>
              <input
                required
                disabled={Boolean(editing) || !canManage}
                value={form.siteKey}
                onChange={(e) => setField("siteKey", e.target.value)}
                placeholder="learning-web"
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span>Placement Key</span>
              <input
                required
                disabled={Boolean(editing) || !canManage}
                value={form.key}
                onChange={(e) => setField("key", e.target.value)}
                placeholder="home_top"
                pattern="[a-z0-9][a-z0-9_-]+"
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span>Display Name</span>
              <input
                required
                minLength={2}
                maxLength={150}
                disabled={!canManage}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Homepage Top Banner"
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span>Width (px)</span>
                <input
                  type="number"
                  min={1}
                  max={4000}
                  value={form.width}
                  disabled={!canManage}
                  onChange={(e) => setField("width", e.target.value)}
                  placeholder="970"
                  className="w-full rounded-lg border p-2.5"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span>Height (px)</span>
                <input
                  type="number"
                  min={1}
                  max={4000}
                  value={form.height}
                  disabled={!canManage}
                  onChange={(e) => setField("height", e.target.value)}
                  placeholder="250"
                  className="w-full rounded-lg border p-2.5"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                disabled={!canManage}
                onChange={(e) =>
                  setField("isActive", e.target.checked)
                }
              />
              Placement Active
            </label>

            {canManage && (
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Update Placement"
                    : "Create Placement"}
              </button>
            )}
          </form>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="space-y-3 border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Placement List</h2>
              <button
                type="button"
                onClick={() => void reload()}
                title="Refresh"
                className="rounded-lg border p-2"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>Filter by Website Key</span>
                <input
                  value={siteKey}
                  onChange={(e) => {
                    setSiteKey(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border p-2.5"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span>Search Current Page</span>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search placements..."
                    className="w-full rounded-lg border p-2.5 pl-9"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Campaigns</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.name}</p>
                      <p className="font-mono text-xs text-slate-500">
                        {item.siteKey} / {item.key}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {item.width && item.height
                        ? `${item.width} × ${item.height}`
                        : "Responsive"}
                    </td>
                    <td className="px-4 py-3">
                      {item._count?.campaigns ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {item.isActive ? "Active" : "Disabled"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => editPlacement(item)}
                            className="rounded-lg border p-2"
                          >
                            <Pencil className="h-4 w-4"/>
                          </button>

                          {item.isActive && (
                            <button
                              type="button"
                              title="Disable"
                              onClick={() => void disable(item)}
                              className="rounded-lg border p-2 text-red-600"
                            >
                              <Trash2 className="h-4 w-4"/>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">
                      No placements found.
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
    </div>
  );
}
