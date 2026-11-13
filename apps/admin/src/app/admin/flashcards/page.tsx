
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import { useAuth } from "@/lib/auth/auth-context";
import { useAppLevel } from "@/lib/auth/app-level-context";
import { Pagination } from "@/components/ui/pagination";

import {
  getDecksPage,
  createDeck,
  updateDeck,
  deleteDeck,
  type FlashcardDeck,
} from "@/lib/api/flashcards";

import type {
  Difficulty,
  PaginationMeta,
} from "@/lib/api/quizzes";

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

type DeckForm = {
  title: string;
  description: string;
  difficulty: Difficulty;
  sortOrder: number;
};

const emptyForm: DeckForm = {
  title: "",
  description: "",
  difficulty: "EASY",
  sortOrder: 0,
};

export default function FlashcardsPage() {
  const { admin } = useAuth();
  const { selectedApp } = useAppLevel();

  const canEdit = Boolean(admin);
  const canUnpublish =
    admin?.role === "SUPER_ADMIN" ||
    admin?.role === "ADMIN";

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta>(emptyPagination);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editing, setEditing] = useState<FlashcardDeck | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<DeckForm>(emptyForm);

  const reload = useCallback(async () => {
    if (!selectedApp) {
      setDecks([]);
      setPagination(emptyPagination);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getDecksPage({
        appId: selectedApp.id,
        search: search.trim() || undefined,
        page,
        limit,
      });
      setDecks(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load decks",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedApp, search, page, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setEditorOpen(true);
  }

  function openEdit(deck: FlashcardDeck) {
    setEditing(deck);
    setForm({
      title: deck.title,
      description: deck.description ?? "",
      difficulty: deck.difficulty,
      sortOrder: deck.sortOrder,
    });
    setEditorOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApp || !canEdit) return;

    setSaving(true);
    setError("");

    try {
      const input = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        difficulty: form.difficulty,
        sortOrder: form.sortOrder,
      };

      if (editing) {
        await updateDeck(editing.id, input);
      } else {
        await createDeck({
          ...input,
          appId: selectedApp.id,
          isPublished: false,
        });
      }

      setEditorOpen(false);
      setMessage("Flashcard deck saved.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(deck: FlashcardDeck) {
    if (!canEdit) return;

    setError("");
    setMessage("");

    try {
      if (deck.isPublished) {
        if (!canUnpublish) return;
        await deleteDeck(deck.id);
      } else {
        await updateDeck(deck.id, { isPublished: true });
      }

      setMessage(
        deck.isPublished ? "Deck unpublished." : "Deck published.",
      );
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update status",
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Flashcard Decks</h1>
          <p className="mt-1 text-sm text-slate-500">
            {selectedApp?.name ?? "Select an application"}
          </p>
        </div>
        {canEdit && selectedApp && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            + Create Deck
          </button>
        )}
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

      <input
        value={search}
        onChange={(event) => {
          setPage(1);
          setSearch(event.target.value);
        }}
        placeholder="Search flashcard decks..."
        className="w-full rounded-lg border bg-white p-3 text-sm"
      />

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <div key={deck.id}
              className="flex flex-col space-y-3 rounded-xl border p-4">
              <div className="flex justify-between gap-2">
                <span className="text-xs font-semibold text-indigo-600">
                  {deck.difficulty}
                </span>
                <span className="text-xs">
                  {deck.isPublished ? "Published" : "Draft"}
                </span>
              </div>

              <h2 className="text-lg font-bold">{deck.title}</h2>

              <p className="line-clamp-2 text-sm text-slate-500">
                {deck.description || "No description"}
              </p>

              <p className="text-xs text-slate-500">
                {deck._count?.items ?? 0} vocabulary cards
              </p>

              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Link
                  href={`/admin/flashcards/${deck.id}`}
                  className="rounded-lg border px-3 py-2 text-xs"
                >
                  Manage Words
                </Link>

                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(deck)}
                      className="rounded-lg border px-3 py-2 text-xs"
                    >
                      Edit
                    </button>

                    {(!deck.isPublished || canUnpublish) && (
                      <button
                        type="button"
                        onClick={() => void togglePublished(deck)}
                        className="rounded-lg border px-3 py-2 text-xs"
                      >
                        {deck.isPublished ? "Unpublish" : "Publish"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {!loading && decks.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">
              No flashcard decks found.
            </p>
          )}
        </div>

        {loading && (
          <p className="p-4 text-sm text-slate-500">Loading decks...</p>
        )}

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

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form onSubmit={(event) => void save(event)}
            className="w-full max-w-lg space-y-4 rounded-xl bg-white p-6">
            <h2 className="text-lg font-bold">
              {editing ? "Edit Deck" : "Create Flashcard Deck"}
            </h2>

            <label className="block space-y-1 text-sm">
              <span>Deck Title</span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={form.title}
                onChange={(event) => setForm((old) => ({
                  ...old,
                  title: event.target.value,
                }))}
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span>Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((old) => ({
                  ...old,
                  description: event.target.value,
                }))}
                className="w-full rounded-lg border p-2.5"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">
                <span>Difficulty</span>
                <select
                  value={form.difficulty}
                  onChange={(event) => setForm((old) => ({
                    ...old,
                    difficulty: event.target.value as Difficulty,
                  }))}
                  className="w-full rounded-lg border p-2.5"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span>Sort Order</span>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) => setForm((old) => ({
                    ...old,
                    sortOrder: Number(event.target.value),
                  }))}
                  className="w-full rounded-lg border p-2.5"
                />
              </label>
            </div>

            <p className="text-xs text-slate-500">
              New decks start as Draft. Add published vocabulary before publishing the deck.
            </p>

            <div className="flex justify-end gap-2">
              <button type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">
                {saving ? "Saving..." : "Save Deck"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
