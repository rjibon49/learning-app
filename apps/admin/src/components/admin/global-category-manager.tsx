
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import { useAuth } from "@/lib/auth/auth-context";
import { getPublicLanguages } from "@/lib/api/languages";
import { Pagination } from "@/components/ui/pagination";
import { DeleteActions } from "@/components/ui/delete-actions";
import { useConfirm, useToast } from "@/components/ui/feedback-provider";

import type { LearningLanguage } from "@/types/app";

import {
  getGlobalCategories,
  createGlobalCategory,
  updateGlobalCategory,
  archiveGlobalCategory,
  saveGlobalCategoryTranslation,
  removeGlobalCategoryTranslation,
  type GlobalVocabularyCategory,
} from "@/lib/api/global-vocabulary";

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  sortOrder: 0,
  isActive: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Operation failed.";
}

export function GlobalCategoryManager() {
  const { admin } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const canManage = [
    "SUPER_ADMIN",
    "ADMIN",
    "CONTENT_EDITOR",
  ].includes(admin?.role ?? "");

  const canDisable = [
    "SUPER_ADMIN",
    "ADMIN",
  ].includes(admin?.role ?? "");

  const [categories, setCategories] =
    useState<GlobalVocabularyCategory[]>([]);
  const [languages, setLanguages] =
    useState<LearningLanguage[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [form, setForm] =
    useState<CategoryForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const [translationCategory, setTranslationCategory] =
    useState<GlobalVocabularyCategory | null>(null);
  const [translationLanguage, setTranslationLanguage] =
    useState("");
  const [translationName, setTranslationName] =
    useState("");
  const [translationDescription, setTranslationDescription] =
    useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setCategories(await getGlobalCategories());
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let active = true;

    void getPublicLanguages()
      .then((result) => {
        if (active) setLanguages(result);
      })
      .catch((err: unknown) => {
        if (active) setError(getError(err));
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    return categories.filter((category) =>
      !query ||
      category.name.toLowerCase().includes(query) ||
      category.slug.toLowerCase().includes(query),
    );
  }, [categories, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / limit),
  );

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  function createNew() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      sortOrder: categories.reduce((max, c) => Math.max(max, c.sortOrder + 1), 0),
    });
    setFormError("");
    setEditorOpen(true);
    setError("");
  }

  function edit(category: GlobalVocabularyCategory) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setFormError("");
    setEditorOpen(true);
    setError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canManage || saving) return;

    if (!form.name.trim()) {
      setFormError("Enter a category name.");
      return;
    }
    const slug = form.slug.trim().toLowerCase() || slugify(form.name) || `category-${Date.now().toString(36)}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      setFormError("Slug: use lowercase English letters, numbers and single dashes.");
      return;
    }

    setSaving(true);
    setError("");
    setFormError("");

    const payload = {
      name: form.name.trim(),
      slug,
      description: form.description.trim() || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await updateGlobalCategory(editingId, payload);
      } else {
        await createGlobalCategory(payload);
      }

      setEditorOpen(false);
      toast.success(`Category "${payload.name}" ${editingId ? "updated" : "created"}.`);
      await reload();
    } catch (err) {
      // Shown inside the dialog so it is not hidden behind the overlay.
      setFormError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  function openTranslations(category: GlobalVocabularyCategory) {
    setTranslationCategory(category);
    setTranslationLanguage("");
    setTranslationName("");
    setTranslationDescription("");
  }

  async function saveTranslation(event: FormEvent) {
    event.preventDefault();

    if (!translationCategory || !translationLanguage || saving) {
      return;
    }
    if (!translationName.trim()) {
      toast.error("Enter the translated category name.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveGlobalCategoryTranslation(
        translationCategory.id,
        {
          languageId: translationLanguage,
          name: translationName.trim(),
          description: translationDescription.trim() || null,
        },
      );

      const result = await getGlobalCategories();
      setCategories(result);

      const updated = result.find(
        (item) => item.id === translationCategory.id,
      );

      setTranslationCategory(updated ?? null);
      setTranslationName("");
      setTranslationDescription("");

      toast.success("Category translation saved.");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeTranslation(languageId: string) {
    if (!translationCategory) return;

    const ok = await confirm({
      title: "Remove this translation?",
      message: "The category name in this language will be removed.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await removeGlobalCategoryTranslation(
        translationCategory.id,
        languageId,
      );

      const result = await getGlobalCategories();
      setCategories(result);
      setTranslationCategory(
        result.find(
          (item) => item.id === translationCategory.id,
        ) ?? null,
      );
      toast.success("Translation removed.");
    } catch (err) {
      toast.error(getError(err));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Global Vocabulary Categories
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Shared categories with multilingual names.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/vocabulary"
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Vocabulary
          </Link>

          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Refresh
          </button>

          {canManage && (
            <button
              type="button"
              onClick={createNew}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Add Category
            </button>
          )}
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search categories..."
        className="w-full rounded-lg border bg-white p-3 text-sm"
      />

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Translations</th>
                <th className="px-4 py-3">Words</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {visible.map((category) => (
                <tr key={category.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{category.name}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {category.slug}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {category.translations?.length ?? 0}
                  </td>

                  <td className="px-4 py-3">
                    {category._count?.vocabulary ?? 0}
                  </td>

                  <td className="px-4 py-3">
                    {category.isActive ? "Active" : "Inactive"}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openTranslations(category)}
                        className="rounded-lg border px-3 py-1.5 text-xs"
                      >
                        Translations
                      </button>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => edit(category)}
                          className="rounded-lg border px-3 py-1.5 text-xs"
                        >
                          Edit
                        </button>
                      )}

                      <DeleteActions
                        itemName={category.name}
                        entity="category"
                        archiveLabel="Disable"
                        canArchive={canDisable}
                        hideArchive={!category.isActive}
                        archiveHelp="The category is hidden from apps. Words keep their category, and you can enable it again by editing it."
                        permanentHelp="Its translations are removed. Words in this category are kept but become uncategorised."
                        onDelete={(permanent) => archiveGlobalCategory(category.id, permanent)}
                        onDone={() => void reload()}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500">
                    No categories found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4">
          <Pagination
            pagination={{
              page: currentPage,
              limit,
              total: filtered.length,
              totalPages,
            }}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
            }}
            isLoading={loading}
          />
        </div>
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6">
            <h2 className="text-lg font-bold">
              {editingId ? "Edit Category" : "Create Category"}
            </h2>

            <form className="space-y-3" noValidate onSubmit={(e) => void save(e)}>
              {formError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </p>
              )}
              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Name <span className="text-rose-600">*</span></span>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((old) => ({
                    ...old,
                    name: e.target.value,
                    slug: editingId ? old.slug : slugify(e.target.value),
                  }))}
                  className="w-full rounded-lg border p-2.5"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="font-semibold">Slug</span>
                <span className="block text-xs text-slate-500">Made from the name automatically. Leave as is unless you need a specific URL.</span>
                <input
                  value={form.slug}
                  placeholder="auto"
                  onChange={(e) => setForm((old) => ({
                    ...old,
                    slug: e.target.value,
                  }))}
                  className="w-full rounded-lg border p-2.5"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((old) => ({
                    ...old,
                    description: e.target.value,
                  }))}
                  className="w-full rounded-lg border p-2.5"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span>Sort Order</span>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((old) => ({
                    ...old,
                    sortOrder: Number(e.target.value),
                  }))}
                  className="w-full rounded-lg border p-2.5"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((old) => ({
                    ...old,
                    isActive: e.target.checked,
                  }))}
                />
                Active
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Category"}
                </button>

                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-lg border px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {translationCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl bg-white p-6">
            <h2 className="text-lg font-bold">
              {translationCategory.name} — Translations
            </h2>

            {translationCategory.translations?.map((translation) => (
              <div
                key={translation.languageId}
                className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {translation.language?.code ?? translation.languageId}
                  </p>
                  <p>{translation.name}</p>
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTranslationLanguage(translation.languageId);
                        setTranslationName(translation.name);
                        setTranslationDescription(
                          translation.description ?? "",
                        );
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="text-red-600"
                      onClick={() => void removeTranslation(
                        translation.languageId,
                      )}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}

            {canManage && (
              <form
                onSubmit={(e) => void saveTranslation(e)}
                className="space-y-3"
              >
                <select
                  required
                  value={translationLanguage}
                  onChange={(e) => setTranslationLanguage(e.target.value)}
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="">Select language</option>
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                    </option>
                  ))}
                </select>

                <input
                  required
                  value={translationName}
                  onChange={(e) => setTranslationName(e.target.value)}
                  placeholder="Translated category name"
                  className="w-full rounded-lg border p-2.5"
                />

                <textarea
                  value={translationDescription}
                  onChange={(e) => setTranslationDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded-lg border p-2.5"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  Save Translation
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setTranslationCategory(null)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
