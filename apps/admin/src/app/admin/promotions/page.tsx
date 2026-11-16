
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldOff,
  TicketPercent,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { Pagination } from "@/components/ui/pagination";

import {
  getPromoCodesPage,
  createPromoCode,
  updatePromoCode,
  togglePromoCodeStatus,
  deletePromoCode,
  type PromoCode,
  type PromoCodeInput,
  type PromoPagination,
} from "@/lib/api/promotions";

type FormState = {
  code: string;
  discountPct: number;
  description: string;
  validFrom: string;
  validUntil: string;
  maxUses: string;
  isActive: boolean;
};

const LIMIT = 10;

const EMPTY_PAGINATION: PromoPagination = {
  page: 1,
  limit: LIMIT,
  total: 0,
  totalPages: 1,
};

function blank(): FormState {
  return {
    code: "",
    discountPct: 10,
    description: "",
    validFrom: "",
    validUntil: "",
    maxUses: "",
    isActive: false,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Operation failed.";
}

function toLocalDate(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  const local = new Date(
    date.getTime() -
    date.getTimezoneOffset() * 60000,
  );

  return local.toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid date/time.");
  }

  return date.toISOString();
}

function toForm(item: PromoCode): FormState {
  return {
    code: item.code,
    discountPct: item.discountPct,
    description: item.description ?? "",
    validFrom: toLocalDate(item.validFrom),
    validUntil: toLocalDate(item.validUntil),
    maxUses: item.maxUses?.toString() ?? "",
    isActive: item.isActive,
  };
}

function usageLabel(item: PromoCode) {
  return `${item.currentUses} / ${item.maxUses ?? "∞"}`;
}

function getAvailability(item: PromoCode): string {
  if (!item.isActive) return "Disabled";

  const now = Date.now();

  if (
    item.validFrom &&
    new Date(item.validFrom).getTime() > now
  ) {
    return "Scheduled";
  }

  if (
    item.validUntil &&
    new Date(item.validUntil).getTime() < now
  ) {
    return "Expired";
  }

  if (
    item.maxUses !== null &&
    item.currentUses >= item.maxUses
  ) {
    return "Limit reached";
  }

  return "Available";
}

export default function AdminPromotionsPage() {
  const { admin } = useAuth();

  const canManage =
    admin?.role === "SUPER_ADMIN" ||
    admin?.role === "ADMIN";

  const [items, setItems] = useState<PromoCode[]>([]);

  const [pagination, setPagination] =
    useState<PromoPagination>(EMPTY_PAGINATION);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(LIMIT);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");

  const [form, setForm] = useState<FormState>(blank);
  const [editing, setEditing] = useState<PromoCode | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getPromoCodesPage({
        page,
        limit,
      });

      setItems(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (
        statusFilter === "ACTIVE" &&
        !item.isActive
      ) {
        return false;
      }

      if (
        statusFilter === "DISABLED" &&
        item.isActive
      ) {
        return false;
      }

      if (!query) return true;

      return `${item.code} ${item.description ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [items, search, statusFilter]);

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startNew() {
    setEditing(null);
    setForm(blank());
    setError("");
    setMessage("");
  }

  function startEdit(item: PromoCode) {
    setEditing(item);
    setForm(toForm(item));
    setError("");
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const code = form.code
        .toUpperCase()
        .replace(/\s+/g, "")
        .trim();

      if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
        throw new Error(
          "Code must contain 3–40 letters, numbers, underscores or hyphens.",
        );
      }

      if (
        !Number.isInteger(form.discountPct) ||
        form.discountPct < 1 ||
        form.discountPct > 100
      ) {
        throw new Error(
          "Discount must be between 1% and 100%.",
        );
      }

      let maxUses: number | null = null;

      if (form.maxUses.trim()) {
        maxUses = Number(form.maxUses);

        if (
          !Number.isInteger(maxUses) ||
          maxUses < 1
        ) {
          throw new Error(
            "Max Uses must be a positive whole number.",
          );
        }
      }

      const validFrom = toIso(form.validFrom);
      const validUntil = toIso(form.validUntil);

      if (
        validFrom &&
        validUntil &&
        new Date(validUntil) <= new Date(validFrom)
      ) {
        throw new Error(
          "Valid Until must be after Valid From.",
        );
      }

      if (
        editing &&
        maxUses !== null &&
        maxUses < editing.currentUses
      ) {
        throw new Error(
          "Max Uses cannot be smaller than current usage.",
        );
      }

      const payload: PromoCodeInput = {
        code,
        discountPct: form.discountPct,
        description: form.description.trim() || null,
        validFrom,
        validUntil,
        maxUses,
        isActive: form.isActive,
      };

      if (editing) {
        await updatePromoCode(editing.id, payload);
      } else {
        await createPromoCode(payload);
      }

      setMessage(
        editing
          ? "Promotion updated successfully."
          : "Promotion created successfully.",
      );

      setForm(blank());
      setEditing(null);
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: PromoCode) {
    if (!canManage) return;

    const next = !item.isActive;

    if (
      next &&
      !window.confirm(
        `Enable promotion "${item.code}"?`,
      )
    ) {
      return;
    }

    setProcessingId(item.id);
    setError("");

    try {
      await togglePromoCodeStatus(item.id, next);
      setMessage(
        next
          ? "Promotion enabled."
          : "Promotion disabled.",
      );
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessingId(null);
    }
  }

  async function disable(item: PromoCode) {
    if (!canManage || !item.isActive) return;

    if (
      !window.confirm(
        `Disable "${item.code}"? Existing usage history will remain.`,
      )
    ) {
      return;
    }

    setProcessingId(item.id);
    setError("");

    try {
      await deletePromoCode(item.id);
      setMessage("Promotion disabled.");
      await reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessingId(null);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(`Code "${code}" copied.`);
    } catch {
      setError("Unable to copy promotion code.");
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <TicketPercent className="h-7 w-7 text-indigo-600" />

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Promotions & Discounts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage discount codes, validity and usage limits.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </header>

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

      <div className="grid items-start gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        {/* LEFT: CREATE / EDIT */}

        <aside className="rounded-xl border bg-white p-4 lg:sticky lg:top-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold">
              {editing ? "Edit Promotion" : "New Promotion"}
            </h2>

            {canManage && (
              <button
                type="button"
                title="New Promotion"
                aria-label="New Promotion"
                onClick={startNew}
                className="rounded-lg border p-2"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          <form
            onSubmit={(event) => void save(event)}
            className="mt-4 space-y-4"
          >
            <label className="block space-y-1 text-sm">
              <span className="font-semibold">
                Promotion Code
              </span>

              <input
                required
                minLength={3}
                maxLength={40}
                value={form.code}
                disabled={!canManage || Boolean(editing)}
                onChange={(event) =>
                  setField(
                    "code",
                    event.target.value.toUpperCase(),
                  )
                }
                placeholder="WELCOME20"
                className="w-full rounded-lg border p-2.5 font-mono uppercase"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-semibold">
                Discount Percentage
              </span>

              <input
                type="number"
                required
                min={1}
                max={100}
                value={form.discountPct}
                disabled={!canManage}
                onChange={(event) =>
                  setField(
                    "discountPct",
                    Number(event.target.value),
                  )
                }
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-semibold">
                Description
              </span>

              <textarea
                rows={2}
                maxLength={500}
                value={form.description}
                disabled={!canManage}
                onChange={(event) =>
                  setField(
                    "description",
                    event.target.value,
                  )
                }
                placeholder="Discount for new learners"
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm">
                <span>Valid From</span>

                <input
                  type="datetime-local"
                  value={form.validFrom}
                  disabled={!canManage}
                  onChange={(event) =>
                    setField(
                      "validFrom",
                      event.target.value,
                    )
                  }
                  className="w-full min-w-0 rounded-lg border p-2"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span>Valid Until</span>

                <input
                  type="datetime-local"
                  value={form.validUntil}
                  disabled={!canManage}
                  onChange={(event) =>
                    setField(
                      "validUntil",
                      event.target.value,
                    )
                  }
                  className="w-full min-w-0 rounded-lg border p-2"
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="font-semibold">
                Maximum Uses
              </span>

              <input
                type="number"
                min={1}
                value={form.maxUses}
                disabled={!canManage}
                onChange={(event) =>
                  setField(
                    "maxUses",
                    event.target.value,
                  )
                }
                placeholder="Empty = Unlimited"
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <label className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                disabled={!canManage}
                onChange={(event) =>
                  setField(
                    "isActive",
                    event.target.checked,
                  )
                }
              />

              <span className="font-semibold">
                Enable Promotion
              </span>
            </label>

            <p className="text-xs leading-5 text-slate-500">
              Enable only when the code and date range
              are verified. Payment redemption is not
              activated by this setting alone.
            </p>

            {canManage && (
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing
                    ? "Update Promotion"
                    : "Create Promotion"}
              </button>
            )}
          </form>
        </aside>

        {/* RIGHT: PROMOTION LIST */}

        <section className="min-w-0 overflow-hidden rounded-xl border bg-white">
          <div className="space-y-3 border-b p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold">
                  Promotion Codes
                </h2>
                <p className="text-xs text-slate-500">
                  {pagination.total} total codes
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search codes on this page..."
                  className="w-full rounded-lg border p-2.5 pl-9 text-sm"
                />
              </div>

              <select
                aria-label="Filter status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      "ALL" | "ACTIVE" | "DISABLED",
                  )
                }
                className="rounded-lg border p-2.5 text-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Enabled</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Promotion
                  </th>
                  <th className="px-4 py-3">
                    Discount
                  </th>
                  <th className="px-4 py-3">
                    Usage
                  </th>
                  <th className="px-4 py-3">
                    Availability
                  </th>
                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="rounded bg-indigo-50 px-2 py-1 font-mono text-xs font-bold text-indigo-700">
                          {item.code}
                        </span>

                        <button
                          type="button"
                          title="Copy code"
                          aria-label={`Copy ${item.code}`}
                          onClick={() =>
                            void copyCode(item.code)
                          }
                          className="rounded p-1.5 text-slate-500 hover:text-indigo-600"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {item.description && (
                        <p className="mt-1 max-w-xs text-xs text-slate-500">
                          {item.description}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 font-bold text-emerald-700">
                      {item.discountPct}%
                    </td>

                    <td className="px-4 py-3">
                      {usageLabel(item)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          "rounded-full px-2 py-1 text-xs font-medium " +
                          (
                            getAvailability(item) === "Available"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          )
                        }
                      >
                        {getAvailability(item)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            title="Edit promotion"
                            aria-label={`Edit ${item.code}`}
                            onClick={() => startEdit(item)}
                            className="rounded-lg border p-2"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            title={
                              item.isActive
                                ? "Disable"
                                : "Enable"
                            }
                            aria-label={`Toggle ${item.code}`}
                            disabled={
                              processingId === item.id
                            }
                            onClick={() =>
                              void toggleStatus(item)
                            }
                            className="rounded-lg border px-2 py-1 text-xs disabled:opacity-40"
                          >
                            {item.isActive
                              ? "Disable"
                              : "Enable"}
                          </button>

                          {item.isActive && (
                            <button
                              type="button"
                              title="Disable promotion"
                              aria-label={`Disable ${item.code}`}
                              disabled={
                                processingId === item.id
                              }
                              onClick={() =>
                                void disable(item)
                              }
                              className="rounded-lg border p-2 text-red-600 disabled:opacity-40"
                            >
                              <ShieldOff className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500"
                    >
                      No promotion codes found.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-500"
                    >
                      Loading promotions...
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
